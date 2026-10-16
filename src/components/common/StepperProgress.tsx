import React from 'react';
import { Check, Clock, X, AlertTriangle, Circle } from 'lucide-react';
import { motion } from 'motion/react';
import {
  ApplicationApprovalStep,
  LifecycleStatus,
  LegacyApplicationStatus,
} from '../../types';

interface StepperProgressProps {
  approvals?: ApplicationApprovalStep[];
  lifecycleStatus?: LifecycleStatus;
  currentStepOrder?: number | null;
  submittedAt?: string | null;
  status?: LegacyApplicationStatus;
  compact?: boolean;
}

interface NormalizedStepNode {
  key: string;
  label: string;
  sublabel?: string;
  state: 'COMPLETED' | 'CURRENT' | 'UPCOMING' | 'REJECTED' | 'REVISION';
}

// Helper to make verbose database role titles concise and human-friendly
const formatConciseStepTitle = (rawLabel: string): string => {
  const l = rawLabel.toLowerCase();
  if (l.includes('applicant') || l.includes('submission')) return 'Applicant';
  if (l.includes('head teacher') || l.includes('headmaster') || l.includes('site head') || l.includes('gm'))
    return 'Site Head';
  if (l.includes('line manager') || l.includes('faculty')) return 'Line Manager';
  if (l.includes('hr officer')) return 'HR Officer';
  if (l.includes('hr') || l.includes('human resources')) return 'Central HR';
  if (l.includes('ict') || l.includes('it equipment') || l.includes('it manager'))
    return 'ICT Sign-off';
  if (l.includes('finance') || l.includes('payroll')) return 'Finance';
  if (l.includes('logistics') || l.includes('procurement')) return 'Logistics';
  if (l.includes('executive head')) return 'Executive Head';
  if (l.includes('coo') || l.includes('operating officer')) return 'COO';
  return rawLabel.length > 18 ? `${rawLabel.slice(0, 16)}…` : rawLabel;
};

export const StepperProgress: React.FC<StepperProgressProps> = ({
  approvals,
  lifecycleStatus,
  currentStepOrder,
  submittedAt,
  status: legacyStatus,
  compact = false,
}) => {
  const nodes: NormalizedStepNode[] = React.useMemo(() => {
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
            : 'Submitted',
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
        label: 'Applicant Submission',
        sublabel: s === 'DRAFT' ? 'Draft' : 'Submitted',
        state: s === 'DRAFT' ? 'CURRENT' : 'COMPLETED',
      },
      {
        key: 'gm',
        label: 'Head Teacher Approval',
        sublabel: 'Site Endorsement',
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
        sublabel: 'Central HR',
        state:
          s === 'PENDING_HR_REVIEW'
            ? 'CURRENT'
            : currentIndex > 2 || s === 'APPROVED'
            ? 'COMPLETED'
            : 'UPCOMING',
      },
      {
        key: 'it',
        label: 'ICT Sign-off',
        sublabel: 'Asset Provisioning',
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

  const completedCount = nodes.filter((n) => n.state === 'COMPLETED').length;
  const totalCount = nodes.length;

  // 1. Compact table-cell mode (For MasterSheetView table rows)
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {nodes.map((node) => (
            <motion.div
              key={node.key}
              title={`${node.label}: ${node.state.toLowerCase()}`}
              animate={node.state === 'CURRENT' ? { opacity: [0.7, 1, 0.7] } : undefined}
              transition={node.state === 'CURRENT' ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
              className={`h-2 rounded-full transition-all ${
                node.state === 'COMPLETED'
                  ? 'w-4 bg-emerald-500'
                  : node.state === 'CURRENT'
                  ? 'w-5 bg-blue-600'
                  : node.state === 'REJECTED'
                  ? 'w-4 bg-rose-500'
                  : node.state === 'REVISION'
                  ? 'w-4 bg-orange-500'
                  : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] font-mono font-medium text-slate-500 whitespace-nowrap">
          {completedCount}/{totalCount}
        </span>
      </div>
    );
  }

  // 2. Full corporate stepper mode (For Dashboard cards and Detail Drawer)
  return (
    <div className="w-full py-2 select-none">
      <div className="flex items-start">
        {nodes.map((node, index) => {
          const isLast = index === nodes.length - 1;
          const isCompleted = node.state === 'COMPLETED';
          const isCurrent = node.state === 'CURRENT';
          const isRejected = node.state === 'REJECTED';
          const isRevision = node.state === 'REVISION';

          return (
            <div
              key={node.key}
              className="flex-1 flex flex-col items-center relative text-center px-1 min-w-0"
            >
              {/* Horizontal connecting track running between node centers */}
              {!isLast && (
                <div className="absolute top-3.5 left-1/2 w-full h-0.5 z-0 bg-slate-200 overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    style={{ originX: 0 }}
                    className="w-full h-full bg-emerald-500"
                  />
                </div>
              )}

              {/* Node milestone circle */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-2xs ring-4 ring-white ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-blue-100 ring-4'
                    : isRejected
                    ? 'bg-rose-600 text-white'
                    : isRevision
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
                title={`${node.label} (${node.state.replace(/_/g, ' ')})`}
              >
                {isCurrent && (
                  <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping -z-10" />
                )}
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : isCurrent ? (
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                ) : isRejected ? (
                  <X className="w-4 h-4 stroke-[3]" />
                ) : isRevision ? (
                  <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <span className="text-[11px] font-bold text-slate-500">
                    {index + 1}
                  </span>
                )}
              </motion.div>

              {/* Label & Subtitle Stacked cleanly underneath */}
              <div className="mt-2 w-full px-0.5">
                <div
                  className={`text-xs font-bold leading-tight truncate ${
                    isCompleted
                      ? 'text-slate-800'
                      : isCurrent
                      ? 'text-amber-800 font-extrabold'
                      : isRejected
                      ? 'text-rose-700'
                      : isRevision
                      ? 'text-orange-700'
                      : 'text-slate-400'
                  }`}
                  title={node.label}
                >
                  {formatConciseStepTitle(node.label)}
                </div>

                {node.sublabel && (
                  <div
                    className="text-[11px] text-slate-500 truncate mt-0.5 leading-tight"
                    title={node.sublabel}
                  >
                    {node.sublabel}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepperProgress;