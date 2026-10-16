import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Laptop,
  Plane,
  Briefcase,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  ShieldCheck,
  CheckCircle,
  Users,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import {
  DepartmentCode,
  FormCode,
  FormDefinition,
  RepaymentPlan,
  StoresReqItem,
  StockReturnItem,
  ChildAdmissionEntry,
  WorkflowApplication,
  ApplicationAttachment,
} from '../../types';
import { useToast } from '../common/Toast';
import { FileUploadZone } from '../common/FileUploadZone';
import { validateApplicationForm } from '../../utils/formValidation';

interface NewRequestStepperProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialFormCode?: FormCode;
  editApplication?: WorkflowApplication | null;
}

const STEP_ITEMS = [
  { stepNum: 1 as const, label: '1. Select Form Type' },
  { stepNum: 2 as const, label: '2. General Form Details' },
  { stepNum: 3 as const, label: '3. Policy & Digital Signature' },
];

const DEPARTMENTS: { code: DepartmentCode | 'ALL'; label: string; icon: React.ReactNode }[] = [
  { code: 'ALL', label: 'All Departments', icon: null },
  { code: 'IT', label: 'IT', icon: <Laptop className="w-4 h-4" /> },
  { code: 'HR', label: 'Human Resources', icon: <Briefcase className="w-4 h-4" /> },
  { code: 'FINANCE', label: 'Finance & Stores', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { code: 'LOGISTICS', label: 'Logistics', icon: <Plane className="w-4 h-4" /> },
];

export const NewRequestStepper: React.FC<NewRequestStepperProps> = ({
  onSuccess,
  onCancel,
  initialFormCode,
  editApplication,
}) => {
  const {
    currentUser,
    formDefinitions,
    equipmentTiers,
    sites,
    policies,
    submitWorkflowForm,
    updateWorkflowForm,
    uploadAttachment,
    deleteAttachment,
  } = useAppContext();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(editApplication || initialFormCode ? 2 : 1);
  const [selectedDept, setSelectedDept] = useState<DepartmentCode | 'ALL'>('ALL');
  const [selectedFormCode, setSelectedFormCode] = useState<FormCode | null>(
    editApplication?.form_code || initialFormCode || null
  );

  const [payload, setPayload] = useState<Record<string, any>>(() => {
    if (editApplication?.payload) {
      return { ...editApplication.payload };
    }
    return {
      repayment_period: 'TWELVE_MONTHS',
      account_type: 'CURRENT',
      transport_mode: 'VEHICLE',
      employment_type: 'FIXED_TERM',
      items: [],
      children: [],
      key_responsibilities: [''],
    };
  });

  const [attachments, setAttachments] = useState<ApplicationAttachment[]>(
    editApplication?.attachments || []
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(editApplication?.terms_accepted || false);
  const [digitalSignature, setDigitalSignature] = useState(
    editApplication?.applicant_digital_signature || currentUser?.full_name || ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasAttemptedProceed, setHasAttemptedProceed] = useState(false);

  const selectedForm: FormDefinition | undefined = useMemo(
    () => (selectedFormCode ? formDefinitions.find((f) => f.code === selectedFormCode) : undefined),
    [formDefinitions, selectedFormCode]
  );

  const isStep2Complete = useMemo(() => {
    if (!selectedFormCode) return false;
    return validateApplicationForm(selectedFormCode, payload).isValid;
  }, [selectedFormCode, payload]);

  const canGoBackTo = (targetStep: 1 | 2 | 3): boolean => {
    // Only permitted to go backwards
    if (targetStep >= step) return false;

    if (targetStep === 1) {
      // Must have selected a form and not editing an existing application
      return Boolean(selectedFormCode) && !editApplication;
    }

    if (targetStep === 2) {
      // Allowed to go back to General Form Details from Step 3
      return step === 3 && Boolean(selectedFormCode);
    }

    return false;
  };

  const handleGoBackToStep1 = () => {
    setSubmitError(null);
    setFieldErrors({});
    setHasAttemptedProceed(false);
    setSelectedFormCode(null);
    setStep(1);
  };

  const handleContinueToSignoff = () => {
    if (!selectedFormCode) {
      showToast('error', 'Form Required', 'Please select a form type before proceeding.');
      return;
    }
    setHasAttemptedProceed(true);
    const validation = validateApplicationForm(selectedFormCode, payload);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      const firstMsg = validation.firstErrorKey ? validation.errors[validation.firstErrorKey] : undefined;
      const msg = firstMsg || validation.summaryMessage || 'Please complete all required fields before proceeding.';
      setSubmitError(msg);
      showToast('error', 'Incomplete Form Details', msg);
      const errKey = validation.firstErrorKey;
      if (errKey) {
        setTimeout(() => {
          const el =
            document.querySelector(`[data-field="${errKey}"]`) ||
            document.querySelector(`[name="${errKey}"]`) ||
            document.getElementById(errKey);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (el as HTMLElement).focus?.();
          }
        }, 50);
      }
      return;
    }
    setFieldErrors({});
    setSubmitError(null);
    setStep(3);
  };

  const activePolicy = useMemo(() => {
    if (!selectedForm?.requires_policy) return null;
    return (
      policies.find((p) => p.form_definition_id === selectedForm.id) ||
      policies[0] ||
      null
    );
  }, [policies, selectedForm]);

  const filteredForms = useMemo(() => {
    if (selectedDept === 'ALL') return formDefinitions;
    return formDefinitions.filter((f) => f.department === selectedDept);
  }, [formDefinitions, selectedDept]);

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearFieldErrors = (...keys: string[]) => {
    setFieldErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const k of keys) {
        if (next[k]) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  const updateField = (key: string, value: any) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);
  };

  const getInputClass = (fieldName: string, baseClasses = 'w-full border rounded-lg px-3 py-2 text-sm') => {
    const hasError = Boolean(fieldErrors[fieldName]);
    const cleanBase = baseClasses
      .replace(/border-(slate|gray|zinc|neutral)-[0-9]+/g, '')
      .replace(/focus:border-(blue|indigo|sky)-[0-9]+/g, '')
      .replace(/focus:ring-[a-z0-9-]+/g, '')
      .trim();

    if (hasError) {
      return `${cleanBase} border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20`.trim();
    }
    return `${cleanBase} border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500`.trim();
  };

  const renderFieldError = (fieldName: string) => {
    const err = fieldErrors[fieldName];
    if (!err) return null;
    return (
      <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{err}</span>
      </p>
    );
  };

  const handleIctSelection = (tierId: string, repaymentPeriod: RepaymentPlan) => {
    const tier = equipmentTiers.find((t) => t.id === tierId);
    const months =
      repaymentPeriod === 'ONE_TO_TWO_MONTHS'
        ? 2
        : repaymentPeriod === 'TWELVE_MONTHS'
        ? 12
        : 24;
    const monthly = tier ? Number((Number(tier.price_zmw) / months).toFixed(2)) : 0;

    setPayload((prev) => ({
      ...prev,
      equipment_tier_id: tierId,
      repayment_period: repaymentPeriod,
      estimated_monthly_amount_zmw: monthly,
    }));
    clearFieldErrors('equipment_tier_id', 'repayment_period', 'estimated_monthly_amount_zmw');
  };

  const handleSelectForm = (form: FormDefinition) => {
    setSelectedFormCode(form.code);
    setSubmitError(null);
    setFieldErrors({});
    setHasAttemptedProceed(false);

    const defaultSiteId = sites[0]?.id || currentUser?.site_id || '';

    switch (form.code) {
      case 'ICT_PURCHASE': {
        const defaultTier = equipmentTiers[0];
        setPayload({
          equipment_tier_id: defaultTier?.id || '',
          repayment_period: 'TWELVE_MONTHS',
          estimated_monthly_amount_zmw: defaultTier
            ? Number((Number(defaultTier.price_zmw) / 12).toFixed(2))
            : 0,
        });
        break;
      }
      case 'CHILD_ADMISSION':
        setPayload({
          staff_name: currentUser?.full_name || '',
          site: currentUser?.site_name || '',
          job_title: currentUser?.job_title || '',
          academic_year: new Date().getFullYear().toString(),
          staff_tenure_years: 1,
          notes: '',
          children: [
            {
              child_full_name: '',
              date_of_birth: '',
              target_site_id: defaultSiteId,
              year_group: 'Year 1 / Grade 1',
              admission_term: 'TERM_1',
              fee_rebate_percentage: 75,
            },
          ] as ChildAdmissionEntry[],
        });
        break;
      case 'TRAVEL_REQUEST': {
        const nameParts = (currentUser?.full_name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const surname = nameParts.slice(1).join(' ') || '';

        setPayload({
          cost_code: currentUser?.department || '',
          contact_number: '+260 ',
          site: currentUser?.site_name || '',
          reason_for_travel: '',
          passengers: [
            {
              surname,
              first_name: firstName,
              gender: 'MALE',
              date_of_birth: '',
            },
          ],
          flight_booking_type: 'BUSINESS',
          flights: [
            {
              date: '',
              from_location: 'Solwezi',
              to_location: 'Lusaka',
              airline: 'Proflight Zambia',
              departure_time: '08:00',
            },
          ],
          accommodation_required: false,
          hotel_name: '',
          check_in_datetime: '',
          check_out_date: '',
          transfer_type: 'NA_OWN_TRANSPORT',
          transfer_details: '',
          pickup_time_place: '',
          dropoff_time_place: '',
          remarks: '',
        });
        break;
      }
      case 'SALARY_ADVANCE':
        setPayload({
          position: currentUser?.job_title || '',
          amount_requested_zmw: '',
          reason: '',
          requested_payment_date: new Date().toISOString().split('T')[0],
          proposed_instalment_zmw: '',
          repayment_period_from: '',
          repayment_period_to: '',
        });
        break;
      case 'GRATUITY_ADVANCE':
        setPayload({
          position: currentUser?.job_title || '',
          amount_requested_zmw: '',
          annual_gratuity_accrued_zmw: '',
          reason: '',
          contract_end_date: '',
        });
        break;
      case 'PROF_DEV':
        setPayload({
          position: currentUser?.job_title || '',
          description: '',
          course_days_and_dates: '',
          training_provider_location: '',
          expected_outcomes: '',
          training_costs_zmw: 0,
          travel_expenses_zmw: 0,
          total_costs_zmw: 0,
          details_attached: false,
        });
        break;
      case 'BANK_CHANGE':
        setPayload({
          dept_or_school: currentUser?.department || currentUser?.site_name || '',
          dept_or_site: currentUser?.site_name || '',
          phone: '+260 ',
          date_of_birth: '',
          marital_status: 'Single',
          nrc_or_passport: '',
          old_bank_name: '',
          old_account_number: '',
          old_bank_manager_name: '',
          old_bank_clearance_date: '',
          transfer_type: 'ZMW_DOMESTIC',
          zmw_bank_name: '',
          zmw_branch_name: '',
          zmw_branch_sort_code: '',
          zmw_account_name: currentUser?.full_name || '',
          zmw_account_number: '',
          intl_account_name: currentUser?.full_name || '',
          intl_branch_sort_code: '',
          intl_account_number: '',
          intl_iban: '',
          intl_bic: '',
          intl_bank_name: '',
          intl_bank_address: '',
          intl_account_currency: 'USD',
          intl_beneficiary_address: '',
          intl_city: '',
          intl_state: '',
          intl_country: 'Zambia',
          intl_post_code: '',
        });
        break;
      case 'CONTRACT_RENEWAL':
        setPayload({
          staff_name: currentUser?.full_name || '',
          position: currentUser?.job_title || '',
          supervisor_name: '',
          school_or_department: currentUser?.department || currentUser?.site_name || '',
          site_or_department: currentUser?.site_name || '',
          contract_start_date: '',
          contract_end_date: '',
          contract_to_be_renewed: 'YES',
          renewal_reasons: ['', '', ''],
          performance_assessment_attached: 'YES',
          performance_remarks: '',
        });
        break;
      case 'EXCULPATORY':
        setPayload({
          accused_name: currentUser?.full_name || '',
          accused_position: currentUser?.job_title || '',
          accused_employee_number: currentUser?.employee_number || '',
          dept_or_school: currentUser?.department || currentUser?.site_name || '',
          dept_or_site: currentUser?.site_name || '',
          charging_officer_name: '',
          charging_officer_position: '',
          date_of_charge: new Date().toISOString().split('T')[0],
          offence_description: '',
          employee_statement: '',
        });
        break;
      case 'JOB_DESCRIPTION':
        setPayload({
          position: currentUser?.job_title || '',
          location: currentUser?.site_name || '',
          effective_date: new Date().toISOString().split('T')[0],
          reports_to: 'Head Teacher / Line Manager',
          mission: '',
          education_criteria: '',
          experience_criteria: '',
          available_tools: 'Computer, Office Suite, Management System',
          qualities: 'Self-motivated, excellent communication, strong teamwork',
          organisation_and_reporting: 'Reports to Line Manager. Immediate subordinates: None.',
          responsibilities: [
            { area_title: 'Core Teaching / Operational Delivery', area_description: '' },
            { area_title: 'Administrative & Reporting Compliance', area_description: '' },
          ],
          assessed_performance: 'Annual Appraisal as per Educore Standards',
          annex_org_chart_attached: true,
        });
        break;
      case 'MANPOWER_REQ':
        setPayload({
          position_requested: '',
          number_of_staff_required: 1,
          required_start_date: '',
          vacancy_type: 'NEW_POSITION',
          replacement_of_person: '',
          new_position_reason: '',
          is_budgeted: 'YES',
          consequences_of_failure_to_fill: '',
          professional_qualifications_required: '',
          relevant_field_experience_required: '',
          job_description_summary: '',
          job_description_attached: 'ATTACHED',
          reports_to: currentUser?.job_title || 'Head Teacher / Department Head',
          preferred_recruitment_source: 'Internal / External Advertisement',
          required_contract_period: '2 Years',
          remarks: '',
          salary_recommendation_zmw: '',
          other_benefits: 'As per Educore Services standard staff benefits',
        });
        break;
      case 'EVENT_COMPLETION':
        setPayload({
          sites: currentUser?.site_name || '',
          schools: currentUser?.site_name || '',
          event_name: '',
          event_type: '',
          event_coordinator: currentUser?.full_name || '',
          file_number: '',
          file_open_date: '',
          event_date: '',
          coordinator_confirmed: true,
        });
        break;
      case 'STOCK_RETURN':
        setPayload({
          location: currentUser?.site_name || '',
          return_reason: '',
          inventory_action: 'RETURN_TO_STOCK',
          inventory_action_other: '',
          items: [
            { item: '', unit: 'EA', qty: 1, condition: 'GOOD', remarks: '' },
          ],
        });
        break;
      case 'STORES_REQ':
        setPayload({
          school: currentUser?.site_name || '',
          site: currentUser?.site_name || '',
          department: currentUser?.department || '',
          purchase_order_no: '',
          purpose: '',
          items: [
            { description: '', qty_requested: 1, additional_info: '' },
          ],
        });
        break;
      case 'EXPENSE_RETIREMENT':
        setPayload({
          requisition_type: 'TRAVEL',
          cost_centre: currentUser?.department || '',
          imprest_recipient: currentUser?.full_name || '',
          currency: 'ZMW',
          amounts_requested: [{ description: '', qty: 1, unit_cost: 0 }],
          expenses_retired: [{ description: '', qty: 1, unit_cost: 0 }],
          total_requested: 0,
          total_retired: 0,
          balance: 0,
        });
        break;
      case 'PURCHASE_REQ':
        setPayload({
          cost_centre: currentUser?.department || '',
          available_budget: 0,
          currency: 'ZMW',
          budget_type: 'REGULAR_BUDGET',
          recommended_supplier: '',
          copy_to: '',
          items: [
            { description: '', cost_code: '', needed_by: '', qty: 1, unit_cost: 0 },
          ],
          total_cost: 0,
          variance_to_budget: 0,
        });
        break;
      case 'DISCIPLINARY_CHARGE':
        setPayload({
          charging_officer_name: currentUser?.full_name || '',
          charging_officer_position: currentUser?.job_title || '',
          charging_site: currentUser?.site_name || '',
          charging_school: currentUser?.site_name || '',
          accused_name: '',
          accused_position: '',
          accused_man_no: '',
          accused_dept_site: currentUser?.site_name || '',
          accused_dept_school: currentUser?.site_name || '',
          date_of_charge: new Date().toISOString().split('T')[0],
          nature_of_offence: '',
          brief_account_of_offence: '',
          show_cause_in_48_hours: 'YES',
          accused_acknowledged: false,
        });
        break;

      case 'EDU_HEALTH_CLAIM': {
        const parts = (currentUser?.full_name || '').trim().split(' ');
        setPayload({
          employee_number: currentUser?.employee_number || '',
          patient_title: 'Mr/Ms',
          patient_gender: 'MALE',
          patient_first_name: parts[0] || '',
          patient_surname: parts.slice(1).join(' ') || '',
          mobile: '+260 ',
          email: currentUser?.email || '',
          treatment_categories: ['CONSULTATION'],
          symptoms_and_treatment_details: '',
          date_of_treatment: '',
          hospital_name: '',
          claim_items: [
            { description: '', provider_name: '', amount_charged: 0, invoice_no: '' },
          ],
          total_claim_amount: 0,
          payment_method: 'BANK_TRANSFER',
          bank_name: '',
          account_holder_name: currentUser?.full_name || '',
          account_number: '',
          bank_branch: '',
          confirm_true_and_correct: true,
          consent_medical_info_processing: true,
        });
        break;
      }
    }

    setStep(2);
  };

  const handleFinalSubmit = async (submitImmediately: boolean) => {
    if (!selectedForm) return;
    setSubmitting(true);
    setSubmitError(null);

    if (submitImmediately) {
      const validation = validateApplicationForm(selectedForm.code, payload);
      if (!validation.isValid) {
        setFieldErrors(validation.errors);
        setHasAttemptedProceed(true);
        const firstMsg = validation.firstErrorKey ? validation.errors[validation.firstErrorKey] : undefined;
        const msg = firstMsg || validation.summaryMessage || 'Please complete all required fields before submitting.';
        setSubmitError(msg);
        showToast('error', 'Incomplete Form Details', msg);
        setStep(2);
        setSubmitting(false);
        const errKey = validation.firstErrorKey;
        if (errKey) {
          setTimeout(() => {
            const el =
              document.querySelector(`[data-field="${errKey}"]`) ||
              document.querySelector(`[name="${errKey}"]`) ||
              document.getElementById(errKey);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              (el as HTMLElement).focus?.();
            }
          }, 50);
        }
        return;
      }

      if (!digitalSignature.trim()) {
        const msg = 'Digital signature is required to sign and submit.';
        setSubmitError(msg);
        showToast('error', 'Signature Required', msg);
        setSubmitting(false);
        return;
      }

      if (selectedForm.requires_policy && !termsAccepted) {
        const msg = 'You must accept the institutional policy declaration before submitting.';
        setSubmitError(msg);
        showToast('error', 'Policy Acceptance Required', msg);
        setSubmitting(false);
        return;
      }
    }

    try {
      let resultApp: any;
      if (editApplication) {
        resultApp = await updateWorkflowForm({
          applicationId: editApplication.id,
          payload: payload as any,
          submitImmediately,
          termsAccepted: selectedForm.requires_policy ? termsAccepted : true,
          digitalSignature: digitalSignature.trim() || currentUser?.full_name,
        });
        showToast(
          'success',
          submitImmediately ? 'Application Resubmitted' : 'Draft Saved',
          `Your changes to ${selectedForm.title} have been saved.`
        );
      } else {
        resultApp = await submitWorkflowForm({
          formCode: selectedForm.code,
          payload: payload as any,
          submitImmediately,
          policyVersionId: activePolicy?.id,
          termsAccepted: selectedForm.requires_policy ? termsAccepted : true,
          digitalSignature: digitalSignature.trim() || currentUser?.full_name,
        });
        showToast(
          'success',
          submitImmediately ? 'Application Submitted' : 'Draft Saved',
          `Your ${selectedForm.title} has been recorded in the workflow engine.`
        );
      }

      if (pendingFiles.length > 0 && resultApp?.id) {
        for (const file of pendingFiles) {
          try {
            await uploadAttachment(resultApp.id, file);
          } catch (e) {
            console.error('Failed to attach document:', e);
          }
        }
      }

      onSuccess?.();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================================
  // STEP 2: POLYMORPHIC FORM FIELD RENDERER (ALL 14 FORMS)
  // ==========================================================================
  const renderFormFields = () => {
    if (!selectedFormCode) return null;
    switch (selectedFormCode) {
      case 'ICT_PURCHASE':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Laptop Tier *
              </label>
              <div
                data-field="equipment_tier_id"
                className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
                  fieldErrors.equipment_tier_id ? 'p-2 rounded-xl border border-red-400 bg-red-50/20' : ''
                }`}
              >
                {equipmentTiers.map((tier) => {
                  const selected = payload.equipment_tier_id === tier.id;
                  return (
                    <motion.button
                      type="button"
                      key={tier.id}
                      whileHover={{ scale: 1.012, y: -1 }}
                      whileTap={{ scale: 0.988 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      onClick={() =>
                        handleIctSelection(
                          tier.id,
                          (payload.repayment_period as RepaymentPlan) || 'TWELVE_MONTHS'
                        )
                      }
                      className={`text-left p-4 rounded-xl border-2 transition ${
                        selected
                          ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{tier.title}</span>
                        <span className="text-sm font-bold text-blue-700">
                          ZMW {Number(tier.price_zmw).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{tier.subtitle}</p>
                      <div className="mt-3 text-xs text-slate-600 space-y-1">
                        <div>CPU: {tier.processor}</div>
                        <div>
                          RAM/Storage: {tier.ram} / {tier.storage}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              {renderFieldError('equipment_tier_id')}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Repayment Period *
              </label>
              <div
                data-field="repayment_period"
                className={`grid grid-cols-3 gap-3 ${
                  fieldErrors.repayment_period ? 'p-2 rounded-xl border border-red-400 bg-red-50/20' : ''
                }`}
              >
                {(
                  [
                    { code: 'ONE_TO_TWO_MONTHS', label: '1 - 2 Months' },
                    { code: 'TWELVE_MONTHS', label: '12 Months' },
                    { code: 'TWENTY_FOUR_MONTHS', label: '24 Months' },
                  ] as const
                ).map((plan) => (
                  <button
                    type="button"
                    key={plan.code}
                    onClick={() => handleIctSelection(payload.equipment_tier_id, plan.code)}
                    className={`py-3 px-4 rounded-lg border text-sm font-medium ${
                      payload.repayment_period === plan.code
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {plan.label}
                  </button>
                ))}
              </div>
              {renderFieldError('repayment_period')}
            </div>

            <div className="p-4 rounded-lg bg-slate-100 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">
                Estimated Monthly Payroll Deduction:
              </span>
              <span className="text-lg font-bold text-slate-900">
                ZMW {Number(payload.estimated_monthly_amount_zmw || 0).toLocaleString()} / mo
              </span>
            </div>
            {renderFieldError('estimated_monthly_amount_zmw')}
          </div>
        );

      case 'CHILD_ADMISSION': {
        const children: ChildAdmissionEntry[] = payload.children || [];
        const defaultSiteId = sites[0]?.id || '';

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year *
                </label>
                <input
                  type="text"
                  data-field="academic_year"
                  placeholder="e.g., 2026 / 2027"
                  value={payload.academic_year || ''}
                  onChange={(e) => updateField('academic_year', e.target.value)}
                  className={getInputClass('academic_year', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('academic_year')}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Years of Continuous Service at Educore
                </label>
                <input
                  type="number"
                  min={0}
                  value={payload.staff_tenure_years ?? 1}
                  onChange={(e) => updateField('staff_tenure_years', Number(e.target.value))}
                  className="w-full bg-white border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Multi-Child Repeater Section */}
            <div className="space-y-3" data-field="children">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-800">
                    Children for Admission / Fee Rebate Authorisation ({children.length}) *
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateField('children', [
                      ...children,
                      {
                        child_full_name: '',
                        date_of_birth: '',
                        target_site_id: defaultSiteId,
                        year_group: '',
                        admission_term: 'TERM_1',
                        fee_rebate_percentage: 75,
                      } as ChildAdmissionEntry,
                    ]);
                    clearFieldError('children');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Child
                </button>
              </div>
              {renderFieldError('children')}

              <div className="space-y-3">
                {children.map((child, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        Child #{idx + 1}
                      </span>
                      {children.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              'children',
                              children.filter((_, i) => i !== idx)
                            )
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Child's Full Name *
                        </label>
                        <input
                          type="text"
                          data-field={`child_${idx}_child_full_name`}
                          placeholder="Full Legal Name"
                          value={child.child_full_name}
                          onChange={(e) => {
                            const next = [...children];
                            next[idx] = { ...child, child_full_name: e.target.value };
                            updateField('children', next);
                            clearFieldErrors(`child_${idx}_child_full_name`, 'children');
                          }}
                          className={getInputClass(`child_${idx}_child_full_name`, 'w-full border rounded-lg px-2.5 py-1.5 text-xs')}
                        />
                        {renderFieldError(`child_${idx}_child_full_name`)}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          data-field={`child_${idx}_date_of_birth`}
                          value={child.date_of_birth}
                          onChange={(e) => {
                            const next = [...children];
                            next[idx] = { ...child, date_of_birth: e.target.value };
                            updateField('children', next);
                            clearFieldErrors(`child_${idx}_date_of_birth`, 'children');
                          }}
                          className={getInputClass(`child_${idx}_date_of_birth`, 'w-full border rounded-lg px-2.5 py-1.5 text-xs')}
                        />
                        {renderFieldError(`child_${idx}_date_of_birth`)}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Target Educore Site *
                        </label>
                        <select
                          data-field={`child_${idx}_target_site_id`}
                          value={child.target_site_id}
                          onChange={(e) => {
                            const next = [...children];
                            next[idx] = { ...child, target_site_id: e.target.value };
                            updateField('children', next);
                            clearFieldErrors(`child_${idx}_target_site_id`, 'children');
                          }}
                          className={getInputClass(`child_${idx}_target_site_id`, 'w-full border rounded-lg px-2.5 py-1.5 text-xs')}
                        >
                          {sites.map((inst) => (
                            <option key={inst.id} value={inst.id}>
                              {inst.name}
                            </option>
                          ))}
                        </select>
                        {renderFieldError(`child_${idx}_target_site_id`)}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Year Group / Grade *
                        </label>
                        <input
                          type="text"
                          data-field={`child_${idx}_year_group`}
                          placeholder="e.g., Year 5 / Grade 8"
                          value={child.year_group}
                          onChange={(e) => {
                            const next = [...children];
                            next[idx] = { ...child, year_group: e.target.value };
                            updateField('children', next);
                            clearFieldErrors(`child_${idx}_year_group`, 'children');
                          }}
                          className={getInputClass(`child_${idx}_year_group`, 'w-full border rounded-lg px-2.5 py-1.5 text-xs')}
                        />
                        {renderFieldError(`child_${idx}_year_group`)}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Admission Term
                        </label>
                        <select
                          value={child.admission_term}
                          onChange={(e) => {
                            const next = [...children];
                            next[idx] = {
                              ...child,
                              admission_term: e.target.value as ChildAdmissionEntry['admission_term'],
                            };
                            updateField('children', next);
                          }}
                          className="w-full border rounded-lg px-2.5 py-1.5 text-xs"
                        >
                          <option value="TERM_1">Term 1</option>
                          <option value="TERM_2">Term 2</option>
                          <option value="TERM_3">Term 3</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Staff Fee Rebate (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={child.fee_rebate_percentage}
                          onChange={(e) => {
                            const next = [...children];
                            next[idx] = {
                              ...child,
                              fee_rebate_percentage: Number(e.target.value),
                            };
                            updateField('children', next);
                          }}
                          className="w-full border rounded-lg px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Notes / Special Admission Considerations
              </label>
              <textarea
                rows={2}
                value={payload.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );
      }

      case 'TRAVEL_REQUEST': {
        const passengers: any[] = payload.passengers || [];
        const flights: any[] = payload.flights || [];

        return (
          <div className="space-y-6">
            {/* 1. Requestor & Costing Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cost Code *
                </label>
                <input
                  type="text"
                  data-field="cost_code"
                  placeholder="e.g., TRD-ACAD-2026"
                  value={payload.cost_code || ''}
                  onChange={(e) => updateField('cost_code', e.target.value)}
                  className={getInputClass('cost_code', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('cost_code')}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  data-field="contact_number"
                  placeholder="+260 96..."
                  value={payload.contact_number || ''}
                  onChange={(e) => updateField('contact_number', e.target.value)}
                  className={getInputClass('contact_number', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('contact_number')}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Site *
                </label>
                <input
                  type="text"
                  data-field="site"
                  value={payload.site || ''}
                  onChange={(e) => updateField('site', e.target.value)}
                  className={getInputClass('site', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('site')}
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason For Travel *
                </label>
                <input
                  type="text"
                  data-field="reason_for_travel"
                  placeholder="Official business purpose or contract travel entitlement"
                  value={payload.reason_for_travel || ''}
                  onChange={(e) => updateField('reason_for_travel', e.target.value)}
                  className={getInputClass('reason_for_travel', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('reason_for_travel')}
              </div>
            </div>

            {/* 2. Passengers' Details Repeater */}
            <div className="space-y-2" data-field="passengers">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">
                    Passengers' Details ({passengers.length}) *
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Names must match Travel ID (Passport / NRC / Driver's Licence)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateField('passengers', [
                      ...passengers,
                      { surname: '', first_name: '', gender: 'MALE', date_of_birth: '' },
                    ]);
                    clearFieldError('passengers');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Passenger
                </button>
              </div>
              {renderFieldError('passengers')}

              {passengers.map((p, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    data-field={`passenger_${idx}_surname`}
                    placeholder="Surname *"
                    value={p.surname}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx] = { ...p, surname: e.target.value };
                      updateField('passengers', next);
                      clearFieldErrors(`passenger_${idx}_surname`, 'passengers');
                    }}
                    className={getInputClass(`passenger_${idx}_surname`, 'col-span-4 border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  <input
                    type="text"
                    data-field={`passenger_${idx}_first_name`}
                    placeholder="First Name *"
                    value={p.first_name}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx] = { ...p, first_name: e.target.value };
                      updateField('passengers', next);
                      clearFieldErrors(`passenger_${idx}_first_name`, 'passengers');
                    }}
                    className={getInputClass(`passenger_${idx}_first_name`, 'col-span-4 border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  <select
                    value={p.gender}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx] = { ...p, gender: e.target.value };
                      updateField('passengers', next);
                    }}
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <input
                    type="date"
                    data-field={`passenger_${idx}_date_of_birth`}
                    title="Date of Birth"
                    value={p.date_of_birth}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx] = { ...p, date_of_birth: e.target.value };
                      updateField('passengers', next);
                      clearFieldErrors(`passenger_${idx}_date_of_birth`, 'passengers');
                    }}
                    className={getInputClass(`passenger_${idx}_date_of_birth`, 'col-span-1 border rounded-lg px-1.5 py-1.5 text-xs')}
                  />
                  <button
                    type="button"
                    disabled={passengers.length <= 1}
                    onClick={() =>
                      updateField('passengers', passengers.filter((_, i) => i !== idx))
                    }
                    className="col-span-1 text-red-500 hover:text-red-700 disabled:opacity-30 flex justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* 3. Flight Details Section */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800">
                  Flight Details & Booking Type *
                </label>
                <div className="flex flex-wrap gap-2" data-field="flight_booking_type">
                  {(
                    [
                      { code: 'CONTRACT', label: 'Contract' },
                      { code: 'BUSINESS', label: '*Business (Working Offsite)' },
                      {
                        code: 'PRIVATE_PAYROLL_DEDUCTION',
                        label: 'Private (Payroll Deduction)',
                      },
                    ] as const
                  ).map((ft) => (
                    <button
                      type="button"
                      key={ft.code}
                      onClick={() => {
                        updateField('flight_booking_type', ft.code);
                        clearFieldError('flight_booking_type');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                        payload.flight_booking_type === ft.code
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>
              {renderFieldError('flight_booking_type')}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Flight Itinerary Legs (Date, From, To, Airline, Departure Time)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateField('flights', [
                        ...flights,
                        {
                          date: '',
                          from_location: '',
                          to_location: '',
                          airline: '',
                          departure_time: '',
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Flight Leg
                  </button>
                </div>

                {flights.map((leg, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="date"
                      value={leg.date}
                      onChange={(e) => {
                        const next = [...flights];
                        next[idx] = { ...leg, date: e.target.value };
                        updateField('flights', next);
                      }}
                      className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="From (e.g., Solwezi)"
                      value={leg.from_location}
                      onChange={(e) => {
                        const next = [...flights];
                        next[idx] = { ...leg, from_location: e.target.value };
                        updateField('flights', next);
                      }}
                      className="col-span-3 border rounded-lg px-2 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="To (e.g., Lusaka)"
                      value={leg.to_location}
                      onChange={(e) => {
                        const next = [...flights];
                        next[idx] = { ...leg, to_location: e.target.value };
                        updateField('flights', next);
                      }}
                      className="col-span-3 border rounded-lg px-2 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Airline"
                      value={leg.airline}
                      onChange={(e) => {
                        const next = [...flights];
                        next[idx] = { ...leg, airline: e.target.value };
                        updateField('flights', next);
                      }}
                      className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                    />
                    <input
                      type="time"
                      value={leg.departure_time}
                      onChange={(e) => {
                        const next = [...flights];
                        next[idx] = { ...leg, departure_time: e.target.value };
                        updateField('flights', next);
                      }}
                      className="col-span-1 border rounded-lg px-1 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateField('flights', flights.filter((_, i) => i !== idx))
                      }
                      className="col-span-1 text-red-500 flex justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Accommodation & Ground Transfer Section */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(payload.accommodation_required)}
                    onChange={(e) =>
                      updateField('accommodation_required', e.target.checked)
                    }
                  />
                  Accommodation Required?
                </label>
              </div>

              {payload.accommodation_required && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Hotel Name *
                    </label>
                    <input
                      type="text"
                      data-field="hotel_name"
                      value={payload.hotel_name || ''}
                      onChange={(e) => updateField('hotel_name', e.target.value)}
                      className={getInputClass('hotel_name', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('hotel_name')}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Check-In Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      data-field="check_in_datetime"
                      value={payload.check_in_datetime || ''}
                      onChange={(e) => updateField('check_in_datetime', e.target.value)}
                      className={getInputClass('check_in_datetime', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('check_in_datetime')}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Check-Out Date *
                    </label>
                    <input
                      type="date"
                      data-field="check_out_date"
                      value={payload.check_out_date || ''}
                      onChange={(e) => updateField('check_out_date', e.target.value)}
                      className={getInputClass('check_out_date', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('check_out_date')}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transfer / Car Hire Option *
                  </label>
                  <select
                    value={payload.transfer_type || 'NA_OWN_TRANSPORT'}
                    onChange={(e) => updateField('transfer_type', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="NA_OWN_TRANSPORT">N/A / Own Transport</option>
                    <option value="CAR_HIRE_SELF_DRIVE">Car Hire (Self Drive)</option>
                    <option value="TRANSFER">Airport / Hotel Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transfer / Car Hire Details
                  </label>
                  <input
                    type="text"
                    value={payload.transfer_details || ''}
                    onChange={(e) => updateField('transfer_details', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pick-Up Time and Place
                  </label>
                  <input
                    type="text"
                    value={payload.pickup_time_place || ''}
                    onChange={(e) => updateField('pickup_time_place', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Drop-Off Time and Place
                  </label>
                  <input
                    type="text"
                    value={payload.dropoff_time_place || ''}
                    onChange={(e) => updateField('dropoff_time_place', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <div className="font-bold">Educore Travel Policy Notes (travel@educoreservices.com | +260 762 168189):</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Contract Flights must be booked 3 months prior to departure.</li>
                  <li>Business Requests must be submitted &gt;3 weeks prior to intended international travel.</li>
                  <li>Passengers must ensure personal travel documents (passport, visa, vaccinations) are valid.</li>
                </ul>
              </div>
            </div>
          </div>
        );
      }
      case 'SALARY_ADVANCE':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">Applicant: <strong>{currentUser?.full_name}</strong></span>
              <span className="text-slate-600">Staff #: <strong>{currentUser?.employee_number}</strong></span>
              <span className="text-slate-600">Site: <strong>{currentUser?.site_name}</strong></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Position / Job Title *
                </label>
                <input
                  type="text"
                  data-field="position"
                  value={payload.position || ''}
                  onChange={(e) => updateField('position', e.target.value)}
                  className={getInputClass('position', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="e.g., Senior Secondary Teacher"
                />
                {renderFieldError('position')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Requested (ZMW) *
                </label>
                <input
                  type="number"
                  data-field="amount_requested_zmw"
                  min={1}
                  value={payload.amount_requested_zmw ?? payload.requested_amount_zmw ?? ''}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateField('amount_requested_zmw', val);
                    updateField('requested_amount_zmw', val);
                  }}
                  className={getInputClass('amount_requested_zmw', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="Amount in Kwacha"
                />
                {renderFieldError('amount_requested_zmw')}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Requesting an Advance *
                </label>
                <textarea
                  rows={3}
                  data-field="reason"
                  value={payload.reason || ''}
                  onChange={(e) => updateField('reason', e.target.value)}
                  className={getInputClass('reason', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="State detailed reason for advance..."
                />
                {renderFieldError('reason')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requested Date of Advance Payment *
                </label>
                <input
                  type="date"
                  data-field="requested_payment_date"
                  value={payload.requested_payment_date || ''}
                  onChange={(e) => updateField('requested_payment_date', e.target.value)}
                  className={getInputClass('requested_payment_date', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('requested_payment_date')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proposed Repayment Amount / Instalment (ZMW) *
                </label>
                <input
                  type="number"
                  data-field="proposed_instalment_zmw"
                  min={1}
                  value={payload.proposed_instalment_zmw || ''}
                  onChange={(e) => updateField('proposed_instalment_zmw', Number(e.target.value))}
                  className={getInputClass('proposed_instalment_zmw', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="Monthly instalment in Kwacha"
                />
                {renderFieldError('proposed_instalment_zmw')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proposed Repayment Period From *
                </label>
                <input
                  type="month"
                  data-field="repayment_period_from"
                  value={payload.repayment_period_from || ''}
                  onChange={(e) => updateField('repayment_period_from', e.target.value)}
                  className={getInputClass('repayment_period_from', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('repayment_period_from')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proposed Repayment Period To *
                </label>
                <input
                  type="month"
                  data-field="repayment_period_to"
                  value={payload.repayment_period_to || ''}
                  onChange={(e) => updateField('repayment_period_to', e.target.value)}
                  className={getInputClass('repayment_period_to', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('repayment_period_to')}
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
              <strong>Approval Chain:</strong> Supervisor / Head Teacher &rarr; HR Manager (Affordability & Compliance Check) &rarr; Chief Operations Officer (Final Authorisation).
            </div>
          </div>
        );

      case 'GRATUITY_ADVANCE':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">Applicant: <strong>{currentUser?.full_name}</strong></span>
              <span className="text-slate-600">Staff #: <strong>{currentUser?.employee_number}</strong></span>
              <span className="text-slate-600">Site: <strong>{currentUser?.site_name}</strong></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Position / Role *
                </label>
                <input
                  type="text"
                  data-field="position"
                  value={payload.position || ''}
                  onChange={(e) => updateField('position', e.target.value)}
                  className={getInputClass('position', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="e.g., Facilities Supervisor"
                />
                {renderFieldError('position')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contract End Date *
                </label>
                <input
                  type="date"
                  data-field="contract_end_date"
                  value={payload.contract_end_date || ''}
                  onChange={(e) => updateField('contract_end_date', e.target.value)}
                  className={getInputClass('contract_end_date', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('contract_end_date')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Requested (ZMW) *
                </label>
                <input
                  type="number"
                  data-field="amount_requested_zmw"
                  min={1}
                  value={payload.amount_requested_zmw ?? payload.requested_amount_zmw ?? ''}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateField('amount_requested_zmw', val);
                    updateField('requested_amount_zmw', val);
                  }}
                  className={getInputClass('amount_requested_zmw', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="Requested advance amount"
                />
                {renderFieldError('amount_requested_zmw')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Annual Gratuity Amount Accrued (ZMW) *
                </label>
                <input
                  type="number"
                  data-field="annual_gratuity_accrued_zmw"
                  min={1}
                  value={payload.annual_gratuity_accrued_zmw || ''}
                  onChange={(e) => updateField('annual_gratuity_accrued_zmw', Number(e.target.value))}
                  className={getInputClass('annual_gratuity_accrued_zmw', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="Total accrued gratuity to date"
                />
                {renderFieldError('annual_gratuity_accrued_zmw')}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Requesting an Advance *
                </label>
                <textarea
                  rows={3}
                  data-field="reason"
                  value={payload.reason || ''}
                  onChange={(e) => updateField('reason', e.target.value)}
                  className={getInputClass('reason', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="State detailed reason for gratuity advance..."
                />
                {renderFieldError('reason')}
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
              <strong>Approval Chain:</strong> Supervisor / Head Teacher &rarr; HR Manager (Accrual Verification) &rarr; Finance Manager (Authorisation & Disbursement).
            </div>
          </div>
        );

      case 'BANK_CHANGE': {
        const transferType = payload.transfer_type || 'ZMW_DOMESTIC';
        return (
          <div className="space-y-6">
            {/* Section 1: Staff Personal Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                1. Staff Particulars (As in NRC / Passport)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Department / Site *
                  </label>
                  <input
                    type="text"
                    data-field="dept_or_site"
                    value={payload.dept_or_site ?? payload.dept_or_school ?? ''}
                    onChange={(e) => {
                      updateField('dept_or_site', e.target.value);
                      updateField('dept_or_school', e.target.value);
                    }}
                    className={getInputClass('dept_or_site', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('dept_or_site')}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    data-field="phone"
                    value={payload.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className={getInputClass('phone', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('phone')}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    data-field="date_of_birth"
                    value={payload.date_of_birth || ''}
                    onChange={(e) => updateField('date_of_birth', e.target.value)}
                    className={getInputClass('date_of_birth', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('date_of_birth')}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Marital Status *
                  </label>
                  <select
                    value={payload.marital_status || 'Single'}
                    onChange={(e) => updateField('marital_status', e.target.value)}
                    className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    NRC / Passport # *
                  </label>
                  <input
                    type="text"
                    data-field="nrc_or_passport"
                    value={payload.nrc_or_passport || ''}
                    onChange={(e) => updateField('nrc_or_passport', e.target.value)}
                    placeholder="e.g. 123456/10/1 or ZM123456"
                    className={getInputClass('nrc_or_passport', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('nrc_or_passport')}
                </div>
              </div>
            </div>

            {/* Section 2: Previous Bank Details & Bank Clearance */}
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                2. Previous Bank Details (Direct Salary Payment Change)
              </span>
              <p className="text-[11px] text-slate-600">
                I wish to change my Bank Account Details (for direct payment of salary) from:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Previous Bank Name *
                  </label>
                  <input
                    type="text"
                    data-field="old_bank_name"
                    value={payload.old_bank_name || ''}
                    onChange={(e) => {
                      updateField('old_bank_name', e.target.value);
                      if (!payload.bank_name) updateField('bank_name', e.target.value);
                    }}
                    placeholder="e.g., Barclays / Absa Bank"
                    className={getInputClass('old_bank_name', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('old_bank_name')}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Previous Bank Account Number *
                  </label>
                  <input
                    type="text"
                    data-field="old_account_number"
                    value={payload.old_account_number || ''}
                    onChange={(e) => {
                      updateField('old_account_number', e.target.value);
                      if (!payload.account_number) updateField('account_number', e.target.value);
                    }}
                    className={getInputClass('old_account_number', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('old_account_number')}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Bank Manager Name (Bank Clearance / No-Objection)
                  </label>
                  <input
                    type="text"
                    value={payload.old_bank_manager_name || ''}
                    onChange={(e) => updateField('old_bank_manager_name', e.target.value)}
                    placeholder="Name of Bank Manager issuing clearance"
                    className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Clearance Date
                  </label>
                  <input
                    type="date"
                    value={payload.old_bank_clearance_date || ''}
                    onChange={(e) => updateField('old_bank_clearance_date', e.target.value)}
                    className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: New Account Type & Details */}
            <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
                    3. New Salary Account Details
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Request that my salary be paid into the account below:
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('transfer_type', 'ZMW_DOMESTIC')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                      transferType === 'ZMW_DOMESTIC'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    ZMW Domestic Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('transfer_type', 'INTERNATIONAL')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                      transferType === 'INTERNATIONAL'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    International Transfer
                  </button>
                </div>
              </div>

              {transferType === 'ZMW_DOMESTIC' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      data-field="zmw_bank_name"
                      value={payload.zmw_bank_name || ''}
                      onChange={(e) => {
                        updateField('zmw_bank_name', e.target.value);
                        updateField('bank_name', e.target.value);
                      }}
                      placeholder="e.g., Stanbic Bank Zambia"
                      className={getInputClass('zmw_bank_name', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('zmw_bank_name')}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Branch Name *
                    </label>
                    <input
                      type="text"
                      data-field="zmw_branch_name"
                      value={payload.zmw_branch_name || ''}
                      onChange={(e) => {
                        updateField('zmw_branch_name', e.target.value);
                        updateField('branch_name', e.target.value);
                      }}
                      placeholder="e.g., Solwezi Branch"
                      className={getInputClass('zmw_branch_name', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('zmw_branch_name')}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Branch Sort Code
                    </label>
                    <input
                      type="text"
                      value={payload.zmw_branch_sort_code || ''}
                      onChange={(e) => {
                        updateField('zmw_branch_sort_code', e.target.value);
                        updateField('branch_code', e.target.value);
                      }}
                      placeholder="e.g., 040012"
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Account Name *
                    </label>
                    <input
                      type="text"
                      data-field="zmw_account_name"
                      value={payload.zmw_account_name || ''}
                      onChange={(e) => updateField('zmw_account_name', e.target.value)}
                      placeholder="Name as registered on account"
                      className={getInputClass('zmw_account_name', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('zmw_account_name')}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      data-field="zmw_account_number"
                      value={payload.zmw_account_number || ''}
                      onChange={(e) => {
                        updateField('zmw_account_number', e.target.value);
                        updateField('account_number', e.target.value);
                      }}
                      placeholder="e.g., 913000..."
                      className={getInputClass('zmw_account_number', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs font-mono')}
                    />
                    {renderFieldError('zmw_account_number')}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Account Name *
                    </label>
                    <input
                      type="text"
                      data-field="intl_account_name"
                      value={payload.intl_account_name || ''}
                      onChange={(e) => updateField('intl_account_name', e.target.value)}
                      className={getInputClass('intl_account_name', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('intl_account_name')}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Branch Sort Code
                    </label>
                    <input
                      type="text"
                      value={payload.intl_branch_sort_code || ''}
                      onChange={(e) => updateField('intl_branch_sort_code', e.target.value)}
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      data-field="intl_account_number"
                      value={payload.intl_account_number || ''}
                      onChange={(e) => {
                        updateField('intl_account_number', e.target.value);
                        updateField('account_number', e.target.value);
                      }}
                      className={getInputClass('intl_account_number', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs font-mono')}
                    />
                    {renderFieldError('intl_account_number')}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      IBAN *
                    </label>
                    <input
                      type="text"
                      data-field="intl_iban"
                      value={payload.intl_iban || ''}
                      onChange={(e) => updateField('intl_iban', e.target.value)}
                      placeholder="e.g. GB29NWBK60161331926819"
                      className={getInputClass('intl_iban', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs font-mono')}
                    />
                    {renderFieldError('intl_iban')}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      BIC / SWIFT *
                    </label>
                    <input
                      type="text"
                      data-field="intl_bic"
                      value={payload.intl_bic || ''}
                      onChange={(e) => updateField('intl_bic', e.target.value)}
                      placeholder="e.g. NWBKGB2L"
                      className={getInputClass('intl_bic', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs font-mono')}
                    />
                    {renderFieldError('intl_bic')}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Account Currency *
                    </label>
                    <input
                      type="text"
                      data-field="intl_account_currency"
                      value={payload.intl_account_currency || 'USD'}
                      onChange={(e) => updateField('intl_account_currency', e.target.value)}
                      placeholder="USD / GBP / EUR / ZAR"
                      className={getInputClass('intl_account_currency', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('intl_account_currency')}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      data-field="intl_bank_name"
                      value={payload.intl_bank_name || ''}
                      onChange={(e) => {
                        updateField('intl_bank_name', e.target.value);
                        updateField('bank_name', e.target.value);
                      }}
                      className={getInputClass('intl_bank_name', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('intl_bank_name')}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Bank Address
                    </label>
                    <input
                      type="text"
                      value={payload.intl_bank_address || ''}
                      onChange={(e) => updateField('intl_bank_address', e.target.value)}
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Beneficiary Address
                    </label>
                    <input
                      type="text"
                      value={payload.intl_beneficiary_address || ''}
                      onChange={(e) => updateField('intl_beneficiary_address', e.target.value)}
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={payload.intl_city || ''}
                      onChange={(e) => updateField('intl_city', e.target.value)}
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      State / Province
                    </label>
                    <input
                      type="text"
                      value={payload.intl_state || ''}
                      onChange={(e) => updateField('intl_state', e.target.value)}
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Country *
                    </label>
                    <input
                      type="text"
                      data-field="intl_country"
                      value={payload.intl_country || ''}
                      onChange={(e) => updateField('intl_country', e.target.value)}
                      className={getInputClass('intl_country', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('intl_country')}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'PROF_DEV': {
        const trainingCost = Number(payload.training_costs_zmw || 0);
        const travelExp = Number(payload.travel_expenses_zmw || 0);
        const totalProfDevCost = trainingCost + travelExp;

        const updateProfDevCosts = (trCost: number, tvCost: number) => {
          const tot = trCost + tvCost;
          setPayload((prev) => ({
            ...prev,
            training_costs_zmw: trCost,
            travel_expenses_zmw: tvCost,
            total_costs_zmw: tot,
            cost_zmw: tot,
          }));
          clearFieldError('training_costs_zmw');
        };

        return (
          <div className="space-y-4">
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">Applicant: <strong>{currentUser?.full_name}</strong></span>
              <span className="text-slate-600">Employee #: <strong>{currentUser?.employee_number}</strong></span>
              <span className="text-slate-600">Site: <strong>{currentUser?.site_name}</strong></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Position *
                </label>
                <input
                  type="text"
                  data-field="position"
                  value={payload.position || ''}
                  onChange={(e) => updateField('position', e.target.value)}
                  className={getInputClass('position', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="e.g., Mathematics Teacher"
                />
                {renderFieldError('position')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Training Provider / Location *
                </label>
                <input
                  type="text"
                  data-field="training_provider_location"
                  value={payload.training_provider_location || ''}
                  onChange={(e) => {
                    updateField('training_provider_location', e.target.value);
                    updateField('provider', e.target.value);
                  }}
                  className={getInputClass('training_provider_location', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="e.g., Cambridge Assessment / Lusaka"
                />
                {renderFieldError('training_provider_location')}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description of Professional Development *
                </label>
                <textarea
                  rows={3}
                  data-field="description"
                  value={payload.description || ''}
                  onChange={(e) => {
                    updateField('description', e.target.value);
                    updateField('course_title', e.target.value);
                  }}
                  className={getInputClass('description', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="Details of the professional development course, workshop, or qualification..."
                />
                {renderFieldError('description')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Day(s) and Date(s) of Course or Training *
                </label>
                <input
                  type="text"
                  data-field="course_days_and_dates"
                  value={payload.course_days_and_dates || ''}
                  onChange={(e) => {
                    updateField('course_days_and_dates', e.target.value);
                    updateField('start_date', e.target.value);
                  }}
                  placeholder="e.g., 5 Days (12th - 16th May 2026)"
                  className={getInputClass('course_days_and_dates', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('course_days_and_dates')}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Outcomes of the Training / Course *
                </label>
                <textarea
                  rows={3}
                  data-field="expected_outcomes"
                  value={payload.expected_outcomes || ''}
                  onChange={(e) => {
                    updateField('expected_outcomes', e.target.value);
                    updateField('justification', e.target.value);
                  }}
                  className={getInputClass('expected_outcomes', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="Expected impact on teaching delivery, curriculum enhancement, and student outcomes..."
                />
                {renderFieldError('expected_outcomes')}
              </div>

              {/* Cost Breakdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Training Costs (ZMW) *
                </label>
                <input
                  type="number"
                  data-field="training_costs_zmw"
                  min={0}
                  value={payload.training_costs_zmw || ''}
                  onChange={(e) => updateProfDevCosts(Number(e.target.value), travelExp)}
                  className={getInputClass('training_costs_zmw', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="Tuition / Registration fee"
                />
                {renderFieldError('training_costs_zmw')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Travel Expenses (ZMW)
                </label>
                <input
                  type="number"
                  min={0}
                  value={payload.travel_expenses_zmw || ''}
                  onChange={(e) => updateProfDevCosts(trainingCost, Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Transport, meals & accommodation"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(payload.details_attached)}
                  onChange={(e) => updateField('details_attached', e.target.checked)}
                />
                Details / Course Brochure Attached
              </label>
              <div className="text-right">
                <span className="text-slate-500 block">Total Costs:</span>
                <span className="text-sm font-bold text-blue-700">
                  ZMW {totalProfDevCost.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
              <strong>Evaluation Criteria:</strong> The Supervisor evaluates Expected Impact/Effectiveness for Educore Services (Very High / High / Medium / Low / Very Low), followed by HRM recommendation and Executive Head approval.
            </div>
          </div>
        );
      }

      case 'CONTRACT_RENEWAL': {
        const reasons: string[] = Array.isArray(payload.renewal_reasons)
          ? payload.renewal_reasons
          : ['', '', ''];

        const updateReason = (idx: number, val: string) => {
          const next = [...reasons];
          next[idx] = val;
          updateField('renewal_reasons', next);
          clearFieldError('renewal_reasons');
        };

        return (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Notice:</strong> Please do not discuss or confirm contract renewal or non-renewal with the staff member until HR has confirmed receipt and agreement with the decision stated on the form.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Staff Name *
                </label>
                <input
                  type="text"
                  data-field="staff_name"
                  value={payload.staff_name || ''}
                  onChange={(e) => updateField('staff_name', e.target.value)}
                  className={getInputClass('staff_name', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('staff_name')}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Position *
                </label>
                <input
                  type="text"
                  data-field="position"
                  value={payload.position || ''}
                  onChange={(e) => updateField('position', e.target.value)}
                  className={getInputClass('position', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('position')}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supervisor *
                </label>
                <input
                  type="text"
                  data-field="supervisor_name"
                  value={payload.supervisor_name || ''}
                  onChange={(e) => updateField('supervisor_name', e.target.value)}
                  className={getInputClass('supervisor_name', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('supervisor_name')}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  School / Department *
                </label>
                <input
                  type="text"
                  data-field="school_or_department"
                  value={payload.school_or_department ?? payload.site_or_department ?? ''}
                  onChange={(e) => {
                    updateField('school_or_department', e.target.value);
                    updateField('site_or_department', e.target.value);
                  }}
                  className={getInputClass('school_or_department', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('school_or_department')}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contract Start Date *
                </label>
                <input
                  type="date"
                  data-field="contract_start_date"
                  value={payload.contract_start_date || ''}
                  onChange={(e) => updateField('contract_start_date', e.target.value)}
                  className={getInputClass('contract_start_date', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('contract_start_date')}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contract End Date *
                </label>
                <input
                  type="date"
                  data-field="contract_end_date"
                  value={payload.contract_end_date ?? payload.current_contract_end_date ?? ''}
                  onChange={(e) => {
                    updateField('contract_end_date', e.target.value);
                    updateField('current_contract_end_date', e.target.value);
                  }}
                  className={getInputClass('contract_end_date', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('contract_end_date')}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Contract to be Renewed? *
              </label>
              <div className="flex gap-4" data-field="contract_to_be_renewed">
                {(['YES', 'NO'] as const).map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      updateField('contract_to_be_renewed', opt);
                      clearFieldError('contract_to_be_renewed');
                    }}
                    className={`px-5 py-2 rounded-lg text-xs font-bold border transition ${
                      (payload.contract_to_be_renewed || 'YES') === opt
                        ? opt === 'YES' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {opt === 'YES' ? 'Yes, Renew Contract' : 'No, Do Not Renew'}
                  </button>
                ))}
              </div>
              {renderFieldError('contract_to_be_renewed')}
            </div>

            <div className="space-y-3" data-field="renewal_reasons">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Reasons for Contract Renewal / Non-Renewal *
                </label>
                <span className="text-[11px] text-slate-500 block mb-2">
                  As a general rule, the Head bases this decision on the staff member's targets for development (as specified in the Personal Target Setting Form) and progress made against these:
                </span>
              </div>
              {renderFieldError('renewal_reasons')}
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-xs font-bold text-slate-500 pt-2 w-5">{idx + 1}.</span>
                  <input
                    type="text"
                    value={reasons[idx] || ''}
                    onChange={(e) => updateReason(idx, e.target.value)}
                    placeholder={`Progress against development target #${idx + 1}...`}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Performance Assessment Attached? *
                </label>
                <select
                  value={payload.performance_assessment_attached || 'YES'}
                  onChange={(e) => updateField('performance_assessment_attached', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="YES">Yes, Attached</option>
                  <option value="NO">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Performance Assessment Remarks
                </label>
                <input
                  type="text"
                  value={payload.performance_remarks || ''}
                  onChange={(e) => updateField('performance_remarks', e.target.value)}
                  placeholder="Additional remarks regarding assessment"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        );
      }

      case 'EXCULPATORY':
        return (
          <div className="space-y-5">
            {/* Accused Particulars */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Accused Employee Details
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div data-field="accused_name">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Name of the Accused *
                  </label>
                  <input
                    type="text"
                    value={payload.accused_name || ''}
                    onChange={(e) => {
                      updateField('accused_name', e.target.value);
                      clearFieldError('accused_name');
                    }}
                    className={getInputClass('accused_name', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('accused_name')}
                </div>
                <div data-field="accused_position">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Position *
                  </label>
                  <input
                    type="text"
                    value={payload.accused_position || ''}
                    onChange={(e) => {
                      updateField('accused_position', e.target.value);
                      clearFieldError('accused_position');
                    }}
                    className={getInputClass('accused_position', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('accused_position')}
                </div>
                <div data-field="accused_employee_number">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee Number / Man No. *
                  </label>
                  <input
                    type="text"
                    value={payload.accused_employee_number || ''}
                    onChange={(e) => {
                      updateField('accused_employee_number', e.target.value);
                      clearFieldError('accused_employee_number');
                    }}
                    className={getInputClass('accused_employee_number', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('accused_employee_number')}
                </div>
                <div data-field="dept_or_school">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dept / School (Site) *
                  </label>
                  <input
                    type="text"
                    value={payload.dept_or_school ?? payload.dept_or_site ?? ''}
                    onChange={(e) => {
                      updateField('dept_or_school', e.target.value);
                      updateField('dept_or_site', e.target.value);
                      clearFieldError('dept_or_school');
                    }}
                    className={getInputClass('dept_or_school', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('dept_or_school')}
                </div>
              </div>
            </div>

            {/* Charging Officer Particulars */}
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                Charging Officer Particulars
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div data-field="charging_officer_name">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Name of Charging Officer *
                  </label>
                  <input
                    type="text"
                    value={payload.charging_officer_name || ''}
                    onChange={(e) => {
                      updateField('charging_officer_name', e.target.value);
                      clearFieldError('charging_officer_name');
                    }}
                    className={getInputClass('charging_officer_name', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('charging_officer_name')}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={payload.charging_officer_position || ''}
                    onChange={(e) => updateField('charging_officer_position', e.target.value)}
                    className="w-full bg-white border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div data-field="date_of_charge">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Charge *
                  </label>
                  <input
                    type="date"
                    value={payload.date_of_charge ?? payload.incident_date ?? ''}
                    onChange={(e) => {
                      updateField('date_of_charge', e.target.value);
                      updateField('incident_date', e.target.value);
                      clearFieldError('date_of_charge');
                    }}
                    className={getInputClass('date_of_charge', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('date_of_charge')}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div data-field="offence_description">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  1. Exculpatory Statement Against the Offence Of: *
                </label>
                <textarea
                  rows={2}
                  value={payload.offence_description ?? payload.charge_reference ?? ''}
                  onChange={(e) => {
                    updateField('offence_description', e.target.value);
                    updateField('charge_reference', e.target.value);
                    clearFieldError('offence_description');
                  }}
                  className={getInputClass('offence_description', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="Specify the exact disciplinary charge or alleged offence..."
                />
                {renderFieldError('offence_description')}
              </div>

              <div data-field="employee_statement">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  2. Statement *
                </label>
                <textarea
                  rows={6}
                  value={payload.employee_statement || ''}
                  onChange={(e) => {
                    updateField('employee_statement', e.target.value);
                    clearFieldError('employee_statement');
                  }}
                  className={getInputClass('employee_statement', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="Detail your complete statement, mitigating factors, and exculpatory facts in response to the charge..."
                />
                {renderFieldError('employee_statement')}
              </div>
            </div>
          </div>
        );

      case 'MANPOWER_REQ': {
        const vacancyType = payload.vacancy_type || 'NEW_POSITION';
        return (
          <div className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                1. Requisition Header & Vacancy Details
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div data-field="position_requested">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Position Requested For *
                  </label>
                  <input
                    type="text"
                    value={payload.position_requested ?? payload.position_title ?? ''}
                    onChange={(e) => {
                      updateField('position_requested', e.target.value);
                      updateField('position_title', e.target.value);
                      clearFieldError('position_requested');
                    }}
                    placeholder="e.g. Science Teacher (IGCSE Physics)"
                    className={getInputClass('position_requested', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('position_requested')}
                </div>
                <div data-field="number_of_staff_required">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Staff Required *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={payload.number_of_staff_required ?? payload.headcount ?? 1}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateField('number_of_staff_required', val);
                      updateField('headcount', val);
                      clearFieldError('number_of_staff_required');
                    }}
                    className={getInputClass('number_of_staff_required', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('number_of_staff_required')}
                </div>
                <div data-field="required_start_date">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Required Start of Employment *
                  </label>
                  <input
                    type="date"
                    value={payload.required_start_date ?? payload.target_start_date ?? ''}
                    onChange={(e) => {
                      updateField('required_start_date', e.target.value);
                      updateField('target_start_date', e.target.value);
                      clearFieldError('required_start_date');
                    }}
                    className={getInputClass('required_start_date', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('required_start_date')}
                </div>
              </div>
            </div>

            {/* Vacancy Origin */}
            <div data-field="vacancy_type" className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                The Vacancy Has Arisen Due To: *
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    updateField('vacancy_type', 'REPLACEMENT');
                    clearFieldError('vacancy_type');
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition ${
                    vacancyType === 'REPLACEMENT'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  a) Replacement of Staff
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateField('vacancy_type', 'NEW_POSITION');
                    clearFieldError('vacancy_type');
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition ${
                    vacancyType === 'NEW_POSITION'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  b) New Position
                </button>
              </div>
              {renderFieldError('vacancy_type')}

              {vacancyType === 'REPLACEMENT' ? (
                <div data-field="replacement_of_person">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Replacement of (Staff Name / Former Incumbent) *
                  </label>
                  <input
                    type="text"
                    value={payload.replacement_of_person || ''}
                    onChange={(e) => {
                      updateField('replacement_of_person', e.target.value);
                      clearFieldError('replacement_of_person');
                    }}
                    placeholder="Enter full name of departing staff member"
                    className={getInputClass('replacement_of_person', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('replacement_of_person')}
                </div>
              ) : (
                <div data-field="new_position_reason">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    New Position Due To (Justification / Enrolment Growth) *
                  </label>
                  <input
                    type="text"
                    value={payload.new_position_reason ?? payload.justification ?? ''}
                    onChange={(e) => {
                      updateField('new_position_reason', e.target.value);
                      updateField('justification', e.target.value);
                      clearFieldError('new_position_reason');
                    }}
                    placeholder="State reason for new headcount..."
                    className={getInputClass('new_position_reason', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('new_position_reason')}
                </div>
              )}
            </div>

            {/* Budget & Qualifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  State Whether or Not Position is Budgeted For *
                </label>
                <select
                  value={payload.is_budgeted || 'YES'}
                  onChange={(e) => updateField('is_budgeted', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="YES">Yes, Budgeted</option>
                  <option value="NO">No, Unbudgeted</option>
                </select>
              </div>
              <div data-field="reports_to">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  The Job Holder Reports To *
                </label>
                <input
                  type="text"
                  value={payload.reports_to || ''}
                  onChange={(e) => {
                    updateField('reports_to', e.target.value);
                    clearFieldError('reports_to');
                  }}
                  placeholder="e.g. Head Teacher / Head of Department"
                  className={getInputClass('reports_to', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('reports_to')}
              </div>

              <div data-field="consequences_of_failure_to_fill" className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Consequences of Failure to Fill the Vacancy *
                </label>
                <textarea
                  rows={2}
                  value={payload.consequences_of_failure_to_fill || ''}
                  onChange={(e) => {
                    updateField('consequences_of_failure_to_fill', e.target.value);
                    clearFieldError('consequences_of_failure_to_fill');
                  }}
                  className={getInputClass('consequences_of_failure_to_fill', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="Operational disruption, compliance breach, timetable uncoverage..."
                />
                {renderFieldError('consequences_of_failure_to_fill')}
              </div>

              <div data-field="professional_qualifications_required">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Professional Qualifications Required *
                </label>
                <textarea
                  rows={2}
                  value={payload.professional_qualifications_required || ''}
                  onChange={(e) => {
                    updateField('professional_qualifications_required', e.target.value);
                    clearFieldError('professional_qualifications_required');
                  }}
                  className={getInputClass('professional_qualifications_required', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="e.g. Bachelor of Science in Physics with Education, TCZ Registered"
                />
                {renderFieldError('professional_qualifications_required')}
              </div>

              <div data-field="relevant_field_experience_required">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Relevant Field Experience Required *
                </label>
                <textarea
                  rows={2}
                  value={payload.relevant_field_experience_required || ''}
                  onChange={(e) => {
                    updateField('relevant_field_experience_required', e.target.value);
                    clearFieldError('relevant_field_experience_required');
                  }}
                  className={getInputClass('relevant_field_experience_required', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="e.g. Minimum 3 years teaching Cambridge IGCSE syllabus"
                />
                {renderFieldError('relevant_field_experience_required')}
              </div>

              <div data-field="job_description_summary" className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Summary of the Job Description / Job *
                </label>
                <textarea
                  rows={2}
                  value={payload.job_description_summary || ''}
                  onChange={(e) => {
                    updateField('job_description_summary', e.target.value);
                    clearFieldError('job_description_summary');
                  }}
                  className={getInputClass('job_description_summary', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('job_description_summary')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job Description Attached *
                </label>
                <select
                  value={payload.job_description_attached || 'ATTACHED'}
                  onChange={(e) => updateField('job_description_attached', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="ATTACHED">Attached</option>
                  <option value="NOT_ATTACHED">Not Attached</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Source of Recruitment
                </label>
                <input
                  type="text"
                  value={payload.preferred_recruitment_source || ''}
                  onChange={(e) => updateField('preferred_recruitment_source', e.target.value)}
                  placeholder="e.g. Internal advert, Educore portal, LinkedIn, Agency"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div data-field="required_contract_period">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Required Contract Period *
                </label>
                <input
                  type="text"
                  value={payload.required_contract_period || ''}
                  onChange={(e) => {
                    updateField('required_contract_period', e.target.value);
                    clearFieldError('required_contract_period');
                  }}
                  placeholder="e.g. 2 Years Fixed-Term / Permanent"
                  className={getInputClass('required_contract_period', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('required_contract_period')}
              </div>

              <div data-field="salary_recommendation_zmw">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Salary Recommendation (Based on defined salary scale) *
                </label>
                <input
                  type="text"
                  value={payload.salary_recommendation_zmw || ''}
                  onChange={(e) => {
                    updateField('salary_recommendation_zmw', e.target.value);
                    clearFieldError('salary_recommendation_zmw');
                  }}
                  placeholder="e.g. Band 4 / ZMW 25,000"
                  className={getInputClass('salary_recommendation_zmw', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('salary_recommendation_zmw')}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Any Other Benefits (Based on ES benefit structure)
                </label>
                <input
                  type="text"
                  value={payload.other_benefits || ''}
                  onChange={(e) => updateField('other_benefits', e.target.value)}
                  placeholder="e.g. Subsidised staff housing, Edu-Health membership, child tuition rebate"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  value={payload.remarks || ''}
                  onChange={(e) => updateField('remarks', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Any additional remarks or hiring timelines..."
                />
              </div>
            </div>
          </div>
        );
      }

      case 'EVENT_COMPLETION':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div data-field="sites">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Site(s) *
                </label>
                <input
                  type="text"
                  value={payload.sites ?? payload.schools ?? ''}
                  onChange={(e) => {
                    updateField('sites', e.target.value);
                    updateField('schools', e.target.value);
                    clearFieldError('sites');
                  }}
                  className={getInputClass('sites', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('sites')}
              </div>
              <div data-field="event_name">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={payload.event_name || ''}
                  onChange={(e) => {
                    updateField('event_name', e.target.value);
                    clearFieldError('event_name');
                  }}
                  className={getInputClass('event_name', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('event_name')}
              </div>
              <div data-field="event_type">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type of Event *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Sports Tournament, Academic Fair, Camp"
                  value={payload.event_type || ''}
                  onChange={(e) => {
                    updateField('event_type', e.target.value);
                    clearFieldError('event_type');
                  }}
                  className={getInputClass('event_type', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('event_type')}
              </div>
              <div data-field="event_coordinator">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Coordinator *
                </label>
                <input
                  type="text"
                  value={payload.event_coordinator || ''}
                  onChange={(e) => {
                    updateField('event_coordinator', e.target.value);
                    clearFieldError('event_coordinator');
                  }}
                  className={getInputClass('event_coordinator', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('event_coordinator')}
              </div>
              <div data-field="file_number">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  File Number *
                </label>
                <input
                  type="text"
                  value={payload.file_number || ''}
                  onChange={(e) => {
                    updateField('file_number', e.target.value);
                    clearFieldError('file_number');
                  }}
                  className={getInputClass('file_number', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('file_number')}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div data-field="file_open_date">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    File Open Date *
                  </label>
                  <input
                    type="date"
                    value={payload.file_open_date || ''}
                    onChange={(e) => {
                      updateField('file_open_date', e.target.value);
                      clearFieldError('file_open_date');
                    }}
                    className={getInputClass('file_open_date', 'w-full border rounded-lg px-2.5 py-2 text-xs')}
                  />
                  {renderFieldError('file_open_date')}
                </div>
                <div data-field="event_date">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Event *
                  </label>
                  <input
                    type="date"
                    value={payload.event_date || ''}
                    onChange={(e) => {
                      updateField('event_date', e.target.value);
                      clearFieldError('event_date');
                    }}
                    className={getInputClass('event_date', 'w-full border rounded-lg px-2.5 py-2 text-xs')}
                  />
                  {renderFieldError('event_date')}
                </div>
              </div>
            </div>

            <div data-field="coordinator_confirmed" className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-slate-700 space-y-2">
              <p className="leading-relaxed">
                "I confirm that the event costings were prepared, agreed on with finance and communicated by the site with all billing parties (if rechargeable) involved. All necessary documents have been handed in to finance and the event was completed successfully. I further confirm that all Purchase Requisitions (PR) for this event were submitted to the Procurement department."
              </p>
              <label className="flex items-center gap-2 font-bold text-slate-900 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={Boolean(payload.coordinator_confirmed)}
                  onChange={(e) => {
                    updateField('coordinator_confirmed', e.target.checked);
                    clearFieldError('coordinator_confirmed');
                  }}
                />
                I confirm the above Event Coordinator declaration
              </label>
              {renderFieldError('coordinator_confirmed')}
            </div>
          </div>
        );

      case 'STOCK_RETURN': {
        const items: any[] = payload.items || [];
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div data-field="location">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Site / Location *
                </label>
                <input
                  type="text"
                  value={payload.location || ''}
                  onChange={(e) => {
                    updateField('location', e.target.value);
                    clearFieldError('location');
                  }}
                  className={getInputClass('location', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('location')}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recommended Inventory Action
                </label>
                <select
                  value={payload.inventory_action || 'RETURN_TO_STOCK'}
                  onChange={(e) => updateField('inventory_action', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="RETURN_TO_STOCK">Return to Stock</option>
                  <option value="RETURN_TO_SUPPLIER">Return to Supplier</option>
                  <option value="DISPOSAL">Disposal</option>
                  <option value="SEND_FOR_REPAIR">Send for Repair / Maintenance</option>
                  <option value="NO_ACTION">No Action Required</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              {payload.inventory_action === 'OTHER' && (
                <div data-field="inventory_action_other" className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specify Other Inventory Action *
                  </label>
                  <input
                    type="text"
                    value={payload.inventory_action_other || ''}
                    onChange={(e) => {
                      updateField('inventory_action_other', e.target.value);
                      clearFieldError('inventory_action_other');
                    }}
                    placeholder="Specify custom inventory disposition..."
                    className={getInputClass('inventory_action_other', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('inventory_action_other')}
                </div>
              )}
              <div data-field="return_reason" className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Return *
                </label>
                <textarea
                  rows={2}
                  value={payload.return_reason || ''}
                  onChange={(e) => {
                    updateField('return_reason', e.target.value);
                    clearFieldError('return_reason');
                  }}
                  className={getInputClass('return_reason', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('return_reason')}
              </div>
            </div>

            <div data-field="items" className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">
                  Returned Stock Items (No., Item, Unit, Qty, Condition, Remarks) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    updateField('items', [
                      ...items,
                      { item: '', unit: 'EA', qty: 1, condition: 'GOOD', remarks: '' },
                    ]);
                    clearFieldError('items');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>
              {renderFieldError('items')}

              {items.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4" data-field={`item_${idx}_item`}>
                    <input
                      type="text"
                      placeholder="Item description *"
                      value={row.item}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...row, item: e.target.value };
                        updateField('items', next);
                        clearFieldError(`item_${idx}_item`);
                        clearFieldError('items');
                      }}
                      className={getInputClass(`item_${idx}_item`, 'w-full border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError(`item_${idx}_item`)}
                  </div>
                  <input
                    type="text"
                    placeholder="Unit"
                    value={row.unit}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, unit: e.target.value };
                      updateField('items', next);
                    }}
                    className="col-span-1 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <div className="col-span-2" data-field={`item_${idx}_qty`}>
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={row.qty}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...row, qty: Number(e.target.value) };
                        updateField('items', next);
                        clearFieldError(`item_${idx}_qty`);
                        clearFieldError('items');
                      }}
                      className={getInputClass(`item_${idx}_qty`, 'w-full border rounded-lg px-2 py-1.5 text-xs')}
                    />
                    {renderFieldError(`item_${idx}_qty`)}
                  </div>
                  <select
                    value={row.condition}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, condition: e.target.value };
                      updateField('items', next);
                    }}
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  >
                    <option value="GOOD">Good</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="DEFECTIVE">Defective</option>
                    <option value="INCORRECT_ITEM">Incorrect Item</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Remarks"
                    value={row.remarks || ''}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, remarks: e.target.value };
                      updateField('items', next);
                    }}
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={items.length <= 1}
                    onClick={() => updateField('items', items.filter((_, i) => i !== idx))}
                    className="col-span-1 text-red-500 hover:text-red-700 disabled:opacity-30 flex justify-center pt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'STORES_REQ': {
        const items: any[] = payload.items || [];
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div data-field="school">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  School / Site *
                </label>
                <input
                  type="text"
                  value={payload.school || payload.site || ''}
                  onChange={(e) => {
                    updateField('school', e.target.value);
                    updateField('site', e.target.value);
                    clearFieldError('school');
                  }}
                  className={getInputClass('school', 'w-full border rounded-lg px-3 py-2 text-sm')}
                  placeholder="e.g. Sentinel Kalumbila"
                />
                {renderFieldError('school')}
              </div>
              <div data-field="department">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department *
                </label>
                <input
                  type="text"
                  value={payload.department || ''}
                  onChange={(e) => {
                    updateField('department', e.target.value);
                    clearFieldError('department');
                  }}
                  className={getInputClass('department', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('department')}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purchase Order No. (If applicable)
                </label>
                <input
                  type="text"
                  value={payload.purchase_order_no || ''}
                  onChange={(e) => updateField('purchase_order_no', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div data-field="purpose">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose *
                </label>
                <input
                  type="text"
                  value={payload.purpose || ''}
                  onChange={(e) => {
                    updateField('purpose', e.target.value);
                    clearFieldError('purpose');
                  }}
                  className={getInputClass('purpose', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('purpose')}
              </div>
            </div>

            <div data-field="items" className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">
                  Ordered Items to Issue (Description, Qty Req., Additional Information) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    updateField('items', [
                      ...items,
                      { description: '', qty_requested: 1, additional_info: '' },
                    ]);
                    clearFieldError('items');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>
              {renderFieldError('items')}

              {items.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <span className="col-span-1 text-xs font-mono text-slate-400 text-center pt-2">
                    #{idx + 1}
                  </span>
                  <div className="col-span-5" data-field={`item_${idx}_description`}>
                    <input
                      type="text"
                      placeholder="Item Description *"
                      value={row.description}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...row, description: e.target.value };
                        updateField('items', next);
                        clearFieldError(`item_${idx}_description`);
                        clearFieldError('items');
                      }}
                      className={getInputClass(`item_${idx}_description`, 'w-full border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError(`item_${idx}_description`)}
                  </div>
                  <div className="col-span-2" data-field={`item_${idx}_qty_requested`}>
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty Req"
                      value={row.qty_requested}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...row, qty_requested: Number(e.target.value) };
                        updateField('items', next);
                        clearFieldError(`item_${idx}_qty_requested`);
                        clearFieldError('items');
                      }}
                      className={getInputClass(`item_${idx}_qty_requested`, 'w-full border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError(`item_${idx}_qty_requested`)}
                  </div>
                  <input
                    type="text"
                    placeholder="Additional Information"
                    value={row.additional_info || ''}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, additional_info: e.target.value };
                      updateField('items', next);
                    }}
                    className="col-span-3 border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={items.length <= 1}
                    onClick={() => updateField('items', items.filter((_, i) => i !== idx))}
                    className="col-span-1 text-red-500 hover:text-red-700 disabled:opacity-30 flex justify-center pt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'EXPENSE_RETIREMENT': {
        const reqItems: any[] = payload.amounts_requested || [];
        const retItems: any[] = payload.expenses_retired || [];
        const totalReq = reqItems.reduce(
          (sum, r) => sum + Number(r.qty || 0) * Number(r.unit_cost || 0),
          0
        );
        const totalRet = retItems.reduce(
          (sum, r) => sum + Number(r.qty || 0) * Number(r.unit_cost || 0),
          0
        );
        const balance = totalReq - totalRet;

        const recalc = (nextReq: any[], nextRet: any[]) => {
          const tReq = nextReq.reduce(
            (s, r) => s + Number(r.qty || 0) * Number(r.unit_cost || 0),
            0
          );
          const tRet = nextRet.reduce(
            (s, r) => s + Number(r.qty || 0) * Number(r.unit_cost || 0),
            0
          );
          setPayload((prev) => ({
            ...prev,
            amounts_requested: nextReq,
            expenses_retired: nextRet,
            total_requested: tReq,
            total_retired: tRet,
            balance: tReq - tRet,
          }));
        };

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requisition For *
                </label>
                <select
                  value={payload.requisition_type || 'TRAVEL'}
                  onChange={(e) => updateField('requisition_type', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="TRAVEL">Travel</option>
                  <option value="PURCHASE">Purchase</option>
                </select>
              </div>
              <div data-field="cost_centre">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cost Centre *
                </label>
                <input
                  type="text"
                  value={payload.cost_centre || ''}
                  onChange={(e) => {
                    updateField('cost_centre', e.target.value);
                    clearFieldError('cost_centre');
                  }}
                  className={getInputClass('cost_centre', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('cost_centre')}
              </div>
              <div data-field="imprest_recipient">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Imprest Recipient *
                </label>
                <input
                  type="text"
                  value={payload.imprest_recipient || ''}
                  onChange={(e) => {
                    updateField('imprest_recipient', e.target.value);
                    clearFieldError('imprest_recipient');
                  }}
                  className={getInputClass('imprest_recipient', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('imprest_recipient')}
              </div>
              <div data-field="currency">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Currency *
                </label>
                <select
                  value={payload.currency || 'ZMW'}
                  onChange={(e) => {
                    updateField('currency', e.target.value);
                    clearFieldError('currency');
                  }}
                  className={getInputClass('currency', 'w-full border rounded-lg px-3 py-2 text-sm')}
                >
                  <option value="ZMW">ZMW</option>
                  <option value="USD">USD</option>
                  <option value="ZAR">ZAR</option>
                  <option value="EUR">EUR</option>
                </select>
                {renderFieldError('currency')}
              </div>
            </div>

            {/* Table 1: Amounts Requested */}
            <div data-field="amounts_requested" className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800">
                  Part A: Description of Amount(s) Requested (Imprest Advance) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    recalc([...reqItems, { description: '', qty: 1, unit_cost: 0 }], retItems);
                    clearFieldError('amounts_requested');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Advance Line
                </button>
              </div>
              {renderFieldError('amounts_requested')}

              {reqItems.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-6" data-field={`req_${idx}_description`}>
                    <input
                      type="text"
                      placeholder="Description of amount requested *"
                      value={row.description}
                      onChange={(e) => {
                        const next = [...reqItems];
                        next[idx] = { ...row, description: e.target.value };
                        recalc(next, retItems);
                        clearFieldError(`req_${idx}_description`);
                        clearFieldError('amounts_requested');
                      }}
                      className={getInputClass(`req_${idx}_description`, 'w-full border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError(`req_${idx}_description`)}
                  </div>
                  <input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={row.qty}
                    onChange={(e) => {
                      const next = [...reqItems];
                      next[idx] = { ...row, qty: Number(e.target.value) };
                      recalc(next, retItems);
                    }}
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <div className="col-span-3" data-field={`req_${idx}_unit_cost`}>
                    <input
                      type="number"
                      placeholder="Cost/Unit *"
                      value={row.unit_cost}
                      onChange={(e) => {
                        const next = [...reqItems];
                        next[idx] = { ...row, unit_cost: Number(e.target.value) };
                        recalc(next, retItems);
                        clearFieldError(`req_${idx}_unit_cost`);
                        clearFieldError('amounts_requested');
                      }}
                      className={getInputClass(`req_${idx}_unit_cost`, 'w-full border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError(`req_${idx}_unit_cost`)}
                  </div>
                  <button
                    type="button"
                    disabled={reqItems.length <= 1}
                    onClick={() =>
                      recalc(reqItems.filter((_, i) => i !== idx), retItems)
                    }
                    className="col-span-1 text-red-500 flex justify-center pt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Table 2: Expenses Retired */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800">
                  Part B: Description of Actual Expenses Retired (Receipts Attached)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    recalc(reqItems, [...retItems, { description: '', qty: 1, unit_cost: 0 }])
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Expense Line
                </button>
              </div>
              {retItems.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Expense description"
                    value={row.description}
                    onChange={(e) => {
                      const next = [...retItems];
                      next[idx] = { ...row, description: e.target.value };
                      recalc(reqItems, next);
                    }}
                    className="col-span-6 border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={row.qty}
                    onChange={(e) => {
                      const next = [...retItems];
                      next[idx] = { ...row, qty: Number(e.target.value) };
                      recalc(reqItems, next);
                    }}
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Cost/Unit"
                    value={row.unit_cost}
                    onChange={(e) => {
                      const next = [...retItems];
                      next[idx] = { ...row, unit_cost: Number(e.target.value) };
                      recalc(reqItems, next);
                    }}
                    className="col-span-3 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={retItems.length <= 1}
                    onClick={() =>
                      recalc(reqItems, retItems.filter((_, i) => i !== idx))
                    }
                    className="col-span-1 text-red-500 flex justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">Total Requested</span>
                <span className="font-bold text-slate-900">
                  {payload.currency} {totalReq.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Expenses Retired</span>
                <span className="font-bold text-slate-900">
                  {payload.currency} {totalRet.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Balance (To Return / Reimburse)</span>
                <span className="font-bold text-blue-700">
                  {payload.currency} {balance.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-amber-950">Important Educore Policy Note:</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  Failure to retire imprest and all supporting documents within 7 days after termination / completion of the trip or purchase will result in deduction of the balance from the next payroll and disciplinary action may be taken as stipulated in our Code of Conduct.
                </p>
              </div>
            </div>
          </div>
        );
      }

      case 'PURCHASE_REQ': {
        const items: any[] = payload.items || [];
        const totalCost = items.reduce(
          (sum, r) => sum + Number(r.qty || 0) * Number(r.unit_cost || 0),
          0
        );
        const variance = Number(payload.available_budget || 0) - totalCost;

        const updatePrItems = (nextItems: any[], availBudget = payload.available_budget) => {
          const tot = nextItems.reduce(
            (s, r) => s + Number(r.qty || 0) * Number(r.unit_cost || 0),
            0
          );
          setPayload((prev) => ({
            ...prev,
            available_budget: Number(availBudget || 0),
            items: nextItems,
            total_cost: tot,
            variance_to_budget: Number(availBudget || 0) - tot,
          }));
        };

        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div data-field="cost_centre">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cost Centre *
                </label>
                <input
                  type="text"
                  value={payload.cost_centre || ''}
                  onChange={(e) => {
                    updateField('cost_centre', e.target.value);
                    clearFieldError('cost_centre');
                  }}
                  className={getInputClass('cost_centre', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('cost_centre')}
              </div>
              <div data-field="available_budget">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Available Budget *
                </label>
                <input
                  type="number"
                  value={payload.available_budget ?? ''}
                  onChange={(e) => {
                    updatePrItems(items, e.target.value === '' ? '' : Number(e.target.value));
                    clearFieldError('available_budget');
                  }}
                  className={getInputClass('available_budget', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('available_budget')}
              </div>
              <div data-field="currency">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Currency *
                </label>
                <select
                  value={payload.currency || 'ZMW'}
                  onChange={(e) => {
                    updateField('currency', e.target.value);
                    clearFieldError('currency');
                  }}
                  className={getInputClass('currency', 'w-full border rounded-lg px-3 py-2 text-sm')}
                >
                  <option value="ZMW">ZMW</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="ZAR">ZAR</option>
                  <option value="EUR">EUR</option>
                </select>
                {renderFieldError('currency')}
              </div>
              <div data-field="budget_type">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Budget Status *
                </label>
                <select
                  value={payload.budget_type || 'REGULAR_BUDGET'}
                  onChange={(e) => {
                    updateField('budget_type', e.target.value);
                    clearFieldError('budget_type');
                  }}
                  className={getInputClass('budget_type', 'w-full border rounded-lg px-3 py-2 text-sm')}
                >
                  <option value="REGULAR_BUDGET">Regular Budget</option>
                  <option value="OUTSIDE_BUDGET">Outside Budget</option>
                </select>
                {renderFieldError('budget_type')}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recommended Supplier
                </label>
                <input
                  type="text"
                  value={payload.recommended_supplier || ''}
                  onChange={(e) => updateField('recommended_supplier', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Copy To
                </label>
                <input
                  type="text"
                  value={payload.copy_to || ''}
                  onChange={(e) => updateField('copy_to', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div data-field="items" className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800">
                  PR Line Items (Description, Cost Code, Needed By, Qty, Cost/Unit) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    updatePrItems([
                      ...items,
                      { description: '', cost_code: '', needed_by: '', qty: 1, unit_cost: 0 },
                    ]);
                    clearFieldError('items');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                >
                  <Plus className="w-3.5 h-3.5" /> Add PR Line
                </button>
              </div>
              {renderFieldError('items')}

              {items.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4" data-field={`pr_${idx}_description`}>
                    <input
                      type="text"
                      placeholder="Description *"
                      value={row.description}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...row, description: e.target.value };
                        updatePrItems(next);
                        clearFieldError(`pr_${idx}_description`);
                        clearFieldError('items');
                      }}
                      className={getInputClass(`pr_${idx}_description`, 'w-full border rounded-lg px-2 py-1.5 text-xs')}
                    />
                    {renderFieldError(`pr_${idx}_description`)}
                  </div>
                  <div className="col-span-2" data-field={`pr_${idx}_cost_code`}>
                    <input
                      type="text"
                      placeholder="Cost Code *"
                      value={row.cost_code}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...row, cost_code: e.target.value };
                        updatePrItems(next);
                        clearFieldError(`pr_${idx}_cost_code`);
                        clearFieldError('items');
                      }}
                      className={getInputClass(`pr_${idx}_cost_code`, 'w-full border rounded-lg px-2 py-1.5 text-xs')}
                    />
                    {renderFieldError(`pr_${idx}_cost_code`)}
                  </div>
                  <div className="col-span-2" data-field={`pr_${idx}_needed_by`}>
                    <input
                      type="date"
                      value={row.needed_by}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...row, needed_by: e.target.value };
                        updatePrItems(next);
                        clearFieldError(`pr_${idx}_needed_by`);
                        clearFieldError('items');
                      }}
                      className={getInputClass(`pr_${idx}_needed_by`, 'w-full border rounded-lg px-2 py-1.5 text-xs')}
                    />
                    {renderFieldError(`pr_${idx}_needed_by`)}
                  </div>
                  <div className="col-span-1" data-field={`pr_${idx}_qty`}>
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={row.qty}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...row, qty: Number(e.target.value) };
                        updatePrItems(next);
                        clearFieldError(`pr_${idx}_qty`);
                        clearFieldError('items');
                      }}
                      className={getInputClass(`pr_${idx}_qty`, 'w-full border rounded-lg px-2 py-1.5 text-xs')}
                    />
                    {renderFieldError(`pr_${idx}_qty`)}
                  </div>
                  <div className="col-span-2" data-field={`pr_${idx}_unit_cost`}>
                    <input
                      type="number"
                      placeholder="Unit Cost *"
                      value={row.unit_cost}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...row, unit_cost: Number(e.target.value) };
                        updatePrItems(next);
                        clearFieldError(`pr_${idx}_unit_cost`);
                        clearFieldError('items');
                      }}
                      className={getInputClass(`pr_${idx}_unit_cost`, 'w-full border rounded-lg px-2 py-1.5 text-xs')}
                    />
                    {renderFieldError(`pr_${idx}_unit_cost`)}
                  </div>
                  <button
                    type="button"
                    disabled={items.length <= 1}
                    onClick={() => updatePrItems(items.filter((_, i) => i !== idx))}
                    className="col-span-1 text-red-500 flex justify-center pt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">Total PR Cost</span>
                <span className="font-bold text-slate-900">
                  {payload.currency} {totalCost.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Available Budget</span>
                <span className="font-bold text-slate-900">
                  {payload.currency} {Number(payload.available_budget || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Variance to Budget</span>
                <span
                  className={`font-bold ${
                    variance < 0 ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {payload.currency} {variance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        );
      }
      case 'JOB_DESCRIPTION': {
        const respAreas = Array.isArray(payload.responsibilities) && payload.responsibilities.length > 0
          ? payload.responsibilities
          : [
              { area_title: 'Core Teaching / Operational Delivery', area_description: '' },
              { area_title: 'Administrative & Reporting Compliance', area_description: '' },
            ];

        const updateRespAreas = (nextAreas: { area_title: string; area_description: string }[]) => {
          setPayload((prev) => ({
            ...prev,
            responsibilities: nextAreas,
            key_responsibilities: nextAreas.map(
              (a) => `${a.area_title || 'Responsibility'}: ${a.area_description}`
            ),
          }));
          clearFieldError('responsibilities');
        };

        return (
          <div className="space-y-5">
            {/* 1. Header Information */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Job Overview & Reporting Structure
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div data-field="position" className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Position Title *
                  </label>
                  <input
                    type="text"
                    value={payload.position ?? payload.job_title ?? ''}
                    onChange={(e) => {
                      updateField('position', e.target.value);
                      updateField('job_title', e.target.value);
                      clearFieldError('position');
                    }}
                    placeholder="e.g. Head of Humanities / Secondary Teacher"
                    className={getInputClass('position', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('position')}
                </div>
                <div data-field="location">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location / School *
                  </label>
                  <input
                    type="text"
                    value={payload.location ?? payload.department ?? ''}
                    onChange={(e) => {
                      updateField('location', e.target.value);
                      updateField('department', e.target.value);
                      clearFieldError('location');
                    }}
                    placeholder="e.g. Sentinel Kabitaka"
                    className={getInputClass('location', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('location')}
                </div>
                <div data-field="effective_date">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    value={payload.effective_date || ''}
                    onChange={(e) => {
                      updateField('effective_date', e.target.value);
                      clearFieldError('effective_date');
                    }}
                    className={getInputClass('effective_date', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('effective_date')}
                </div>
                <div data-field="reports_to" className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reports To *
                  </label>
                  <input
                    type="text"
                    value={payload.reports_to || ''}
                    onChange={(e) => {
                      updateField('reports_to', e.target.value);
                      clearFieldError('reports_to');
                    }}
                    placeholder="e.g. Deputy Head / Head of School"
                    className={getInputClass('reports_to', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('reports_to')}
                </div>
              </div>
            </div>

            {/* Mission */}
            <div data-field="mission">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Mission / Job Purpose *
              </label>
              <p className="text-[11px] text-slate-500 mb-1">
                Please describe here the overall mission and core purpose of this job role.
              </p>
              <textarea
                rows={3}
                value={payload.mission || ''}
                onChange={(e) => {
                  updateField('mission', e.target.value);
                  clearFieldError('mission');
                }}
                placeholder="Overall purpose of the position within Educore Services..."
                className={getInputClass('mission', 'w-full border rounded-lg px-3 py-2 text-sm')}
              />
              {renderFieldError('mission')}
            </div>

            {/* Job Criteria 1 to 5 */}
            <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200/80 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
                Job Specifications & Criteria
              </span>

              <div className="space-y-3">
                <div data-field="education_criteria">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    1. Education Criteria *
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1">
                    Indicate the minimal education required to perform this role and preferred qualifications.
                  </p>
                  <textarea
                    rows={2}
                    value={payload.education_criteria || ''}
                    onChange={(e) => {
                      updateField('education_criteria', e.target.value);
                      clearFieldError('education_criteria');
                    }}
                    placeholder="e.g. Bachelor's Degree in relevant discipline with Teaching Diploma / TCZ registration..."
                    className={getInputClass('education_criteria', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('education_criteria')}
                </div>

                <div data-field="experience_criteria">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    2. Experience Criteria *
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1">
                    State areas and years the candidate should have previously worked for the role to be done effectively.
                  </p>
                  <textarea
                    rows={2}
                    value={payload.experience_criteria || ''}
                    onChange={(e) => {
                      updateField('experience_criteria', e.target.value);
                      clearFieldError('experience_criteria');
                    }}
                    placeholder="e.g. Minimum 3-5 years teaching Cambridge IGCSE / A-Level curriculum..."
                    className={getInputClass('experience_criteria', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('experience_criteria')}
                </div>

                <div data-field="available_tools">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    3. Available Tools *
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1">
                    State tools and software required to perform the job (e.g. computer, laboratory apparatus, ERP).
                  </p>
                  <input
                    type="text"
                    value={payload.available_tools || ''}
                    onChange={(e) => {
                      updateField('available_tools', e.target.value);
                      clearFieldError('available_tools');
                    }}
                    placeholder="e.g. Laptop, Google Workspace, Educore Portal, SMART Board"
                    className={getInputClass('available_tools', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('available_tools')}
                </div>

                <div data-field="qualities">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    4. Qualities *
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1">
                    Individual traits required to perform duties well (e.g. interpersonal skills, self-motivation, high integrity).
                  </p>
                  <textarea
                    rows={2}
                    value={payload.qualities || ''}
                    onChange={(e) => {
                      updateField('qualities', e.target.value);
                      clearFieldError('qualities');
                    }}
                    placeholder="e.g. High emotional intelligence, collaborative, punctual, resilient..."
                    className={getInputClass('qualities', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('qualities')}
                </div>

                <div data-field="organisation_and_reporting">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    5. Organisation & Reporting *
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1">
                    State clearly where the role fits in the organisation, authority limits (budgeting, staff appraisal), and immediate subordinates.
                  </p>
                  <textarea
                    rows={2}
                    value={payload.organisation_and_reporting || ''}
                    onChange={(e) => {
                      updateField('organisation_and_reporting', e.target.value);
                      clearFieldError('organisation_and_reporting');
                    }}
                    placeholder="Role placement, supervisory authority, list of direct subordinates by title..."
                    className={getInputClass('organisation_and_reporting', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('organisation_and_reporting')}
                </div>
              </div>
            </div>

            {/* Section 6: Responsibilities (6.1, 6.2, 6.3...) */}
            <div data-field="responsibilities" className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">
                    6. Key Responsibilities & Duty Areas *
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Define distinct responsibility areas (6.1, 6.2, ...) with detailed descriptions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateRespAreas([
                      ...respAreas,
                      { area_title: `Responsibility Area ${respAreas.length + 1}`, area_description: '' },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Duty Area
                </button>
              </div>
              {renderFieldError('responsibilities')}

              {respAreas.map((area: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800">
                      6.{idx + 1} Responsibility Area Title
                    </span>
                    <button
                      type="button"
                      disabled={respAreas.length <= 1}
                      onClick={() =>
                        updateRespAreas(respAreas.filter((_: any, i: number) => i !== idx))
                      }
                      className="text-red-500 hover:text-red-700 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={area.area_title || ''}
                    onChange={(e) => {
                      const next = [...respAreas];
                      next[idx] = { ...next[idx], area_title: e.target.value };
                      updateRespAreas(next);
                    }}
                    placeholder={`e.g. Curriculum Delivery & Student Assessment`}
                    className="w-full bg-white border rounded-lg px-3 py-1.5 text-xs font-medium"
                  />
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Description of Responsibility
                    </label>
                    <textarea
                      rows={2}
                      value={area.area_description || ''}
                      onChange={(e) => {
                        const next = [...respAreas];
                        next[idx] = { ...next[idx], area_description: e.target.value };
                        updateRespAreas(next);
                      }}
                      placeholder="Detail specific tasks, standards, and deliverables for this area..."
                      className="w-full bg-white border rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Section 6.5: Assessed Performance */}
            <div data-field="assessed_performance">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Assessed Performance Standards *
              </label>
              <textarea
                rows={2}
                value={payload.assessed_performance || ''}
                onChange={(e) => {
                  updateField('assessed_performance', e.target.value);
                  clearFieldError('assessed_performance');
                }}
                placeholder="Indicate key performance indicators (KPIs) and appraisal framework..."
                className={getInputClass('assessed_performance', 'w-full border rounded-lg px-3 py-2 text-sm')}
              />
              {renderFieldError('assessed_performance')}
            </div>

            {/* Section 7: Annex */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                id="annex_chart"
                checked={payload.annex_org_chart_attached ?? true}
                onChange={(e) => updateField('annex_org_chart_attached', e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="annex_chart" className="text-xs text-slate-700 cursor-pointer">
                <strong>7. Annex: Organisation Chart Attached</strong>
                <p className="text-[11px] text-slate-500">
                  Confirms that an up-to-date organisational organogram is attached / on file with HR.
                </p>
              </label>
            </div>
          </div>
        );
      }

      case 'DISCIPLINARY_CHARGE':
        return (
          <div className="space-y-5">
            {/* Charging Officer Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Charging Officer Details
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div data-field="charging_officer_name">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Name of Charging Officer *
                  </label>
                  <input
                    type="text"
                    value={payload.charging_officer_name || ''}
                    onChange={(e) => {
                      updateField('charging_officer_name', e.target.value);
                      clearFieldError('charging_officer_name');
                    }}
                    className={getInputClass('charging_officer_name', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('charging_officer_name')}
                </div>
                <div data-field="charging_officer_position">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Position *
                  </label>
                  <input
                    type="text"
                    value={payload.charging_officer_position || ''}
                    onChange={(e) => {
                      updateField('charging_officer_position', e.target.value);
                      clearFieldError('charging_officer_position');
                    }}
                    className={getInputClass('charging_officer_position', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('charging_officer_position')}
                </div>
                <div data-field="charging_site">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Site *
                  </label>
                  <input
                    type="text"
                    value={payload.charging_site ?? payload.charging_school ?? ''}
                    onChange={(e) => {
                      updateField('charging_site', e.target.value);
                      updateField('charging_school', e.target.value);
                      clearFieldError('charging_site');
                    }}
                    className={getInputClass('charging_site', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('charging_site')}
                </div>
              </div>
            </div>

            {/* Accused Employee Section */}
            <div className="bg-red-50/40 p-4 rounded-xl border border-red-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-red-700 block">
                Accused Employee Details
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div data-field="accused_name">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Name of the Accused *
                  </label>
                  <input
                    type="text"
                    value={payload.accused_name || ''}
                    onChange={(e) => {
                      updateField('accused_name', e.target.value);
                      clearFieldError('accused_name');
                    }}
                    className={getInputClass('accused_name', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('accused_name')}
                </div>
                <div data-field="accused_position">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Position *
                  </label>
                  <input
                    type="text"
                    value={payload.accused_position || ''}
                    onChange={(e) => {
                      updateField('accused_position', e.target.value);
                      clearFieldError('accused_position');
                    }}
                    className={getInputClass('accused_position', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('accused_position')}
                </div>
                <div data-field="accused_man_no">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Man No. (Employee #) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., EDC-1042"
                    value={payload.accused_man_no || ''}
                    onChange={(e) => {
                      updateField('accused_man_no', e.target.value);
                      clearFieldError('accused_man_no');
                    }}
                    className={getInputClass('accused_man_no', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('accused_man_no')}
                </div>
                <div data-field="accused_dept_site" className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department / Site *
                  </label>
                  <input
                    type="text"
                    value={payload.accused_dept_site ?? payload.accused_dept_school ?? ''}
                    onChange={(e) => {
                      updateField('accused_dept_site', e.target.value);
                      updateField('accused_dept_school', e.target.value);
                      clearFieldError('accused_dept_site');
                    }}
                    className={getInputClass('accused_dept_site', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('accused_dept_site')}
                </div>
                <div data-field="date_of_charge">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Charge *
                  </label>
                  <input
                    type="date"
                    value={payload.date_of_charge || ''}
                    onChange={(e) => {
                      updateField('date_of_charge', e.target.value);
                      clearFieldError('date_of_charge');
                    }}
                    className={getInputClass('date_of_charge', 'w-full bg-white border rounded-lg px-3 py-2 text-sm')}
                  />
                  {renderFieldError('date_of_charge')}
                </div>
              </div>
            </div>

            {/* Offence Particulars */}
            <div className="space-y-4">
              <div data-field="nature_of_offence">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  1. Nature of the Offence (As per Code of Conduct) *
                </label>
                <textarea
                  rows={3}
                  value={payload.nature_of_offence || ''}
                  onChange={(e) => {
                    updateField('nature_of_offence', e.target.value);
                    clearFieldError('nature_of_offence');
                  }}
                  className={getInputClass('nature_of_offence', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('nature_of_offence')}
              </div>
              <div data-field="brief_account_of_offence">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  2. Brief Account of the Offence (As per investigation done) *
                </label>
                <textarea
                  rows={4}
                  value={payload.brief_account_of_offence || ''}
                  onChange={(e) => {
                    updateField('brief_account_of_offence', e.target.value);
                    clearFieldError('brief_account_of_offence');
                  }}
                  className={getInputClass('brief_account_of_offence', 'w-full border rounded-lg px-3 py-2 text-sm')}
                />
                {renderFieldError('brief_account_of_offence')}
              </div>

              <div className="p-4 rounded-xl bg-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-800">
                  Will the accused in (48) hours show cause on the attached Exculpatory Form why disciplinary action should not be taken?
                </span>
                <div className="flex gap-2 shrink-0">
                  {(['YES', 'NO'] as const).map((opt) => (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => updateField('show_cause_in_48_hours', opt)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold border ${
                        payload.show_cause_in_48_hours === opt
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'EDU_HEALTH_CLAIM': {
        const claimItems: any[] = payload.claim_items || [];
        const selectedCats: string[] = payload.treatment_categories || [];
        const allCategories = [
          'CONSULTATION',
          'LABORATORY',
          'RADIOLOGY',
          'PHARMACY',
          'ADMISSION',
          'OPTICAL',
          'EMERGENCY',
          'FOLLOW_UP',
          'DENTAL',
          'OTHER',
        ];

        const toggleCat = (cat: string) => {
          const next = selectedCats.includes(cat)
            ? selectedCats.filter((c) => c !== cat)
            : [...selectedCats, cat];
          updateField('treatment_categories', next);
          clearFieldError('treatment_categories');
        };

        const updateClaimRows = (nextRows: any[]) => {
          const total = nextRows.reduce(
            (sum, r) => sum + Number(r.amount_charged || 0),
            0
          );
          setPayload((prev) => ({
            ...prev,
            claim_items: nextRows,
            total_claim_amount: total,
          }));
        };

        return (
          <div className="space-y-6">
            {/* 1. Member & Patient Information */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 block">
                1. Member & Patient Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div data-field="employee_number">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Employee Number *
                  </label>
                  <input
                    type="text"
                    value={payload.employee_number || ''}
                    onChange={(e) => {
                      updateField('employee_number', e.target.value);
                      clearFieldError('employee_number');
                    }}
                    className={getInputClass('employee_number', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('employee_number')}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Patient Title
                  </label>
                  <input
                    type="text"
                    placeholder="Mr / Mrs / Ms / Master / Miss"
                    value={payload.patient_title || ''}
                    onChange={(e) => updateField('patient_title', e.target.value)}
                    className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Gender *
                  </label>
                  <select
                    value={payload.patient_gender || 'MALE'}
                    onChange={(e) => updateField('patient_gender', e.target.value)}
                    className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div data-field="mobile">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Mobile *
                  </label>
                  <input
                    type="tel"
                    value={payload.mobile || ''}
                    onChange={(e) => {
                      updateField('mobile', e.target.value);
                      clearFieldError('mobile');
                    }}
                    className={getInputClass('mobile', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('mobile')}
                </div>
                <div data-field="patient_first_name">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Patient First Name *
                  </label>
                  <input
                    type="text"
                    value={payload.patient_first_name || ''}
                    onChange={(e) => {
                      updateField('patient_first_name', e.target.value);
                      clearFieldError('patient_first_name');
                    }}
                    className={getInputClass('patient_first_name', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('patient_first_name')}
                </div>
                <div data-field="patient_surname">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Patient Surname *
                  </label>
                  <input
                    type="text"
                    value={payload.patient_surname || ''}
                    onChange={(e) => {
                      updateField('patient_surname', e.target.value);
                      clearFieldError('patient_surname');
                    }}
                    className={getInputClass('patient_surname', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('patient_surname')}
                </div>
                <div data-field="email" className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={payload.email || ''}
                    onChange={(e) => {
                      updateField('email', e.target.value);
                      clearFieldError('email');
                    }}
                    className={getInputClass('email', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('email')}
                </div>
              </div>

              {/* Treatment Category Multi-Select Checkboxes */}
              <div data-field="treatment_categories" className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Service / Treatment Categories (Select all that apply) *
                </label>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((cat) => {
                    const active = selectedCats.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCat(cat)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
                {renderFieldError('treatment_categories')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div data-field="date_of_treatment">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Date of Treatment * (Claims older than 90 days are invalid)
                  </label>
                  <input
                    type="date"
                    value={payload.date_of_treatment || ''}
                    onChange={(e) => {
                      updateField('date_of_treatment', e.target.value);
                      clearFieldError('date_of_treatment');
                    }}
                    className={getInputClass('date_of_treatment', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('date_of_treatment')}
                </div>
                <div data-field="hospital_name">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hospital / Clinic Where Treatment Occurred *
                  </label>
                  <input
                    type="text"
                    value={payload.hospital_name || ''}
                    onChange={(e) => {
                      updateField('hospital_name', e.target.value);
                      clearFieldError('hospital_name');
                    }}
                    className={getInputClass('hospital_name', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('hospital_name')}
                </div>
                <div data-field="symptoms_and_treatment_details" className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Full Details of Symptoms / Medical Conditions & Treatment Received *
                  </label>
                  <textarea
                    rows={2}
                    value={payload.symptoms_and_treatment_details || ''}
                    onChange={(e) => {
                      updateField('symptoms_and_treatment_details', e.target.value);
                      clearFieldError('symptoms_and_treatment_details');
                    }}
                    className={getInputClass('symptoms_and_treatment_details', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                  />
                  {renderFieldError('symptoms_and_treatment_details')}
                </div>
              </div>
            </div>

            {/* 2. Claim Details Repeater Table */}
            <div data-field="claim_items" className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800">
                  2. Claim Details (Description, Provider's Name, Amount Charged, Invoice No) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    updateClaimRows([
                      ...claimItems,
                      {
                        description: '',
                        provider_name: payload.hospital_name || '',
                        amount_charged: 0,
                        invoice_no: '',
                      },
                    ]);
                    clearFieldError('claim_items');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Claim Line
                </button>
              </div>
              {renderFieldError('claim_items')}

              {claimItems.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4" data-field={`claim_${idx}_description`}>
                    <input
                      type="text"
                      placeholder="Description of Expense / Treatment *"
                      value={row.description}
                      onChange={(e) => {
                        const next = [...claimItems];
                        next[idx] = { ...row, description: e.target.value };
                        updateClaimRows(next);
                        clearFieldError(`claim_${idx}_description`);
                        clearFieldError('claim_items');
                      }}
                      className={getInputClass(`claim_${idx}_description`, 'w-full border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError(`claim_${idx}_description`)}
                  </div>
                  <div className="col-span-3" data-field={`claim_${idx}_provider_name`}>
                    <input
                      type="text"
                      placeholder="Provider's Name *"
                      value={row.provider_name}
                      onChange={(e) => {
                        const next = [...claimItems];
                        next[idx] = { ...row, provider_name: e.target.value };
                        updateClaimRows(next);
                        clearFieldError(`claim_${idx}_provider_name`);
                        clearFieldError('claim_items');
                      }}
                      className={getInputClass(`claim_${idx}_provider_name`, 'w-full border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError(`claim_${idx}_provider_name`)}
                  </div>
                  <div className="col-span-2" data-field={`claim_${idx}_amount_charged`}>
                    <input
                      type="number"
                      placeholder="Amount (ZMW) *"
                      value={row.amount_charged}
                      onChange={(e) => {
                        const next = [...claimItems];
                        next[idx] = { ...row, amount_charged: Number(e.target.value) };
                        updateClaimRows(next);
                        clearFieldError(`claim_${idx}_amount_charged`);
                        clearFieldError('claim_items');
                      }}
                      className={getInputClass(`claim_${idx}_amount_charged`, 'w-full border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError(`claim_${idx}_amount_charged`)}
                  </div>
                  <input
                    type="text"
                    placeholder="Invoice / Receipt #"
                    value={row.invoice_no}
                    onChange={(e) => {
                      const next = [...claimItems];
                      next[idx] = { ...row, invoice_no: e.target.value };
                      updateClaimRows(next);
                    }}
                    className="col-span-2 border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={claimItems.length <= 1}
                    onClick={() =>
                      updateClaimRows(claimItems.filter((_, i) => i !== idx))
                    }
                    className="col-span-1 text-red-500 flex justify-center pt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="p-3 rounded-lg bg-slate-100 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Total Claim Reimbursement Requested:</span>
                <span className="text-sm font-bold text-blue-700">
                  ZMW {Number(payload.total_claim_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* 3. Payment Details */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  3. Preferred Payment Method *
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { code: 'BANK_TRANSFER', label: 'Bank Transfer' },
                      {
                        code: 'ADD_TOWARDS_MEMBERSHIP',
                        label: 'Add Towards Membership',
                      },
                    ] as const
                  ).map((pm) => (
                    <button
                      type="button"
                      key={pm.code}
                      onClick={() => updateField('payment_method', pm.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        payload.payment_method === pm.code
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {payload.payment_method === 'BANK_TRANSFER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div data-field="bank_name">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={payload.bank_name || ''}
                      onChange={(e) => {
                        updateField('bank_name', e.target.value);
                        clearFieldError('bank_name');
                      }}
                      className={getInputClass('bank_name', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('bank_name')}
                  </div>
                  <div data-field="account_holder_name">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Account Holder Name / Payee *
                    </label>
                    <input
                      type="text"
                      value={payload.account_holder_name || ''}
                      onChange={(e) => {
                        updateField('account_holder_name', e.target.value);
                        clearFieldError('account_holder_name');
                      }}
                      className={getInputClass('account_holder_name', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('account_holder_name')}
                  </div>
                  <div data-field="account_number">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      value={payload.account_number || ''}
                      onChange={(e) => {
                        updateField('account_number', e.target.value);
                        clearFieldError('account_number');
                      }}
                      className={getInputClass('account_number', 'w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs')}
                    />
                    {renderFieldError('account_number')}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Bank Branch
                    </label>
                    <input
                      type="text"
                      value={payload.bank_branch || ''}
                      onChange={(e) => updateField('bank_branch', e.target.value)}
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Mandatory Medical Consent Declarations */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2 text-xs">
              <div data-field="confirm_true_and_correct">
                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(payload.confirm_true_and_correct)}
                    onChange={(e) => {
                      updateField('confirm_true_and_correct', e.target.checked);
                      clearFieldError('confirm_true_and_correct');
                    }}
                  />
                  I confirm the information given is true and correct to the best of my knowledge.
                </label>
                {renderFieldError('confirm_true_and_correct')}
              </div>
              <div data-field="consent_medical_info_processing">
                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(payload.consent_medical_info_processing)}
                    onChange={(e) => {
                      updateField('consent_medical_info_processing', e.target.checked);
                      clearFieldError('consent_medical_info_processing');
                    }}
                  />
                  I consent to Educore Services obtaining and processing medical information related to my claim.
                </label>
                {renderFieldError('consent_medical_info_processing')}
              </div>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="p-4 bg-slate-50 border rounded-lg text-xs text-slate-600">
            Please fill in the form details below.
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-8">
      {/* Top Breadcrumb Bar (Matches 3.png) */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-400 font-bold">&lt;&gt;</span>
          <button
            type="button"
            onClick={onCancel}
            className="hover:text-blue-600 transition cursor-pointer"
          >
            My Applications
          </button>
          <span>/</span>
          <span className="text-slate-700 font-semibold">
            {step === 1 ? 'New Request' : selectedForm?.title || 'Form Submission'}
          </span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Header with Back Button and Actions (Matches 3.png) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {step > 1 && !(step === 2 && editApplication) && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSubmitError(null);
                if (step === 2) {
                  handleGoBackToStep1();
                } else {
                  setStep(2);
                }
              }}
              className="p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              title="Previous step"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
          )}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Step {step} of 3 · {step === 1 ? 'Select Form' : step === 2 ? 'Fill Details' : 'Sign & Submit'}
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {step === 1
                ? 'Select Application Form'
                : `New Application: ${selectedForm?.title || 'Form Details'}`}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onCancel && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCancel}
              className="px-4 py-2 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </motion.button>
          )}
          {step === 2 && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContinueToSignoff}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
            >
              Continue to Sign-off <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}
          {step === 3 && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={
                submitting ||
                !digitalSignature.trim() ||
                (selectedForm?.requires_policy && !termsAccepted)
              }
              onClick={() => handleFinalSubmit(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-2xs disabled:opacity-50 transition cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Application'}
            </motion.button>
          )}
        </div>
      </div>

      {submitError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {submitError}
        </div>
      )}

      {/* Stepper Navigation Tabs: Cosmetic and for guidance only. Backward navigation allowed only when previous stage details are filled. */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs px-5 pt-3 pb-0 flex items-center gap-8 text-xs font-semibold">
        {STEP_ITEMS.map((item) => {
          const isCurrent = step === item.stepNum;
          const canGoBack = canGoBackTo(item.stepNum);

          if (isCurrent) {
            return (
              <span
                key={item.stepNum}
                className="relative pb-3 text-blue-600 font-bold select-none cursor-default flex items-center"
                aria-current="step"
              >
                {item.label}
                <motion.div
                  layoutId="stepperActivePill"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              </span>
            );
          }

          if (canGoBack) {
            return (
              <button
                key={item.stepNum}
                type="button"
                onClick={() => {
                  if (item.stepNum === 1) {
                    handleGoBackToStep1();
                  } else if (item.stepNum === 2) {
                    setSubmitError(null);
                    setStep(2);
                  }
                }}
                className="pb-3 border-b-2 border-transparent text-slate-600 hover:text-blue-600 hover:border-slate-300 transition cursor-pointer select-none"
                title={`Go back to ${item.label}`}
              >
                {item.label}
              </button>
            );
          }

          if (item.stepNum === 3 && step === 2) {
            return (
              <button
                key={item.stepNum}
                type="button"
                onClick={handleContinueToSignoff}
                className="pb-3 border-b-2 border-transparent text-slate-600 hover:text-blue-600 hover:border-slate-300 transition cursor-pointer select-none"
                title="Continue to Policy & Digital Signature"
              >
                {item.label}
              </button>
            );
          }

          return (
            <span
              key={item.stepNum}
              className="pb-3 border-b-2 border-transparent text-slate-400 select-none cursor-default"
              aria-disabled="true"
            >
              {item.label}
            </span>
          );
        })}
      </div>

      {/* STEP CONTAINERS WRAPPED IN ANIMATEPRESENCE */}
      <AnimatePresence mode="wait">
        {/* STEP 1: PICK DEPARTMENT & FORM */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6 space-y-6"
          >
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Filter by Organization Department
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a category to view the available administrative, academic, or logistics forms.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {DEPARTMENTS.map((dept) => {
                const isSelected = selectedDept === dept.code;
                return (
                  <button
                    type="button"
                    key={dept.code}
                    onClick={() => setSelectedDept(dept.code)}
                    className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'text-white'
                        : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="newRequestDeptPill"
                        className="absolute inset-0 bg-blue-600 rounded-md shadow-2xs"
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {dept.icon}
                      {dept.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredForms.map((form) => (
                <motion.button
                  type="button"
                  key={form.id}
                  whileHover={{ scale: 1.012, y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => handleSelectForm(form)}
                  className="text-left p-4 rounded-lg border border-slate-200/80 hover:border-blue-500 hover:shadow-md transition-shadow group cursor-pointer bg-slate-50/40 hover:bg-white"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                      {form.department} · {form.ref_prefix}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 mt-2.5 text-sm group-hover:text-blue-600 transition">
                    {form.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Pipeline: {form.workflow_pipeline.map((s) => s.label).join(' → ')}
                  </p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 2: DYNAMIC PAYLOAD INPUTS (2-Column Layout Matches 3.png) */}
        {step === 2 && selectedForm && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-5"
          >
            {/* Left Column (2/3 width): Form Fields */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">
                  Form Inputs &amp; Information
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fill out the required information accurately before proceeding to the digital signature step.
                </p>
              </div>

              {hasAttemptedProceed && Object.keys(fieldErrors).length > 0 && (
                <div
                  data-testid="form-error-banner"
                  className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-red-800">Please complete all required fields</h4>
                    <p className="text-red-700">
                      There {Object.keys(fieldErrors).length === 1 ? 'is 1 required field' : `are ${Object.keys(fieldErrors).length} required fields`} that require attention before you can sign and submit.
                    </p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-red-600">
                      {Object.entries(fieldErrors).slice(0, 5).map(([key, err]) => (
                        <li key={key}>{err}</li>
                      ))}
                      {Object.keys(fieldErrors).length > 5 && (
                        <li>...and {Object.keys(fieldErrors).length - 5} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {renderFormFields()}

              {/* Supporting Document & Receipt Upload Zone */}
              <div className="pt-4 border-t border-slate-100">
                <FileUploadZone
                  applicationId={editApplication?.id}
                  attachments={attachments}
                  onUpload={async (file) => {
                    if (editApplication?.id) {
                      const uploaded = await uploadAttachment(editApplication.id, file);
                      setAttachments((prev) => [...prev, uploaded]);
                    } else {
                      setPendingFiles((prev) => [...prev, file]);
                      const placeholder: ApplicationAttachment = {
                        id: `temp-${Date.now()}-${Math.random()}`,
                        application_id: 'pending',
                        uploader_id: currentUser?.id || '',
                        uploader_name: currentUser?.full_name || 'You',
                        file_name: file.name,
                        file_size_bytes: file.size,
                        mime_type: file.type || 'application/octet-stream',
                        storage_path: '',
                        created_at: new Date().toISOString(),
                      };
                      setAttachments((prev) => [...prev, placeholder]);
                    }
                    showToast('info', 'Document Attached', `"${file.name}" attached successfully.`);
                  }}
                  onDelete={async (attachmentId) => {
                    if (attachmentId.startsWith('temp-')) {
                      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
                      setPendingFiles((prev) => prev.filter((_, idx) => `temp-${idx}` !== attachmentId));
                    } else {
                      await deleteAttachment(attachmentId);
                      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
                    }
                    showToast('info', 'Document Removed', 'Attachment was removed.');
                  }}
                />
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                {editApplication ? (
                  <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                    Editing: <span className="font-bold text-sky-700">{editApplication.reference_number}</span>
                  </div>
                ) : (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGoBackToStep1}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Change Form
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinueToSignoff}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
                >
                  Continue to Sign-off <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Right Column (1/3 width): Pricing / Summary Card (Matches 3.png) */}
            <div className="space-y-4">
              {/* Calculation / Pricing Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Summary &amp; Costing
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 mt-0.5">
                    Application Preview
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  {payload.estimated_monthly_amount_zmw ? (
                    <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200/80 space-y-1">
                      <span className="text-slate-500 text-[11px] block font-medium">
                        Est. Monthly Payroll Deduction
                      </span>
                      <span className="text-xl font-black text-blue-700 font-mono">
                        ZMW {Number(payload.estimated_monthly_amount_zmw).toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Repayment: {String(payload.repayment_period || '').replace(/_/g, ' ')}
                      </span>
                    </div>
                  ) : payload.requested_amount_zmw ? (
                    <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200/80 space-y-1">
                      <span className="text-slate-500 text-[11px] block font-medium">
                        Requested Advance Amount
                      </span>
                      <span className="text-xl font-black text-blue-700 font-mono">
                        ZMW {Number(payload.requested_amount_zmw).toLocaleString()}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center text-slate-600 py-1 border-b border-slate-50">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-semibold text-slate-800">{selectedForm.department}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 py-1 border-b border-slate-50">
                    <span className="text-slate-500">Applicant:</span>
                    <span className="font-semibold text-slate-800">{currentUser?.full_name}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 py-1 border-b border-slate-50">
                    <span className="text-slate-500">Site:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                      {currentUser?.site_name || 'Educore'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Routing Pipeline Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Approval Pipeline ({selectedForm.ref_prefix})
                </span>
                <div className="space-y-2">
                  {selectedForm.workflow_pipeline.map((s) => (
                    <div
                      key={s.step_order}
                      className="flex items-center gap-2 text-xs p-2 rounded-md bg-slate-50 border border-slate-100"
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {s.step_order}
                      </span>
                      <span className="font-medium text-slate-700">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: POLICY ACCEPTANCE & DIGITAL SIGNATURE */}
        {step === 3 && selectedForm && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6 space-y-6"
          >
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Policy Agreement &amp; Digital Sign-off
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review site statutory compliance policies and sign digitally to submit.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-bold text-slate-700 uppercase mb-2">
                Automated Routing Pipeline ({selectedForm.ref_prefix})
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                {selectedForm.workflow_pipeline.map((s, idx) => (
                  <React.Fragment key={s.step_order}>
                    <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-medium">
                      {s.step_order}. {s.label}
                    </span>
                    {idx < selectedForm.workflow_pipeline.length - 1 && <span>→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {selectedForm.requires_policy && activePolicy && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Policy Terms ({activePolicy.version_tag})
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 max-h-40 overflow-y-auto text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                  {activePolicy.legal_text}
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  I have read, understood, and agree to the policy terms and any applicable payroll deductions.
                </label>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Applicant Digital Signature (Type Full Legal Name) *
              </label>
              <input
                type="text"
                value={digitalSignature}
                onChange={(e) => setDigitalSignature(e.target.value)}
                placeholder={currentUser?.full_name || 'Full Name'}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-serif italic focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSubmitError(null);
                  setStep(2);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Details
              </motion.button>

              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={submitting}
                  onClick={() => handleFinalSubmit(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                >
                  Save as Draft
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={
                    submitting ||
                    !digitalSignature.trim() ||
                    (selectedForm.requires_policy && !termsAccepted)
                  }
                  onClick={() => handleFinalSubmit(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-2xs disabled:opacity-50 transition cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? 'Submitting...' : 'Sign & Submit Application'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NewRequestStepper;