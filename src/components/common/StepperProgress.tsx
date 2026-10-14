import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle, CircleDot } from 'lucide-react';
import {
  ApplicationApprovalStep,
  LifecycleStatus,
  LegacyApplicationStatus,
} from '../../types';

interface StepperProgressProps {
  // New dynamic workflow props
  approvals?: ApplicationApprovalStep[];
  lifecycleStatus?: LifecycleStatus;
  currentStepOrder?: number | null;
  submittedAt?: string | null;

  // Legacy fallback prop so existing ICT views don't break
  status?: LegacyApplicationStatus;
  compact?: boolean;
}

interface NormalizedStepNode {
  key: string;
  label: string;
  sublabel?: string;
  state: 'COMPLETED' | 'CURRENT' | 'UPCOMING' | 'REJECTED' | 'REVISION';
}

export const StepperProgress: React.FC<StepperProgressProps> = ({
  approvals,
  lifecycleStatus,
  currentStepOrder,
  submittedAt,
  status: legacyStatus,
  compact = false,
}) => {
  const nodes: NormalizedStepNode[] = React.useMemo(() => {
    // 1. Dynamic Pipeline Path (Works for all 14 forms)
    if (approvals && approvals.length > 0 && lifecycleStatus) {
      const isDraft = lifecycleStatus === 'DRAFT';

      const stepNodes: NormalizedStepNode[] = [
        {
          key: 'submitted',
          label: 'Applicant Submission',
          sublabel: isDraft
            ? 'Draft'
            : submittedAt
            ? new Date(submittedAt).toLocaleDateString()
            : 'Signed',
          state: isDraft ? 'CURRENT' : 'COMPLETED',
        },
      ];

      for (const step of approvals) {
        let state: NormalizedStepNode['state'] = 'UPCOMING';

        if (step.status === 'APPROVED') {
          state = 'COMPLETED';
        } else if (step.status === 'REJECTED') {
          state = 'REJECTED';
        } else if (step.status === 'REVISION_REQUESTED') {
          state = 'REVISION';
        } else if (
          lifecycleStatus === 'IN_REVIEW' &&
          currentStepOrder === step.step_order
        ) {
          state = 'CURRENT';
        }

        stepNodes.push({
          key: `step-${step.step_order}`,
          label: step.step_label,
          sublabel: step.reviewer_name
            ? step.reviewer_name
            : step.required_role.replace(/_/g, ' '),
          state,
        });
      }

      return stepNodes;
    }

    // 2. Legacy Fallback Path (If a component only passes legacy ICT `status`)
    const s = legacyStatus || 'DRAFT';
    const order: LegacyApplicationStatus[] = [
      'DRAFT',
      'PENDING_GM_REVIEW',
      'PENDING_HR_REVIEW',
      'PENDING_IT_SIGNOFF',
      'APPROVED',
    ];
    const currentIndex = order.indexOf(s);

    return [
      {
        key: 'sub',
        label: 'Submitted',
        state: s === 'DRAFT' ? 'CURRENT' : 'COMPLETED',
      },
      {
        key: 'gm',
        label: 'GM / Head Review',
        state:
          s === 'PENDING_GM_REVIEW'
            ? 'CURRENT'
            : s === 'REVISION_REQUIRED'
            ? 'REVISION'
            : currentIndex > 1 || s === 'APPROVED'
            ? 'COMPLETED'
            : 'UPCOMING',
      },
      {
        key: 'hr',
        label: 'HR Clearance',
        state:
          s === 'PENDING_HR_REVIEW'
            ? 'CURRENT'
            : currentIndex > 2 || s === 'APPROVED'
            ? 'COMPLETED'
            : 'UPCOMING',
      },
      {
        key: 'it',
        label: 'IT Sign-off',
        state:
          s === 'PENDING_IT_SIGNOFF'
            ? 'CURRENT'
            : s === 'APPROVED'
            ? 'COMPLETED'
            : s === 'REJECTED'
            ? 'REJECTED'
            : 'UPCOMING',
      },
    ];
  }, [approvals, lifecycleStatus, currentStepOrder, submittedAt, legacyStatus]);

  const renderIcon = (state: NormalizedStepNode['state']) => {
    switch (state) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'CURRENT':
        return <Clock className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-600 shrink-0" />;
      case 'REVISION':
        return <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />;
      default:
        return <CircleDot className="w-5 h-5 text-slate-300 shrink-0" />;
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        {nodes.map((node, index) => {
          const isLast = index === nodes.length - 1;
          return (
            <React.Fragment key={node.key}>
              <div className="flex flex-col items-start min-w-0">
                <div className="flex items-center gap-1.5">
                  {renderIcon(node.state)}
                  <span
                    className={`text-xs font-semibold truncate ${
                      node.state === 'COMPLETED'
                        ? 'text-emerald-800'
                        : node.state === 'CURRENT'
                        ? 'text-amber-800'
                        : node.state === 'REJECTED'
                        ? 'text-red-700'
                        : node.state === 'REVISION'
                        ? 'text-orange-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {node.label}
                  </span>
                </div>
                {!compact && node.sublabel && (
                  <span className="text-[11px] text-slate-500 pl-6 truncate">
                    {node.sublabel}
                  </span>
                )}
              </div>

              {!isLast && (
                <div
                  className={`flex-1 h-0.5 rounded ${
                    node.state === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepperProgress;