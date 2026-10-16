import React, { useEffect } from 'react';
import {
  Printer,
  Download,
  X,
  FileText,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Briefcase,
  Layers,
} from 'lucide-react';
import { motion } from 'motion/react';
import { WorkflowApplication, ROLE_LABELS } from '../../types';
import { exportApplicationsToCsv } from '../../utils/csvExport';

interface DocumentFacsimileModalProps {
  application: WorkflowApplication;
  onClose: () => void;
  autoPrint?: boolean;
}

export const DocumentFacsimileModal: React.FC<DocumentFacsimileModalProps> = ({
  application,
  onClose,
  autoPrint = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const p = (application.payload || {}) as Record<string, any>;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    exportApplicationsToCsv(
      [application],
      `facsimile_${application.reference_number}.csv`
    );
  };

  const renderPayloadDocumentSection = () => {
    switch (application.form_code) {
      case 'ICT_PURCHASE':
        return (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              Part 2: Hardware Requisition &amp; Payroll Deduction Terms
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Equipment Tier
                </span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {p.equipment_tier_id || 'Standard Tier'}
                </span>
              </div>
              <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Repayment Period
                </span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {String(p.repayment_period || 'N/A').replace(/_/g, ' ')}
                </span>
              </div>
              <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Estimated Monthly Amount
                </span>
                <span className="font-bold text-emerald-800 mt-0.5 block font-mono">
                  ZMW {Number(p.estimated_monthly_amount_zmw || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {p.purpose_justification && (
              <div className="text-xs border border-slate-200 p-3 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Purpose / Educational Need
                </span>
                <p className="text-slate-800 leading-relaxed italic">
                  "{p.purpose_justification}"
                </p>
              </div>
            )}
          </div>
        );

      case 'TRAVEL_REQUEST': {
        const passengers = Array.isArray(p.passengers) ? p.passengers : [];
        return (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              Part 2: Travel Itinerary &amp; Logistics Specification
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="border border-slate-200 p-2 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Departure Date
                </span>
                <span className="font-bold text-slate-900">{formatDate(p.departure_date)}</span>
              </div>
              <div className="border border-slate-200 p-2 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Return Date
                </span>
                <span className="font-bold text-slate-900">{formatDate(p.return_date)}</span>
              </div>
              <div className="border border-slate-200 p-2 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Travel Mode
                </span>
                <span className="font-bold text-slate-900">{p.travel_mode || 'FLIGHT'}</span>
              </div>
              <div className="border border-slate-200 p-2 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Flight Booking Type
                </span>
                <span className="font-bold text-slate-900">{p.flight_booking_type || 'CONTRACT'}</span>
              </div>
            </div>

            <div className="text-xs border border-slate-200 p-3 bg-slate-50/50">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                Reason &amp; Educational Purpose for Travel
              </span>
              <p className="text-slate-800 leading-relaxed italic">{p.reason_for_travel || 'N/A'}</p>
            </div>

            {passengers.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                  Passenger Roster ({passengers.length})
                </span>
                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
                      <th className="p-2 border border-slate-300">#</th>
                      <th className="p-2 border border-slate-300">Passenger Full Name</th>
                      <th className="p-2 border border-slate-300">NRC / Passport</th>
                      <th className="p-2 border border-slate-300">Role / Designation</th>
                      <th className="p-2 border border-slate-300">Dietary / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passengers.map((pax: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-300 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-2 border border-slate-300 font-semibold">{pax.name || pax.full_name || 'N/A'}</td>
                        <td className="p-2 border border-slate-300 font-mono text-[11px]">{pax.nrc_or_passport || 'N/A'}</td>
                        <td className="p-2 border border-slate-300">{pax.designation || 'Staff'}</td>
                        <td className="p-2 border border-slate-300 text-slate-600">{pax.special_requests || 'Standard'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }

      case 'SALARY_ADVANCE':
      case 'GRATUITY_ADVANCE':
        return (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              Part 2: Advance Requisition &amp; Repayment Schedule
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Requested Advance Amount
                </span>
                <span className="font-bold text-emerald-800 text-sm font-mono mt-0.5 block">
                  ZMW {Number(p.requested_amount_zmw || 0).toFixed(2)}
                </span>
              </div>
              <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Repayment Tenure
                </span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {p.repayment_months ? `${p.repayment_months} Month(s)` : 'Lump Sum'}
                </span>
              </div>
              <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  {application.form_code === 'SALARY_ADVANCE' ? 'Gross Monthly Salary' : 'Accrued Service'}
                </span>
                <span className="font-bold text-slate-900 mt-0.5 block font-mono">
                  {application.form_code === 'SALARY_ADVANCE'
                    ? `ZMW ${Number(p.monthly_salary_zmw || 0).toFixed(2)}`
                    : `${p.accrued_months || 0} Months`}
                </span>
              </div>
            </div>

            <div className="text-xs border border-slate-200 p-3 bg-slate-50/50">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                Declared Justification / Emergency Circumstances
              </span>
              <p className="text-slate-800 leading-relaxed italic">
                "{p.reason_for_advance || p.reason || 'N/A'}"
              </p>
            </div>
          </div>
        );

      case 'CHILD_ADMISSION': {
        const children = Array.isArray(p.children) ? p.children : [];
        return (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              Part 2: Child Admission Particulars
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Target Academic Year
                </span>
                <span className="font-bold text-slate-900">{p.academic_year || '2026'}</span>
              </div>
              <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Staff Relationship to Child
                </span>
                <span className="font-bold text-slate-900">{p.relationship || 'Biological Child'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Enrolled Children ({children.length})
              </span>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
                    <th className="p-2 border border-slate-300">#</th>
                    <th className="p-2 border border-slate-300">Child Full Name</th>
                    <th className="p-2 border border-slate-300">Date of Birth</th>
                    <th className="p-2 border border-slate-300">Target Grade</th>
                    <th className="p-2 border border-slate-300">School / Site</th>
                  </tr>
                </thead>
                <tbody>
                  {children.map((child: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-semibold">{child.child_full_name || 'N/A'}</td>
                      <td className="p-2 border border-slate-300 font-mono text-[11px]">{formatDate(child.dob)}</td>
                      <td className="p-2 border border-slate-300 font-semibold">Grade {child.grade_applying_for || 'N/A'}</td>
                      <td className="p-2 border border-slate-300">{child.target_school || child.target_site_name || application.site_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'PURCHASE_REQ': {
        const items = Array.isArray(p.items) ? p.items : [];
        return (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              Part 2: Purchase Requisition Itemized Specifications
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="border border-slate-200 p-2 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Supplier / Vendor
                </span>
                <span className="font-bold text-slate-900">{p.supplier_name || 'N/A'}</span>
              </div>
              <div className="border border-slate-200 p-2 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Currency
                </span>
                <span className="font-bold text-slate-900">{p.currency || 'ZMW'}</span>
              </div>
              <div className="border border-slate-200 p-2 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Total Requisition Amount
                </span>
                <span className="font-bold text-emerald-800 font-mono">
                  {p.currency || 'ZMW'} {Number(p.total_amount_zmw || p.total_estimated_cost || 0).toFixed(2)}
                </span>
              </div>
              <div className="border border-slate-200 p-2 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Budget Line Code
                </span>
                <span className="font-bold text-slate-900 font-mono">{p.budget_code || 'Standard'}</span>
              </div>
            </div>

            <div className="text-xs border border-slate-200 p-3 bg-slate-50/50">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                Requisition Purpose &amp; Justification
              </span>
              <p className="text-slate-800 leading-relaxed italic">{p.purpose_justification || p.justification || 'N/A'}</p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Requisition Line Items ({items.length})
              </span>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
                    <th className="p-2 border border-slate-300">#</th>
                    <th className="p-2 border border-slate-300">Description</th>
                    <th className="p-2 border border-slate-300 text-right">Qty</th>
                    <th className="p-2 border border-slate-300 text-right">Unit Price</th>
                    <th className="p-2 border border-slate-300 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => {
                    const qty = Number(item.quantity || 1);
                    const unitPrice = Number(item.unit_price || 0);
                    const lineTotal = Number(item.total_price || qty * unitPrice);
                    return (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-300 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-2 border border-slate-300 font-semibold">{item.description || 'Line Item'}</td>
                        <td className="p-2 border border-slate-300 text-right font-mono">{qty}</td>
                        <td className="p-2 border border-slate-300 text-right font-mono">{unitPrice.toFixed(2)}</td>
                        <td className="p-2 border border-slate-300 text-right font-mono font-bold text-emerald-800">
                          {lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'EXPENSE_RETIREMENT': {
        const expenses = Array.isArray(p.expenses) ? p.expenses : [];
        return (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              Part 2: Imprest Advance vs. Expense Retirement Reconciliation
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Imprest Ref Number
                </span>
                <span className="font-bold text-slate-900 font-mono">{p.imprest_ref_number || 'N/A'}</span>
              </div>
              <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Advance Issued
                </span>
                <span className="font-bold text-blue-800 font-mono">
                  ZMW {Number(p.total_advance_zmw || 0).toFixed(2)}
                </span>
              </div>
              <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Actual Total Spent
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  ZMW {Number(p.total_spent_zmw || 0).toFixed(2)}
                </span>
              </div>
              <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Net Variance / Balance
                </span>
                <span
                  className={`font-bold font-mono ${
                    Number(p.balance_zmw || 0) < 0 ? 'text-rose-700' : 'text-emerald-800'
                  }`}
                >
                  ZMW {Number(p.balance_zmw || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Itemized Receipt Log ({expenses.length})
              </span>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
                    <th className="p-2 border border-slate-300">#</th>
                    <th className="p-2 border border-slate-300">Date</th>
                    <th className="p-2 border border-slate-300">Receipt / Inv #</th>
                    <th className="p-2 border border-slate-300">Description</th>
                    <th className="p-2 border border-slate-300 text-right">Amount (ZMW)</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-mono text-[11px]">{formatDate(exp.date)}</td>
                      <td className="p-2 border border-slate-300 font-mono text-[11px]">{exp.receipt_number || 'N/A'}</td>
                      <td className="p-2 border border-slate-300 font-medium">{exp.description || 'Expense'}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-bold text-slate-800">
                        {Number(exp.amount_zmw || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      default: {
        const keys = Object.keys(p);
        return (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              Part 2: Requisition Particulars &amp; Payload Dossier
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {keys.map((k) => {
                const val = p[k];
                if (typeof val === 'object' && val !== null) {
                  return (
                    <div key={k} className="sm:col-span-2 border border-slate-200 p-2.5 bg-slate-50/50">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        {k.replace(/_/g, ' ')}
                      </span>
                      <pre className="text-[11px] font-mono text-slate-800 whitespace-pre-wrap mt-1">
                        {JSON.stringify(val, null, 2)}
                      </pre>
                    </div>
                  );
                }
                return (
                  <div key={k} className="border border-slate-200 p-2.5 bg-slate-50/50">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      {k.replace(/_/g, ' ')}
                    </span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {String(val || 'N/A')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
    }
  };

  const isApproved = application.status === 'APPROVED';
  const isRejected = application.status === 'REJECTED';
  const isDraft = application.status === 'DRAFT';
  const isWithdrawn = application.status === 'CLOSED';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto document-modal-overlay">
      <div
        className="bg-white border border-slate-300 max-w-4xl w-full my-2 sm:my-6 flex flex-col max-h-[96vh] overflow-hidden shadow-2xl document-modal-container"
        style={{ borderRadius: 0 }}
      >
        {/* Modal Toolbar (Strictly hidden on print via no-print) */}
        <div className="no-print px-5 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-xs font-mono uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Official Facsimile — {application.reference_number}</span>
            </span>
            <span
              className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 border ${
                isApproved
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : isRejected
                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              STATUS: {application.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold font-mono uppercase flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Print to printer or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              title="Export this record to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 transition cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Paper Document Preview Frame */}
        <div className="p-3 sm:p-8 overflow-y-auto bg-slate-200/90 flex-1 min-h-0 document-preview-scroll custom-scrollbar">
          <div className="print-page bg-white shadow-xl border border-slate-300 p-6 sm:p-12 max-w-[840px] w-full min-h-[1120px] mx-auto my-0 mb-8 text-slate-900 font-sans text-xs leading-normal select-text relative flex flex-col justify-between">
            <div className="space-y-6">
              {/* Top Official Letterhead matching original Educore PDF */}
              <div className="flex items-start justify-between pb-5 border-b-2 border-slate-900">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-black tracking-widest text-slate-900 uppercase">
                    ENGAGE · ENLIGHTEN · EMPOWER
                  </div>
                  <div className="text-[11px] text-slate-700 font-bold">Educore Services Limited</div>
                  <div className="text-[10px] text-slate-600">PO Box 110506, Solwezi, North-Western Province, Zambia</div>
                  <div className="text-[10px] text-slate-600">Telephone: +260 963 89 85 52 · Email: enquiry@educoreservices.com</div>
                  <div className="text-[10px] text-slate-500 font-mono">www.educoreservices.com</div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <img
                    src="/logo.png"
                    alt="Educore Services Logo"
                    className="h-10 w-auto object-contain mb-1"
                  />
                  <div className="text-xs font-mono font-bold text-slate-900 mt-1">
                    Ref: {application.reference_number}
                  </div>
                  <div className="text-[10px] text-slate-600 font-medium">
                    {application.site_name} ({application.site_code})
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Date: {formatDate(application.applicant_signed_at || application.created_at)}
                  </div>
                </div>
              </div>

              {/* Official Document Title Banner */}
              <div className="text-center py-2 border-y border-slate-300 bg-slate-50/70">
                <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
                  {application.form_title}
                </h1>
                <p className="text-[10px] text-slate-600 font-semibold tracking-wide uppercase mt-0.5">
                  {application.department} DEPARTMENT · OFFICIAL STATUTORY REQUISITION ENVELOPE
                </p>
              </div>

              {/* Part 1: Applicant Information */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                  Part 1: Applicant Particulars
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Applicant Full Name
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {application.applicant_name}
                    </span>
                  </div>
                  <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Employee Number
                    </span>
                    <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                      {application.applicant_employee_number}
                    </span>
                  </div>
                  <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Assigned Site
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {application.site_name}
                    </span>
                  </div>
                  <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Department
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {application.department}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Submission Timestamp
                    </span>
                    <span className="font-mono text-slate-800 font-medium">
                      {formatDateTime(application.applicant_signed_at || application.created_at)}
                    </span>
                  </div>
                  <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Applicant Digital Signature
                    </span>
                    <span className="font-serif italic font-bold text-slate-900 text-sm">
                      "{application.applicant_digital_signature || application.applicant_name}"
                    </span>
                  </div>
                </div>
              </div>

              {/* Part 2: Requisition Specifications (Polymorphic Payload) */}
              {renderPayloadDocumentSection()}

              {/* Part 3: Governance Pipeline & Official Approval Dossier */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 flex items-center justify-between">
                  <span>Part 3: Governance Pipeline &amp; Sign-off Approvals</span>
                  <span className="text-[10px] font-mono font-normal text-slate-500 lowercase">
                    {application.approvals?.length || 0} stage(s) configured
                  </span>
                </h4>

                {(!application.approvals || application.approvals.length === 0) ? (
                  <div className="p-3 text-slate-500 italic text-center border border-dashed border-slate-300">
                    No approval steps recorded for this envelope.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {application.approvals.map((step) => {
                      const stepRoleLabel =
                        ROLE_LABELS[step.required_role] || step.required_role.replace(/_/g, ' ');
                      const isStepApproved = step.status === 'APPROVED';
                      const isStepRejected = step.status === 'REJECTED';
                      const isStepRevision = step.status === 'REVISION_REQUESTED';
                      const isStepPending = step.status === 'PENDING';

                      const meta = (step.step_metadata || {}) as Record<string, any>;

                      return (
                        <div
                          key={step.id}
                          className="border border-slate-300 bg-white p-3.5 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div>
                              <span className="font-mono font-bold text-[10px] text-slate-500 uppercase mr-2">
                                Stage {step.step_order}:
                              </span>
                              <span className="font-bold text-slate-900 uppercase">
                                {step.step_label || stepRoleLabel} ({stepRoleLabel})
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 border ${
                                isStepApproved
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : isStepRejected
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : isStepRevision
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-slate-50 text-slate-600 border-slate-300'
                              }`}
                            >
                              {step.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                                Designated Approver
                              </span>
                              <span className="font-semibold text-slate-900 block mt-0.5">
                                {step.reviewer_name || (isStepPending ? 'Pending Assignment' : 'N/A')}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                                Verification Stamp
                              </span>
                              <span className="font-mono text-[11px] block mt-0.5 text-slate-800">
                                {isStepApproved
                                  ? `[OFFICIALLY SIGNED: ${step.reviewer_name || 'REVIEWER'}]`
                                  : isStepRejected
                                  ? `[REJECTED: ${step.reviewer_name || 'REVIEWER'}]`
                                  : isStepRevision
                                  ? `[REVISION REQUESTED: ${step.reviewer_name || 'REVIEWER'}]`
                                  : '______________________'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                                Date / Time
                              </span>
                              <span className="font-mono text-[11px] block mt-0.5 text-slate-800">
                                {formatDateTime(step.signed_at)}
                              </span>
                            </div>
                          </div>

                          {step.comments && (
                            <div className="pt-1.5 border-t border-slate-100">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
                                Reviewer Observations &amp; Directives:
                              </span>
                              <p className="italic text-slate-800 leading-relaxed bg-slate-50 p-2 border border-slate-200">
                                "{step.comments}"
                              </p>
                            </div>
                          )}

                          {/* IT Manager Provisioning Metadata if present */}
                          {meta.asset_serial_number && (
                            <div className="pt-1.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-blue-50/50 p-2 border border-blue-100">
                              <div>
                                <span className="text-[10px] text-blue-900 font-bold block uppercase">
                                  Allocated Hardware Serial:
                                </span>
                                <span className="font-mono font-bold text-blue-950">
                                  {meta.asset_serial_number}
                                </span>
                              </div>
                              {meta.deducted_monthly_amount_zmw && (
                                <div>
                                  <span className="text-[10px] text-blue-900 font-bold block uppercase">
                                    Final Payroll Deduction:
                                  </span>
                                  <span className="font-mono font-bold text-blue-950">
                                    ZMW {Number(meta.deducted_monthly_amount_zmw).toFixed(2)} / mo
                                  </span>
                                </div>
                              )}
                              {meta.deduction_start_date && (
                                <div>
                                  <span className="text-[10px] text-blue-900 font-bold block uppercase">
                                    Deduction Window:
                                  </span>
                                  <span className="font-mono text-blue-950">
                                    {meta.deduction_start_date} → {meta.deduction_end_date || 'N/A'}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Part 4: Legal Terms & Policy Agreement Snapshot */}
              {application.legal_text_snapshot && (
                <div className="space-y-1.5 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                    Part 4: Verbatim Legal Policy &amp; Statutory Declaration
                  </h4>
                  <div className="border border-slate-200 bg-slate-50/60 p-3 text-[11px] text-slate-700 leading-relaxed whitespace-pre-line font-serif max-h-40 overflow-hidden">
                    {application.legal_text_snapshot}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono text-right">
                    Digitally agreed and bound by applicant signature at {formatDateTime(application.applicant_signed_at)}
                  </div>
                </div>
              )}
            </div>

            {/* Official Legal Footer */}
            <div className="mt-8 pt-4 border-t-2 border-slate-900 text-[10px] text-slate-600 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div>
                Educore Services network of schools: Frontier, Sentinel, Trident, Educore Academy
              </div>
              <div className="font-mono text-[9px] text-slate-500">
                Official Workflow Dossier · {application.reference_number} · Page 1 of 1
              </div>
            </div>

            {/* Authentic Rubber Stamp Watermark */}
            {isApproved && (
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20 -rotate-25 border-4 border-emerald-800 p-6 text-center select-none"
                style={{ borderRadius: 0 }}
              >
                <div className="text-4xl sm:text-5xl font-black text-emerald-900 uppercase tracking-widest font-mono">
                  SEALED &amp; APPROVED
                </div>
                <div className="text-sm sm:text-base font-bold text-emerald-800 font-mono mt-1">
                  EDUCORE SERVICES · SOLWEZI
                </div>
                <div className="text-xs font-mono text-emerald-700 mt-0.5">
                  AUDIT CLEARED · {formatDate(application.applicant_signed_at || application.created_at)}
                </div>
              </div>
            )}

            {isRejected && (
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20 -rotate-25 border-4 border-rose-800 p-6 text-center select-none"
                style={{ borderRadius: 0 }}
              >
                <div className="text-4xl sm:text-5xl font-black text-rose-900 uppercase tracking-widest font-mono">
                  REJECTED / VOID
                </div>
                <div className="text-sm font-bold text-rose-800 font-mono mt-1">
                  EDUCORE SERVICES · WORKFLOW CLOSED
                </div>
              </div>
            )}

            {(isDraft || application.status === 'IN_REVIEW') && !isApproved && !isRejected && (
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10 -rotate-25 border-4 border-slate-700 p-6 text-center select-none"
                style={{ borderRadius: 0 }}
              >
                <div className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-widest font-mono">
                  {isDraft ? 'PRELIMINARY DRAFT' : 'IN-FLIGHT REVIEW'}
                </div>
                <div className="text-xs font-bold text-slate-700 font-mono mt-1">
                  EDUCORE SERVICES STATUTORY WORKFLOW
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentFacsimileModal;
