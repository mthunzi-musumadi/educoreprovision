import React from 'react';
import { PurchaseApplication } from '../../types';
import { useApp } from '../../context/AppContext';
import { LAPTOP_CONFIGS, VERBATIM_LEGAL_POLICY } from '../../data/mockData';
import { Printer, Download, X, CheckSquare, Square, ShieldCheck, Check } from 'lucide-react';

interface PhysicalFormModalProps {
  application: PurchaseApplication;
  onClose: () => void;
}

export const PhysicalFormModal: React.FC<PhysicalFormModalProps> = ({ application, onClose }) => {
  const { users, institutions } = useApp();

  const applicant = users.find((u) => u.id === application.applicantId);
  const applicantSchool = institutions.find((i) => i.id === application.institutionId);
  const gmReviewer = users.find((u) => u.id === application.gmReviewerId);
  const hrReviewer = users.find((u) => u.id === application.hrReviewerId);
  const itReviewer = users.find((u) => u.id === application.itReviewerId);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '________________';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-4xl w-full my-6 flex flex-col max-h-[95vh] overflow-hidden">
        {/* Modal Toolbar (hidden on print) */}
        <div className="no-print px-6 py-3 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              Physical Scheme Document Facsimile — Reference: {application.referenceNumber}
            </span>
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
              Status: {application.status}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Document Preview Frame */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-200/60 flex justify-center flex-1">
          <div className="print-page bg-white shadow-md border border-slate-300 p-8 sm:p-12 max-w-[800px] w-full text-slate-900 font-sans text-xs leading-normal select-text relative">
            
            {/* Top Official Letterhead matching original PDF */}
            <div className="flex items-start justify-between pb-6 border-b border-slate-300">
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold tracking-widest text-slate-700 uppercase">
                  ENGAGE · ENLIGHTEN · EMPOWER
                </div>
                <div className="text-[11px] text-slate-600 font-medium">Educore Services</div>
                <div className="text-[10px] text-slate-500">PO Box 110506</div>
                <div className="text-[10px] text-slate-500">Solwezi, Zambia</div>
                <div className="text-[10px] text-slate-500">Telephone: +260 963 89 85 52</div>
                <div className="text-[10px] text-slate-500">enquiry@educoreservices.com</div>
                <div className="text-[10px] text-slate-500">www.educoreservices.com</div>
              </div>

              <div className="text-right flex flex-col items-end">
                <div className="text-2xl font-black tracking-wider text-slate-800 uppercase flex items-center gap-1">
                  <span>EDUCORE</span>
                  <span className="text-amber-600">SERVICES</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1 font-mono">
                  Ref: {application.referenceNumber}
                </div>
                <div className="text-[9px] text-slate-400 font-mono">
                  {applicantSchool?.name || 'Educore Campus'}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="my-6 text-center">
              <h1 className="text-lg font-bold uppercase tracking-wide text-slate-900">
                Application ICT Purchase Scheme
              </h1>
              <p className="text-[10px] text-slate-500 italic mt-0.5">
                Solwezi Central Administrative & School Network Directive
              </p>
            </div>

            {/* Verbatim Legal Policy & Payroll Declaration Block */}
            <div className="space-y-3 pb-6 border-b border-slate-300">
              <p className="text-xs text-slate-800 leading-relaxed font-serif">
                I have read and understood the ICT Equipment purchase scheme and it’s related policies as specified in the current policy document.
              </p>
              <div className="text-xs text-slate-800 pl-4 space-y-1 font-serif">
                <p>By signing this application I agree to:</p>
                <p>1. The terms and conditions of the ICT Equipment and it’s related policies.</p>
                <p>2. Deductions being made through payroll and reflected on my payslip.</p>
              </div>

              <div className="pt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Signature:</span>
                  {application.termsAccepted ? (
                    <span className="font-mono text-emerald-800 font-semibold px-2 py-0.5 bg-emerald-50 border border-emerald-300 rounded text-[11px]">
                      [AUTHENTICATED DIGITAL SIGNATURE: {applicant?.fullName}]
                    </span>
                  ) : (
                    <span>___________________________</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Date:</span>
                  <span className="font-mono font-medium">{formatDate(application.termsAcceptedAt)}</span>
                </div>
              </div>
            </div>

            {/* Part 1 (to be filled in by applicant) */}
            <div className="py-5 border-b border-slate-300 space-y-3">
              <div className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                Part 1 (to be filled in by applicant)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold text-slate-700 mr-2">Laptop Requested:</span>
                  <div className="inline-flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1.5">
                      {application.requestedLaptopTier === 'LEVEL_1' ? (
                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Level 1</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {application.requestedLaptopTier === 'LEVEL_2' ? (
                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Level 2</span>
                    </span>
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-slate-700 mr-2">Repayment Period:</span>
                  <div className="inline-flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1">
                      {application.repaymentPeriod === 'ONE_TO_TWO_MONTHS' ? (
                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>1-2 Months</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {application.repaymentPeriod === 'TWELVE_MONTHS' ? (
                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>12 Months</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {application.repaymentPeriod === 'TWENTY_FOUR_MONTHS' ? (
                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>24 Months</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 block">Name:</span>
                  <span className="font-medium text-slate-900 border-b border-slate-300 block pb-0.5">
                    {applicant?.fullName || '______________________'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block">Signature:</span>
                  <span className="font-mono text-emerald-800 text-[11px] border-b border-slate-300 block pb-0.5">
                    {application.applicantDigitalSignature ? `[VERIFIED: ${applicant?.fullName}]` : '______________________'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block">Date:</span>
                  <span className="font-mono text-slate-900 border-b border-slate-300 block pb-0.5">
                    {formatDate(application.applicantSignedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Part 2 (Approval GM/Head Teacher) */}
            <div className="py-5 border-b border-slate-300 space-y-3">
              <div className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                Part 2 (Approval GM/Head Teacher)
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">Comments:</span>
                <div className="min-h-[40px] border-b border-slate-300 pb-1 text-slate-800 italic">
                  {application.gmComments || '____________________________________________________________________'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="font-semibold text-slate-700 block">Name:</span>
                  <span className="font-medium text-slate-900 border-b border-slate-300 block pb-0.5">
                    {application.gmReviewerName || '______________________'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block">Signature:</span>
                  <span className="font-mono text-emerald-800 text-[11px] border-b border-slate-300 block pb-0.5">
                    {application.gmSignedAt ? `[ENDORSED: ${application.gmReviewerName}]` : '______________________'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block">Date:</span>
                  <span className="font-mono text-slate-900 border-b border-slate-300 block pb-0.5">
                    {formatDate(application.gmSignedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Part 3 (Approval by HR Manager) */}
            <div className="py-5 border-b border-slate-300 space-y-3">
              <div className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                Part 3 (Approval by HR Manager)
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">Comments:</span>
                <div className="min-h-[40px] border-b border-slate-300 pb-1 text-slate-800 italic">
                  {application.hrComments || '____________________________________________________________________'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <span className="font-semibold text-slate-700 block">Signature:</span>
                  <span className="font-mono text-emerald-800 text-[11px] border-b border-slate-300 block pb-0.5">
                    {application.hrSignedAt ? `[CLEARED: ${application.hrReviewerName}]` : '______________________'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block">Date:</span>
                  <span className="font-mono text-slate-900 border-b border-slate-300 block pb-0.5">
                    {formatDate(application.hrSignedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Part 4 (Approval by ICT Manager) */}
            <div className="py-5 space-y-3">
              <div className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                Part 4 (Approval by ICT Manager)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">Deducted Monthly Amount:</span>
                  <div className="font-mono font-bold text-slate-900 mt-1 border-b border-slate-300 pb-0.5">
                    {application.deductedMonthlyAmount ? (
                      `ZMW ${application.deductedMonthlyAmount.toFixed(2)}`
                    ) : (
                      '________________'
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">from:</span>
                  <div className="font-mono text-slate-900 mt-1 border-b border-slate-300 pb-0.5">
                    {application.deductionStartDate || '________________'}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">to:</span>
                  <div className="font-mono text-slate-900 mt-1 border-b border-slate-300 pb-0.5">
                    {application.deductionEndDate || '________________'}
                  </div>
                </div>
              </div>

              {application.assetSerialNumber && (
                <div className="text-xs">
                  <span className="font-semibold text-slate-700">Allocated Asset Serial / Service Tag: </span>
                  <span className="font-mono font-bold text-indigo-900 ml-1">
                    {application.assetSerialNumber}
                  </span>
                </div>
              )}

              <div>
                <span className="font-semibold text-slate-700 block mb-1">Comments:</span>
                <div className="min-h-[40px] border-b border-slate-300 pb-1 text-slate-800 italic">
                  {application.itComments || '____________________________________________________________________'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <span className="font-semibold text-slate-700 block">Signature:</span>
                  <span className="font-mono text-emerald-800 text-[11px] border-b border-slate-300 block pb-0.5">
                    {application.itSignedAt ? `[FINALIZED: ${application.itReviewerName}]` : '______________________'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block">Date:</span>
                  <span className="font-mono text-slate-900 border-b border-slate-300 block pb-0.5">
                    {formatDate(application.itSignedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Legal Footer matching scanned document */}
            <div className="mt-8 pt-4 border-t border-slate-300 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
              <div>
                Page 1 of 1 · Educore Services provides leading education through the network of schools: Frontier, Sentinel, Trident, Educore Academy
              </div>
              <div className="font-mono text-[9px] text-slate-400">
                Application ICT Purchase Scheme.docx · {application.referenceNumber}
              </div>
            </div>

            {/* Sealed Watermark Badge if APPROVED */}
            {application.status === 'APPROVED' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-15 rotate-[-25deg] border-4 border-emerald-800 rounded-2xl p-6 text-center">
                <div className="text-4xl font-black text-emerald-900 uppercase tracking-widest">
                  SEALED & APPROVED
                </div>
                <div className="text-sm font-bold text-emerald-800 font-mono mt-1">
                  EDUCORE ICT SCHEME · SOLWEZI HQ
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
