import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
 Bell,
 Check,
 CheckCheck,
 Trash2,
 AlertTriangle,
 Briefcase,
 HelpCircle,
 Activity,
 Sparkles
} from 'lucide-react';
import { dataService } from '../services/dataService';

export interface NotificationItem {
 id: string;
 title: string;
 message: string;
 timestamp: string;
 type: 'alert' | 'update' | 'question' | 'system';
 read: boolean;
 link: string;
}

function relativeTime(iso: string): string {
 const diffMs = Date.now() - new Date(iso).getTime();
 if (Number.isNaN(diffMs)) return '';
 const mins = Math.floor(diffMs / 60000);
 if (mins < 1) return 'just now';
 if (mins < 60) return `${mins}m ago`;
 const hrs = Math.floor(mins / 60);
 if (hrs < 24) return `${hrs}h ago`;
 return `${Math.floor(hrs / 24)}d ago`;
}

/** Build the notification list from real cached backend data — no fixtures. */
function buildNotifications(): NotificationItem[] {
 const items: NotificationItem[] = [];

 // Blocking open questions need attention
 for (const q of dataService.getOpenQuestions(false).filter((q) => q.blocking && !q.answeredAt).slice(0, 3)) {
 items.push({
 id: `q-${q.id}`,
 title: 'Blocking Question Open',
 message: q.title,
 timestamp: relativeTime(q.createdAt),
 type: 'question',
 read: false,
 link: `/open-questions/${q.id}`,
 });
 }

 // Recent work requests
 for (const w of dataService.getWorkRequests().slice(0, 3)) {
 items.push({
 id: `wr-${w.id}`,
 title: 'Work Request Status',
 message: `${w.title} — ${w.status}`,
 timestamp: relativeTime(w.updatedAt || w.createdAt),
 type: 'update',
 read: false,
 link: `/work-requests/${w.id}`,
 });
 }

 // Recent activity feed posts
 for (const p of dataService.getFeed().slice(0, 3)) {
 items.push({
 id: `feed-${p.id}`,
 title: 'New Activity Post',
 message: p.title,
 timestamp: relativeTime(p.createdAt),
 type: 'update',
 read: false,
 link: p.forum ? `/forums/${p.forum.slug}/${p.id}` : '/feed',
 });
 }

 // Recent agent records
 for (const r of dataService.getAgentRecords().slice(0, 2)) {
 items.push({
 id: `rec-${r.id}`,
 title: 'Agent Record',
 message: r.title || r.recordType || 'Record',
 timestamp: relativeTime(r.createdAt),
 type: 'system',
 read: false,
 link: `/agent-records/${r.id}`,
 });
 }

 return items;
}

export const NotificationCenter: React.FC = () => {
 const [notifications, setNotifications] = useState<NotificationItem[]>(() => buildNotifications());
 const [isOpen, setIsOpen] = useState(false);
 const [filter, setFilter] = useState<'all' | 'unread'>('all');
 const dropdownRef = useRef<HTMLDivElement>(null);
 const navigate = useNavigate();

 const unreadCount = notifications.filter((n) => !n.read).length;

 // Handle click outside to close dropdown
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

 const markAsRead = (id: string, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 setNotifications((prev) =>
 prev.map((n) => (n.id === id ? { ...n, read: true } : n))
 );
 };

 const markAllAsRead = () => {
 setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
 };

 const clearNotification = (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setNotifications((prev) => prev.filter((n) => n.id !== id));
 };

 const clearAll = () => {
 setNotifications([]);
 };

 const handleNotificationClick = (item: NotificationItem) => {
 markAsRead(item.id);
 setIsOpen(false);
 navigate(item.link);
 };

 const filteredNotifications = notifications.filter((n) => {
 if (filter === 'unread') return !n.read;
 return true;
 });

 const getTypeIcon = (type: NotificationItem['type']) => {
 switch (type) {
 case 'question':
 return <HelpCircle className="w-4 h-4 text-amber-500" />;
 case 'alert':
 return <AlertTriangle className="w-4 h-4 text-rose-500" />;
 case 'update':
 return <Briefcase className="w-4 h-4 text-indigo-500" />;
 case 'system':
 return <Activity className="w-4 h-4 text-sky-500" />;
 default:
 return <Bell className="w-4 h-4 text-slate-400" />;
 }
 };

 return (
 <div className="relative" ref={dropdownRef}>
 {/* Bell Trigger Button */}
 <button
 onClick={() => setIsOpen((prev) => !prev)}
 className="relative p-1.5 text-slate-500 hover:text-slate-900 :text-white hover:bg-slate-100 :bg-slate-800 rounded-lg border border-transparent hover:border-slate-200 :border-slate-700 transition-all focus:outline-none"
 title="Notifications & Alerts"
 aria-label="Notifications"
 >
 <Bell className="w-4 h-4" />
 {unreadCount > 0 && (
 <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-mono font-bold text-white shadow-xs animate-pulse">
 {unreadCount > 9 ? '9+' : unreadCount}
 </span>
 )}
 </button>

 {/* Popover Dropdown */}
 {isOpen && (
 <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden text-slate-900 transition-all animate-in fade-in zoom-in-95 duration-150">
 {/* Header */}
 <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 ">
 <div className="flex items-center gap-2">
 <h3 className="text-sm font-bold text-slate-900 font-poppins">Notifications</h3>
 {unreadCount > 0 && (
 <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 ">
 {unreadCount} new
 </span>
 )}
 </div>

 <div className="flex items-center gap-1">
 {unreadCount > 0 && (
 <button
 onClick={markAllAsRead}
 className="px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 :bg-indigo-900/30 rounded-md transition-colors flex items-center gap-1"
 title="Mark all as read"
 >
 <CheckCheck className="w-3.5 h-3.5" />
 <span className="hidden sm:inline">Mark all read</span>
 </button>
 )}
 </div>
 </div>

 {/* Filter Bar */}
 <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-sm bg-slate-100/40 ">
 <div className="flex items-center gap-1">
 <button
 onClick={() => setFilter('all')}
 className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
 filter === 'all'
 ? 'bg-white text-slate-900 shadow-xs border border-slate-200 '
 : 'text-slate-500 hover:text-slate-800 :text-slate-200'
 }`}
 >
 All ({notifications.length})
 </button>
 <button
 onClick={() => setFilter('unread')}
 className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
 filter === 'unread'
 ? 'bg-white text-slate-900 shadow-xs border border-slate-200 '
 : 'text-slate-500 hover:text-slate-800 :text-slate-200'
 }`}
 >
 Unread ({unreadCount})
 </button>
 </div>

 {notifications.length > 0 && (
 <button
 onClick={clearAll}
 className="text-[11px] text-slate-400 hover:text-rose-600 :text-rose-400 transition-colors"
 >
 Clear all
 </button>
 )}
 </div>

 {/* List */}
 <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 ">
 {filteredNotifications.length === 0 ? (
 <div className="p-6 text-center text-slate-500 space-y-2">
 <Sparkles className="w-6 h-6 mx-auto text-slate-400 " />
 <p className="text-sm font-semibold text-slate-800 ">No notifications to display</p>
 <p className="text-[11px]">You are all caught up!</p>
 </div>
 ) : (
 filteredNotifications.map((item) => (
 <div
 key={item.id}
 onClick={() => handleNotificationClick(item)}
 className={`group p-3.5 flex items-start gap-3 text-sm cursor-pointer transition-colors ${
 !item.read
 ? 'bg-indigo-50/40 hover:bg-indigo-50/80 :bg-indigo-950/40'
 : 'hover:bg-slate-50 :bg-slate-800/50'
 }`}
 >
 <div className="p-1.5 rounded-lg bg-white border border-slate-200 shrink-0 mt-0.5">
 {getTypeIcon(item.type)}
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-2">
 <h4
 className={`font-semibold truncate ${
 !item.read ? 'text-slate-900 ' : 'text-slate-700 '
 }`}
 >
 {item.title}
 </h4>
 <span className="text-[10px] font-mono text-slate-400 shrink-0">{item.timestamp}</span>
 </div>

 <p className="text-slate-600 text-[11px] leading-relaxed mt-0.5 line-clamp-2">
 {item.message}
 </p>
 </div>

 <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
 {!item.read && (
 <button
 onClick={(e) => markAsRead(item.id, e)}
 className="p-1 text-slate-400 hover:text-indigo-600 :text-indigo-400 hover:bg-slate-200/50 :bg-slate-700 rounded transition-colors"
 title="Mark as read"
 >
 <Check className="w-3.5 h-3.5" />
 </button>
 )}
 <button
 onClick={(e) => clearNotification(item.id, e)}
 className="p-1 text-slate-400 hover:text-rose-600 :text-rose-400 hover:bg-slate-200/50 :bg-slate-700 rounded transition-colors"
 title="Dismiss"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>

 {!item.read && (
 <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 mt-2 group-hover:hidden" />
 )}
 </div>
 ))
 )}
 </div>
 </div>
 )}
 </div>
 );
};
