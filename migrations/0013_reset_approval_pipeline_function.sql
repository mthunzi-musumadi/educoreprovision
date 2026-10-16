-- ============================================================================
-- Migration 0013: Stored Procedure to Reset Application Approval Pipeline
-- Description:
--   Allows applicants or Super Admin to reset the approval pipeline steps
--   back to PENDING when resubmitting an application that required revisions.
--   Enforces security definer privileges to safely bypass direct table UPDATE
--   RLS on application_approvals while enforcing applicant ownership.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_application_approval_pipeline(p_app_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_oid       text;
    v_user_id   uuid;
    v_app       public.applications%ROWTYPE;
BEGIN
    -- 1. Identify caller
    v_oid := current_setting('request.jwt.claim.sub', true);
    IF v_oid IS NULL OR v_oid = '' THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT id INTO v_user_id 
      FROM public.users 
     WHERE entra_oid::text = v_oid AND is_active = true 
     LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Active authenticated user not found.';
    END IF;

    SELECT * INTO v_app 
      FROM public.applications 
     WHERE id = p_app_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found.';
    END IF;

    -- 2. Verify caller is the applicant or Super Admin
    IF v_app.applicant_id <> v_user_id AND current_auth_role() <> 'SUPER_ADMIN'::public.user_role THEN
        RAISE EXCEPTION 'Access denied: You can only reset approval pipeline for your own applications.';
    END IF;

    -- 3. Reset all approval steps for this application back to PENDING and clear reviewer data
    UPDATE public.application_approvals
       SET status = 'PENDING'::public.approval_step_status,
           reviewer_id = NULL,
           reviewer_name = NULL,
           comments = NULL,
           checklist_data = '{}'::jsonb,
           step_metadata = '{}'::jsonb,
           digital_signature = NULL,
           signed_at = NULL,
           updated_at = NOW()
     WHERE application_id = p_app_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_application_approval_pipeline(uuid) TO educore_app;
