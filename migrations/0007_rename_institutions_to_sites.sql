ROLLBACK;
BEGIN;

-- 1. DROP DEPENDENT VIEWS & RLS POLICIES BEFORE RENAMING
DROP VIEW IF EXISTS public.purchase_applications CASCADE;
DROP POLICY IF EXISTS rls_apps_select ON public.applications;
DROP POLICY IF EXISTS rls_apps_insert ON public.applications;
DROP POLICY IF EXISTS rls_apps_update ON public.applications;
DROP POLICY IF EXISTS rls_approvals_update ON public.application_approvals;

-- 2. RENAME TABLE, COLUMNS, AND INDEXES (Pure SQL, zero DO $$ blocks)
ALTER TABLE IF EXISTS public.sites RENAME TO sites;
ALTER INDEX IF EXISTS sites_pkey RENAME TO sites_pkey;
ALTER INDEX IF EXISTS sites_code_key RENAME TO sites_code_key;
ALTER INDEX IF EXISTS sites_name_key RENAME TO sites_name_key;

ALTER TABLE public.users RENAME COLUMN site_id TO site_id;
ALTER INDEX IF EXISTS idx_users_institution RENAME TO idx_users_site;

ALTER TABLE public.applications RENAME COLUMN site_id TO site_id;
ALTER INDEX IF EXISTS idx_apps_institution RENAME TO idx_apps_site;

ALTER TABLE public.application_approvals RENAME COLUMN site_scoped TO site_scoped;

-- 3. UPDATE JSONB WORKFLOW PIPELINE KEYS ("site_scoped" -> "site_scoped")
UPDATE public.form_definitions
SET workflow_pipeline = REPLACE(workflow_pipeline::text, '"site_scoped"', '"site_scoped"')::jsonb;

-- 4. REPLACE AUTH HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.current_auth_site_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
    SELECT site_id 
    FROM public.users 
    WHERE entra_oid = public.current_auth_user_id();
$function$;

GRANT ALL ON FUNCTION public.current_auth_site_id() TO PUBLIC;
GRANT ALL ON FUNCTION public.current_auth_site_id() TO postgres;
GRANT ALL ON FUNCTION public.current_auth_site_id() TO educore_app;

CREATE OR REPLACE FUNCTION public.current_auth_site_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
    SELECT public.current_auth_site_id();
$function$;

-- 5. UPDATE PIPELINE SPAWN TRIGGER TO USE site_scoped
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
            site_scoped
        ) VALUES (
            NEW.id,
            (v_step->>'step_order')::int2,
            v_step->>'label',
            (v_step->>'role')::public.user_role,
            COALESCE((v_step->>'site_scoped')::boolean, false)
        );
    END LOOP;

    RETURN NEW;
END;
$function$;

-- 6. RECREATE RLS POLICIES USING site_id AND site_scoped
CREATE POLICY rls_apps_select ON public.applications
 FOR SELECT TO public
 USING (
    applicant_id = (SELECT id FROM public.users WHERE entra_oid = current_auth_user_id())
    OR (current_auth_role() IN ('HEAD_TEACHER'::public.user_role, 'LINE_MANAGER'::public.user_role) AND site_id = current_auth_site_id())
    OR (current_auth_role() IN ('HR_MANAGER'::public.user_role, 'IT_MANAGER'::public.user_role, 'FINANCE_MANAGER'::public.user_role, 'LOGISTICS_MANAGER'::public.user_role, 'SUPER_ADMIN'::public.user_role))
 );

CREATE POLICY rls_apps_insert ON public.applications
 FOR INSERT TO public
 WITH CHECK (
    applicant_id = (SELECT id FROM public.users WHERE entra_oid = current_auth_user_id())
    AND site_id = current_auth_site_id()
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
            OR site_id = current_auth_site_id()
        )
    )
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
              AND (NOT application_approvals.site_scoped OR a.site_id = current_auth_site_id())
        )
    )
 );

-- 7. RECREATE BACKWARDS-COMPATIBLE ICT PURCHASE VIEW
CREATE OR REPLACE VIEW public.purchase_applications
WITH (security_invoker = true) AS
SELECT 
    a.id,
    a.reference_number,
    a.applicant_id,
    a.site_id,
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

GRANT SELECT, INSERT, UPDATE ON public.sites TO educore_app;
GRANT SELECT ON public.purchase_applications TO educore_app;

-- ============================================================================
-- 8. CONSOLIDATE SITES USING PHYSICAL ROW CTID (100% COLLISION-PROOF)
-- ============================================================================

-- Step 8a: Rename all existing rows using their physical tuple ctid so none can ever collide
UPDATE public.sites
SET code = 'LEGACY_' || ctid::text,
    name = 'Legacy Site ' || ctid::text;

-- Step 8b: Insert the 9 official Educore sites cleanly
INSERT INTO public.sites (code, name, location, is_active) VALUES
  ('SKAL', 'Sentinel Kalumbila (SKAL)', 'Kalumbila, Northwestern Province', true),
  ('SKAB_PRI', 'Sentinel Kabitaka Primary (SKAB Primary)', 'Solwezi, Northwestern Province', true),
  ('SKAB_SEC', 'Sentinel Kabitaka Secondary (SKAB Secondary)', 'Solwezi, Northwestern Province', true),
  ('TCL', 'Trident College (TCL)', 'Solwezi, Northwestern Province', true),
  ('TPK', 'Trident Prep Kalumbila (TPK)', 'Kalumbila, Northwestern Province', true),
  ('TPS', 'Trident Prep Solwezi (TPS)', 'Solwezi, Northwestern Province', true),
  ('TPL', 'Trident Prep Lusaka (TPL)', 'Lusaka, Lusaka Province', true),
  ('TEA', 'The Educore Academy', 'Solwezi, Northwestern Province', true),
  ('CENTRAL', 'Central Administration', 'Solwezi / Lusaka HQ', true);

-- Step 8c: Re-point all users & applications to the new official site IDs
UPDATE public.users
SET site_id = (SELECT id FROM public.sites WHERE code = 'TCL')
WHERE email LIKE '%@trident-college.com';

UPDATE public.users
SET site_id = (SELECT id FROM public.sites WHERE code = 'SKAB_SEC')
WHERE email LIKE '%@sentinel-kabitaka.com';

UPDATE public.users
SET site_id = (SELECT id FROM public.sites WHERE code = 'CENTRAL')
WHERE site_id IN (SELECT id FROM public.sites WHERE code LIKE 'LEGACY_%');

UPDATE public.applications a
SET site_id = u.site_id
FROM public.users u
WHERE a.applicant_id = u.id;

UPDATE public.applications
SET site_id = (SELECT id FROM public.sites WHERE code = 'TCL')
WHERE site_id IN (SELECT id FROM public.sites WHERE code LIKE 'LEGACY_%');

-- Step 8d: Delete the old LEGACY_ rows now that zero foreign keys point to them
DELETE FROM public.sites WHERE code LIKE 'LEGACY_%';

COMMIT;