-- ============================================================================
-- Migration 0014: Allow Withdrawn Draft Applications in Check Constraint
-- Description:
--   When an unsubmitted draft is withdrawn, its status transitions to 'CLOSED'.
--   Because the draft was never submitted, applicant_signed_at remains NULL.
--   This migration updates chk_envelope_submission to allow status IN ('DRAFT', 'CLOSED')
--   when applicant_signed_at is NULL, while maintaining the strict requirement
--   that active in-flight or finalized applications ('IN_REVIEW', 'REVISION_REQUIRED',
--   'APPROVED', 'REJECTED') must have applicant_signed_at IS NOT NULL.
-- ============================================================================

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS chk_envelope_submission;

ALTER TABLE public.applications ADD CONSTRAINT chk_envelope_submission CHECK (
    (status IN ('DRAFT'::public.lifecycle_status, 'CLOSED'::public.lifecycle_status)) OR (applicant_signed_at IS NOT NULL)
);
