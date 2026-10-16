-- ============================================================================
-- Educore Provision: ICT Equipment Purchase Scheme Portal
-- Migration 0001: Core Schema Architecture
-- Target: PostgreSQL 18
-- ============================================================================

-- 1. Enable Required Cryptographic & UUID Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enumerated Domain Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'APPLICANT',       -- School teachers, academic & operational staff
        'HEAD_TEACHER',    -- Campus leadership (Head Teachers / General Managers)
        'HR_MANAGER',      -- Central HR Operations (People & Payroll Compliance)
        'IT_MANAGER',      -- Central ICT Operations (Procurement, MDM & Asset Tagging)
        'SUPER_ADMIN'      -- IT Systems Engineering & Compliance Governance
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE application_status AS ENUM (
        'DRAFT',               -- Unsubmitted draft
        'PENDING_GM_REVIEW',   -- Part 1 complete, awaiting Head Teacher endorsement (Part 2)
        'PENDING_HR_REVIEW',   -- Part 2 complete, awaiting Central HR debt clearance (Part 3)
        'PENDING_IT_SIGNOFF',  -- Part 3 complete, awaiting Central IT asset serial & schedule (Part 4)
        'REVISION_REQUIRED',   -- GM or HR requested revision from applicant
        'APPROVED',            -- Part 4 finalized, sealed PDF generated, active payroll deductions
        'REJECTED',            -- Terminated at GM, HR, or IT stage
        'CLOSED'               -- Fully repaid or withdrawn
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE equipment_tier_code AS ENUM (
        'LEVEL_1',             -- Standard Faculty & Administrative Productivity
        'LEVEL_2'              -- Advanced STEM Computational & Multimedia Workload
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE repayment_plan AS ENUM (
        'ONE_TO_TWO_MONTHS',   -- Accelerated 1 to 2 months deduction
        'TWELVE_MONTHS',       -- Standard 12 months (1 year) deduction
        'TWENTY_FOUR_MONTHS'   -- Extended 24 months (2 years) deduction
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. Core Tables
-- ============================================================================

-- 3.1 Sites Table (Multi-Campus Tenant Registry)
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,       -- e.g., 'TRIDENT_COLLEGE', 'SENTINEL_KABITAKA'
    name VARCHAR(150) NOT NULL UNIQUE,
    location VARCHAR(200) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 Equipment Tiers Table (Hardware Catalog)
CREATE TABLE IF NOT EXISTS equipment_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_code equipment_tier_code NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    subtitle VARCHAR(255) NOT NULL,
    price_zmw NUMERIC(12, 2) NOT NULL CHECK (price_zmw > 0),
    processor VARCHAR(150) NOT NULL,
    ram VARCHAR(100) NOT NULL,
    storage VARCHAR(100) NOT NULL,
    display VARCHAR(150) NOT NULL,
    graphics VARCHAR(150) NOT NULL,
    warranty VARCHAR(255) NOT NULL,
    target_audience TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 Policy Legal Versions Table (Verbatim Policy Document Snapshots)
CREATE TABLE IF NOT EXISTS policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_tag VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'v1.0-2026'
    legal_text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 Users Table (Synchronized with Microsoft Entra ID Directory Claims)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entra_oid UUID NOT NULL UNIQUE,          -- Microsoft Entra ID Object ID claim
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    employee_number VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'EDC-1042'
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'APPLICANT',
    department VARCHAR(100),
    job_title VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 Applications Table (Core 4-Stage Purchase Application Lifecycle)
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'EDC-ICT-2026-0001'
    applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    status application_status NOT NULL DEFAULT 'DRAFT',

    -- Per-Request Screen 0 Legal Gate Snapshot
    policy_version_id UUID NOT NULL REFERENCES policy_versions(id) ON DELETE RESTRICT,
    legal_text_snapshot TEXT NOT NULL,
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted_at TIMESTAMPTZ,
    applicant_ip_address INET,
    applicant_user_agent TEXT,

    -- Part 1: Applicant Choices & Digital Signature
    equipment_tier_id UUID NOT NULL REFERENCES equipment_tiers(id) ON DELETE RESTRICT,
    repayment_period repayment_plan NOT NULL,
    estimated_monthly_amount_zmw NUMERIC(12, 2) NOT NULL CHECK (estimated_monthly_amount_zmw > 0),
    applicant_signed_at TIMESTAMPTZ,
    applicant_digital_signature VARCHAR(255),

    -- Part 2: Head Teacher / GM Endorsement
    gm_reviewer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    gm_reviewer_name VARCHAR(150),
    gm_comments TEXT,
    gm_signed_at TIMESTAMPTZ,
    gm_digital_signature VARCHAR(255),

    -- Part 3: Central HR Review & Statutory Clearance
    hr_reviewer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    hr_reviewer_name VARCHAR(150),
    hr_comments TEXT,
    hr_signed_at TIMESTAMPTZ,
    hr_vetting_checklist JSONB DEFAULT '{}'::jsonb, -- probation_cleared, zero_advances, debt_ratio_cleared
    hr_digital_signature VARCHAR(255),

    -- Part 4: Central ICT Equipment Allocation & Deduction Schedule
    it_reviewer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    it_reviewer_name VARCHAR(150),
    asset_serial_number VARCHAR(100),               -- e.g., 'DELL-LAT-5540-0891'
    deducted_monthly_amount_zmw NUMERIC(12, 2),
    deduction_start_date DATE,                       -- Commencement payroll month
    deduction_end_date DATE,                         -- Concluding payroll month
    it_comments TEXT,
    it_signed_at TIMESTAMPTZ,
    it_digital_signature VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Data Integrity Constraints
    CONSTRAINT chk_terms_completion CHECK (
        (status = 'DRAFT') OR 
        (terms_accepted = TRUE AND terms_accepted_at IS NOT NULL AND applicant_signed_at IS NOT NULL)
    ),
    CONSTRAINT chk_deduction_window CHECK (
        deduction_start_date IS NULL OR 
        deduction_end_date IS NULL OR 
        deduction_end_date >= deduction_start_date
    ),
    CONSTRAINT chk_deducted_amount_positive CHECK (
        deducted_monthly_amount_zmw IS NULL OR deducted_monthly_amount_zmw > 0
    )
);

-- 3.6 Approval Audit Logs Table (Immutable Timeline & State Transitions)
CREATE TABLE IF NOT EXISTS approval_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    actor_name VARCHAR(150) NOT NULL,
    actor_role user_role NOT NULL,
    action_type VARCHAR(60) NOT NULL, -- 'SUBMITTED_PART_1', 'ENDORSED_PART_2', 'CLEARED_PART_3', 'FINALIZED_PART_4'
    from_status application_status,
    to_status application_status NOT NULL,
    comments TEXT,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE, -- Internal notes hidden from applicants
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. Indexes for High-Density Query Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_apps_institution ON applications(site_id);
CREATE INDEX IF NOT EXISTS idx_apps_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_apps_ref_num ON applications(reference_number);
CREATE INDEX IF NOT EXISTS idx_apps_tier ON applications(equipment_tier_id);
CREATE INDEX IF NOT EXISTS idx_audit_app_id ON approval_audit_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON approval_audit_logs(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_users_entra_oid ON users(entra_oid);
CREATE INDEX IF NOT EXISTS idx_users_institution ON users(site_id);

-- ============================================================================
-- 5. Reference Number Sequence Generation Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_app_reference_number()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
DECLARE
    year_str TEXT;
    max_num INT;
BEGIN
    year_str := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(SUBSTRING(reference_number FROM '(\d+)$')::INT), 0) + 1
    INTO max_num
    FROM applications
    WHERE reference_number LIKE 'EDC-ICT-' || year_str || '-%';

    NEW.reference_number := 'EDC-ICT-' || year_str || '-' || LPAD(max_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_reference_number ON applications;
CREATE TRIGGER trg_set_reference_number
BEFORE INSERT ON applications
FOR EACH ROW
WHEN (NEW.reference_number IS NULL OR NEW.reference_number = '')
EXECUTE FUNCTION generate_app_reference_number();
