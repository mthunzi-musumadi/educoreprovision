import React from 'react';
import { ApplicationStatus, PurchaseApplication } from '../../types';
import { Check, Clock, X, AlertTriangle } from 'lucide-react';

interface StepperProgressProps {
  application: PurchaseApplication;
}

export const StepperProgress: React.FC<StepperProgressProps> = ({ application }) => {
  const { status } = application;

  const isPart1Done = true; // Once submitted, Part 1 is signed
  const isPart2Done = ['PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF', 'APPROVED'].includes(status);
  const isPart3Done = ['PENDING_IT_SIGNOFF', 'APPROVED'].includes(status);
  const isPart4Done = status === 'APPROVED';

  const isRejected = status === 'REJECTED';
  const isRevision = status === 'REVISION_REQUIRED';

  const steps = [
    {
      num: 1,
      title: 'Part 1: Applicant',
      subtitle: application.termsAccepted ? 'Terms accepted & signed' : 'Pending',
      done: isPart1Done,
      active: status === 'DRAFT',
      date: application.applicantSignedAt,
    },
    {
      num: 2,
      title: 'Part 2: Head Teacher / GM',
      subtitle: isPart2Done
        ? 'Endorsed'
        : status === 'PENDING_GM_REVIEW'
        ? 'Awaiting review'
        : isRevision
        ? 'Revision requested'
        : isRejected && !isPart2Done
        ? 'Rejected at Part 2'
        : 'Pending',
      done: isPart2Done,
      active: status === 'PENDING_GM_REVIEW',
      failed: isRejected && !isPart2Done,
      date: application.gmSignedAt,
    },
    {
      num: 3,
      title: 'Part 3: Central HR',
      subtitle: isPart3Done
        ? 'Cleared (Debt < 33%)'
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
      title: 'Part 4: Central ICT',
      subtitle: isPart4Done
        ? `Asset tagged (${application.assetSerialNumber || 'Assigned'})`
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
    <div className="w-full bg-white border border-slate-200 rounded-lg p-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {steps.map((st, idx) => {
          let badgeBg = 'bg-slate-100 text-slate-500 border-slate-300';
          let borderTop = 'border-slate-200';

          if (st.done) {
            badgeBg = 'bg-emerald-600 text-white border-emerald-600';
            borderTop = 'border-emerald-600';
          } else if (st.failed) {
            badgeBg = 'bg-red-600 text-white border-red-600';
            borderTop = 'border-red-400';
          } else if (st.active) {
            badgeBg = 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-100';
            borderTop = 'border-amber-400';
          }

          return (
            <div
              key={st.num}
              className={`p-3 rounded-md border-t-2 ${borderTop} bg-slate-50/50 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-800">{st.title}</span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border ${badgeBg}`}
                  >
                    {st.done ? (
                      <Check className="w-3 h-3 stroke-3" />
                    ) : st.failed ? (
                      <X className="w-3 h-3 stroke-3" />
                    ) : st.active ? (
                      <Clock className="w-3 h-3" />
                    ) : (
                      st.num
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">{st.subtitle}</p>
              </div>

              {st.date && (
                <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-mono">
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
