# Product Requirements Document (PRD) & Role Flow Architecture

## Project: Educore Provision

- **Application Name:**  Educore Provision (ICT Equipment Purchase Scheme Portal)
- **Document Version:**  3.0.0
- **Target Platform:**  Responsive Web Application (Optimized for desktop-first administrative tasks)
- **Authentication Provider:**  Microsoft Entra ID (OIDC / OAuth 2.0 with PKCE & App Roles)
- **Target Database:**  PostgreSQL 18
- **Target Organization:**  Educore Services (Trident College, Sentinel Kabitaka, Central Administration, etc.)

---

### 1. Executive Summary & Business Objectives

#### 1.1 Problem Statement

The existing *Application ICT Purchase Scheme* workflow relies on physical paper circulation across geographically separated Educore campuses:

- Manual routing between teachers, school General Managers / Head Teachers, Central HR, and Central IT takes 3 to 6 weeks.
- Paper forms are frequently lost or delayed on desks, leaving applicants uninformed and HR without deduction records.
- Out-of-band checks (such as SACCO loan commitments, salary advance thresholds, or probation constraints) occur late in the cycle, creating administrative bottlenecks.
- The organization lacks an immutable, timestamped audit trail of policy agreements and payroll deduction mandates.

#### 1.2 System Objectives

- **Process Acceleration:**  Cut the entire approval lifecycle from weeks to under 48 hours.
- **Strict Context Scoping:**  Ensure school leaders (GMs / Head Teachers) only see and act on applications originating from their specific institution, while Central HR and Central IT retain global oversight across all Educore units.
- **Per-Request Legal Enforceability:**  Enforce explicit, immutable legal acceptance on every individual request submission before Part 1 can be completed.
- **Single Source of Truth:**  Provide an auto-updating Master Sheet with direct export capabilities formatted for Educore payroll deduction batch processing.

---

### 2. Identity Architecture: Microsoft Entra ID Integration

Educore Provision authenticates all users through Educore Services' Microsoft Entra ID tenant. No local passwords or credentials are stored within the application.

#### 2.1 Token Claims Mapping

Upon authentication, the JWT issued by Entra ID contains critical identity and tenancy claims ingested by the application middleware:

```json
{
  "sub": "4a73b281-2c0f-4886-ba0a-7fb9ea8ceb62",
  "oid": "4a73b281-2c0f-4886-ba0a-7fb9ea8ceb62",
  "name": "Jane Mwanza",
  "preferred_username": "jmwanza@trident-college.com",
  "email": "jmwanza@trident-college.com",
  "roles": ["Provision.HeadTeacher"],
  "extension_EmployeeNumber": "EDC-1042",
  "extension_InstitutionCode": "TRIDENT_COLLEGE"
}
```

#### 2.2 App Roles Configuration in Entra ID

- `Provision.Applicant`: Default role assigned to all Educore directory accounts.
- `Provision.HeadTeacher`: Assigned to school General Managers and Head Teachers.
- `Provision.HRManager`: Assigned to Central Human Resources personnel.
- `Provision.ITManager`: Assigned to Central ICT administrators and procurement staff.
- `Provision.SuperAdmin`: Assigned to System Engineers for tenant and policy setup.

---

### 3. Detailed User Flows by Role

---

#### 3.1 Role: Applicant (Teacher / Operational Staff)

##### Context & Identity

- **Target Audience:**  Any active Educore employee seeking a Level 1 or Level 2 laptop through payroll deductions.
- **Security Scope:**  Can only view, create, and track their **own** applications (`applicant_id = auth.uid()`).

##### What They See (UI Views)

1. **Applicant Home Dashboard (**  **`/my-requests`** **):**

   - High-level summary cards: "Active Request", "Past Requests", "Current Policy Version".
   - Data table of own submissions showing: Reference ID (`EDC-ICT-2026-XXXX`), Submission Date, Requested Tier, Current Status Badge, and Last Event.
   - Prominent action button: `+ New Equipment Request` (disabled if an active request is already in-flight).
2. **Request Submission Stepper (**  **`/requests/new`** **):**

   - **Screen 0 (Mandatory Legal Gate):**  Distinct high-contrast card rendering the verbatim policy terms with their authenticated full name pre-filled.
   - **Screen 1 (Part 1 Form):**  Hardware selection radio cards (Level 1 vs. Level 2 with specifications), repayment schedule options (1-2 Months, 12 Months, 24 Months), and read-only identity metadata (Name, Employee ID, Institution).
   - **Screen 2 (Confirmation & Identity Sign-off):**  Summary card with a digital signing trigger.
3. **Application Detail & Tracking View (**  **`/requests/:id`** **):**

   - Linear 4-stage visual stepper showing progress: Applicant $\rightarrow$ Head Teacher $\rightarrow$ HR Manager $\rightarrow$ ICT Manager.
   - Read-only copy of their submitted Part 1.
   - Activity timeline showing non-sensitive milestone timestamps (e.g., "Endorsed by Head Teacher", "Under Review by HR").
   - Download button for the sealed PDF once status reaches `APPROVED`.

##### What They Have Access To

- Submit a new request after agreeing to per-request legal terms.
- Cancel / withdraw their application while it is still in `PENDING_GM_REVIEW`.
- View their historical requests and download finalized approval documents.

##### What They Do NOT Have Access To (Strict Restrictions)

- **CANNOT** view any request submitted by another colleague or staff member.
- **CANNOT** edit Part 1 once submitted (must withdraw and re-apply if changes are required).
- **CANNOT** view internal review comments (e.g., HR debt ratio checks or credit evaluations).
- **CANNOT** view or access the Master Sheet, administrative queues, or export tools.
- **CANNOT** bypass the Legal Gate under any circumstance.

---

#### 3.2 Role: General Manager / Head Teacher (School Leadership)

##### Context & Identity

- **Target Audience:**  Heads of School and General Managers (e.g., Head of Trident College, GM of Sentinel Kabitaka).
- **Security Scope:**  Strictly scoped to the institution matching their Entra ID directory claim (`institution_id = auth.institution_id()`).

##### What They See (UI Views)

1. **School Review Dashboard (**  **`/school-triage`** **):**

   - Institutional banner indicating their assigned campus (e.g., "Trident College — Leadership Portal").
   - Action Queue: Pending applications from staff at their school requiring endorsement.
   - Campus Archive Tab: Searchable log of past applications endorsed or rejected within their school.
2. **Application Endorsement View (**  **`/school-triage/:id`** **):**

   - **Section 1 (Applicant Data & Legal Verification):**  Read-only view of the applicant's signed declaration, hardware tier, and repayment period.
   - **Section 2 (Part 2 Endorsement Container):**

     - Textarea: *Endorsement Comments / Operational Justification* (optional for approvals, mandatory for rejections).
     - Action Buttons:

       - `Endorse & Submit to HR` (Primary, Emerald).
       - `Request Revision` (Amber — returns request to applicant with notes).
       - `Reject Request` (Crimson — halts application).
   - **Audit Sidebar:**  Timeline showing when the teacher submitted the request and client session details.

##### What They Have Access To

- Endorse Part 2 to advance the ticket to Central HR.
- Reject applications with mandatory feedback.
- Request revisions if the staff member selected the wrong repayment plan.
- View all equipment applications originating strictly within their institution.

##### What They Do NOT Have Access To (Strict Restrictions)

- **CANNOT** view, search, or access applications from other Educore schools (e.g., Trident College leadership cannot see Sentinel Kabitaka records).
- **CANNOT** access Part 3 (HR clearance) or Part 4 (IT financial schedule & asset assignment).
- **CANNOT** access the Central Master Sheet or organization-wide payroll exports.
- **CANNOT** edit the applicant's Part 1 tier or repayment selections directly.

---

#### 3.3 Role: Central HR Manager (People & Payroll Compliance)

##### Context & Identity

- **Target Audience:**  Central HR operations team based at Educore Central Administration.
- **Security Scope:**  Organization-wide global visibility across all Educore institutions.

##### What They See (UI Views)

1. **Central HR Triage Queue (**  **`/hr/queue`** **):**

   - Global table of all requests across all campuses sitting at `PENDING_HR_REVIEW`.
   - Columns: Submission Date, School Badge, Staff Name, Staff ID, Tier Requested, Repayment Plan, GM Endorser Name, Age in Queue.
   - Institution filter tabs (All, Trident College, Sentinel Kabitaka, Central Admin).
2. **Application Clearance Screen (**  **`/hr/queue/:id`** **):**

   - **Applicant Standing Card:**  Staff ID, current employment status, contract expiration date.
   - **Part 1 & Part 2 Cards:**  Read-only view of applicant choices and GM endorsement notes.
   - **Part 3 Clearance Container:**

     - Vetting Checklist: Confirmed 0 active salary advance conflicts; confirmed probation cleared; debt ratio within Educore 33% threshold.
     - Textarea: *HR Clearance Notes* (mandatory if rejected).
     - Action Buttons:

       - `Approve Clearance & Route to IT` (Primary).
       - `Reject Application` (Crimson).
3. **Master Sheet (HR / Payroll View) (**  **`/master-sheet`** **):**

   - Organization-wide ledger of all approved and in-progress applications.
   - "Export Payroll CSV" button to download deduction batches for the upcoming pay cycle.

##### What They Have Access To

- View all requests across every Educore school.
- Clear or reject Part 3 based on payroll debt verification.
- Access the Master Sheet and generate payroll export files.
- View internal audit logs, including reviewer timestamps and IP snapshots.

##### What They Do NOT Have Access To (Strict Restrictions)

- **CANNOT** allocate hardware serial numbers or enter laptop asset tags in Part 4.
- **CANNOT** enter or alter the `deducted_monthly_amount` or date ranges in Part 4 (strictly reserved for ICT).
- **CANNOT** sign off Part 4 or close tickets.
- **CANNOT** alter the applicant's initial tier selection (must reject or request revision).

---

#### 3.4 Role: Central ICT Manager (Hardware & Scheme Ownership)

##### Context & Identity

- **Target Audience:**  Central IT Infrastructure Manager and IT Procurement Officers.
- **Security Scope:**  Organization-wide global visibility across all Educore institutions.

##### What They See (UI Views)

1. **IT Provisioning Queue (**  **`/it/provisioning`** **):**

   - Queue of applications in status `PENDING_IT_SIGNOFF`.
   - Badges highlighting priority, hardware tier (`Level 1` vs. `Level 2`), and destination campus.
2. **Device Assignment & Financial Sign-off View (**  **`/it/provisioning/:id`** **):**

   - **Audit Card:**  Complete read-only dossier of Parts 1, 2, and 3 (Terms accepted, GM endorsed, HR cleared).
   - **Part 4 Sign-off Container:**

     - Input: *Asset Serial Number / Service Tag* (e.g., `DELL-LAT-5540-0891`).
     - Input: *Deducted Monthly Amount (ZMW)*  (numeric input with auto-formatting).
     - Date Pickers: *Deduction Start Month (* *`from`* *)*  and *Deduction End Month (* *`to`* *)* .
     - Textarea: *ICT Handover & Warranty Notes*.
     - Action Buttons:

       - `Finalize, Sign & Close Request` (Generates sealed PDF, updates state to `APPROVED`).
       - `Reject (Hardware Unavailable)` (Crimson).
3. **Master Sheet (IT / Asset Lifecycle View) (**  **`/master-sheet`** **):**

   - Full inventory registry displaying allocated assets, serial numbers, recipient staff, assigned schools, and deduction timelines.
   - "Export Asset Register CSV" button.

##### What They Have Access To

- View all applications across all institutions.
- Set hardware serial numbers, monthly deduction amounts, and deduction schedules.
- Execute the final Part 4 sign-off, sealing the digital document.
- Access and export the full Master Sheet.

##### What They Do NOT Have Access To (Strict Restrictions)

- **CANNOT** approve applications that have not completed GM endorsement (Part 2) and HR clearance (Part 3).
- **CANNOT** alter HR compliance records or debt verification statuses.
- **CANNOT** modify the applicant's Part 1 choices.

---

### 4. Application State Machine

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

### 5. PostgreSQL 18 Architecture

The database schema utilizes modern PostgreSQL 18 features, including native UUIDv7 generation, generated identity columns, and robust declarative Row-Level Security.

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum Definitions
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
    'REVISION_REQUIRED',
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

-- 1. Institutions Table
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'TRIDENT_COLLEGE', 'SENTINEL_KABITAKA'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users Table (Synchronized with Entra ID directory claims)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entra_oid UUID UNIQUE NOT NULL, -- Entra ID Object ID claim
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'APPLICANT',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Policy Legal Versions Table
CREATE TABLE policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_tag VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'v1.0-2026'
    legal_text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Main Purchase Applications Table
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

    -- Part 1: Applicant Choices
    requested_laptop_tier laptop_tier NOT NULL,
    repayment_period repayment_plan NOT NULL,
    applicant_signed_at TIMESTAMPTZ,

    -- Part 2: GM / Head Teacher Endorsement
    gm_reviewer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    gm_comments TEXT,
    gm_signed_at TIMESTAMPTZ,

    -- Part 3: HR Review & Debt Clearance
    hr_reviewer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    hr_comments TEXT,
    hr_signed_at TIMESTAMPTZ,

    -- Part 4: ICT Equipment & Payroll Schedule
    it_reviewer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    asset_serial_number VARCHAR(100),
    deducted_monthly_amount NUMERIC(12, 2),
    deduction_start_date DATE,
    deduction_end_date DATE,
    it_comments TEXT,
    it_signed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
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

-- 5. Immutable Audit Trail / Timeline Events
CREATE TABLE application_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES purchase_applications(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action_type VARCHAR(60) NOT NULL,
    from_status application_status,
    to_status application_status,
    comments TEXT,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE, -- Internal notes hidden from applicants
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_apps_institution ON purchase_applications(institution_id);
CREATE INDEX idx_apps_applicant ON purchase_applications(applicant_id);
CREATE INDEX idx_apps_status ON purchase_applications(status);
CREATE INDEX idx_apps_ref_num ON purchase_applications(reference_number);
CREATE INDEX idx_timeline_app_id ON application_timeline_events(application_id);
CREATE INDEX idx_timeline_created ON application_timeline_events(created_at ASC);

-- Reference Number Sequence Trigger
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

PostgreSQL Row-Level Security ensures data leakage between institutions is prevented directly at the storage engine level.

```sql
ALTER TABLE purchase_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_timeline_events ENABLE ROW LEVEL SECURITY;

-- Session helper functions extracting claims from authenticated request context
CREATE OR REPLACE FUNCTION current_auth_user_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_auth_institution_id() RETURNS UUID AS $$
    SELECT institution_id FROM users WHERE entra_oid = current_auth_user_id();
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_auth_role() RETURNS user_role AS $$
    SELECT role FROM users WHERE entra_oid = current_auth_user_id();
$$ LANGUAGE sql STABLE;

-- SELECT Policies for purchase_applications
CREATE POLICY rls_applicant_select ON purchase_applications
    FOR SELECT USING (applicant_id = (SELECT id FROM users WHERE entra_oid = current_auth_user_id()));

CREATE POLICY rls_head_teacher_select ON purchase_applications
    FOR SELECT USING (
        current_auth_role() = 'HEAD_TEACHER' AND
        institution_id = current_auth_institution_id()
    );

CREATE POLICY rls_central_staff_select ON purchase_applications
    FOR SELECT USING (
        current_auth_role() IN ('HR_MANAGER', 'IT_MANAGER', 'SUPER_ADMIN')
    );

-- INSERT Policy (Only applicants for their assigned institution)
CREATE POLICY rls_applicant_insert ON purchase_applications
    FOR INSERT WITH CHECK (
        applicant_id = (SELECT id FROM users WHERE entra_oid = current_auth_user_id()) AND
        institution_id = current_auth_institution_id()
    );

-- Timeline Event SELECT Policy (Hides is_internal events from applicants)
CREATE POLICY rls_timeline_select ON application_timeline_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM purchase_applications pa
            WHERE pa.id = application_id
        ) AND (
            is_internal = FALSE OR 
            current_auth_role() IN ('HEAD_TEACHER', 'HR_MANAGER', 'IT_MANAGER', 'SUPER_ADMIN')
        )
    );
```

---

### 7. Implementation Checklist & Guardrails

1. **Digital Signatures:**  Do not use canvas drawing mouse squiggles. Capture authenticated session signatures (Entra ID OID + Server Timestamp + Policy Text Hash) directly on the backend.
2. **Postgres RLS is Mandatory:**  Never rely exclusively on API-level filters to hide data between schools. Enforce RLS directly in PostgreSQL 18.
3. **Payroll Export Verification:**  Ensure that Central HR signs off on the exact CSV column headers and decimal representations required by Educore's payroll software before finalizing the export module.