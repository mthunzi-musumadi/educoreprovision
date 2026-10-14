import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PurchaseApplication } from '../../types';
import { LAPTOP_CONFIGS } from '../../data/mockData';
import {
  X,
  Check,
  AlertTriangle,
  XCircle,
  FileText,
  Building,
  User,
  ShieldCheck,
} from 'lucide-react';

interface EndorsementModalProps {
  application: PurchaseApplication;
  onClose: () => void;
}

export const EndorsementModal: React.FC<EndorsementModalProps> = ({ application, onClose }) => {
  const { currentUser, users, institutions, endorsePart2, requestRevisionPart2, rejectPart2 } = useApp();

  const [comments, setComments] = useState('');
  const [actionType, setActionType] = useState<'ENDORSE' | 'REVISION' | 'REJECT'>('ENDORSE');
  const [error, setError] = useState<string | null>(null);

  const applicant = users.find((u) => u.id === application.applicantId);
  const school = institutions.find((i) => i.id === application.institutionId);
  const laptopConfig = LAPTOP_CONFIGS[application.requestedLaptopTier];

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async () => {
    setError(null);
    if ((actionType === 'REVISION' || actionType === 'REJECT') && !comments.trim()) {
      setError('Comments and justification are mandatory when requesting revision or rejecting.');
      return;
    }

    setIsSubmitting(true);
    let res: { success: boolean; error?: string };

    if (actionType === 'ENDORSE') {
      res = await endorsePart2(application.id, comments);
    } else if (actionType === 'REVISION') {
      res = await requestRevisionPart2(application.id, comments);
    } else {
      res = await rejectPart2(application.id, comments);
    }

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Operation failed in database.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-white border border-slate-200 max-w-2xl w-full my-6 flex flex-col overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.15)]"
        style={{ borderRadius: 0 }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              Part 2: Head Teacher / General Manager Endorsement
            </h2>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              Reference: {application.referenceNumber} · {school?.name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            style={{ borderRadius: 0 }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {error && (
            <div
              className="p-3 border-l-4 border-red-500 bg-red-50 border border-red-200 text-xs text-red-800"
              style={{ borderRadius: 0 }}
            >
              {error}
            </div>
          )}

          {/* Section 1: Applicant Data & Verified Legal Gate */}
          <div
            className="bg-slate-50 border border-slate-200 p-4 space-y-3"
            style={{ borderRadius: 0 }}
          >
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Applicant Request Details (Part 1 Verified)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Staff Name:</span>
                <span className="font-semibold text-slate-900">{applicant?.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Employee Number:</span>
                <span className="font-mono text-slate-900">{applicant?.employeeNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Department / Role:</span>
                <span className="text-slate-800">{applicant?.department} ({applicant?.jobTitle})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Hardware Requested:</span>
                <span className="font-semibold text-slate-900">{laptopConfig.title}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Repayment Option:</span>
                <span className="font-semibold text-slate-900">
                  {application.repaymentPeriod === 'ONE_TO_TWO_MONTHS'
                    ? '1–2 Months'
                    : application.repaymentPeriod === 'TWELVE_MONTHS'
                    ? '12 Months'
                    : '24 Months'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Estimated Monthly Deduction:</span>
                <span className="font-mono font-bold text-emerald-700">
                  ZMW {application.estimatedMonthlyAmountZmw.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 text-[11px] text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Applicant accepted verbatim legal terms &amp; payroll deduction on{' '}
                {new Date(application.termsAcceptedAt || '').toLocaleString('en-GB')}
              </span>
            </div>
          </div>

          {/* Section 2: Part 2 Endorsement Container */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Endorsement Decision
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setActionType('ENDORSE')}
                  className={`p-3 border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    actionType === 'ENDORSE'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <Check className="w-4 h-4" />
                  <span>Endorse &amp; Route to HR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('REVISION')}
                  className={`p-3 border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    actionType === 'REVISION'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-700'
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Request Revision</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('REJECT')}
                  className={`p-3 border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    actionType === 'REJECT'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-red-400 hover:text-red-700'
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Request</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Head Teacher Comments / Operational Justification{' '}
                {actionType !== 'ENDORSE' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  actionType === 'ENDORSE'
                    ? 'e.g. Strongly endorsed. Necessary for Grade 12 STEM computer lab delivery and pastoral care tracking.'
                    : 'Provide required feedback or rationale...'
                }
                rows={3}
                className="w-full p-3 text-xs border border-slate-300 bg-white focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                style={{ borderRadius: 0 }}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Your sign-off will record: {currentUser.fullName} ({currentUser.jobTitle}) with session timestamp.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAction}
            disabled={isSubmitting}
            className={`px-5 py-2.5 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
              actionType === 'ENDORSE'
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : actionType === 'REVISION'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
            style={{ borderRadius: 0 }}
          >
            <span>
              {isSubmitting
                ? 'Saving to Database...'
                : actionType === 'ENDORSE'
                ? 'Confirm Endorsement'
                : actionType === 'REVISION'
                ? 'Send Revision Notice'
                : 'Confirm Rejection'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
