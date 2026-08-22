import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Trash2, ArrowRight, Sparkles, FileText } from 'lucide-react';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';

export const RecentlyViewedDropdown: React.FC = () => {
 const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
 const [isOpen, setIsOpen] = useState(false);
 const dropdownRef = useRef<HTMLDivElement>(null);
 const navigate = useNavigate();

 useEffect(() => {
 const handleClickOutside = (e: MouseEvent) => {
 if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
 setIsOpen(false);
 }
 };
 if (isOpen) {
 document.addEventListener('mousedown', handleClickOutside);
 }
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, [isOpen]);

 return (
 <div className="relative" ref={dropdownRef}>
 <button
 onClick={() => setIsOpen((prev) => !prev)}
 className="p-1.5 text-slate-500 hover:text-slate-900 :text-white hover:bg-slate-100 :bg-slate-800 rounded-lg border border-transparent hover:border-slate-200 :border-slate-700 transition-all focus:outline-none"
 title="Recently Viewed Entities"
 aria-label="Recently Viewed"
 >
 <Clock className="w-4 h-4" />
 </button>

 {isOpen && (
 <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden text-slate-900 transition-all animate-in fade-in zoom-in-95 duration-150">
 <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 ">
 <div className="flex items-center gap-2">
 <Clock className="w-3.5 h-3.5 text-indigo-600 " />
 <h3 className="text-sm font-bold font-poppins text-slate-900 ">Recently Viewed</h3>
 </div>
 {recentlyViewed.length > 0 && (
 <button
 onClick={clearRecentlyViewed}
 className="text-[11px] text-slate-400 hover:text-rose-600 :text-rose-400 transition-colors flex items-center gap-1"
 title="Clear history"
 >
 <Trash2 className="w-3 h-3" />
 <span>Clear</span>
 </button>
 )}
 </div>

 <div className="p-1.5 divide-y divide-slate-100 max-h-72 overflow-y-auto">
 {recentlyViewed.length === 0 ? (
 <div className="p-6 text-center text-slate-500 space-y-1.5">
 <Sparkles className="w-5 h-5 mx-auto text-slate-400 " />
 <p className="text-sm font-semibold text-slate-800 ">No recently viewed pages</p>
 <p className="text-[11px]">Navigate work requests, forums, or questions to populate quick links here.</p>
 </div>
 ) : (
 recentlyViewed.map((item) => (
 <div
 key={item.path}
 onClick={() => {
 navigate(item.path);
 setIsOpen(false);
 }}
 className="group flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-slate-100/80 :bg-slate-800/70 transition-all"
 >
 <div className="flex items-center gap-2.5 overflow-hidden">
 <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500 shrink-0">
 <FileText className="w-3.5 h-3.5" />
 </div>
 <div className="truncate">
 <div className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 :text-indigo-400 transition-colors">
 {item.title}
 </div>
 <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
 {item.type}
 </div>
 </div>
 </div>

 <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
 </div>
 ))
 )}
 </div>
 </div>
 )}
 </div>
 );
};
