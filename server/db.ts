import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ApplicationStatus,
  ApplicationTimelineEvent,
  HRVettingChecklist,
  Institution,
  LaptopTier,
  PurchaseApplication,
  RepaymentPlan,
  User,
} from '../src/types/index.ts';
import {
  INITIAL_APPLICATIONS,
  INITIAL_TIMELINE,
  INSTITUTIONS,
  LAPTOP_CONFIGS,
  MOCK_USERS,
  VERBATIM_LEGAL_POLICY,
} from '../src/data/mockData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../.data');
const DB_FILE = path.resolve(DATA_DIR, 'educore_db.json');

interface DatabaseSchema {
  version: string;
  lastUpdated: string;
  institutions: Institution[];
  users: User[];
  applications: PurchaseApplication[];
  timelineEvents: ApplicationTimelineEvent[];
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDatabase(): DatabaseSchema {
  ensureDataDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data) as DatabaseSchema;
    } catch (err) {
      console.error('Failed to parse database file, falling back to initial seed data:', err);
    }
  }

  // Seed default data if database file does not exist
  const initialDb: DatabaseSchema = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    institutions: INSTITUTIONS,
    users: MOCK_USERS,
    applications: INITIAL_APPLICATIONS,
    timelineEvents: INITIAL_TIMELINE,
  };

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: DatabaseSchema) {
  ensureDataDir();
  db.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export const dbService = {
  getInstitutions(): Institution[] {
    const db = loadDatabase();
    return db.institutions;
  },

  getUsers(): User[] {
    const db = loadDatabase();
    return db.users;
  },

  getUserById(id: string): User | undefined {
    const db = loadDatabase();
    return db.users.find((u) => u.id === id);
  },

  // Enforces Row-Level Security (RLS) matching PostgreSQL Section 6 of PRD
  getApplications(actorUser?: User): PurchaseApplication[] {
    const db = loadDatabase();
    if (!actorUser) return db.applications;

    if (actorUser.role === 'APPLICANT') {
      return db.applications.filter((app) => app.applicantId === actorUser.id);
    }

    if (actorUser.role === 'HEAD_TEACHER') {
      return db.applications.filter((app) => app.institutionId === actorUser.institutionId);
    }

    // HR_MANAGER, IT_MANAGER, and SUPER_ADMIN have global visibility
    return db.applications;
  },

  getApplicationById(id: string, actorUser?: User): PurchaseApplication | undefined {
    const db = loadDatabase();
    const app = db.applications.find((a) => a.id === id);
    if (!app) return undefined;

    // Enforce RLS access check
    if (actorUser) {
      if (actorUser.role === 'APPLICANT' && app.applicantId !== actorUser.id) {
        return undefined; // RLS Denied
      }
      if (actorUser.role === 'HEAD_TEACHER' && app.institutionId !== actorUser.institutionId) {
        return undefined; // RLS Denied
      }
    }

    return app;
  },

  getTimelineForApplication(applicationId: string, actorUser?: User): ApplicationTimelineEvent[] {
    const db = loadDatabase();
    return db.timelineEvents
      .filter((t) => {
        if (t.applicationId !== applicationId) return false;
        // RLS: Hide internal review events from applicants
        if (actorUser?.role === 'APPLICANT' && t.isInternal) return false;
        return true;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  submitPart1(
    actorUser: User,
    params: {
      tier: LaptopTier;
      repaymentPeriod: RepaymentPlan;
      estimatedMonthlyAmount: number;
      termsAccepted: boolean;
      ipAddress?: string;
      userAgent?: string;
    }
  ): { success: boolean; application?: PurchaseApplication; error?: string } {
    if (!params.termsAccepted) {
      return { success: false, error: 'You must accept the legal terms and payroll deduction mandate.' };
    }

    const db = loadDatabase();

    // Check for in-flight applications for this applicant
    const existingActive = db.applications.find(
      (app) =>
        app.applicantId === actorUser.id &&
        ['PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF'].includes(app.status)
    );
    if (existingActive) {
      return {
        success: false,
        error: `You already have an active request in review (${existingActive.referenceNumber}). Only one in-flight application is permitted.`,
      };
    }

    const yearStr = new Date().getFullYear().toString();
    const countThisYear = db.applications.length + 1;
    const refNum = `EDC-ICT-${yearStr}-${countThisYear.toString().padStart(4, '0')}`;
    const appId = `app-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newApp: PurchaseApplication = {
      id: appId,
      referenceNumber: refNum,
      applicantId: actorUser.id,
      institutionId: actorUser.institutionId,
      status: 'PENDING_GM_REVIEW',
      policyVersionTag: 'v1.0-2026',
      legalTextSnapshot: VERBATIM_LEGAL_POLICY,
      termsAccepted: true,
      termsAcceptedAt: timestamp,
      applicantIpAddress: params.ipAddress || '196.220.124.45',
      applicantUserAgent: params.userAgent || 'Educore Portal Client',
      requestedLaptopTier: params.tier,
      repaymentPeriod: params.repaymentPeriod,
      estimatedMonthlyAmountZmw: params.estimatedMonthlyAmount,
      applicantSignedAt: timestamp,
      applicantDigitalSignature: `SIG-${actorUser.fullName.split(' ')[0].toUpperCase()}-${actorUser.id.slice(0, 8)}-${Date.now()}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.applications.unshift(newApp);

    // Record immutable audit event
    const newEvent: ApplicationTimelineEvent = {
      id: `time-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      applicationId: appId,
      actorId: actorUser.id,
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      actionType: 'SUBMITTED_PART_1',
      fromStatus: 'DRAFT',
      toStatus: 'PENDING_GM_REVIEW',
      comments: `Submitted request for ${LAPTOP_CONFIGS[params.tier].title} (${params.repaymentPeriod}) with verified legal agreement.`,
      isInternal: false,
      createdAt: timestamp,
    };
    db.timelineEvents.push(newEvent);

    saveDatabase(db);
    return { success: true, application: newApp };
  },

  endorsePart2(
    actorUser: User,
    applicationId: string,
    comments: string,
    actionType: 'ENDORSE' | 'REVISION' | 'REJECT'
  ): { success: boolean; application?: PurchaseApplication; error?: string } {
    const db = loadDatabase();
    const appIndex = db.applications.findIndex((a) => a.id === applicationId);
    if (appIndex === -1) return { success: false, error: 'Application not found.' };

    const app = db.applications[appIndex];
    if (app.status !== 'PENDING_GM_REVIEW') {
      return { success: false, error: 'Application is not in PENDING_GM_REVIEW state.' };
    }

    if (actorUser.role !== 'HEAD_TEACHER' && actorUser.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Only Head Teachers can endorse Part 2.' };
    }

    if (actorUser.role === 'HEAD_TEACHER' && app.institutionId !== actorUser.institutionId) {
      return { success: false, error: 'RLS Violation: You can only endorse applications from your school.' };
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

    const updatedApp: PurchaseApplication = {
      ...app,
      status: toStatus,
      gmReviewerId: actorUser.id,
      gmReviewerName: actorUser.fullName,
      gmComments: comments || 'Endorsed by School Head Teacher / General Manager.',
      gmSignedAt: timestamp,
      gmDigitalSignature: `SIG-${actorUser.fullName.split(' ')[0].toUpperCase()}-${actorUser.id.slice(0, 8)}-${Date.now()}`,
      updatedAt: timestamp,
    };

    db.applications[appIndex] = updatedApp;

    db.timelineEvents.push({
      id: `time-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      applicationId,
      actorId: actorUser.id,
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      actionType: actionLabel,
      fromStatus: 'PENDING_GM_REVIEW',
      toStatus,
      comments: comments || 'Endorsed by Campus General Manager / Head Teacher.',
      isInternal: false,
      createdAt: timestamp,
    });

    saveDatabase(db);
    return { success: true, application: updatedApp };
  },

  clearPart3(
    actorUser: User,
    applicationId: string,
    params: {
      checklist?: HRVettingChecklist;
      comments: string;
      isRejecting: boolean;
    }
  ): { success: boolean; application?: PurchaseApplication; error?: string } {
    const db = loadDatabase();
    const appIndex = db.applications.findIndex((a) => a.id === applicationId);
    if (appIndex === -1) return { success: false, error: 'Application not found.' };

    const app = db.applications[appIndex];
    if (app.status !== 'PENDING_HR_REVIEW') {
      return { success: false, error: 'Application is not in PENDING_HR_REVIEW state.' };
    }

    if (actorUser.role !== 'HR_MANAGER' && actorUser.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Only Central HR Managers can clear Part 3.' };
    }

    const timestamp = new Date().toISOString();
    const toStatus: ApplicationStatus = params.isRejecting ? 'REJECTED' : 'PENDING_IT_SIGNOFF';
    const actionLabel = params.isRejecting ? 'REJECTED_PART_3' : 'CLEARED_PART_3';

    const updatedApp: PurchaseApplication = {
      ...app,
      status: toStatus,
      hrReviewerId: actorUser.id,
      hrReviewerName: actorUser.fullName,
      hrComments: params.comments || 'All statutory HR criteria verified.',
      hrChecklist: params.checklist,
      hrSignedAt: timestamp,
      hrDigitalSignature: `SIG-${actorUser.fullName.split(' ')[0].toUpperCase()}-${actorUser.id.slice(0, 8)}-${Date.now()}`,
      updatedAt: timestamp,
    };

    db.applications[appIndex] = updatedApp;

    db.timelineEvents.push({
      id: `time-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      applicationId,
      actorId: actorUser.id,
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      actionType: actionLabel,
      fromStatus: 'PENDING_HR_REVIEW',
      toStatus,
      comments: params.comments || 'HR clearance completed: Debt ratio under 33% verified.',
      isInternal: false,
      createdAt: timestamp,
    });

    saveDatabase(db);
    return { success: true, application: updatedApp };
  },

  signoffPart4(
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
  ): { success: boolean; application?: PurchaseApplication; error?: string } {
    const db = loadDatabase();
    const appIndex = db.applications.findIndex((a) => a.id === applicationId);
    if (appIndex === -1) return { success: false, error: 'Application not found.' };

    const app = db.applications[appIndex];
    if (app.status !== 'PENDING_IT_SIGNOFF') {
      return { success: false, error: 'Application is not in PENDING_IT_SIGNOFF state.' };
    }

    if (actorUser.role !== 'IT_MANAGER' && actorUser.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Only Central ICT Managers can sign off Part 4.' };
    }

    const timestamp = new Date().toISOString();
    const toStatus: ApplicationStatus = params.isRejecting ? 'REJECTED' : 'APPROVED';
    const actionLabel = params.isRejecting ? 'REJECTED_PART_4' : 'FINALIZED_PART_4';

    const updatedApp: PurchaseApplication = {
      ...app,
      status: toStatus,
      itReviewerId: actorUser.id,
      itReviewerName: actorUser.fullName,
      assetSerialNumber: params.serialNumber || app.assetSerialNumber,
      deductedMonthlyAmount: params.monthlyAmount !== undefined ? params.monthlyAmount : app.estimatedMonthlyAmountZmw,
      deductionStartDate: params.startDate,
      deductionEndDate: params.endDate,
      itComments: params.comments || 'Asset tagged and verified.',
      itSignedAt: timestamp,
      itDigitalSignature: `SIG-${actorUser.fullName.split(' ')[0].toUpperCase()}-${actorUser.id.slice(0, 8)}-${Date.now()}`,
      updatedAt: timestamp,
    };

    db.applications[appIndex] = updatedApp;

    db.timelineEvents.push({
      id: `time-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      applicationId,
      actorId: actorUser.id,
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      actionType: actionLabel,
      fromStatus: 'PENDING_IT_SIGNOFF',
      toStatus,
      comments: params.isRejecting
        ? params.comments
        : `Asset tagged (${params.serialNumber}). Deduction: ZMW ${params.monthlyAmount?.toFixed(2)}/mo (${params.startDate} to ${params.endDate}). Sealed document ready.`,
      isInternal: false,
      createdAt: timestamp,
    });

    saveDatabase(db);
    return { success: true, application: updatedApp };
  },

  withdrawApplication(
    actorUser: User,
    applicationId: string
  ): { success: boolean; error?: string } {
    const db = loadDatabase();
    const appIndex = db.applications.findIndex((a) => a.id === applicationId);
    if (appIndex === -1) return { success: false, error: 'Application not found.' };

    const app = db.applications[appIndex];
    if (app.applicantId !== actorUser.id) {
      return { success: false, error: 'Unauthorized: You can only withdraw your own applications.' };
    }
    if (app.status !== 'PENDING_GM_REVIEW') {
      return { success: false, error: 'Applications can only be withdrawn while in PENDING_GM_REVIEW.' };
    }

    const timestamp = new Date().toISOString();
    app.status = 'CLOSED';
    app.updatedAt = timestamp;

    db.timelineEvents.push({
      id: `time-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      applicationId,
      actorId: actorUser.id,
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      actionType: 'WITHDRAWN_BY_APPLICANT',
      fromStatus: 'PENDING_GM_REVIEW',
      toStatus: 'CLOSED',
      comments: 'Application withdrawn by applicant.',
      isInternal: false,
      createdAt: timestamp,
    });

    saveDatabase(db);
    return { success: true };
  },

  resetDatabase(): DatabaseSchema {
    const resetDb: DatabaseSchema = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      institutions: INSTITUTIONS,
      users: MOCK_USERS,
      applications: INITIAL_APPLICATIONS,
      timelineEvents: INITIAL_TIMELINE,
    };
    saveDatabase(resetDb);
    return resetDb;
  },
};
