# Product Requirements Document (PRD) & Enterprise Workflow Architecture

## Project: Educore Provision

- **Application Name:** Educore Provision (Enterprise Multi-Department Workflow & Provisioning Engine)
- **Document Version:** 4.0.0
- **Target Platform:** Responsive Web Application (Desktop-first administrative & operational portal)
- **Authentication Provider:** Microsoft Entra ID (OIDC / OAuth 2.0 with PKCE, App Roles & PostgreSQL RLS Session Binding)
- **Target Database:** PostgreSQL 18
- **Target Organization:** Educore Services Zambia (Trident College, Sentinel Kabitaka, Frontier, Educore Academy, Central Administration)

---

### 1. Executive Summary & Business Objectives

#### 1.1 Problem Statement

Across Educore Services' geographically distributed schools and central offices, **14 critical operational workflows** spanning **IT**, **Human Resources**, **Finance & Stores**, and **Logistics** previously relied on physical Word/PDF forms (`Application Forms - Provision`):

- **Cross-Campus Bottlenecks:** Routing physical paper between school staff, Line Managers, School Heads/GMs, and Central Administration (HR, IT, Finance, Logistics) takes 2 to 6 weeks per request.
- **Zero Visibility & Lost Paperwork:** Staff cannot see whose desk their form is sitting on; Finance and HR lack real-time visibility into pending advances, bank changes, stock requisitions, or equipment commitments.
- **Inconsistent Compliance:** Out-of-band vetting (probation checks, affordability/debt-ratio verification, stores inspection, policy sign-offs) occurs inconsistently and lacks an immutable digital audit trail.
- **Schema Rigidity in Legacy Digitization (v3.0):** The initial prototype hardcoded single-purpose ICT laptop purchase columns (`equipment_tier_id`, `gm_reviewer_id`, `hr_reviewer_id`, `it_reviewer_id`) directly onto the root `applications` table, preventing horizontal expansion across HR, Finance, and Logistics workflows.

#### 1.2 System Objectives (v4.0 Architecture)

- **Unified 14-Form Digitization:** Consolidate all 14 organizational forms across IT, HR, Finance, and Logistics into a single polymorphic workflow engine without requiring DDL table migrations when new forms are introduced.
- **Dynamic Multi-Stage Routing:** Route each form automatically through its specific chain of command (`workflow_pipeline`) based on `form_definitions` metadata.
- **Database-Enforced Multi-Tenancy (RLS):** Enforce strict Row-Level Security inside PostgreSQL 18 via transaction-scoped session claims (`request.jwt.claim.sub`). School-scoped leaders (`HEAD_TEACHER`, `LINE_MANAGER`) can only view and sign off on records from their assigned institution, while Central roles (`HR_MANAGER`, `IT_MANAGER`, `FINANCE_MANAGER`, `LOGISTICS_MANAGER`) operate organization-wide.
- **Conditional Per-Request Legal Enforceability:** Dynamically enforce verbatim policy snapshots (`legal_text_snapshot`) and explicit digital acceptance on forms carrying financial/payroll or benefit obligations (`requires_policy = true`).
- **Concurrency-Safe Auditability:** Guarantee race-condition-free reference numbering (`EDC-<PREFIX>-YYYY-XXXX`), row-level locking (`FOR UPDATE`) during approval state transitions, and an immutable audit log (`approval_audit_logs`).

---

### 2. Catalog of Digitized Organizational Workflows (All 14 Forms)

Every form is defined as a declarative catalog entry in `public.form_definitions` with its own reference prefix, department, policy gate requirement, and ordered approval pipeline:

| Department | Form Code | Reference Prefix | Document Title | Policy Gate | Ordered Approval Pipeline (`step_order`) |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **IT** | `ICT_PURCHASE` | `EDC-ICT` | Application ICT Purchase Scheme | Yes | 1. `HEAD_TEACHER` (School)<br>2. `HR_MANAGER` (Central)<br>3. `IT_MANAGER` (Central) |
| **Logistics** | `TRAVEL_REQUEST` | `EDC-TRV` | Travel Request Form | No | 1. `HEAD_TEACHER` (School)<br>2. `LOGISTICS_MANAGER` (Central) |
| **HR** | `SALARY_ADVANCE` | `EDC-ADV` | Application for Advance | Yes | 1. `HEAD_TEACHER` (School)<br>2. `HR_MANAGER` (Central)<br>3. `FINANCE_MANAGER` (Central) |
| **HR** | `PROF_DEV` | `EDC-PDV` | Application for Professional Development | Yes | 1. `HEAD_TEACHER` (School)<br>2. `HR_MANAGER` (Central) |
| **HR** | `BANK_CHANGE` | `EDC-BNK` | Change of Bank Details | No | 1. `HR_MANAGER` (Central)<br>2. `FINANCE_MANAGER` (Central) |
| **HR** | `CONTRACT_RENEWAL` | `EDC-CNT` | Contract Renewal Form for HR | No | 1. `HEAD_TEACHER` (School)<br>2. `HR_MANAGER` (Central) |
| **HR** | `CHILD_ADMISSION` | `EDC-CHD` | Educore Staff Child Admission Authorisation | Yes | 1. `HEAD_TEACHER` (School)<br>2. `HR_MANAGER` (Central) |
| **HR** | `EXCULPATORY` | `EDC-EXC` | Exculpatory Form | No | 1. `LINE_MANAGER` (School)<br>2. `HR_MANAGER` (Central) |
| **HR** | `GRATUITY_ADVANCE` | `EDC-GRT` | Gratuity Advance Application Form - Annual | Yes | 1. `HR_MANAGER` (Central)<br>2. `FINANCE_MANAGER` (Central) |
| **HR** | `JOB_DESCRIPTION` | `EDC-JDS` | Job Description Sign-off | No | 1. `LINE_MANAGER` (School)<br>2. `HR_MANAGER` (Central) |
| **HR** | `MANPOWER_REQ` | `EDC-MPR` | Manpower Requisition Form | No | 1. `HEAD_TEACHER` (School)<br>2. `HR_MANAGER` (Central) |
| **Finance** | `EVENT_COMPLETION` | `EDC-EVC` | Event Completion Form | No | 1. `HEAD_TEACHER` (School)<br>2. `FINANCE_MANAGER` (Central) |
| **Finance** | `STOCK_RETURN` | `EDC-STR` | Stock Return Form | No | 1. `LOGISTICS_MANAGER` (Central)<br>2. `FINANCE_MANAGER` (Central) |
| **Finance** | `STORES_REQ` | `EDC-SRQ` | Stores Requisition Form | No | 1. `HEAD_TEACHER` (School)<br>2. `FINANCE_MANAGER` (Central) |

---

### 3. Identity & RBAC Architecture: Microsoft Entra ID

Educore Provision authenticates users via Microsoft Entra ID. The Node/Express API layer extracts the authenticated user's Entra Object ID (`entra_oid`) and binds it to the PostgreSQL transaction using `SELECT set_config('request.jwt.claim.sub', $1, true)` inside `withRlsContext()`.

#### 3.1 Token Claims Mapping

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

#### 3.2 Role Matrix (`public.user_role`)

| Database Role Enum | Entra App Role | Tenancy Scope | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| `APPLICANT` | `Provision.Applicant` | Own Records (`applicant_id`) | Submit forms, track live pipeline progress, withdraw in-flight requests. |
| `LINE_MANAGER` | `Provision.LineManager` | Assigned School (`institution_id`) | Step 1 review for `EXCULPATORY` and `JOB_DESCRIPTION` workflows within their school. |
| `HEAD_TEACHER` | `Provision.HeadTeacher` | Assigned School (`institution_id`) | Step 1 institutional endorsement across IT, HR, Finance, and Logistics requests originating at their school. |
| `HR_MANAGER` | `Provision.HRManager` | Global (All Schools) | Central HR vetting, employment/affordability checklist sign-off, contract/benefit approvals. |
| `IT_MANAGER` | `Provision.ITManager` | Global (All Schools) | Hardware allocation, serial number recording, and final deduction schedule sign-off for `ICT_PURCHASE`. |
| `FINANCE_MANAGER` | `Provision.FinanceManager` | Global (All Schools) | Payroll updates (`BANK_CHANGE`), advance disbursements (`SALARY_ADVANCE`, `GRATUITY_ADVANCE`), and stores/budget reconciliation (`STORES_REQ`, `STOCK_RETURN`, `EVENT_COMPLETION`). |
| `LOGISTICS_MANAGER` | `Provision.LogisticsManager` | Global (All Schools) | Fleet/travel coordination (`TRAVEL_REQUEST`) and physical stores return inspection (`STOCK_RETURN`). |
| `SUPER_ADMIN` | `Provision.SuperAdmin` | Global (All Schools) | System administration, form catalog maintenance, policy version publishing, and emergency override. |

---

### 4. Unified User Experience & Role Flows

Instead of maintaining fragmented, department-specific UI silos, the frontend uses three polymorphic core views driven by metadata from `/api/bootstrap` and `/api/applications`.

#### 4.1 My Applications Workspace (`ApplicantDashboard.tsx` & `NewRequestStepper.tsx`)

Available to **all** authenticated staff (including managers submitting personal requests):

1. **Multi-Department KPI & Filter Strip:** Displays total submissions, in-review count, drafts/revisions required, and approved requests. Filterable by Department (`ALL`, `IT`, `HR`, `FINANCE`, `LOGISTICS`), Lifecycle Status, and Reference/Title search.
2. **3-Step Schema-Driven Submission Wizard (`NewRequestStepper.tsx`):**
   - **Step 1 (Department & Form Selection):** Staff filter by department and pick from the 14 form cards. Each card previews the exact multi-stage approval chain (`workflow_pipeline`) before selection.
   - **Step 2 (Polymorphic Payload Form):** Dynamically renders the required inputs for the chosen `FormCode`:
     - *ICT Purchase:* Interactive Level 1 / Level 2 hardware cards, repayment plan selector, and live monthly ZMW payroll deduction calculator.
     - *Stores Requisition & Stock Return:* Dynamic multi-row line-item table (`item_code`, `description`, `qty`, `condition`/`unit`) with add/remove row controls.
     - *HR, Finance & Logistics Forms:* Validated date pickers, currency inputs, institution selectors, and structured text areas matching strict TypeScript `FormPayloadMap[K]` contracts.
   - **Step 3 (Conditional Policy Gate & Digital Signature):** Displays the automated routing pipeline. If `requires_policy = true`, renders the active `policy_versions.legal_text` and mandates explicit checkbox consent before unlocking the digital signature input (`Save as Draft` or `Sign & Submit Application`).

#### 4.2 Unified Sign-off Queue & Master Ledger (`MasterSheetView.tsx`)

Available to all reviewer roles (`LINE_MANAGER`, `HEAD_TEACHER`, `HR_MANAGER`, `IT_MANAGER`, `FINANCE_MANAGER`, `LOGISTICS_MANAGER`, `SUPER_ADMIN`):

1. **Dual Operating Modes:**
   - **Sign-off Queue Mode (`awaitingMyRoleOnly = true`):** Filters the queue strictly to `status = 'IN_REVIEW'` where `current_approver_role` matches the logged-in reviewer's role (and `institution_id` matches for school-scoped roles).
   - **Master Ledger Mode (`awaitingMyRoleOnly = false`):** Displays all records visible under the user's PostgreSQL RLS policy across all 14 forms.
2. **Multi-Dimensional Filtering & Export:** Filterable simultaneously by Department, specific Form Type (all 14 forms), Institution/School, Lifecycle Status, and text search. Includes one-click **CSV Export** for payroll, inventory, and audit batch processing.

#### 4.3 Polymorphic Inspector & Reviewer Console (`ApplicationDetailDrawer.tsx`)

Clicking any row in either `ApplicantDashboard` or `MasterSheetView` opens the unified slide-over drawer:

1. **Live Pipeline Progress (`StepperProgress.tsx`):** Renders the exact number of approval nodes for that specific form (`Applicant Submission` -> `Step 1` -> `Step 2` -> `Step N`) with real-time status icons and reviewer names.
2. **Polymorphic Payload Inspector:** Automatically formats the JSONB `payload` as a hardware specification card (`ICT_PURCHASE`), a structured line-item table (`STORES_REQ`, `STOCK_RETURN`), or a labeled key-value grid (all other forms).
3. **Immutable Legal & Sign-off Dossier:** Displays the verbatim `legal_text_snapshot` (if applicable) alongside every completed step in `application_approvals`, including timestamps, reviewer comments, HR checklists, and IT serial numbers.
4. **Role-Aware Active Reviewer Console:** Unlocks **only** if `currentUser.role === application.current_approver_role` (or `SUPER_ADMIN`):
   - **Standard Controls (All Reviewers):** Reviewer comments, digital signature input, and three state-transition triggers: `Approve & Advance`, `Request Revision`, and `Reject`.
   - **HR Manager Extension:** Automatically embeds the interactive `hrChecklist` (`employment_confirmed`, `affordability_verified`, `no_active_disciplinary`) whenever `required_role === 'HR_MANAGER'`.
   - **IT Manager Extension:** Automatically embeds asset provisioning inputs (`asset_serial_number`, `deducted_monthly_amount_zmw`, `deduction_start_date`, `deduction_end_date`) stored in `step_metadata` whenever `required_role === 'IT_MANAGER'` on `ICT_PURCHASE`.

---

### 5. Universal Workflow State Machine

Instead of coupling lifecycle states to specific departments (`PENDING_GM_REVIEW`, `PENDING_IT_SIGNOFF`), the envelope tracks a generic `lifecycle_status` paired with `current_step_order` (`int2`) and `current_approver_role` (`user_role`):

```text
[ DRAFT ]
   │
   │ (Applicant signs & submits; if requires_policy=true, terms_accepted must be true)
   │ -> Sets status = 'IN_REVIEW'
   │ -> Sets current_step_order = 1, current_approver_role = pipeline[0].role
   ▼
[ IN_REVIEW (Step k of N) ] ──(Reviewer clicks "Request Revision")──► [ REVISION_REQUIRED ]
   │                                                                           │
   ├──(Reviewer clicks "Reject")────────────────────────────────────► [ REJECTED ]
   │
   ├──(Applicant withdraws while IN_REVIEW / DRAFT / REVISION)──────► [ CLOSED ]
   │
   │ (Reviewer clicks "Approve & Advance" on Step k)
   ├─► If Step k < N:
   │     status remains 'IN_REVIEW'
   │     current_step_order = k + 1
   │     current_approver_role = pipeline[k].role
   │
   └─► If Step k == N (Final pipeline step approved):
         status = 'APPROVED'
         current_step_order = NULL
         current_approver_role = NULL
```

---

### 6. PostgreSQL 18 Database Architecture

#### 6.1 Core Tables & Responsibilities

1. **`public.institutions`**: Master catalog of Educore schools and business units (`code`, `name`, `location`).
2. **`public.users`**: Staff directory synchronized with Entra ID (`entra_oid`, `institution_id`, `employee_number`, `role`, `department`, `job_title`).
3. **`public.form_definitions`**: Declarative registry of all 14 forms (`code`, `ref_prefix`, `department`, `title`, `requires_policy`, `workflow_pipeline` JSONB, `seq_year`, `seq_counter`).
4. **`public.policy_versions`**: Versioned legal agreements linked optionally to `form_definition_id`.
5. **`public.equipment_tiers`**: Hardware catalog for the `ICT_PURCHASE` form (`LEVEL_1`, `LEVEL_2`, `price_zmw`, specs).
6. **`public.applications`**: The generic workflow envelope storing applicant telemetry, lifecycle state (`status`, `current_step_order`, `current_approver_role`), legal snapshot, and the validated `payload` (`jsonb`) indexed via `GIN`.
7. **`public.application_approvals`**: Normalized 1-to-many approval steps spawned automatically on application insert via `trg_spawn_approval_pipeline`. Stores `step_order`, `required_role`, `institution_scoped`, `status`, `reviewer_id`, `comments`, `checklist_data` (`jsonb`), and `step_metadata` (`jsonb`).
8. **`public.approval_audit_logs`**: Immutable append-only event log recording every state transition and actor signature.
9. **`public.purchase_applications` (SQL View)**: Backwards-compatible `security_invoker` view projecting `ICT_PURCHASE` rows and joining `equipment_tiers` and `application_approvals` steps 1–3 into the legacy flat column structure.

#### 6.2 Concurrency & Integrity Guarantees

- **Atomic Reference Numbering (`generate_app_reference_number`):** Uses an atomic `UPDATE public.form_definitions SET seq_counter = ... RETURNING ref_prefix, seq_counter` row lock during `BEFORE INSERT` on `applications`. Prevents duplicate `reference_number` race conditions under simultaneous submissions and auto-resets counters on January 1st (`seq_year`).
- **Pessimistic Row Locking on Sign-off (`processApprovalStep`):** Executes `SELECT * FROM public.applications WHERE id = $1 FOR UPDATE` and `SELECT * FROM public.application_approvals WHERE application_id = $1 AND step_order = $2 FOR UPDATE` inside a transaction so two managers clicking "Approve" simultaneously cannot double-advance a workflow.
- **Transactional RLS Context (`withRlsContext`):** Every database call checks out a pooled client, opens a transaction (`BEGIN`), executes `SELECT set_config('request.jwt.claim.sub', $1, true)`, runs the query under PostgreSQL Row-Level Security, and commits (`COMMIT`), guaranteeing zero session leakage across pooled connections.

---

### 7. Backend API Specification (`server.ts`)

All `/api/*` endpoints (except `/api/health`) require a valid UUID in the `x-entra-oid` header (or upstream decoded Bearer token claim).

| Method & Path | Purpose | Security & Validation |
| :--- | :--- | :--- |
| `GET /api/health` | Database connectivity healthcheck. | Public health probe. |
| `GET /api/bootstrap` | Returns `currentUser`, `institutions`, `equipmentTiers`, `formDefinitions`, and `policies`. | Authenticated (`requireAuth`). |
| `GET /api/forms` | Lists all active `form_definitions` and their JSONB approval pipelines. | Authenticated (`requireAuth`). |
| `GET /api/applications` | Queries visible workflow applications. Supports `?formCode=`, `?department=`, `?status=`, and `?awaitingMyRoleOnly=true`. | Filtered automatically by Postgres `rls_apps_select`. |
| `GET /api/applications/:id` | Returns a single application envelope, its ordered `approvals` array, and `timeline` events. | Filtered by Postgres RLS (`404` if unauthorized). |
| `POST /api/applications` | Creates a draft or submits any of the 14 forms. Validates required payload keys via `validateFormPayload()`. | Enforces `rls_apps_insert` and policy gate check. |
| `POST /api/applications/:id/decision` | Unified sign-off endpoint (`APPROVED`, `REJECTED`, `REVISION_REQUESTED`) for all 6 reviewer roles. | Enforces `FOR UPDATE` lock, role match, school scope, and `rls_approvals_update`. |
| `POST /api/applications/:id/withdraw` | Allows the applicant to close an in-flight `DRAFT`, `IN_REVIEW`, or `REVISION_REQUIRED` request. | Enforces applicant ownership & status check. |
| `GET /api/legacy/ict-applications` | Legacy read adapter querying the `purchase_applications` SQL view. | Backwards compatibility. |
| `POST /api/legacy/ict-applications/:id/*` | Legacy route adapters (`gm-endorse`, `hr-clearance`, `it-signoff`) delegating to `processApprovalStep()`. | Backwards compatibility. |

---

### 8. Production Readiness & Cleanup Checklist

1. **Remove Legacy Prototype Artifacts:** Delete `.data/educore_db.json` and the unused single-role component folders (`src/components/HeadTeacherView/`, `src/components/HRView/`, `src/components/ITView/`) once final QA on `MasterSheetView` and `ApplicationDetailDrawer` is signed off.
2. **Update Seed & Snapshot SQL (`0003_seed_data.sql` & `schema.sql`):** Update seed scripts to insert test users for `FINANCE_MANAGER`, `LOGISTICS_MANAGER`, and `LINE_MANAGER`, and seed sample applications via the v4.0 `applications` (`form_definition_id`, `payload`) schema rather than the deprecated v3.0 columns.
3. **Database Connection Role:** Ensure production `DATABASE_URL` connects using the restricted `educore_app` PostgreSQL role (not superuser `postgres`) so declarative Row-Level Security policies are strictly enforced on every query.