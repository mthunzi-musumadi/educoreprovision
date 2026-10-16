-- ============================================================================
-- Educore Provision Migration 0012: Application Attachments & Supporting Documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.application_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_app ON public.application_attachments(application_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploader ON public.application_attachments(uploader_id);

-- Enable Row-Level Security
ALTER TABLE public.application_attachments ENABLE ROW LEVEL SECURITY;

-- Select policy: User must be involved in the parent application
DROP POLICY IF EXISTS rls_attachments_select ON public.application_attachments;
CREATE POLICY rls_attachments_select
    ON public.application_attachments
    FOR SELECT
    TO educore_app
    USING (
        EXISTS (
            SELECT 1
              FROM public.applications a
             WHERE a.id = application_attachments.application_id
               AND public.is_user_involved_in_application(a.id, a.applicant_id, a.site_id, a.status)
        )
    );

-- Insert policy: User must be eligible to act on the application
DROP POLICY IF EXISTS rls_attachments_insert ON public.application_attachments;
CREATE POLICY rls_attachments_insert
    ON public.application_attachments
    FOR INSERT
    TO educore_app
    WITH CHECK (
        uploader_id = (
            SELECT id FROM public.users WHERE entra_oid::text = current_setting('request.jwt.claim.sub', true)
        )
        AND EXISTS (
            SELECT 1
              FROM public.applications a
             WHERE a.id = application_attachments.application_id
               AND public.can_user_act_on_application(a.id, a.applicant_id, a.site_id, a.status)
        )
    );

-- Delete policy: Uploader or Super Admin can delete attachment
DROP POLICY IF EXISTS rls_attachments_delete ON public.application_attachments;
CREATE POLICY rls_attachments_delete
    ON public.application_attachments
    FOR DELETE
    TO educore_app
    USING (
        uploader_id = (
            SELECT id FROM public.users WHERE entra_oid::text = current_setting('request.jwt.claim.sub', true)
        )
        OR public.current_auth_role() = 'SUPER_ADMIN'::public.user_role
    );

GRANT ALL ON TABLE public.application_attachments TO educore_app;
