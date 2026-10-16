import React, { useState, useEffect } from 'react';
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
  Edit3,
  Scissors,
  Paperclip,
  Award,
  FileCheck,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  WorkflowApplication,
  ROLE_LABELS,
  isAwaitingUserSignOff,
  ApplicationAttachment,
} from '../types';
import { StepperProgress } from './common/StepperProgress';
import { StatusBadge } from './common/StatusBadge';
import { useToast } from './common/Toast';
import { FileUploadZone } from './common/FileUploadZone';
import { DocumentFacsimileModal } from './DocumentFacsimile/DocumentFacsimileModal';
import { motion, AnimatePresence } from 'motion/react';

const PhysicalRubberStamp: React.FC<{
  status: string;
  date?: string | null;
  refNumber: string;
  currentRole?: string;
}> = ({ status, date, refNumber, currentRole }) => {
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  switch (status) {
    case 'APPROVED':
      return (
        <div
          className="rubber-stamp border-2 sm:border-3 border-emerald-700 text-emerald-800 bg-emerald-50/70 px-3 py-1.5 -rotate-6 rounded-xs text-center shadow-xs select-none max-w-[170px] print:rotate-0"
          title="Approved Stamp"
        >
          <div className="text-sm sm:text-base font-black tracking-wide leading-none text-emerald-800 font-sans">
            Approved!
          </div>
        </div>
      );
    case 'IN_REVIEW':
      return (
        <div
          className="rubber-stamp border-3 border-dashed border-sky-900 text-sky-950 bg-sky-50/60 p-2 sm:px-3 sm:py-1.5 -rotate-3 rounded-xs text-center shadow-xs select-none max-w-[210px] print:rotate-0"
          title="Audit Pending Stamp"
        >
          <div className="text-[10px] sm:text-[11px] font-black tracking-wider leading-tight border-b border-sky-900/70 pb-0.5 text-sky-900">
            ● IN PROCESSING · AUDIT ●
          </div>
          <div className="text-[9px] font-bold text-sky-950 mt-1 leading-snug">
            SIGN-OFF QUEUE ACTIVE
          </div>
          <div className="text-[8px] font-mono text-sky-900 mt-0.5 truncate">
            {currentRole ? `ROLE: ${currentRole.replace(/_/g, ' ')}` : 'ROUTING IN PROGRESS'}
          </div>
        </div>
      );
    case 'REVISION_REQUIRED':
      return (
        <div
          className="rubber-stamp border-3 border-dotted border-amber-900 text-amber-950 bg-amber-50/70 p-2 sm:px-3 sm:py-1.5 rotate-3 rounded-xs text-center shadow-xs select-none max-w-[210px] print:rotate-0"
          title="Revision Required Stamp"
        >
          <div className="text-[10px] sm:text-[11px] font-black tracking-wider leading-tight border-b-2 border-amber-900 pb-0.5 text-amber-900">
            ▲ ACTION REQUIRED ▲
          </div>
          <div className="text-[9px] font-bold text-amber-950 mt-1 leading-snug">
            RETURNED FOR REVISION
          </div>
          <div className="text-[8px] font-mono text-amber-900 mt-0.5">
            RESUBMISSION PENDING
          </div>
        </div>
      );
    case 'REJECTED':
      return (
        <div
          className="rubber-stamp border-4 border-double border-rose-900 text-rose-950 bg-rose-50/70 p-2 sm:px-3 sm:py-1.5 rotate-6 rounded-xs text-center shadow-xs select-none max-w-[210px] print:rotate-0"
          title="Disapproved Stamp"
        >
          <div className="text-[10px] sm:text-[11px] font-black tracking-widest leading-tight border-b-2 border-rose-900 pb-0.5 text-rose-900">
            ✖ DISAPPROVED ✖
          </div>
          <div className="text-[9px] font-bold text-rose-950 mt-1 leading-snug">
            REQUISITION REJECTED
          </div>
          <div className="text-[8px] font-mono text-rose-900 mt-0.5">
            DOCKET FILE CLOSED
          </div>
        </div>
      );
    case 'WITHDRAWN':
      return (
        <div
          className="rubber-stamp border-2 border-double border-stone-700 text-stone-850 bg-stone-100/70 p-2 sm:px-3 sm:py-1.5 -rotate-4 rounded-xs text-center shadow-xs select-none max-w-[190px] print:rotate-0"
          title="Withdrawn Stamp"
        >
          <div className="text-[10px] font-black tracking-widest leading-tight text-stone-800">
            WITHDRAWN / VOID
          </div>
          <div className="text-[8px] font-mono text-stone-600 mt-0.5">
            CANCELLED BY APPLICANT
          </div>
        </div>
      );
    default:
      return (
        <div
          className="rubber-stamp border-2 border-dashed border-stone-600 text-stone-700 bg-stone-50/70 p-2 sm:px-3 sm:py-1.5 -rotate-2 rounded-xs text-center shadow-xs select-none max-w-[190px] print:rotate-0"
          title="Draft Stamp"
        >
          <div className="text-[10px] font-black tracking-widest leading-tight text-stone-700">
            PRELIMINARY DRAFT
          </div>
          <div className="text-[8px] font-mono text-stone-500 mt-0.5">
            NOT OFFICIALLY LODGED
          </div>
        </div>
      );
  }
};

interface ApplicationDetailDrawerProps {
  application: WorkflowApplication | null;
  onClose: () => void;
  onEdit?: (app: WorkflowApplication) => void;
}

export const ApplicationDetailDrawer: React.FC<ApplicationDetailDrawerProps> = ({
  application,
  onClose,
  onEdit,
}) => {
  const {
    currentUser,
    equipmentTiers,
    sites,
    submitStepDecision,
    withdrawApplication,
    uploadAttachment,
    deleteAttachment,
    getApplicationAttachments,
  } = useAppContext();

  const [comments, setComments] = useState('');
  const [signature, setSignature] = useState(currentUser?.full_name || '');
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<ApplicationAttachment[]>(
    application?.attachments || []
  );

  useEffect(() => {
    if (application?.id) {
      getApplicationAttachments(application.id)
        .then(setAttachments)
        .catch(() => {});
    }
  }, [application?.id, getApplicationAttachments]);
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
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'DETAILS' | 'LOGS' | 'ACTION'>('DETAILS');

  const handleSafeClose = () => {
    if (comments.trim().length > 0 && !submitting) {
      if (!window.confirm('You have unsaved reviewer comments. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSafeClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setShowPrintModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [comments, submitting, onClose]);

  if (!application) return null;

  const isCurrentReviewer = isAwaitingUserSignOff(application, currentUser);

  const canApplicantWithdraw =
    currentUser?.id === application.applicant_id &&
    currentUser?.site_id === application.site_id &&
    ['DRAFT', 'IN_REVIEW', 'REVISION_REQUIRED'].includes(application.status);

  const canApplicantEdit =
    currentUser?.id === application.applicant_id &&
    ['DRAFT', 'REVISION_REQUIRED'].includes(application.status);

  const activeApprovalStep = application.approvals?.find(
    (s) => s.step_order === application.current_step_order
  );

  const handleDecision = async (
    decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED'
  ) => {
    if ((decision === 'REJECTED' || decision === 'REVISION_REQUESTED') && comments.trim().length < 5) {
      setActionError(
        `Please provide comments (at least 5 characters) explaining why this request is ${
          decision === 'REJECTED' ? 'rejected' : 'being sent back for revision'
        }.`
      );
      return;
    }

    const isItPurchaseStep =
      activeApprovalStep?.required_role === 'IT_MANAGER' &&
      application.form_code === 'ICT_PURCHASE';

    if (decision === 'APPROVED' && isItPurchaseStep && !assetSerialNumber.trim()) {
      setActionError('Asset Serial Number is required before IT approval sign-off.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const isFinanceEventStep =
        activeApprovalStep?.required_role === 'FINANCE_MANAGER' &&
        application.form_code === 'EVENT_COMPLETION';

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
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Application ${application.reference_number} Details`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-xs print:static print:bg-white"
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="bg-[#ebe7df] text-stone-900 w-full max-w-2xl sm:max-w-3xl h-full overflow-y-auto shadow-2xl flex flex-col justify-between print:max-w-none print:shadow-none print:transform-none print:bg-white border-l border-stone-300 relative"
      >
        {/* Top Reference & Action Bar */}
        <div className="bg-[#ebe7df] border-b border-stone-300 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-700 font-mono print:hidden shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(application.reference_number);
                showToast('info', 'Reference Copied', `Copied ${application.reference_number} to clipboard`);
              }}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-stone-200/90 hover:bg-stone-300 text-stone-800 text-xs font-mono font-bold border border-stone-300/80 cursor-pointer transition shadow-2xs"
              title="Click to copy archive reference number"
            >
              <Copy className="w-3 h-3 text-stone-500" />
              <span>Archive Ref: {application.reference_number}</span>
            </button>

            {application.status === 'IN_REVIEW' && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-stone-600 bg-stone-200/60 px-2 py-0.5 rounded-xs border border-stone-300/60">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                Stage {application.current_step_order || 1} of {application.approvals?.length || 1}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isCurrentReviewer && drawerTab !== 'ACTION' && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setDrawerTab('ACTION')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs bg-blue-700 hover:bg-blue-800 text-white text-xs font-mono font-bold cursor-pointer shadow-xs uppercase tracking-wider"
                title="Jump directly to Reviewer Sign-off Desk"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sign-off Required →</span>
              </motion.button>
            )}

            {canApplicantEdit && onEdit && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onEdit(application)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-bold cursor-pointer shadow-xs uppercase tracking-wider"
                title="Open editor to revise this form"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{application.status === 'REVISION_REQUIRED' ? 'Edit & Resubmit' : 'Resume Draft'}</span>
              </motion.button>
            )}

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowPrintModal(true)}
              title="Preview & Print Official PDF Facsimile (Ctrl+P)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-white border border-stone-300 text-xs font-sans font-semibold text-stone-800 hover:bg-stone-50 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span>Print / PDF</span>
              <span className="hidden md:inline text-[9px] font-mono text-stone-400 font-normal">^P</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={handleSafeClose}
              className="p-1 rounded-xs text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 cursor-pointer"
              title="Close drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Physical Manila Folder Index Tabs */}
        <div className="px-4 pt-3 flex items-end gap-1.5 border-b border-stone-300 print:hidden text-xs font-semibold shrink-0 bg-[#e7e1d5]">
          <button
            type="button"
            onClick={() => setDrawerTab('DETAILS')}
            className={`px-3.5 py-2 rounded-t-lg transition border-t border-x cursor-pointer flex items-center gap-1.5 relative ${
              drawerTab === 'DETAILS'
                ? 'bg-[#fdfcf7] text-stone-900 border-stone-300 font-bold shadow-[0_-2px_4px_rgba(0,0,0,0.04)] -mb-[1px] pb-2.5 z-10'
                : 'bg-stone-200/80 text-stone-600 border-stone-300/80 hover:bg-stone-200 hover:text-stone-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-stone-600" />
            <span>Basic Info</span>
          </button>

          <button
            type="button"
            onClick={() => setDrawerTab('LOGS')}
            className={`px-3.5 py-2 rounded-t-lg transition border-t border-x cursor-pointer flex items-center gap-1.5 relative ${
              drawerTab === 'LOGS'
                ? 'bg-[#fdfcf7] text-stone-900 border-stone-300 font-bold shadow-[0_-2px_4px_rgba(0,0,0,0.04)] -mb-[1px] pb-2.5 z-10'
                : 'bg-stone-200/80 text-stone-600 border-stone-300/80 hover:bg-stone-200 hover:text-stone-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-stone-600" />
            <span>Endorsement Ledger</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-300/80 text-stone-700 font-mono">
              {application.approvals?.length || 0}
            </span>
          </button>

          {isCurrentReviewer && (
            <button
              type="button"
              onClick={() => setDrawerTab('ACTION')}
              className={`px-3.5 py-2 rounded-t-lg transition border-t border-x cursor-pointer flex items-center gap-1.5 relative ${
                drawerTab === 'ACTION'
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-[0_-2px_4px_rgba(0,0,0,0.06)] -mb-[1px] pb-2.5 z-10'
                  : 'bg-amber-100/90 text-amber-900 border-amber-300 hover:bg-amber-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Reviewer Sign-off</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500 text-white uppercase tracking-wider animate-pulse">
                Action Pending
              </span>
            </button>
          )}
        </div>

        {/* Scrollable Document Canvas */}
        <div className="p-3 sm:p-5 flex-1 overflow-y-auto">
          {/* Physical Document Sheet */}
          <div className="physical-document-sheet relative rounded-xs p-5 sm:p-7 space-y-6 print:p-0 print:border-none print:shadow-none print:bg-white overflow-hidden">
            {/* 3 Binder Hole Punches along the left margin (screen only) */}
            <div className="hidden sm:flex flex-col justify-between absolute left-2 top-10 bottom-10 pointer-events-none print:hidden z-10">
              <div className="binder-punch-hole" />
              <div className="binder-punch-hole" />
              <div className="binder-punch-hole" />
            </div>

            {/* Dog-ear corner fold at top right */}
            <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden print:hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-stone-300/80 via-stone-200 to-transparent -rotate-45 transform origin-top-right shadow-xs border-b border-l border-stone-300/60" />
            </div>

            {/* Subtle background watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.022] -rotate-30 text-stone-900 font-serif font-black text-5xl sm:text-6xl tracking-widest uppercase text-center leading-tight">
              EDUCORE SERVICES<br />OFFICIAL ARCHIVE
            </div>

            {/* Physical Document Header */}
            <div className="border-b-2 border-stone-800 pb-4 space-y-3 relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xs bg-stone-900 text-stone-100 font-serif font-black flex items-center justify-center text-base shadow-xs border border-stone-700">
                    E
                  </div>
                  <div>
                    <h1 className="text-xs font-serif font-black tracking-wider text-stone-900 uppercase">
                      Educore Services
                    </h1>
                    <p className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                      Central Requisition &amp; Provisioning Record · Republic of Zambia
                    </p>
                  </div>
                </div>

                {/* Simulated Barcode Block */}
                <div className="text-right space-y-0.5 shrink-0 hidden xs:block">
                  <div className="font-mono text-xs tracking-[0.25em] text-stone-800 font-bold select-none leading-none">
                    |||| ||| | ||||| | || |||| | |||
                  </div>
                  <div className="text-[9px] font-mono text-stone-500 font-semibold tracking-wider">
                    {application.reference_number}
                  </div>
                </div>
              </div>

              {/* Title, Metadata & Rubber Stamp */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-xs bg-stone-200 text-stone-800 border border-stone-300">
                      {application.department} · {application.form_code}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(application.reference_number);
                        showToast('info', 'Reference Copied', `Copied ${application.reference_number} to clipboard`);
                      }}
                      className="font-mono text-xs font-bold text-stone-800 hover:text-blue-700 flex items-center gap-1 transition cursor-pointer"
                      title="Click to copy reference"
                    >
                      <span>{application.reference_number}</span>
                      <Copy className="w-3 h-3 text-stone-400 hover:text-stone-700" />
                    </button>
                    <StatusBadge status={application.status} size="xs" />
                  </div>
                  <h2 className="text-base sm:text-lg font-serif font-bold text-stone-950">
                    {application.form_title}
                  </h2>
                  <p className="text-xs text-stone-600">
                    Applicant:{' '}
                    <span className="font-semibold text-stone-800">
                      {application.applicant_name}
                    </span>{' '}
                    <span className="font-mono text-[11px]">({application.applicant_employee_number})</span> ·{' '}
                    <span className="font-semibold text-stone-700">{application.site_name}</span>
                  </p>
                </div>

                {/* Physical Rubber Stamp */}
                <div className="shrink-0 flex sm:justify-end">
                  <PhysicalRubberStamp
                    status={application.status}
                    date={application.applicant_signed_at || application.created_at}
                    refNumber={application.reference_number}
                    currentRole={application.current_approver_role || undefined}
                  />
                </div>
              </div>
            </div>

            {/* Stepper Progress Docket Strip */}
            <div className="p-3 bg-stone-100/70 border border-stone-300/80 rounded-xs shadow-2xs relative z-10">
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-stone-600 mb-2 flex items-center justify-between">
                <span>STATUTORY APPROVAL PIPELINE TRACK</span>
                <span>STAGE: {application.current_step_order || 1} OF {application.approvals?.length || 1}</span>
              </div>
              <StepperProgress
                approvals={application.approvals}
                lifecycleStatus={application.status}
                currentStepOrder={application.current_step_order}
                submittedAt={application.applicant_signed_at}
              />
            </div>

            {/* Error Message */}
            {actionError && (
              <div className="p-3 rounded-xs bg-red-50 border border-red-200 text-xs text-red-700 font-medium relative z-10">
                {actionError}
              </div>
            )}

          {/* Details Tab */}
          {drawerTab === 'DETAILS' && (
            <div className="space-y-6 relative z-10">
              {canApplicantEdit && (
                <div className="p-4 rounded-xs bg-amber-50/90 border-l-4 border-l-amber-600 border border-amber-200 text-stone-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="font-mono text-xs font-bold flex items-center gap-1.5 text-amber-900 uppercase tracking-wide">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      {application.status === 'REVISION_REQUIRED'
                        ? '★ REVISION REQUIRED BY EXAMINER'
                        : '● PRELIMINARY UNFILED DRAFT'}
                    </div>
                    <p className="text-[11px] text-stone-700 mt-0.5 font-sans">
                      {application.status === 'REVISION_REQUIRED'
                        ? 'Review the endorsement remarks, amend particulars or annexed vouchers, and resubmit for statutory audit.'
                        : 'Complete your information and attest with your digital signature to register this filing.'}
                    </p>
                  </div>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(application)}
                      className="px-3.5 py-1.5 rounded-xs bg-stone-900 hover:bg-stone-800 text-amber-200 border border-amber-600/50 text-xs font-mono font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer uppercase tracking-wider"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {application.status === 'REVISION_REQUIRED' ? 'Amend & Resubmit' : 'Resume Filing'}
                    </button>
                  )}
                </div>
              )}

              {isCurrentReviewer && (
                <div
                  onClick={() => setDrawerTab('ACTION')}
                  className="p-3.5 rounded-xs bg-blue-50/90 border-l-4 border-l-blue-600 border border-blue-200 text-stone-900 text-xs font-semibold flex items-center justify-between cursor-pointer hover:bg-blue-100/90 transition shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span className="font-medium text-stone-800">
                      <span className="font-bold text-blue-900 font-mono uppercase tracking-wide">Official Action Required:</span> Endorsement awaiting your executive review
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-800 underline tracking-wider uppercase">
                    Open Endorsement Desk →
                  </span>
                </div>
              )}

              {/* SECTION I: Submitted Form Particulars */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-stone-300 pb-1">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-stone-600" /> SECTION I: SUBMITTED FORM PARTICULARS
                  </h3>
                  <span className="text-[10px] font-mono text-stone-500 font-semibold uppercase">
                    FOLIO {application.reference_number.slice(-4)}
                  </span>
                </div>
                <div className="p-4 bg-white/75 border border-stone-300/80 rounded-xs shadow-2xs">
                  {renderPayloadDetails()}
                </div>
              </div>

              {/* SECTION II: Annexed Supporting Documents & Vouchers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-stone-300 pb-1">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-stone-600" /> SECTION II: ANNEXED VOUCHERS &amp; ATTACHMENTS
                  </h3>
                  <span className="text-[10px] font-mono text-stone-500 font-semibold uppercase">
                    {attachments.length} {attachments.length === 1 ? 'ANNEXURE' : 'ANNEXURES'}
                  </span>
                </div>
                <div className="p-4 bg-stone-50/80 border border-stone-300/80 rounded-xs shadow-2xs">
                  <FileUploadZone
                    applicationId={application.id}
                    attachments={attachments}
                    readOnly={!canApplicantEdit}
                    onUpload={async (file) => {
                      const uploaded = await uploadAttachment(application.id, file);
                      setAttachments((prev) => [...prev, uploaded]);
                      showToast('success', 'Document Uploaded', `"${file.name}" attached successfully.`);
                    }}
                    onDelete={async (attachmentId) => {
                      await deleteAttachment(attachmentId);
                      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
                      showToast('info', 'Document Removed', 'Attachment removed successfully.');
                    }}
                  />
                </div>
              </div>

              {/* SECTION III: Statutory Policy Attestation & Digital Seal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-stone-300 pb-1">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-stone-600" /> SECTION III: STATUTORY POLICY ATTESTATION &amp; DIGITAL SEAL
                  </h3>
                  <span className="text-[10px] font-mono text-stone-500 font-semibold uppercase">
                    LEGAL BINDING RECORD
                  </span>
                </div>

                <div className="p-4 bg-stone-50/90 border border-stone-300/80 rounded-xs space-y-4 shadow-2xs">
                  {application.legal_text_snapshot ? (
                    <div className="p-3 rounded-xs bg-stone-100/90 border border-stone-300 text-[11px] text-stone-700 font-serif leading-relaxed max-h-36 overflow-y-auto whitespace-pre-line italic">
                      "{application.legal_text_snapshot}"
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-500 italic font-serif">
                      Standard Educore Services provisioning statutory guidelines and asset custody obligations apply to this submission.
                    </p>
                  )}

                  {/* Physical Attestation & Seal Card */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-stone-200">
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold">
                        Applicant Digital Endorsement Signature
                      </div>
                      <div className="font-serif italic text-lg sm:text-xl text-blue-950 font-bold tracking-wide select-none py-0.5">
                        {application.applicant_digital_signature || application.applicant_name}
                      </div>
                      <div className="text-[10px] font-mono text-stone-600 space-y-0.5">
                        <div>
                          Signer: <span className="font-semibold text-stone-900">{application.applicant_name}</span> · ID: <span className="font-semibold text-stone-900">{application.applicant_employee_number}</span>
                        </div>
                        <div>
                          Attested on:{' '}
                          <span className="font-semibold text-stone-900">
                            {application.applicant_signed_at
                              ? new Date(application.applicant_signed_at).toLocaleString()
                              : 'Draft Filing (Pending Signature)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Circular Verification Seal Stamp */}
                    <div className="shrink-0 flex items-center gap-3">
                      <div className="w-20 h-20 rounded-full border-2 border-emerald-700/80 p-1 flex flex-col items-center justify-center text-center text-emerald-800 shrink-0 select-none shadow-2xs bg-emerald-50/40 -rotate-3 print:border-emerald-900">
                        <div className="w-full h-full rounded-full border border-dashed border-emerald-600/80 flex flex-col items-center justify-center p-1">
                          <Award className="w-3.5 h-3.5 text-emerald-700 mb-0.5" />
                          <span className="text-[7.5px] font-mono font-black uppercase tracking-wider leading-none">VERIFIED</span>
                          <span className="text-[6.5px] font-mono font-bold tracking-tight text-emerald-950 mt-0.5 leading-none">LEGAL ATTEST</span>
                          <span className="text-[5.5px] font-mono text-emerald-800 mt-0.5 leading-none">Educore · 2026</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Logs & Pipeline Tab */}
          {drawerTab === 'LOGS' && (
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between border-b border-stone-300 pb-1">
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-stone-600" /> ENDORSEMENT REGISTER &amp; STATUTORY AUDIT LEDGER
                </h3>
                <span className="text-[10px] font-mono text-stone-500 font-semibold uppercase">
                  RECORD OF PROCEEDINGS
                </span>
              </div>

              <div className="relative pl-7 space-y-4">
                {/* 1. Applicant Submission Node */}
                <div className="relative">
                  {application.approvals && application.approvals.length > 0 && (
                    <div
                      aria-hidden="true"
                      className="absolute -left-4 top-[22px] bottom-[-38px] w-0.5 -translate-x-1/2 bg-stone-300 z-0"
                    />
                  )}
                  <div className="absolute -left-4 top-[22px] -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-blue-700 ring-4 ring-[#fdfcf7] z-10 shadow-xs" />
                  <div className="p-3.5 rounded-xs border border-stone-300/80 bg-white/85 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-stone-900 uppercase tracking-wide">Application Attested &amp; Filed</span>
                      <span className="text-[10px] font-mono text-stone-500 font-semibold">
                        {application.applicant_signed_at
                          ? new Date(application.applicant_signed_at).toLocaleDateString()
                          : new Date(application.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-stone-700">
                      Attested by{' '}
                      <span className="font-semibold text-stone-900">{application.applicant_name}</span>{' '}
                      <span className="font-mono text-[11px]">({application.applicant_employee_number})</span> · {application.site_name}
                    </p>
                    <div className="text-[11px] font-serif italic text-blue-950 font-semibold pt-1">
                      Digital Endorsement Signature: "{application.applicant_digital_signature || application.applicant_name}"
                    </div>
                  </div>
                </div>

                {/* 2. Step Decisions Nodes */}
                {application.approvals?.map((step, index) => {
                  const isApproved = step.status === 'APPROVED';
                  const isRejected = step.status === 'REJECTED';
                  const isRevision = step.status === 'REVISION_REQUESTED';
                  const isCurrent =
                    application.status === 'IN_REVIEW' &&
                    application.current_step_order === step.step_order;
                  const isLast = index === (application.approvals!.length - 1);

                  return (
                    <div key={step.id} className="relative">
                      {!isLast && (
                        <div
                          aria-hidden="true"
                          className="absolute -left-4 top-[22px] bottom-[-38px] w-0.5 -translate-x-1/2 bg-stone-300 z-0"
                        />
                      )}
                      <div
                        className={`absolute -left-4 top-[22px] -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ring-4 ring-[#fdfcf7] z-10 shadow-xs ${
                          isApproved
                            ? 'bg-emerald-600'
                            : isRejected
                            ? 'bg-rose-600'
                            : isRevision
                            ? 'bg-amber-600'
                            : isCurrent
                            ? 'bg-amber-500 ring-4 ring-amber-100'
                            : 'bg-stone-300'
                        }`}
                      />
                      <div className="p-3.5 rounded-xs border border-stone-300/80 bg-white/85 space-y-2 text-xs shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-stone-900 text-sm">
                            Step {step.step_order}: {step.step_label}
                          </span>
                          <StatusBadge status={step.status} size="xs" />
                        </div>

                        {step.reviewer_name && (
                          <div className="text-stone-600 text-[11px] font-mono">
                            Endorsed by{' '}
                            <span className="font-semibold text-stone-900 font-sans">
                              {step.reviewer_name}
                            </span>{' '}
                            ({step.required_role.replace(/_/g, ' ')}) on{' '}
                            {step.signed_at ? new Date(step.signed_at).toLocaleString() : ''}
                          </div>
                        )}

                        {step.comments && (
                          <p className="text-stone-800 bg-stone-100/90 p-2.5 rounded-xs border-l-2 border-l-stone-400 border border-stone-200/80 italic font-serif leading-relaxed">
                            "{step.comments}"
                          </p>
                        )}

                        {step.checklist_data &&
                          Object.keys(step.checklist_data).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-stone-200">
                              {Object.entries(step.checklist_data).map(([k, v]) => (
                                <span
                                  key={k}
                                  className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-semibold ${
                                    v
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300/60'
                                      : 'bg-red-50 text-red-800 border border-red-300/60'
                                  }`}
                                >
                                  {v ? '✓' : '✗'} {k.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}

                        {step.step_metadata &&
                          Object.keys(step.step_metadata).length > 0 && (
                            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono text-stone-600 border-t border-stone-200">
                              {Boolean(step.step_metadata.asset_serial_number) && (
                                <div>
                                  Serial #:{' '}
                                  <span className="font-mono font-bold text-stone-900">
                                    {String(step.step_metadata.asset_serial_number)}
                                  </span>
                                </div>
                              )}
                              {Boolean(step.step_metadata.deducted_monthly_amount_zmw) && (
                                <div>
                                  Final Deduction:{' '}
                                  <span className="font-bold text-stone-900">
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
            <div className="space-y-4 print:hidden relative z-10">
              <div className="flex items-center justify-between border-b border-stone-300 pb-1">
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-stone-600" /> OFFICIAL REVIEWER ENDORSEMENT DESK
                </h3>
                <span className="text-[10px] font-mono text-stone-500 font-semibold uppercase">
                  EXECUTIVE SIGN-OFF
                </span>
              </div>

              {isCurrentReviewer && activeApprovalStep ? (
                <div className="p-4 sm:p-5 rounded-xs bg-stone-100/90 border border-stone-300/90 space-y-4 shadow-2xs">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600">
                      Action Required · {activeApprovalStep.required_role.replace(/_/g, ' ')}
                    </span>
                    <h4 className="text-sm font-serif font-bold text-stone-900">
                      {activeApprovalStep.step_label}
                    </h4>
                  </div>

                  {activeApprovalStep.required_role === 'FINANCE_MANAGER' &&
                    application.form_code === 'EVENT_COMPLETION' && (
                      <div className="space-y-2 bg-white/90 p-3 rounded-xs border border-stone-300 text-xs">
                        <span className="font-mono font-bold text-stone-800 block text-[11px] uppercase tracking-wide">
                          Finance Receivables &amp; Payables Closure Confirmation
                        </span>
                        {Object.entries(financeEventChecklist).map(([key, checked]) => (
                          <label key={key} className="flex items-center gap-2 cursor-pointer font-sans text-stone-700">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/90 p-3 rounded-xs border border-stone-300 text-xs font-mono">
                        <div>
                          <label className="block font-semibold text-stone-700 mb-1 text-[11px] uppercase">
                            Asset Serial Number *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., SN-ZMW-90210"
                            value={assetSerialNumber}
                            onChange={(e) => setAssetSerialNumber(e.target.value)}
                            className="w-full bg-stone-50 border border-stone-300 rounded-xs px-2.5 py-1.5 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-stone-700 mb-1 text-[11px] uppercase">
                            Final Monthly Deduction (ZMW) *
                          </label>
                          <input
                            type="number"
                            value={deductedMonthlyAmount}
                            onChange={(e) =>
                              setDeductedMonthlyAmount(Number(e.target.value))
                            }
                            className="w-full bg-stone-50 border border-stone-300 rounded-xs px-2.5 py-1.5 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-stone-700 mb-1 text-[11px] uppercase">
                            Deduction Start Date
                          </label>
                          <input
                            type="date"
                            value={deductionStartDate}
                            onChange={(e) => setDeductionStartDate(e.target.value)}
                            className="w-full bg-stone-50 border border-stone-300 rounded-xs px-2.5 py-1.5 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-stone-700 mb-1 text-[11px] uppercase">
                            Deduction End Date
                          </label>
                          <input
                            type="date"
                            value={deductionEndDate}
                            onChange={(e) => setDeductionEndDate(e.target.value)}
                            className="w-full bg-stone-50 border border-stone-300 rounded-xs px-2.5 py-1.5 font-sans"
                          />
                        </div>
                      </div>
                    )}

                  <div>
                    <label className="block text-xs font-mono font-semibold text-stone-700 mb-1 uppercase tracking-wide">
                      Reviewer Comments / Remarks
                    </label>
                    <textarea
                      rows={2}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Enter endorsement remarks, or required feedback if requesting revision/rejecting..."
                      className="w-full bg-white border border-stone-300 rounded-xs px-3 py-2 text-xs focus:ring-1 focus:ring-stone-600 focus:border-stone-600 outline-none font-sans"
                    />
                    <span className="text-[10px] font-mono text-stone-500 mt-1 block">
                      Remarks are required (min. 5 characters) when requesting revision or rejecting.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold text-stone-700 mb-1 uppercase tracking-wide">
                      Digital Endorsement Signature *
                    </label>
                    <input
                      type="text"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="Type your official legal name"
                      className="w-full bg-white border border-stone-300 rounded-xs px-3 py-1.5 text-base font-serif italic text-blue-950 font-bold"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-300">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={submitting || !signature.trim()}
                      onClick={() => handleDecision('APPROVED')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xs bg-emerald-700 text-white text-xs font-mono font-bold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer shadow-2xs uppercase tracking-wider"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve &amp; Endorse
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={submitting}
                      onClick={() => handleDecision('REVISION_REQUESTED')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xs bg-amber-700 text-white text-xs font-mono font-bold hover:bg-amber-800 disabled:opacity-50 cursor-pointer shadow-2xs uppercase tracking-wider"
                    >
                      <RotateCcw className="w-4 h-4" /> Request Revision
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={submitting}
                      onClick={() => handleDecision('REJECTED')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xs bg-rose-700 text-white text-xs font-mono font-bold hover:bg-rose-800 disabled:opacity-50 cursor-pointer shadow-2xs uppercase tracking-wider"
                    >
                      <XCircle className="w-4 h-4" /> Reject Filing
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center rounded-xs bg-stone-100/80 border border-stone-300/80 space-y-2">
                  <ShieldCheck className="w-8 h-8 text-stone-400 mx-auto" />
                  <h4 className="text-sm font-serif font-bold text-stone-800">Endorsement Desk (Read-Only)</h4>
                  <div className="text-xs text-stone-600 max-w-sm mx-auto space-y-1 font-sans">
                    {currentUser?.role === 'SUPER_ADMIN' ? (
                      <p className="text-stone-700">
                        <span className="font-semibold text-stone-900">Governance Policy:</span> System Administrator holds global oversight and audit visibility, but cannot sign off on approval steps that do not designate this role. Sign-offs must be executed by the designated approver.
                      </p>
                    ) : application.applicant_id === currentUser?.id ? (
                      <p className="text-amber-800">
                        <span className="font-semibold">Conflict of Interest Policy:</span> Applicants cannot sign off on or approve their own applications.
                      </p>
                    ) : (
                      <p>
                        Your persona does not have pending sign-off actions on this application.
                      </p>
                    )}
                    {application.status === 'IN_REVIEW' && (
                      <span className="block mt-2 font-mono font-semibold text-stone-800 text-[11px]">
                        Current Step Approver: {application.current_approver_role ? (ROLE_LABELS[application.current_approver_role] || application.current_approver_role.replace(/_/g, ' ')) : 'N/A'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Perforated Tear-off Applicant Counterfoil Slip */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-stone-300 relative z-10 print:mt-4 print:pt-3">
            <div className="flex items-center justify-center -mt-9 mb-3 select-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-200 text-stone-700 text-[9.5px] font-mono font-bold uppercase tracking-widest rounded-xs border border-stone-300/80 shadow-2xs">
                <Scissors className="w-3 h-3 text-stone-600" />
                TEAR ALONG PERFORATION FOR APPLICANT COUNTERFOIL SLIP
              </span>
            </div>

            <div className="p-4 bg-stone-100/90 border border-stone-300 rounded-xs space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-xs bg-stone-800 text-stone-100 font-serif font-black flex items-center justify-center text-xs">
                    E
                  </div>
                  <div>
                    <div className="text-[10px] font-serif font-bold text-stone-900 uppercase">
                      Educore Services Official Filing Counterfoil
                    </div>
                    <div className="text-[8.5px] font-mono text-stone-500 uppercase">
                      Applicant Statutory Retention Copy
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono font-bold text-stone-700 uppercase">
                    REF: {application.reference_number}
                  </div>
                  <div className="text-[8px] font-mono text-stone-500">
                    FILED: {new Date(application.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-stone-700">
                <div>
                  <span className="text-stone-400 block text-[8px] uppercase">Applicant</span>
                  <span className="font-semibold text-stone-900 truncate block">{application.applicant_name}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[8px] uppercase">Payroll / Staff No</span>
                  <span className="font-semibold text-stone-900 truncate block">{application.applicant_employee_number}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[8px] uppercase">Form Title</span>
                  <span className="font-semibold text-stone-900 truncate block">{application.form_title}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[8px] uppercase">Current Status</span>
                  <span className="font-semibold text-stone-900 truncate block">{application.status.replace(/_/g, ' ')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-stone-200/70 text-[8.5px] font-mono text-stone-500">
                <span>★ Valid only with institutional digital signature and approval hash.</span>
                <span className="hidden sm:inline">Republic of Zambia · Educore Services</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Controls Footer */}
      <div className="p-3.5 border-t border-stone-300 bg-[#ebe7df] flex flex-wrap justify-between items-center gap-2 print:hidden shadow-inner">
        {/* Left Side: Context / Status / Withdrawal */}
        <div className="flex items-center gap-2">
          {isCurrentReviewer && activeApprovalStep ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="font-mono text-xs font-bold text-stone-800">
                Step {activeApprovalStep.step_order} Sign-off:{' '}
                <span className="text-amber-900 uppercase">
                  {ROLE_LABELS[activeApprovalStep.required_role] || activeApprovalStep.required_role.replace(/_/g, ' ')}
                </span>
              </span>
            </div>
          ) : application.status === 'APPROVED' ? (
            <div className="flex items-center gap-1.5 text-emerald-800 font-mono text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Officially Approved &amp; Archived</span>
            </div>
          ) : canApplicantWithdraw ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              disabled={submitting}
              onClick={handleWithdraw}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-rose-300 bg-rose-50 text-rose-800 text-xs font-mono font-bold hover:bg-rose-100 cursor-pointer uppercase tracking-wider shadow-2xs"
            >
              <Ban className="w-3.5 h-3.5 text-rose-700" /> Withdraw Application
            </motion.button>
          ) : (
            <span className="text-[11px] font-mono text-stone-500">
              Folio: {application.reference_number}
            </span>
          )}
        </div>

        {/* Right Side: Primary Contextual Actions */}
        <div className="flex items-center gap-2">
          {isCurrentReviewer && activeApprovalStep && drawerTab !== 'ACTION' && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setDrawerTab('ACTION')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xs bg-blue-700 hover:bg-blue-800 text-white text-xs font-mono font-bold cursor-pointer shadow-xs uppercase tracking-wider"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Review &amp; Sign-Off →</span>
            </motion.button>
          )}

          {canApplicantEdit && onEdit && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onEdit(application)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xs bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-bold cursor-pointer uppercase tracking-wider shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{application.status === 'REVISION_REQUIRED' ? 'Amend & Resubmit Form' : 'Resume Filing'}</span>
            </motion.button>
          )}

          {application.status === 'APPROVED' && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xs bg-stone-900 hover:bg-stone-800 text-amber-200 border border-stone-700 text-xs font-mono font-bold cursor-pointer shadow-xs uppercase tracking-wider"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print / Export PDF</span>
            </motion.button>
          )}

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSafeClose}
            className="px-4 py-1.5 rounded-xs border border-stone-400 bg-stone-100 text-xs font-mono font-bold text-stone-800 hover:bg-stone-200 cursor-pointer uppercase tracking-wider shadow-2xs"
          >
            Close
          </motion.button>
        </div>
      </div>
      </motion.div>

      {/* Official Document Facsimile / Print PDF Modal */}
      <AnimatePresence>
        {showPrintModal && (
          <DocumentFacsimileModal
            application={application}
            onClose={() => setShowPrintModal(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ApplicationDetailDrawer;