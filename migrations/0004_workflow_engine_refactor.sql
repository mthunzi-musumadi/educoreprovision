BEGIN;

-- 1. DROP PROTOTYPE HACK & OLD DEPENDENT OBJECTS
DROP TABLE IF EXISTS public.educore_app_state CASCADE;
DROP VIEW IF EXISTS public.purchase_applications CASCADE;
DROP VIEW IF EXISTS public.application_timeline_events CASCADE;
DROP TABLE IF EXISTS public.approval_audit_logs CASCADE;
DROP TABLE IF EXISTS public.application_approvals CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.form_definitions CASCADE;

-- 2. CREATE NEW WORKFLOW ENUMS
DO $$ BEGIN
    CREATE TYPE public."department_code" AS ENUM ('IT', 'HR', 'FINANCE', 'LOGISTICS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public."lifecycle_status" AS ENUM (
        'DRAFT',
        'IN_REVIEW',
        'REVISION_REQUIRED',
        'APPROVED',
        'REJECTED',
        'CLOSED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public."approval_step_status" AS ENUM (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'REVISION_REQUESTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. FORM DEFINITIONS CATALOG
CREATE TABLE public.form_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    code varchar(50) NOT NULL UNIQUE,
    ref_prefix varchar(20) NOT NULL UNIQUE,
    department public."department_code" NOT NULL,
    title varchar(150) NOT NULL,
    requires_policy bool DEFAULT false NOT NULL,
    workflow_pipeline jsonb DEFAULT '[]'::jsonb NOT NULL,
    seq_year int4 DEFAULT EXTRACT(YEAR FROM now())::int4 NOT NULL,
    seq_counter int4 DEFAULT 0 NOT NULL,
    is_active bool DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.policy_versions 
    ADD COLUMN IF NOT EXISTS form_definition_id uuid REFERENCES public.form_definitions(id) ON DELETE RESTRICT;

-- 4. REFACTORED APPLICATIONS TABLE (Generic Envelope)
CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    reference_number varchar(50) NOT NULL UNIQUE,
    form_definition_id uuid NOT NULL REFERENCES public.form_definitions(id) ON DELETE RESTRICT,
    applicant_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    
    status public."lifecycle_status" DEFAULT 'DRAFT'::lifecycle_status NOT NULL,
    current_step_order int2 NULL,
    current_approver_role public."user_role" NULL,
    
    policy_version_id uuid NULL REFERENCES public.policy_versions(id) ON DELETE RESTRICT,
    legal_text_snapshot text NULL,
    terms_accepted bool DEFAULT false NOT NULL,
    terms_accepted_at timestamptz NULL,
    
    applicant_ip_address inet NULL,
    applicant_user_agent text NULL,
    applicant_signed_at timestamptz NULL,
    applicant_digital_signature varchar(255) NULL,
    
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT chk_envelope_submission CHECK (
        (status = 'DRAFT'::lifecycle_status) OR (applicant_signed_at IS NOT NULL)
    )
);

CREATE INDEX idx_apps_form_def ON public.applications USING btree (form_definition_id);
CREATE INDEX idx_apps_applicant ON public.applications USING btree (applicant_id);
CREATE INDEX idx_apps_institution ON public.applications USING btree (institution_id);
CREATE INDEX idx_apps_status_queue ON public.applications USING btree (status, current_approver_role, institution_id);
CREATE INDEX idx_apps_payload_gin ON public.applications USING gin (payload);

-- 5. NORMALIZED APPROVAL STEPS TABLE
CREATE TABLE public.application_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    step_order int2 NOT NULL,
    step_label varchar(100) NOT NULL,
    required_role public."user_role" NOT NULL,
    institution_scoped bool DEFAULT false NOT NULL,
    status public."approval_step_status" DEFAULT 'PENDING'::approval_step_status NOT NULL,
    
    reviewer_id uuid NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    reviewer_name varchar(150) NULL,
    comments text NULL,
    checklist_data jsonb DEFAULT '{}'::jsonb NULL,
    step_metadata jsonb DEFAULT '{}'::jsonb NULL,
    digital_signature varchar(255) NULL,
    signed_at timestamptz NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT uq_app_step_order UNIQUE (application_id, step_order)
);

CREATE INDEX idx_approvals_app_id ON public.application_approvals USING btree (application_id);
CREATE INDEX idx_approvals_pending_role ON public.application_approvals USING btree (required_role, status);

-- 6. REFACTORED AUDIT LOGS
CREATE TABLE public.approval_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    actor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    actor_name varchar(150) NOT NULL,
    actor_role public."user_role" NOT NULL,
    action_type varchar(60) NOT NULL,
    from_status public."lifecycle_status" NULL,
    to_status public."lifecycle_status" NOT NULL,
    comments text NULL,
    is_internal bool DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_audit_app_id ON public.approval_audit_logs USING btree (application_id);
CREATE INDEX idx_audit_created ON public.approval_audit_logs USING btree (created_at);

-- 7. ATOMIC REFERENCE NUMBER GENERATOR
CREATE OR REPLACE FUNCTION public.generate_app_reference_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_year INT;
    v_prefix VARCHAR(20);
    v_seq INT;
BEGIN
    v_year := EXTRACT(YEAR FROM NOW())::INT;

    UPDATE public.form_definitions
    SET seq_counter = CASE WHEN seq_year = v_year THEN seq_counter + 1 ELSE 1 END,
        seq_year = v_year
    WHERE id = NEW.form_definition_id
    RETURNING ref_prefix, seq_counter INTO v_prefix, v_seq;

    IF v_prefix IS NULL THEN
        RAISE EXCEPTION 'Invalid form_definition_id: %', NEW.form_definition_id;
    END IF;

    NEW.reference_number := v_prefix || '-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 4, '0');
    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_set_reference_number
BEFORE INSERT ON public.applications
FOR EACH ROW
WHEN (NEW.reference_number IS NULL OR NEW.reference_number = '')
EXECUTE FUNCTION public.generate_app_reference_number();

-- 8. AUTO-SPAWN APPROVAL PIPELINE TRIGGER
CREATE OR REPLACE FUNCTION public.spawn_approval_pipeline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_pipeline jsonb;
    v_step jsonb;
BEGIN
    SELECT workflow_pipeline INTO v_pipeline
    FROM public.form_definitions
    WHERE id = NEW.form_definition_id;

    FOR v_step IN SELECT * FROM jsonb_array_elements(v_pipeline)
    LOOP
        INSERT INTO public.application_approvals (
            application_id,
            step_order,
            step_label,
            required_role,
            institution_scoped
        ) VALUES (
            NEW.id,
            (v_step->>'step_order')::int2,
            v_step->>'label',
            (v_step->>'role')::public.user_role,
            COALESCE((v_step->>'institution_scoped')::boolean, false)
        );
    END LOOP;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_spawn_approval_pipeline
AFTER INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.spawn_approval_pipeline();

-- 9. ROW LEVEL SECURITY POLICIES (Applications, Approvals & Audit Logs)
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_audit_logs ENABLE ROW LEVEL SECURITY;

-- Applications Policies
CREATE POLICY rls_apps_select ON public.applications
 FOR SELECT TO public
 USING (
    applicant_id = (SELECT id FROM public.users WHERE entra_oid = current_auth_user_id())
    OR (current_auth_role() IN ('HEAD_TEACHER'::public.user_role, 'LINE_MANAGER'::public.user_role) AND institution_id = current_auth_institution_id())
    OR (current_auth_role() IN ('HR_MANAGER'::public.user_role, 'IT_MANAGER'::public.user_role, 'FINANCE_MANAGER'::public.user_role, 'LOGISTICS_MANAGER'::public.user_role, 'SUPER_ADMIN'::public.user_role))
 );

CREATE POLICY rls_apps_insert ON public.applications
 FOR INSERT TO public
 WITH CHECK (
    applicant_id = (SELECT id FROM public.users WHERE entra_oid = current_auth_user_id())
    AND institution_id = current_auth_institution_id()
 );

CREATE POLICY rls_apps_update ON public.applications
 FOR UPDATE TO public
 USING (
    current_auth_role() = 'SUPER_ADMIN'::public.user_role
    OR (
        applicant_id = (SELECT id FROM public.users WHERE entra_oid = current_auth_user_id())
        AND status IN ('DRAFT'::public.lifecycle_status, 'REVISION_REQUIRED'::public.lifecycle_status, 'IN_REVIEW'::public.lifecycle_status)
    )
    OR (
        status = 'IN_REVIEW'::public.lifecycle_status
        AND current_approver_role = current_auth_role()
        AND (
            current_auth_role() NOT IN ('HEAD_TEACHER'::public.user_role, 'LINE_MANAGER'::public.user_role)
            OR institution_id = current_auth_institution_id()
        )
    )
 );

CREATE POLICY rls_apps_postgres_superuser ON public.applications
 FOR ALL TO public
 USING ((CURRENT_USER = 'postgres'::name) OR ((SESSION_USER = 'postgres'::name) AND (CURRENT_USER <> 'educore_app'::name)))
 WITH CHECK ((CURRENT_USER = 'postgres'::name) OR ((SESSION_USER = 'postgres'::name) AND (CURRENT_USER <> 'educore_app'::name)));

-- Application Approvals Policies
CREATE POLICY rls_approvals_select ON public.application_approvals
 FOR SELECT TO public
 USING (
    EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_approvals.application_id)
 );

CREATE POLICY rls_approvals_update ON public.application_approvals
 FOR UPDATE TO public
 USING (
    current_auth_role() = 'SUPER_ADMIN'::public.user_role
    OR (
        required_role = current_auth_role()
        AND status = 'PENDING'::public.approval_step_status
        AND EXISTS (
            SELECT 1 FROM public.applications a 
            WHERE a.id = application_approvals.application_id
              AND a.current_step_order = application_approvals.step_order
              AND (NOT application_approvals.institution_scoped OR a.institution_id = current_auth_institution_id())
        )
    )
 );

CREATE POLICY rls_approvals_postgres_superuser ON public.application_approvals
 FOR ALL TO public
 USING ((CURRENT_USER = 'postgres'::name) OR ((SESSION_USER = 'postgres'::name) AND (CURRENT_USER <> 'educore_app'::name)))
 WITH CHECK ((CURRENT_USER = 'postgres'::name) OR ((SESSION_USER = 'postgres'::name) AND (CURRENT_USER <> 'educore_app'::name)));

-- Audit Logs Policies
CREATE POLICY rls_audit_select ON public.approval_audit_logs
 FOR SELECT TO public
 USING (
    EXISTS (SELECT 1 FROM public.applications a WHERE a.id = approval_audit_logs.application_id)
    AND (is_internal = false OR current_auth_role() <> 'APPLICANT'::public.user_role)
 );

CREATE POLICY rls_audit_insert ON public.approval_audit_logs
 FOR INSERT TO public
 WITH CHECK (
    actor_id = (SELECT id FROM public.users WHERE entra_oid = current_auth_user_id())
 );

CREATE POLICY rls_audit_postgres_superuser ON public.approval_audit_logs
 FOR ALL TO public
 USING ((CURRENT_USER = 'postgres'::name) OR ((SESSION_USER = 'postgres'::name) AND (CURRENT_USER <> 'educore_app'::name)))
 WITH CHECK ((CURRENT_USER = 'postgres'::name) OR ((SESSION_USER = 'postgres'::name) AND (CURRENT_USER <> 'educore_app'::name)));

-- 10. BACKWARDS-COMPATIBLE VIEW FOR EXISTING ICT PURCHASE FRONTEND
CREATE OR REPLACE VIEW public.purchase_applications
WITH (security_invoker = true) AS
SELECT 
    a.id,
    a.reference_number,
    a.applicant_id,
    a.institution_id,
    CASE
        WHEN a.status = 'IN_REVIEW' AND a.current_approver_role = 'HEAD_TEACHER' THEN 'PENDING_GM_REVIEW'::public.application_status
        WHEN a.status = 'IN_REVIEW' AND a.current_approver_role = 'HR_MANAGER' THEN 'PENDING_HR_REVIEW'::public.application_status
        WHEN a.status = 'IN_REVIEW' AND a.current_approver_role = 'IT_MANAGER' THEN 'PENDING_IT_SIGNOFF'::public.application_status
        ELSE a.status::text::public.application_status
    END AS status,
    a.policy_version_id,
    a.legal_text_snapshot,
    a.terms_accepted,
    a.terms_accepted_at,
    a.applicant_ip_address,
    a.applicant_user_agent,
    t.tier_code AS requested_laptop_tier,
    (a.payload->>'repayment_period')::public.repayment_plan AS repayment_period,
    (a.payload->>'estimated_monthly_amount_zmw')::numeric(12,2) AS estimated_monthly_amount_zmw,
    a.applicant_signed_at,
    gm.reviewer_id AS gm_reviewer_id,
    gm.comments AS gm_comments,
    gm.signed_at AS gm_signed_at,
    hr.reviewer_id AS hr_reviewer_id,
    hr.comments AS hr_comments,
    hr.signed_at AS hr_signed_at,
    hr.checklist_data AS hr_vetting_checklist,
    it.reviewer_id AS it_reviewer_id,
    it.step_metadata->>'asset_serial_number' AS asset_serial_number,
    (it.step_metadata->>'deducted_monthly_amount_zmw')::numeric(12,2) AS deducted_monthly_amount,
    (it.step_metadata->>'deduction_start_date')::date AS deduction_start_date,
    (it.step_metadata->>'deduction_end_date')::date AS deduction_end_date,
    it.comments AS it_comments,
    it.signed_at AS it_signed_at,
    a.created_at,
    a.updated_at
FROM public.applications a
JOIN public.form_definitions fd ON a.form_definition_id = fd.id AND fd.code = 'ICT_PURCHASE'
LEFT JOIN public.equipment_tiers t ON (a.payload->>'equipment_tier_id')::uuid = t.id
LEFT JOIN public.application_approvals gm ON gm.application_id = a.id AND gm.step_order = 1
LEFT JOIN public.application_approvals hr ON hr.application_id = a.id AND hr.step_order = 2
LEFT JOIN public.application_approvals it ON it.application_id = a.id AND it.step_order = 3;

CREATE OR REPLACE VIEW public.application_timeline_events
WITH (security_invoker = true) AS
SELECT id, application_id, actor_id, action_type, from_status, to_status, comments, is_internal, metadata, created_at
FROM public.approval_audit_logs;

-- 11. SEED ALL 14 EDUCORE FORMS & THEIR APPROVAL PIPELINES
INSERT INTO public.form_definitions (code, ref_prefix, department, title, requires_policy, workflow_pipeline) VALUES
('ICT_PURCHASE', 'EDC-ICT', 'IT', 'Application ICT Purchase Scheme', true, 
 '[{"step_order":1,"role":"HEAD_TEACHER","label":"GM / Head Teacher Approval","institution_scoped":true},{"step_order":2,"role":"HR_MANAGER","label":"HR Manager Approval","institution_scoped":false},{"step_order":3,"role":"IT_MANAGER","label":"ICT Manager Sign-off","institution_scoped":false}]'::jsonb),
('TRAVEL_REQUEST', 'EDC-TRV', 'LOGISTICS', 'Travel Request Form', false, 
 '[{"step_order":1,"role":"HEAD_TEACHER","label":"Line Manager / Head Approval","institution_scoped":true},{"step_order":2,"role":"LOGISTICS_MANAGER","label":"Logistics Coordination Sign-off","institution_scoped":false}]'::jsonb),
('SALARY_ADVANCE', 'EDC-ADV', 'HR', 'Application for Advance', true, 
 '[{"step_order":1,"role":"HEAD_TEACHER","label":"GM / Head Teacher Endorsement","institution_scoped":true},{"step_order":2,"role":"HR_MANAGER","label":"HR Manager Vetting","institution_scoped":false},{"step_order":3,"role":"FINANCE_MANAGER","label":"Finance Disbursement Approval","institution_scoped":false}]'::jsonb),
('PROF_DEV', 'EDC-PDV', 'HR', 'Application for Professional Development', true, 
 '[{"step_order":1,"role":"HEAD_TEACHER","label":"Head Teacher Endorsement","institution_scoped":true},{"step_order":2,"role":"HR_MANAGER","label":"HR Training Budget Approval","institution_scoped":false}]'::jsonb),
('BANK_CHANGE', 'EDC-BNK', 'HR', 'Change of Bank Details', false, 
 '[{"step_order":1,"role":"HR_MANAGER","label":"HR Verification","institution_scoped":false},{"step_order":2,"role":"FINANCE_MANAGER","label":"Payroll Update Sign-off","institution_scoped":false}]'::jsonb),
('CONTRACT_RENEWAL', 'EDC-CNT', 'HR', 'Contract Renewal Form for HR', false, 
 '[{"step_order":1,"role":"HEAD_TEACHER","label":"Head Teacher Assessment","institution_scoped":true},{"step_order":2,"role":"HR_MANAGER","label":"HR Contract Processing","institution_scoped":false}]'::jsonb),
('CHILD_ADMISSION', 'EDC-CHD', 'HR', 'Educore Staff Child Admission Authorisation', true, 
 '[{"step_order":1,"role":"HEAD_TEACHER","label":"Receiving School Head Approval","institution_scoped":true},{"step_order":2,"role":"HR_MANAGER","label":"HR Staff Benefit Verification","institution_scoped":false}]'::jsonb),
('EXCULPATORY', 'EDC-EXC', 'HR', 'Exculpatory Form', false, 
 '[{"step_order":1,"role":"LINE_MANAGER","label":"Supervisor Review","institution_scoped":true},{"step_order":2,"role":"HR_MANAGER","label":"HR Disciplinary Record Filing","institution_scoped":false}]'::jsonb),
('GRATUITY_ADVANCE', 'EDC-GRT', 'HR', 'Gratuity Advance Application Form - Annual', true, 
 '[{"step_order":1,"role":"HR_MANAGER","label":"HR Gratuity Accrual Check","institution_scoped":false},{"step_order":2,"role":"FINANCE_MANAGER","label":"Finance Payout Sign-off","institution_scoped":false}]'::jsonb),
('JOB_DESCRIPTION', 'EDC-JDS', 'HR', 'Job Description Sign-off', false, 
 '[{"step_order":1,"role":"LINE_MANAGER","label":"Line Manager Confirmation","institution_scoped":true},{"step_order":2,"role":"HR_MANAGER","label":"HR Filing","institution_scoped":false}]'::jsonb),
('MANPOWER_REQ', 'EDC-MPR', 'HR', 'Manpower Requisition Form', false, 
 '[{"step_order":1,"role":"HEAD_TEACHER","label":"Institution Head Request","institution_scoped":true},{"step_order":2,"role":"HR_MANAGER","label":"HR Recruitment Authorization","institution_scoped":false}]'::jsonb),
('EVENT_COMPLETION', 'EDC-EVC', 'FINANCE', 'Event Completion Form', false, 
 '[{"step_order":1,"role":"HEAD_TEACHER","label":"Organizer / Head Sign-off","institution_scoped":true},{"step_order":2,"role":"FINANCE_MANAGER","label":"Finance Reconciliation","institution_scoped":false}]'::jsonb),
('STOCK_RETURN', 'EDC-STR', 'FINANCE', 'Stock Return Form', false, 
 '[{"step_order":1,"role":"LOGISTICS_MANAGER","label":"Stores Inspection","institution_scoped":false},{"step_order":2,"role":"FINANCE_MANAGER","label":"Inventory Ledger Adjustment","institution_scoped":false}]'::jsonb),
('STORES_REQ', 'EDC-SRQ', 'FINANCE', 'Stores Requisition Form', false, 
 '[{"step_order":1,"role":"HEAD_TEACHER","label":"Department / School Head Approval","institution_scoped":true},{"step_order":2,"role":"FINANCE_MANAGER","label":"Stores / Finance Release","institution_scoped":false}]'::jsonb);

-- 12. GRANT PERMISSIONS TO APP ROLE
GRANT SELECT, INSERT, UPDATE ON public.form_definitions TO educore_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO educore_app;
GRANT SELECT, INSERT, UPDATE ON public.application_approvals TO educore_app;
GRANT SELECT, INSERT ON public.approval_audit_logs TO educore_app;
GRANT SELECT ON public.purchase_applications TO educore_app;
GRANT SELECT ON public.application_timeline_events TO educore_app;

COMMIT;