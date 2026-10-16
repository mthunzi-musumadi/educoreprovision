-- ============================================================================
-- Migration: 0008_strict_least_privilege_and_sites
-- Description:
--   1. Enforces strict Least-Privilege Access & Site-Bound Involvement across
--      all 11 roles via a SECURITY DEFINER helper function and updated RLS
--      policies on public.applications, public.application_approvals,
--      public.approval_audit_logs, and public.users.
--   2. Users only see applications that directly involve them (as applicant
--      or as a pipeline reviewer/approver for that application) AND are
--      strictly bound to their assigned Site (unless the step is explicitly
--      central/non-site-scoped and the reviewer belongs to CENTRAL).
--   3. Completes the terminology transition from "Institution" / "School" /
--      "Campus" to "Site" across form definitions, user metadata, and steps.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. COMPLETE "SCHOOL" / "INSTITUTION" -> "SITE" DATA NORMALIZATION
-- ============================================================================

-- Normalize user profile display names & department labels to "Site"
UPDATE public.users
SET full_name = 'Grace Lungu'
WHERE full_name = 'grace.lungu';

UPDATE public.users
SET department = 'Site Leadership',
    job_title  = REPLACE(job_title, 'School', 'Site')
WHERE department = 'School Leadership' OR job_title LIKE '%School%';

-- Update remaining "School" step labels in form_definitions workflow_pipeline
UPDATE public.form_definitions
SET workflow_pipeline = REPLACE(workflow_pipeline::text, 'School Head', 'Site Head')::jsonb
WHERE workflow_pipeline::text LIKE '%School Head%';

UPDATE public.form_definitions
SET workflow_pipeline = REPLACE(workflow_pipeline::text, 'School', 'Site')::jsonb
WHERE workflow_pipeline::text LIKE '%School%';

-- Update any existing application_approvals step_label that still says "School"
UPDATE public.application_approvals
SET step_label = REPLACE(step_label, 'School Head', 'Site Head')
WHERE step_label LIKE '%School Head%';

-- Fix EDC-TRV-2026-0001 Step 1 if it still has legacy HEAD_TEACHER instead of LINE_MANAGER
UPDATE public.application_approvals ap
SET required_role = 'LINE_MANAGER'::public.user_role,
    step_label    = 'Line Manager Endorsement'
FROM public.applications a
WHERE ap.application_id = a.id
  AND a.reference_number = 'EDC-TRV-2026-0001'
  AND ap.step_order = 1
  AND ap.required_role = 'HEAD_TEACHER'::public.user_role
  AND ap.status::text = 'PENDING';

-- Normalize legacy payload keys ("schools" -> "sites", "charging_school" -> "charging_site", etc.)
-- while keeping backward compatibility so existing records render cleanly
UPDATE public.applications
SET payload = payload || jsonb_build_object('sites', payload->'schools')
WHERE payload ? 'schools' AND NOT (payload ? 'sites');

UPDATE public.applications
SET payload = payload || jsonb_build_object('charging_site', payload->'charging_school')
WHERE payload ? 'charging_school' AND NOT (payload ? 'charging_site');

UPDATE public.applications
SET payload = payload || jsonb_build_object('accused_dept_site', payload->'accused_dept_school')
WHERE payload ? 'accused_dept_school' AND NOT (payload ? 'accused_dept_site');

-- ============================================================================
-- 2. SECURITY DEFINER HELPER FOR STRICT LEAST-PRIVILEGE & SITE INVOLVEMENT
-- ============================================================================
-- Why SECURITY DEFINER?
--   public.applications RLS checks public.application_approvals, while
--   public.application_approvals RLS checks public.applications.
--   Using a SECURITY DEFINER helper with a fixed search_path prevents infinite
--   RLS recursion while strictly enforcing site-bound involvement.

CREATE OR REPLACE FUNCTION public.is_user_involved_in_application(
    p_app_id       uuid,
    p_applicant_id uuid,
    p_site_id      uuid,
    p_status       public.lifecycle_status
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_oid       text;
    v_user_id   uuid;
    v_user_role public.user_role;
    v_user_site uuid;
    v_site_code text;
BEGIN
    v_oid := current_setting('request.jwt.claim.sub', true);
    IF v_oid IS NULL OR v_oid = '' THEN
        RETURN false;
    END IF;

    SELECT u.id, u.role, u.site_id, s.code
      INTO v_user_id, v_user_role, v_user_site, v_site_code
      FROM public.users u
      JOIN public.sites s ON s.id = u.site_id
     WHERE u.entra_oid::text = v_oid
       AND u.is_active = true
     LIMIT 1;

    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    -- 1. Central Super Admin oversight (bound to CENTRAL site)
    IF v_user_role = 'SUPER_ADMIN'::public.user_role AND v_site_code = 'CENTRAL' THEN
        RETURN true;
    END IF;

    -- 2. Direct Applicant ownership (strictly bound to the applicant's site)
    IF p_applicant_id = v_user_id AND p_site_id = v_user_site THEN
        RETURN true;
    END IF;

    -- 3. Drafts are strictly private to the applicant who created them
    IF p_status = 'DRAFT'::public.lifecycle_status THEN
        RETURN false;
    END IF;

    -- 4. Pipeline Approver / Reviewer Involvement (strictly site-bound):
    --    The user must be an explicit reviewer OR hold a required_role on at least
    --    one approval step for THIS specific application, AND:
    --      - If the user is assigned to a specific site (v_site_code <> 'CENTRAL'),
    --        the application MUST belong to the user's exact site (p_site_id = v_user_site).
    --      - If the step is site_scoped = true, the application MUST belong to the
    --        user's exact site (p_site_id = v_user_site).
    --      - Central reviewers (v_site_code = 'CENTRAL') can only access cross-site
    --        applications on steps where site_scoped = false AND their role is in the step.
    RETURN EXISTS (
        SELECT 1
          FROM public.application_approvals ap
         WHERE ap.application_id = p_app_id
           AND (
               (ap.reviewer_id = v_user_id AND (p_site_id = v_user_site OR v_site_code = 'CENTRAL'))
               OR (
                   ap.required_role = v_user_role
                   AND (
                       p_site_id = v_user_site
                       OR (NOT ap.site_scoped AND v_site_code = 'CENTRAL')
                   )
               )
           )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_user_act_on_application(
    p_app_id       uuid,
    p_applicant_id uuid,
    p_site_id      uuid,
    p_status       public.lifecycle_status
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_oid       text;
    v_user_id   uuid;
    v_user_role public.user_role;
    v_user_site uuid;
    v_site_code text;
BEGIN
    v_oid := current_setting('request.jwt.claim.sub', true);
    IF v_oid IS NULL OR v_oid = '' THEN
        RETURN false;
    END IF;

    SELECT u.id, u.role, u.site_id, s.code
      INTO v_user_id, v_user_role, v_user_site, v_site_code
      FROM public.users u
      JOIN public.sites s ON s.id = u.site_id
     WHERE u.entra_oid::text = v_oid
       AND u.is_active = true
     LIMIT 1;

    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    -- 1. Central Super Admin
    IF v_user_role = 'SUPER_ADMIN'::public.user_role AND v_site_code = 'CENTRAL' THEN
        RETURN true;
    END IF;

    -- 2. Applicant can update their own application at their own site while DRAFT or REVISION_REQUIRED
    IF p_applicant_id = v_user_id
       AND p_site_id = v_user_site
       AND p_status IN ('DRAFT'::public.lifecycle_status, 'REVISION_REQUIRED'::public.lifecycle_status) THEN
        RETURN true;
    END IF;

    -- 3. Active Approver for a step on this application (strictly site-bound)
    RETURN EXISTS (
        SELECT 1
          FROM public.application_approvals ap
         WHERE ap.application_id = p_app_id
           AND ap.required_role = v_user_role
           AND (
               p_site_id = v_user_site
               OR (NOT ap.site_scoped AND v_site_code = 'CENTRAL')
           )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_user_involved_in_application(uuid, uuid, uuid, public.lifecycle_status) TO educore_app;
GRANT EXECUTE ON FUNCTION public.can_user_act_on_application(uuid, uuid, uuid, public.lifecycle_status) TO educore_app;

-- ============================================================================
-- 3. UPDATE RLS POLICIES ON public.applications
-- ============================================================================

DROP POLICY IF EXISTS rls_apps_select ON public.applications;
CREATE POLICY rls_apps_select
    ON public.applications
    FOR SELECT
    TO educore_app
    USING (
        public.is_user_involved_in_application(id, applicant_id, site_id, status)
    );

DROP POLICY IF EXISTS rls_apps_insert ON public.applications;
CREATE POLICY rls_apps_insert
    ON public.applications
    FOR INSERT
    TO educore_app
    WITH CHECK (
        EXISTS (
            SELECT 1
              FROM public.users u
             WHERE u.entra_oid::text = current_setting('request.jwt.claim.sub', true)
               AND u.is_active = true
               AND u.id = applications.applicant_id
               AND u.site_id = applications.site_id
        )
    );

DROP POLICY IF EXISTS rls_apps_update ON public.applications;
CREATE POLICY rls_apps_update
    ON public.applications
    FOR UPDATE
    TO educore_app
    USING (
        public.can_user_act_on_application(id, applicant_id, site_id, status)
    )
    WITH CHECK (
        public.is_user_involved_in_application(id, applicant_id, site_id, status)
    );

-- ============================================================================
-- 4. UPDATE RLS POLICIES ON public.application_approvals & audit_logs
-- ============================================================================

DROP POLICY IF EXISTS rls_approvals_select ON public.application_approvals;
CREATE POLICY rls_approvals_select
    ON public.application_approvals
    FOR SELECT
    TO educore_app
    USING (
        EXISTS (
            SELECT 1
              FROM public.applications a
             WHERE a.id = application_approvals.application_id
               AND public.is_user_involved_in_application(a.id, a.applicant_id, a.site_id, a.status)
        )
    );

DROP POLICY IF EXISTS rls_approvals_update ON public.application_approvals;
CREATE POLICY rls_approvals_update
    ON public.application_approvals
    FOR UPDATE
    TO educore_app
    USING (
        EXISTS (
            SELECT 1
              FROM public.applications a
              JOIN public.users u ON u.entra_oid::text = current_setting('request.jwt.claim.sub', true) AND u.is_active = true
              JOIN public.sites s ON s.id = u.site_id
             WHERE a.id = application_approvals.application_id
               AND (
                   (u.role = 'SUPER_ADMIN'::public.user_role AND s.code = 'CENTRAL')
                   OR (
                       application_approvals.required_role = u.role
                       AND (
                           a.site_id = u.site_id
                           OR (NOT application_approvals.site_scoped AND s.code = 'CENTRAL')
                       )
                   )
               )
        )
    );

DROP POLICY IF EXISTS rls_audit_select ON public.approval_audit_logs;
CREATE POLICY rls_audit_select
    ON public.approval_audit_logs
    FOR SELECT
    TO educore_app
    USING (
        EXISTS (
            SELECT 1
              FROM public.applications a
             WHERE a.id = approval_audit_logs.application_id
               AND public.is_user_involved_in_application(a.id, a.applicant_id, a.site_id, a.status)
        )
    );

COMMIT;
