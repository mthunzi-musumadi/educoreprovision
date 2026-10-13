import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PurchaseApplication, HRVettingChecklist } from '../../types';
import { LAPTOP_CONFIGS } from '../../data/mockData';
import {
  X,
  Check,
  XCircle,
  FileCheck2,
  CheckSquare,
  Square,
  AlertCircle,
  User,
  Building,
} from 'lucide-react';

interface HRClearanceModalProps {
  application: PurchaseApplication;
  onClose: () => void;
}

export const HRClearanceModal: React.FC<HRClearanceModalProps> = ({ application, onClose }) => {
  const { currentUser, users, institutions, clearPart3, rejectPart3 } = useApp();

  const [probationCleared, setProbationCleared] = useState(true);
  const [zeroSalaryAdvances, setZeroSalaryAdvances] = useState(true);
  const [debtRatioCleared, setDebtRatioCleared] = useState(true);
  const [comments, setComments] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applicant = users.find((u) => u.id === application.applicantId);
  const school = institutions.find((i) => i.id === application.institutionId);
  const laptopConfig = LAPTOP_CONFIGS[application.requestedLaptopTier];

  const handleAction = () => {
    setError(null);

    if (isRejecting) {
      if (!comments.trim()) {
        setError('A mandatory rejection comment explaining the payroll/standing constraint is required.');
        return;
      }
      rejectPart3(application.id, comments);
      onClose();
      return;
    }

    // Clearance validation
    if (!probationCleared || !zeroSalaryAdvances || !debtRatioCleared) {
      setError('All 3 statutory HR compliance checks must be satisfied to approve clearance. Otherwise, mark as Rejected.');
      return;
    }

    const checklist: HRVettingChecklist = {
      probationCleared,
      zeroSalaryAdvanceConflicts: zeroSalaryAdvances,
      debtRatioWithinThreshold: debtRatioCleared,
      verifiedBy: `${currentUser.fullName} (Central HR Operations)`,
      verifiedAt: new Date().toISOString(),
    };

    clearPart3(
      application.id,
      checklist,
      comments || 'All statutory HR payroll criteria verified and within limits.'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full my-6 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Part 3: Central HR Review & Debt Clearance
            </h2>
            <div className="text-xs text-slate-500 mt-0.5">
              Reference: <span className="font-mono font-medium text-slate-700">{application.referenceNumber}</span> · {school?.name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {error}
            </div>
          )}

          {/* Dossier: Part 1 and Part 2 Endorsement Notes */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Application Context & Endorsement
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Staff Name:</span>
                <span className="font-semibold text-slate-900">{applicant?.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Employee ID & School:</span>
                <span className="font-mono text-slate-900">{applicant?.employeeNumber} ({school?.name})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Requested Tier:</span>
                <span className="font-semibold text-slate-900">{laptopConfig.title}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Monthly Deduction Mandate:</span>
                <span className="font-mono font-bold text-emerald-700">
                  ZMW {application.estimatedMonthlyAmountZmw.toFixed(2)} / month
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-xs text-slate-700">
              <span className="text-slate-500 font-semibold block text-[11px]">Head Teacher Endorsement:</span>
              <p className="italic text-slate-800 mt-0.5">"{application.gmComments || 'Endorsed.'}"</p>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                Endorsed by {application.gmReviewerName} on {new Date(application.gmSignedAt || '').toLocaleDateString('en-GB')}
              </div>
            </div>
          </div>

          {/* Statutory Vetting Checklist */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Statutory HR & Payroll Clearance Checklist
            </h3>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50/70 transition-colors">
                <input
                  type="checkbox"
                  checked={probationCleared}
                  onChange={(e) => setProbationCleared(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    1. Employment Contract & Probation Cleared
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Applicant has concluded the probationary window and holds an active Educore employment contract.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50/70 transition-colors">
                <input
                  type="checkbox"
                  checked={zeroSalaryAdvances}
                  onChange={(e) => setZeroSalaryAdvances(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    2. Zero Active Salary Advance Conflicts
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Applicant has no outstanding emergency salary advances or unliquidated payroll arrears.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50/70 transition-colors">
                <input
                  type="checkbox"
                  checked={debtRatioCleared}
                  onChange={(e) => setDebtRatioCleared(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    3. Net Debt Ratio within Educore 33% Ceiling
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Total deductions including SACCO, health scheme, and this laptop purchase remain $\le 33\%$ of net gross salary.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              HR Clearance Notes {isRejecting && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={
                isRejecting
                  ? 'Specify reason for rejection (e.g. SACCO loan debt ratio exceeds 33% limit)...'
                  : 'Optional compliance or payroll audit notes...'
              }
              rows={2}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsRejecting(!isRejecting)}
            className={`text-xs font-semibold transition-colors cursor-pointer ${
              isRejecting ? 'text-slate-600 underline' : 'text-red-600 hover:text-red-700'
            }`}
          >
            {isRejecting ? '← Back to Clearance Approval' : 'Reject Application'}
          </button>

          <div className="flex items-center gap-2">
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
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                isRejecting
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isRejecting ? 'Confirm Rejection' : 'Approve Clearance & Route to IT'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
