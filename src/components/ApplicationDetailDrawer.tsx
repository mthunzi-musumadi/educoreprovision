import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PurchaseApplication } from '../types';
import { LAPTOP_CONFIGS } from '../data/mockData';
import { StatusBadge } from './common/StatusBadge';
import { StepperProgress } from './common/StepperProgress';
import {
  X,
  FileText,
  Clock,
  ShieldCheck,
  Building,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileCheck,
  Printer,
  ChevronRight,
  User,
  Laptop,
  Check,
  DollarSign,
  Cpu,
  HardDrive,
  Hash,
  ExternalLink,
  Download,
} from 'lucide-react';

interface ApplicationDetailDrawerProps {
  application: PurchaseApplication;
  onClose: () => void;
}

export const ApplicationDetailDrawer: React.FC<ApplicationDetailDrawerProps> = ({
  application,
  onClose,
}) => {
  const {
    currentUser,
    users,
    institutions,
    getTimelineForApplication,
    openModal,
    withdrawApplication,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'BASIC' | 'LOGS' | 'SERVICE'>('BASIC');

  const applicant = users.find((u) => u.id === application.applicantId);
  const school = institutions.find((i) => i.id === application.institutionId);
  const laptopConfig = LAPTOP_CONFIGS[application.requestedLaptopTier];
  const timeline = getTimelineForApplication(application.id);

  const canEndorse =
    currentUser.role === 'HEAD_TEACHER' &&
    currentUser.institutionId === application.institutionId &&
    application.status === 'PENDING_GM_REVIEW';

  const canClearHR =
    (currentUser.role === 'HR_MANAGER' || currentUser.role === 'SUPER_ADMIN') &&
    application.status === 'PENDING_HR_REVIEW';

  const canSignoffIT =
    (currentUser.role === 'IT_MANAGER' || currentUser.role === 'SUPER_ADMIN') &&
    application.status === 'PENDING_IT_SIGNOFF';

  const canWithdraw =
    currentUser.id === application.applicantId &&
    ['PENDING_GM_REVIEW', 'REVISION_REQUIRED'].includes(application.status);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-over panel — sharp corners, sleek left shadow */}
      <div className="w-full max-w-xl bg-white h-full shadow-[4px_0_24px_rgba(0,0,0,0.12)] border-l border-slate-200 flex flex-col z-50 animate-in slide-in-from-right duration-200">
        {/* 1. Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              style={{ borderRadius: 0 }}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {laptopConfig.title}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                <span>{application.referenceNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{school?.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={application.status} size="sm" />
            <button
              onClick={() => openModal('PHYSICAL_FORM', application.id)}
              className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              style={{ borderRadius: 0 }}
              title="View Official Physical Facsimile Form"
            >
              <FileText className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* 2. Top Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white shrink-0">
          <div className="flex gap-6 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('BASIC')}
              className={`py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'BASIC'
                  ? 'border-slate-600 text-slate-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('LOGS')}
              className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'LOGS'
                  ? 'border-slate-600 text-slate-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Logs / Timeline</span>
              <span
                className="w-4 h-4 bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center font-bold font-mono"
                style={{ borderRadius: 0 }}
              >
                {timeline.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('SERVICE')}
              className={`py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'SERVICE'
                  ? 'border-slate-600 text-slate-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Service &amp; Payroll
            </button>
          </div>
        </div>

        {/* 3. Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: BASIC INFO */}
          {activeTab === 'BASIC' && (
            <div className="space-y-6">
              {/* 4-Stage Stepper Progress (PRD 3.1) */}
              <StepperProgress application={application} />

              {/* Revision Required Alert Banner */}
              {application.status === 'REVISION_REQUIRED' && (
                <div
                  className="p-4 border-l-4 border-amber-500 bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 shadow-2xs"
                  style={{ borderRadius: 0 }}
                >
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Revision Requested by Campus Leadership</span>
                  </div>
                  <p
                    className="text-[11px] italic bg-white/80 p-2.5 border border-amber-200 text-slate-800"
                    style={{ borderRadius: 0 }}
                  >
                    &quot;{application.gmComments || 'Please adjust your hardware tier or repayment period.'}&quot;
                  </p>
                  <p className="text-[10px] text-amber-700">
                    Per Educore policy, please withdraw this application using the button below and submit a revised request.
                  </p>
                </div>
              )}

              {/* Applicant Card */}
              <div className="bg-slate-50 border border-slate-200 p-4" style={{ borderRadius: 0 }}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Staff Member &amp; Institution
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 bg-slate-700 text-white font-bold text-sm flex items-center justify-center shrink-0"
                    style={{ borderRadius: 0 }}
                  >
                    {applicant?.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{applicant?.fullName}</div>
                    <div className="text-xs text-slate-500">
                      ID: <span className="font-mono font-semibold">{applicant?.employeeNumber}</span> · {applicant?.department}
                    </div>
                    <div className="text-[11px] text-slate-500">{school?.name} · {applicant?.email}</div>
                  </div>
                </div>
              </div>

              {/* Hardware Selection Card */}
              <div className="border border-slate-200 p-4 bg-white space-y-3" style={{ borderRadius: 0 }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Hardware Configuration
                  </span>
                  <span className="font-bold text-slate-600">
                    {application.requestedLaptopTier === 'LEVEL_1' ? 'Level 1: Faculty Standard' : 'Level 2: STEM High-Performance'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white border border-slate-200 p-2.5" style={{ borderRadius: 0 }}>
                    <span className="text-[10px] text-slate-400 block font-medium">Processor</span>
                    <span className="font-semibold text-slate-800 text-[11px]">{laptopConfig.specs.processor}</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5" style={{ borderRadius: 0 }}>
                    <span className="text-[10px] text-slate-400 block font-medium">Memory / RAM</span>
                    <span className="font-semibold text-slate-800 text-[11px]">{laptopConfig.specs.ram}</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5" style={{ borderRadius: 0 }}>
                    <span className="text-[10px] text-slate-400 block font-medium">Storage NVMe</span>
                    <span className="font-semibold text-slate-800 text-[11px]">{laptopConfig.specs.storage}</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5" style={{ borderRadius: 0 }}>
                    <span className="text-[10px] text-slate-400 block font-medium">Display &amp; GPU</span>
                    <span className="font-semibold text-slate-800 text-[11px]">{laptopConfig.specs.graphics}</span>
                  </div>
                </div>
                <div
                  className="bg-white border-l-4 border-emerald-500 border border-emerald-200 px-3 py-1.5 text-[11px] text-emerald-800 font-medium"
                  style={{ borderRadius: 0 }}
                >
                  ✓ {laptopConfig.specs.warranty}
                </div>
              </div>

              {/* Repayment Breakdown */}
              <div className="border border-slate-200 p-4 bg-white space-y-2.5" style={{ borderRadius: 0 }}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Repayment Schedule
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500">Repayment Plan Selected:</span>
                  <span className="font-bold text-slate-900">
                    {application.repaymentPeriod === 'ONE_TO_TWO_MONTHS'
                      ? '1–2 Months (Accelerated)'
                      : application.repaymentPeriod === 'TWELVE_MONTHS'
                      ? '12 Months (Standard)'
                      : '24 Months (Extended)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500">Monthly Deduction:</span>
                  <span className="font-mono font-extrabold text-base text-slate-900">
                    ZMW {(application.deductedMonthlyAmount || application.estimatedMonthlyAmountZmw).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-500">Total Purchase Value:</span>
                  <span className="font-mono font-bold text-slate-800">
                    ZMW {laptopConfig.priceZmw.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Legal Terms Verification Gate (Screen 0) */}
              <div className="border border-slate-200 p-4 bg-slate-50 text-xs space-y-2" style={{ borderRadius: 0 }}>
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Screen 0 Legal Gate Snapshot Verified</span>
                </div>
                <p className="text-[11px] text-slate-600 italic border-l-2 border-emerald-500 pl-2 py-0.5">
                  &quot;{application.legalTextSnapshot || 'Terms and payroll deductions agreed.'}&quot;
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1 font-mono">
                  <div>Accepted: {new Date(application.termsAcceptedAt || application.createdAt).toLocaleString('en-GB')}</div>
                  <div>IP: {application.applicantIpAddress || '196.220.124.45'}</div>
                  <div className="col-span-2 truncate">Signature: {application.applicantDigitalSignature || 'Authenticated'}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOGS & TIMELINE */}
          {activeTab === 'LOGS' && (
            <div className="space-y-6">
              {/* Top Section: Lifecycle Status Journey */}
              <div className="bg-slate-50 border border-slate-200 p-5" style={{ borderRadius: 0 }}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Lifecycle Status Journey
                </div>
                <div className="relative space-y-6">
                  {/* Continuous vertical milestone spine line - centered at 8px */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-emerald-400 pointer-events-none" />

                  {/* Latest Milestone */}
                  <div className="relative flex items-start gap-3">
                    {/* Centered milestone dot column */}
                    <div className="w-4 flex items-center justify-center shrink-0 pt-1.5 z-10">
                      <div
                        className="w-2 h-2 bg-emerald-500 shrink-0"
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className="px-2.5 py-0.5 font-bold text-[11px] bg-slate-100 text-slate-800 border border-slate-300"
                          style={{ borderRadius: 0 }}
                        >
                          {application.status.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {new Date(application.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        by {timeline.length > 0 ? timeline[timeline.length - 1].actorName : applicant?.fullName}
                      </div>
                    </div>
                  </div>

                  {/* Previous Milestone */}
                  {timeline.length > 1 && (
                    <div className="relative flex items-start gap-3">
                      {/* Centered milestone dot column */}
                      <div className="w-4 flex items-center justify-center shrink-0 pt-1.5 z-10">
                        <div
                          className="w-2 h-2 bg-slate-400 shrink-0"
                          style={{ borderRadius: 0 }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-600">
                            {timeline[0].actionType.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-slate-400 text-[11px]">
                            {new Date(timeline[0].createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          by {timeline[0].actorName}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Section: Chronological Audit Logs */}
              <div className="space-y-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Detailed Change History &amp; Audit Entries
                </div>

                {/* Group by date in reverse order */}
                {Object.entries(
                  [...timeline].reverse().reduce<Record<string, typeof timeline>>((acc, evt) => {
                    const dateKey = new Date(evt.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });
                    if (!acc[dateKey]) acc[dateKey] = [];
                    acc[dateKey].push(evt);
                    return acc;
                  }, {})
                ).map(([dateLabel, events]) => (
                  <div key={dateLabel} className="space-y-2">
                    <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{dateLabel}</span>
                    </div>

                    <div className="space-y-2 pl-2">
                      {events.map((evt) => (
                        <div
                          key={evt.id}
                          className="text-xs text-slate-700 border border-slate-200 bg-white p-3 hover:border-slate-300 transition-colors"
                          style={{ borderRadius: 0 }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-mono font-bold text-slate-700 text-[11px]">
                              {application.referenceNumber}
                            </span>
                            <span
                              className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5"
                              style={{ borderRadius: 0 }}
                            >
                              {evt.actionType}
                            </span>
                          </div>
                          <p className="text-slate-800 leading-snug">
                            {evt.comments || `Action ${evt.actionType} recorded.`}
                          </p>
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>Actor: <strong className="text-slate-700">{evt.actorName}</strong> ({evt.actorRole})</span>
                            {evt.toStatus && <span>Status: {evt.toStatus}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SERVICE & PAYROLL DEDUCTION */}
          {activeTab === 'SERVICE' && (
            <div className="space-y-6">
              {/* Part 3: HR Clearance Section */}
              <div className="border border-slate-200 p-4 bg-white space-y-3" style={{ borderRadius: 0 }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-sky-600" />
                    <span>Part 3: Central HR Clearance</span>
                  </span>
                  {application.hrSignedAt ? (
                    <span
                      className="px-2 py-0.5 text-[10px] font-mono font-bold border border-emerald-400 text-emerald-700 bg-white"
                      style={{ borderRadius: 0 }}
                    >
                      Cleared
                    </span>
                  ) : (
                    <span
                      className="px-2 py-0.5 text-[10px] font-mono font-bold border border-amber-400 text-amber-700 bg-white"
                      style={{ borderRadius: 0 }}
                    >
                      Pending HR
                    </span>
                  )}
                </div>

                {application.hrChecklist && (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Check className={`w-3.5 h-3.5 ${application.hrChecklist.probationCleared ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Probation clearance confirmed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className={`w-3.5 h-3.5 ${application.hrChecklist.zeroSalaryAdvanceConflicts ? 'text-emerald-600' : 'text-rose-600'}`} />
                      <span>Zero active salary advance conflicts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className={`w-3.5 h-3.5 ${application.hrChecklist.debtRatioWithinThreshold ? 'text-emerald-600' : 'text-rose-600'}`} />
                      <span>Debt ratio within Educore 33% maximum threshold</span>
                    </div>
                  </div>
                )}

                {application.hrComments && (
                  <div className="p-2.5 bg-slate-50 text-xs text-slate-700 italic border border-slate-100" style={{ borderRadius: 0 }}>
                    &quot;{application.hrComments}&quot;
                  </div>
                )}
              </div>

              {/* Part 4: IT Provisioning Section */}
              <div className="border border-slate-200 p-4 bg-white space-y-3" style={{ borderRadius: 0 }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-purple-600" />
                    <span>Part 4: Central IT Allocation</span>
                  </span>
                  {application.status === 'APPROVED' ? (
                    <span
                      className="px-2 py-0.5 text-[10px] font-mono font-bold border border-emerald-400 text-emerald-700 bg-white"
                      style={{ borderRadius: 0 }}
                    >
                      Allocated &amp; Sealed
                    </span>
                  ) : (
                    <span
                      className="px-2 py-0.5 text-[10px] font-mono font-bold border border-amber-400 text-amber-700 bg-white"
                      style={{ borderRadius: 0 }}
                    >
                      Awaiting Signoff
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white border border-slate-200 p-2" style={{ borderRadius: 0 }}>
                    <span className="text-[10px] text-slate-400 block font-medium">Asset Serial Number</span>
                    <span className="font-mono font-bold text-slate-900">
                      {application.assetSerialNumber || 'Pending IT Allocation'}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 p-2" style={{ borderRadius: 0 }}>
                    <span className="text-[10px] text-slate-400 block font-medium">Deduction Schedule</span>
                    <span className="font-bold text-slate-900">
                      {application.deductionStartDate ? `${application.deductionStartDate} to ${application.deductionEndDate}` : 'Pending IT Schedule'}
                    </span>
                  </div>
                </div>

                {application.itComments && (
                  <div className="p-2.5 bg-slate-50 text-xs text-slate-700 italic border border-slate-100" style={{ borderRadius: 0 }}>
                    &quot;{application.itComments}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Action Footer */}
        <div className="bg-white border-t border-slate-200 p-4 shrink-0 flex items-center justify-between gap-3">
          <button
            onClick={() => openModal('PHYSICAL_FORM', application.id)}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-slate-50"
            style={{ borderRadius: 0 }}
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Official Form</span>
          </button>

          <div className="flex items-center gap-2">
            {canEndorse && (
              <button
                onClick={() => {
                  onClose();
                  openModal('ENDORSE_PART2', application.id);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
                style={{ borderRadius: 0 }}
              >
                Endorse Part 2
              </button>
            )}

            {canClearHR && (
              <button
                onClick={() => {
                  onClose();
                  openModal('CLEAR_PART3', application.id);
                }}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
                style={{ borderRadius: 0 }}
              >
                Clear Part 3 (HR)
              </button>
            )}

            {canSignoffIT && (
              <button
                onClick={() => {
                  onClose();
                  openModal('SIGNOFF_PART4', application.id);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
                style={{ borderRadius: 0 }}
              >
                Sign-off Part 4 (IT)
              </button>
            )}

            {canWithdraw && (
              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
                    const res = await withdrawApplication(application.id);
                    if (res && !res.success) {
                      alert(`Withdrawal failed: ${res.error || 'Database error'}`);
                      return;
                    }
                    onClose();
                  }
                }}
                className="px-3 py-2 bg-white border border-red-300 text-red-700 text-xs font-semibold transition-colors cursor-pointer hover:bg-red-50"
                style={{ borderRadius: 0 }}
              >
                Withdraw Request
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
