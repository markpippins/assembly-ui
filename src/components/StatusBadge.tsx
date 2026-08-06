import React from 'react';

interface StatusBadgeProps {
  status: string | null | undefined;
  type?: 'status' | 'priority' | 'category' | 'role';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'status', size = 'sm' }) => {
  if (!status) return null;

  const val = status.toUpperCase();
  let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  if (val === 'ACTIVE' || val === 'APPROVED' || val === 'ACCEPTED' || val === 'COMPLETED' || val === 'ANSWERED' || val === 'VERIFIED') {
    bgClass = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
  } else if (val === 'HIGH' || val === 'BLOCKING' || val === 'URGENT' || val === 'REJECTED') {
    bgClass = 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30';
  } else if (val === 'IN_PROGRESS' || val === 'IN_REVIEW' || val === 'MEDIUM' || val === 'DESIGN') {
    bgClass = 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30';
  } else if (val === 'LOW' || val === 'OPEN' || val === 'READY') {
    bgClass = 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30';
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-sm';

  return (
    <span className={`inline-flex items-center font-semibold rounded-md border ${px} ${bgClass} uppercase tracking-wider`}>
      {status}
    </span>
  );
};

