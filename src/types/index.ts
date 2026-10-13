export type UserRole =
  | 'APPLICANT'
  | 'HEAD_TEACHER'
  | 'HR_MANAGER'
  | 'IT_MANAGER'
  | 'SUPER_ADMIN';

export type ApplicationStatus =
  | 'DRAFT'
  | 'PENDING_GM_REVIEW'
  | 'PENDING_HR_REVIEW'
  | 'PENDING_IT_SIGNOFF'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED';

export type LaptopTier = 'LEVEL_1' | 'LEVEL_2';

export type RepaymentPlan = 'ONE_TO_TWO_MONTHS' | 'TWELVE_MONTHS' | 'TWENTY_FOUR_MONTHS';

export interface Institution {
  id: string;
  name: string;
  code: string;
  location: string;
  isActive: boolean;
}

export interface User {
  id: string;
  entraOid: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  role: UserRole;
  institutionId: string;
  department?: string;
  jobTitle?: string;
}

export interface LaptopConfig {
  tier: LaptopTier;
  title: string;
  subtitle: string;
  priceZmw: number;
  specs: {
    processor: string;
    ram: string;
    storage: string;
    display: string;
    graphics: string;
    warranty: string;
    recommendedFor: string;
  };
}

export interface HRVettingChecklist {
  probationCleared: boolean;
  zeroSalaryAdvanceConflicts: boolean;
  debtRatioWithinThreshold: boolean; // Educore max 33% debt ratio
  verifiedBy: string;
  verifiedAt: string;
}

export interface ApplicationTimelineEvent {
  id: string;
  applicationId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actionType: string;
  fromStatus?: ApplicationStatus;
  toStatus?: ApplicationStatus;
  comments?: string;
  isInternal: boolean;
  createdAt: string;
}

export interface PurchaseApplication {
  id: string;
  referenceNumber: string; // e.g., EDC-ICT-2026-0012
  applicantId: string;
  institutionId: string;
  status: ApplicationStatus;

  // Legal Acceptance (Screen 0)
  policyVersionTag: string;
  legalTextSnapshot: string;
  termsAccepted: boolean;
  termsAcceptedAt?: string;
  applicantIpAddress?: string;
  applicantUserAgent?: string;

  // Part 1: Applicant Choices
  requestedLaptopTier: LaptopTier;
  repaymentPeriod: RepaymentPlan;
  estimatedMonthlyAmountZmw: number;
  applicantSignedAt?: string;
  applicantDigitalSignature?: string; // SHA-like simulated authentication hash

  // Part 2: Head Teacher / GM Endorsement
  gmReviewerId?: string;
  gmReviewerName?: string;
  gmComments?: string;
  gmSignedAt?: string;
  gmDigitalSignature?: string;

  // Part 3: HR Clearance
  hrReviewerId?: string;
  hrReviewerName?: string;
  hrComments?: string;
  hrSignedAt?: string;
  hrChecklist?: HRVettingChecklist;
  hrDigitalSignature?: string;

  // Part 4: Central IT Provisioning
  itReviewerId?: string;
  itReviewerName?: string;
  assetSerialNumber?: string; // e.g. DELL-LAT-5540-0891
  deductedMonthlyAmount?: number;
  deductionStartDate?: string; // YYYY-MM
  deductionEndDate?: string;   // YYYY-MM
  itComments?: string;
  itSignedAt?: string;
  itDigitalSignature?: string;

  createdAt: string;
  updatedAt: string;
}
