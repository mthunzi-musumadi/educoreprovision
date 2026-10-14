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
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import {
  DepartmentCode,
  FormCode,
  FormDefinition,
  RepaymentPlan,
  StoresReqItem,
  StockReturnItem,
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

  // Wizard Step: 1 = Pick Form, 2 = Fill Payload, 3 = Policy & Signature
  const [step, setStep] = useState<1 | 2 | 3>(initialFormCode ? 2 : 1);
  const [selectedDept, setSelectedDept] = useState<DepartmentCode | 'ALL'>('ALL');
  const [selectedFormCode, setSelectedFormCode] = useState<FormCode>(
    initialFormCode || 'ICT_PURCHASE'
  );

  // Dynamic payload state
  const [payload, setPayload] = useState<Record<string, any>>({
    repayment_period: 'TWELVE_MONTHS',
    account_type: 'CURRENT',
    transport_mode: 'VEHICLE',
    employment_type: 'FIXED_TERM',
    items: [],
    key_responsibilities: [''],
  });

  // Signature & Policy state
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

  // Auto-calculate ICT monthly deduction whenever tier or repayment period changes
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

  // Initialize default payload structure when picking a form
  const handleSelectForm = (form: FormDefinition) => {
    setSelectedFormCode(form.code);
    setSubmitError(null);

    if (form.code === 'ICT_PURCHASE' && equipmentTiers.length > 0) {
      const defaultTier = equipmentTiers[0];
      setPayload({
        equipment_tier_id: defaultTier.id,
        repayment_period: 'TWELVE_MONTHS',
        estimated_monthly_amount_zmw: Number((Number(defaultTier.price_zmw) / 12).toFixed(2)),
      });
    } else if (form.code === 'STORES_REQ') {
      setPayload({
        cost_center: currentUser?.department || 'ACADEMICS',
        delivery_location: currentUser?.institution_name || '',
        items: [{ item_code: '', description: '', qty_requested: 1, unit: 'EA' }] as StoresReqItem[],
      });
    } else if (form.code === 'STOCK_RETURN') {
      setPayload({
        return_reason: '',
        items: [{ item_code: '', description: '', qty: 1, condition: 'GOOD' }] as StockReturnItem[],
      });
    } else if (form.code === 'JOB_DESCRIPTION') {
      setPayload({
        job_title: currentUser?.job_title || '',
        department: currentUser?.department || '',
        reports_to: '',
        key_responsibilities: [''],
      });
    } else {
      setPayload({
        account_type: 'CURRENT',
        transport_mode: 'VEHICLE',
        employment_type: 'FIXED_TERM',
        target_school_id: institutions[0]?.id || '',
        academic_year: new Date().getFullYear().toString(),
      });
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
  // RENDERERS FOR FORM-SPECIFIC FIELDS (STEP 2)
  // ==========================================================================
  const renderFormFields = () => {
    switch (selectedFormCode) {
      case 'ICT_PURCHASE':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Laptop Tier
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
                        <div>RAM/Storage: {tier.ram} / {tier.storage}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Repayment Period
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
                    onClick={() =>
                      handleIctSelection(payload.equipment_tier_id, plan.code)
                    }
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

      case 'TRAVEL_REQUEST':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Destination *</label>
              <input
                type="text"
                placeholder="e.g., Lusaka / Sentinel Kabitaka"
                value={payload.destination || ''}
                onChange={(e) => updateField('destination', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Departure Date *</label>
              <input
                type="date"
                value={payload.departure_date || ''}
                onChange={(e) => updateField('departure_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Return Date *</label>
              <input
                type="date"
                value={payload.return_date || ''}
                onChange={(e) => updateField('return_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transport Mode</label>
              <select
                value={payload.transport_mode || 'VEHICLE'}
                onChange={(e) => updateField('transport_mode', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="VEHICLE">Company Vehicle</option>
                <option value="FLIGHT">Flight</option>
                <option value="BUS">Public Coach / Bus</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Cost (ZMW)</label>
              <input
                type="number"
                value={payload.estimated_cost_zmw || ''}
                onChange={(e) => updateField('estimated_cost_zmw', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose of Travel *</label>
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repayment Months *
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
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contract Start Date *
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
                    Accrued Service Months *
                  </label>
                  <input
                    type="number"
                    value={payload.accrued_months || ''}
                    onChange={(e) => updateField('accrued_months', Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Justification *</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name *</label>
              <input
                type="text"
                placeholder="e.g., Stanbic Bank Zambia"
                value={payload.bank_name || ''}
                onChange={(e) => updateField('bank_name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name *</label>
              <input
                type="text"
                placeholder="e.g., Solwezi Branch"
                value={payload.branch_name || ''}
                onChange={(e) => updateField('branch_name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number *</label>
              <input
                type="text"
                value={payload.account_number || ''}
                onChange={(e) => updateField('account_number', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Type *</label>
              <select
                value={payload.account_type || 'CURRENT'}
                onChange={(e) => updateField('account_type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="CURRENT">Current Account</option>
                <option value="SAVINGS">Savings Account</option>
              </select>
            </div>
          </div>
        );

      case 'STORES_REQ':
      case 'STOCK_RETURN': {
        const isStores = selectedFormCode === 'STORES_REQ';
        const items: any[] = payload.items || [];
        return (
          <div className="space-y-4">
            {isStores ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Center *</label>
                  <input
                    type="text"
                    value={payload.cost_center || ''}
                    onChange={(e) => updateField('cost_center', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Location</label>
                  <input
                    type="text"
                    value={payload.delivery_location || ''}
                    onChange={(e) => updateField('delivery_location', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Stock Return *</label>
                <input
                  type="text"
                  value={payload.return_reason || ''}
                  onChange={(e) => updateField('return_reason', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">Line Items *</label>
                <button
                  type="button"
                  onClick={() =>
                    updateField('items', [
                      ...items,
                      isStores
                        ? { item_code: '', description: '', qty_requested: 1, unit: 'EA' }
                        : { item_code: '', description: '', qty: 1, condition: 'GOOD' },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Code"
                    value={item.item_code}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...item, item_code: e.target.value };
                      updateField('items', next);
                    }}
                    className="col-span-3 border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...item, description: e.target.value };
                      updateField('items', next);
                    }}
                    className="col-span-5 border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={isStores ? item.qty_requested : item.qty}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = isStores
                        ? { ...item, qty_requested: Number(e.target.value) }
                        : { ...item, qty: Number(e.target.value) };
                      updateField('items', next);
                    }}
                    className="col-span-2 border rounded-lg px-2.5 py-1.5 text-xs"
                  />
                  {!isStores && (
                    <select
                      value={item.condition}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...item, condition: e.target.value };
                        updateField('items', next);
                      }}
                      className="col-span-1 border rounded-lg px-1 py-1.5 text-xs"
                    >
                      <option value="GOOD">Good</option>
                      <option value="DAMAGED">Damaged</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  )}
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

      case 'PROF_DEV':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Course / Program Title *</label>
              <input
                type="text"
                value={payload.course_title || ''}
                onChange={(e) => updateField('course_title', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Training Provider / Institution *</label>
              <input
                type="text"
                value={payload.provider || ''}
                onChange={(e) => updateField('provider', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Cost (ZMW) *</label>
              <input
                type="number"
                value={payload.cost_zmw || ''}
                onChange={(e) => updateField('cost_zmw', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={payload.start_date || ''}
                onChange={(e) => updateField('start_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'CHILD_ADMISSION':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Child's Full Name *</label>
              <input
                type="text"
                value={payload.child_full_name || ''}
                onChange={(e) => updateField('child_full_name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                value={payload.date_of_birth || ''}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Educore School *</label>
              <select
                value={payload.target_school_id || ''}
                onChange={(e) => updateField('target_school_id', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year *</label>
              <input
                type="text"
                value={payload.academic_year || '2026'}
                onChange={(e) => updateField('academic_year', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'CONTRACT_RENEWAL':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Contract End Date *</label>
              <input
                type="date"
                value={payload.current_contract_end_date || ''}
                onChange={(e) => updateField('current_contract_end_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Renewal Tenure (Months) *</label>
              <input
                type="number"
                value={payload.proposed_tenure_months || 24}
                onChange={(e) => updateField('proposed_tenure_months', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Key Achievements / Renewal Summary</label>
              <textarea
                rows={3}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Date *</label>
              <input
                type="date"
                value={payload.incident_date || ''}
                onChange={(e) => updateField('incident_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Charge / Reference Number *</label>
              <input
                type="text"
                value={payload.charge_reference || ''}
                onChange={(e) => updateField('charge_reference', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Exculpatory Statement *</label>
              <textarea
                rows={4}
                value={payload.employee_statement || ''}
                onChange={(e) => updateField('employee_statement', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'MANPOWER_REQ':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Position Title *</label>
              <input
                type="text"
                value={payload.position_title || ''}
                onChange={(e) => updateField('position_title', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
              <input
                type="text"
                value={payload.department || ''}
                onChange={(e) => updateField('department', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Headcount Required *</label>
              <input
                type="number"
                min={1}
                value={payload.headcount || 1}
                onChange={(e) => updateField('headcount', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Justification for Role *</label>
              <textarea
                rows={3}
                value={payload.justification || ''}
                onChange={(e) => updateField('justification', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'EVENT_COMPLETION':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Name *</label>
              <input
                type="text"
                value={payload.event_name || ''}
                onChange={(e) => updateField('event_name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Date *</label>
              <input
                type="date"
                value={payload.event_date || ''}
                onChange={(e) => updateField('event_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Budget (ZMW) *</label>
              <input
                type="number"
                value={payload.total_budget_zmw || ''}
                onChange={(e) => updateField('total_budget_zmw', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Spend (ZMW) *</label>
              <input
                type="number"
                value={payload.actual_spend_zmw || ''}
                onChange={(e) => updateField('actual_spend_zmw', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'JOB_DESCRIPTION':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
              <input
                type="text"
                value={payload.job_title || ''}
                onChange={(e) => updateField('job_title', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
              <input
                type="text"
                value={payload.department || ''}
                onChange={(e) => updateField('department', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Key Responsibilities (One per line) *
              </label>
              <textarea
                rows={4}
                value={
                  Array.isArray(payload.key_responsibilities)
                    ? payload.key_responsibilities.join('\n')
                    : ''
                }
                onChange={(e) =>
                  updateField(
                    'key_responsibilities',
                    e.target.value.split('\n').filter((r) => r.trim().length > 0)
                  )
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Step {step} of 3
          </span>
          <h2 className="text-xl font-bold text-slate-900">
            {step === 1
              ? 'Select Application Form'
              : step === 2
              ? selectedForm?.title || 'Complete Form Details'
              : 'Policy Acceptance & Digital Sign-off'}
          </h2>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
        )}
      </div>

      {submitError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {submitError}
        </div>
      )}

      {/* STEP 1: PICK DEPARTMENT & FORM */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map((dept) => (
              <button
                type="button"
                key={dept.code}
                onClick={() => setSelectedDept(dept.code)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                  selectedDept === dept.code
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dept.icon}
                {dept.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredForms.map((form) => (
              <button
                type="button"
                key={form.id}
                onClick={() => handleSelectForm(form)}
                className="text-left p-4 rounded-xl border border-slate-200 hover:border-blue-600 hover:shadow-sm transition group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {form.department} · {form.ref_prefix}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                </div>
                <h3 className="font-bold text-slate-900 mt-2 text-sm">{form.title}</h3>
                <p className="text-[11px] text-slate-500 mt-2">
                  Pipeline:{' '}
                  {form.workflow_pipeline.map((s) => s.label).join(' → ')}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: DYNAMIC PAYLOAD INPUTS */}
      {step === 2 && (
        <div className="space-y-6">
          {renderFormFields()}

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" /> Change Form Type
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Continue to Sign-off <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: POLICY ACCEPTANCE & DIGITAL SIGNATURE */}
      {step === 3 && selectedForm && (
        <div className="space-y-6">
          {/* Approval Pipeline Preview */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
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

          {/* Conditional Policy Snapshot */}
          {selectedForm.requires_policy && activePolicy && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Policy Terms ({activePolicy.version_tag})
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 max-h-40 overflow-y-auto text-xs text-slate-600 whitespace-pre-line">
                {activePolicy.legal_text}
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                I have read, understood, and agree to the policy terms and any applicable payroll deductions.
              </label>
            </div>
          )}

          {/* Digital Signature Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Applicant Digital Signature (Type Full Legal Name) *
            </label>
            <input
              type="text"
              value={digitalSignature}
              onChange={(e) => setDigitalSignature(e.target.value)}
              placeholder={currentUser?.full_name || 'Full Name'}
              className="w-full border rounded-lg px-3 py-2 text-sm font-serif italic"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Details
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalSubmit(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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