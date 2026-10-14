// ============================================================================
// 1. CORE ENUMS & ROLES
// ============================================================================

export type UserRole =
  | 'APPLICANT'
  | 'LINE_MANAGER'
  | 'HEAD_TEACHER'
  | 'HR_MANAGER'
  | 'IT_MANAGER'
  | 'FINANCE_MANAGER'
  | 'LOGISTICS_MANAGER'
  | 'SUPER_ADMIN';

export type DepartmentCode = 'IT' | 'HR' | 'FINANCE' | 'LOGISTICS';

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

// Legacy ICT status kept alive for existing ICT dashboard badges & filters
export type LegacyApplicationStatus =
  | 'DRAFT'
  | 'PENDING_GM_REVIEW'
  | 'PENDING_HR_REVIEW'
  | 'PENDING_IT_SIGNOFF'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED';

export type EquipmentTierCode = 'LEVEL_1' | 'LEVEL_2';

export type RepaymentPlan =
  | 'ONE_TO_TWO_MONTHS'
  | 'TWELVE_MONTHS'
  | 'TWENTY_FOUR_MONTHS';

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
  | 'STORES_REQ';

// ============================================================================
// 2. REFERENCE CATALOG ENTITIES
// ============================================================================

export interface Institution {
  id: string;
  code: string;
  name: string;
  location: string;
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  entra_oid: string;
  institution_id: string;
  institution_name?: string;
  institution_code?: string;
  employee_number: string;
  full_name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  job_title?: string | null;
  is_active: boolean;
}

export interface EquipmentTier {
  id: string;
  tier_code: EquipmentTierCode;
  title: string;
  subtitle: string;
  price_zmw: number;
  processor: string;
  ram: string;
  storage: string;
  display: string;
  graphics: string;
  warranty: string;
  target_audience?: string | null;
  is_active: boolean;
}

export interface PolicyVersion {
  id: string;
  form_definition_id?: string | null;
  version_tag: string;
  legal_text: string;
  effective_date: string;
  is_active: boolean;
}

export interface WorkflowPipelineStep {
  step_order: number;
  role: UserRole;
  label: string;
  institution_scoped: boolean;
}

export interface FormDefinition {
  id: string;
  code: FormCode;
  ref_prefix: string;
  department: DepartmentCode;
  title: string;
  requires_policy: boolean;
  workflow_pipeline: WorkflowPipelineStep[];
}

// ============================================================================
// 3. STRICT PAYLOAD CONTRACTS FOR ALL 14 FORMS
// ============================================================================

export interface IctPurchasePayload {
  equipment_tier_id: string;
  repayment_period: RepaymentPlan;
  estimated_monthly_amount_zmw: number;
}

export interface TravelRequestPayload {
  destination: string;
  departure_date: string;
  return_date: string;
  purpose: string;
  transport_mode?: 'VEHICLE' | 'FLIGHT' | 'BUS';
  accommodation_required?: boolean;
  estimated_cost_zmw?: number;
}

export interface SalaryAdvancePayload {
  requested_amount_zmw: number;
  reason: string;
  repayment_months: number;
  current_net_pay_zmw?: number;
}

export interface ProfDevPayload {
  course_title: string;
  provider: string;
  cost_zmw: number;
  start_date: string;
  end_date?: string;
  justification?: string;
}

export interface BankChangePayload {
  bank_name: string;
  branch_name: string;
  branch_code?: string;
  account_number: string;
  account_type: 'CURRENT' | 'SAVINGS';
  effective_payroll_month?: string;
}

export interface ContractRenewalPayload {
  current_contract_end_date: string;
  proposed_tenure_months: number;
  performance_summary?: string;
  recommended_by_head?: boolean;
}

export interface ChildAdmissionPayload {
  child_full_name: string;
  date_of_birth: string;
  target_school_id: string;
  year_group?: string;
  academic_year: string;
  fee_rebate_percentage?: number;
}

export interface ExculpatoryPayload {
  incident_date: string;
  charge_reference: string;
  allegation_summary?: string;
  employee_statement: string;
}

export interface GratuityAdvancePayload {
  contract_start_date: string;
  accrued_months: number;
  requested_amount_zmw: number;
  reason?: string;
}

export interface JobDescriptionPayload {
  job_title: string;
  department: string;
  reports_to?: string;
  key_responsibilities: string[];
}

export interface ManpowerReqPayload {
  position_title: string;
  department: string;
  headcount: number;
  employment_type?: 'PERMANENT' | 'FIXED_TERM' | 'TEMPORARY';
  justification: string;
  target_start_date?: string;
}

export interface EventCompletionPayload {
  event_name: string;
  event_date: string;
  total_budget_zmw: number;
  actual_spend_zmw: number;
  variance_notes?: string;
}

export interface StockReturnItem {
  item_code: string;
  description: string;
  qty: number;
  condition: 'GOOD' | 'DAMAGED' | 'EXPIRED';
}

export interface StockReturnPayload {
  items: StockReturnItem[];
  return_reason: string;
}

export interface StoresReqItem {
  item_code: string;
  description: string;
  qty_requested: number;
  unit?: string;
}

export interface StoresReqPayload {
  items: StoresReqItem[];
  cost_center: string;
  delivery_location?: string;
}

export interface FormPayloadMap {
  ICT_PURCHASE: IctPurchasePayload;
  TRAVEL_REQUEST: TravelRequestPayload;
  SALARY_ADVANCE: SalaryAdvancePayload;
  PROF_DEV: ProfDevPayload;
  BANK_CHANGE: BankChangePayload;
  CONTRACT_RENEWAL: ContractRenewalPayload;
  CHILD_ADMISSION: ChildAdmissionPayload;
  EXCULPATORY: ExculpatoryPayload;
  GRATUITY_ADVANCE: GratuityAdvancePayload;
  JOB_DESCRIPTION: JobDescriptionPayload;
  MANPOWER_REQ: ManpowerReqPayload;
  EVENT_COMPLETION: EventCompletionPayload;
  STOCK_RETURN: StockReturnPayload;
  STORES_REQ: StoresReqPayload;
}

// ============================================================================
// 4. GENERIC WORKFLOW ENVELOPE & APPROVALS
// ============================================================================

export interface ApplicationApprovalStep {
  id: string;
  application_id: string;
  step_order: number;
  step_label: string;
  required_role: UserRole;
  institution_scoped: boolean;
  status: ApprovalStepStatus;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  comments?: string | null;
  checklist_data?: Record<string, boolean>;
  step_metadata?: Record<string, unknown>;
  digital_signature?: string | null;
  signed_at?: string | null;
}

export interface TimelineEvent {
  id: string;
  application_id: string;
  actor_id: string;
  action_type: string;
  from_status: LifecycleStatus | null;
  to_status: LifecycleStatus;
  comments?: string | null;
  is_internal: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowApplication<K extends FormCode = FormCode> {
  id: string;
  reference_number: string;
  form_definition_id: string;
  form_code: K;
  form_title: string;
  department: DepartmentCode;
  applicant_id: string;
  applicant_name: string;
  applicant_employee_number: string;
  applicant_email: string;
  institution_id: string;
  institution_name: string;
  status: LifecycleStatus;
  current_step_order: number | null;
  current_approver_role: UserRole | null;
  policy_version_id?: string | null;
  legal_text_snapshot?: string | null;
  terms_accepted: boolean;
  terms_accepted_at?: string | null;
  applicant_signed_at?: string | null;
  applicant_digital_signature?: string | null;
  payload: FormPayloadMap[K];
  approvals: ApplicationApprovalStep[];
  timeline?: TimelineEvent[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 5. LEGACY ICT PURCHASE VIEW TYPE (Keeps Existing ICT Screens Working)
// ============================================================================

export interface LegacyPurchaseApplication {
  id: string;
  reference_number: string;
  applicant_id: string;
  institution_id: string;
  status: LegacyApplicationStatus;
  policy_version_id: string;
  legal_text_snapshot: string;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  requested_laptop_tier: EquipmentTierCode;
  repayment_period: RepaymentPlan;
  estimated_monthly_amount_zmw: number;
  applicant_signed_at: string | null;
  gm_reviewer_id: string | null;
  gm_comments: string | null;
  gm_signed_at: string | null;
  hr_reviewer_id: string | null;
  hr_comments: string | null;
  hr_signed_at: string | null;
  hr_vetting_checklist: Record<string, boolean> | null;
  it_reviewer_id: string | null;
  asset_serial_number: string | null;
  deducted_monthly_amount: number | null;
  deduction_start_date: string | null;
  deduction_end_date: string | null;
  it_comments: string | null;
  it_signed_at: string | null;
  created_at: string;
  updated_at: string;
}