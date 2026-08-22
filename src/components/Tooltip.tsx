import React, { useState } from 'react';
import { HelpCircle, Info } from 'lucide-react';

export interface TooltipProps {
 content: string;
 children: React.ReactNode;
 position?: 'top' | 'bottom' | 'left' | 'right';
 className?: string;
 showIcon?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
 content,
 children,
 position = 'top',
 className = '',
 showIcon = false,
}) => {
 const [isVisible, setIsVisible] = useState(false);

 const positionClasses = {
 top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
 bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
 left: 'right-full top-1/2 -translate-y-1/2 mr-2',
 right: 'left-full top-1/2 -translate-y-1/2 ml-2',
 };

 const arrowClasses = {
 top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent',
 bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent',
 left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent',
 right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent',
 };

 return (
 <div
 className={`relative inline-flex items-center group/tooltip ${className}`}
 onMouseEnter={() => setIsVisible(true)}
 onMouseLeave={() => setIsVisible(false)}
 onFocus={() => setIsVisible(true)}
 onBlur={() => setIsVisible(false)}
 title={content}
 >
 {children}

 {showIcon && (
 <Info className="w-3.5 h-3.5 ml-1 text-slate-400 group-hover/tooltip:text-indigo-500 :text-indigo-400 cursor-help transition-colors flex-shrink-0" />
 )}

 {/* Floating Tooltip Popup */}
 <div
 className={`absolute z-50 pointer-events-none transition-all duration-200 ease-out transform ${
 isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
 } ${positionClasses[position]}`}
 >
 <div className="bg-slate-900 text-slate-100 text-[11px] font-sans font-medium px-3 py-1.5 rounded-lg shadow-xl border border-slate-700/80 max-w-xs whitespace-normal leading-snug text-center">
 {content}
 <div className={`absolute border-4 ${arrowClasses[position]}`} />
 </div>
 </div>
 </div>
 );
};
