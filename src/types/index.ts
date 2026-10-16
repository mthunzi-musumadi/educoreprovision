// ============================================================================
// 1. CORE ENUMS & ROLES
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
  | 'STORES_REQ'
  | 'EXPENSE_RETIREMENT'
  | 'PURCHASE_REQ'
  | 'DISCIPLINARY_CHARGE'
  | 'EDU_HEALTH_CLAIM';

export type CurrencyCode = 
  | 'ZMW'
  | 'USD'
  | 'GBP'
  | 'ZAR'
  | 'EUR';

export type StockCondition =
  | 'GOOD'
  | 'DAMAGED'
  | 'DEFECTIVE'
  | 'INCORRECT_ITEM'
  | 'EXPIRED';

export type InventoryAction =
  | 'RETURN_TO_STOCK'
  | 'RETURN_TO_SUPPLIER'
  | 'DISPOSAL'
  | 'SEND_FOR_REPAIR'
  | 'NO_ACTION'
  | 'OTHER';

export type FlightBookingType = 'CONTRACT' | 'BUSINESS' | 'PRIVATE_PAYROLL_DEDUCTION';

export type GroundTransferType = 'NA_OWN_TRANSPORT' | 'CAR_HIRE_SELF_DRIVE' | 'TRANSFER';

export type EduHealthCategory =
  | 'CONSULTATION'
  | 'LABORATORY'
  | 'RADIOLOGY'
  | 'PHARMACY'
  | 'ADMISSION'
  | 'OPTICAL'
  | 'EMERGENCY'
  | 'FOLLOW_UP'
  | 'DENTAL'
  | 'OTHER';
   
// ============================================================================
// 2. REFERENCE CATALOG ENTITIES
// ============================================================================

export interface Site {
  id: string;
  code: string;
  name: string;
  location: string;
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  entra_oid: string;
  site_id: string;
  site_name?: string;
  site_code?: string;
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
  site_scoped: boolean;
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

export interface TravelPassenger {
  surname: string;
  first_name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  date_of_birth: string;
}

export interface TravelFlightLeg {
  date: string;
  from_location: string;
  to_location: string;
  airline: string;
  departure_time: string;
}

// ============================================================================
// 3. EXACT PAYLOAD CONTRACTS FOR ALL 14 FORMS (HR VERIFIED FROM DOCX)
// ============================================================================

export interface IctPurchasePayload {
  equipment_tier_id: string;
  repayment_period: RepaymentPlan;
  estimated_monthly_amount_zmw: number;
}

// HR 1: Application for Advance.docx
export interface SalaryAdvancePayload {
  position: string;
  amount_requested_zmw: number;
  reason: string;
  requested_payment_date: string;
  proposed_instalment_zmw: number;
  repayment_period_from: string;
  repayment_period_to: string;
  // Backward compatibility keys
  requested_amount_zmw?: number;
  repayment_months?: number;
  current_net_pay_zmw?: number;
}

// HR 2: Application for Professional Development.docx
export interface ProfDevPayload {
  position: string;
  description: string;
  course_days_and_dates: string;
  training_provider_location: string;
  expected_outcomes: string;
  training_costs_zmw: number;
  travel_expenses_zmw: number;
  total_costs_zmw: number;
  details_attached?: boolean;
  supervisor_impact_rating?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  // Backward compatibility keys
  course_title?: string;
  provider?: string;
  cost_zmw?: number;
  start_date?: string;
  end_date?: string;
  justification?: string;
}

// HR 3: Change of Bank Details.docx
export interface BankChangePayload {
  dept_or_school: string;
  dept_or_site?: string;
  phone: string;
  date_of_birth: string;
  marital_status: string;
  nrc_or_passport: string;
  // Previous Bank Details & Clearance
  old_bank_name: string;
  old_account_number: string;
  old_bank_manager_name?: string;
  old_bank_clearance_date?: string;
  // Account Type Switch
  transfer_type: 'ZMW_DOMESTIC' | 'INTERNATIONAL';
  // Zambian Kwacha Bank Details
  zmw_bank_name?: string;
  zmw_branch_name?: string;
  zmw_branch_sort_code?: string;
  zmw_account_name?: string;
  zmw_account_number?: string;
  // International Transfer Bank Details
  intl_account_name?: string;
  intl_branch_sort_code?: string;
  intl_account_number?: string;
  intl_iban?: string;
  intl_bic?: string;
  intl_bank_name?: string;
  intl_bank_address?: string;
  intl_account_currency?: string;
  intl_beneficiary_address?: string;
  intl_city?: string;
  intl_state?: string;
  intl_country?: string;
  intl_post_code?: string;
  // Backward compatibility keys
  bank_name?: string;
  branch_name?: string;
  branch_code?: string;
  account_number?: string;
  account_type?: string;
  effective_payroll_month?: string;
}

// HR 4: Contract Renewal Form for HR.docx
export interface ContractRenewalPayload {
  staff_name: string;
  position: string;
  supervisor_name: string;
  school_or_department: string;
  site_or_department?: string;
  contract_start_date: string;
  contract_end_date: string;
  contract_to_be_renewed: 'YES' | 'NO';
  renewal_reasons: string[]; // 1., 2., 3. target progress reasons
  performance_assessment_attached: 'YES' | 'NO';
  performance_remarks?: string;
  // Backward compatibility keys
  current_contract_end_date?: string;
  proposed_tenure_months?: number;
  performance_summary?: string;
}

// HR 5: Educore Staff Child Admission Authorisation Form 2025.docx
export interface ChildAdmissionEntry {
  child_full_name: string;
  date_of_birth: string;
  target_site_id: string;
  year_group: string;
  admission_term: 'TERM_1' | 'TERM_2' | 'TERM_3';
  fee_rebate_percentage: number;
}

export interface ChildAdmissionPayload {
  staff_name?: string;
  site?: string;
  job_title?: string;
  academic_year: string;
  staff_tenure_years?: number;
  children: ChildAdmissionEntry[];
  notes?: string;
}

// HR 6: Exculpatiory Form.docx
export interface ExculpatoryPayload {
  accused_name: string;
  accused_position: string;
  accused_employee_number: string;
  dept_or_school: string;
  dept_or_site?: string;
  charging_officer_name: string;
  charging_officer_position: string;
  date_of_charge: string;
  offence_description: string; // 1. Exculpatory statement against the offence of:
  employee_statement: string;  // 2. Statement
  // Backward compatibility keys
  incident_date?: string;
  charge_reference?: string;
  allegation_summary?: string;
}

// HR 7: Gratuity advance application form- Annual.docx
export interface GratuityAdvancePayload {
  position: string;
  amount_requested_zmw: number;
  annual_gratuity_accrued_zmw: number;
  reason: string;
  contract_end_date: string;
  // Backward compatibility keys
  requested_amount_zmw?: number;
  contract_start_date?: string;
  accrued_months?: number;
}

// HR 8: Job Description.docx
export interface JobResponsibilityArea {
  area_title: string;       // 6.1 Define responsibility area
  area_description: string; // Describe the responsibility area
}

export interface JobDescriptionPayload {
  position: string;
  location: string;
  effective_date: string;
  reports_to: string;
  mission: string;
  education_criteria: string;               // 1. Education
  experience_criteria: string;              // 2. Experience
  available_tools: string;                  // 3. Available Tools
  qualities: string;                        // 4. Qualities
  organisation_and_reporting: string;       // 5. Organisation & Reporting + immediate subordinates
  responsibilities: JobResponsibilityArea[]; // 6.1 - 6.4 Responsibility areas
  assessed_performance: string;             // 6.3/6.5 Assessed Performance
  annex_org_chart_attached: boolean;        // 7. Annex: attach organisation chart
  // Backward compatibility keys
  job_title?: string;
  department?: string;
  key_responsibilities?: string[];
}

// HR 9: Manpower Requisition Form.docx
export interface ManpowerReqPayload {
  position_requested: string;
  number_of_staff_required: number;
  required_start_date: string;
  vacancy_type: 'REPLACEMENT' | 'NEW_POSITION';
  replacement_of_person?: string;           // a) Replacement of ...
  new_position_reason?: string;             // b) New position due to ...
  is_budgeted: 'YES' | 'NO';
  consequences_of_failure_to_fill: string;
  professional_qualifications_required: string;
  relevant_field_experience_required: string;
  job_description_summary: string;
  job_description_attached: 'ATTACHED' | 'NOT_ATTACHED';
  reports_to: string;
  preferred_recruitment_source: string;
  required_contract_period: string;
  remarks?: string;
  salary_recommendation_zmw: string;
  other_benefits?: string;
  // Backward compatibility keys
  position_title?: string;
  department?: string;
  headcount?: number;
  employment_type?: string;
  target_start_date?: string;
  justification?: string;
}

// Logistics & Finance
export interface TravelRequestPayload {
  cost_code: string;
  contact_number: string;
  site: string;
  reason_for_travel: string;
  passengers: TravelPassenger[];
  flight_booking_type: FlightBookingType;
  flights: TravelFlightLeg[];
  accommodation_required: boolean;
  hotel_name?: string;
  check_in_datetime?: string;
  check_out_date?: string;
  transfer_type: GroundTransferType;
  transfer_details?: string;
  pickup_time_place?: string;
  dropoff_time_place?: string;
  remarks?: string;
}

export interface EventCompletionPayload {
  schools: string;
  sites?: string;
  event_name: string;
  event_type: string;
  event_coordinator: string;
  file_number: string;
  file_open_date: string;
  event_date: string;
  coordinator_confirmed: boolean;
}

export interface StockReturnItem {
  item: string;
  unit: string;
  qty: number;
  condition: StockCondition;
  remarks?: string;
}

export interface StockReturnPayload {
  location: string;
  return_reason: string;
  items: StockReturnItem[];
  inventory_action?: InventoryAction;
  inventory_action_other?: string;
}

export interface StoresReqItem {
  description: string;
  qty_requested: number;
  qty_issued?: number;
  additional_info?: string;
}

export interface StoresReqPayload {
  school?: string;
  site?: string;
  department: string;
  purchase_order_no?: string;
  purpose: string;
  requisition_no?: string;
  date?: string;
  items: StoresReqItem[];
}

export interface ImprestLineItem {
  description: string;
  qty: number;
  unit_cost: number;
}

export interface ExpenseRetirementPayload {
  requisition_type: 'TRAVEL' | 'PURCHASE';
  cost_centre: string;
  imprest_recipient: string;
  currency: CurrencyCode;
  amounts_requested: ImprestLineItem[];
  expenses_retired: ImprestLineItem[];
  total_requested: number;
  total_retired: number;
  balance: number; // total_requested - total_retired
  requisition_no?: string;
  date?: string;
}

export interface PurchaseReqLineItem {
  description: string;
  cost_code: string;
  needed_by: string;
  qty: number;
  unit_cost: number;
}

export interface PurchaseReqPayload {
  cost_centre: string;
  available_budget: number;
  currency: CurrencyCode;
  budget_type: 'REGULAR_BUDGET' | 'OUTSIDE_BUDGET';
  recommended_supplier?: string;
  copy_to?: string;
  items: PurchaseReqLineItem[];
  total_cost: number;
  variance_to_budget: number; // available_budget - total_cost
  requisition_no?: string;
  date?: string;
}

export interface DisciplinaryChargePayload {
  charging_officer_name: string;
  charging_officer_position: string;
  charging_school: string;
  charging_site?: string;
  accused_name: string;
  accused_position: string;
  accused_man_no: string;
  accused_dept_school: string;
  accused_dept_site?: string;
  date_of_charge: string;
  nature_of_offence: string;       // 1. Nature of the Offence (As per code of conduct)
  brief_account_of_offence: string; // 2. Brief Account of the Offence (As per investigation done)
  show_cause_in_48_hours: 'YES' | 'NO';
  accused_acknowledged?: boolean;
  accused_acknowledged_date?: string;
}

export interface EduHealthClaimLineItem {
  description: string;
  provider_name: string;
  amount_charged: number;
  invoice_no: string;
}

export interface EduHealthClaimPayload {
  // 1. Member / Patient Information
  employee_number: string;
  patient_title: string;
  patient_gender: 'MALE' | 'FEMALE';
  patient_first_name: string;
  patient_surname: string;
  mobile: string;
  email: string;
  treatment_categories: EduHealthCategory[];
  symptoms_and_treatment_details: string;
  date_of_treatment: string;
  hospital_name: string;

  // 2. Claim Details Table
  claim_items: EduHealthClaimLineItem[];
  total_claim_amount: number;

  // 3. Payment Details
  payment_method: 'BANK_TRANSFER' | 'ADD_TOWARDS_MEMBERSHIP';
  bank_name?: string;
  account_holder_name?: string;
  account_number?: string;
  bank_branch?: string;

  // 4. Declarations
  confirm_true_and_correct: boolean;
  consent_medical_info_processing: boolean;
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
  EXPENSE_RETIREMENT: ExpenseRetirementPayload;
  PURCHASE_REQ: PurchaseReqPayload;
  DISCIPLINARY_CHARGE: DisciplinaryChargePayload;
  EDU_HEALTH_CLAIM: EduHealthClaimPayload;
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
  site_scoped: boolean;
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
  site_id: string;
  site_name: string;
  site_code?: string;
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
// 5. LEAST-PRIVILEGE & SITE-BOUND INVOLVEMENT HELPERS
// ============================================================================

export const ROLE_LABELS: Record<UserRole, string> = {
  APPLICANT: 'Staff / Applicant',
  LINE_MANAGER: 'Line Manager',
  HEAD_TEACHER: 'Head Teacher / Site Head',
  HR_OFFICER: 'HR Officer',
  HR_MANAGER: 'HR Manager',
  IT_MANAGER: 'IT Manager',
  FINANCE_MANAGER: 'Finance Manager',
  LOGISTICS_MANAGER: 'Logistics Manager',
  EXECUTIVE_HEAD: 'Executive Head',
  COO: 'Chief Operating Officer',
  SUPER_ADMIN: 'System Administrator',
};

/**
 * Enforces strict Least-Privilege and Site-Bound access on the client:
 * - An Applicant only sees applications where `applicant_id === user.id` and `site_id === user.site_id`.
 * - A Reviewer only sees non-draft applications where their role or ID is in the application's
 *   approval pipeline AND the application belongs to their assigned site (unless the step is
 *   central/non-site-scoped and the user belongs to CENTRAL).
 * - Central Super Admin (`SUPER_ADMIN` at `CENTRAL`) has global oversight.
 */
export function isUserInvolvedInApplication(
  app: WorkflowApplication,
  user: UserProfile | null
): boolean {
  if (!user) return false;

  const isCentralUser = user.site_code === 'CENTRAL';

  if (user.role === 'SUPER_ADMIN' && isCentralUser) {
    return true;
  }

  // Direct applicant ownership (site-bound)
  if (app.applicant_id === user.id && app.site_id === user.site_id) {
    return true;
  }

  if (app.status === 'DRAFT') {
    return false;
  }

  const approvals = app.approvals || [];
  return approvals.some((step) => {
    const isStepReviewer = step.reviewer_id === user.id;
    const isStepRole = step.required_role === user.role;
    if (!isStepReviewer && !isStepRole) return false;

    const isSiteScopedStep = step.site_scoped !== false;
    if (isSiteScopedStep || !isCentralUser) {
      return app.site_id === user.site_id;
    }
    return true;
  });
}

/**
 * Checks whether the current user is the active approver who must sign off right now.
 * Governance Rules:
 * - High privilege oversight roles (e.g. SUPER_ADMIN) have read-only oversight across all applications,
 *   and CANNOT sign off on approval steps that do not designate them.
 * - Conflict of Interest: Applicants cannot sign off on or approve their own applications.
 * - Non-central approvers or site-scoped steps require app.site_id === user.site_id.
 */
export function isAwaitingUserSignOff(
  app: WorkflowApplication,
  user: UserProfile | null
): boolean {
  if (!user || app.status !== 'IN_REVIEW') return false;
  const isCentralUser = user.site_code === 'CENTRAL';

  // Conflict of interest: Applicants cannot sign off on or approve their own applications
  if (app.applicant_id === user.id) {
    return false;
  }

  // Exact role match required: System Administrator / oversight roles cannot sign off
  // on behalf of other roles (e.g. Head Teacher, HR, Finance).
  if (app.current_approver_role !== user.role) {
    return false;
  }

  const activeStep = (app.approvals || []).find(
    (s) => s.step_order === app.current_step_order
  );
  const isSiteScopedStep = activeStep ? activeStep.site_scoped !== false : !isCentralUser;

  if (isSiteScopedStep || !isCentralUser) {
    return app.site_id === user.site_id;
  }
  return true;
}

export interface LegacyPurchaseApplication {
  id: string;
  reference_number: string;
  applicant_id: string;
  site_id: string;
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