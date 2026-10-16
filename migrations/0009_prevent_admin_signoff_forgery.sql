-- ============================================================================
-- Migration 0009: Prevent Admin Sign-off Forgery & Enforce Strict Step Sign-off
-- Description:
--   High-privilege oversight roles such as System Administrator (SUPER_ADMIN)
--   must have read-only oversight across all applications, but CANNOT sign off
--   or act on approval steps that do not designate them. Signing off on behalf
--   of another role constitutes forgery and violates corporate governance.
--   Also prevents applicants from signing off on their own applications.
-- ============================================================================

-- 1. Redefine can_user_act_on_application without SUPER_ADMIN blanket override
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

    -- 1. Direct Applicant can edit/update application while in DRAFT or REVISION_REQUIRED
    IF p_applicant_id = v_user_id
       AND p_site_id = v_user_site
       AND p_status IN ('DRAFT'::public.lifecycle_status, 'REVISION_REQUIRED'::public.lifecycle_status) THEN
        RETURN true;
    END IF;

    -- 2. Conflict of interest: Applicants CANNOT approve/act on their own applications
    IF p_applicant_id = v_user_id THEN
        RETURN false;
    END IF;

    -- 3. Application must be IN_REVIEW for an approver to act
    IF p_status <> 'IN_REVIEW'::public.lifecycle_status THEN
        RETURN false;
    END IF;

    -- 4. Active Step Approver (Strict Role & Site bound - NO admin forgery bypass)
    --    User must hold the exact required_role on the CURRENT active approval step
    RETURN EXISTS (
        SELECT 1
          FROM public.applications a
          JOIN public.application_approvals ap ON ap.application_id = a.id
         WHERE a.id = p_app_id
           AND ap.step_order = a.current_step_order
           AND ap.status = 'PENDING'::public.approval_step_status
           AND ap.required_role = v_user_role
           AND (
               p_site_id = v_user_site
               OR (NOT ap.site_scoped AND v_site_code = 'CENTRAL')
           )
    );
END;
$$;

-- 2. Update RLS policy on public.application_approvals to remove SUPER_ADMIN bypass
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
               AND a.status = 'IN_REVIEW'::public.lifecycle_status
               AND a.current_step_order = application_approvals.step_order
               AND application_approvals.status = 'PENDING'::public.approval_step_status
               AND application_approvals.required_role = u.role
               AND a.applicant_id <> u.id  -- No self-approval
               AND (
                   a.site_id = u.site_id
                   OR (NOT application_approvals.site_scoped AND s.code = 'CENTRAL')
               )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
              FROM public.applications a
              JOIN public.users u ON u.entra_oid::text = current_setting('request.jwt.claim.sub', true) AND u.is_active = true
              JOIN public.sites s ON s.id = u.site_id
             WHERE a.id = application_approvals.application_id
               AND application_approvals.required_role = u.role
               AND a.applicant_id <> u.id
               AND (
                   a.site_id = u.site_id
                   OR (NOT application_approvals.site_scoped AND s.code = 'CENTRAL')
               )
        )
    );

-- 3. Ensure permissions
GRANT EXECUTE ON FUNCTION public.can_user_act_on_application(uuid, uuid, uuid, public.lifecycle_status) TO educore_app;
