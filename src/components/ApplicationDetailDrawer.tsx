import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  FileText,
  Ban,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { WorkflowApplication } from '../types';
import { StepperProgress } from './common/StepperProgress';

interface ApplicationDetailDrawerProps {
  application: WorkflowApplication | null;
  onClose: () => void;
}

export const ApplicationDetailDrawer: React.FC<ApplicationDetailDrawerProps> = ({
  application,
  onClose,
}) => {
  const {
    currentUser,
    equipmentTiers,
    institutions,
    submitStepDecision,
    withdrawApplication,
  } = useAppContext();

  // Reviewer sign-off state
  const [comments, setComments] = useState('');
  const [signature, setSignature] = useState(currentUser?.full_name || '');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // HR Vetting Checklist state (Used when HR_MANAGER reviews)
  const [hrChecklist, setHrChecklist] = useState<Record<string, boolean>>({
    employment_confirmed: true,
    affordability_verified: true,
    no_active_disciplinary: true,
  });

  // Finance Event Completion Closure Checklist (Matches Event Completion Form.docx)
  const [financeEventChecklist, setFinanceEventChecklist] = useState<Record<string, boolean>>({
    receivables_costing_submitted: true,
    receivables_quotations_submitted: true,
    receivables_sage_billing_posted: true,
    payables_expense_docs_submitted: true,
    payables_postings_completed: true,
  });

  // IT Sign-off Metadata state (Used when IT_MANAGER signs off ICT_PURCHASE)
  const [assetSerialNumber, setAssetSerialNumber] = useState('');
  const [deductedMonthlyAmount, setDeductedMonthlyAmount] = useState<number>(
    Number((application?.payload as any)?.estimated_monthly_amount_zmw || 0)
  );
  const [deductionStartDate, setDeductionStartDate] = useState('');
  const [deductionEndDate, setDeductionEndDate] = useState('');

  if (!application) return null;

  const isCurrentReviewer =
    application.status === 'IN_REVIEW' &&
    currentUser &&
    (currentUser.role === 'SUPER_ADMIN' ||
      (currentUser.role === application.current_approver_role &&
        (!['HEAD_TEACHER', 'LINE_MANAGER'].includes(currentUser.role) ||
          currentUser.institution_id === application.institution_id)));

  const canApplicantWithdraw =
    currentUser?.id === application.applicant_id &&
    ['DRAFT', 'IN_REVIEW', 'REVISION_REQUIRED'].includes(application.status);

  const activeApprovalStep = application.approvals?.find(
    (s) => s.step_order === application.current_step_order
  );

  const handleDecision = async (
    decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED'
  ) => {
    setSubmitting(true);
    setActionError(null);
    try {
      const isHrStep = activeApprovalStep?.required_role === 'HR_MANAGER';
      const isItPurchaseStep =
        activeApprovalStep?.required_role === 'IT_MANAGER' &&
        application.form_code === 'ICT_PURCHASE';
      const isFinanceEventStep =
        activeApprovalStep?.required_role === 'FINANCE_MANAGER' &&
        application.form_code === 'EVENT_COMPLETION';
      

      await submitStepDecision({
        applicationId: application.id,
        decision,
        comments: comments.trim() || undefined,
        digitalSignature: signature.trim() || currentUser?.full_name,
        checklistData: isHrStep
          ? hrChecklist
          : isFinanceEventStep
          ? financeEventChecklist
          : undefined,
        stepMetadata: isItPurchaseStep
          ? {
              asset_serial_number: assetSerialNumber.trim(),
              deducted_monthly_amount_zmw: deductedMonthlyAmount,
              deduction_start_date: deductionStartDate || null,
              deduction_end_date: deductionEndDate || null,
            }
          : undefined,
      });
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      await withdrawApplication(application.id);
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Failed to withdraw application.');
    } finally {
      setSubmitting(false);
    }
  };

  // Polymorphic Payload Renderer
  const renderPayloadDetails = () => {
    const p = application.payload as Record<string, any>;

    if (application.form_code === 'ICT_PURCHASE') {
      const tier = equipmentTiers.find((t) => t.id === p.equipment_tier_id);
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block">Selected Equipment Tier</span>
            <span className="font-bold text-slate-900">
              {tier ? `${tier.title} (${tier.tier_code})` : p.equipment_tier_id}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Repayment Period</span>
            <span className="font-bold text-slate-900">
              {String(p.repayment_period || '').replace(/_/g, ' ')}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Cash Price</span>
            <span className="font-bold text-slate-900">
              ZMW {Number(tier?.price_zmw || 0).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Estimated Monthly Deduction</span>
            <span className="font-bold text-blue-700">
              ZMW {Number(p.estimated_monthly_amount_zmw || 0).toLocaleString()} / mo
            </span>
          </div>
        </div>
      );
    }

    if (application.form_code === 'TRAVEL_REQUEST') {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 block">Cost Code</span>
              <span className="font-bold text-slate-900">{p.cost_code}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Site</span>
              <span className="font-bold text-slate-900">{p.site}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Contact</span>
              <span className="font-bold text-slate-900">{p.contact_number}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Flight Category</span>
              <span className="font-bold text-blue-700">{p.flight_booking_type}</span>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <span className="text-slate-500 block">Reason for Travel</span>
              <span className="font-semibold text-slate-900">{p.reason_for_travel}</span>
            </div>
          </div>

          {Array.isArray(p.passengers) && p.passengers.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Passenger Surname</th>
                    <th className="py-2 px-3">First Name</th>
                    <th className="py-2 px-3">Gender</th>
                    <th className="py-2 px-3">DOB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {p.passengers.map((pas: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-bold">{pas.surname}</td>
                      <td className="py-2 px-3">{pas.first_name}</td>
                      <td className="py-2 px-3">{pas.gender}</td>
                      <td className="py-2 px-3">{pas.date_of_birth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(p.flights) && p.flights.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Flight Date</th>
                    <th className="py-2 px-3">From</th>
                    <th className="py-2 px-3">To</th>
                    <th className="py-2 px-3">Airline</th>
                    <th className="py-2 px-3">Dep. Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {p.flights.map((fl: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">{fl.date}</td>
                      <td className="py-2 px-3 font-semibold">{fl.from_location}</td>
                      <td className="py-2 px-3 font-semibold">{fl.to_location}</td>
                      <td className="py-2 px-3">{fl.airline}</td>
                      <td className="py-2 px-3">{fl.departure_time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 block">Accommodation</span>
              <span className="font-semibold text-slate-900">
                {p.accommodation_required
                  ? `${p.hotel_name || 'Hotel TBA'} (${p.check_in_datetime || ''} → ${p.check_out_date || ''})`
                  : 'Not Required'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Ground Transfer / Car Hire</span>
              <span className="font-semibold text-slate-900">
                {p.transfer_type} {p.pickup_time_place ? `· Pick-up: ${p.pickup_time_place}` : ''}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (application.form_code === 'CHILD_ADMISSION' && Array.isArray(p.children)) {
          return (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Academic Year</span>
                  <span className="font-bold text-slate-900">{p.academic_year}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Staff Tenure (Years)</span>
                  <span className="font-bold text-slate-900">{p.staff_tenure_years ?? 'N/A'}</span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Child Name</th>
                      <th className="py-2 px-3">DOB</th>
                      <th className="py-2 px-3">Target School</th>
                      <th className="py-2 px-3">Year Group</th>
                      <th className="py-2 px-3">Rebate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {p.children.map((c: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-900">{c.child_full_name}</td>
                        <td className="py-2 px-3">{c.date_of_birth}</td>
                        <td className="py-2 px-3">
                          {institutions.find((i) => i.id === c.target_school_id)?.name || c.target_school_id}
                        </td>
                        <td className="py-2 px-3">{c.year_group} ({c.admission_term})</td>
                        <td className="py-2 px-3 font-bold text-blue-700">{c.fee_rebate_percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

    if (
      (application.form_code === 'STORES_REQ' ||
        application.form_code === 'STOCK_RETURN') &&
      Array.isArray(p.items)
    ) {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            {p.cost_center && (
              <div>
                <span className="text-slate-500 block">Cost Center</span>
                <span className="font-semibold text-slate-900">{p.cost_center}</span>
              </div>
            )}
            {p.delivery_location && (
              <div>
                <span className="text-slate-500 block">Delivery Location</span>
                <span className="font-semibold text-slate-900">{p.delivery_location}</span>
              </div>
            )}
            {p.return_reason && (
              <div className="col-span-2">
                <span className="text-slate-500 block">Return Reason</span>
                <span className="font-semibold text-slate-900">{p.return_reason}</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Item Code</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Qty</th>
                  {application.form_code === 'STOCK_RETURN' && (
                    <th className="py-2 px-3">Condition</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {p.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2 px-3 font-mono font-medium">{item.item_code}</td>
                    <td className="py-2 px-3">{item.description}</td>
                    <td className="py-2 px-3 font-bold">
                      {item.qty_requested ?? item.qty} {item.unit || ''}
                    </td>
                    {application.form_code === 'STOCK_RETURN' && (
                      <td className="py-2 px-3">{item.condition}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Generic structured key-value grid for all other HR, Finance, and Logistics forms
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        {Object.entries(p).map(([key, value]) => {
          let displayVal = String(value ?? 'N/A');
          if (key === 'target_school_id') {
            displayVal =
              institutions.find((i) => i.id === value)?.name || String(value);
          } else if (Array.isArray(value)) {
            displayVal = value.join(', ');
          } else if (key.endsWith('_zmw')) {
            displayVal = `ZMW ${Number(value || 0).toLocaleString()}`;
          }

          return (
            <div key={key} className={displayVal.length > 50 ? 'sm:col-span-2' : ''}>
              <span className="text-slate-500 capitalize block">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="font-semibold text-slate-900 whitespace-pre-line">
                {displayVal}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Drawer Tab State (Matches 2.png)
  type DrawerTab = 'BASIC_INFO' | 'LOGS' | 'REVIEW_SIGNOFF';
  const [drawerTab, setDrawerTab] = useState<DrawerTab>(
    isCurrentReviewer ? 'REVIEW_SIGNOFF' : 'BASIC_INFO'
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl flex flex-col justify-between">
        <div className="p-6 space-y-5">
          {/* Drawer Header (Matches 2.png) */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                  {application.department}
                </span>
                <span className="font-mono text-xs font-bold text-blue-600">
                  {application.reference_number}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                    application.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : application.status === 'REJECTED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : application.status === 'REVISION_REQUIRED'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : application.status === 'IN_REVIEW'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {application.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {application.form_title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Applicant: <span className="font-semibold text-slate-700">{application.applicant_name}</span> ({application.applicant_employee_number}) · {application.institution_name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <StepperProgress
            approvals={application.approvals}
            lifecycleStatus={application.status}
            currentStepOrder={application.current_step_order}
            submittedAt={application.applicant_signed_at}
          />

          {/* Navigation Tabs (Matches 2.png: Basic Info | Logs | Service/Sign-off) */}
          <div className="flex items-center border-b border-slate-200 text-xs font-semibold gap-6 pt-1">
            <button
              type="button"
              onClick={() => setDrawerTab('BASIC_INFO')}
              className={`pb-3 transition cursor-pointer relative ${
                drawerTab === 'BASIC_INFO'
                  ? 'text-teal-700 border-b-2 border-teal-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Basic Info
            </button>
            <button
              type="button"
              onClick={() => setDrawerTab('LOGS')}
              className={`pb-3 transition cursor-pointer flex items-center gap-1.5 relative ${
                drawerTab === 'LOGS'
                  ? 'text-teal-700 border-b-2 border-teal-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Logs</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
                {application.approvals?.length || 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDrawerTab('REVIEW_SIGNOFF')}
              className={`pb-3 transition cursor-pointer flex items-center gap-1.5 relative ${
                drawerTab === 'REVIEW_SIGNOFF'
                  ? 'text-teal-700 border-b-2 border-teal-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Review &amp; Sign-off</span>
              {isCurrentReviewer && (
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              )}
            </button>
          </div>

          {actionError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {actionError}
            </div>
          )}

          {/* TAB 1: BASIC INFO */}
          {drawerTab === 'BASIC_INFO' && (
            <div className="space-y-6">
              {/* Section 1: Form Payload Data */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" /> Submitted Form Details
                </h3>
                {renderPayloadDetails()}
              </div>

              {/* Section 2: Policy Acceptance Snapshot (If required by form) */}
              {application.legal_text_snapshot && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Signed Policy Snapshot
                  </h3>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 max-h-32 overflow-y-auto whitespace-pre-line leading-relaxed">
                    {application.legal_text_snapshot}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Digitally signed by <span className="font-serif italic font-semibold text-slate-800">{application.applicant_digital_signature}</span> on{' '}
                    {application.applicant_signed_at
                      ? new Date(application.applicant_signed_at).toLocaleString()
                      : 'Draft'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOGS & AUDIT TIMELINE (Matches 2.png) */}
          {drawerTab === 'LOGS' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Workflow Activity &amp; Sign-off Timeline
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time audit log of approvals, endorsements, and status changes.
                </p>
              </div>

              {/* Connected Vertical Timeline (Matches 2.png Logs design) */}
              <div className="relative pl-6 ml-2 border-l-2 border-teal-500/80 space-y-7 pb-2">
                {application.approvals?.map((step) => {
                  const isDone = step.status === 'APPROVED';
                  const isCurrent =
                    application.status === 'IN_REVIEW' &&
                    step.step_order === application.current_step_order;

                  return (
                    <div key={step.id} className="relative group">
                      {/* Timeline Node Bullet (Matches 2.png) */}
                      <span
                        className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-2xs transition ${
                          isDone
                            ? 'bg-teal-600'
                            : isCurrent
                            ? 'bg-blue-600 ring-4 ring-blue-100'
                            : step.status === 'REJECTED'
                            ? 'bg-rose-600'
                            : 'bg-slate-300'
                        }`}
                      />

                      <div className="space-y-1.5">
                        {/* Status badge pill + Date line (Matches 2.png) */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              isDone
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : isCurrent
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : step.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            {step.status === 'APPROVED'
                              ? 'Approved'
                              : isCurrent
                              ? 'In Review'
                              : step.status.replace(/_/g, ' ')}
                          </span>

                          <span className="text-xs font-bold text-slate-800">
                            {step.signed_at
                              ? new Date(step.signed_at).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : isCurrent
                              ? 'Pending Action'
                              : 'Waiting Prior Step'}
                          </span>

                          {step.reviewer_name && (
                            <span className="text-xs text-slate-500 font-medium">
                              by <span className="font-semibold text-slate-700">{step.reviewer_name}</span> ({step.required_role.replace(/_/g, ' ')})
                            </span>
                          )}
                        </div>

                        {/* Step title & description */}
                        <div className="text-xs text-slate-700 font-medium">
                          Step {step.step_order}: {step.step_label}
                        </div>

                        {/* Reviewer Comments */}
                        {step.comments && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 italic">
                            "{step.comments}"
                          </div>
                        )}

                        {/* Metadata if present */}
                        {step.step_metadata &&
                          Object.keys(step.step_metadata).length > 0 && (
                            <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 grid grid-cols-2 gap-2">
                              {(() => {
                                const meta = step.step_metadata as Record<string, unknown>;
                                return (
                                  <>
                                    {meta.asset_serial_number && (
                                      <div>
                                        Serial #: <span className="font-mono font-bold">{String(meta.asset_serial_number)}</span>
                                      </div>
                                    )}
                                    {meta.deducted_monthly_amount_zmw && (
                                      <div>
                                        Monthly: <span className="font-bold">ZMW {Number(meta.deducted_monthly_amount_zmw).toLocaleString()}</span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: REVIEW & SIGN-OFF CONSOLE */}
          {drawerTab === 'REVIEW_SIGNOFF' && (
            <div className="space-y-4">
              {isCurrentReviewer && activeApprovalStep ? (
                <div className="p-5 rounded-2xl bg-blue-50/60 border-2 border-blue-600 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      Action Required · {activeApprovalStep.required_role.replace(/_/g, ' ')}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      {activeApprovalStep.step_label}
                    </h4>
                  </div>

                  {/* HR Vetting Checklist */}
                  {activeApprovalStep.required_role === 'HR_MANAGER' && (
                    <div className="space-y-2 bg-white p-3.5 rounded-xl border border-blue-200 text-xs">
                      <span className="font-bold text-slate-700 block">
                        HR Vetting Checklist
                      </span>
                      {Object.entries(hrChecklist).map(([key, checked]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setHrChecklist((prev) => ({
                                ...prev,
                                [key]: e.target.checked,
                              }))
                            }
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Finance Event Checklist */}
                  {activeApprovalStep.required_role === 'FINANCE_MANAGER' &&
                    application.form_code === 'EVENT_COMPLETION' && (
                      <div className="space-y-2 bg-white p-3.5 rounded-xl border border-blue-200 text-xs">
                        <span className="font-bold text-slate-700 block">
                          Finance Receivables &amp; Payables Closure Confirmation
                        </span>
                        {Object.entries(financeEventChecklist).map(([key, checked]) => (
                          <label key={key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setFinanceEventChecklist((prev) => ({
                                  ...prev,
                                  [key]: e.target.checked,
                                }))
                              }
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                          </label>
                        ))}
                      </div>
                    )}

                  {/* IT Provisioning Inputs */}
                  {activeApprovalStep.required_role === 'IT_MANAGER' &&
                    application.form_code === 'ICT_PURCHASE' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-blue-200 text-xs">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Asset Serial Number *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., SN-ZMW-90210"
                            value={assetSerialNumber}
                            onChange={(e) => setAssetSerialNumber(e.target.value)}
                            className="w-full border rounded-lg px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Final Monthly Deduction (ZMW) *
                          </label>
                          <input
                            type="number"
                            value={deductedMonthlyAmount}
                            onChange={(e) =>
                              setDeductedMonthlyAmount(Number(e.target.value))
                            }
                            className="w-full border rounded-lg px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Deduction Start Date
                          </label>
                          <input
                            type="date"
                            value={deductionStartDate}
                            onChange={(e) => setDeductionStartDate(e.target.value)}
                            className="w-full border rounded-lg px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Deduction End Date
                          </label>
                          <input
                            type="date"
                            value={deductionEndDate}
                            onChange={(e) => setDeductionEndDate(e.target.value)}
                            className="w-full border rounded-lg px-2.5 py-1.5"
                          />
                        </div>
                      </div>
                    )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reviewer Comments / Endorsement Remarks
                    </label>
                    <textarea
                      rows={2}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Optional remarks, approvals or revision instructions..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Digital Signature *
                    </label>
                    <input
                      type="text"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-serif italic"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={submitting || !signature.trim()}
                      onClick={() => handleDecision('APPROVED')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve &amp; Advance
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDecision('REVISION_REQUESTED')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50 transition cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="w-4 h-4" /> Request Revision
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDecision('REJECTED')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 transition cursor-pointer shadow-2xs"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <span className="inline-block p-3 rounded-full bg-white border border-slate-200 text-slate-500 shadow-2xs">
                    <UserCheck className="w-6 h-6 text-blue-600" />
                  </span>
                  <h4 className="text-sm font-bold text-slate-800">
                    {application.status === 'APPROVED'
                      ? 'Application Fully Approved'
                      : application.status === 'REJECTED'
                      ? 'Application Rejected'
                      : `Awaiting Sign-off: ${application.current_approver_role?.replace(/_/g, ' ') || 'Assigned Reviewer'}`}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {application.status === 'IN_REVIEW'
                      ? `This application is currently waiting for sign-off by the ${application.current_approver_role?.replace(/_/g, ' ')}. Only assigned reviewers can record a decision.`
                      : 'The workflow has completed its approval pipeline.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          {canApplicantWithdraw ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleWithdraw}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100"
            >
              <Ban className="w-3.5 h-3.5" /> Withdraw Application
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetailDrawer;