-- ============================================================================
-- Educore Provision: ICT Equipment Purchase Scheme Portal
-- Migration 0002: Row-Level Security (RLS) & Multi-Tenant Isolation
-- Target: PostgreSQL 18
-- ============================================================================

-- 1. Enable Row-Level Security on Sensitive Tables
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Session Context Extraction Helpers (Interprets Entra ID JWT Claims)
CREATE OR REPLACE FUNCTION current_auth_user_id() 
RETURNS UUID AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_auth_institution_id() 
RETURNS UUID AS $$
    SELECT institution_id 
    FROM users 
    WHERE entra_oid = current_auth_user_id();
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_auth_role() 
RETURNS user_role AS $$
    SELECT role 
    FROM users 
    WHERE entra_oid = current_auth_user_id();
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 3. Applications Table Security Policies
-- ============================================================================

-- 3.1 SELECT Policy: Strict Multi-Tenant & Role Isolation
DROP POLICY IF EXISTS rls_applicant_select ON applications;
CREATE POLICY rls_applicant_select ON applications
    FOR SELECT 
    USING (
        applicant_id = (SELECT id FROM users WHERE entra_oid = current_auth_user_id())
    );

DROP POLICY IF EXISTS rls_head_teacher_select ON applications;
CREATE POLICY rls_head_teacher_select ON applications
    FOR SELECT 
    USING (
        current_auth_role() = 'HEAD_TEACHER' AND
        institution_id = current_auth_institution_id()
    );

DROP POLICY IF EXISTS rls_central_staff_select ON applications;
CREATE POLICY rls_central_staff_select ON applications
    FOR SELECT 
    USING (
        current_auth_role() IN ('HR_MANAGER', 'IT_MANAGER', 'SUPER_ADMIN')
    );

-- 3.2 INSERT Policy: Applicants Only, Bound to Assigned School
DROP POLICY IF EXISTS rls_applicant_insert ON applications;
CREATE POLICY rls_applicant_insert ON applications
    FOR INSERT 
    WITH CHECK (
        applicant_id = (SELECT id FROM users WHERE entra_oid = current_auth_user_id()) AND
        institution_id = current_auth_institution_id()
    );

-- 3.3 UPDATE Policies: Role-Stage Guardrails
-- Head Teacher can only endorse Part 2 for their school in PENDING_GM_REVIEW
DROP POLICY IF EXISTS rls_head_teacher_update ON applications;
CREATE POLICY rls_head_teacher_update ON applications
    FOR UPDATE 
    USING (
        current_auth_role() = 'HEAD_TEACHER' AND
        institution_id = current_auth_institution_id() AND
        status = 'PENDING_GM_REVIEW'
    )
    WITH CHECK (
        institution_id = current_auth_institution_id() AND
        status IN ('PENDING_HR_REVIEW', 'REVISION_REQUIRED', 'REJECTED')
    );

-- Central HR can only clear Part 3 in PENDING_HR_REVIEW
DROP POLICY IF EXISTS rls_hr_manager_update ON applications;
CREATE POLICY rls_hr_manager_update ON applications
    FOR UPDATE 
    USING (
        current_auth_role() IN ('HR_MANAGER', 'SUPER_ADMIN') AND
        status = 'PENDING_HR_REVIEW'
    )
    WITH CHECK (
        status IN ('PENDING_IT_SIGNOFF', 'REJECTED')
    );

-- Central IT can only finalize Part 4 in PENDING_IT_SIGNOFF
DROP POLICY IF EXISTS rls_it_manager_update ON applications;
CREATE POLICY rls_it_manager_update ON applications
    FOR UPDATE 
    USING (
        current_auth_role() IN ('IT_MANAGER', 'SUPER_ADMIN') AND
        status = 'PENDING_IT_SIGNOFF'
    )
    WITH CHECK (
        status IN ('APPROVED', 'REJECTED')
    );

-- Applicant can withdraw application while in PENDING_GM_REVIEW or REVISION_REQUIRED
DROP POLICY IF EXISTS rls_applicant_withdraw ON applications;
CREATE POLICY rls_applicant_withdraw ON applications
    FOR UPDATE
    USING (
        applicant_id = (SELECT id FROM users WHERE entra_oid = current_auth_user_id()) AND
        status IN ('PENDING_GM_REVIEW', 'REVISION_REQUIRED')
    )
    WITH CHECK (
        status = 'CLOSED'
    );

-- Super Admin can update any application
DROP POLICY IF EXISTS rls_super_admin_update ON applications;
CREATE POLICY rls_super_admin_update ON applications
    FOR UPDATE 
    USING (
        current_auth_role() = 'SUPER_ADMIN'
    );

-- ============================================================================
-- 4. Approval Audit Logs Table Security Policies
-- ============================================================================

-- 4.1 SELECT Policy: Hides is_internal flags from applicants
DROP POLICY IF EXISTS rls_audit_select ON approval_audit_logs;
CREATE POLICY rls_audit_select ON approval_audit_logs
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM applications a
            WHERE a.id = application_id
        ) AND (
            is_internal = FALSE OR 
            current_auth_role() IN ('HEAD_TEACHER', 'HR_MANAGER', 'IT_MANAGER', 'SUPER_ADMIN')
        )
    );

-- 4.2 INSERT Policy: Any authenticated actor involved in transition
DROP POLICY IF EXISTS rls_audit_insert ON approval_audit_logs;
CREATE POLICY rls_audit_insert ON approval_audit_logs
    FOR INSERT 
    WITH CHECK (
        actor_id = (SELECT id FROM users WHERE entra_oid = current_auth_user_id())
    );

-- 4.3 Superuser / System Maintenance Access
DROP POLICY IF EXISTS rls_postgres_superuser ON applications;
CREATE POLICY rls_postgres_superuser ON applications
    FOR ALL
    USING (
        CURRENT_USER = 'postgres' OR
        (SESSION_USER = 'postgres' AND CURRENT_USER != 'educore_app')
    )
    WITH CHECK (
        CURRENT_USER = 'postgres' OR
        (SESSION_USER = 'postgres' AND CURRENT_USER != 'educore_app')
    );

DROP POLICY IF EXISTS rls_postgres_superuser ON approval_audit_logs;
CREATE POLICY rls_postgres_superuser ON approval_audit_logs
    FOR ALL
    USING (
        CURRENT_USER = 'postgres' OR
        (SESSION_USER = 'postgres' AND CURRENT_USER != 'educore_app')
    )
    WITH CHECK (
        CURRENT_USER = 'postgres' OR
        (SESSION_USER = 'postgres' AND CURRENT_USER != 'educore_app')
    );
