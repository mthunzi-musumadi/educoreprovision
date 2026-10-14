import React from 'react';
import { ApplicationStatus } from '../../types';

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

type StatusConfig = {
  label: string;
  dot: string;      // color class for the 4×4 square indicator
  text: string;     // text color class
  border: string;   // border color class
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = (): StatusConfig => {
    switch (status) {
      case 'DRAFT':
        return { label: 'DRAFT', dot: 'bg-slate-400', text: 'text-slate-600', border: 'border-slate-300' };
      case 'PENDING_GM_REVIEW':
        return { label: 'PENDING — HEAD TEACHER', dot: 'bg-amber-500', text: 'text-amber-800', border: 'border-amber-400' };
      case 'PENDING_HR_REVIEW':
        return { label: 'PENDING — CENTRAL HR', dot: 'bg-sky-500', text: 'text-sky-800', border: 'border-sky-400' };
      case 'PENDING_IT_SIGNOFF':
        return { label: 'PENDING — ICT SIGN-OFF', dot: 'bg-slate-500', text: 'text-slate-800', border: 'border-slate-400' };
      case 'REVISION_REQUIRED':
        return { label: 'REVISION REQUIRED', dot: 'bg-orange-500', text: 'text-orange-800', border: 'border-orange-400' };
      case 'APPROVED':
        return { label: 'APPROVED — ACTIVE', dot: 'bg-emerald-500', text: 'text-emerald-800', border: 'border-emerald-400' };
      case 'REJECTED':
        return { label: 'REJECTED', dot: 'bg-red-500', text: 'text-red-800', border: 'border-red-400' };
      case 'CLOSED':
        return { label: 'CLOSED', dot: 'bg-slate-300', text: 'text-slate-500', border: 'border-slate-300' };
    }
  };

  const config = getStatusConfig();
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 border bg-white whitespace-nowrap font-mono font-semibold tracking-wide shadow-sm ${textSize} ${config.text} ${config.border}`}
      style={{ borderRadius: 0 }}
    >
      {/* 4×4 square indicator — not a rounded dot */}
      <span className={`inline-block w-1.5 h-1.5 shrink-0 ${config.dot}`} style={{ borderRadius: 0 }} />
      {config.label}
    </span>
  );
};
