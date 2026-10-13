# Educore Provision — ICT Purchase Scheme MVP

Educore Provision digitizes the physical paper-based "Application ICT Purchase Scheme" workflow across Educore Services schools (Trident College, Sentinel Kabitaka, Frontier, and Educore Academy). It provides a secure, role-scoped 4-stage approval portal cutting procurement lifecycles from weeks to under 48 hours while maintaining per-request legal acceptance, strict campus data isolation, and payroll deduction reconciliation.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following core MVP parameters have been confirmed based on your requirements and clarifying responses:

- **Interactive Role Switcher**: A global persona switcher bar pinned at the top allows instant switching between **Applicant (Teacher/Staff)**, **Head Teacher / General Manager (Campus Leadership)**, **Central HR Manager (People & Payroll Compliance)**, and **Central ICT Manager (Hardware & Scheme Ownership)**, plus **Super Admin**.
- **End-to-End 4-Stage Approval Lifecycle**: Complete coverage of Part 1 (Applicant Request & Legal Gate), Part 2 (GM/Head Teacher Endorsement), Part 3 (Central HR Debt Clearance & Compliance Check), and Part 4 (Central IT Device Serial Assignment & Payroll Deduction Schedule).
- **Master Sheet & Document Generation**: Real-time organization-wide Master Sheet with CSV export for Educore payroll deduction batches, plus an authentic digital facsimile of the signed "Application ICT Purchase Scheme" document (matching the original physical paper form) available for live preview and PDF download upon completion.
- **Hardware Tier Specifications & Auto-Calculated Deductions**: Clear specs for Level 1 (General Staff / Admin Productivity) and Level 2 (STEM / Advanced Computational Workload) laptops with real-time monthly repayment estimates calculated across 1–2 Months, 12 Months, and 24 Months in Zambian Kwacha (ZMW).

---

## 1. Overview & Core Concept

### What It Does
Replaces the physical paper circulation form with a responsive web application that manages the end-to-end laptop acquisition lifecycle for Educore employees:
1. **Applicant Submission**: Employee selects laptop tier and repayment period, reviews and accepts the verbatim legal terms and payroll deduction mandate with digital sign-off.
2. **Head Teacher / GM Triage**: Campus leader reviews staff requests strictly from their school, adding operational justification comments and endorsing or rejecting.
3. **Central HR Clearance**: Verifies employee standing, ensures debt ratio is under Educore's 33% threshold and no conflicting salary advances exist, then clears or halts.
4. **Central IT Provisioning**: IT assigns serial numbers / asset tags (e.g., `DELL-LAT-5540-0891`), inputs the agreed monthly deduction amount and date schedule (`from` / `to`), and finalizes the digital seal.
5. **Batch Payroll & Asset Export**: HR and IT export structured CSV files formatted directly for payroll deduction batches and asset registers.

### Target Personas & Scoping
- **Applicant (e.g., Jane Mwanza, Trident College)**: Can only view and track their own applications (`applicant_id = current_user`).
- **Head Teacher / GM (e.g., Blair Kuhn, Trident College)**: Strictly scoped to requests originating from their campus (`institution_id = current_user.institution_id`). Cannot see other schools.
- **Central HR Manager (e.g., Kasonde Phiri, Central Admin)**: Global multi-school visibility; validates debt-to-income and contract status.
- **Central ICT Manager (e.g., Chola Musonda, Central Admin)**: Global visibility; configures hardware inventory, serial tags, and payroll deduction schedules.

---

## 2. User Experience & Visual Design

### Visual Identity & Theme
- **Aesthetic Direction**: Professional, high-density institutional SaaS tailored for educational administration. Clean, crisp typography with purposeful contrast and no decorative clutter.
- **Color Palette**:
  - Primary Canvas: Crisp slate neutral (`#F8FAFC` to `#FFFFFF`).
  - Brand Anchor: Educore Deep Slate / Navy (`#0F172A`) with subtle forest/emerald accents (`#059669` / `#10B981`) representing educational growth and successful approvals.
  - Semantic Accents: Crimson (`#DC2626`) for rejections/debt threshold breaches, Amber (`#D97706`) for pending reviews or revision requests, Indigo (`#4F46E5`) for IT asset provisioning.
- **Typography**: `Plus Jakarta Sans` for clean structural headings and interface navigation, paired with `tabular-nums` monospace (`font-mono`) for all monetary amounts (ZMW), reference codes (`EDC-ICT-2026-XXXX`), and serial numbers.

### Key Layouts & Views
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Persona Switcher Bar: [Jane Mwanza (Teacher)] [Blair Kuhn (Head Teacher)] [Central HR] [Central IT] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Educore Provision      Dashboard    My Requests    School Triage    HR Queue    IT Provisioning  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  [Applicant View]                        [Head Teacher / GM Triage]                    │
│  ┌─────────────────────────────┐        ┌───────────────────────────────────────────┐  │
│  │ Part 1: Request Laptop      │        │ Campus: Trident College Queue (3 pending) │  │
│  │ Tier: Level 1 vs Level 2    │        │ · Review Part 1 details                   │  │
│  │ Term: 1-2, 12, 24 Months    │        │ · Operational Justification notes         │  │
│  │ Legal Agreement Checkbox    │        │ · [Endorse & Send to HR] [Reject]         │  │
│  └─────────────────────────────┘        └───────────────────────────────────────────┘  │
│                                                                                        │
│  [Central HR Review]                     [Central IT Provisioning & Closure]           │
│  ┌─────────────────────────────┐        ┌───────────────────────────────────────────┐  │
│  │ Multi-Campus HR Triage      │        │ Asset Assignment & Financial Sign-off     │  │
│  │ · Debt Ratio < 33% check    │        │ · Asset Tag / Serial: DELL-LAT-5540-0891  │  │
│  │ · Salary Advance check      │        │ · Monthly Deduction: ZMW 1,250.00         │  │
│  │ · [Clear & Route to IT]     │        │ · Schedule: Nov 2026 to Oct 2027          │  │
│  └─────────────────────────────┘        │ · [Finalize & Generate Sealed PDF]        │  │
│                                         └───────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Top Persona Switcher & Breadcrumb Bar**: Quick-switch buttons allowing immediate role preview with campus indicators.
2. **Applicant Submission Stepper**:
   - Screen 0: Mandatory Legal Gate displaying the verbatim policy text from the physical document, requiring explicit acceptance.
   - Screen 1: Laptop selection cards (Level 1: Core i5/16GB/512GB vs Level 2: Core i7/32GB/1TB GPU) with dynamic monthly cost estimations.
   - Screen 2: Digital sign-off with authenticated session timestamp.
3. **Application Detail & Linear 4-Stage Stepper**:
   - Visual step tracker matching the physical document parts: Part 1 (Applicant) $\rightarrow$ Part 2 (GM Endorsement) $\rightarrow$ Part 3 (HR Clearance) $\rightarrow$ Part 4 (IT Hardware & Schedule).
   - Real-time status badges (`PENDING_GM_REVIEW`, `PENDING_HR_REVIEW`, `PENDING_IT_SIGNOFF`, `APPROVED`, `REJECTED`).
4. **Physical Form Digital Facsimile & PDF Exporter**:
   - High-fidelity visual view rendering the exact layout of the Solwezi Educore Services paper form with all 4 parts populated and signed.
   - Print-to-PDF / direct download button.
5. **Master Sheet & Payroll Export**:
   - Comprehensive data grid with search, campus filtering, and status filters.
   - "Export Payroll CSV" generating standard deduction columns for Educore payroll processing.

---

## 3. Key Product Decisions & Trade-Offs

- **Role-Based Row-Level Security Simulation**:
  - *Approach*: Built-in multi-tenant store enforcing institution and role boundaries in memory and localStorage so testing accurately reflects production Postgres RLS behavior.
  - *Why*: Ensures school GMs strictly see their own school's requests while HR and IT have global visibility, preventing data leakage.
- **Client-Side Document Generator**:
  - *Approach*: CSS print stylesheet and structured SVG/canvas certificate generator recreating the exact Educore Services Solwezi letterhead and 4-part form.
  - *Why*: Instant browser preview and zero-latency PDF download without requiring external server-side PDF microservices.
- **Deterministic State Machine**:
  - *Approach*: Strict sequential transitions preventing Part 4 from being acted upon before Parts 2 and 3 are successfully endorsed.
  - *Why*: Mirrors corporate compliance rules and eliminates out-of-order equipment issuance.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Interactive Application                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [Persona Context & Active Role Store]                                 │
│    ├── Roles: APPLICANT | HEAD_TEACHER | HR_MANAGER | IT_MANAGER       │
│    └── Campus: TRIDENT_COLLEGE | SENTINEL_KABITAKA | FRONTIER | ACADEMY│
│                                                                        │
│  [State Machine & Storage Service]                                     │
│    ├── purchase_applications (Part 1, 2, 3, 4 records)                 │
│    ├── application_timeline_events (audit trail)                      │
│    ├── institutions & users registry                                  │
│    └── policy_versions (verbatim legal text snapshot)                 │
│                                                                        │
│  [Core Views]                                                          │
│    ├── ApplicantDashboard & NewRequestStepper                          │
│    ├── SchoolTriageView (Campus Leader queue)                          │
│    ├── HRReviewQueue (Central compliance & debt checks)                │
│    ├── ITProvisioningQueue (Serial tag & deduction calendar)           │
│    ├── MasterSheetView (Payroll batch & inventory export)              │
│    └── SealedDocumentModal (Exact physical form facsimile & print)     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Data Entities
- **Institution**: `id`, `name`, `code` (`TRIDENT_COLLEGE`, `SENTINEL_KABITAKA`, `FRONTIER_SCHOOL`, `EDUCORE_ACADEMY`).
- **User**: `id`, `name`, `email`, `employee_number`, `institution_id`, `role`.
- **PurchaseApplication**:
  - `id`, `reference_number` (`EDC-ICT-2026-XXXX`), `status`.
  - **Legal Snapshot**: `terms_accepted`, `terms_accepted_at`, `legal_text_snapshot`.
  - **Part 1**: `requested_laptop_tier`, `repayment_period`, `applicant_signed_at`.
  - **Part 2**: `gm_reviewer_id`, `gm_comments`, `gm_signed_at`.
  - **Part 3**: `hr_reviewer_id`, `hr_comments`, `hr_signed_at`, `hr_checklist` (debt ratio, probation, advance check).
  - **Part 4**: `it_reviewer_id`, `asset_serial_number`, `deducted_monthly_amount`, `deduction_start_date`, `deduction_end_date`, `it_comments`, `it_signed_at`.
  - **Audit Trail**: Array of timestamped timeline events with actor, action, and visibility flags.

---

## 5. Implementation Roadmap (Upon Approval)

1. **State & Types Setup**: Create robust TypeScript definitions, state machine validators, and pre-seeded mock records reflecting real Educore staff across schools.
2. **Navigation & Persona Switcher**: Top banner to switch active user with role badges and campus tags.
3. **Applicant Workflow**: Build the legal acceptance gate, laptop tier selector with live deduction calculator, and submission form.
4. **Approval Queues**: Build dedicated views for Head Teacher (School Triage), Central HR (Debt Clearance), and Central IT (Asset Tagging & Schedule).
5. **Physical Form Facsimile & PDF Export**: Recreate the exact paper layout with Solwezi header, 4 signature blocks, and print styling.
6. **Master Sheet & CSV Export**: Build the payroll deduction grid with search, filter, and payroll CSV downloader.
7. **Verification**: Run TypeScript build checks and verify all interactive workflows.
