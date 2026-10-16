-- ============================================================================
-- Migration 0010: Fix Approval Envelope State Transition Under RLS
-- Description:
--   When processApprovalStep updates application_approvals (step status -> APPROVED),
--   subsequent update on public.applications was blocked by can_user_act_on_application
--   because the active step was no longer 'PENDING'.
--   This migration allows the authorized reviewer who just recorded the decision
--   (ap.reviewer_id = v_user_id) to finalize the envelope state transition.
--   It also heals any application stuck on an already-approved step.
-- ============================================================================

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
    --    (either currently PENDING or just signed off by this reviewer).
    RETURN EXISTS (
        SELECT 1
          FROM public.applications a
          JOIN public.application_approvals ap ON ap.application_id = a.id
         WHERE a.id = p_app_id
           AND ap.step_order = a.current_step_order
           AND (ap.status = 'PENDING'::public.approval_step_status OR ap.reviewer_id = v_user_id)
           AND ap.required_role = v_user_role
           AND (
               p_site_id = v_user_site
               OR (NOT ap.site_scoped AND v_site_code = 'CENTRAL')
           )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_user_act_on_application(uuid, uuid, uuid, public.lifecycle_status) TO educore_app;

-- 5. Heal any existing stuck applications where current step is already completed
DO $$
DECLARE
    rec RECORD;
    v_next_step RECORD;
BEGIN
    FOR rec IN 
        SELECT a.id, a.reference_number, a.current_step_order
        FROM public.applications a
        JOIN public.application_approvals ap ON ap.application_id = a.id AND ap.step_order = a.current_step_order
        WHERE a.status = 'IN_REVIEW' AND ap.status != 'PENDING'
    LOOP
        SELECT step_order, required_role INTO v_next_step
        FROM public.application_approvals
        WHERE application_id = rec.id AND step_order > rec.current_step_order AND status = 'PENDING'
        ORDER BY step_order ASC LIMIT 1;

        IF v_next_step.step_order IS NOT NULL THEN
            UPDATE public.applications
            SET current_step_order = v_next_step.step_order,
                current_approver_role = v_next_step.required_role,
                updated_at = NOW()
            WHERE id = rec.id;
            RAISE NOTICE 'Advanced stuck application % to step % (%)', rec.reference_number, v_next_step.step_order, v_next_step.required_role;
        ELSE
            UPDATE public.applications
            SET status = 'APPROVED',
                current_step_order = NULL,
                current_approver_role = NULL,
                updated_at = NOW()
            WHERE id = rec.id;
            RAISE NOTICE 'Marked completed application % as APPROVED', rec.reference_number;
        END IF;
    END LOOP;
END;
$$;
