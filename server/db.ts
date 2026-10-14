import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import {
  ApplicationStatus,
  ApplicationTimelineEvent,
  HRVettingChecklist,
  Institution,
  LaptopTier,
  PurchaseApplication,
  RepaymentPlan,
  User,
  UserRole,
} from '../src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: process.env.PGPORT ? Number.parseInt(process.env.PGPORT, 10) : 5432,
  database: process.env.PGDATABASE || 'educoreprovision',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || undefined,
});

// Helper to convert database snake_case row to TypeScript PurchaseApplication
function mapApplicationRow(row: any): PurchaseApplication {
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    applicantId: row.applicant_id,
    institutionId: row.institution_id,
    status: row.status as ApplicationStatus,
    policyVersionTag: row.policy_version_tag || 'v1.0-2026',
    legalTextSnapshot: row.legal_text_snapshot,
    termsAccepted: row.terms_accepted,
    termsAcceptedAt: row.terms_accepted_at ? new Date(row.terms_accepted_at).toISOString() : undefined,
    applicantIpAddress: row.applicant_ip_address,
    applicantUserAgent: row.applicant_user_agent,
    requestedLaptopTier: row.requested_laptop_tier as LaptopTier,
    repaymentPeriod: row.repayment_period as RepaymentPlan,
    estimatedMonthlyAmountZmw: Number.parseFloat(row.estimated_monthly_amount_zmw),
    applicantSignedAt: row.applicant_signed_at ? new Date(row.applicant_signed_at).toISOString() : undefined,
    applicantDigitalSignature: row.applicant_digital_signature,
    gmReviewerId: row.gm_reviewer_id,
    gmReviewerName: row.gm_reviewer_name,
    gmComments: row.gm_comments,
    gmSignedAt: row.gm_signed_at ? new Date(row.gm_signed_at).toISOString() : undefined,
    gmDigitalSignature: row.gm_digital_signature,
    hrReviewerId: row.hr_reviewer_id,
    hrReviewerName: row.hr_reviewer_name,
    hrComments: row.hr_comments,
    hrSignedAt: row.hr_signed_at ? new Date(row.hr_signed_at).toISOString() : undefined,
    hrChecklist: row.hr_vetting_checklist as HRVettingChecklist,
    hrDigitalSignature: row.hr_digital_signature,
    itReviewerId: row.it_reviewer_id,
    itReviewerName: row.it_reviewer_name,
    assetSerialNumber: row.asset_serial_number,
    deductedMonthlyAmount: row.deducted_monthly_amount_zmw ? Number.parseFloat(row.deducted_monthly_amount_zmw) : undefined,
    deductionStartDate: row.deduction_start_date
      ? (row.deduction_start_date instanceof Date
          ? `${row.deduction_start_date.getFullYear()}-${String(row.deduction_start_date.getMonth() + 1).padStart(2, '0')}`
          : String(row.deduction_start_date).slice(0, 7))
      : undefined,
    deductionEndDate: row.deduction_end_date
      ? (row.deduction_end_date instanceof Date
          ? `${row.deduction_end_date.getFullYear()}-${String(row.deduction_end_date.getMonth() + 1).padStart(2, '0')}`
          : String(row.deduction_end_date).slice(0, 7))
      : undefined,
    itComments: row.it_comments,
    itSignedAt: row.it_signed_at ? new Date(row.it_signed_at).toISOString() : undefined,
    itDigitalSignature: row.it_digital_signature,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

// Helper to convert database snake_case row to TypeScript ApplicationTimelineEvent
function mapTimelineRow(row: any): ApplicationTimelineEvent {
  return {
    id: row.id,
    applicationId: row.application_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    actionType: row.action_type,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    comments: row.comments,
    isInternal: row.is_internal,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

// Helper to convert database snake_case row to TypeScript User
function mapUserRow(row: any): User {
  return {
    id: row.id,
    entraOid: row.entra_oid,
    employeeNumber: row.employee_number,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    institutionId: row.institution_id,
    department: row.department,
    jobTitle: row.job_title,
  };
}

// Helper to convert database snake_case row to TypeScript Institution
function mapInstitutionRow(row: any): Institution {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    location: row.location,
    isActive: row.is_active,
  };
}

export const dbService = {
  async initialize(): Promise<void> {
    console.log('[PostgreSQL] Initializing educoreprovision database connection...');
    const client = await pool.connect();
    try {
      // 1. Ensure educore_app non-superuser role exists for native RLS session enforcement
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'educore_app') THEN
            CREATE ROLE educore_app WITH LOGIN;
          END IF;
        END $$;
        GRANT USAGE ON SCHEMA public TO educore_app;
        GRANT ALL ON ALL TABLES IN SCHEMA public TO educore_app;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO educore_app;
        GRANT ALL ON ALL ROUTINES IN SCHEMA public TO educore_app;
      `);

      // 2. Check if tables exist
      const tableCheck = await client.query(`
        SELECT count(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name IN ('institutions', 'users', 'applications', 'approval_audit_logs');
      `);

      const tableCount = Number.parseInt(tableCheck.rows[0].count, 10);
      if (tableCount < 4) {
        console.log('[PostgreSQL] Applying migrations from /migrations ...');
        const m1 = fs.readFileSync(path.join(rootDir, 'migrations', '0001_core_schema.sql'), 'utf8');
        await client.query(m1);
        const m2 = fs.readFileSync(path.join(rootDir, 'migrations', '0002_row_level_security.sql'), 'utf8');
        await client.query(m2);
        const m3 = fs.readFileSync(path.join(rootDir, 'migrations', '0003_seed_data.sql'), 'utf8');
        await client.query(m3);
      }

      // 3. Ensure compatibility views matching PRD Section 5 exist
      await client.query(`
        DROP VIEW IF EXISTS purchase_applications CASCADE;
        CREATE VIEW purchase_applications WITH (security_invoker = true) AS 
        SELECT 
          a.id,
          a.reference_number,
          a.applicant_id,
          a.institution_id,
          a.status,
          a.policy_version_id,
          a.legal_text_snapshot,
          a.terms_accepted,
          a.terms_accepted_at,
          a.applicant_ip_address,
          a.applicant_user_agent,
          t.tier_code AS requested_laptop_tier,
          a.repayment_period,
          a.applicant_signed_at,
          a.gm_reviewer_id,
          a.gm_comments,
          a.gm_signed_at,
          a.hr_reviewer_id,
          a.hr_comments,
          a.hr_signed_at,
          a.it_reviewer_id,
          a.asset_serial_number,
          a.deducted_monthly_amount_zmw AS deducted_monthly_amount,
          a.deduction_start_date,
          a.deduction_end_date,
          a.it_comments,
          a.it_signed_at,
          a.created_at,
          a.updated_at
        FROM applications a
        JOIN equipment_tiers t ON a.equipment_tier_id = t.id;

        DROP VIEW IF EXISTS application_timeline_events CASCADE;
        CREATE VIEW application_timeline_events WITH (security_invoker = true) AS 
        SELECT 
          id,
          application_id,
          actor_id,
          action_type,
          from_status,
          to_status,
          comments,
          is_internal,
          metadata,
          created_at
        FROM approval_audit_logs;

        GRANT SELECT ON purchase_applications TO educore_app;
        GRANT SELECT ON application_timeline_events TO educore_app;
      `);

      // 4. Ensure latest RLS policies from 0002 are active
      const m2 = fs.readFileSync(path.join(rootDir, 'migrations', '0002_row_level_security.sql'), 'utf8');
      await client.query(m2);

      // 5. Ensure FORCE ROW LEVEL SECURITY is enabled for strict enforcement
      await client.query(`
        ALTER TABLE applications FORCE ROW LEVEL SECURITY;
        ALTER TABLE approval_audit_logs FORCE ROW LEVEL SECURITY;
      `);

      const userCountRes = await client.query('SELECT count(*) FROM users');
      const appCountRes = await client.query('SELECT count(*) FROM applications');
      console.log(`[PostgreSQL] Connected successfully to educoreprovision database. Users: ${userCountRes.rows[0].count}, Applications: ${appCountRes.rows[0].count}`);
    } catch (err) {
      console.error('[PostgreSQL] Initialization failed:', err);
      throw err;
    } finally {
      client.release();
    }
  },

  async getInstitutions(): Promise<Institution[]> {
    const res = await pool.query('SELECT * FROM institutions WHERE is_active = true ORDER BY name ASC');
    return res.rows.map(mapInstitutionRow);
  },

  async getUsers(): Promise<User[]> {
    const res = await pool.query('SELECT * FROM users WHERE is_active = true ORDER BY full_name ASC');
    return res.rows.map(mapUserRow);
  },

  async getUserById(id: string): Promise<User | undefined> {
    const res = await pool.query(
      `SELECT * FROM users 
       WHERE id::text = $1 
          OR entra_oid::text = $1 
          OR employee_number = $1 
          OR email = $1`,
      [id]
    );
    if (res.rows.length === 0) return undefined;
    return mapUserRow(res.rows[0]);
  },

  async upsertUserFromEntraClaims(claims: {
    entraOid: string;
    email: string;
    fullName: string;
    role?: UserRole;
    institutionCode?: string;
    employeeNumber?: string;
    department?: string;
    jobTitle?: string;
  }): Promise<User> {
    const existing = await pool.query(
      `SELECT * FROM users WHERE entra_oid::text = $1 OR email = $2`,
      [claims.entraOid, claims.email]
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      const updatedRole = claims.role || user.role;
      const updatedRes = await pool.query(
        `UPDATE users 
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
      return mapUserRow(updatedRes.rows[0]);
    }

    let instId: string;
    if (claims.institutionCode) {
      const instRes = await pool.query(`SELECT id FROM institutions WHERE code = $1`, [claims.institutionCode]);
      if (instRes.rows.length > 0) {
        instId = instRes.rows[0].id;
      } else {
        const firstInst = await pool.query(`SELECT id FROM institutions WHERE is_active = true LIMIT 1`);
        instId = firstInst.rows[0].id;
      }
    } else {
      const firstInst = await pool.query(`SELECT id FROM institutions WHERE is_active = true LIMIT 1`);
      instId = firstInst.rows[0].id;
    }

    const empNum = claims.employeeNumber || `EDC-${Math.floor(1000 + Math.random() * 9000)}`;

    const insertRes = await pool.query(
      `INSERT INTO users (entra_oid, institution_id, employee_number, full_name, email, role, department, job_title, is_active)
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

    return mapUserRow(insertRes.rows[0]);
  },

  // PostgreSQL Native Row-Level Security (RLS) query based on request.jwt.claim.sub
  async getApplications(actorUser?: User): Promise<PurchaseApplication[]> {
    const client = await pool.connect();
    try {
      if (actorUser) {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE educore_app');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${actorUser.entraOid}'`);
      }

      const res = await client.query(`
        SELECT a.*, 
               t.tier_code as requested_laptop_tier,
               p.version_tag as policy_version_tag
        FROM applications a
        JOIN equipment_tiers t ON a.equipment_tier_id = t.id
        JOIN policy_versions p ON a.policy_version_id = p.id
        ORDER BY a.created_at DESC
      `);

      if (actorUser) {
        await client.query('COMMIT');
      }

      // Defense-in-depth application layer filter
      let apps = res.rows.map(mapApplicationRow);
      if (actorUser) {
        if (actorUser.role === 'APPLICANT') {
          apps = apps.filter((a) => a.applicantId === actorUser.id);
        } else if (actorUser.role === 'HEAD_TEACHER') {
          apps = apps.filter((a) => a.institutionId === actorUser.institutionId);
        }
      }
      return apps;
    } catch (err) {
      if (actorUser) {
        try { await client.query('ROLLBACK'); } catch {}
      }
      throw err;
    } finally {
      try { await client.query('RESET ROLE'); } catch {}
      client.release();
    }
  },

  async getApplicationById(id: string, actorUser?: User): Promise<PurchaseApplication | undefined> {
    const client = await pool.connect();
    try {
      if (actorUser) {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE educore_app');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${actorUser.entraOid}'`);
      }

      const res = await client.query(
        `SELECT a.*, 
                t.tier_code as requested_laptop_tier,
                p.version_tag as policy_version_tag
         FROM applications a
         JOIN equipment_tiers t ON a.equipment_tier_id = t.id
         JOIN policy_versions p ON a.policy_version_id = p.id
         WHERE a.id::text = $1 OR a.reference_number = $1`,
        [id]
      );

      if (actorUser) {
        await client.query('COMMIT');
      }

      if (res.rows.length === 0) return undefined;
      const app = mapApplicationRow(res.rows[0]);

      // Defense in depth RLS check
      if (actorUser) {
        if (actorUser.role === 'APPLICANT' && app.applicantId !== actorUser.id) {
          return undefined; // RLS Denied
        }
        if (actorUser.role === 'HEAD_TEACHER' && app.institutionId !== actorUser.institutionId) {
          return undefined; // RLS Denied
        }
      }

      return app;
    } catch (err) {
      if (actorUser) {
        try { await client.query('ROLLBACK'); } catch {}
      }
      throw err;
    } finally {
      try { await client.query('RESET ROLE'); } catch {}
      client.release();
    }
  },

  async getTimelineForApplication(applicationId: string, actorUser?: User): Promise<ApplicationTimelineEvent[]> {
    const client = await pool.connect();
    try {
      if (actorUser) {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE educore_app');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${actorUser.entraOid}'`);
      }

      const res = await client.query(
        `SELECT * FROM approval_audit_logs 
         WHERE application_id::text = $1 
         ORDER BY created_at ASC`,
        [applicationId]
      );

      if (actorUser) {
        await client.query('COMMIT');
      }

      let events = res.rows.map(mapTimelineRow);
      // RLS: Hide internal review notes from applicants
      if (actorUser?.role === 'APPLICANT') {
        events = events.filter((e) => !e.isInternal);
      }
      return events;
    } catch (err) {
      if (actorUser) {
        try { await client.query('ROLLBACK'); } catch {}
      }
      throw err;
    } finally {
      try { await client.query('RESET ROLE'); } catch {}
      client.release();
    }
  },

  async getAllTimelineEvents(actorUser?: User): Promise<ApplicationTimelineEvent[]> {
    const client = await pool.connect();
    try {
      if (actorUser) {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE educore_app');
        await client.query(`SET LOCAL request.jwt.claim.sub = '${actorUser.entraOid}'`);
      }

      const res = await client.query(`
        SELECT l.* 
        FROM approval_audit_logs l
        JOIN applications a ON l.application_id = a.id
        ORDER BY l.created_at ASC
      `);

      if (actorUser) {
        await client.query('COMMIT');
      }

      let events = res.rows.map(mapTimelineRow);
      if (actorUser?.role === 'APPLICANT') {
        events = events.filter((e) => !e.isInternal);
      }
      return events;
    } catch (err) {
      if (actorUser) {
        try { await client.query('ROLLBACK'); } catch {}
      }
      throw err;
    } finally {
      try { await client.query('RESET ROLE'); } catch {}
      client.release();
    }
  },

  async submitPart1(
    actorUser: User,
    params: {
      tier: LaptopTier;
      repaymentPeriod: RepaymentPlan;
      estimatedMonthlyAmount: number;
      termsAccepted: boolean;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{ success: boolean; application?: PurchaseApplication; error?: string }> {
    if (!params.termsAccepted) {
      return { success: false, error: 'You must accept the legal terms and payroll deduction mandate.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE educore_app');
      await client.query(`SET LOCAL request.jwt.claim.sub = '${actorUser.entraOid}'`);

      // Check for in-flight active applications for this applicant
      const activeRes = await client.query(
        `SELECT id, reference_number, status FROM applications 
         WHERE applicant_id = $1 
           AND status IN ('PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF', 'REVISION_REQUIRED')`,
        [actorUser.id]
      );

      if (activeRes.rows.length > 0) {
        await client.query('ROLLBACK');
        const activeApp = activeRes.rows[0];
        const msg = activeApp.status === 'REVISION_REQUIRED'
          ? `You have an application requiring revision (${activeApp.reference_number}). Please withdraw it before submitting a new request.`
          : `You already have an active request in review (${activeApp.reference_number}). Only one in-flight application is permitted.`;
        return {
          success: false,
          error: msg,
        };
      }

      // Lookup equipment tier UUID
      const tierRes = await client.query(
        'SELECT id FROM equipment_tiers WHERE tier_code = $1',
        [params.tier]
      );
      if (tierRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: `Invalid hardware tier: ${params.tier}` };
      }
      const tierId = tierRes.rows[0].id;

      // Lookup active policy version
      const policyRes = await client.query(
        'SELECT id, version_tag, legal_text FROM policy_versions WHERE is_active = true ORDER BY effective_date DESC LIMIT 1'
      );
      if (policyRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Active policy version not found in database.' };
      }
      const policyId = policyRes.rows[0].id;
      const policyText = policyRes.rows[0].legal_text;

      const timestamp = new Date().toISOString();
      const digitalSig = `SIG-${actorUser.fullName.split(' ')[0].toUpperCase()}-${actorUser.id.slice(0, 8)}-${Date.now()}`;

      // Insert new application
      const insertAppRes = await client.query(
        `INSERT INTO applications (
           applicant_id, institution_id, status,
           policy_version_id, legal_text_snapshot,
           terms_accepted, terms_accepted_at,
           applicant_ip_address, applicant_user_agent,
           equipment_tier_id, repayment_period, estimated_monthly_amount_zmw,
           applicant_signed_at, applicant_digital_signature,
           created_at, updated_at
         ) VALUES (
           $1, $2, 'PENDING_GM_REVIEW',
           $3, $4,
           true, $5,
           $6, $7,
           $8, $9, $10,
           $5, $11,
           $5, $5
         ) RETURNING *`,
        [
          actorUser.id,
          actorUser.institutionId,
          policyId,
          policyText,
          timestamp,
          params.ipAddress || '196.220.124.45',
          params.userAgent || 'Educore Portal Client',
          tierId,
          params.repaymentPeriod,
          params.estimatedMonthlyAmount,
          digitalSig,
        ]
      );

      const createdRow = insertAppRes.rows[0];

      // Insert audit timeline log
      await client.query(
        `INSERT INTO approval_audit_logs (
           application_id, actor_id, actor_name, actor_role,
           action_type, from_status, to_status,
           comments, is_internal, created_at
         ) VALUES (
           $1, $2, $3, $4,
           'SUBMITTED_PART_1', 'DRAFT', 'PENDING_GM_REVIEW',
           $5, false, $6
         )`,
        [
          createdRow.id,
          actorUser.id,
          actorUser.fullName,
          actorUser.role,
          `Submitted Part 1 request for ${params.tier} (${params.repaymentPeriod}) with verified legal agreement.`,
          timestamp,
        ]
      );

      await client.query('COMMIT');

      // Fetch complete joined application
      createdRow.requested_laptop_tier = params.tier;
      createdRow.policy_version_tag = policyRes.rows[0].version_tag;
      const app = mapApplicationRow(createdRow);

      return { success: true, application: app };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] submitPart1 error:', err);
      return { success: false, error: err.message };
    } finally {
      try { await client.query('RESET ROLE'); } catch {}
      client.release();
    }
  },

  async endorsePart2(
    actorUser: User,
    applicationId: string,
    comments: string,
    actionType: 'ENDORSE' | 'REVISION' | 'REJECT'
  ): Promise<{ success: boolean; application?: PurchaseApplication; error?: string }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE educore_app');
      await client.query(`SET LOCAL request.jwt.claim.sub = '${actorUser.entraOid}'`);

      const appRes = await client.query(
        'SELECT * FROM applications WHERE id::text = $1 OR reference_number = $1',
        [applicationId]
      );
      if (appRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Application not found or RLS access denied.' };
      }
      const app = appRes.rows[0];

      if (app.status !== 'PENDING_GM_REVIEW') {
        await client.query('ROLLBACK');
        return { success: false, error: 'Application is not in PENDING_GM_REVIEW state.' };
      }

      if (actorUser.role !== 'HEAD_TEACHER' && actorUser.role !== 'SUPER_ADMIN') {
        await client.query('ROLLBACK');
        return { success: false, error: 'Unauthorized: Only Head Teachers can endorse Part 2.' };
      }

      if (actorUser.role === 'HEAD_TEACHER' && app.institution_id !== actorUser.institutionId) {
        await client.query('ROLLBACK');
        return { success: false, error: 'RLS Violation: You can only endorse applications from your assigned school.' };
      }

      const timestamp = new Date().toISOString();
      let toStatus: ApplicationStatus = 'PENDING_HR_REVIEW';
      let actionLabel = 'ENDORSED_PART_2';

      if (actionType === 'REVISION') {
        toStatus = 'REVISION_REQUIRED';
        actionLabel = 'REVISION_REQUESTED';
      } else if (actionType === 'REJECT') {
        toStatus = 'REJECTED';
        actionLabel = 'REJECTED_PART_2';
      }

      const digitalSig = `SIG-${actorUser.fullName.split(' ')[0].toUpperCase()}-${actorUser.id.slice(0, 8)}-${Date.now()}`;

      const updateRes = await client.query(
        `UPDATE applications SET
           status = $1,
           gm_reviewer_id = $2,
           gm_reviewer_name = $3,
           gm_comments = $4,
           gm_signed_at = $5,
           gm_digital_signature = $6,
           updated_at = $5
         WHERE id = $7
         RETURNING *`,
        [
          toStatus,
          actorUser.id,
          actorUser.fullName,
          comments || 'Endorsed by School Head Teacher / General Manager.',
          timestamp,
          digitalSig,
          app.id,
        ]
      );

      await client.query(
        `INSERT INTO approval_audit_logs (
           application_id, actor_id, actor_name, actor_role,
           action_type, from_status, to_status,
           comments, is_internal, created_at
         ) VALUES (
           $1, $2, $3, $4,
           $5, 'PENDING_GM_REVIEW', $6,
           $7, false, $8
         )`,
        [
          app.id,
          actorUser.id,
          actorUser.fullName,
          actorUser.role,
          actionLabel,
          toStatus,
          comments || 'Endorsed by Campus General Manager / Head Teacher.',
          timestamp,
        ]
      );

      await client.query('COMMIT');

      const updatedApp = await this.getApplicationById(app.id, actorUser);
      return { success: true, application: updatedApp };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] endorsePart2 error:', err);
      return { success: false, error: err.message };
    } finally {
      try { await client.query('RESET ROLE'); } catch {}
      client.release();
    }
  },

  async clearPart3(
    actorUser: User,
    applicationId: string,
    params: {
      checklist?: HRVettingChecklist;
      comments: string;
      isRejecting: boolean;
    }
  ): Promise<{ success: boolean; application?: PurchaseApplication; error?: string }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE educore_app');
      await client.query(`SET LOCAL request.jwt.claim.sub = '${actorUser.entraOid}'`);

      const appRes = await client.query(
        'SELECT * FROM applications WHERE id::text = $1 OR reference_number = $1',
        [applicationId]
      );
      if (appRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Application not found or RLS access denied.' };
      }
      const app = appRes.rows[0];

      if (app.status !== 'PENDING_HR_REVIEW') {
        await client.query('ROLLBACK');
        return { success: false, error: 'Application is not in PENDING_HR_REVIEW state.' };
      }

      if (actorUser.role !== 'HR_MANAGER' && actorUser.role !== 'SUPER_ADMIN') {
        await client.query('ROLLBACK');
        return { success: false, error: 'Unauthorized: Only Central HR Managers can clear Part 3.' };
      }

      const timestamp = new Date().toISOString();
      const toStatus: ApplicationStatus = params.isRejecting ? 'REJECTED' : 'PENDING_IT_SIGNOFF';
      const actionLabel = params.isRejecting ? 'REJECTED_PART_3' : 'CLEARED_PART_3';
      const digitalSig = `SIG-${actorUser.fullName.split(' ')[0].toUpperCase()}-${actorUser.id.slice(0, 8)}-${Date.now()}`;

      await client.query(
        `UPDATE applications SET
           status = $1,
           hr_reviewer_id = $2,
           hr_reviewer_name = $3,
           hr_comments = $4,
           hr_signed_at = $5,
           hr_vetting_checklist = $6::jsonb,
           hr_digital_signature = $7,
           updated_at = $5
         WHERE id = $8`,
        [
          toStatus,
          actorUser.id,
          actorUser.fullName,
          params.comments || 'All statutory HR criteria verified.',
          timestamp,
          JSON.stringify(params.checklist || {}),
          digitalSig,
          app.id,
        ]
      );

      await client.query(
        `INSERT INTO approval_audit_logs (
           application_id, actor_id, actor_name, actor_role,
           action_type, from_status, to_status,
           comments, is_internal, created_at
         ) VALUES (
           $1, $2, $3, $4,
           $5, 'PENDING_HR_REVIEW', $6,
           $7, false, $8
         )`,
        [
          app.id,
          actorUser.id,
          actorUser.fullName,
          actorUser.role,
          actionLabel,
          toStatus,
          params.comments || 'HR clearance completed: Debt ratio under 33% verified.',
          timestamp,
        ]
      );

      await client.query('COMMIT');

      const updatedApp = await this.getApplicationById(app.id, actorUser);
      return { success: true, application: updatedApp };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] clearPart3 error:', err);
      return { success: false, error: err.message };
    } finally {
      try { await client.query('RESET ROLE'); } catch {}
      client.release();
    }
  },

  async signoffPart4(
    actorUser: User,
    applicationId: string,
    params: {
      serialNumber?: string;
      monthlyAmount?: number;
      startDate?: string;
      endDate?: string;
      comments: string;
      isRejecting: boolean;
    }
  ): Promise<{ success: boolean; application?: PurchaseApplication; error?: string }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE educore_app');
      await client.query(`SET LOCAL request.jwt.claim.sub = '${actorUser.entraOid}'`);

      const appRes = await client.query(
        'SELECT * FROM applications WHERE id::text = $1 OR reference_number = $1',
        [applicationId]
      );
      if (appRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Application not found or RLS access denied.' };
      }
      const app = appRes.rows[0];

      if (app.status !== 'PENDING_IT_SIGNOFF') {
        await client.query('ROLLBACK');
        return { success: false, error: 'Application is not in PENDING_IT_SIGNOFF state.' };
      }

      if (actorUser.role !== 'IT_MANAGER' && actorUser.role !== 'SUPER_ADMIN') {
        await client.query('ROLLBACK');
        return { success: false, error: 'Unauthorized: Only Central ICT Managers can sign off Part 4.' };
      }

      const timestamp = new Date().toISOString();
      const toStatus: ApplicationStatus = params.isRejecting ? 'REJECTED' : 'APPROVED';
      const actionLabel = params.isRejecting ? 'REJECTED_PART_4' : 'FINALIZED_PART_4';
      const digitalSig = `SIG-${actorUser.fullName.split(' ')[0].toUpperCase()}-${actorUser.id.slice(0, 8)}-${Date.now()}`;

      const finalMonthly = params.monthlyAmount !== undefined ? params.monthlyAmount : Number.parseFloat(app.estimated_monthly_amount_zmw);

      // Format start and end date to valid Postgres dates if passed as YYYY-MM
      const startDateVal = params.startDate ? (params.startDate.length === 7 ? `${params.startDate}-01` : params.startDate) : null;
      const endDateVal = params.endDate ? (params.endDate.length === 7 ? `${params.endDate}-28` : params.endDate) : null;

      await client.query(
        `UPDATE applications SET
           status = $1,
           it_reviewer_id = $2,
           it_reviewer_name = $3,
           asset_serial_number = $4,
           deducted_monthly_amount_zmw = $5,
           deduction_start_date = $6,
           deduction_end_date = $7,
           it_comments = $8,
           it_signed_at = $9,
           it_digital_signature = $10,
           updated_at = $9
         WHERE id = $11`,
        [
          toStatus,
          actorUser.id,
          actorUser.fullName,
          params.serialNumber || app.asset_serial_number,
          finalMonthly,
          startDateVal,
          endDateVal,
          params.comments || 'Asset tagged and verified.',
          timestamp,
          digitalSig,
          app.id,
        ]
      );

      const logComment = params.isRejecting
        ? params.comments
        : `Asset tagged (${params.serialNumber}). Deduction: ZMW ${finalMonthly.toFixed(2)}/mo (${params.startDate} to ${params.endDate}). Sealed document ready.`;

      await client.query(
        `INSERT INTO approval_audit_logs (
           application_id, actor_id, actor_name, actor_role,
           action_type, from_status, to_status,
           comments, is_internal, created_at
         ) VALUES (
           $1, $2, $3, $4,
           $5, 'PENDING_IT_SIGNOFF', $6,
           $7, false, $8
         )`,
        [
          app.id,
          actorUser.id,
          actorUser.fullName,
          actorUser.role,
          actionLabel,
          toStatus,
          logComment,
          timestamp,
        ]
      );

      await client.query('COMMIT');

      const updatedApp = await this.getApplicationById(app.id, actorUser);
      return { success: true, application: updatedApp };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] signoffPart4 error:', err);
      return { success: false, error: err.message };
    } finally {
      try { await client.query('RESET ROLE'); } catch {}
      client.release();
    }
  },

  async withdrawApplication(
    actorUser: User,
    applicationId: string
  ): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE educore_app');
      await client.query(`SET LOCAL request.jwt.claim.sub = '${actorUser.entraOid}'`);

      const appRes = await client.query(
        'SELECT * FROM applications WHERE id::text = $1 OR reference_number = $1',
        [applicationId]
      );
      if (appRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Application not found or RLS access denied.' };
      }
      const app = appRes.rows[0];

      if (app.applicant_id !== actorUser.id) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Unauthorized: You can only withdraw your own applications.' };
      }
      if (app.status !== 'PENDING_GM_REVIEW' && app.status !== 'REVISION_REQUIRED') {
        await client.query('ROLLBACK');
        return { success: false, error: 'Applications can only be withdrawn while in PENDING_GM_REVIEW or REVISION_REQUIRED.' };
      }

      const timestamp = new Date().toISOString();

      await client.query(
        `UPDATE applications SET status = 'CLOSED', updated_at = $1 WHERE id = $2`,
        [timestamp, app.id]
      );

      await client.query(
        `INSERT INTO approval_audit_logs (
           application_id, actor_id, actor_name, actor_role,
           action_type, from_status, to_status,
           comments, is_internal, created_at
         ) VALUES (
           $1, $2, $3, $4,
           'WITHDRAWN_BY_APPLICANT', $5, 'CLOSED',
           'Application withdrawn by applicant.', false, $6
         )`,
        [app.id, actorUser.id, actorUser.fullName, actorUser.role, app.status, timestamp]
      );

      await client.query('COMMIT');

      return { success: true };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] withdrawApplication error:', err);
      return { success: false, error: err.message };
    } finally {
      try { await client.query('RESET ROLE'); } catch {}
      client.release();
    }
  },

  async resetDatabase(): Promise<any> {
    const client = await pool.connect();
    try {
      console.log('[PostgreSQL] Resetting database to benchmark seed state...');
      await client.query('BEGIN');
      await client.query('DELETE FROM approval_audit_logs;');
      await client.query('DELETE FROM applications;');

      const m3 = fs.readFileSync(path.join(rootDir, 'migrations', '0003_seed_data.sql'), 'utf8');
      await client.query(m3);
      await client.query('COMMIT');

      const count = await client.query('SELECT count(*) FROM applications');
      return { applicationCount: Number.parseInt(count.rows[0].count, 10) };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] resetDatabase error:', err);
      throw err;
    } finally {
      client.release();
    }
  },
};
