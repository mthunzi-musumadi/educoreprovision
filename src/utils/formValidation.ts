import { FormCode } from '../types/index.ts';

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  errorCount: number;
  firstErrorKey?: string;
  summaryMessage?: string;
}

/**
 * Validates payload for all 18 Educore organizational workflow forms.
 * Returns field-level error messages mapped by field key or repeater index key.
 */
export function validateApplicationForm(
  formCode: FormCode,
  payload: Record<string, any>
): FormValidationResult {
  const errors: Record<string, string> = {};

  if (!payload || typeof payload !== 'object') {
    return {
      isValid: false,
      errors: { _general: 'Form payload is required' },
      errorCount: 1,
      firstErrorKey: '_general',
      summaryMessage: 'Form payload is required',
    };
  }

  const isNonEmpty = (val: any): boolean => {
    if (val === undefined || val === null) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    return true;
  };

  const isPositiveNumber = (val: any): boolean => {
    if (val === undefined || val === null || val === '') return false;
    const num = Number(val);
    return !Number.isNaN(num) && num > 0;
  };

  switch (formCode) {
    case 'ICT_PURCHASE': {
      if (!isNonEmpty(payload.equipment_tier_id)) {
        errors.equipment_tier_id = 'Please select a laptop equipment tier.';
      }
      if (!isNonEmpty(payload.repayment_period)) {
        errors.repayment_period = 'Please select a repayment period.';
      }
      if (!isPositiveNumber(payload.estimated_monthly_amount_zmw)) {
        errors.estimated_monthly_amount_zmw = 'Estimated monthly deduction must be greater than 0.';
      }
      break;
    }

    case 'CHILD_ADMISSION': {
      if (!isNonEmpty(payload.academic_year)) {
        errors.academic_year = 'Academic Year is required (e.g. 2026 / 2027).';
      }
      if (!Array.isArray(payload.children) || payload.children.length === 0) {
        errors.children = 'At least one child must be added for admission.';
      } else {
        payload.children.forEach((child: any, idx: number) => {
          if (!isNonEmpty(child.child_full_name)) {
            errors[`child_${idx}_child_full_name`] = "Child's full legal name is required.";
          }
          if (!isNonEmpty(child.date_of_birth)) {
            errors[`child_${idx}_date_of_birth`] = 'Date of birth is required.';
          }
          if (!isNonEmpty(child.target_site_id)) {
            errors[`child_${idx}_target_site_id`] = 'Target Educore site is required.';
          }
          if (!isNonEmpty(child.year_group)) {
            errors[`child_${idx}_year_group`] = 'Year group / Grade is required.';
          }
        });
      }
      break;
    }

    case 'TRAVEL_REQUEST': {
      if (!isNonEmpty(payload.cost_code)) {
        errors.cost_code = 'Cost Code is required.';
      }
      if (!isNonEmpty(payload.contact_number) || payload.contact_number.trim() === '+260') {
        errors.contact_number = 'Emergency contact number is required.';
      }
      if (!isNonEmpty(payload.site)) {
        errors.site = 'Site / School is required.';
      }
      if (!isNonEmpty(payload.reason_for_travel)) {
        errors.reason_for_travel = 'Reason for travel is required.';
      }
      if (!isNonEmpty(payload.flight_booking_type)) {
        errors.flight_booking_type = 'Flight booking type is required.';
      }
      if (!Array.isArray(payload.passengers) || payload.passengers.length === 0) {
        errors.passengers = "At least one passenger must be listed on the travel request.";
      } else {
        payload.passengers.forEach((p: any, idx: number) => {
          if (!isNonEmpty(p.surname)) {
            errors[`passenger_${idx}_surname`] = 'Passenger surname is required.';
          }
          if (!isNonEmpty(p.first_name)) {
            errors[`passenger_${idx}_first_name`] = 'Passenger first name is required.';
          }
          if (!isNonEmpty(p.date_of_birth)) {
            errors[`passenger_${idx}_date_of_birth`] = 'Passenger date of birth is required.';
          }
        });
      }
      if (payload.accommodation_required) {
        if (!isNonEmpty(payload.hotel_name)) {
          errors.hotel_name = 'Hotel name is required when accommodation is requested.';
        }
        if (!isNonEmpty(payload.check_in_datetime)) {
          errors.check_in_datetime = 'Check-in date & time is required.';
        }
        if (!isNonEmpty(payload.check_out_date)) {
          errors.check_out_date = 'Check-out date is required.';
        }
      }
      break;
    }

    case 'SALARY_ADVANCE': {
      const position = payload.position || payload.job_title;
      if (!isNonEmpty(position)) {
        errors.position = 'Position / Job Title is required.';
      }
      const amount = payload.amount_requested_zmw ?? payload.requested_amount_zmw;
      if (!isPositiveNumber(amount)) {
        errors.amount_requested_zmw = 'Requested advance amount must be greater than 0.';
      }
      if (!isNonEmpty(payload.reason)) {
        errors.reason = 'Reason for requesting advance is required.';
      }
      if (!isNonEmpty(payload.requested_payment_date)) {
        errors.requested_payment_date = 'Requested advance payment date is required.';
      }
      if (!isPositiveNumber(payload.proposed_instalment_zmw)) {
        errors.proposed_instalment_zmw = 'Proposed repayment instalment must be greater than 0.';
      }
      if (!isNonEmpty(payload.repayment_period_from)) {
        errors.repayment_period_from = 'Repayment start period is required.';
      }
      if (!isNonEmpty(payload.repayment_period_to)) {
        errors.repayment_period_to = 'Repayment end period is required.';
      }
      break;
    }

    case 'GRATUITY_ADVANCE': {
      const position = payload.position || payload.job_title;
      if (!isNonEmpty(position)) {
        errors.position = 'Position / Role is required.';
      }
      if (!isNonEmpty(payload.contract_end_date)) {
        errors.contract_end_date = 'Contract end date is required.';
      }
      const amount = payload.amount_requested_zmw ?? payload.requested_amount_zmw;
      if (!isPositiveNumber(amount)) {
        errors.amount_requested_zmw = 'Requested advance amount must be greater than 0.';
      }
      if (!isPositiveNumber(payload.annual_gratuity_accrued_zmw)) {
        errors.annual_gratuity_accrued_zmw = 'Accrued gratuity amount must be greater than 0.';
      }
      if (!isNonEmpty(payload.reason)) {
        errors.reason = 'Reason for requesting advance is required.';
      }
      break;
    }

    case 'BANK_CHANGE': {
      const deptOrSite = payload.dept_or_site || payload.dept_or_school;
      if (!isNonEmpty(deptOrSite)) {
        errors.dept_or_site = 'Department / Site is required.';
      }
      if (!isNonEmpty(payload.phone) || payload.phone.trim() === '+260') {
        errors.phone = 'Phone number is required.';
      }
      if (!isNonEmpty(payload.date_of_birth)) {
        errors.date_of_birth = 'Date of birth is required.';
      }
      if (!isNonEmpty(payload.nrc_or_passport)) {
        errors.nrc_or_passport = 'NRC / Passport number is required.';
      }
      if (!isNonEmpty(payload.old_bank_name)) {
        errors.old_bank_name = 'Previous bank name is required.';
      }
      if (!isNonEmpty(payload.old_account_number)) {
        errors.old_account_number = 'Previous bank account number is required.';
      }

      if (payload.transfer_type === 'INTERNATIONAL') {
        if (!isNonEmpty(payload.intl_account_name)) {
          errors.intl_account_name = 'International account name is required.';
        }
        if (!isNonEmpty(payload.intl_account_number) && !isNonEmpty(payload.account_number)) {
          errors.intl_account_number = 'International account number is required.';
        }
        if (!isNonEmpty(payload.intl_iban)) {
          errors.intl_iban = 'IBAN is required.';
        }
        if (!isNonEmpty(payload.intl_bic)) {
          errors.intl_bic = 'BIC / SWIFT code is required.';
        }
        if (!isNonEmpty(payload.intl_account_currency)) {
          errors.intl_account_currency = 'Account currency is required.';
        }
        if (!isNonEmpty(payload.intl_bank_name) && !isNonEmpty(payload.bank_name)) {
          errors.intl_bank_name = 'Bank name is required.';
        }
        if (!isNonEmpty(payload.intl_country)) {
          errors.intl_country = 'Bank country is required.';
        }
      } else {
        // ZMW Domestic
        if (!isNonEmpty(payload.zmw_bank_name) && !isNonEmpty(payload.bank_name)) {
          errors.zmw_bank_name = 'New bank name is required.';
        }
        if (!isNonEmpty(payload.zmw_branch_name) && !isNonEmpty(payload.branch_name)) {
          errors.zmw_branch_name = 'Branch name is required.';
        }
        if (!isNonEmpty(payload.zmw_account_name)) {
          errors.zmw_account_name = 'New account name is required.';
        }
        if (!isNonEmpty(payload.zmw_account_number) && !isNonEmpty(payload.account_number)) {
          errors.zmw_account_number = 'New account number is required.';
        }
      }
      break;
    }

    case 'PROF_DEV': {
      const position = payload.position || payload.job_title;
      if (!isNonEmpty(position)) {
        errors.position = 'Position is required.';
      }
      const provider = payload.training_provider_location || payload.provider;
      if (!isNonEmpty(provider)) {
        errors.training_provider_location = 'Training provider / location is required.';
      }
      const desc = payload.description || payload.course_title;
      if (!isNonEmpty(desc)) {
        errors.description = 'Description of professional development is required.';
      }
      const dates = payload.course_days_and_dates || payload.start_date;
      if (!isNonEmpty(dates)) {
        errors.course_days_and_dates = 'Day(s) and date(s) of course/training are required.';
      }
      const outcomes = payload.expected_outcomes || payload.justification || payload.relevance_to_role;
      if (!isNonEmpty(outcomes)) {
        errors.expected_outcomes = 'Expected outcomes / justification are required.';
      }
      const trainingCost = Number(payload.training_costs_zmw ?? payload.total_costs_zmw ?? payload.cost_zmw ?? 0);
      if (trainingCost <= 0) {
        errors.training_costs_zmw = 'Training costs (ZMW) must be greater than 0.';
      }
      break;
    }

    case 'CONTRACT_RENEWAL': {
      const staffName = payload.staff_name || payload.applicant_name;
      if (!isNonEmpty(staffName)) {
        errors.staff_name = 'Staff Name is required.';
      }
      const position = payload.position || payload.job_title;
      if (!isNonEmpty(position)) {
        errors.position = 'Position is required.';
      }
      if (!isNonEmpty(payload.supervisor_name)) {
        errors.supervisor_name = 'Supervisor name is required.';
      }
      const schoolOrDept = payload.school_or_department || payload.site_or_department;
      if (!isNonEmpty(schoolOrDept)) {
        errors.school_or_department = 'School / Department is required.';
      }
      if (!isNonEmpty(payload.contract_start_date)) {
        errors.contract_start_date = 'Contract start date is required.';
      }
      const contractEndDate = payload.contract_end_date || payload.current_contract_end_date;
      if (!isNonEmpty(contractEndDate)) {
        errors.contract_end_date = 'Contract end date is required.';
      }
      if (!isNonEmpty(payload.contract_to_be_renewed)) {
        errors.contract_to_be_renewed = 'Contract renewal decision is required.';
      }
      const reasons = Array.isArray(payload.renewal_reasons) ? payload.renewal_reasons : [];
      if (!reasons.some((r: any) => typeof r === 'string' && r.trim().length > 0)) {
        errors.renewal_reasons = 'At least one progress / development target reason is required.';
      }
      break;
    }

    case 'EXCULPATORY': {
      const accusedName = payload.accused_name || payload.applicant_name;
      if (!isNonEmpty(accusedName)) {
        errors.accused_name = 'Name of the accused is required.';
      }
      const accusedPos = payload.accused_position || payload.job_title;
      if (!isNonEmpty(accusedPos)) {
        errors.accused_position = 'Position of the accused is required.';
      }
      if (!isNonEmpty(payload.accused_employee_number)) {
        errors.accused_employee_number = 'Accused employee / Man No. is required.';
      }
      const deptOrSchool = payload.dept_or_school || payload.dept_or_site;
      if (!isNonEmpty(deptOrSchool)) {
        errors.dept_or_school = 'Department / School (Site) is required.';
      }
      if (!isNonEmpty(payload.charging_officer_name)) {
        errors.charging_officer_name = 'Name of charging officer is required.';
      }
      const dateOfCharge = payload.date_of_charge || payload.incident_date;
      if (!isNonEmpty(dateOfCharge)) {
        errors.date_of_charge = 'Date of charge is required.';
      }
      const offence = payload.offence_description || payload.charge_reference;
      if (!isNonEmpty(offence)) {
        errors.offence_description = 'Alleged offence / disciplinary charge description is required.';
      }
      if (!isNonEmpty(payload.employee_statement)) {
        errors.employee_statement = 'Exculpatory statement is required.';
      }
      break;
    }

    case 'MANPOWER_REQ': {
      const positionReq = payload.position_requested || payload.position_title;
      if (!isNonEmpty(positionReq)) {
        errors.position_requested = 'Position requested is required.';
      }
      const staffReq = payload.number_of_staff_required ?? payload.headcount;
      if (!isPositiveNumber(staffReq)) {
        errors.number_of_staff_required = 'Number of staff required must be at least 1.';
      }
      const startDate = payload.required_start_date || payload.target_start_date;
      if (!isNonEmpty(startDate)) {
        errors.required_start_date = 'Required start of employment date is required.';
      }
      if (!isNonEmpty(payload.vacancy_type)) {
        errors.vacancy_type = 'Vacancy origin type is required.';
      } else if (payload.vacancy_type === 'REPLACEMENT') {
        if (!isNonEmpty(payload.replacement_of_person)) {
          errors.replacement_of_person = 'Full name of departing staff member being replaced is required.';
        }
      } else {
        const reason = payload.new_position_reason || payload.justification;
        if (!isNonEmpty(reason)) {
          errors.new_position_reason = 'Justification for new headcount is required.';
        }
      }
      if (!isNonEmpty(payload.reports_to)) {
        errors.reports_to = 'Reports To designation is required.';
      }
      if (!isNonEmpty(payload.consequences_of_failure_to_fill)) {
        errors.consequences_of_failure_to_fill = 'Consequences of failure to fill vacancy is required.';
      }
      if (!isNonEmpty(payload.professional_qualifications_required)) {
        errors.professional_qualifications_required = 'Professional qualifications required is required.';
      }
      if (!isNonEmpty(payload.relevant_field_experience_required)) {
        errors.relevant_field_experience_required = 'Relevant field experience required is required.';
      }
      if (!isNonEmpty(payload.job_description_summary)) {
        errors.job_description_summary = 'Job description summary is required.';
      }
      if (!isNonEmpty(payload.required_contract_period)) {
        errors.required_contract_period = 'Required contract period is required.';
      }
      if (!isNonEmpty(payload.salary_recommendation_zmw)) {
        errors.salary_recommendation_zmw = 'Salary recommendation is required.';
      }
      break;
    }

    case 'EVENT_COMPLETION': {
      const sites = payload.sites || payload.schools;
      if (!isNonEmpty(sites)) {
        errors.sites = 'Site(s) / School(s) is required.';
      }
      if (!isNonEmpty(payload.event_name)) {
        errors.event_name = 'Event name is required.';
      }
      if (!isNonEmpty(payload.event_type)) {
        errors.event_type = 'Type of event is required.';
      }
      if (!isNonEmpty(payload.event_coordinator)) {
        errors.event_coordinator = 'Event coordinator name is required.';
      }
      if (!isNonEmpty(payload.file_number)) {
        errors.file_number = 'File number is required.';
      }
      if (!isNonEmpty(payload.file_open_date)) {
        errors.file_open_date = 'File open date is required.';
      }
      if (!isNonEmpty(payload.event_date)) {
        errors.event_date = 'Date of event is required.';
      }
      if (!payload.coordinator_confirmed) {
        errors.coordinator_confirmed = 'You must confirm the Event Coordinator declaration.';
      }
      break;
    }

    case 'STOCK_RETURN': {
      if (!isNonEmpty(payload.location)) {
        errors.location = 'Site / Location is required.';
      }
      if (!isNonEmpty(payload.return_reason)) {
        errors.return_reason = 'Reason for return is required.';
      }
      if (payload.inventory_action === 'OTHER' && !isNonEmpty(payload.inventory_action_other)) {
        errors.inventory_action_other = 'Please specify the custom inventory action.';
      }
      if (!Array.isArray(payload.items) || payload.items.length === 0) {
        errors.items = 'At least one returned stock item is required.';
      } else {
        payload.items.forEach((it: any, idx: number) => {
          if (!isNonEmpty(it.item)) {
            errors[`item_${idx}_item`] = 'Item name / description is required.';
          }
          if (!isPositiveNumber(it.qty)) {
            errors[`item_${idx}_qty`] = 'Quantity must be at least 1.';
          }
        });
      }
      break;
    }

    case 'STORES_REQ': {
      const site = payload.school || payload.site;
      if (!isNonEmpty(site)) {
        errors.school = 'School / Site is required.';
      }
      if (!isNonEmpty(payload.department)) {
        errors.department = 'Department is required.';
      }
      if (!isNonEmpty(payload.purpose)) {
        errors.purpose = 'Purpose of request is required.';
      }
      if (!Array.isArray(payload.items) || payload.items.length === 0) {
        errors.items = 'At least one stores item is required.';
      } else {
        payload.items.forEach((it: any, idx: number) => {
          if (!isNonEmpty(it.description)) {
            errors[`item_${idx}_description`] = 'Item description is required.';
          }
          const q = it.qty_requested ?? it.qty;
          if (!isPositiveNumber(q)) {
            errors[`item_${idx}_qty_requested`] = 'Quantity must be at least 1.';
          }
        });
      }
      break;
    }

    case 'EXPENSE_RETIREMENT': {
      if (!isNonEmpty(payload.cost_centre)) {
        errors.cost_centre = 'Cost Centre is required.';
      }
      if (!isNonEmpty(payload.imprest_recipient)) {
        errors.imprest_recipient = 'Imprest Recipient name is required.';
      }
      if (!isNonEmpty(payload.currency)) {
        errors.currency = 'Currency is required.';
      }
      if (!Array.isArray(payload.amounts_requested) || payload.amounts_requested.length === 0) {
        errors.amounts_requested = 'At least one imprest advance row is required in Part A.';
      } else {
        payload.amounts_requested.forEach((row: any, idx: number) => {
          if (!isNonEmpty(row.description)) {
            errors[`req_${idx}_description`] = 'Line description is required.';
          }
          if (!isPositiveNumber(row.unit_cost)) {
            errors[`req_${idx}_unit_cost`] = 'Cost/Unit must be greater than 0.';
          }
        });
      }
      break;
    }

    case 'PURCHASE_REQ': {
      if (!isNonEmpty(payload.cost_centre)) {
        errors.cost_centre = 'Cost Centre is required.';
      }
      if (payload.available_budget === undefined || payload.available_budget === null || payload.available_budget === '') {
        errors.available_budget = 'Available Budget is required.';
      }
      if (!isNonEmpty(payload.currency)) {
        errors.currency = 'Currency is required.';
      }
      if (!isNonEmpty(payload.budget_type)) {
        errors.budget_type = 'Budget status is required.';
      }
      if (!Array.isArray(payload.items) || payload.items.length === 0) {
        errors.items = 'At least one PR line item is required.';
      } else {
        payload.items.forEach((it: any, idx: number) => {
          if (!isNonEmpty(it.description)) {
            errors[`pr_${idx}_description`] = 'Line item description is required.';
          }
          if (!isNonEmpty(it.cost_code)) {
            errors[`pr_${idx}_cost_code`] = 'Cost code is required.';
          }
          if (!isNonEmpty(it.needed_by)) {
            errors[`pr_${idx}_needed_by`] = 'Needed by date is required.';
          }
          if (!isPositiveNumber(it.qty)) {
            errors[`pr_${idx}_qty`] = 'Quantity must be at least 1.';
          }
          if (!isPositiveNumber(it.unit_cost)) {
            errors[`pr_${idx}_unit_cost`] = 'Cost per unit must be greater than 0.';
          }
        });
      }
      break;
    }

    case 'JOB_DESCRIPTION': {
      const position = payload.position || payload.job_title;
      if (!isNonEmpty(position)) {
        errors.position = 'Position Title is required.';
      }
      const location = payload.location || payload.department;
      if (!isNonEmpty(location)) {
        errors.location = 'Location / School is required.';
      }
      if (!isNonEmpty(payload.effective_date)) {
        errors.effective_date = 'Effective Date is required.';
      }
      if (!isNonEmpty(payload.reports_to)) {
        errors.reports_to = 'Reports To designation is required.';
      }
      if (!isNonEmpty(payload.mission)) {
        errors.mission = 'Mission / Job Purpose is required.';
      }
      if (!isNonEmpty(payload.education_criteria)) {
        errors.education_criteria = 'Education criteria is required.';
      }
      if (!isNonEmpty(payload.experience_criteria)) {
        errors.experience_criteria = 'Experience criteria is required.';
      }
      if (!isNonEmpty(payload.available_tools)) {
        errors.available_tools = 'Available tools is required.';
      }
      if (!isNonEmpty(payload.qualities)) {
        errors.qualities = 'Qualities is required.';
      }
      if (!isNonEmpty(payload.organisation_and_reporting)) {
        errors.organisation_and_reporting = 'Organisation & reporting is required.';
      }
      const resps = Array.isArray(payload.responsibilities) ? payload.responsibilities : [];
      if (!resps.some((r: any) => isNonEmpty(r.area_description) || isNonEmpty(r.area_title))) {
        errors.responsibilities = 'At least one key responsibility duty area is required.';
      }
      if (!isNonEmpty(payload.assessed_performance)) {
        errors.assessed_performance = 'Assessed performance standards is required.';
      }
      break;
    }

    case 'DISCIPLINARY_CHARGE': {
      if (!isNonEmpty(payload.charging_officer_name)) {
        errors.charging_officer_name = 'Name of charging officer is required.';
      }
      if (!isNonEmpty(payload.charging_officer_position)) {
        errors.charging_officer_position = 'Position of charging officer is required.';
      }
      const chargingSite = payload.charging_site || payload.charging_school;
      if (!isNonEmpty(chargingSite)) {
        errors.charging_site = 'Charging site / school is required.';
      }
      if (!isNonEmpty(payload.accused_name)) {
        errors.accused_name = 'Name of the accused employee is required.';
      }
      if (!isNonEmpty(payload.accused_position)) {
        errors.accused_position = 'Position of the accused employee is required.';
      }
      if (!isNonEmpty(payload.accused_man_no)) {
        errors.accused_man_no = 'Man No. (Employee #) is required.';
      }
      const accusedSite = payload.accused_dept_site || payload.accused_dept_school;
      if (!isNonEmpty(accusedSite)) {
        errors.accused_dept_site = 'Department / Site of the accused is required.';
      }
      if (!isNonEmpty(payload.date_of_charge)) {
        errors.date_of_charge = 'Date of charge is required.';
      }
      if (!isNonEmpty(payload.nature_of_offence)) {
        errors.nature_of_offence = 'Nature of the offence is required.';
      }
      if (!isNonEmpty(payload.brief_account_of_offence)) {
        errors.brief_account_of_offence = 'Brief account of the offence is required.';
      }
      break;
    }

    case 'EDU_HEALTH_CLAIM': {
      if (!isNonEmpty(payload.employee_number)) {
        errors.employee_number = 'Employee Number is required.';
      }
      if (!isNonEmpty(payload.mobile) || payload.mobile.trim() === '+260') {
        errors.mobile = 'Mobile phone number is required.';
      }
      if (!isNonEmpty(payload.patient_first_name)) {
        errors.patient_first_name = 'Patient First Name is required.';
      }
      if (!isNonEmpty(payload.patient_surname)) {
        errors.patient_surname = 'Patient Surname is required.';
      }
      if (!isNonEmpty(payload.email)) {
        errors.email = 'Email address is required.';
      }
      if (!Array.isArray(payload.treatment_categories) || payload.treatment_categories.length === 0) {
        errors.treatment_categories = 'Select at least one service / treatment category.';
      }
      if (!isNonEmpty(payload.date_of_treatment)) {
        errors.date_of_treatment = 'Date of treatment is required.';
      }
      if (!isNonEmpty(payload.hospital_name)) {
        errors.hospital_name = 'Hospital / clinic name is required.';
      }
      if (!isNonEmpty(payload.symptoms_and_treatment_details)) {
        errors.symptoms_and_treatment_details = 'Full details of symptoms & treatment received are required.';
      }
      if (!Array.isArray(payload.claim_items) || payload.claim_items.length === 0) {
        errors.claim_items = 'At least one claim line item is required in Claim Details.';
      } else {
        payload.claim_items.forEach((row: any, idx: number) => {
          if (!isNonEmpty(row.description)) {
            errors[`claim_${idx}_description`] = 'Description of treatment / expense is required.';
          }
          if (!isNonEmpty(row.provider_name)) {
            errors[`claim_${idx}_provider_name`] = "Provider's name is required.";
          }
          if (!isPositiveNumber(row.amount_charged)) {
            errors[`claim_${idx}_amount_charged`] = 'Amount charged must be greater than 0.';
          }
        });
      }
      if (payload.payment_method === 'BANK_TRANSFER') {
        if (!isNonEmpty(payload.bank_name)) {
          errors.bank_name = 'Bank Name is required for bank transfer.';
        }
        if (!isNonEmpty(payload.account_holder_name)) {
          errors.account_holder_name = 'Account Holder Name is required.';
        }
        if (!isNonEmpty(payload.account_number)) {
          errors.account_number = 'Account Number is required.';
        }
      }
      if (!payload.confirm_true_and_correct) {
        errors.confirm_true_and_correct = 'You must confirm that the information provided is true and correct.';
      }
      if (!payload.consent_medical_info_processing) {
        errors.consent_medical_info_processing = 'You must consent to Educore Services processing medical information.';
      }
      break;
    }
  }

  const errorKeys = Object.keys(errors);
  const errorCount = errorKeys.length;

  return {
    isValid: errorCount === 0,
    errors,
    errorCount,
    firstErrorKey: errorKeys[0],
    summaryMessage:
      errorCount > 0
        ? `Please complete all required fields (${errorCount} field${errorCount === 1 ? '' : 's'} missing or invalid).`
        : undefined,
  };
}
