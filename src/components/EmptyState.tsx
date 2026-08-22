import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';

export interface EmptyStateProps {
 icon?: LucideIcon;
 title: string;
 description: string;
 actionLabel?: string;
 onAction?: () => void;
 secondaryActionLabel?: string;
 onSecondaryAction?: () => void;
 className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
 icon: Icon,
 title,
 description,
 actionLabel,
 onAction,
 secondaryActionLabel,
 onSecondaryAction,
 className = '',
}) => {
 return (
 <div
 className={`bg-white border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs transition-all ${className}`}
 >
 {Icon && (
 <div className="w-12 h-12 mx-auto bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
 <Icon className="w-6 h-6" />
 </div>
 )}

 <div className="max-w-md mx-auto space-y-1.5">
 <h3 className="text-base font-bold text-slate-900 font-poppins">{title}</h3>
 <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
 </div>

 {(actionLabel || secondaryActionLabel) && (
 <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
 {secondaryActionLabel && onSecondaryAction && (
 <button
 onClick={onSecondaryAction}
 className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 :text-white bg-slate-100 hover:bg-slate-200 :bg-slate-700 rounded-xl transition-all cursor-pointer"
 >
 {secondaryActionLabel}
 </button>
 )}

 {actionLabel && onAction && (
 <button
 onClick={onAction}
 className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-sm transition-all hover:shadow-indigo-500/20 cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 <span>{actionLabel}</span>
 </button>
 )}
 </div>
 )}
 </div>
 );
};
