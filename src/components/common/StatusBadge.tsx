import React from 'react';
import { ApplicationStatus } from '../../types';
import { CheckCircle2, Clock, AlertTriangle, XCircle, FileEdit, CheckCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'DRAFT':
        return {
          label: 'Draft',
          icon: FileEdit,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      case 'PENDING_GM_REVIEW':
        return {
          label: 'Pending Head Teacher / GM',
          icon: Clock,
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'PENDING_HR_REVIEW':
        return {
          label: 'Pending Central HR Review',
          icon: Clock,
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
        };
      case 'PENDING_IT_SIGNOFF':
        return {
          label: 'Pending ICT Manager Sign-off',
          icon: Clock,
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        };
      case 'REVISION_REQUIRED':
        return {
          label: 'Revision Required',
          icon: AlertTriangle,
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
        };
      case 'APPROVED':
        return {
          label: 'Approved & Active Deduction',
          icon: CheckCircle2,
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          icon: XCircle,
          bg: 'bg-red-50 text-red-800 border-red-200',
        };
      case 'CLOSED':
        return {
          label: 'Closed / Concluded',
          icon: CheckCheck,
          bg: 'bg-slate-100 text-slate-600 border-slate-200',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap ${config.bg}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
};
