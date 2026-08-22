import React from 'react';

interface SkeletonLoaderProps {
 type?: 'card' | 'list' | 'table' | 'detail' | 'text' | 'avatar';
 count?: number;
 className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
 type = 'card',
 count = 3,
 className = '',
}) => {
 const items = Array.from({ length: count });

 if (type === 'avatar') {
 return (
 <div className={`animate-pulse bg-slate-200 rounded-full ${className || 'w-10 h-10'}`} />
 );
 }

 if (type === 'text') {
 return (
 <div className={`space-y-2 animate-pulse ${className}`}>
 <div className="h-4 bg-slate-200 rounded w-3/4" />
 <div className="h-4 bg-slate-200 rounded w-1/2" />
 </div>
 );
 }

 if (type === 'list') {
 return (
 <div className={`space-y-3 ${className}`}>
 {items.map((_, idx) => (
 <div
 key={idx}
 className="animate-pulse p-4 bg-white border border-slate-200 space-y-3 shadow-xs"
 >
 <div className="flex items-center justify-between">
 <div className="h-4 bg-slate-200 rounded w-1/4" />
 <div className="h-3 bg-slate-200 rounded w-16" />
 </div>
 <div className="h-5 bg-slate-200 rounded w-3/4" />
 <div className="h-3 bg-slate-200 rounded w-1/2" />
 <div className="pt-2 flex items-center justify-between">
 <div className="h-3 bg-slate-200 rounded w-20" />
 <div className="h-3 bg-slate-200 rounded w-12" />
 </div>
 </div>
 ))}
 </div>
 );
 }

 if (type === 'table') {
 return (
 <div className={`animate-pulse space-y-3 ${className}`}>
 <div className="h-10 bg-slate-200 rounded-lg w-full" />
 {items.map((_, idx) => (
 <div key={idx} className="h-12 bg-slate-100 border border-slate-200 rounded-lg w-full flex items-center px-4 gap-4">
 <div className="h-4 bg-slate-200 rounded w-1/6" />
 <div className="h-4 bg-slate-200 rounded w-1/3" />
 <div className="h-4 bg-slate-200 rounded w-1/4" />
 <div className="h-4 bg-slate-200 rounded w-1/12 ml-auto" />
 </div>
 ))}
 </div>
 );
 }

 if (type === 'detail') {
 return (
 <div className={`animate-pulse space-y-6 ${className}`}>
 {/* Header Skeleton */}
 <div className="space-y-3 p-6 bg-white border border-slate-200 shadow-xs">
 <div className="flex items-center gap-3">
 <div className="h-5 bg-slate-200 rounded w-24" />
 <div className="h-5 bg-slate-200 rounded w-16" />
 </div>
 <div className="h-8 bg-slate-200 rounded w-2/3" />
 <div className="h-4 bg-slate-200 rounded w-full" />
 <div className="h-4 bg-slate-200 rounded w-4/5" />
 <div className="pt-4 flex items-center gap-4">
 <div className="h-8 bg-slate-200 rounded-lg w-28" />
 <div className="h-8 bg-slate-200 rounded-lg w-28" />
 </div>
 </div>

 {/* Content Body Skeleton */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 space-y-4">
 <div className="p-6 bg-white border border-slate-200 space-y-4 shadow-xs">
 <div className="h-5 bg-slate-200 rounded w-32" />
 <div className="h-4 bg-slate-200 rounded w-full" />
 <div className="h-4 bg-slate-200 rounded w-5/6" />
 <div className="h-4 bg-slate-200 rounded w-2/3" />
 </div>
 </div>
 <div className="space-y-4">
 <div className="p-6 bg-white border border-slate-200 space-y-3 shadow-xs">
 <div className="h-4 bg-slate-200 rounded w-24" />
 <div className="h-4 bg-slate-200 rounded w-36" />
 <div className="h-4 bg-slate-200 rounded w-28" />
 </div>
 </div>
 </div>
 </div>
 );
 }

 // Default: Grid Card skeleton
 return (
 <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
 {items.map((_, idx) => (
 <div
 key={idx}
 className="animate-pulse bg-white border border-slate-200 p-5 space-y-4 shadow-xs flex flex-col justify-between"
 >
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div className="h-4 bg-slate-200 rounded w-20" />
 <div className="h-4 bg-slate-200 rounded-full w-12" />
 </div>
 <div className="h-5 bg-slate-200 rounded w-3/4" />
 <div className="h-4 bg-slate-200 rounded w-full" />
 <div className="h-4 bg-slate-200 rounded w-2/3" />
 </div>
 <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
 <div className="h-3 bg-slate-200 rounded w-24" />
 <div className="h-3 bg-slate-200 rounded w-16" />
 </div>
 </div>
 ))}
 </div>
 );
};
