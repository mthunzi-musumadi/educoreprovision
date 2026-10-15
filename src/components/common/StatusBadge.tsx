import React from 'react';
import { LifecycleStatus, LegacyApplicationStatus } from '../../types';

interface StatusBadgeProps {
  status: LifecycleStatus | LegacyApplicationStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'APPROVED':
        return {
          label: 'Approved',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        };
      case 'IN_REVIEW':
      case 'PENDING_GM_REVIEW':
      case 'PENDING_HR_REVIEW':
      case 'PENDING_IT_SIGNOFF':
        return {
          label: status === 'IN_REVIEW' ? 'In Review' : 'Pending Review',
          classes: 'bg-blue-50 text-blue-700 border-blue-200/80',
        };
      case 'REVISION_REQUIRED':
        return {
          label: 'Revision Required',
          classes: 'bg-amber-50 text-amber-700 border-amber-200/80',
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          classes: 'bg-rose-50 text-rose-700 border-rose-200/80',
        };
      case 'CLOSED':
        return {
          label: 'Withdrawn / Closed',
          classes: 'bg-slate-50 text-slate-500 border-slate-200',
        };
      default:
        return {
          label: status.replace(/_/g, ' '),
          classes: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const badge = getBadgeStyle();
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border whitespace-nowrap shadow-2xs ${sizeClasses} ${badge.classes}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {badge.label}
    </span>
  );
};

export default StatusBadge;
