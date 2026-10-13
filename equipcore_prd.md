# Product Requirements Document (PRD)

## Project: Educore Provision — Educore Services ICT Equipment Purchase Scheme Portal
* **Document Version:** 2.1.0
* **Status:** Ready for Implementation
* **Primary Target:** Web Application (Desktop-first administrative workflows)
* **Target Database:** PostgreSQL 15+
* **Authentication Provider:** Educore Single Sign-On (Microsoft Entra ID / Google Workspace)
* **Target Organization:** Educore Services (Trident College, Sentinel Kabitaka, Central Administration, etc.)

---

### 1. Executive Summary & Business Objectives

#### 1.1 Problem Statement
The current paper-based *Application ICT Purchase Scheme* workflow incurs operational delays and compliance gaps across Educore schools:
* Physical documents are manually routed across campuses between teachers, school General Managers / Head Teachers, Central HR, and Central IT, often taking 3 to 6 weeks.
* Paper forms are frequently misplaced on desks, leaving applicants unaware of status and HR without timely payroll deduction records.
* Out-of-band checks (such as existing SACCO loans, salary advances, or probation constraints) occur late in the cycle, leading to wasted administrative effort.
* The organization lacks an immutable, timestamped digital audit trail of policy agreement and payroll deduction consent.

#### 1.2 System Objectives
* **Process Acceleration:** Cut the entire approval lifecycle from weeks to under 48 hours.
* **Strict Context Scoping:** Ensure school leaders (GMs / Head Teachers) only see and act on applications originating from their specific institution, while Central HR and Central IT retain global oversight across all Educore units.
* **Per-Request Legal Enforceability:** Enforce explicit, immutable legal acceptance on every individual request submission before Part 1 can be completed.
* **Single Source of Truth:** Provide an auto-updating Master Sheet with direct export capabilities formatted for Educore payroll deduction batch processing.

---

### 2. User Roles & Context Scoping (RBAC)

The application enforces strict data tenancy across Educore units:

| Role | Operational Boundary | Permissions & Responsibilities |
| :--- | :--- | :--- |
| **Applicant** | Personal Scope (`user_id = auth.uid()`) | Accepts per-request legal terms; submits Part 1 application fields; tracks personal lifecycle timeline. |
| **GM / Head Teacher** | Institution Scoped (`institution_id = auth.institution_id()`) | Reviews Part 1; enters comments; endorses or rejects Part 2 for staff in their institution. |
| **HR Manager** | Global Scope (All Educore units) | Vets employee debt status and contract validity; enters clearance notes; approves/rejects Part 3; accesses Master Sheet. |
| **ICT Manager** | Global Scope (All Educore units) | Assigns equipment; sets monthly deduction amount and date ranges; signs off Part 4; closes request; accesses Master Sheet. |
| **Super Admin** | System-Wide | Manages users, institutions, policy text versions, and system audit logs. |

---

### 3. Application State Machine & Lifecycle

Applications progress strictly linearly. Any rejection halts the flow immediately and logs the rationale to the audit trail.

```text
[ DRAFT ]
   │
   │ (Accept Legal Terms + Submit Part 1)
   ▼
[ PENDING_GM_REVIEW ] ─────────(GM Rejection)─────────► [ REJECTED ]
   │
   │ (GM Endorsed - Part 2)
   ▼
[ PENDING_HR_REVIEW ] ─────────(HR Rejection)─────────► [ REJECTED ]
   │
   │ (HR Approved - Part 3)
   ▼
[ PENDING_IT_SIGNOFF ] ────────(IT Rejection)─────────► [ REJECTED ]
   │
   │ (IT Finalized & Scheduled - Part 4)
   ▼
[ APPROVED / ACTIVE_DEDUCTION ]
   │
   │ (Deduction Schedule Concluded)
   ▼
[ CLOSED ]
```

---

### 4. Stage-by-Stage Functional Specifications

#### 4.1 Step 0: Mandatory Legal Gate (Per-Request Execution)
* **Trigger:** User clicks `"New Equipment Request"`.
* **Behavior:** Renders the legal container at the top of the request form. Part 1 inputs remain disabled until confirmed.
* **Legal Copy Displayed:**
  > *"I [Applicant Name] have read and understood the ICT Equipment purchase scheme and it’s related policies as specified in the current policy document.  
  > By signing this application I agree to:  
  > 1. The terms and conditions of the ICT Equipment and it’s related policies.  
  > 2. Deductions being made through payroll and reflected on my payslip."*
* **Validation Rules:**
  * Mandatory checkbox: `[ ] I agree to the policy terms and authorized payroll deductions.`
  * The form cannot be saved or submitted without this confirmed.
  * System captures: `policy_version_id`, `legal_text_snapshot`, `terms_accepted_at`, `applicant_ip_address`, and `applicant_user_agent`.

---

#### 4.2 Part 1: Applicant Submission
* **Actor:** Staff member / Applicant.
* **Fields & Validations:**
  * **Applicant Name:** String, Read-only. Auto-populated from active authenticated session.
  * **School / Cost Centre:** String, Read-only. Auto-populated from user profile.
  * **Laptop Requested:** Radio group: `Level 1` or `Level 2`.
  * **Repayment Period:** Radio group: `1-2 Months`, `12 Months`, or `24 Months`.
  * **Signature:** Digital identity badge stamped upon submission.
  * **Date:** System date recorded at submission (`CURRENT_DATE`).
* **System Action:** Validates data, locks Part 1 against further client edits, logs timeline event, transitions status to `PENDING_GM_REVIEW`, and dispatches notification to the respective Head Teacher.

---

#### 4.3 Part 2: Head Teacher / GM Endorsement
* **Actor:** Head Teacher / General Manager of the applicant's institution.
* **Access Boundary:** Restricted strictly to applications where `application.institution_id == reviewer.institution_id`.
* **Fields & Actions:**
  * **Review Area:** Read-only inspection of Terms declaration and Part 1 inputs.
  * **Comments:** Optional textarea for operational context.
  * **Endorse (Approve):** Stamped with reviewer identity session and timestamp; advances state to `PENDING_HR_REVIEW`.
  * **Reject:** Requires a mandatory comment explaining the refusal; sets status to `REJECTED`.

---

#### 4.4 Part 3: HR Manager Review & Clearance
* **Actor:** Central HR Manager.
* **Operational Scope:** Centralized across all Educore schools.
* **External Business Logic:** HR reviews external records (checking for active debt ceilings, outstanding salary advances, probation status, or contract end dates shorter than the repayment plan).
* **Fields & Actions:**
  * **Review Area:** Read-only view of Terms, Part 1, and Part 2 (including GM comments).
  * **Comments:** Textarea for HR clearance notes or loan verification checks.
  * **Approve:** Stamped with HR reviewer session and timestamp; advances state to `PENDING_IT_SIGNOFF`.
  * **Reject:** Requires a mandatory comment; transitions status to `REJECTED`.

---

#### 4.5 Part 4: ICT Manager Sign-off & Financial Scheduling
* **Actor:** Central ICT Manager.
* **Operational Scope:** Centralized across all Educore schools.
* **Fields & Actions:**
  * **Asset Specification:** Input field for Asset Tag / Hardware Serial Number.
  * **Deducted Monthly Amount:** Numeric input (Currency: ZMW).
  * **Deduction Period (from / to):** Date pickers defining payroll recovery window. Must validate that `to >= from`.
  * **Comments:** Textarea for hardware configuration notes or warranty details.
  * **Sign-off Action:** Stamped with ICT Manager session and timestamp; transitions status to `APPROVED`.
  * **Artifact:** Generates an immutable, printable PDF archiving all four sections and digital audit hashes.

---

#### 4.6 Master Sheet Dashboard
* **Access:** Restricted to `HR_MANAGER`, `IT_MANAGER`, and `SUPER_ADMIN`.
* **Interface:** Data grid displaying organization-wide purchase applications.
* **Columns:** Reference Number, Submission Date, Employee Name, Institution, Hardware Tier, Repayment Plan, Monthly Deduction Amount, Deduction Start, Deduction End, Current Status, Current Assignee.
* **Filtering:** By Institution, Lifecycle Status, Hardware Tier, and Date Range.
* **Export:** One-click CSV and XLSX export formatted directly for payroll software deduction batches.

---

#### 4.7 GitHub-Style Audit Timeline
* Chronological activity panel attached to each application:
  * Records actor, action type, previous status, updated status, timestamps, and comments.
  * Immutable record (append-only table).

---

### 5. PostgreSQL Database Architecture

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM (
    'APPLICANT', 
    'HEAD_TEACHER', 
    'HR_MANAGER', 
    'IT_MANAGER', 
    'SUPER_ADMIN'
);

CREATE TYPE application_status AS ENUM (
    'DRAFT', 
    'PENDING_GM_REVIEW', 
    'PENDING_HR_REVIEW', 
    'PENDING_IT_SIGNOFF', 
    'APPROVED', 
    'REJECTED', 
    'CLOSED'
);

CREATE TYPE laptop_tier AS ENUM ('LEVEL_1', 'LEVEL_2');

CREATE TYPE repayment_plan AS ENUM (
    'ONE_TO_TWO_MONTHS', 
    'TWELVE_MONTHS', 
    'TWENTY_FOUR_MONTHS'
);

-- 1. Institutions
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE, -- e.g., 'TRIDENT_COLLEGE'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'APPLICANT',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Policy Versions
CREATE TABLE policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_tag VARCHAR(50) NOT NULL UNIQUE,
    legal_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Main Purchase Applications
CREATE TABLE purchase_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    status application_status NOT NULL DEFAULT 'DRAFT',

    -- Per-Request Legal Terms Acceptance
    policy_version_id UUID NOT NULL REFERENCES policy_versions(id) ON DELETE RESTRICT,
    legal_text_snapshot TEXT NOT NULL,
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted_at TIMESTAMPTZ,
    applicant_ip_address INET,
    applicant_user_agent TEXT,

    -- Part 1: Applicant Inputs
    requested_laptop_tier laptop_tier NOT NULL,
    repayment_period repayment_plan NOT NULL,
    applicant_signed_at TIMESTAMPTZ,

    -- Part 2: GM / Head Teacher Endorsement
    gm_reviewer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    gm_comments TEXT,
    gm_signed_at TIMESTAMPTZ,

    -- Part 3: HR Review
    hr_reviewer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    hr_comments TEXT,
    hr_signed_at TIMESTAMPTZ,

    -- Part 4: IT Final Sign-off
    it_reviewer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    asset_serial_number VARCHAR(100),
    deducted_monthly_amount NUMERIC(12, 2),
    deduction_start_date DATE,
    deduction_end_date DATE,
    it_comments TEXT,
    it_signed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

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
        deducted_monthly_amount IS NULL OR deducted_monthly_amount > 0
    )
);

-- 5. Audit / Timeline Events
CREATE TABLE application_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES purchase_applications(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action_type VARCHAR(60) NOT NULL,
    from_status application_status,
    to_status application_status,
    comments TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_apps_institution ON purchase_applications(institution_id);
CREATE INDEX idx_apps_applicant ON purchase_applications(applicant_id);
CREATE INDEX idx_apps_status ON purchase_applications(status);
CREATE INDEX idx_apps_ref_num ON purchase_applications(reference_number);
CREATE INDEX idx_timeline_app_id ON application_timeline_events(application_id);
CREATE INDEX idx_timeline_created ON application_timeline_events(created_at ASC);

-- Reference Number Sequence Generator Trigger
CREATE OR REPLACE FUNCTION generate_app_reference_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    seq_val INT;
BEGIN
    year_str := TO_CHAR(NOW(), 'YYYY');
    SELECT COUNT(*) + 1 INTO seq_val 
    FROM purchase_applications 
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    
    NEW.reference_number := 'EDC-ICT-' || year_str || '-' || LPAD(seq_val::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_reference_number
BEFORE INSERT ON purchase_applications
FOR EACH ROW
WHEN (NEW.reference_number IS NULL OR NEW.reference_number = '')
EXECUTE FUNCTION generate_app_reference_number();
```

---

### 6. Row-Level Security (RLS) Policies

```sql
ALTER TABLE purchase_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_timeline_events ENABLE ROW LEVEL SECURITY;

-- Current User Record Helper
CREATE OR REPLACE FUNCTION get_current_user_record()
RETURNS users AS $$
    SELECT * FROM users WHERE id = NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- SELECT Policies
CREATE POLICY pol_applicant_read_own ON purchase_applications
    FOR SELECT USING (applicant_id = (get_current_user_record()).id);

CREATE POLICY pol_head_teacher_read_institution ON purchase_applications
    FOR SELECT USING (
        (get_current_user_record()).role = 'HEAD_TEACHER' AND
        institution_id = (get_current_user_record()).institution_id
    );

CREATE POLICY pol_central_staff_read_all ON purchase_applications
    FOR SELECT USING (
        (get_current_user_record()).role IN ('HR_MANAGER', 'IT_MANAGER', 'SUPER_ADMIN')
    );

-- INSERT Policy (Applicants only)
CREATE POLICY pol_applicant_insert ON purchase_applications
    FOR INSERT WITH CHECK (
        applicant_id = (get_current_user_record()).id AND
        institution_id = (get_current_user_record()).institution_id
    );

-- Timeline Events Access
CREATE POLICY pol_timeline_read ON application_timeline_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM purchase_applications pa
            WHERE pa.id = application_id
        )
    );
```

---

### 7. API REST Contracts

#### 7.1 POST `/api/v1/applications` (Create & Submit Part 1)
* **Auth:** Required (`APPLICANT`)
* **Request:**
```json
{
  "policy_version_id": "8a06e927-1422-4467-bc21-6d9b4be12f91",
  "terms_accepted": true,
  "requested_laptop_tier": "LEVEL_1",
  "repayment_period": "TWELVE_MONTHS"
}
```
* **Response (201 Created):**
```json
{
  "id": "e5c70281-2c0f-4886-ba0a-7fb9ea8ceb62",
  "reference_number": "EDC-ICT-2026-0014",
  "status": "PENDING_GM_REVIEW",
  "terms_accepted_at": "2026-10-13T07:30:00Z",
  "applicant_signed_at": "2026-10-13T07:30:00Z"
}
```

---

#### 7.2 POST `/api/v1/applications/:id/endorse-gm` (Part 2 GM Action)
* **Auth:** Required (`HEAD_TEACHER` with matching `institution_id`)
* **Request:**
```json
{
  "decision": "APPROVE", 
  "comments": "Endorsed. Necessary for senior chemistry lab work."
}
```
* **Response (200 OK):**
```json
{
  "id": "e5c70281-2c0f-4886-ba0a-7fb9ea8ceb62",
  "status": "PENDING_HR_REVIEW",
  "gm_signed_at": "2026-10-13T08:15:00Z"
}
```

---

#### 7.3 POST `/api/v1/applications/:id/review-hr` (Part 3 HR Action)
* **Auth:** Required (`HR_MANAGER`)
* **Request:**
```json
{
  "decision": "APPROVE",
  "comments": "Cleared. 0 active salary advances. Debt ratio within 33% threshold."
}
```
* **Response (200 OK):**
```json
{
  "id": "e5c70281-2c0f-4886-ba0a-7fb9ea8ceb62",
  "status": "PENDING_IT_SIGNOFF",
  "hr_signed_at": "2026-10-13T09:00:00Z"
}
```

---

#### 7.4 POST `/api/v1/applications/:id/signoff-it` (Part 4 IT Action)
* **Auth:** Required (`IT_MANAGER`)
* **Request:**
```json
{
  "asset_serial_number": "EDC-LAP-0482",
  "deducted_monthly_amount": 1250.00,
  "deduction_start_date": "2026-11-01",
  "deduction_end_date": "2027-10-31",
  "comments": "Issued Dell Latitude 5540, charger, and Educore asset sleeve."
}
```
* **Response (200 OK):**
```json
{
  "id": "e5c70281-2c0f-4886-ba0a-7fb9ea8ceb62",
  "status": "APPROVED",
  "it_signed_at": "2026-10-13T09:30:00Z",
  "pdf_download_url": "https://storage.educore.org/docs/EDC-ICT-2026-0014-sealed.pdf"
}
```

---

### 8. UI/UX Architecture & Layout Specifications

* **Design Aesthetic:** Minimalist corporate dashboard (Linear / GitHub issue interface).
* **Color System:**
  * Background Canvas: `#09090B` (Dark) / `#F8FAFC` (Light).
  * Card Surfaces: `#18181B` (Dark) / `#FFFFFF` (Light).
  * Borders: `#27272A` (Dark) / `#E2E8F0` (Light).
* **Status Badges:**
  * `PENDING_GM_REVIEW`: Amber (#D97706, bg: #FEF3C7)
  * `PENDING_HR_REVIEW`: Blue (#2563EB, bg: #DBEAFE)
  * `PENDING_IT_SIGNOFF`: Violet (#7C3AED, bg: #EDE9FE)
  * `APPROVED`: Emerald (#059669, bg: #D1FAE5)
  * `REJECTED`: Rose (#E11D48, bg: #FFE4E6)
* **Desktop Layout:**
  * Left Column (65% width): Step cards for Legal Acceptance, Part 1, Part 2, Part 3, and Part 4.
  * Right Column (35% width): Chronological GitHub-style activity sidebar with avatars, status changes, and comments.

---

### 9. Non-Functional, Security & Compliance Requirements

* **Audit Immutability:** The `application_timeline_events` table is append-only. Updates and deletes are prohibited.
* **Snapshot Fidelity:** Updates to master policy text in `policy_versions` will never overwrite the `legal_text_snapshot` on previously submitted applications.
* **Export Performance:** Master Sheet queries must stream or paginate CSV output to keep server memory consumption constant regardless of record count.
* **Disaster Recovery:** Nightly automated PostgreSQL backups with 30-day point-in-time recovery (PITR) retention.

---

### 10. Operational Traps & Hard Truths

1. **Digital Signatures:** Do not build canvas drawing pads where people sign with their mouse. Mouse squiggles have zero legal or forensic weight. Use authenticated session stamps (Authenticated User ID + Timestamp + Policy Hash) directly on the backend.
2. **Postgres RLS is Mandatory:** Never rely solely on frontend or API router conditions to hide applications from Head Teachers of other schools. Enforce RLS directly in PostgreSQL to prevent data leakage.
3. **The Payroll File Handshake:** The IT Manager inputs `deducted_monthly_amount` and dates, but HR will still have to manually type numbers if your CSV export doesn't match their payroll software (e.g., Dove / Sage / VIP) import format exactly. Confirm their payroll CSV column headers before finalizing the export utility.

---

### 11. Implementation Decisions & Clarification Checklist

Before running database migrations, verify the following with Educore management:
1. **SSO Provider:** Confirm whether all staff use Microsoft 365 / Entra ID or Google Workspace so authentication auto-populates employee IDs and emails.
2. **Rejection Recovery:** Determine if a rejected application is permanently dead, or if applicants can make edits and resubmit under the same reference number.
3. **Hardware Catalog:** Clarify if equipment specifications and prices for "Level 1" and "Level 2" are fixed, or if the IT Manager needs an editable equipment inventory table.