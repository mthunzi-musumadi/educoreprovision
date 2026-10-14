import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PurchaseApplication } from '../../types';
import { LAPTOP_CONFIGS } from '../../data/mockData';
import {
  X,
  Check,
  XCircle,
  Laptop,
  Calendar,
  DollarSign,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

interface ITSignoffModalProps {
  application: PurchaseApplication;
  onClose: () => void;
}

export const ITSignoffModal: React.FC<ITSignoffModalProps> = ({ application, onClose }) => {
  const { currentUser, users, institutions, signoffPart4, rejectPart4 } = useApp();

  const applicant = users.find((u) => u.id === application.applicantId);
  const school = institutions.find((i) => i.id === application.institutionId);
  const laptopConfig = LAPTOP_CONFIGS[application.requestedLaptopTier];

  // Default suggested serial number based on tier and timestamp
  const defaultSerial =
    application.assetSerialNumber ||
    (application.requestedLaptopTier === 'LEVEL_1'
      ? `DELL-LAT-5440-${Math.floor(1000 + Math.random() * 9000)}`
      : `DELL-PREC-3581-${Math.floor(1000 + Math.random() * 9000)}`);

  // Default dates
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const startMonthStr = nextMonth.toISOString().slice(0, 7);

  const durationMonths =
    application.repaymentPeriod === 'ONE_TO_TWO_MONTHS'
      ? 2
      : application.repaymentPeriod === 'TWELVE_MONTHS'
      ? 12
      : 24;

  const endMonth = new Date(nextMonth);
  endMonth.setMonth(endMonth.getMonth() + durationMonths - 1);
  const endMonthStr = endMonth.toISOString().slice(0, 7);

  const [serialNumber, setSerialNumber] = useState(defaultSerial);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(
    application.estimatedMonthlyAmountZmw
  );
  const [startDate, setStartDate] = useState(startMonthStr);
  const [endDate, setEndDate] = useState(endMonthStr);
  const [comments, setComments] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = () => {
    setError(null);

    if (isRejecting) {
      if (!comments.trim()) {
        setError('A mandatory rejection comment (e.g. stock unavailable) is required.');
        return;
      }
      rejectPart4(application.id, comments);
      onClose();
      return;
    }

    if (!serialNumber.trim()) {
      setError('Device Serial Number / Service Tag is required for asset tracking.');
      return;
    }

    if (monthlyAmount <= 0) {
      setError('Monthly deduction amount must be greater than zero.');
      return;
    }

    if (!startDate || !endDate) {
      setError('Both deduction start and end months are mandatory.');
      return;
    }

    signoffPart4({
      applicationId: application.id,
      serialNumber: serialNumber.trim().toUpperCase(),
      monthlyAmount: Number(monthlyAmount),
      startDate,
      endDate,
      comments: comments.trim() || 'Device imaged, Intune MDM enrolled, and verified ready for delivery.',
    });
    onClose();
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
              Part 4: Central ICT Equipment Allocation &amp; Deduction Schedule
            </h2>
            <div className="text-xs text-slate-500 mt-0.5">
              Reference: <span className="font-mono font-medium text-slate-700">{application.referenceNumber}</span> · {school?.name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 transition-colors cursor-pointer"
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

          {/* Dossier: Read-Only Parts 1, 2, and 3 */}
          <div
            className="bg-slate-50 border border-slate-200 p-4 space-y-3"
            style={{ borderRadius: 0 }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Clearance Dossier (Parts 1–3 Complete)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div style={{ borderRadius: 0 }}>
                <span className="text-slate-400 block text-[11px]">Staff Recipient:</span>
                <span className="font-semibold text-slate-900">{applicant?.fullName} ({applicant?.employeeNumber})</span>
              </div>
              <div style={{ borderRadius: 0 }}>
                <span className="text-slate-400 block text-[11px]">Destination Campus:</span>
                <span className="text-slate-900">{school?.name}</span>
              </div>
              <div style={{ borderRadius: 0 }}>
                <span className="text-slate-400 block text-[11px]">Requested Hardware Tier:</span>
                <span className="font-semibold text-slate-900">{laptopConfig.title}</span>
              </div>
              <div style={{ borderRadius: 0 }}>
                <span className="text-slate-400 block text-[11px]">Plan Term:</span>
                <span className="font-semibold text-slate-900">
                  {durationMonths} Months (Total ZMW {laptopConfig.priceZmw.toLocaleString()})
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div style={{ borderRadius: 0 }}>
                <span className="text-slate-400 block">Part 2 (GM Endorsement):</span>
                <span className="text-emerald-800 font-medium">{application.gmReviewerName || 'Endorsed'}</span>
              </div>
              <div style={{ borderRadius: 0 }}>
                <span className="text-slate-400 block">Part 3 (HR Clearance):</span>
                <span className="text-emerald-800 font-medium">
                  {application.hrReviewerName || 'Cleared'} (Debt &lt; 33% OK)
                </span>
              </div>
            </div>
          </div>

          {/* Part 4 Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Hardware Serial Number / Service Tag <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. DELL-LAT-5540-0891"
                className="w-full p-2.5 text-xs border border-slate-300 bg-white focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                style={{ borderRadius: 0 }}
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Unique asset tag engraved or registered in Educore Device Management.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Deducted Monthly Amount (ZMW) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 text-xs border border-slate-300 bg-white focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  style={{ borderRadius: 0 }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Deduction Start Month (from) <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 bg-white focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  style={{ borderRadius: 0 }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Deduction End Month (to) <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 bg-white focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                ICT Handover &amp; Warranty Notes {isRejecting && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  isRejecting
                    ? 'State reason for rejection (e.g. procurement backlog, stock discontinued)...'
                    : 'Notes on imaging, warranty card, campus handover delivery...'
                }
                rows={2}
                className="w-full p-2.5 text-xs border border-slate-300 bg-white focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                style={{ borderRadius: 0 }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsRejecting(!isRejecting)}
            className={`text-xs font-semibold transition-colors cursor-pointer ${
              isRejecting ? 'text-slate-600 underline' : 'text-red-600 hover:text-red-700'
            }`}
          >
            {isRejecting ? '← Back to Hardware Allocation' : 'Reject (Hardware Unavailable)'}
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
              className={`px-5 py-2.5 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 cursor-pointer ${
                isRejecting
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
              style={{ borderRadius: 0 }}
            >
              <FileCheck className="w-4 h-4" />
              <span>{isRejecting ? 'Confirm IT Rejection' : 'Finalize, Sign & Close Request'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
