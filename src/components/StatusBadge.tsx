import React from 'react';

interface StatusBadgeProps {
 status: string | null | undefined;
 type?: 'status' | 'priority' | 'category' | 'role';
 size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'status', size = 'sm' }) => {
 if (!status) return null;

 const val = status.toUpperCase();
 let bgClass = 'bg-slate-100 text-slate-700 border-slate-200 ';

 if (val === 'ACTIVE' || val === 'APPROVED' || val === 'ACCEPTED' || val === 'COMPLETED' || val === 'ANSWERED' || val === 'VERIFIED') {
 bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 ';
 } else if (val === 'HIGH' || val === 'BLOCKING' || val === 'URGENT' || val === 'REJECTED') {
 bgClass = 'bg-rose-50 text-rose-700 border-rose-200 ';
 } else if (val === 'IN_PROGRESS' || val === 'IN_REVIEW' || val === 'MEDIUM' || val === 'DESIGN') {
 bgClass = 'bg-amber-50 text-amber-800 border-amber-200 ';
 } else if (val === 'LOW' || val === 'OPEN' || val === 'READY') {
 bgClass = 'bg-sky-50 text-sky-700 border-sky-200 ';
 }

 const px = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-sm';

 return (
 <span className={`inline-flex items-center font-semibold rounded-md border ${px} ${bgClass} uppercase tracking-wider`}>
 {status}
 </span>
 );
};

