import dotenv from 'dotenv';
import { Pool, PoolClient } from 'pg';
import { UserProfile } from '../src/types/index.ts';

dotenv.config();

// ============================================================================
// 1. CONNECTION POOL & TRANSACTIONAL RLS CONTEXT
// ============================================================================

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    : {
        host: process.env.PGHOST || '127.0.0.1',
        port: process.env.PGPORT ? Number.parseInt(process.env.PGPORT, 10) : 5432,
        database: process.env.PGDATABASE || 'educoreprovision',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

/**
 * Wraps any DB operation in a transaction and sets `request.jwt.claim.sub`
 * locally so PostgreSQL RLS policies (`current_auth_user_id()`) actually work
 * without leaking session state across pooled connections.
 */
export async function withRlsContext<T>(
  entraOid: string | null,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (entraOid) {
      // Switch from superuser to educore_app and bind JWT sub claim strictly to this transaction
      await client.query('SET LOCAL ROLE educore_app');
      await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [entraOid]);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// 2. TYPES & POLYMORPHIC PAYLOAD CONTRACTS (ALL 14 FORMS)
// ============================================================================

export type UserRole =
  | 'APPLICANT'
  | 'LINE_MANAGER'
  | 'HEAD_TEACHER'
  | 'HR_OFFICER'
  | 'HR_MANAGER'
  | 'IT_MANAGER'
  | 'FINANCE_MANAGER'
  | 'LOGISTICS_MANAGER'
  | 'EXECUTIVE_HEAD'
  | 'COO'
  | 'SUPER_ADMIN';

export type LifecycleStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED';

export type ApprovalStepStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISION_REQUESTED';

export type FormCode =
  | 'ICT_PURCHASE'
  | 'TRAVEL_REQUEST'
  | 'SALARY_ADVANCE'
  | 'PROF_DEV'
  | 'BANK_CHANGE'
  | 'CONTRACT_RENEWAL'
  | 'CHILD_ADMISSION'
  | 'EXCULPATORY'
  | 'GRATUITY_ADVANCE'
  | 'JOB_DESCRIPTION'
  | 'MANPOWER_REQ'
  | 'EVENT_COMPLETION'
  | 'STOCK_RETURN'
  | 'STORES_REQ'
  | 'EXPENSE_RETIREMENT'
  | 'PURCHASE_REQ'
  | 'DISCIPLINARY_CHARGE'
  | 'EDU_HEALTH_CLAIM';

export interface WorkflowPipelineStep {
  step_order: number;
  role: UserRole;
  label: string;
  site_scoped: boolean;
}

// Required payload keys per form so valid JSON hits Postgres
const REQUIRED_PAYLOAD_FIELDS: Record<FormCode, string[]> = {
  ICT_PURCHASE: ['equipment_tier_id', 'repayment_period', 'estimated_monthly_amount_zmw'],
  TRAVEL_REQUEST: [
    'cost_code',
    'contact_number',
    'site',
    'reason_for_travel',
    'passengers',
    'flight_booking_type',
  ],
  SALARY_ADVANCE: ['amount_requested_zmw', 'reason', 'position', 'requested_payment_date'],
  PROF_DEV: ['position', 'description', 'training_provider_location', 'total_costs_zmw'],
  BANK_CHANGE: ['dept_or_school', 'old_bank_name', 'old_account_number'],
  CONTRACT_RENEWAL: ['staff_name', 'position', 'contract_end_date', 'contract_to_be_renewed'],
  CHILD_ADMISSION: ['academic_year', 'children'],
  EXCULPATORY: ['accused_name', 'charging_officer_name', 'date_of_charge', 'employee_statement'],
  GRATUITY_ADVANCE: ['position', 'amount_requested_zmw', 'reason', 'contract_end_date'],
  JOB_DESCRIPTION: ['position', 'location', 'reports_to', 'mission'],
  MANPOWER_REQ: ['position_requested', 'number_of_staff_required', 'required_start_date', 'vacancy_type'],
  EVENT_COMPLETION: [
    'schools',
    'event_name',
    'event_type',
    'event_coordinator',
    'file_number',
    'file_open_date',
    'event_date',
  ],
  STOCK_RETURN: ['location', 'return_reason', 'items'],
  STORES_REQ: ['department', 'purpose', 'items'],
  EXPENSE_RETIREMENT: [
    'requisition_type',
    'cost_centre',
    'imprest_recipient',
    'currency',
    'amounts_requested',
  ],
  PURCHASE_REQ: [
    'cost_centre',
    'available_budget',
    'currency',
    'budget_type',
    'items',
  ],
  DISCIPLINARY_CHARGE: [
    'charging_officer_name',
    'charging_officer_position',
    'charging_school',
    'accused_name',
    'accused_position',
    'accused_man_no',
    'accused_dept_school',
    'date_of_charge',
    'nature_of_offence',
    'brief_account_of_offence',
    'show_cause_in_48_hours',
  ],
  EDU_HEALTH_CLAIM: [
    'employee_number',
    'patient_first_name',
    'patient_surname',
    'date_of_treatment',
    'hospital_name',
    'symptoms_and_treatment_details',
    'claim_items',
    'payment_method',
  ],
};

export function validateFormPayload(formCode: FormCode, payload: Record<string, any>): void {
  // Normalize fields between authentic document fields and legacy prototypes
  if (formCode === 'SALARY_ADVANCE') {
    if (payload.requested_amount_zmw && !payload.amount_requested_zmw) {
      payload.amount_requested_zmw = payload.requested_amount_zmw;
    }
    if (payload.amount_requested_zmw && !payload.requested_amount_zmw) {
      payload.requested_amount_zmw = payload.amount_requested_zmw;
    }
    if (!payload.position && payload.job_title) payload.position = payload.job_title;
    if (!payload.requested_payment_date) payload.requested_payment_date = new Date().toISOString().split('T')[0];
    if (!payload.proposed_instalment_zmw && payload.repayment_months && payload.amount_requested_zmw) {
      payload.proposed_instalment_zmw = Number((payload.amount_requested_zmw / payload.repayment_months).toFixed(2));
    }
  }

  if (formCode === 'GRATUITY_ADVANCE') {
    if (payload.requested_amount_zmw && !payload.amount_requested_zmw) {
      payload.amount_requested_zmw = payload.requested_amount_zmw;
    }
    if (payload.amount_requested_zmw && !payload.requested_amount_zmw) {
      payload.requested_amount_zmw = payload.amount_requested_zmw;
    }
    if (!payload.position && payload.job_title) payload.position = payload.job_title;
    if (!payload.contract_end_date && payload.contract_start_date) payload.contract_end_date = payload.contract_start_date;
  }

  if (formCode === 'PROF_DEV') {
    if (payload.course_title && !payload.description) payload.description = payload.course_title;
    if (payload.description && !payload.course_title) payload.course_title = payload.description;
    if (payload.provider && !payload.training_provider_location) payload.training_provider_location = payload.provider;
    if (payload.training_provider_location && !payload.provider) payload.provider = payload.training_provider_location;
    if (payload.cost_zmw && !payload.total_costs_zmw) payload.total_costs_zmw = payload.cost_zmw;
    if (payload.total_costs_zmw && !payload.cost_zmw) payload.cost_zmw = payload.total_costs_zmw;
    if (!payload.position && payload.job_title) payload.position = payload.job_title;
    if (payload.start_date && !payload.course_days_and_dates) payload.course_days_and_dates = payload.start_date;
  }

  if (formCode === 'BANK_CHANGE') {
    if (payload.dept_or_site && !payload.dept_or_school) payload.dept_or_school = payload.dept_or_site;
    if (payload.dept_or_school && !payload.dept_or_site) payload.dept_or_site = payload.dept_or_school;
    if (!payload.old_bank_name && payload.bank_name) payload.old_bank_name = payload.bank_name;
    if (!payload.old_account_number && payload.account_number) payload.old_account_number = payload.account_number;
  }

  if (formCode === 'CONTRACT_RENEWAL') {
    if (!payload.staff_name && payload.applicant_name) payload.staff_name = payload.applicant_name;
    if (!payload.position && payload.job_title) payload.position = payload.job_title;
    if (payload.current_contract_end_date && !payload.contract_end_date) {
      payload.contract_end_date = payload.current_contract_end_date;
    }
    if (payload.contract_end_date && !payload.current_contract_end_date) {
      payload.current_contract_end_date = payload.contract_end_date;
    }
    if (!payload.contract_to_be_renewed) payload.contract_to_be_renewed = 'YES';
  }

  if (formCode === 'EXCULPATORY') {
    if (!payload.accused_name && payload.applicant_name) payload.accused_name = payload.applicant_name;
    if (payload.charge_reference && !payload.offence_description) payload.offence_description = payload.charge_reference;
    if (payload.incident_date && !payload.date_of_charge) payload.date_of_charge = payload.incident_date;
    if (!payload.charging_officer_name) payload.charging_officer_name = 'Line Manager / Disciplinary Officer';
    if (!payload.accused_position && payload.job_title) payload.accused_position = payload.job_title;
  }

  if (formCode === 'JOB_DESCRIPTION') {
    if (payload.job_title && !payload.position) payload.position = payload.job_title;
    if (payload.position && !payload.job_title) payload.job_title = payload.position;
    if (!payload.location && payload.site) payload.location = payload.site;
    if (!payload.mission) payload.mission = payload.job_title || 'General Departmental Responsibilities';
    if (!payload.reports_to) payload.reports_to = 'Head of Department / Head Teacher';
  }

  if (formCode === 'MANPOWER_REQ') {
    if (payload.position_title && !payload.position_requested) payload.position_requested = payload.position_title;
    if (payload.position_requested && !payload.position_title) payload.position_title = payload.position_requested;
    if (payload.headcount && !payload.number_of_staff_required) payload.number_of_staff_required = payload.headcount;
    if (payload.number_of_staff_required && !payload.headcount) payload.headcount = payload.number_of_staff_required;
    if (payload.target_start_date && !payload.required_start_date) payload.required_start_date = payload.target_start_date;
    if (payload.required_start_date && !payload.target_start_date) payload.target_start_date = payload.required_start_date;
    if (!payload.vacancy_type) payload.vacancy_type = 'NEW_POSITION';
  }

  if (formCode === 'EVENT_COMPLETION') {
    if (payload.sites && !payload.schools) payload.schools = payload.sites;
    if (payload.schools && !payload.sites) payload.sites = payload.schools;
  }

  if (formCode === 'DISCIPLINARY_CHARGE') {
    if (payload.charging_site && !payload.charging_school) payload.charging_school = payload.charging_site;
    if (payload.charging_school && !payload.charging_site) payload.charging_site = payload.charging_school;
    if (payload.accused_dept_site && !payload.accused_dept_school) payload.accused_dept_school = payload.accused_dept_site;
    if (payload.accused_dept_school && !payload.accused_dept_site) payload.accused_dept_site = payload.accused_dept_school;
  }

  if (formCode === 'STORES_REQ') {
    if (payload.site && !payload.school) payload.school = payload.site;
    if (payload.school && !payload.site) payload.site = payload.school;
  }

  const required = REQUIRED_PAYLOAD_FIELDS[formCode];
  if (!required) {
    throw new Error(`Unknown form code: ${formCode}`);
  }

  const missing = required.filter(
    (key) => payload[key] === undefined || payload[key] === null || payload[key] === ''
  );
  if (missing.length > 0) {
    throw new Error(`Invalid payload for ${formCode}. Missing required fields: ${missing.join(', ')}`);
  }

  // Validate multi-child array for CHILD_ADMISSION
  if (formCode === 'CHILD_ADMISSION') {
    if (!Array.isArray(payload.children) || payload.children.length === 0) {
      throw new Error('At least one child must be added to the Child Admission form.');
    }
    payload.children.forEach((child: any, idx: number) => {
      if (!child.child_full_name || !child.date_of_birth || !child.target_site_id) {
        throw new Error(
          `Child #${idx + 1} is missing required fields (Name, Date of Birth, or Target Site).`
        );
      }
    });
  }

  // Validate line-item arrays for STORES_REQ & STOCK_RETURN
  if (formCode === 'STORES_REQ' || formCode === 'STOCK_RETURN') {
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error(`At least one line item is required for ${formCode}.`);
    }
  }

  if (formCode === 'TRAVEL_REQUEST') {
    if (!Array.isArray(payload.passengers) || payload.passengers.length === 0) {
      throw new Error('At least one passenger must be listed on the Travel Request Form.');
    }
    payload.passengers.forEach((p: any, idx: number) => {
      if (!p.surname || !p.first_name || !p.date_of_birth) {
        throw new Error(
          `Passenger #${idx + 1} is missing required ID details (Surname, First Name, or Date of Birth).`
        );
      }
    });
  }

  if (formCode === 'EDU_HEALTH_CLAIM') {
    if (!Array.isArray(payload.claim_items) || payload.claim_items.length === 0) {
      throw new Error('At least one expense/treatment row is required in Claim Details.');
    }
    if (!payload.confirm_true_and_correct || !payload.consent_medical_info_processing) {
      throw new Error('Both Section 4 medical consent and truthfulness declarations must be ticked.');
    }
    if (payload.payment_method === 'BANK_TRANSFER') {
      if (!payload.bank_name || !payload.account_holder_name || !payload.account_number) {
        throw new Error('Bank Name, Account Holder Name, and Account Number are required for Bank Transfer reimbursement.');
      }
    }
  }
}


// ============================================================================
// 3. CORE WORKFLOW ENGINE QUERIES
// ============================================================================

export interface CreateApplicationInput {
  entraOid: string;
  formCode: FormCode;
  submitImmediately: boolean;
  policyVersionId?: string | null;
  termsAccepted?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  digitalSignature?: string | null;
  payload: Record<string, unknown>;
}

/**
 * Creates a draft or immediately submits ANY of the 14 application forms.
 * Automatically resolves the first approver role from `form_definitions.workflow_pipeline`.
 */
export async function createApplication(input: CreateApplicationInput) {
  validateFormPayload(input.formCode, input.payload);

  return withRlsContext(input.entraOid, async (client) => {
    // 1. Resolve authenticated user
    const userRes = await client.query(
      `SELECT id, full_name, role, site_id FROM public.users WHERE entra_oid::text = $1 AND is_active = true`,
      [input.entraOid]
    );
    if (userRes.rowCount === 0) {
      throw new Error('Authenticated user not found or inactive.');
    }
    const applicant = userRes.rows[0];

    // 2. Resolve form definition & pipeline
    const formRes = await client.query(
      `SELECT id, code, requires_policy, workflow_pipeline FROM public.form_definitions WHERE code = $1 AND is_active = true`,
      [input.formCode]
    );
    if (formRes.rowCount === 0) {
      throw new Error(`Form definition ${input.formCode} not found or inactive.`);
    }
    const formDef = formRes.rows[0];
    const pipeline: WorkflowPipelineStep[] = formDef.workflow_pipeline;

    if (pipeline.length === 0) {
      throw new Error(`Form ${input.formCode} has no workflow pipeline configured.`);
    }

    // 3. Resolve policy snapshot if required
    let policyVersionId = input.policyVersionId ?? null;
    let legalTextSnapshot: string | null = null;

    if (formDef.requires_policy) {
      if (!input.termsAccepted && input.submitImmediately) {
        throw new Error(`Form ${input.formCode} requires policy acceptance before submission.`);
      }
      const policyRes = policyVersionId
        ? await client.query(`SELECT id, legal_text FROM public.policy_versions WHERE id = $1`, [policyVersionId])
        : await client.query(
            `SELECT id, legal_text FROM public.policy_versions 
             WHERE (form_definition_id = $1 OR form_definition_id IS NULL) AND is_active = true 
             ORDER BY effective_date DESC LIMIT 1`,
            [formDef.id]
          );

      if (policyRes.rowCount === 0) {
        throw new Error(`No active policy version found for ${input.formCode}.`);
      }
      policyVersionId = policyRes.rows[0].id;
      legalTextSnapshot = policyRes.rows[0].legal_text;
    }

    const firstStep = pipeline.find((s) => s.step_order === 1) ?? pipeline[0];
    const status: LifecycleStatus = input.submitImmediately ? 'IN_REVIEW' : 'DRAFT';
    const currentStepOrder = input.submitImmediately ? firstStep.step_order : null;
    const currentApproverRole = input.submitImmediately ? firstStep.role : null;
    const now = new Date().toISOString();

    // 4. Insert envelope (Triggers automatically generate reference_number and application_approvals rows)
    const appRes = await client.query(
      `INSERT INTO public.applications (
        form_definition_id,
        applicant_id,
        site_id,
        status,
        current_step_order,
        current_approver_role,
        policy_version_id,
        legal_text_snapshot,
        terms_accepted,
        terms_accepted_at,
        applicant_ip_address,
        applicant_user_agent,
        applicant_signed_at,
        applicant_digital_signature,
        payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        formDef.id,
        applicant.id,
        applicant.site_id,
        status,
        currentStepOrder,
        currentApproverRole,
        policyVersionId,
        legalTextSnapshot,
        Boolean(input.termsAccepted),
        input.termsAccepted ? now : null,
        input.ipAddress ?? null,
        input.userAgent ?? null,
        input.submitImmediately ? now : null,
        input.digitalSignature ?? applicant.full_name,
        JSON.stringify(input.payload),
      ]
    );

    const createdApp = appRes.rows[0];

    // 5. Write audit log
    await client.query(
      `INSERT INTO public.approval_audit_logs (
        application_id, actor_id, actor_name, actor_role, action_type, from_status, to_status, comments, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        createdApp.id,
        applicant.id,
        applicant.full_name,
        applicant.role,
        input.submitImmediately ? 'APPLICATION_SUBMITTED' : 'DRAFT_CREATED',
        null,
        status,
        input.submitImmediately ? `Submitted ${input.formCode} for ${firstStep.label}` : 'Saved as draft',
        JSON.stringify({ form_code: input.formCode }),
      ]
    );

    return createdApp;
  });
}

export interface ProcessApprovalInput {
  entraOid: string;
  applicationId: string;
  decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  comments?: string | null;
  digitalSignature?: string | null;
  checklistData?: Record<string, unknown>;
  stepMetadata?: Record<string, unknown>; // e.g., { asset_serial_number, deducted_monthly_amount_zmw, deduction_start_date, deduction_end_date }
}

/**
 * Single unified state machine that processes approvals for GM, HR, IT, Finance, and Logistics.
 * No role-specific SQL columns needed.
 */
export async function processApprovalStep(input: ProcessApprovalInput) {
  return withRlsContext(input.entraOid, async (client) => {
    // 1. Fetch actor and their assigned site code
    const actorRes = await client.query(
      `SELECT u.id, u.full_name, u.role, u.site_id, s.code AS site_code
         FROM public.users u
         JOIN public.sites s ON s.id = u.site_id
        WHERE u.entra_oid::text = $1 AND u.is_active = true`,
      [input.entraOid]
    );
    if (actorRes.rowCount === 0) {
      throw new Error('Reviewer not found or inactive.');
    }
    const actor = actorRes.rows[0];

    // 2. Lock the application row to prevent concurrent sign-off race conditions
    const appRes = await client.query(
      `SELECT * FROM public.applications WHERE id = $1 FOR UPDATE`,
      [input.applicationId]
    );
    if (appRes.rowCount === 0) {
      throw new Error('Application not found or access denied under least-privilege policy.');
    }
    const app = appRes.rows[0];

    if (app.status !== 'IN_REVIEW' || !app.current_step_order) {
      throw new Error(`Application ${app.reference_number} is currently ${app.status} and not awaiting review.`);
    }

    // 3. Fetch the active approval step
    const stepRes = await client.query(
      `SELECT * FROM public.application_approvals 
       WHERE application_id = $1 AND step_order = $2 FOR UPDATE`,
      [app.id, app.current_step_order]
    );
    if (stepRes.rowCount === 0) {
      throw new Error(`Active approval step ${app.current_step_order} not found.`);
    }
    const currentStep = stepRes.rows[0];

    // 4. Enforce Role & Strict Site Scope (Anti-Forgery & Governance Enforcement)
    // Higher-privilege oversight roles (e.g. SUPER_ADMIN) have read/audit oversight only,
    // and CANNOT sign off on steps that do not designate their specific role.
    if (actor.id === app.applicant_id) {
      throw new Error('Conflict of interest: Applicants cannot sign off on or approve their own applications.');
    }

    if (actor.role !== currentStep.required_role) {
      throw new Error(
        `Role ${actor.role} is not authorized to sign off on step requiring ${currentStep.required_role}. Oversight roles cannot act on approval steps that do not designate them.`
      );
    }

    if ((currentStep.site_scoped || actor.site_code !== 'CENTRAL') && actor.site_id !== app.site_id) {
      throw new Error('You can only sign off on applications belonging to your assigned site.');
    }

    // 5. Update current approval step
    await client.query(
      `UPDATE public.application_approvals
       SET status = $1,
           reviewer_id = $2,
           reviewer_name = $3,
           comments = $4,
           checklist_data = COALESCE($5, checklist_data),
           step_metadata = COALESCE($6, step_metadata),
           digital_signature = $7,
           signed_at = NOW(),
           updated_at = NOW()
       WHERE id = $8`,
      [
        input.decision,
        actor.id,
        actor.full_name,
        input.comments ?? null,
        input.checklistData ? JSON.stringify(input.checklistData) : null,
        input.stepMetadata ? JSON.stringify(input.stepMetadata) : null,
        input.digitalSignature ?? actor.full_name,
        currentStep.id,
      ]
    );

    // 6. Calculate next lifecycle state
    let nextAppStatus: LifecycleStatus = app.status;
    let nextStepOrder: number | null = null;
    let nextApproverRole: UserRole | null = null;

    if (input.decision === 'REJECTED') {
      nextAppStatus = 'REJECTED';
    } else if (input.decision === 'REVISION_REQUESTED') {
      nextAppStatus = 'REVISION_REQUIRED';
    } else if (input.decision === 'APPROVED') {
      // Check if there is a subsequent step in the pipeline
      const nextStepRes = await client.query(
        `SELECT step_order, required_role FROM public.application_approvals
         WHERE application_id = $1 AND step_order > $2
         ORDER BY step_order ASC LIMIT 1`,
        [app.id, currentStep.step_order]
      );

      if (nextStepRes.rowCount && nextStepRes.rowCount > 0) {
        nextAppStatus = 'IN_REVIEW';
        nextStepOrder = nextStepRes.rows[0].step_order;
        nextApproverRole = nextStepRes.rows[0].required_role;
      } else {
        // Final step completed
        nextAppStatus = 'APPROVED';
      }
    }

    // 7. Update envelope state
    const updatedAppRes = await client.query(
      `UPDATE public.applications
       SET status = $1,
           current_step_order = $2,
           current_approver_role = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [nextAppStatus, nextStepOrder, nextApproverRole, app.id]
    );

    if (!updatedAppRes.rowCount || updatedAppRes.rowCount === 0) {
      throw new Error(`Failed to update application envelope ${app.reference_number}. RLS permission denied or active step mismatch.`);
    }

    // 8. Append immutable audit log
    await client.query(
      `INSERT INTO public.approval_audit_logs (
        application_id, actor_id, actor_name, actor_role, action_type, from_status, to_status, comments, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        app.id,
        actor.id,
        actor.full_name,
        actor.role,
        `STEP_${currentStep.step_order}_${input.decision}`,
        app.status,
        nextAppStatus,
        input.comments ?? null,
        JSON.stringify({
          step_order: currentStep.step_order,
          step_label: currentStep.step_label,
          next_approver_role: nextApproverRole,
          ...(input.stepMetadata ?? {}),
        }),
      ]
    );

    return updatedAppRes.rows[0];
  });
}

/**
 * Allows the applicant to safely withdraw/cancel their own application
 * even while in-flight (DRAFT, IN_REVIEW, or REVISION_REQUIRED).
 * Executes through the secure stored procedure `public.withdraw_application`.
 */
export async function withdrawApplication(
  entraOid: string,
  applicationId: string,
  reason?: string
) {
  return withRlsContext(entraOid, async (client) => {
    const res = await client.query(
      `SELECT * FROM public.withdraw_application($1, $2)`,
      [applicationId, reason ?? null]
    );
    if (!res.rowCount || res.rowCount === 0) {
      throw new Error('Failed to withdraw application.');
    }
    return res.rows[0];
  });
}

// ============================================================================
// 4. GENERIC READ QUERIES (QUEUES, DETAILS, CATALOGS)
// ============================================================================

export async function getFormDefinitions(entraOid: string | null = null) {
  return withRlsContext(entraOid, async (client) => {
    const res = await client.query(
      `SELECT id, code, ref_prefix, department, title, requires_policy, workflow_pipeline
       FROM public.form_definitions
       WHERE is_active = true
       ORDER BY department, title`
    );
    return res.rows;
  });
}

export async function getApplicationsQueue(
  entraOid: string,
  filters?: {
    formCode?: FormCode;
    department?: string;
    status?: LifecycleStatus;
    awaitingMyRoleOnly?: boolean;
    scope?: 'MY_APPLICATIONS' | 'INVOLVED';
  }
) {
  return withRlsContext(entraOid, async (client) => {
    const params: unknown[] = [];
    // Defense-in-depth: explicitly enforce least-privilege & site-bound involvement alongside PostgreSQL RLS
    const conditions: string[] = [
      `public.is_user_involved_in_application(a.id, a.applicant_id, a.site_id, a.status)`,
    ];

    if (filters?.scope === 'MY_APPLICATIONS') {
      conditions.push(`a.applicant_id = public.current_auth_user_id()`);
    }
    if (filters?.formCode) {
      params.push(filters.formCode);
      conditions.push(`fd.code = $${params.length}`);
    }
    if (filters?.department) {
      params.push(filters.department);
      conditions.push(`fd.department = $${params.length}::public.department_code`);
    }
    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`a.status = $${params.length}::public.lifecycle_status`);
    }
    if (filters?.awaitingMyRoleOnly) {
      conditions.push(`a.status = 'IN_REVIEW' AND a.current_approver_role = public.current_auth_role()`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const res = await client.query(
      `SELECT 
         a.*,
         fd.code AS form_code,
         fd.title AS form_title,
         fd.department,
         u.full_name AS applicant_name,
         u.employee_number AS applicant_employee_number,
         u.email AS applicant_email,
         i.name AS site_name,
         i.code AS site_code,
         COALESCE(
           json_agg(
             json_build_object(
               'id', ap.id,
               'step_order', ap.step_order,
               'step_label', ap.step_label,
               'required_role', ap.required_role,
               'site_scoped', ap.site_scoped,
               'status', ap.status,
               'reviewer_name', ap.reviewer_name,
               'comments', ap.comments,
               'checklist_data', ap.checklist_data,
               'step_metadata', ap.step_metadata,
               'signed_at', ap.signed_at
             ) ORDER BY ap.step_order
           ) FILTER (WHERE ap.id IS NOT NULL),
           '[]'
         ) AS approvals
       FROM public.applications a
       JOIN public.form_definitions fd ON a.form_definition_id = fd.id
       JOIN public.users u ON a.applicant_id = u.id
       JOIN public.sites i ON a.site_id = i.id
       LEFT JOIN public.application_approvals ap ON ap.application_id = a.id
       ${whereClause}
       GROUP BY a.id, fd.code, fd.title, fd.department, u.full_name, u.employee_number, u.email, i.name, i.code
       ORDER BY a.created_at DESC`,
      params
    );

    return res.rows;
  });
}

// ============================================================================
// 5. LEGACY ICT PURCHASE ADAPTERS (KEEPS CURRENT FRONTEND WORKING)
// ============================================================================

/**
 * Reads from the backwards-compatible `purchase_applications` SQL view
 * so `ApplicantDashboard`, `HRQueueDashboard`, `ITProvisioningDashboard`, and `MasterSheetView`
 * continue working without immediate frontend rewrites.
 */
export async function getLegacyPurchaseApplications(entraOid: string) {
  return withRlsContext(entraOid, async (client) => {
    const res = await client.query(`SELECT * FROM public.purchase_applications ORDER BY created_at DESC`);
    return res.rows;
  });
}

export async function endorseIctApplicationByGM(
  entraOid: string,
  applicationId: string,
  decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
  comments?: string
) {
  return processApprovalStep({
    entraOid,
    applicationId,
    decision,
    comments,
  });
}

export async function clearIctApplicationByHR(
  entraOid: string,
  applicationId: string,
  decision: 'APPROVED' | 'REJECTED',
  comments?: string,
  vettingChecklist?: Record<string, boolean>
) {
  return processApprovalStep({
    entraOid,
    applicationId,
    decision,
    comments,
    checklistData: vettingChecklist,
  });
}

export async function signOffIctApplicationByIT(
  entraOid: string,
  applicationId: string,
  decision: 'APPROVED' | 'REJECTED',
  details: {
    assetSerialNumber?: string;
    deductedMonthlyAmountZmw?: number;
    deductionStartDate?: string;
    deductionEndDate?: string;
    comments?: string;
  }
) {
  return processApprovalStep({
    entraOid,
    applicationId,
    decision,
    comments: details.comments,
    stepMetadata: {
      asset_serial_number: details.assetSerialNumber,
      deducted_monthly_amount_zmw: details.deductedMonthlyAmountZmw,
      deduction_start_date: details.deductionStartDate,
      deduction_end_date: details.deductionEndDate,
    },
  });
}

// ============================================================================
// 6. MICROSOFT ENTRA ID CLAIMS SYNCHRONIZATION
// ============================================================================

export async function upsertUserFromEntraClaims(claims: {
  entraOid: string;
  email: string;
  fullName: string;
  role?: UserRole;
  siteCode?: string;
  institutionCode?: string;
  employeeNumber?: string;
  department?: string;
  jobTitle?: string;
}): Promise<UserProfile> {
  const existing = await pool.query(
    `SELECT u.*, i.name AS site_name, i.code AS site_code
     FROM public.users u
     JOIN public.sites i ON u.site_id = i.id
     WHERE u.entra_oid::text = $1 OR u.email = $2`,
    [claims.entraOid, claims.email]
  );

  if (existing.rows.length > 0) {
    const user = existing.rows[0];
    const updatedRole = claims.role || user.role;
    const updatedRes = await pool.query(
      `UPDATE public.users 
       SET full_name = $1, 
            role = $2, 
            entra_oid = $3,
            department = COALESCE($4, department),
            job_title = COALESCE($5, job_title),
            updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [claims.fullName || user.full_name, updatedRole, claims.entraOid, claims.department, claims.jobTitle, user.id]
    );
    return {
      ...updatedRes.rows[0],
      site_name: user.site_name,
      site_code: user.site_code,
    };
  }

  const requestedSiteCode = claims.siteCode || claims.institutionCode;
  let siteId: string;
  let siteName = 'Central Administration';
  let siteCode = 'CENTRAL';
  if (requestedSiteCode) {
    const siteRes = await pool.query(`SELECT id, name, code FROM public.sites WHERE code = $1`, [requestedSiteCode]);
    if (siteRes.rows.length > 0) {
      siteId = siteRes.rows[0].id;
      siteName = siteRes.rows[0].name;
      siteCode = siteRes.rows[0].code;
    } else {
      const firstSite = await pool.query(`SELECT id, name, code FROM public.sites WHERE is_active = true LIMIT 1`);
      siteId = firstSite.rows[0].id;
      siteName = firstSite.rows[0].name;
      siteCode = firstSite.rows[0].code;
    }
  } else {
    const firstSite = await pool.query(`SELECT id, name, code FROM public.sites WHERE is_active = true LIMIT 1`);
    siteId = firstSite.rows[0].id;
    siteName = firstSite.rows[0].name;
    siteCode = firstSite.rows[0].code;
  }

  const empNum = claims.employeeNumber || `EDC-${Math.floor(1000 + Math.random() * 9000)}`;

  const insertRes = await pool.query(
    `INSERT INTO public.users (entra_oid, site_id, employee_number, full_name, email, role, department, job_title, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     RETURNING *`,
    [
      claims.entraOid,
      siteId,
      empNum,
      claims.fullName,
      claims.email,
      claims.role || 'APPLICANT',
      claims.department || 'Academics',
      claims.jobTitle || 'Faculty Member',
    ]
  );

  return {
    ...insertRes.rows[0],
    site_name: siteName,
    site_code: siteCode,
  };
}