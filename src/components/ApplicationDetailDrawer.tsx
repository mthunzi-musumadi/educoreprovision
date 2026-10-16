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
  Printer,
  Copy,
  Clock,
  Layers,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  WorkflowApplication,
  ROLE_LABELS,
  isAwaitingUserSignOff,
} from '../types';
import { StepperProgress } from './common/StepperProgress';
import { StatusBadge } from './common/StatusBadge';
import { useToast } from './common/Toast';

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
    sites,
    submitStepDecision,
    withdrawApplication,
  } = useAppContext();

  const [comments, setComments] = useState('');
  const [signature, setSignature] = useState(currentUser?.full_name || '');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);



  // Finance Event Completion Closure Checklist (Matches Event Completion Form.docx)
  const [financeEventChecklist, setFinanceEventChecklist] = useState<Record<string, boolean>>({
    receivables_costing_submitted: true,
    receivables_quotations_submitted: true,
    receivables_sage_billing_posted: true,
    payables_expense_docs_submitted: true,
    payables_postings_completed: true,
  });

  // IT Sign-off Metadata (Matches Application ICT Purchase Scheme.pdf)
  const [assetSerialNumber, setAssetSerialNumber] = useState('');
  const [deductedMonthlyAmount, setDeductedMonthlyAmount] = useState<number>(
    Number((application?.payload as any)?.estimated_monthly_amount_zmw || 0)
  );
  const [deductionStartDate, setDeductionStartDate] = useState('');
  const [deductionEndDate, setDeductionEndDate] = useState('');
  const { showToast } = useToast();
  const [drawerTab, setDrawerTab] = useState<'DETAILS' | 'LOGS' | 'ACTION'>('DETAILS');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!application) return null;

  const isCurrentReviewer = isAwaitingUserSignOff(application, currentUser);

  const canApplicantWithdraw =
    currentUser?.id === application.applicant_id &&
    currentUser?.site_id === application.site_id &&
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
      const isFinanceEventStep =
        activeApprovalStep?.required_role === 'FINANCE_MANAGER' &&
        application.form_code === 'EVENT_COMPLETION';
      const isItPurchaseStep =
        activeApprovalStep?.required_role === 'IT_MANAGER' &&
        application.form_code === 'ICT_PURCHASE';

      await submitStepDecision({
        applicationId: application.id,
        decision,
        comments: comments.trim() || undefined,
        digitalSignature: signature.trim() || currentUser?.full_name,
        checklistData: isFinanceEventStep ? financeEventChecklist : undefined,
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

  const renderPayloadDetails = () => {
    const p = application.payload as Record<string, any>;

    // 1. ICT Purchase Scheme
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

    // 2. Travel Request Form
    if (application.form_code === 'TRAVEL_REQUEST') {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 block">Cost Code</span>
              <span className="font-bold text-slate-900">{p.cost_code || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Site</span>
              <span className="font-bold text-slate-900">{p.site || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Contact</span>
              <span className="font-bold text-slate-900">{p.contact_number || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Flight Category</span>
              <span className="font-bold text-blue-700">{p.flight_booking_type || 'N/A'}</span>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <span className="text-slate-500 block">Reason for Travel</span>
              <span className="font-semibold text-slate-900">
                {p.reason_for_travel || p.purpose || 'N/A'}
              </span>
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
        </div>
      );
    }

    // 3. Multi-Child Admission Form
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
                  <th className="py-2 px-3">Target Site</th>
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
                      {sites.find((i) => i.id === c.target_site_id)?.name ||
                        c.target_site_id}
                    </td>
                    <td className="py-2 px-3">
                      {c.year_group} ({c.admission_term})
                    </td>
                    <td className="py-2 px-3 font-bold text-blue-700">
                      {c.fee_rebate_percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // 4. Stores Requisition & Stock Return
    if (
      (application.form_code === 'STORES_REQ' ||
        application.form_code === 'STOCK_RETURN') &&
      Array.isArray(p.items)
    ) {
      const isStores = application.form_code === 'STORES_REQ';
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            {isStores ? (
              <>
                <div>
                  <span className="text-slate-500 block">School / Site</span>
                  <span className="font-bold text-slate-900">{p.school || p.site || application.site_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Department</span>
                  <span className="font-bold text-slate-900">{p.department || p.cost_center || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">PO Number</span>
                  <span className="font-bold text-slate-900">{p.purchase_order_no || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Purpose</span>
                  <span className="font-bold text-slate-900">{p.purpose || 'N/A'}</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-slate-500 block">Location / Site</span>
                  <span className="font-bold text-slate-900">{p.location || application.site_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Inventory Action</span>
                  <span className="font-bold text-blue-700">
                    {p.inventory_action || 'N/A'}
                    {p.inventory_action === 'OTHER' && p.inventory_action_other ? ` (${p.inventory_action_other})` : ''}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Return Reason</span>
                  <span className="font-bold text-slate-900">{p.return_reason || 'N/A'}</span>
                </div>
              </>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Item / Description</th>
                  <th className="py-2 px-3">Qty</th>
                  <th className="py-2 px-3">{isStores ? 'Additional Info' : 'Condition / Remarks'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {p.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2 px-3 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold">{item.description || item.item}</td>
                    <td className="py-2 px-3 font-bold">
                      {item.qty_requested ?? item.qty} {item.unit || ''}
                    </td>
                    <td className="py-2 px-3">
                      {isStores
                        ? item.additional_info || '-'
                        : `${item.condition || ''} ${item.remarks ? `(${item.remarks})` : ''}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // 5. Cash Requisition & Expense Retirement (Imprest)
    if (application.form_code === 'EXPENSE_RETIREMENT') {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 block">Type</span>
              <span className="font-bold text-slate-900">{p.requisition_type}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Cost Centre</span>
              <span className="font-bold text-slate-900">{p.cost_centre}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Imprest Recipient</span>
              <span className="font-bold text-slate-900">{p.imprest_recipient}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Balance</span>
              <span className="font-bold text-blue-700">
                {p.currency} {Number(p.balance || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {Array.isArray(p.amounts_requested) && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Requested Advance Description</th>
                    <th className="py-2 px-3">Qty</th>
                    <th className="py-2 px-3">Cost/Unit</th>
                    <th className="py-2 px-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {p.amounts_requested.map((r: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">{r.description}</td>
                      <td className="py-2 px-3">{r.qty}</td>
                      <td className="py-2 px-3">{Number(r.unit_cost).toLocaleString()}</td>
                      <td className="py-2 px-3 font-bold">
                        {(Number(r.qty) * Number(r.unit_cost)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(p.expenses_retired) && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Retired Expense Description</th>
                    <th className="py-2 px-3">Qty</th>
                    <th className="py-2 px-3">Cost/Unit</th>
                    <th className="py-2 px-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {p.expenses_retired.map((r: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">{r.description}</td>
                      <td className="py-2 px-3">{r.qty}</td>
                      <td className="py-2 px-3">{Number(r.unit_cost).toLocaleString()}</td>
                      <td className="py-2 px-3 font-bold">
                        {(Number(r.qty) * Number(r.unit_cost)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900 leading-relaxed">
            <span className="font-bold text-amber-950">Educore Imprest Policy Note:</span> Failure to retire imprest and all supporting documents within 7 days after termination / completion of the trip or purchase will result in deduction of the balance from the next payroll and disciplinary action may be taken as stipulated in our Code of Conduct.
          </div>
        </div>
      );
    }

    // 6. Purchase Requisition (PR / PO)
    if (application.form_code === 'PURCHASE_REQ' && Array.isArray(p.items)) {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 block">Cost Centre</span>
              <span className="font-bold text-slate-900">{p.cost_centre}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Budget Type</span>
              <span className="font-bold text-slate-900">{p.budget_type}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total PR Cost</span>
              <span className="font-bold text-slate-900">
                {p.currency} {Number(p.total_cost || 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Variance to Budget</span>
              <span className="font-bold text-blue-700">
                {p.currency} {Number(p.variance_to_budget || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Cost Code</th>
                  <th className="py-2 px-3">Needed By</th>
                  <th className="py-2 px-3">Qty</th>
                  <th className="py-2 px-3">Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {p.items.map((r: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2 px-3 font-semibold">{r.description}</td>
                    <td className="py-2 px-3">{r.cost_code}</td>
                    <td className="py-2 px-3">{r.needed_by}</td>
                    <td className="py-2 px-3">{r.qty}</td>
                    <td className="py-2 px-3">{Number(r.unit_cost).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // 7. Edu-Health Claims Reimbursement
    if (application.form_code === 'EDU_HEALTH_CLAIM' && Array.isArray(p.claim_items)) {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 block">Patient</span>
              <span className="font-bold text-slate-900">
                {p.patient_title} {p.patient_first_name} {p.patient_surname} ({p.patient_gender})
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Hospital & Date</span>
              <span className="font-bold text-slate-900">
                {p.hospital_name} ({p.date_of_treatment})
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Claimed</span>
              <span className="font-bold text-blue-700">
                ZMW {Number(p.total_claim_amount || 0).toLocaleString()} ({p.payment_method})
              </span>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <span className="text-slate-500 block">Symptoms & Treatment Details</span>
              <span className="font-semibold text-slate-900">
                {p.symptoms_and_treatment_details}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Expense / Treatment</th>
                  <th className="py-2 px-3">Provider</th>
                  <th className="py-2 px-3">Invoice #</th>
                  <th className="py-2 px-3">Amount (ZMW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {p.claim_items.map((c: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2 px-3 font-semibold">{c.description}</td>
                    <td className="py-2 px-3">{c.provider_name}</td>
                    <td className="py-2 px-3 font-mono">{c.invoice_no}</td>
                    <td className="py-2 px-3 font-bold">
                      ZMW {Number(c.amount_charged || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // 8. Salary Advance
    if (application.form_code === 'SALARY_ADVANCE') {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Position</span>
              <span className="font-bold text-slate-900">{p.position || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Amount Requested</span>
              <span className="font-bold text-blue-700">
                ZMW {Number(p.amount_requested_zmw || p.requested_amount_zmw || 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Requested Payment Date</span>
              <span className="font-bold text-slate-900">{p.requested_payment_date || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Proposed Monthly Instalment</span>
              <span className="font-bold text-slate-900">
                ZMW {Number(p.proposed_instalment_zmw || 0).toLocaleString()}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <span className="text-slate-500 block">Repayment Period</span>
              <span className="font-semibold text-slate-800">
                {p.repayment_period_from || 'N/A'} to {p.repayment_period_to || 'N/A'}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <span className="text-slate-500 block">Purpose of Advance</span>
              <span className="font-semibold text-slate-900 whitespace-pre-line">{p.reason || 'N/A'}</span>
            </div>
          </div>
        </div>
      );
    }

    // 9. Gratuity Advance
    if (application.form_code === 'GRATUITY_ADVANCE') {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Position</span>
              <span className="font-bold text-slate-900">{p.position || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Contract End Date</span>
              <span className="font-bold text-slate-900">{p.contract_end_date || p.contract_start_date || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Advance Requested</span>
              <span className="font-bold text-blue-700">
                ZMW {Number(p.amount_requested_zmw || p.requested_amount_zmw || 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Annual Gratuity Accrued</span>
              <span className="font-bold text-slate-900">
                {p.annual_gratuity_accrued_zmw ? `ZMW ${Number(p.annual_gratuity_accrued_zmw).toLocaleString()}` : 'N/A'}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <span className="text-slate-500 block">Purpose of Advance</span>
              <span className="font-semibold text-slate-900 whitespace-pre-line">{p.reason || 'N/A'}</span>
            </div>
          </div>
        </div>
      );
    }

    // 10. Change of Bank Details
    if (application.form_code === 'BANK_CHANGE') {
      const isIntl = p.account_mode === 'INTERNATIONAL' || Boolean(p.intl_bank_name);
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Phone</span>
              <span className="font-bold text-slate-900">{p.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Date of Birth</span>
              <span className="font-bold text-slate-900">{p.date_of_birth || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Marital Status</span>
              <span className="font-bold text-slate-900">{p.marital_status || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">NRC / Passport</span>
              <span className="font-bold text-slate-900">{p.nrc_or_passport || 'N/A'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-amber-50/50 space-y-2">
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-900 block">
              Previous Account & Bank Clearance
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 block">Old Bank</span>
                <span className="font-bold text-slate-900">{p.old_bank_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Old Account Number</span>
                <span className="font-mono font-bold text-slate-900">{p.old_account_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Bank Manager Name</span>
                <span className="font-bold text-slate-900">{p.old_bank_manager_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Clearance Date</span>
                <span className="font-bold text-slate-900">{p.old_bank_clearance_date || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[10px] text-blue-900 block">
                New Bank Account Details
              </span>
              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-blue-800">
                {isIntl ? 'International Account' : 'Domestic (ZMW)'}
              </span>
            </div>
            {isIntl ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 block">Bank Name</span>
                  <span className="font-bold text-slate-900">{p.intl_bank_name || p.bank_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">IBAN / Account</span>
                  <span className="font-mono font-bold text-slate-900">{p.intl_iban_or_account_no || p.account_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">BIC / SWIFT</span>
                  <span className="font-mono font-bold text-slate-900">{p.intl_swift_bic || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Currency</span>
                  <span className="font-bold text-blue-700">{p.intl_currency || 'USD'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Bank Address</span>
                  <span className="font-bold text-slate-900">{p.intl_bank_address || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Beneficiary Address</span>
                  <span className="font-bold text-slate-900">{p.intl_beneficiary_address || 'N/A'}, {p.intl_city || ''} {p.intl_country || ''}</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-500 block">Bank Name</span>
                  <span className="font-bold text-slate-900">{p.bank_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Branch</span>
                  <span className="font-bold text-slate-900">{p.branch_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Account Number</span>
                  <span className="font-mono font-bold text-slate-900">{p.account_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">T-PIN Number</span>
                  <span className="font-mono font-bold text-slate-900">{p.tpin_number || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 11. Application for Professional Development
    if (application.form_code === 'PROF_DEV') {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Position</span>
              <span className="font-bold text-slate-900">{p.position || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Training Provider & Location</span>
              <span className="font-bold text-slate-900">{p.training_provider_location || p.provider || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Days & Dates of Training</span>
              <span className="font-bold text-slate-900">{p.course_days_and_dates || p.start_date || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Cost</span>
              <span className="font-bold text-blue-700">
                ZMW {Number(p.total_costs_zmw || p.cost_zmw || 0).toLocaleString()}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <span className="text-slate-500 block">Description of Professional Development</span>
              <span className="font-semibold text-slate-900 whitespace-pre-line">{p.description || p.course_title || 'N/A'}</span>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <span className="text-slate-500 block">Expected Learning Outcomes</span>
              <span className="font-semibold text-slate-900 whitespace-pre-line">{p.expected_outcomes || 'N/A'}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-200 text-xs">
            <div>
              <span className="text-slate-500 block">Training Costs</span>
              <span className="font-bold text-slate-900">ZMW {Number(p.training_costs_zmw || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Travel & Incidental Expenses</span>
              <span className="font-bold text-slate-900">ZMW {Number(p.travel_expenses_zmw || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Documentation</span>
              <span className="font-bold text-emerald-700">
                {p.details_attached ? '✓ Course Outline / Details Attached' : 'No Details Attached'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // 12. Contract Renewal Form
    if (application.form_code === 'CONTRACT_RENEWAL') {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Staff Name</span>
              <span className="font-bold text-slate-900">{p.staff_name || application.applicant_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Position</span>
              <span className="font-bold text-slate-900">{p.position || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Immediate Supervisor</span>
              <span className="font-bold text-slate-900">{p.supervisor_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Renewal Recommendation</span>
              <span className={`font-bold ${p.contract_to_be_renewed === 'YES' ? 'text-emerald-700' : 'text-red-700'}`}>
                {p.contract_to_be_renewed === 'YES' ? 'YES - Recommended for Renewal' : 'NO - Not Recommended'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Current Contract Start Date</span>
              <span className="font-bold text-slate-900">{p.contract_start_date || 'N/A'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Current Contract Expiry Date</span>
              <span className="font-bold text-slate-900">{p.contract_end_date || 'N/A'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-700 block">
              Performance Targets & Development Progress
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-semibold block">Target Reason 1:</span>
                <span className="text-slate-900">{p.reason_target_1 || 'N/A'}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-semibold block">Target Reason 2:</span>
                <span className="text-slate-900">{p.reason_target_2 || 'N/A'}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-semibold block">Target Reason 3:</span>
                <span className="text-slate-900">{p.reason_target_3 || 'N/A'}</span>
              </div>
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-slate-600">
                Performance Assessment Attached: <strong>{p.performance_assessment_attached ? 'Yes' : 'No'}</strong>
              </span>
              {p.performance_remarks && (
                <span className="text-slate-600">
                  Remarks: <strong>{p.performance_remarks}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 13. Exculpatory Form
    if (application.form_code === 'EXCULPATORY') {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Accused Employee</span>
              <span className="font-bold text-slate-900">{p.accused_name || application.applicant_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Employee #</span>
              <span className="font-bold text-slate-900">{p.accused_employee_number || application.applicant_employee_number}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Position</span>
              <span className="font-bold text-slate-900">{p.accused_position || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">School / Department</span>
              <span className="font-bold text-slate-900">{p.accused_dept_site || p.dept_or_school || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Charging Officer</span>
              <span className="font-bold text-slate-900">{p.charging_officer_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Officer Position</span>
              <span className="font-bold text-slate-900">{p.charging_officer_position || 'N/A'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Date of Charge</span>
              <span className="font-bold text-slate-900">{p.date_of_charge || 'N/A'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/30 space-y-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-red-900 block">
              1. Exculpatory Statement Against the Offence Of:
            </span>
            <p className="text-slate-900 font-semibold whitespace-pre-line">
              {p.offence_description || p.charge_reference || 'N/A'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-700 block">
              2. Employee Statement
            </span>
            <p className="text-slate-900 whitespace-pre-line leading-relaxed">
              {p.employee_statement || 'N/A'}
            </p>
          </div>
        </div>
      );
    }

    // 14. Job Description
    if (application.form_code === 'JOB_DESCRIPTION') {
      const respList = Array.isArray(p.responsibilities) && p.responsibilities.length > 0
        ? p.responsibilities
        : Array.isArray(p.key_responsibilities)
        ? p.key_responsibilities.map((r: string) => ({ area_title: 'Responsibility Area', area_description: r }))
        : [];
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Position</span>
              <span className="font-bold text-slate-900">{p.position || p.job_title || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Location / Site</span>
              <span className="font-bold text-slate-900">{p.location || p.department || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Effective Date</span>
              <span className="font-bold text-slate-900">{p.effective_date || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Reports To</span>
              <span className="font-bold text-slate-900">{p.reports_to || 'N/A'}</span>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <span className="text-slate-500 block">Mission / Job Purpose</span>
              <span className="font-semibold text-slate-900 whitespace-pre-line">{p.mission || 'N/A'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
            <span className="font-bold uppercase tracking-wider text-[10px] text-blue-900 block">
              Job Criteria & Specifications
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-white rounded-lg border border-blue-100">
                <span className="text-slate-500 font-semibold block">1. Education Criteria:</span>
                <span className="text-slate-900">{p.education_criteria || 'N/A'}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-blue-100">
                <span className="text-slate-500 font-semibold block">2. Experience Criteria:</span>
                <span className="text-slate-900">{p.experience_criteria || 'N/A'}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-blue-100">
                <span className="text-slate-500 font-semibold block">3. Available Tools:</span>
                <span className="text-slate-900">{p.available_tools || 'N/A'}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-blue-100">
                <span className="text-slate-500 font-semibold block">4. Qualities:</span>
                <span className="text-slate-900">{p.qualities || 'N/A'}</span>
              </div>
              <div className="col-span-1 sm:col-span-2 p-2 bg-white rounded-lg border border-blue-100">
                <span className="text-slate-500 font-semibold block">5. Organisation & Reporting:</span>
                <span className="text-slate-900">{p.organisation_and_reporting || 'N/A'}</span>
              </div>
            </div>
          </div>

          {respList.length > 0 && (
            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-700 block">
                6. Key Responsibilities
              </span>
              <div className="space-y-2">
                {respList.map((resp: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-blue-800 block">
                      6.{idx + 1} {resp.area_title || 'Responsibility Area'}
                    </span>
                    <p className="text-slate-800 mt-1 whitespace-pre-line">{resp.area_description || resp}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Assessed Performance Standards</span>
              <span className="font-semibold text-slate-900">{p.assessed_performance || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Organisation Chart Annex</span>
              <span className="font-bold text-emerald-700">
                {p.annex_org_chart_attached ? '✓ Organogram Attached' : 'Not Attached'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // 15. Manpower Requisition Form
    if (application.form_code === 'MANPOWER_REQ') {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Position Requested</span>
              <span className="font-bold text-slate-900">{p.position_requested || p.position_title || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Number of Staff</span>
              <span className="font-bold text-slate-900">{p.number_of_staff_required ?? p.headcount ?? 1}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Required Start Date</span>
              <span className="font-bold text-slate-900">{p.required_start_date || p.target_start_date || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Budgeted Position</span>
              <span className={`font-bold ${p.is_budgeted === 'YES' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {p.is_budgeted || 'YES'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Vacancy Type</span>
              <span className="font-bold text-blue-700">
                {p.vacancy_type === 'REPLACEMENT' ? `Replacement of: ${p.replacement_of_person}` : `New Position: ${p.new_position_reason || p.justification || ''}`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Reports To</span>
              <span className="font-bold text-slate-900">{p.reports_to || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Contract Period</span>
              <span className="font-bold text-slate-900">{p.required_contract_period || 'N/A'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-700 block">
              Qualifications & Job Summary
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-semibold block">Professional Qualifications:</span>
                <span className="text-slate-900">{p.professional_qualifications_required || 'N/A'}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-semibold block">Relevant Field Experience:</span>
                <span className="text-slate-900">{p.relevant_field_experience_required || 'N/A'}</span>
              </div>
              <div className="col-span-1 sm:col-span-2 p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-semibold block">Job Description Summary:</span>
                <span className="text-slate-900">{p.job_description_summary || 'N/A'}</span>
              </div>
              <div className="col-span-1 sm:col-span-2 p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-semibold block">Consequences of Failure to Fill:</span>
                <span className="text-slate-900">{p.consequences_of_failure_to_fill || 'N/A'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">Salary Recommendation</span>
                <span className="font-bold text-slate-900">{p.salary_recommendation_zmw || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Other Benefits</span>
                <span className="font-bold text-slate-900">{p.other_benefits || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Recruitment Source</span>
                <span className="font-bold text-slate-900">{p.preferred_recruitment_source || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">JD Attached</span>
                <span className="font-bold text-emerald-700">{p.job_description_attached || 'ATTACHED'}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 16. Event Completion Form
    if (application.form_code === 'EVENT_COMPLETION') {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Event Name</span>
              <span className="font-bold text-slate-900">{p.event_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Event Type</span>
              <span className="font-bold text-slate-900">{p.event_type || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Sites / Schools</span>
              <span className="font-bold text-slate-900">{p.sites || p.schools || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Event Coordinator</span>
              <span className="font-bold text-slate-900">{p.event_coordinator || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Event Date</span>
              <span className="font-bold text-slate-900">{p.event_date || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Participants Count</span>
              <span className="font-bold text-slate-900">{p.number_of_participants || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Budget</span>
              <span className="font-bold text-slate-900">ZMW {Number(p.total_budget_zmw || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Actual Expenditure</span>
              <span className="font-bold text-blue-700">ZMW {Number(p.actual_expenditure_zmw || 0).toLocaleString()}</span>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <span className="text-slate-500 block">Event Objectives</span>
              <span className="font-semibold text-slate-900 whitespace-pre-line">{p.objectives || 'N/A'}</span>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <span className="text-slate-500 block">Event Summary & Outcomes</span>
              <span className="font-semibold text-slate-900 whitespace-pre-line">{p.summary_outcomes || 'N/A'}</span>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <span className="text-slate-500 block">Challenges & Recommendations</span>
              <span className="font-semibold text-slate-900 whitespace-pre-line">{p.challenges_and_recommendations || 'N/A'}</span>
            </div>
          </div>
        </div>
      );
    }

    // 17. Disciplinary Charge Form
    if (application.form_code === 'DISCIPLINARY_CHARGE') {
      return (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Charging Officer</span>
              <span className="font-bold text-slate-900">{p.charging_officer_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Officer Position</span>
              <span className="font-bold text-slate-900">{p.charging_officer_position || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Charging Site</span>
              <span className="font-bold text-slate-900">{p.charging_site || p.charging_school || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Date of Charge</span>
              <span className="font-bold text-slate-900">{p.charge_date || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Accused Employee</span>
              <span className="font-bold text-slate-900">{p.accused_employee_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Accused Employee #</span>
              <span className="font-bold text-slate-900">{p.accused_employee_number || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Accused Position</span>
              <span className="font-bold text-slate-900">{p.accused_position || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Accused Site</span>
              <span className="font-bold text-slate-900">{p.accused_site || p.accused_school || 'N/A'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/30 space-y-2">
            <span className="font-bold uppercase tracking-wider text-[10px] text-red-900 block">
              Disciplinary Charge Particulars
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Nature of Offence</span>
                <span className="font-bold text-red-700">{p.nature_of_offence || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Date / Period of Incident</span>
                <span className="font-bold text-slate-900">{p.incident_date || 'N/A'}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-red-100">
              <span className="text-slate-500 block mb-1">Details & Facts of Allegation:</span>
              <p className="text-slate-900 whitespace-pre-line leading-relaxed font-medium">
                {p.charge_details || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Default structured key-value grid for remaining forms
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        {Object.entries(p)
          .filter(([key]) => {
            // Avoid duplicate display when both legacy _school and normalized _site keys exist
            if (key === 'schools' && p.sites) return false;
            if (key === 'charging_school' && p.charging_site) return false;
            if (key === 'accused_dept_school' && p.accused_dept_site) return false;
            return true;
          })
          .map(([key, value]) => {
            let displayVal = String(value ?? 'N/A');
            if (key === 'target_site_id') {
              displayVal =
                sites.find((i) => i.id === value)?.name || String(value);
            } else if (Array.isArray(value)) {
              displayVal = value
                .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
                .join(', ');
            } else if (key.endsWith('_zmw')) {
              displayVal = `ZMW ${Number(value || 0).toLocaleString()}`;
            }

            const normalizedLabel = key
              .replace(/schools/gi, 'sites')
              .replace(/school/gi, 'site')
              .replace(/_/g, ' ');

            return (
              <div key={key} className={displayVal.length > 50 ? 'sm:col-span-2' : ''}>
                <span className="text-slate-500 capitalize block">
                  {normalizedLabel}
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Application ${application.reference_number} Details`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs print:static print:bg-white"
    >
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl flex flex-col justify-between print:max-w-none print:shadow-none">
        <div className="p-6 space-y-6">
          {/* Drawer Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                  {application.department}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(application.reference_number);
                    showToast('info', 'Reference Copied', `Copied ${application.reference_number} to clipboard`);
                  }}
                  className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
                  title="Click to copy reference"
                >
                  <span>{application.reference_number}</span>
                  <Copy className="w-3 h-3 text-slate-400 hover:text-blue-600" />
                </button>
                <StatusBadge status={application.status} size="xs" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {application.form_title}
              </h2>
              <p className="text-xs text-slate-500">
                Applicant:{' '}
                <span className="font-semibold text-slate-700">
                  {application.applicant_name}
                </span>{' '}
                ({application.applicant_employee_number}) · {application.site_name}
              </p>
            </div>
            <div className="flex items-center gap-1.5 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                title="Print / Save Official PDF"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Printer className="w-3.5 h-3.5" /> Print / PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs">
            <StepperProgress
              approvals={application.approvals}
              lifecycleStatus={application.status}
              currentStepOrder={application.current_step_order}
              submittedAt={application.applicant_signed_at}
            />
          </div>

          {/* Tab Navigation Strip (Matches 2.png) */}
          <div className="flex items-center gap-1 border-b border-slate-200/80 pb-2 text-xs font-semibold print:hidden">
            <button
              type="button"
              onClick={() => setDrawerTab('DETAILS')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                drawerTab === 'DETAILS'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Basic Info</span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerTab('LOGS')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                drawerTab === 'LOGS'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Logs &amp; Pipeline</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
                {application.approvals?.length || 0}
              </span>
            </button>

            {isCurrentReviewer && (
              <button
                type="button"
                onClick={() => setDrawerTab('ACTION')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                  drawerTab === 'ACTION'
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sign-off Action</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              </button>
            )}
          </div>

          {actionError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {actionError}
            </div>
          )}

          {/* Details Tab */}
          {drawerTab === 'DETAILS' && (
            <div className="space-y-5">
              {isCurrentReviewer && (
                <div
                  onClick={() => setDrawerTab('ACTION')}
                  className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between cursor-pointer hover:bg-amber-100 transition shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Action Required: Sign-off is waiting for your review</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 underline">
                    Open Decision Console →
                  </span>
                </div>
              )}

              {/* Form Payload Details */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> Submitted Form Details
                </h3>
                {renderPayloadDetails()}
              </div>

              {/* Policy Acceptance Snapshot */}
              {application.legal_text_snapshot && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" /> Signed Policy Snapshot
                  </h3>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 max-h-36 overflow-y-auto whitespace-pre-line leading-relaxed">
                    {application.legal_text_snapshot}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Digitally signed by{' '}
                    <span className="font-serif italic font-semibold text-slate-800">
                      {application.applicant_digital_signature}
                    </span>{' '}
                    on{' '}
                    {application.applicant_signed_at
                      ? new Date(application.applicant_signed_at).toLocaleString()
                      : 'Draft'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Logs & Pipeline Tab (Matches 2.png Activity Log) */}
          {drawerTab === 'LOGS' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> Approval Pipeline &amp; Activity Log
              </h3>

              <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* 1. Applicant Submission Node */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">Application Submitted</span>
                      <span className="text-[11px] text-slate-400">
                        {application.applicant_signed_at
                          ? new Date(application.applicant_signed_at).toLocaleDateString()
                          : new Date(application.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Submitted by{' '}
                      <span className="font-semibold text-slate-800">{application.applicant_name}</span>{' '}
                      ({application.applicant_employee_number}) · {application.site_name}
                    </p>
                    <div className="text-[11px] font-serif italic text-slate-500 pt-1">
                      Digital Signature: "{application.applicant_digital_signature || application.applicant_name}"
                    </div>
                  </div>
                </div>

                {/* 2. Step Decisions Nodes */}
                {application.approvals?.map((step) => {
                  const isApproved = step.status === 'APPROVED';
                  const isRejected = step.status === 'REJECTED';
                  const isRevision = step.status === 'REVISION_REQUESTED';
                  const isCurrent =
                    application.status === 'IN_REVIEW' &&
                    application.current_step_order === step.step_order;

                  return (
                    <div key={step.id} className="relative">
                      <div
                        className={`absolute -left-6 top-1 w-3 h-3 rounded-full ring-4 ring-white ${
                          isApproved
                            ? 'bg-emerald-500'
                            : isRejected
                            ? 'bg-rose-500'
                            : isRevision
                            ? 'bg-amber-500'
                            : isCurrent
                            ? 'bg-amber-500 animate-pulse'
                            : 'bg-slate-300'
                        }`}
                      />
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            Step {step.step_order}: {step.step_label}
                          </span>
                          <StatusBadge status={step.status} size="xs" />
                        </div>

                        {step.reviewer_name && (
                          <div className="text-slate-500 text-[11px]">
                            Reviewed by{' '}
                            <span className="font-semibold text-slate-800">
                              {step.reviewer_name}
                            </span>{' '}
                            ({step.required_role.replace(/_/g, ' ')}) on{' '}
                            {step.signed_at ? new Date(step.signed_at).toLocaleString() : ''}
                          </div>
                        )}

                        {step.comments && (
                          <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic leading-relaxed">
                            "{step.comments}"
                          </p>
                        )}

                        {step.checklist_data &&
                          Object.keys(step.checklist_data).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-100">
                              {Object.entries(step.checklist_data).map(([k, v]) => (
                                <span
                                  key={k}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                    v
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-red-50 text-red-700'
                                  }`}
                                >
                                  {v ? '✓' : '✗'} {k.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}

                        {step.step_metadata &&
                          Object.keys(step.step_metadata).length > 0 && (
                            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-600 border-t border-slate-100">
                              {Boolean(step.step_metadata.asset_serial_number) && (
                                <div>
                                  Serial #:{' '}
                                  <span className="font-mono font-bold">
                                    {String(step.step_metadata.asset_serial_number)}
                                  </span>
                                </div>
                              )}
                              {Boolean(step.step_metadata.deducted_monthly_amount_zmw) && (
                                <div>
                                  Final Monthly Deduction:{' '}
                                  <span className="font-bold">
                                    ZMW{' '}
                                    {Number(
                                      step.step_metadata.deducted_monthly_amount_zmw
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Reviewer Console Tab */}
          {drawerTab === 'ACTION' && (
            <div className="space-y-4 print:hidden">
              {isCurrentReviewer && activeApprovalStep ? (
                <div className="p-4 rounded-2xl bg-blue-50/60 border-2 border-blue-600 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      Action Required · {activeApprovalStep.required_role.replace(/_/g, ' ')}
                    </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {activeApprovalStep.step_label}
                </h4>
              </div>



              {activeApprovalStep.required_role === 'FINANCE_MANAGER' &&
                application.form_code === 'EVENT_COMPLETION' && (
                  <div className="space-y-2 bg-white p-3 rounded-lg border border-blue-200 text-xs">
                    <span className="font-bold text-slate-700 block">
                      Finance Receivables & Payables Closure Confirmation
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
                        />
                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                )}

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
              ) : (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">Review Console (Read-Only)</h4>
                  <div className="text-xs text-slate-500 max-w-sm mx-auto space-y-1">
                    {currentUser?.role === 'SUPER_ADMIN' ? (
                      <p className="text-slate-600">
                        <span className="font-semibold text-slate-800">Governance Policy:</span> System Administrator holds global oversight and audit visibility, but cannot sign off on approval steps that do not designate this role. Sign-offs must be executed by the designated approver.
                      </p>
                    ) : application.applicant_id === currentUser?.id ? (
                      <p className="text-amber-700">
                        <span className="font-semibold">Conflict of Interest Policy:</span> Applicants cannot sign off on or approve their own applications.
                      </p>
                    ) : (
                      <p>
                        Your persona does not have pending sign-off actions on this application.
                      </p>
                    )}
                    {application.status === 'IN_REVIEW' && (
                      <span className="block mt-2 font-semibold text-sky-700">
                        Current Step Approver: {application.current_approver_role ? (ROLE_LABELS[application.current_approver_role] || application.current_approver_role.replace(/_/g, ' ')) : 'N/A'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center print:hidden">
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