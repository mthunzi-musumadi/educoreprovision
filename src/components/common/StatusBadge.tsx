import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle, FileText, Ban } from 'lucide-react';
import { motion } from 'motion/react';
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
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />,
          dotColor: 'bg-emerald-500',
          isLive: false,
        };
      case 'IN_REVIEW':
      case 'PENDING_GM_REVIEW':
      case 'PENDING_HR_REVIEW':
      case 'PENDING_IT_SIGNOFF':
        return {
          label: customLabel || (status === 'IN_REVIEW' ? 'In Review' : 'Pending Review'),
          classes: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <Clock className="w-3 h-3 text-blue-600 shrink-0" />,
          dotColor: 'bg-blue-500',
          isLive: true,
        };
      case 'REVISION_REQUIRED':
        return {
          label: customLabel || 'Revision Required',
          classes: 'bg-amber-50 text-amber-900 border-amber-200',
          icon: <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />,
          dotColor: 'bg-amber-500',
          isLive: true,
        };
      case 'REJECTED':
        return {
          label: customLabel || 'Rejected',
          classes: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: <XCircle className="w-3 h-3 text-rose-600 shrink-0" />,
          dotColor: 'bg-rose-500',
          isLive: false,
        };
      case 'CLOSED':
        return {
          label: customLabel || 'Withdrawn / Closed',
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <Ban className="w-3 h-3 text-slate-500 shrink-0" />,
          dotColor: 'bg-slate-400',
          isLive: false,
        };
      case 'DRAFT':
        return {
          label: customLabel || 'Draft',
          classes: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: <FileText className="w-3 h-3 text-slate-500 shrink-0" />,
          dotColor: 'bg-slate-400',
          isLive: false,
        };
      default:
        return {
          label: customLabel || status.replace(/_/g, ' '),
          classes: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: null,
          dotColor: 'bg-slate-400',
          isLive: false,
        };
    }
  };

  const badge = getBadgeConfig();
  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-[10px] gap-1 font-medium'
      : size === 'sm'
      ? 'px-2.5 py-0.5 text-[11px] gap-1.5 font-medium'
      : 'px-3 py-1 text-xs gap-1.5 font-medium';

  return (
    <motion.span
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`inline-flex items-center rounded-full border whitespace-nowrap select-none transition-colors ${sizeClasses} ${badge.classes}`}
    >
      {showIcon && badge.icon ? (
        <span className="relative flex items-center justify-center shrink-0">
          {badge.isLive && (
            <span className={`animate-ping absolute inline-flex h-3 w-3 rounded-full ${badge.dotColor} opacity-30`} />
          )}
          {badge.icon}
        </span>
      ) : (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {badge.isLive && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${badge.dotColor} opacity-75`} />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${badge.dotColor}`} />
        </span>
      )}
      <span>{badge.label}</span>
    </motion.span>
  );
};

export default StatusBadge;
