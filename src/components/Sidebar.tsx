import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Rss, MessageSquare, HelpCircle, MessagesSquare, CheckSquare, ListOrdered,
  FileCheck, Shield, Users, Sprout, GitBranch, Eye, BarChart3, Bot, FileCode,
  Calendar, CheckCircle2, Settings, Search as SearchIcon, Clock, FileText
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { Counts } from '../types';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';

export const Sidebar: React.FC = () => {
  const { recentlyViewed } = useRecentlyViewed();
  const [counts, setCounts] = useState<Counts>({
    forums: 0,
    posts: 0,
    threads: 0,
    toDoThreads: 0,
    comments: 0,
    workRequests: 0,
    requirements: 0,
    agendas: 0,
    candidates: 0,
    harvests: 0,
    openQuestions: 0,
    intents: 0,
    assessments: 0,
    observations: 0,
    agentRecords: 0,
    specifications: 0,
    plans: 0,
  });

  useEffect(() => {
    const update = () => setCounts(dataService.getCounts());
    update();
    const timer = setInterval(update, 3000);
    return () => clearInterval(timer);
  }, []);

  const sections = [
    {
      title: 'Communication',
      items: [
        { label: 'Feed', path: '/feed', icon: Rss, badge: counts.posts },
        { label: 'Forums', path: '/forums', icon: MessageSquare, badge: counts.forums },
        { label: 'To Do', path: '/todo', icon: CheckSquare, badge: counts.toDoThreads },
        { label: 'Open Questions', path: '/open-questions', icon: HelpCircle, badge: counts.openQuestions },
        { label: 'Resolutions', path: '/resolutions', icon: CheckCircle2 },
        { label: 'Conversations', path: '/conversations', icon: MessagesSquare },
      ],
    },
    {
      title: 'Requirements & Specs',
      items: [
        { label: 'Requirements', path: '/requirements', icon: CheckSquare, badge: counts.requirements },
        { label: 'Agendas', path: '/agendas', icon: Calendar, badge: counts.agendas },
        { label: 'Plans', path: '/plans', icon: ListOrdered, badge: counts.plans },
        { label: 'Specifications', path: '/specifications', icon: FileCheck, badge: counts.specifications },
        { label: 'Specs', path: '/specs', icon: FileCode },
      ],
    },
    {
      title: 'Work & Harvests',
      items: [
        { label: 'Work Requests', path: '/work-requests', icon: Shield, badge: counts.workRequests },
        { label: 'Candidates', path: '/candidates', icon: Users, badge: counts.candidates },
        { label: 'Harvests', path: '/harvests', icon: Sprout, badge: counts.harvests },
        { label: 'Intents', path: '/intents', icon: GitBranch, badge: counts.intents },
      ],
    },
    {
      title: 'Intelligence & Logs',
      items: [
        { label: 'Observations', path: '/observations', icon: Eye, badge: counts.observations },
        { label: 'Assessments', path: '/assessments', icon: BarChart3, badge: counts.assessments },
        { label: 'Agent Records', path: '/agent-records', icon: Bot, badge: counts.agentRecords },
        { label: 'Reports', path: '/reports', icon: BarChart3 },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Search', path: '/search', icon: SearchIcon },
        { label: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-100/70 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto shrink-0 py-4 px-3 transition-colors">
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
              {section.title}
            </h3>
            <div className="mt-1 space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0 opacity-80" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-indigo-300 border border-slate-300/80 dark:border-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        {recentlyViewed.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="px-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Recently Viewed</span>
              <Clock className="w-3 h-3 text-indigo-500" />
            </h3>
            <div className="mt-1 space-y-0.5">
              {recentlyViewed.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-medium transition-colors group ${
                      isActive
                        ? 'bg-indigo-600/90 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                    <span className="truncate">{item.title}</span>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );

};
