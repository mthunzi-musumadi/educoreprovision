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
      // true = SET LOCAL (scoped strictly to this transaction)
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
  | 'PURCHASE_REQ';

export interface WorkflowPipelineStep {
  step_order: number;
  role: UserRole;
  label: string;
  institution_scoped: boolean;
}

// Required payload keys per form so rubbish JSON doesn't hit Postgres
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
  SALARY_ADVANCE: ['requested_amount_zmw', 'reason', 'repayment_months'],
  PROF_DEV: ['course_title', 'provider', 'cost_zmw', 'start_date'],
  BANK_CHANGE: ['bank_name', 'branch_name', 'account_number', 'account_type'],
  CONTRACT_RENEWAL: ['current_contract_end_date', 'proposed_tenure_months'],
  CHILD_ADMISSION: ['academic_year', 'children'], // ONLY root keys go here!
  EXCULPATORY: ['incident_date', 'charge_reference', 'employee_statement'],
  GRATUITY_ADVANCE: ['contract_start_date', 'accrued_months', 'requested_amount_zmw'],
  JOB_DESCRIPTION: ['job_title', 'department', 'key_responsibilities'],
  MANPOWER_REQ: ['position_title', 'department', 'headcount', 'justification'],
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
};

export function validateFormPayload(formCode: FormCode, payload: Record<string, any>): void {
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
      if (!child.child_full_name || !child.date_of_birth || !child.target_school_id) {
        throw new Error(
          `Child #${idx + 1} is missing required fields (Name, Date of Birth, or Target School).`
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
      `SELECT id, full_name, role, institution_id FROM public.users WHERE entra_oid = $1 AND is_active = true`,
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
        institution_id,
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
        applicant.institution_id,
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
    // 1. Fetch actor
    const actorRes = await client.query(
      `SELECT id, full_name, role, institution_id FROM public.users WHERE entra_oid = $1 AND is_active = true`,
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
      throw new Error('Application not found.');
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

    // 4. Enforce Role & Institution Scope
    if (actor.role !== 'SUPER_ADMIN') {
      if (actor.role !== currentStep.required_role) {
        throw new Error(`Role ${actor.role} cannot sign off on step requiring ${currentStep.required_role}.`);
      }
      if (currentStep.institution_scoped && actor.institution_id !== app.institution_id) {
        throw new Error('You can only sign off on applications belonging to your institution.');
      }
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
  filters?: { formCode?: FormCode; department?: string; status?: LifecycleStatus; awaitingMyRoleOnly?: boolean }
) {
  return withRlsContext(entraOid, async (client) => {
    const params: unknown[] = [];
    const conditions: string[] = [];

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
         i.name AS institution_name,
         COALESCE(
           json_agg(
             json_build_object(
               'id', ap.id,
               'step_order', ap.step_order,
               'step_label', ap.step_label,
               'required_role', ap.required_role,
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
       JOIN public.institutions i ON a.institution_id = i.id
       LEFT JOIN public.application_approvals ap ON ap.application_id = a.id
       ${whereClause}
       GROUP BY a.id, fd.code, fd.title, fd.department, u.full_name, u.employee_number, u.email, i.name
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
  institutionCode?: string;
  employeeNumber?: string;
  department?: string;
  jobTitle?: string;
}): Promise<UserProfile> {
  const existing = await pool.query(
    `SELECT u.*, i.name AS institution_name, i.code AS institution_code
     FROM public.users u
     JOIN public.institutions i ON u.institution_id = i.id
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
      institution_name: user.institution_name,
      institution_code: user.institution_code,
    };
  }

  let instId: string;
  let instName = 'Educore Services';
  let instCode = 'EDUCORE_SERVICES';
  if (claims.institutionCode) {
    const instRes = await pool.query(`SELECT id, name, code FROM public.institutions WHERE code = $1`, [claims.institutionCode]);
    if (instRes.rows.length > 0) {
      instId = instRes.rows[0].id;
      instName = instRes.rows[0].name;
      instCode = instRes.rows[0].code;
    } else {
      const firstInst = await pool.query(`SELECT id, name, code FROM public.institutions WHERE is_active = true LIMIT 1`);
      instId = firstInst.rows[0].id;
      instName = firstInst.rows[0].name;
      instCode = firstInst.rows[0].code;
    }
  } else {
    const firstInst = await pool.query(`SELECT id, name, code FROM public.institutions WHERE is_active = true LIMIT 1`);
    instId = firstInst.rows[0].id;
    instName = firstInst.rows[0].name;
    instCode = firstInst.rows[0].code;
  }

  const empNum = claims.employeeNumber || `EDC-${Math.floor(1000 + Math.random() * 9000)}`;

  const insertRes = await pool.query(
    `INSERT INTO public.users (entra_oid, institution_id, employee_number, full_name, email, role, department, job_title, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     RETURNING *`,
    [
      claims.entraOid,
      instId,
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
    institution_name: instName,
    institution_code: instCode,
  };
}