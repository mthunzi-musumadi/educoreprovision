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

      await submitStepDecision({
        applicationId: application.id,
        decision,
        comments: comments.trim() || undefined,
        digitalSignature: signature.trim() || currentUser?.full_name,
        checklistData: isHrStep ? hrChecklist : undefined,
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl flex flex-col justify-between">
        <div className="p-6 space-y-6">
          {/* Drawer Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                  {application.department}
                </span>
                <span className="font-mono text-xs font-bold text-blue-600">
                  {application.reference_number}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {application.form_title}
              </h2>
              <p className="text-xs text-slate-500">
                Applicant: <span className="font-semibold text-slate-700">{application.applicant_name}</span> ({application.applicant_employee_number}) · {application.institution_name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Live Stepper Bar */}
          <StepperProgress
            approvals={application.approvals}
            lifecycleStatus={application.status}
            currentStepOrder={application.current_step_order}
            submittedAt={application.applicant_signed_at}
          />

          {actionError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {actionError}
            </div>
          )}

          {/* Section 1: Form Payload Data */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Submitted Form Details
            </h3>
            {renderPayloadDetails()}
          </div>

          {/* Section 2: Policy Acceptance Snapshot (If required by form) */}
          {application.legal_text_snapshot && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Signed Policy Snapshot
              </h3>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 max-h-28 overflow-y-auto whitespace-pre-line">
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

          {/* Section 3: Approval Chain Sign-offs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" /> Approval Pipeline Sign-offs
            </h3>
            <div className="space-y-2">
              {application.approvals?.map((step) => (
                <div
                  key={step.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col gap-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Step {step.step_order}: {step.step_label}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        step.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : step.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : step.status === 'REVISION_REQUESTED'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>

                  {step.reviewer_name && (
                    <div className="text-slate-500 text-[11px]">
                      Reviewed by <span className="font-semibold text-slate-700">{step.reviewer_name}</span> on{' '}
                      {step.signed_at ? new Date(step.signed_at).toLocaleString() : ''}
                    </div>
                  )}

                  {step.comments && (
                    <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                      "{step.comments}"
                    </p>
                  )}

                  {/* Render IT Metadata if present */}
                  {step.step_metadata &&
                    Object.keys(step.step_metadata).length > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-600 border-t border-slate-100">
                        {(() => {
                          const meta = step.step_metadata as Record<string, unknown>;
                          if (meta.asset_serial_number) {
                            return (
                              <div>
                                Serial #: <span className="font-mono font-bold">{String(meta.asset_serial_number)}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {(() => {
                          const meta = step.step_metadata as Record<string, unknown>;
                          if (meta.deducted_monthly_amount_zmw) {
                            return (
                              <div>
                                Final Monthly Deduction:{' '}
                                <span className="font-bold">
                                  ZMW {Number(meta.deducted_monthly_amount_zmw).toLocaleString()}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Active Reviewer Console (Only visible to the assigned role) */}
          {isCurrentReviewer && activeApprovalStep && (
            <div className="p-4 rounded-2xl bg-blue-50/60 border-2 border-blue-600 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Action Required · {activeApprovalStep.required_role.replace(/_/g, ' ')}
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {activeApprovalStep.step_label}
                </h4>
              </div>

              {/* HR Vetting Checklist (When HR Manager is reviewing) */}
              {activeApprovalStep.required_role === 'HR_MANAGER' && (
                <div className="space-y-2 bg-white p-3 rounded-lg border border-blue-200 text-xs">
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
                      />
                      <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* IT Provisioning Inputs (When IT Manager signs off on ICT Purchase) */}
              {activeApprovalStep.required_role === 'IT_MANAGER' &&
                application.form_code === 'ICT_PURCHASE' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-blue-200 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Asset Serial Number *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., SN-ZMW-90210"
                        value={assetSerialNumber}
                        onChange={(e) => setAssetSerialNumber(e.target.value)}
                        className="w-full border rounded px-2.5 py-1.5"
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
                        className="w-full border rounded px-2.5 py-1.5"
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
                        className="w-full border rounded px-2.5 py-1.5"
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
                        className="w-full border rounded px-2.5 py-1.5"
                      />
                    </div>
                  </div>
                )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reviewer Comments / Notes
                </label>
                <textarea
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Optional endorsement or rejection remarks..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
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
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-serif italic"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={submitting || !signature.trim()}
                  onClick={() => handleDecision('APPROVED')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve & Advance
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision('REVISION_REQUESTED')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" /> Request Revision
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision('REJECTED')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
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