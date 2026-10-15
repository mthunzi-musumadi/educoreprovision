import React, { useState, useMemo } from 'react';
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
} from '../../types';

interface NewRequestStepperProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialFormCode?: FormCode;
}

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
}) => {
  const {
    currentUser,
    formDefinitions,
    equipmentTiers,
    institutions,
    policies,
    submitWorkflowForm,
  } = useAppContext();

  const [step, setStep] = useState<1 | 2 | 3>(initialFormCode ? 2 : 1);
  const [selectedDept, setSelectedDept] = useState<DepartmentCode | 'ALL'>('ALL');
  const [selectedFormCode, setSelectedFormCode] = useState<FormCode>(
    initialFormCode || 'ICT_PURCHASE'
  );

  const [payload, setPayload] = useState<Record<string, any>>({
    repayment_period: 'TWELVE_MONTHS',
    account_type: 'CURRENT',
    transport_mode: 'VEHICLE',
    employment_type: 'FIXED_TERM',
    items: [],
    children: [],
    key_responsibilities: [''],
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [digitalSignature, setDigitalSignature] = useState(currentUser?.full_name || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedForm: FormDefinition | undefined = useMemo(
    () => formDefinitions.find((f) => f.code === selectedFormCode),
    [formDefinitions, selectedFormCode]
  );

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

  const updateField = (key: string, value: any) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
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
  };

  const handleSelectForm = (form: FormDefinition) => {
    setSelectedFormCode(form.code);
    setSubmitError(null);

    const defaultSchoolId = institutions[0]?.id || currentUser?.institution_id || '';

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
          academic_year: new Date().getFullYear().toString(),
          staff_tenure_years: 1,
          notes: '',
          children: [
            {
              child_full_name: '',
              date_of_birth: '',
              target_school_id: defaultSchoolId,
              year_group: 'Year 1 / Grade 1',
              admission_term: 'TERM_1',
              fee_rebate_percentage: 75,
            },
          ] as ChildAdmissionEntry[],
        });
        break;
      case 'STORES_REQ':
        setPayload({
          cost_center: currentUser?.department || 'ACADEMICS',
          delivery_location: currentUser?.institution_name || '',
          items: [
            { item_code: '', description: '', qty_requested: 1, unit: 'EA' },
          ] as unknown as StoresReqItem[],
        });
        break;
      case 'STOCK_RETURN':
        setPayload({
          return_reason: '',
          items: [
            { item_code: '', description: '', qty: 1, condition: 'GOOD' },
          ] as unknown as StockReturnItem[],
        });
        break;
      case 'JOB_DESCRIPTION':
        setPayload({
          job_title: currentUser?.job_title || '',
          department: currentUser?.department || '',
          reports_to: 'Head of Department / Head Teacher',
          key_responsibilities: [''],
        });
        break;
      case 'TRAVEL_REQUEST': {
        const nameParts = (currentUser?.full_name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const surname = nameParts.slice(1).join(' ') || '';

        setPayload({
          cost_code: currentUser?.department || '',
          contact_number: '+260 ',
          site: currentUser?.institution_name || '',
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
          requested_amount_zmw: '',
          repayment_months: 3,
          current_net_pay_zmw: '',
          reason: '',
        });
        break;
      case 'GRATUITY_ADVANCE':
        setPayload({
          contract_start_date: '',
          accrued_months: 12,
          requested_amount_zmw: '',
          reason: '',
        });
        break;
      case 'PROF_DEV':
        setPayload({
          course_title: '',
          provider: '',
          cost_zmw: '',
          start_date: '',
          end_date: '',
          justification: '',
        });
        break;
      case 'BANK_CHANGE':
        setPayload({
          bank_name: '',
          branch_name: '',
          branch_code: '',
          account_number: '',
          account_type: 'CURRENT',
          effective_payroll_month: '',
        });
        break;
      case 'CONTRACT_RENEWAL':
        setPayload({
          current_contract_end_date: '',
          proposed_tenure_months: 24,
          performance_summary: '',
        });
        break;
      case 'EXCULPATORY':
        setPayload({
          incident_date: '',
          charge_reference: '',
          allegation_summary: '',
          employee_statement: '',
        });
        break;
      case 'MANPOWER_REQ':
        setPayload({
          position_title: '',
          department: currentUser?.department || '',
          headcount: 1,
          employment_type: 'FIXED_TERM',
          target_start_date: '',
          justification: '',
        });
        break;
      case 'EVENT_COMPLETION':
        setPayload({
          schools: currentUser?.institution_name || '',
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
          location: currentUser?.institution_name || '',
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
    }

    setStep(2);
  };

  const handleFinalSubmit = async (submitImmediately: boolean) => {
    if (!selectedForm) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitWorkflowForm({
        formCode: selectedForm.code,
        payload: payload as any,
        submitImmediately,
        policyVersionId: activePolicy?.id,
        termsAccepted: selectedForm.requires_policy ? termsAccepted : true,
        digitalSignature: digitalSignature.trim() || currentUser?.full_name,
      });
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
    switch (selectedFormCode) {
      case 'ICT_PURCHASE':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Laptop Tier *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {equipmentTiers.map((tier) => {
                  const selected = payload.equipment_tier_id === tier.id;
                  return (
                    <button
                      type="button"
                      key={tier.id}
                      onClick={() =>
                        handleIctSelection(
                          tier.id,
                          (payload.repayment_period as RepaymentPlan) || 'TWELVE_MONTHS'
                        )
                      }
                      className={`text-left p-4 rounded-xl border-2 transition ${
                        selected
                          ? 'border-blue-600 bg-blue-50/40'
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
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Repayment Period *
              </label>
              <div className="grid grid-cols-3 gap-3">
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
            </div>

            <div className="p-4 rounded-lg bg-slate-100 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">
                Estimated Monthly Payroll Deduction:
              </span>
              <span className="text-lg font-bold text-slate-900">
                ZMW {Number(payload.estimated_monthly_amount_zmw || 0).toLocaleString()} / mo
              </span>
            </div>
          </div>
        );

      case 'CHILD_ADMISSION': {
        const children: ChildAdmissionEntry[] = payload.children || [];
        const defaultSchoolId = institutions[0]?.id || '';

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year *
                </label>
                <input
                  type="text"
                  placeholder="e.g., 2026 / 2027"
                  value={payload.academic_year || ''}
                  onChange={(e) => updateField('academic_year', e.target.value)}
                  className="w-full bg-white border rounded-lg px-3 py-2 text-sm"
                />
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-800">
                    Children for Admission / Fee Rebate Authorisation ({children.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateField('children', [
                      ...children,
                      {
                        child_full_name: '',
                        date_of_birth: '',
                        target_school_id: defaultSchoolId,
                        year_group: '',
                        admission_term: 'TERM_1',
                        fee_rebate_percentage: 75,
                      } as ChildAdmissionEntry,
                    ])
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Child
                </button>
              </div>

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
                          placeholder="Full Legal Name"
                          value={child.child_full_name}
                          onChange={(e) => {
                            const next = [...children];
                            next[idx] = { ...child, child_full_name: e.target.value };
                            updateField('children', next);
                          }}
                          className="w-full border rounded-lg px-2.5 py-1.5 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          value={child.date_of_birth}
                          onChange={(e) => {
                            const next = [...children];
                            next[idx] = { ...child, date_of_birth: e.target.value };
                            updateField('children', next);
                          }}
                          className="w-full border rounded-lg px-2.5 py-1.5 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Target Educore School *
                        </label>
                        <select
                          value={child.target_school_id}
                          onChange={(e) => {
                            const next = [...children];
                            next[idx] = { ...child, target_school_id: e.target.value };
                            updateField('children', next);
                          }}
                          className="w-full border rounded-lg px-2.5 py-1.5 text-xs"
                        >
                          {institutions.map((inst) => (
                            <option key={inst.id} value={inst.id}>
                              {inst.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Year Group / Grade *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Year 5 / Grade 8"
                          value={child.year_group}
                          onChange={(e) => {
                            const next = [...children];
                            next[idx] = { ...child, year_group: e.target.value };
                            updateField('children', next);
                          }}
                          className="w-full border rounded-lg px-2.5 py-1.5 text-xs"
                        />
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
                  placeholder="e.g., TRD-ACAD-2026"
                  value={payload.cost_code || ''}
                  onChange={(e) => updateField('cost_code', e.target.value)}
                  className="w-full bg-white border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  placeholder="+260 96..."
                  value={payload.contact_number || ''}
                  onChange={(e) => updateField('contact_number', e.target.value)}
                  className="w-full bg-white border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Site / School *
                </label>
                <input
                  type="text"
                  value={payload.site || ''}
                  onChange={(e) => updateField('site', e.target.value)}
                  className="w-full bg-white border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason For Travel *
                </label>
                <input
                  type="text"
                  placeholder="Official business purpose or contract travel entitlement"
                  value={payload.reason_for_travel || ''}
                  onChange={(e) => updateField('reason_for_travel', e.target.value)}
                  className="w-full bg-white border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* 2. Passengers' Details Repeater */}
            <div className="space-y-2">
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
                  onClick={() =>
                    updateField('passengers', [
                      ...passengers,
                      { surname: '', first_name: '', gender: 'MALE', date_of_birth: '' },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Passenger
                </button>
              </div>

              {passengers.map((p, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Surname *"
                    value={p.surname}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx] = { ...p, surname: e.target.value };
                      updateField('passengers', next);
                    }}
                    className="col-span-4 border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="First Name *"
                    value={p.first_name}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx] = { ...p, first_name: e.target.value };
                      updateField('passengers', next);
                    }}
                    className="col-span-4 border rounded-lg px-2.5 py-1.5 text-xs"
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
                    title="Date of Birth"
                    value={p.date_of_birth}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx] = { ...p, date_of_birth: e.target.value };
                      updateField('passengers', next);
                    }}
                    className="col-span-1 border rounded-lg px-1.5 py-1.5 text-xs"
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
                <div className="flex flex-wrap gap-2">
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
                      onClick={() => updateField('flight_booking_type', ft.code)}
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
                      Hotel Name
                    </label>
                    <input
                      type="text"
                      value={payload.hotel_name || ''}
                      onChange={(e) => updateField('hotel_name', e.target.value)}
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Check-In Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={payload.check_in_datetime || ''}
                      onChange={(e) => updateField('check_in_datetime', e.target.value)}
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Check-Out Date
                    </label>
                    <input
                      type="date"
                      value={payload.check_out_date || ''}
                      onChange={(e) => updateField('check_out_date', e.target.value)}
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                    />
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
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination *
              </label>
              <input
                type="text"
                placeholder="e.g., Lusaka / Sentinel Kabitaka"
                value={payload.destination || ''}
                onChange={(e) => updateField('destination', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Departure Date *
              </label>
              <input
                type="date"
                value={payload.departure_date || ''}
                onChange={(e) => updateField('departure_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Return Date *
              </label>
              <input
                type="date"
                value={payload.return_date || ''}
                onChange={(e) => updateField('return_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transport Mode
              </label>
              <select
                value={payload.transport_mode || 'VEHICLE'}
                onChange={(e) => updateField('transport_mode', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="VEHICLE">Company Vehicle</option>
                <option value="FLIGHT">Commercial / Charter Flight</option>
                <option value="BUS">Public Coach / Bus</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Cost / Per Diem (ZMW)
              </label>
              <input
                type="number"
                value={payload.estimated_cost_zmw || ''}
                onChange={(e) => updateField('estimated_cost_zmw', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(payload.accommodation_required)}
                  onChange={(e) => updateField('accommodation_required', e.target.checked)}
                />
                Overnight Accommodation Required
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purpose of Travel *
              </label>
              <textarea
                rows={3}
                value={payload.purpose || ''}
                onChange={(e) => updateField('purpose', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'SALARY_ADVANCE':
      case 'GRATUITY_ADVANCE':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Requested Amount (ZMW) *
              </label>
              <input
                type="number"
                value={payload.requested_amount_zmw || ''}
                onChange={(e) => updateField('requested_amount_zmw', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            {selectedFormCode === 'SALARY_ADVANCE' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Repayment Period (Months) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={payload.repayment_months || ''}
                    onChange={(e) => updateField('repayment_months', Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Net Monthly Pay (ZMW)
                  </label>
                  <input
                    type="number"
                    value={payload.current_net_pay_zmw || ''}
                    onChange={(e) => updateField('current_net_pay_zmw', Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Contract Start Date *
                  </label>
                  <input
                    type="date"
                    value={payload.contract_start_date || ''}
                    onChange={(e) => updateField('contract_start_date', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Accrued Service Months on Contract *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={payload.accrued_months || ''}
                    onChange={(e) => updateField('accrued_months', Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Justification for Advance *
              </label>
              <textarea
                rows={3}
                value={payload.reason || ''}
                onChange={(e) => updateField('reason', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'BANK_CHANGE':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Bank Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Stanbic Bank Zambia"
                value={payload.bank_name || ''}
                onChange={(e) => updateField('bank_name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Solwezi Branch"
                value={payload.branch_name || ''}
                onChange={(e) => updateField('branch_name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch Sort Code
              </label>
              <input
                type="text"
                placeholder="Optional Sort / SWIFT Code"
                value={payload.branch_code || ''}
                onChange={(e) => updateField('branch_code', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Number *
              </label>
              <input
                type="text"
                value={payload.account_number || ''}
                onChange={(e) => updateField('account_number', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Type *
              </label>
              <select
                value={payload.account_type || 'CURRENT'}
                onChange={(e) => updateField('account_type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="CURRENT">Current Account</option>
                <option value="SAVINGS">Savings Account</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Effective Payroll Month
              </label>
              <input
                type="month"
                value={payload.effective_payroll_month || ''}
                onChange={(e) => updateField('effective_payroll_month', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'PROF_DEV':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course / Qualification Title *
              </label>
              <input
                type="text"
                value={payload.course_title || ''}
                onChange={(e) => updateField('course_title', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Training Provider / Institution *
              </label>
              <input
                type="text"
                value={payload.provider || ''}
                onChange={(e) => updateField('provider', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Cost (ZMW) *
              </label>
              <input
                type="number"
                value={payload.cost_zmw || ''}
                onChange={(e) => updateField('cost_zmw', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={payload.start_date || ''}
                onChange={(e) => updateField('start_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Completion Date
              </label>
              <input
                type="date"
                value={payload.end_date || ''}
                onChange={(e) => updateField('end_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Relevance to Current Role & School Objectives
              </label>
              <textarea
                rows={3}
                value={payload.justification || ''}
                onChange={(e) => updateField('justification', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'CONTRACT_RENEWAL':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Contract Expiry Date *
              </label>
              <input
                type="date"
                value={payload.current_contract_end_date || ''}
                onChange={(e) => updateField('current_contract_end_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Proposed Renewal Tenure (Months) *
              </label>
              <input
                type="number"
                value={payload.proposed_tenure_months || 24}
                onChange={(e) => updateField('proposed_tenure_months', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Key Achievements & Performance Self-Appraisal Summary
              </label>
              <textarea
                rows={4}
                value={payload.performance_summary || ''}
                onChange={(e) => updateField('performance_summary', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'EXCULPATORY':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Alleged Incident *
              </label>
              <input
                type="date"
                value={payload.incident_date || ''}
                onChange={(e) => updateField('incident_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Charge / Disciplinary Reference *
              </label>
              <input
                type="text"
                placeholder="e.g., DISC-TRD-2026-09"
                value={payload.charge_reference || ''}
                onChange={(e) => updateField('charge_reference', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Summary of Allegation / Query
              </label>
              <input
                type="text"
                value={payload.allegation_summary || ''}
                onChange={(e) => updateField('allegation_summary', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employee Exculpatory Statement & Response *
              </label>
              <textarea
                rows={5}
                value={payload.employee_statement || ''}
                onChange={(e) => updateField('employee_statement', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'MANPOWER_REQ':

      case 'EVENT_COMPLETION':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  School(s) *
                </label>
                <input
                  type="text"
                  value={payload.schools || ''}
                  onChange={(e) => updateField('schools', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={payload.event_name || ''}
                  onChange={(e) => updateField('event_name', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type of Event *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Sports Tournament, Academic Fair, Camp"
                  value={payload.event_type || ''}
                  onChange={(e) => updateField('event_type', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Coordinator *
                </label>
                <input
                  type="text"
                  value={payload.event_coordinator || ''}
                  onChange={(e) => updateField('event_coordinator', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  File Number *
                </label>
                <input
                  type="text"
                  value={payload.file_number || ''}
                  onChange={(e) => updateField('file_number', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    File Open Date *
                  </label>
                  <input
                    type="date"
                    value={payload.file_open_date || ''}
                    onChange={(e) => updateField('file_open_date', e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Event *
                  </label>
                  <input
                    type="date"
                    value={payload.event_date || ''}
                    onChange={(e) => updateField('event_date', e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-2 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-slate-700 space-y-2">
              <p className="leading-relaxed">
                "I confirm that the event costings were prepared, agreed on with finance and communicated by the school with all billing parties (if rechargeable) involved. All necessary documents have been handed in to finance and the event was completed successfully. I further confirm that all Purchase Requisitions (PR) for this event were submitted to the Procurement department."
              </p>
              <label className="flex items-center gap-2 font-bold text-slate-900 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={Boolean(payload.coordinator_confirmed)}
                  onChange={(e) => updateField('coordinator_confirmed', e.target.checked)}
                />
                I confirm the above Event Coordinator declaration
              </label>
            </div>
          </div>
        );

      case 'STOCK_RETURN': {
        const items: any[] = payload.items || [];
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location / Campus *
                </label>
                <input
                  type="text"
                  value={payload.location || ''}
                  onChange={(e) => updateField('location', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
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
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Return *
                </label>
                <textarea
                  rows={2}
                  value={payload.return_reason || ''}
                  onChange={(e) => updateField('return_reason', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">
                  Returned Stock Items (No., Item, Unit, Qty, Condition, Remarks) *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateField('items', [
                      ...items,
                      { item: '', unit: 'EA', qty: 1, condition: 'GOOD', remarks: '' },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>

              {items.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Item description *"
                    value={row.item}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, item: e.target.value };
                      updateField('items', next);
                    }}
                    className="col-span-4 border rounded-lg px-2.5 py-1.5 text-xs"
                  />
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
                  <input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={row.qty}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, qty: Number(e.target.value) };
                      updateField('items', next);
                    }}
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
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
                    className="col-span-1 text-red-500 hover:text-red-700 disabled:opacity-30 flex justify-center"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department *
                </label>
                <input
                  type="text"
                  value={payload.department || ''}
                  onChange={(e) => updateField('department', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose *
                </label>
                <input
                  type="text"
                  value={payload.purpose || ''}
                  onChange={(e) => updateField('purpose', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">
                  Ordered Items to Issue (Description, Qty Req., Additional Information) *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateField('items', [
                      ...items,
                      { description: '', qty_requested: 1, additional_info: '' },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              {items.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-1 text-xs font-mono text-slate-400 text-center">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    placeholder="Item Description *"
                    value={row.description}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, description: e.target.value };
                      updateField('items', next);
                    }}
                    className="col-span-5 border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Qty Req"
                    value={row.qty_requested}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, qty_requested: Number(e.target.value) };
                      updateField('items', next);
                    }}
                    className="col-span-2 border rounded-lg px-2.5 py-1.5 text-xs"
                  />
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
                    className="col-span-1 text-red-500 hover:text-red-700 disabled:opacity-30 flex justify-center"
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cost Centre *
                </label>
                <input
                  type="text"
                  value={payload.cost_centre || ''}
                  onChange={(e) => updateField('cost_centre', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Imprest Recipient *
                </label>
                <input
                  type="text"
                  value={payload.imprest_recipient || ''}
                  onChange={(e) => updateField('imprest_recipient', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Currency *
                </label>
                <select
                  value={payload.currency || 'ZMW'}
                  onChange={(e) => updateField('currency', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="ZMW">ZMW</option>
                  <option value="USD">USD</option>
                  <option value="ZAR">ZAR</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            {/* Table 1: Amounts Requested */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800">
                  Part A: Description of Amount(s) Requested (Imprest Advance)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    recalc([...reqItems, { description: '', qty: 1, unit_cost: 0 }], retItems)
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Advance Line
                </button>
              </div>
              {reqItems.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Description of amount requested"
                    value={row.description}
                    onChange={(e) => {
                      const next = [...reqItems];
                      next[idx] = { ...row, description: e.target.value };
                      recalc(next, retItems);
                    }}
                    className="col-span-6 border rounded-lg px-2.5 py-1.5 text-xs"
                  />
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
                  <input
                    type="number"
                    placeholder="Cost/Unit"
                    value={row.unit_cost}
                    onChange={(e) => {
                      const next = [...reqItems];
                      next[idx] = { ...row, unit_cost: Number(e.target.value) };
                      recalc(next, retItems);
                    }}
                    className="col-span-3 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={reqItems.length <= 1}
                    onClick={() =>
                      recalc(reqItems.filter((_, i) => i !== idx), retItems)
                    }
                    className="col-span-1 text-red-500 flex justify-center"
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cost Centre *
                </label>
                <input
                  type="text"
                  value={payload.cost_centre || ''}
                  onChange={(e) => updateField('cost_centre', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Available Budget *
                </label>
                <input
                  type="number"
                  value={payload.available_budget || ''}
                  onChange={(e) => updatePrItems(items, Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Currency *
                </label>
                <select
                  value={payload.currency || 'ZMW'}
                  onChange={(e) => updateField('currency', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="ZMW">ZMW</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="ZAR">ZAR</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Budget Status *
                </label>
                <select
                  value={payload.budget_type || 'REGULAR_BUDGET'}
                  onChange={(e) => updateField('budget_type', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="REGULAR_BUDGET">Regular Budget</option>
                  <option value="OUTSIDE_BUDGET">Outside Budget</option>
                </select>
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

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800">
                  PR Line Items (Description, Cost Code, Needed By, Qty, Cost/Unit) *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updatePrItems([
                      ...items,
                      { description: '', cost_code: '', needed_by: '', qty: 1, unit_cost: 0 },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                >
                  <Plus className="w-3.5 h-3.5" /> Add PR Line
                </button>
              </div>

              {items.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Description *"
                    value={row.description}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, description: e.target.value };
                      updatePrItems(next);
                    }}
                    className="col-span-4 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Cost Code"
                    value={row.cost_code}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, cost_code: e.target.value };
                      updatePrItems(next);
                    }}
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    type="date"
                    value={row.needed_by}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, needed_by: e.target.value };
                      updatePrItems(next);
                    }}
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={row.qty}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, qty: Number(e.target.value) };
                      updatePrItems(next);
                    }}
                    className="col-span-1 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Unit Cost"
                    value={row.unit_cost}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, unit_cost: Number(e.target.value) };
                      updatePrItems(next);
                    }}
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={items.length <= 1}
                    onClick={() => updatePrItems(items.filter((_, i) => i !== idx))}
                    className="col-span-1 text-red-500 flex justify-center"
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
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Position Title *
              </label>
              <input
                type="text"
                value={payload.position_title || ''}
                onChange={(e) => updateField('position_title', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department / Faculty *
              </label>
              <input
                type="text"
                value={payload.department || ''}
                onChange={(e) => updateField('department', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Headcount Required *
              </label>
              <input
                type="number"
                min={1}
                value={payload.headcount || 1}
                onChange={(e) => updateField('headcount', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contract Type
              </label>
              <select
                value={payload.employment_type || 'FIXED_TERM'}
                onChange={(e) => updateField('employment_type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="FIXED_TERM">Fixed-Term Contract</option>
                <option value="PERMANENT">Permanent</option>
                <option value="TEMPORARY">Temporary / Relief</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Start Date
              </label>
              <input
                type="date"
                value={payload.target_start_date || ''}
                onChange={(e) => updateField('target_start_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operational & Budget Justification *
              </label>
              <textarea
                rows={3}
                value={payload.justification || ''}
                onChange={(e) => updateField('justification', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      

      case 'JOB_DESCRIPTION':
      default: {
        const responsibilities: string[] = Array.isArray(payload.key_responsibilities)
          ? payload.key_responsibilities
          : [''];
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={payload.job_title || ''}
                  onChange={(e) => updateField('job_title', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department *
                </label>
                <input
                  type="text"
                  value={payload.department || ''}
                  onChange={(e) => updateField('department', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reports To
                </label>
                <input
                  type="text"
                  value={payload.reports_to || ''}
                  onChange={(e) => updateField('reports_to', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">
                  Key Responsibilities & Duties *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateField('key_responsibilities', [...responsibilities, ''])
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Responsibility
                </button>
              </div>
              {responsibilities.map((resp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-5">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    placeholder="Describe key duty or deliverable..."
                    value={resp}
                    onChange={(e) => {
                      const next = [...responsibilities];
                      next[idx] = e.target.value;
                      updateField('key_responsibilities', next);
                    }}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={responsibilities.length <= 1}
                    onClick={() =>
                      updateField(
                        'key_responsibilities',
                        responsibilities.filter((_, i) => i !== idx)
                      )
                    }
                    className="text-red-500 hover:text-red-700 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Top Breadcrumb Bar (Matches 3.png) */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
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

      {/* Main Header with Back Button and Actions (Matches 3.png) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              title="Previous step"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
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
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
            >
              Continue to Sign-off <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              disabled={
                submitting ||
                !digitalSignature.trim() ||
                (selectedForm?.requires_policy && !termsAccepted)
              }
              onClick={() => handleFinalSubmit(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-2xs disabled:opacity-50 transition cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>

      {submitError && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {submitError}
        </div>
      )}

      {/* Stepper Navigation Tabs (Matches 3.png: General | Advanced / Step Tabs) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs px-5 pt-3 pb-0 flex items-center gap-8 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`pb-3 border-b-2 transition cursor-pointer ${
            step === 1
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. Select Form Type
        </button>
        <button
          type="button"
          disabled={!selectedForm}
          onClick={() => selectedForm && setStep(2)}
          className={`pb-3 border-b-2 transition cursor-pointer ${
            step === 2
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 disabled:opacity-40'
          }`}
        >
          2. General Form Details
        </button>
        <button
          type="button"
          disabled={!selectedForm}
          onClick={() => selectedForm && setStep(3)}
          className={`pb-3 border-b-2 transition cursor-pointer ${
            step === 3
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 disabled:opacity-40'
          }`}
        >
          3. Policy &amp; Digital Signature
        </button>
      </div>

      {/* STEP 1: PICK DEPARTMENT & FORM */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Filter by Organization Department
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a category to view the available administrative, academic, or logistics forms.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map((dept) => (
              <button
                type="button"
                key={dept.code}
                onClick={() => setSelectedDept(dept.code)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  selectedDept === dept.code
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dept.icon}
                {dept.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredForms.map((form) => (
              <button
                type="button"
                key={form.id}
                onClick={() => handleSelectForm(form)}
                className="text-left p-4 rounded-2xl border border-slate-200/80 hover:border-blue-500 hover:shadow-xs transition group cursor-pointer bg-slate-50/40 hover:bg-white"
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
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: DYNAMIC PAYLOAD INPUTS (2-Column Layout Matches 3.png) */}
      {step === 2 && selectedForm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column (2/3 width): Form Fields */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Form Inputs &amp; Information
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Fill out the required information accurately before proceeding to the digital signature step.
              </p>
            </div>

            {renderFormFields()}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Change Form
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
              >
                Continue to Sign-off <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column (1/3 width): Pricing / Summary Card (Matches 3.png) */}
          <div className="space-y-4">
            {/* Calculation / Pricing Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
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
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
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
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
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
                  <span className="text-slate-500">Institution:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                    {currentUser?.institution_name || 'Educore'}
                  </span>
                </div>
              </div>
            </div>

            {/* Routing Pipeline Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Approval Pipeline ({selectedForm.ref_prefix})
              </span>
              <div className="space-y-2">
                {selectedForm.workflow_pipeline.map((s) => (
                  <div
                    key={s.step_order}
                    className="flex items-center gap-2 text-xs p-2 rounded-xl bg-slate-50 border border-slate-100"
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
        </div>
      )}

      {/* STEP 3: POLICY ACCEPTANCE & DIGITAL SIGNATURE */}
      {step === 3 && selectedForm && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Policy Agreement &amp; Digital Sign-off
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review institutional statutory compliance policies and sign digitally to submit.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-bold text-slate-700 uppercase mb-2">
              Automated Routing Pipeline ({selectedForm.ref_prefix})
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {selectedForm.workflow_pipeline.map((s, idx) => (
                <React.Fragment key={s.step_order}>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium">
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
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-h-40 overflow-y-auto text-xs text-slate-600 whitespace-pre-line leading-relaxed">
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
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-serif italic focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Details
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalSubmit(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={
                  submitting ||
                  !digitalSignature.trim() ||
                  (selectedForm.requires_policy && !termsAccepted)
                }
                onClick={() => handleFinalSubmit(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-2xs disabled:opacity-50 transition cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Sign & Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewRequestStepper;