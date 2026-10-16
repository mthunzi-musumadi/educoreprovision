import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle, FileText, Ban } from 'lucide-react';
import { LifecycleStatus, LegacyApplicationStatus } from '../../types';

interface StatusBadgeProps {
  status: LifecycleStatus | LegacyApplicationStatus | string;
  customLabel?: string;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  customLabel,
  size = 'md',
  showIcon = true,
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'APPROVED':
        return {
          label: customLabel || 'Approved',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-emerald-500/5',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />,
          dotColor: 'bg-emerald-500',
        };
      case 'IN_REVIEW':
      case 'PENDING_GM_REVIEW':
      case 'PENDING_HR_REVIEW':
      case 'PENDING_IT_SIGNOFF':
        return {
          label: customLabel || (status === 'IN_REVIEW' ? 'In Review' : 'Pending Review'),
          classes: 'bg-blue-50 text-blue-700 border-blue-200/80 shadow-blue-500/5',
          icon: <Clock className="w-3 h-3 text-blue-600 shrink-0" />,
          dotColor: 'bg-blue-500',
        };
      case 'REVISION_REQUIRED':
        return {
          label: customLabel || 'Revision Required',
          classes: 'bg-amber-50 text-amber-700 border-amber-200/80 shadow-amber-500/5',
          icon: <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />,
          dotColor: 'bg-amber-500',
        };
      case 'REJECTED':
        return {
          label: customLabel || 'Rejected',
          classes: 'bg-rose-50 text-rose-700 border-rose-200/80 shadow-rose-500/5',
          icon: <XCircle className="w-3 h-3 text-rose-600 shrink-0" />,
          dotColor: 'bg-rose-500',
        };
      case 'CLOSED':
        return {
          label: customLabel || 'Withdrawn / Closed',
          classes: 'bg-slate-100 text-slate-600 border-slate-200/90',
          icon: <Ban className="w-3 h-3 text-slate-500 shrink-0" />,
          dotColor: 'bg-slate-400',
        };
      case 'DRAFT':
        return {
          label: customLabel || 'Draft',
          classes: 'bg-slate-50 text-slate-700 border-slate-200/90',
          icon: <FileText className="w-3 h-3 text-slate-500 shrink-0" />,
          dotColor: 'bg-slate-400',
        };
      default:
        return {
          label: customLabel || status.replace(/_/g, ' '),
          classes: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: null,
          dotColor: 'bg-slate-400',
        };
    }
  };

  const badge = getBadgeConfig();
  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : size === 'sm'
      ? 'px-2.5 py-0.5 text-[11px] gap-1.5'
      : 'px-3 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border whitespace-nowrap shadow-2xs transition-all ${sizeClasses} ${badge.classes}`}
    >
      {showIcon && badge.icon ? (
        badge.icon
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
      )}
      <span>{badge.label}</span>
    </span>
  );
};

export default StatusBadge;
