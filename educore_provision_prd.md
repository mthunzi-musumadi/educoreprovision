# Product Requirements Document (PRD) & Enterprise Workflow Architecture

## Project: Educore Provision

- **Application Name:** Educore Provision (Enterprise Multi-Department Workflow & Provisioning Engine)
- **Document Version:** 4.1.0
- **Target Platform:** Responsive Web Application (Desktop-first administrative & operational portal)
- **Authentication Provider:** Microsoft Entra ID (OIDC / OAuth 2.0 with PKCE, App Roles & PostgreSQL RLS Session Binding)
- **Target Database:** PostgreSQL 18
- **Target Organization:** Educore Services Zambia — All 9 Official Sites:
  - Sentinel Kalumbila (`SKAL`)
  - Sentinel Kabitaka Primary (`SKAB_PRI`)
  - Sentinel Kabitaka Secondary (`SKAB_SEC`)
  - Trident College (`TCL`)
  - Trident Prep Kalumbila (`TPK`)
  - Trident Prep Solwezi (`TPS`)
  - Trident Prep Lusaka (`TPL`)
  - The Educore Academy (`TEA`)
  - Central Administration (`CENTRAL`)

---

### 1. Executive Summary & Business Objectives

#### 1.1 Problem Statement

Across Educore Services' 9 geographically distributed educational sites and central administration offices, **18 critical operational workflows** spanning **IT**, **Human Resources**, **Finance & Stores**, and **Logistics** previously relied on physical Word (`.docx`), Excel (`.xlsx`), and PDF forms:

- **Cross-Site Bottlenecks:** Routing physical paper and Excel sheets between site staff, Line Managers, Site Heads/GMs, and Central Administration (HR, IT, Finance, Logistics) takes 2 to 6 weeks per request.
- **Zero Visibility & Lost Paperwork:** Staff cannot see whose desk their form is sitting on; Finance and HR lack real-time visibility into pending salary/gratuity advances, imprest retirements, purchase requisitions, medical claims, bank changes, stock requisitions, or equipment commitments.
- **Inconsistent Compliance:** Out-of-band vetting (probation checks, affordability/debt-ratio verification, Receivables/Payables closure checks, stores inspection, policy sign-offs) occurs inconsistently and lacks an immutable digital audit trail.
- **Schema Rigidity in Legacy Digitization (v3.0):** The initial prototype hardcoded single-purpose ICT laptop purchase columns (`equipment_tier_id`, `gm_reviewer_id`, `hr_reviewer_id`, `it_reviewer_id`) directly onto the root `applications` table, preventing horizontal expansion across HR, Finance, and Logistics workflows.

#### 1.2 System Objectives (v4.1 Architecture)

- **Unified 18-Form Digitization:** Consolidate all 18 organizational forms across IT, HR, Finance, and Logistics into a single polymorphic workflow engine without requiring DDL table migrations when new forms are introduced.
- **Dynamic Multi-Stage Routing:** Route each form automatically through its specific chain of command (`workflow_pipeline`) based on `form_definitions` metadata.
- **Database-Enforced Site Multi-Tenancy (RLS):** Enforce strict Row-Level Security inside PostgreSQL 18 via transaction-scoped session claims (`request.jwt.claim.sub`). Site-scoped leaders (`HEAD_TEACHER`, `LINE_MANAGER`) can only view and sign off on records originating from their assigned `site_id` (`current_auth_site_id()`), while Central roles (`HR_MANAGER`, `IT_MANAGER`, `FINANCE_MANAGER`, `LOGISTICS_MANAGER`) operate organization-wide across all 9 sites.
- **Conditional Per-Request Legal Enforceability:** Dynamically enforce verbatim policy snapshots (`legal_text_snapshot`) and explicit digital acceptance on forms carrying financial/payroll, medical data, or benefit obligations (`requires_policy = true`).
- **Concurrency-Safe Auditability:** Guarantee race-condition-free reference numbering (`EDC-<PREFIX>-YYYY-XXXX`), row-level locking (`FOR UPDATE`) during approval state transitions, and an immutable audit log (`approval_audit_logs`).

---

### 2. Catalog of Digitized Organizational Workflows (All 18 Forms)

Every form is defined as a declarative catalog entry in `public.form_definitions` with its own reference prefix, department, policy gate requirement, and ordered approval pipeline:

| Department | Form Code | Reference Prefix | Document Title | Policy Gate | Ordered Approval Pipeline (`step_order`) |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **IT** | `ICT_PURCHASE` | `EDC-ICT` | Application ICT Purchase Scheme | Yes | 1. `HEAD_TEACHER` (Site)<br>2. `HR_MANAGER` (Central)<br>3. `IT_MANAGER` (Central) |
| **Logistics** | `TRAVEL_REQUEST` | `EDC-TRV` | Travel Request Form | No | 1. `LINE_MANAGER` (Site)<br>2. `LOGISTICS_MANAGER` (Central) |
| **HR** | `SALARY_ADVANCE` | `EDC-ADV` | Application for Advance | Yes | 1. `HEAD_TEACHER` (Site)<br>2. `HR_MANAGER` (Central)<br>3. `FINANCE_MANAGER` (Central) |
| **HR** | `PROF_DEV` | `EDC-PDV` | Application for Professional Development | Yes | 1. `HEAD_TEACHER` (Site)<br>2. `HR_MANAGER` (Central) |
| **HR** | `BANK_CHANGE` | `EDC-BNK` | Change of Bank Details | No | 1. `HR_MANAGER` (Central)<br>2. `FINANCE_MANAGER` (Central) |
| **HR** | `CONTRACT_RENEWAL` | `EDC-CNT` | Contract Renewal Form for HR | No | 1. `HEAD_TEACHER` (Site)<br>2. `HR_MANAGER` (Central) |
| **HR** | `CHILD_ADMISSION` | `EDC-CHD` | Educore Staff Child Admission Authorisation | Yes | 1. `HEAD_TEACHER` (Site)<br>2. `HR_MANAGER` (Central) |
| **HR** | `DISCIPLINARY_CHARGE` | `EDC-DCF` | Disciplinary Charge Form | No | 1. `LINE_MANAGER` (Site)<br>2. `HR_MANAGER` (Central) |
| **HR** | `EXCULPATORY` | `EDC-EXC` | Exculpatory Form | No | 1. `LINE_MANAGER` (Site)<br>2. `HR_MANAGER` (Central) |
| **HR** | `GRATUITY_ADVANCE` | `EDC-GRT` | Gratuity Advance Application Form - Annual | Yes | 1. `HR_MANAGER` (Central)<br>2. `FINANCE_MANAGER` (Central) |
| **HR** | `JOB_DESCRIPTION` | `EDC-JDS` | Job Description Sign-off | No | 1. `LINE_MANAGER` (Site)<br>2. `HR_MANAGER` (Central) |
| **HR** | `MANPOWER_REQ` | `EDC-MPR` | Manpower Requisition Form | No | 1. `HEAD_TEACHER` (Site)<br>2. `HR_MANAGER` (Central) |
| **HR** | `EDU_HEALTH_CLAIM` | `EDC-EHC` | Edu-Health Claims Reimbursement Form | Yes | 1. `HR_MANAGER` (Central)<br>2. `FINANCE_MANAGER` (Central) |
| **Finance** | `EVENT_COMPLETION` | `EDC-EVC` | Event Completion Form | No | 1. `HEAD_TEACHER` (Site)<br>2. `FINANCE_MANAGER` (Central) |
| **Finance** | `STOCK_RETURN` | `EDC-STR` | Stock Return Form | No | 1. `LOGISTICS_MANAGER` (Central)<br>2. `FINANCE_MANAGER` (Central) |
| **Finance** | `STORES_REQ` | `EDC-SRQ` | Stores Requisition Form | No | 1. `HEAD_TEACHER` (Site)<br>2. `FINANCE_MANAGER` (Central) |
| **Finance** | `EXPENSE_RETIREMENT` | `EDC-IMP` | Cash Requisition & Expense Retirement Form | Yes | 1. `HEAD_TEACHER` (Site)<br>2. `FINANCE_MANAGER` (Central) |
| **Finance** | `PURCHASE_REQ` | `EDC-PRQ` | Purchase Requisition & Order Form (PR / PO) | No | 1. `HEAD_TEACHER` (Site)<br>2. `LOGISTICS_MANAGER` (Central)<br>3. `FINANCE_MANAGER` (Central) |

---

### 3. Identity & RBAC Architecture: Microsoft Entra ID

Educore Provision authenticates users via Microsoft Entra ID. The Node/Express API layer extracts the authenticated user's Entra Object ID (`entra_oid`) and binds it to the PostgreSQL transaction using `SELECT set_config('request.jwt.claim.sub', $1, true)` inside `withRlsContext()`.

#### 3.1 Token Claims Mapping

```json
{
  "sub": "33333333-3333-4333-8333-333333333301",
  "oid": "33333333-3333-4333-8333-333333333301",
  "name": "Blair Kuhn",
  "preferred_username": "bkuhn@trident-college.com",
  "email": "bkuhn@trident-college.com",
  "roles": ["Provision.HeadTeacher"],
  "extension_EmployeeNumber": "EDC-1001",
  "extension_SiteCode": "TCL"
}
```

#### 3.2 Role Matrix (`public.user_role`)

| Database Role Enum | Entra App Role | Tenancy Scope | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| `APPLICANT` | `Provision.Applicant` | Own Records (`applicant_id`) | Submit any of the 18 forms, track live pipeline progress, withdraw in-flight requests. |
| `LINE_MANAGER` | `Provision.LineManager` | Assigned Site (`site_id`) | Step 1 site-scoped review for `TRAVEL_REQUEST`, `DISCIPLINARY_CHARGE`, `EXCULPATORY`, and `JOB_DESCRIPTION`. |
| `HEAD_TEACHER` | `Provision.HeadTeacher` | Assigned Site (`site_id`) | Step 1 site-scoped leadership endorsement across IT, HR, and Finance requests originating at their site. |
| `HR_MANAGER` | `Provision.HRManager` | Global (All 9 Educore Sites) | Central HR vetting, employment/affordability checklist sign-off, disciplinary registration, Edu-Health claims, and contract/benefit approvals. |
| `IT_MANAGER` | `Provision.ITManager` | Global (All 9 Educore Sites) | Hardware allocation, serial number recording, and final deduction schedule sign-off for `ICT_PURCHASE`. |
| `FINANCE_MANAGER` | `Provision.FinanceManager` | Global (All 9 Educore Sites) | Payroll updates (`BANK_CHANGE`), advance/claim disbursements (`SALARY_ADVANCE`, `GRATUITY_ADVANCE`, `EDU_HEALTH_CLAIM`), imprest retirement (`EXPENSE_RETIREMENT`), PR/PO budget sign-off (`PURCHASE_REQ`), and stores/event closure (`STORES_REQ`, `STOCK_RETURN`, `EVENT_COMPLETION`). |
| `LOGISTICS_MANAGER` | `Provision.LogisticsManager` | Global (All 9 Educore Sites) | Travel desk flight/hotel/transfer booking (`TRAVEL_REQUEST`), procurement PO processing (`PURCHASE_REQ`), and physical stores return inspection (`STOCK_RETURN`). |
| `SUPER_ADMIN` | `Provision.SuperAdmin` | Global (All 9 Educore Sites) | System administration, form catalog maintenance, policy version publishing, and emergency override. |

---

### 4. Unified User Experience & Role Flows

Instead of maintaining fragmented, department-specific UI silos, the frontend uses three polymorphic core views driven by metadata from `/api/bootstrap` and `/api/applications`.

#### 4.1 My Applications Workspace (`ApplicantDashboard.tsx` & `NewRequestStepper.tsx`)

Available to **all** authenticated staff (including managers submitting personal requests):

1. **Multi-Department KPI & Filter Strip:** Displays total submissions, in-review count, drafts/revisions required, and approved requests. Filterable by Department (`ALL`, `IT`, `HR`, `FINANCE`, `LOGISTICS`), Lifecycle Status, and Reference/Title search.
2. **3-Step Schema-Driven Submission Wizard (`NewRequestStepper.tsx`):**
   - **Step 1 (Department & Form Selection):** Staff filter by department and pick from the 18 form cards. Each card previews the exact multi-stage approval chain (`workflow_pipeline`) before selection.
   - **Step 2 (Polymorphic Payload Form):** Dynamically renders the exact fields and multi-row repeaters required for the chosen `FormCode` matching `FormPayloadMap[K]`:
     - *ICT Purchase (`ICT_PURCHASE`):* Interactive Level 1 / Level 2 hardware cards, repayment plan selector, and live monthly ZMW payroll deduction calculator.
     - *Travel Request (`TRAVEL_REQUEST`):* Cost code, site, contact details, multi-passenger manifest repeater (`passengers[]`), flight booking type (`CONTRACT` / `BUSINESS` / `PRIVATE_PAYROLL_DEDUCTION`), multi-leg flight itinerary repeater (`flights[]`), hotel check-in/out, and car hire/transfer scheduling.
     - *Staff Child Admission (`CHILD_ADMISSION`):* Academic year, staff tenure, and a multi-child repeater (`children[]`) capturing each child's name, DOB, target Educore site, year group, term, and rebate percentage.
     - *Cash Requisition & Expense Retirement (`EXPENSE_RETIREMENT`):* Dual line-item repeaters (`amounts_requested[]` for imprest advance and `expenses_retired[]` for receipts) with live calculation of `total_requested`, `total_retired`, and `balance`.
     - *Purchase Requisition (`PURCHASE_REQ`):* Cost centre, currency, available budget, regular vs. outside budget status, and a PR line-item repeater (`items[]`) with live `total_cost` and `variance_to_budget` calculation.
     - *Edu-Health Claim (`EDU_HEALTH_CLAIM`):* Patient/member demographics, multi-select treatment category pills (`CONSULTATION`, `OPTICAL`, `DENTAL`, etc.), itemized medical claim repeater (`claim_items[]`), bank transfer vs. membership credit toggle, and mandatory medical data consent checkboxes.
     - *Stores Requisition (`STORES_REQ`) & Stock Return (`STOCK_RETURN`):* Multi-row inventory repeaters with condition grading and inventory action selectors (`RETURN_TO_STOCK`, `RETURN_TO_SUPPLIER`, `DISPOSAL`, `SEND_FOR_REPAIR`).
     - *Remaining HR & Finance Forms:* Structured, validated inputs for `SALARY_ADVANCE`, `GRATUITY_ADVANCE`, `PROF_DEV`, `BANK_CHANGE`, `CONTRACT_RENEWAL`, `DISCIPLINARY_CHARGE`, `EXCULPATORY`, `JOB_DESCRIPTION` (dynamic responsibility list), `MANPOWER_REQ`, and `EVENT_COMPLETION`.
   - **Step 3 (Conditional Policy Gate & Digital Signature):** Displays the automated routing pipeline. If `requires_policy = true`, renders the active `policy_versions.legal_text` and mandates explicit checkbox consent before unlocking the digital signature input (`Save as Draft` or `Sign & Submit Application`).

#### 4.2 Unified Sign-off Queue & Master Ledger (`MasterSheetView.tsx`)

Available to all reviewer roles (`LINE_MANAGER`, `HEAD_TEACHER`, `HR_MANAGER`, `IT_MANAGER`, `FINANCE_MANAGER`, `LOGISTICS_MANAGER`, `SUPER_ADMIN`):

1. **Dual Operating Modes:**
   - **Sign-off Queue Mode (`awaitingMyRoleOnly = true`):** Filters the queue strictly to `status = 'IN_REVIEW'` where `current_approver_role` matches the logged-in reviewer's role (and `site_id` matches for site-scoped roles).
   - **Master Ledger Mode (`awaitingMyRoleOnly = false`):** Displays all records visible under the user's PostgreSQL RLS policy across all 18 forms.
2. **Multi-Dimensional Filtering & Export:** Filterable simultaneously by Department, specific Form Type (all 18 forms), Educore Site (all 9 sites), Lifecycle Status, and text search. Includes one-click **CSV Export** for payroll, inventory, and audit batch processing.

#### 4.3 Polymorphic Inspector, Print/PDF View & Reviewer Console (`ApplicationDetailDrawer.tsx`)

Clicking any row in either `ApplicantDashboard` or `MasterSheetView` opens the unified slide-over drawer:

1. **Live Pipeline Progress (`StepperProgress.tsx`):** Renders the exact number of approval nodes for that specific form (`Applicant Submission` -> `Step 1` -> `Step 2` -> `Step N`) with real-time status icons and reviewer names.
2. **Polymorphic Payload Inspector & Print/PDF Export:** Formats the JSONB `payload` into specialized tables (Passengers/Flights, Multi-Child Admission, Imprest Advance vs. Retirement, PR Line Items & Variance, Medical Claim Items, Stores/Stock Items, or ICT Hardware Cards) and includes a **Print / Save Official PDF** trigger (`window.print()`).
3. **Immutable Legal & Sign-off Dossier:** Displays the verbatim `legal_text_snapshot` (if applicable) alongside every completed step in `application_approvals`, including timestamps, reviewer comments, HR/Finance checklists, and IT serial numbers.
4. **Role-Aware Active Reviewer Console:** Unlocks **only** if `currentUser.role === application.current_approver_role` (or `SUPER_ADMIN`):
   - **Standard Controls (All Reviewers):** Reviewer comments, digital signature input, and three state-transition triggers: `Approve & Advance`, `Request Revision`, and `Reject`.
   - **HR Manager Review:** Standard document review controls matching official HR forms (reviewer comments, digital signature, and decision triggers). No synthetic checklists are imposed.
   - **Finance Manager Extension (`EVENT_COMPLETION`):** Embeds the Receivables & Payables Closure Confirmation checklist (`receivables_costing_submitted`, `receivables_quotations_submitted`, `receivables_sage_billing_posted`, `payables_expense_docs_submitted`, `payables_postings_completed`) matching `Event Completion Form.docx`.
   - **IT Manager Extension (`ICT_PURCHASE`):** Embeds asset provisioning inputs (`asset_serial_number`, `deducted_monthly_amount_zmw`, `deduction_start_date`, `deduction_end_date`) stored in `step_metadata`.

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

1. **`public.sites`**: Master catalog of all 9 Educore physical sites and schools (`code`, `name`, `location`, `is_active`).
2. **`public.users`**: Staff directory synchronized with Entra ID (`entra_oid`, `site_id`, `employee_number`, `role`, `department`, `job_title`).
3. **`public.form_definitions`**: Declarative registry of all 18 forms (`code`, `ref_prefix`, `department`, `title`, `requires_policy`, `workflow_pipeline` JSONB, `seq_year`, `seq_counter`).
4. **`public.policy_versions`**: Versioned legal agreements linked optionally to `form_definition_id`.
5. **`public.equipment_tiers`**: Hardware catalog for the `ICT_PURCHASE` form (`LEVEL_1`, `LEVEL_2`, `price_zmw`, specs).
6. **`public.applications`**: The generic workflow envelope storing `site_id`, `applicant_id`, lifecycle state (`status`, `current_step_order`, `current_approver_role`), legal snapshot, and the validated `payload` (`jsonb`) indexed via `GIN`.
7. **`public.application_approvals`**: Normalized 1-to-many approval steps spawned automatically on application insert via `trg_spawn_approval_pipeline`. Stores `step_order`, `required_role`, `site_scoped`, `status`, `reviewer_id`, `comments`, `checklist_data` (`jsonb`), and `step_metadata` (`jsonb`).
8. **`public.approval_audit_logs`**: Immutable append-only event log recording every state transition and actor signature.
9. **`public.purchase_applications` (SQL View)**: Backwards-compatible `security_invoker` view projecting `ICT_PURCHASE` rows and joining `equipment_tiers` and `application_approvals` steps 1–3 into the legacy flat column structure.

#### 6.2 Concurrency & Integrity Guarantees

- **Atomic Reference Numbering (`generate_app_reference_number`):** Uses an atomic `UPDATE public.form_definitions SET seq_counter = ... RETURNING ref_prefix, seq_counter` row lock during `BEFORE INSERT` on `applications`. Prevents duplicate `reference_number` race conditions under simultaneous submissions and auto-resets counters on January 1st (`seq_year`).
- **Pessimistic Row Locking on Sign-off (`processApprovalStep`):** Executes `SELECT * FROM public.applications WHERE id = $1 FOR UPDATE` and `SELECT * FROM public.application_approvals WHERE application_id = $1 AND step_order = $2 FOR UPDATE` inside a transaction so two managers clicking "Approve" simultaneously cannot double-advance a workflow.
- **Transactional RLS Context (`withRlsContext`):** Every database call checks out a pooled client, opens a transaction (`BEGIN`), executes `SELECT set_config('request.jwt.claim.sub', $1, true)`, runs the query under PostgreSQL Row-Level Security (`current_auth_user_id()`, `current_auth_role()`, `current_auth_site_id()`), and commits (`COMMIT`), guaranteeing zero session leakage across pooled connections.

---

### 7. Backend API Specification (`server.ts`)

All `/api/*` endpoints (except `/api/health`) require a valid UUID in the `x-entra-oid` header (or upstream decoded Bearer token claim).

| Method & Path | Purpose | Security & Validation |
| :--- | :--- | :--- |
| `GET /api/health` | Database connectivity healthcheck. | Public health probe. |
| `GET /api/bootstrap` | Returns `currentUser` (with `site_name` & `site_code`), `sites`, `equipmentTiers`, `formDefinitions`, and `policies`. | Authenticated (`requireAuth`). |
| `GET /api/forms` | Lists all 18 active `form_definitions` and their JSONB approval pipelines. | Authenticated (`requireAuth`). |
| `GET /api/applications` | Queries visible workflow applications. Supports `?formCode=`, `?department=`, `?status=`, and `?awaitingMyRoleOnly=true`. | Filtered automatically by Postgres `rls_apps_select`. |
| `GET /api/applications/:id` | Returns a single application envelope, its ordered `approvals` array, and `timeline` events. | Filtered by Postgres RLS (`404` if unauthorized). |
| `POST /api/applications` | Creates a draft or submits any of the 18 forms. Validates required payload keys and nested repeater arrays via `validateFormPayload()`. | Enforces `rls_apps_insert` and policy gate check. |
| `POST /api/applications/:id/decision` | Unified sign-off endpoint (`APPROVED`, `REJECTED`, `REVISION_REQUESTED`) for all reviewer roles. | Enforces `FOR UPDATE` lock, role match, site scope, and `rls_approvals_update`. |
| `POST /api/applications/:id/withdraw` | Allows the applicant to close an in-flight `DRAFT`, `IN_REVIEW`, or `REVISION_REQUIRED` request. | Enforces applicant ownership & status check. |
| `GET /api/legacy/ict-applications` | Legacy read adapter querying the `purchase_applications` SQL view. | Backwards compatibility. |
| `POST /api/legacy/ict-applications/:id/*` | Legacy route adapters (`gm-endorse`, `hr-clearance`, `it-signoff`) delegating to `processApprovalStep()`. | Backwards compatibility. |

---

### 8. Production Readiness & Verification Checklist

1. **Migration Execution Order:** Ensure migrations `0001` -> `0002` -> `0004_workflow_engine_refactor.sql` -> `0005_seed_v4_workflow_data.sql` -> `0006_complete_18_forms_catalog.sql` -> `0007_rename_institutions_to_sites.sql` have been applied cleanly.
2. **Database Connection Role:** Ensure production `DATABASE_URL` connects using the restricted `educore_app` PostgreSQL role (not superuser `postgres`) so declarative Row-Level Security policies are strictly enforced on every query.
3. **End-to-End Test Suite (`tests/`):** Verify that Vitest integration and API tests target the v4.1 `/api/bootstrap`, `/api/applications`, and `/api/applications/:id/decision` routes across site-scoped and global roles.