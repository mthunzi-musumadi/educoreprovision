# Educore Provision — Phase 2: Database Persistence & Production Schema

This phase transitions Educore Provision from local prototype storage to a production backend database service, establishing persistent storage for equipment applications, multi-school role-level scoping, and immutable audit logs.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed for Phase 2:

- **Milestone Priority**: Backend database persistence and production schema architecture have been prioritized as the immediate next step.
- **Workflow Notifications**: External notification webhooks and email alerts are deferred to maintain focus on data integrity, schema consistency, and persistent storage.
- **Data Model Fidelity**: The database schema directly matches the PostgreSQL 18 architecture specified in Section 5 of the PRD, featuring native Row-Level Security (RLS) enforcement, immutable audit event logs, and per-request legal acceptance snapshots.

---

## 1. Overview & Data Architecture

### Core Objectives
1. **Multi-Session Persistence**: Store all equipment applications, user records, and timeline events in a persistent database service so data persists across browser sessions and devices.
2. **Strict Site Isolation**: Enforce campus boundaries at the query and service layer so that Head Teachers at Trident College, Sentinel Kabitaka, Frontier School, and Educore Academy cannot access cross-campus records.
3. **Full Full-Stack API**: Implement clean Express REST endpoints backed by a robust database adapter layer:
   - `GET /api/applications`: Scoped query based on caller's role and institution.
   - `POST /api/applications`: Part 1 submission with legal snapshot verification.
   - `POST /api/applications/:id/endorse`: Part 2 Head Teacher endorsement or revision.
   - `POST /api/applications/:id/clearance`: Part 3 Central HR compliance check.
   - `POST /api/applications/:id/signoff`: Part 4 Central IT serial number & deduction schedule.
   - `GET /api/applications/:id/timeline`: Immutable audit trail.

---

## 2. Production Schema Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL / DB Architecture                    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  sites                                                          │
│  ├── id (UUID)                                                         │
│  ├── name (VARCHAR)                                                    │
│  └── code (TRIDENT_COLLEGE | SENTINEL_KABITAKA | FRONTIER | ACADEMY)   │
│                                                                        │
│  users                                                                 │
│  ├── id (UUID)                                                         │
│  ├── entra_oid (UUID)                                                  │
│  ├── employee_number (VARCHAR - e.g., EDC-1042)                        │
│  ├── full_name, email, role                                            │
│  └── site_id (FK -> sites)                               │
│                                                                        │
│  purchase_applications                                                 │
│  ├── id (UUID)                                                         │
│  ├── reference_number (VARCHAR - EDC-ICT-2026-XXXX)                    │
│  ├── applicant_id (FK -> users)                                        │
│  ├── site_id (FK -> sites)                               │
│  ├── status (DRAFT | PENDING_GM_REVIEW | PENDING_HR_REVIEW | ...)       │
│  ├── policy_version_tag & legal_text_snapshot (TEXT)                   │
│  ├── terms_accepted (BOOLEAN) & terms_accepted_at (TIMESTAMPTZ)        │
│  ├── requested_laptop_tier (LEVEL_1 | LEVEL_2)                         │
│  ├── repayment_period (1-2 Mo | 12 Mo | 24 Mo)                         │
│  ├── gm_reviewer_id, gm_comments, gm_signed_at                         │
│  ├── hr_reviewer_id, hr_comments, hr_signed_at, hr_checklist (JSONB)   │
│  ├── it_reviewer_id, asset_serial_number, deducted_monthly_amount       │
│  └── deduction_start_date, deduction_end_date                          │
│                                                                        │
│  application_timeline_events                                           │
│  ├── id (UUID)                                                         │
│  ├── application_id (FK -> purchase_applications)                      │
│  ├── actor_id, actor_name, actor_role                                  │
│  ├── action_type, from_status, to_status, comments                     │
│  └── created_at (TIMESTAMPTZ)                                          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Roadmap

1. **Backend Server Setup (`server.ts`)**:
   - Establish full-stack Node/Express server integrated with Vite middleware.
   - Define API route handlers matching each stage of the PRD lifecycle.
2. **Database Adapter & Migration**:
   - Initialize persistent storage schema and seed initial Educore campus records and benchmark applications.
   - Configure Row-Level Security rules preventing cross-school data leakage.
3. **Frontend API Client Integration**:
   - Update `AppContext` to synchronize state with `/api/*` endpoints with optimistic UI updates.
   - Maintain the instant Persona Switcher for interactive role-based testing.
4. **Verification & Testing**:
   - Verify full 4-stage lifecycle persistence across browser refreshes and role switches.
   - Run compilation and linting verification.
