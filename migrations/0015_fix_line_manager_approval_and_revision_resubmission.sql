-- ============================================================================
-- Migration 0015: Fix Line Manager Approval and Revision Resubmission
-- Description:
--   1. Allow active approval step sign-off when a previously revision-requested
--      step is awaiting review (ap.status IN ('PENDING', 'REVISION_REQUESTED')).
--   2. Update rls_approvals_update on public.application_approvals so that
--      authorized approvers are not blocked by RLS when reviewing a resubmitted step.
--   3. Update can_user_act_on_application so the envelope transition is permitted.
--   4. Heal any existing in-flight applications stuck in IN_REVIEW where the active
--      step remained in REVISION_REQUESTED state.
--   5. Synchronize applications.current_approver_role with active approval step.
-- ============================================================================

-- 1. Update can_user_act_on_application to allow sign-off on PENDING or REVISION_REQUESTED active step
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
    --    User must hold the exact required_role on the active approval step
    --    (either currently awaiting review or just signed off by this reviewer).
    RETURN EXISTS (
        SELECT 1
          FROM public.applications a
          JOIN public.application_approvals ap ON ap.application_id = a.id
         WHERE a.id = p_app_id
           AND ap.step_order = a.current_step_order
           AND (ap.status IN ('PENDING'::public.approval_step_status, 'REVISION_REQUESTED'::public.approval_step_status) OR ap.reviewer_id = v_user_id)
           AND ap.required_role = v_user_role
           AND (
               p_site_id = v_user_site
               OR (NOT ap.site_scoped AND v_site_code = 'CENTRAL')
           )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_user_act_on_application(uuid, uuid, uuid, public.lifecycle_status) TO educore_app;

-- 2. Update RLS policy on public.application_approvals to permit sign-off on PENDING or REVISION_REQUESTED steps
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
               AND application_approvals.status IN ('PENDING'::public.approval_step_status, 'REVISION_REQUESTED'::public.approval_step_status)
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

-- 3. Heal existing stuck applications where active step is REVISION_REQUESTED
UPDATE public.application_approvals ap
   SET status = 'PENDING'::public.approval_step_status,
       reviewer_id = NULL,
       reviewer_name = NULL,
       comments = NULL,
       checklist_data = '{}'::jsonb,
       step_metadata = '{}'::jsonb,
       digital_signature = NULL,
       signed_at = NULL,
       updated_at = NOW()
  FROM public.applications a
 WHERE a.id = ap.application_id
   AND a.status = 'IN_REVIEW'::public.lifecycle_status
   AND a.current_step_order = ap.step_order
   AND ap.status = 'REVISION_REQUESTED'::public.approval_step_status;

-- 4. Synchronize applications.current_approver_role with active approval step
UPDATE public.applications a
   SET current_approver_role = ap.required_role,
       updated_at = NOW()
  FROM public.application_approvals ap
 WHERE a.id = ap.application_id
   AND a.status = 'IN_REVIEW'::public.lifecycle_status
   AND a.current_step_order = ap.step_order
   AND (a.current_approver_role IS NULL OR a.current_approver_role != ap.required_role);
