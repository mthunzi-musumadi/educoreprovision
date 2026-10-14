import React from 'react';
import { ApplicationStatus, PurchaseApplication } from '../../types';
import { Check, Clock, X } from 'lucide-react';

interface StepperProgressProps {
  application: PurchaseApplication;
}

export const StepperProgress: React.FC<StepperProgressProps> = ({ application }) => {
  const { status } = application;

  const isPart1Done = true;
  const isPart2Done = ['PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF', 'APPROVED'].includes(status);
  const isPart3Done = ['PENDING_IT_SIGNOFF', 'APPROVED'].includes(status);
  const isPart4Done = status === 'APPROVED';

  const isRejected = status === 'REJECTED';
  const isRevision = status === 'REVISION_REQUIRED';

  const steps = [
    {
      num: 1,
      label: 'PART 1',
      title: 'Applicant',
      subtitle: application.termsAccepted ? 'Terms signed' : 'Pending',
      done: isPart1Done,
      active: status === 'DRAFT',
      failed: false,
      date: application.applicantSignedAt,
    },
    {
      num: 2,
      label: 'PART 2',
      title: 'Head Teacher / GM',
      subtitle: isPart2Done
        ? 'Endorsed'
        : status === 'PENDING_GM_REVIEW'
        ? 'Awaiting review'
        : isRevision
        ? 'Revision requested'
        : isRejected && !isPart2Done
        ? 'Rejected'
        : 'Pending',
      done: isPart2Done,
      active: status === 'PENDING_GM_REVIEW',
      failed: isRejected && !isPart2Done,
      date: application.gmSignedAt,
    },
    {
      num: 3,
      label: 'PART 3',
      title: 'Central HR',
      subtitle: isPart3Done
        ? 'Cleared — Debt < 33%'
        : status === 'PENDING_HR_REVIEW'
        ? 'Awaiting clearance'
        : isRejected && isPart2Done && !isPart3Done
        ? 'Rejected at HR'
        : 'Pending',
      done: isPart3Done,
      active: status === 'PENDING_HR_REVIEW',
      failed: isRejected && isPart2Done && !isPart3Done,
      date: application.hrSignedAt,
    },
    {
      num: 4,
      label: 'PART 4',
      title: 'Central ICT',
      subtitle: isPart4Done
        ? `Tagged — ${application.assetSerialNumber || 'Assigned'}`
        : status === 'PENDING_IT_SIGNOFF'
        ? 'Awaiting serial & schedule'
        : isRejected && isPart3Done
        ? 'Rejected by IT'
        : 'Pending',
      done: isPart4Done,
      active: status === 'PENDING_IT_SIGNOFF',
      failed: isRejected && isPart3Done,
      date: application.itSignedAt,
    },
  ];

  return (
    <div className="w-full bg-white border border-slate-200 p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]" style={{ borderRadius: 0 }}>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {steps.map((st) => {
          // Track state color
          const trackColor = st.done
            ? 'border-emerald-500'
            : st.failed
            ? 'border-red-500'
            : st.active
            ? 'border-amber-500'
            : 'border-slate-200';

          const indicatorClass = st.done
            ? 'bg-emerald-600 text-white border-emerald-600'
            : st.failed
            ? 'bg-red-600 text-white border-red-600'
            : st.active
            ? 'bg-amber-500 text-white border-amber-500'
            : 'bg-white text-slate-400 border-slate-300';

          return (
            <div
              key={st.num}
              className={`px-3.5 pt-3 pb-3 border-t-2 ${trackColor} flex flex-col gap-1.5`}
              style={{ borderRadius: 0 }}
            >
              {/* Label row */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400 tracking-widest uppercase">
                  {st.label}
                </span>
                {/* Square indicator */}
                <div
                  className={`w-5 h-5 flex items-center justify-center text-[10px] font-black border ${indicatorClass}`}
                  style={{ borderRadius: 0 }}
                >
                  {st.done ? (
                    <Check className="w-3 h-3" strokeWidth={3} />
                  ) : st.failed ? (
                    <X className="w-3 h-3" strokeWidth={3} />
                  ) : st.active ? (
                    <Clock className="w-3 h-3" />
                  ) : (
                    st.num
                  )}
                </div>
              </div>

              {/* Title */}
              <div className="text-[11px] font-bold text-slate-800 leading-tight">{st.title}</div>

              {/* Subtitle */}
              <p className="text-[10px] font-mono text-slate-500 leading-tight">{st.subtitle}</p>

              {/* Date stamp */}
              {st.date && (
                <div className="mt-1 pt-1.5 border-t border-slate-100 text-[10px] font-mono text-slate-400">
                  {new Date(st.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
