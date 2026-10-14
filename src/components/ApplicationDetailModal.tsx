import React from 'react';
import { useApp } from '../context/AppContext';
import { PurchaseApplication } from '../types';
import { LAPTOP_CONFIGS } from '../data/mockData';
import { StatusBadge } from './common/StatusBadge';
import { StepperProgress } from './common/StepperProgress';
import {
  X,
  Printer,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface ApplicationDetailModalProps {
  application: PurchaseApplication;
  onClose: () => void;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  application,
  onClose,
}) => {
  const { currentUser, users, institutions, getTimelineForApplication, openModal, withdrawApplication } =
    useApp();

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
    application.status === 'PENDING_GM_REVIEW';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-white border border-slate-200 max-w-3xl w-full my-6 flex flex-col max-h-[90vh] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.15)]"
        style={{ borderRadius: 0 }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Application {application.referenceNumber}
              </h2>
              <StatusBadge status={application.status} size="sm" />
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
              <span>{school?.name}</span>
              <span aria-hidden="true">·</span>
              <span>Submitted {new Date(application.createdAt).toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal('PHYSICAL_FORM', application.id)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors hover:bg-slate-50 cursor-pointer"
              style={{ borderRadius: 0 }}
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>View Paper Form</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              style={{ borderRadius: 0 }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50">
          {/* 4-Stage Stepper */}
          <StepperProgress application={application} />

          {/* Action callout */}
          {(canEndorse || canClearHR || canSignoffIT) && (
            <div
              className="p-4 bg-white border-l-4 border-slate-700 border border-slate-200 flex items-center justify-between"
              style={{ borderRadius: 0 }}
            >
              <div className="text-xs text-slate-800">
                <span className="font-bold block text-slate-800 uppercase tracking-wide text-[11px] mb-0.5">Action Required for Your Role</span>
                This application is waiting for your review and sign-off.
              </div>
              {canEndorse && (
                <button
                  onClick={() => openModal('ENDORSE_PART2', application.id)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer shadow-sm"
                  style={{ borderRadius: 0 }}
                >
                  Endorse Part 2
                </button>
              )}
              {canClearHR && (
                <button
                  onClick={() => openModal('CLEAR_PART3', application.id)}
                  className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer shadow-sm"
                  style={{ borderRadius: 0 }}
                >
                  Clear Part 3 (HR)
                </button>
              )}
              {canSignoffIT && (
                <button
                  onClick={() => openModal('SIGNOFF_PART4', application.id)}
                  className="px-3.5 py-2 bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold cursor-pointer shadow-sm"
                  style={{ borderRadius: 0 }}
                >
                  Sign-off Part 4 (IT)
                </button>
              )}
            </div>
          )}

          {/* Grid of Parts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Part 1 Box */}
            <div className="border border-slate-200 bg-white p-4 text-xs space-y-2" style={{ borderRadius: 0 }}>
              <span className="font-mono font-bold uppercase tracking-widest text-slate-400 block text-[10px]">
                Part 1: Applicant Selection
              </span>
              <div className="font-bold text-slate-900 text-sm">
                {applicant?.fullName} <span className="font-mono text-slate-500">({applicant?.employeeNumber})</span>
              </div>
              <div className="text-slate-600">
                Tier: <span className="font-semibold text-slate-900">{laptopConfig.title}</span>
              </div>
              <div className="text-slate-600">
                Plan:{' '}
                <span className="font-semibold text-slate-900">
                  {application.repaymentPeriod === 'ONE_TO_TWO_MONTHS'
                    ? '1–2 Months'
                    : application.repaymentPeriod === 'TWELVE_MONTHS'
                    ? '12 Months'
                    : '24 Months'}
                </span>
              </div>
              <div className="text-slate-600 font-mono">
                Monthly: <span className="font-bold text-emerald-700">ZMW {application.estimatedMonthlyAmountZmw.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400">
                Signed {new Date(application.applicantSignedAt || '').toLocaleString('en-GB')}
              </div>
            </div>

            {/* Part 2 Box */}
            <div className="border border-slate-200 bg-white p-4 text-xs space-y-2" style={{ borderRadius: 0 }}>
              <span className="font-mono font-bold uppercase tracking-widest text-slate-400 block text-[10px]">
                Part 2: Head Teacher Endorsement
              </span>
              {application.gmSignedAt ? (
                <>
                  <div className="font-bold text-slate-900">{application.gmReviewerName}</div>
                  <p className="text-slate-700 italic">"{application.gmComments}"</p>
                  <div className="pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400">
                    Endorsed {new Date(application.gmSignedAt).toLocaleString('en-GB')}
                  </div>
                </>
              ) : (
                <div className="text-slate-400 italic py-3">Pending Head Teacher review</div>
              )}
            </div>

            {/* Part 3 Box */}
            <div className="border border-slate-200 bg-white p-4 text-xs space-y-2" style={{ borderRadius: 0 }}>
              <span className="font-mono font-bold uppercase tracking-widest text-slate-400 block text-[10px]">
                Part 3: Central HR Clearance
              </span>
              {application.hrSignedAt ? (
                <>
                  <div className="font-bold text-slate-900">{application.hrReviewerName}</div>
                  <p className="text-slate-700 italic">"{application.hrComments}"</p>
                  <div className="text-[11px] text-emerald-800 font-medium font-mono">
                    ✓ Debt ratio &lt; 33% verified · Probation cleared
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400">
                    Cleared {new Date(application.hrSignedAt).toLocaleString('en-GB')}
                  </div>
                </>
              ) : (
                <div className="text-slate-400 italic py-3">Pending HR clearance</div>
              )}
            </div>

            {/* Part 4 Box */}
            <div className="border border-slate-200 bg-white p-4 text-xs space-y-2" style={{ borderRadius: 0 }}>
              <span className="font-mono font-bold uppercase tracking-widest text-slate-400 block text-[10px]">
                Part 4: Central ICT Provisioning
              </span>
              {application.itSignedAt ? (
                <>
                  <div className="font-bold text-slate-900">{application.itReviewerName}</div>
                  <div className="text-slate-700">
                    Asset: <span className="font-mono font-bold text-slate-800">{application.assetSerialNumber}</span>
                  </div>
                  <div className="text-slate-700 font-mono text-[10px]">
                    ZMW {application.deductedMonthlyAmount?.toFixed(2)}/mo · {application.deductionStartDate} → {application.deductionEndDate}
                  </div>
                  <p className="text-slate-700 italic">"{application.itComments}"</p>
                  <div className="pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400">
                    Finalized {new Date(application.itSignedAt).toLocaleString('en-GB')}
                  </div>
                </>
              ) : (
                <div className="text-slate-400 italic py-3">Pending IT hardware allocation</div>
              )}
            </div>
          </div>

          {/* Audit Trail */}
          <div className="border border-slate-200 bg-white p-4" style={{ borderRadius: 0 }}>
            <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Immutable Audit Trail</span>
            </h3>

            <div className="space-y-3">
              {timeline.map((event) => (
                <div key={event.id} className="flex items-start gap-3 text-xs">
                  <div className="w-1.5 h-1.5 bg-slate-400 mt-1.5 shrink-0" style={{ borderRadius: 0 }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {event.actorName}
                        <span className="font-mono text-slate-500 font-normal"> ({event.actorRole})</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(event.createdAt).toLocaleDateString('en-GB')}{' '}
                        {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-0.5">{event.comments}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div>
            {canWithdraw && (
              <button
                onClick={() => {
                  if (window.confirm('Withdraw this pending application?')) {
                    withdrawApplication(application.id);
                    onClose();
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700 underline font-medium cursor-pointer"
              >
                Withdraw Application
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal('PHYSICAL_FORM', application.id)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              style={{ borderRadius: 0 }}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Scheme Form</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
              style={{ borderRadius: 0 }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
