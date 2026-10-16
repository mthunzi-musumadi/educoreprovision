-- ============================================================================
-- Migration 0011: Secure Applicant In-Flight Application Withdrawal
-- Description:
--   Allows applicants to cancel/withdraw their own applications even while
--   in-flight ('IN_REVIEW', 'DRAFT', or 'REVISION_REQUIRED') without
--   compromising RLS anti-forgery rules.
--   Enforces applicant ownership, records an immutable audit log, and strictly
--   transitions the lifecycle state to 'CLOSED'.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.withdraw_application(
    p_app_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS public.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_oid         text;
    v_user_id     uuid;
    v_user_name   text;
    v_user_role   public.user_role;
    v_user_site   uuid;
    v_app         public.applications%ROWTYPE;
    v_updated_app public.applications%ROWTYPE;
BEGIN
    -- 1. Identify authenticated caller from session context
    v_oid := current_setting('request.jwt.claim.sub', true);
    IF v_oid IS NULL OR v_oid = '' THEN
        RAISE EXCEPTION 'Authentication required to withdraw an application.';
    END IF;

    SELECT u.id, u.full_name, u.role, u.site_id
      INTO v_user_id, v_user_name, v_user_role, v_user_site
      FROM public.users u
     WHERE u.entra_oid::text = v_oid
       AND u.is_active = true
     LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Active authenticated user not found.';
    END IF;

    -- 2. Lock application row for update
    SELECT *
      INTO v_app
      FROM public.applications
     WHERE id = p_app_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found.';
    END IF;

    -- 3. Enforce strict applicant ownership & site boundary
    IF v_app.applicant_id <> v_user_id THEN
        RAISE EXCEPTION 'Access denied: You can only withdraw your own applications.';
    END IF;

    IF v_app.site_id <> v_user_site THEN
        RAISE EXCEPTION 'Access denied: Application site does not match your assigned site.';
    END IF;

    -- 4. Check eligible lifecycle statuses
    IF v_app.status NOT IN (
        'DRAFT'::public.lifecycle_status,
        'IN_REVIEW'::public.lifecycle_status,
        'REVISION_REQUIRED'::public.lifecycle_status
    ) THEN
        RAISE EXCEPTION 'Cannot withdraw application in status % (only DRAFT, IN_REVIEW, or REVISION_REQUIRED can be withdrawn).', v_app.status;
    END IF;

    -- 5. Atomically transition state to CLOSED and clear active approver roles
    UPDATE public.applications
       SET status = 'CLOSED'::public.lifecycle_status,
           current_step_order = NULL,
           current_approver_role = NULL,
           updated_at = NOW()
     WHERE id = p_app_id
    RETURNING * INTO v_updated_app;

    -- 6. Insert immutable audit trail
    INSERT INTO public.approval_audit_logs (
        application_id,
        actor_id,
        actor_name,
        actor_role,
        action_type,
        from_status,
        to_status,
        comments,
        metadata
    ) VALUES (
        p_app_id,
        v_user_id,
        v_user_name,
        v_user_role,
        'APPLICATION_WITHDRAWN',
        v_app.status,
        'CLOSED'::public.lifecycle_status,
        COALESCE(p_reason, 'Application withdrawn by applicant.'),
        jsonb_build_object(
            'withdrawn_by_applicant', true,
            'previous_status', v_app.status,
            'previous_step_order', v_app.current_step_order,
            'previous_approver_role', v_app.current_approver_role
        )
    );

    RETURN v_updated_app;
END;
$$;

GRANT EXECUTE ON FUNCTION public.withdraw_application(uuid, text) TO educore_app;
