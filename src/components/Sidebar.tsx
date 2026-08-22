import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Rss, MessageSquare, HelpCircle, CheckSquare, ListOrdered,
  FileCheck, Shield, Users, Sprout, Eye, BarChart3, Bot, FileCode,
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
      items: [
        { label: 'Search', path: '/search', icon: SearchIcon },
      ],
    },
    {
      items: [
        { label: 'Feed', path: '/feed', icon: Rss, badge: counts.posts },
        { label: 'Forums', path: '/forums', icon: MessageSquare, badge: counts.forums },
        { label: 'To Do', path: '/todo', icon: CheckSquare, badge: counts.toDoThreads },
      ],
    },
    {
      items: [
        { label: 'Harvests', path: '/harvests', icon: Sprout, badge: counts.harvests },
        { label: 'Candidates', path: '/candidates', icon: Users, badge: counts.candidates },
        { label: 'Requirements', path: '/requirements', icon: CheckSquare, badge: counts.requirements },
        { label: 'Specifications', path: '/specifications', icon: FileCheck, badge: counts.specifications },
        { label: 'Plans', path: '/plans', icon: ListOrdered, badge: counts.plans },
        { label: 'Work Requests', path: '/work-requests', icon: Shield, badge: counts.workRequests },
      ],
    },
    {
      items: [
        { label: 'Questions', path: '/open-questions', icon: HelpCircle, badge: counts.openQuestions },
        { label: 'Answers', path: '/resolutions', icon: CheckCircle2 },
      ],
    },
    {
      items: [
        { label: 'Observations', path: '/observations', icon: Eye, badge: counts.observations },
        { label: 'Assessments', path: '/assessments', icon: BarChart3, badge: counts.assessments },
      ],
    },
    {
      items: [
        { label: 'Agent Records', path: '/agent-records', icon: Bot, badge: counts.agentRecords },
        { label: 'Reports', path: '/reports', icon: BarChart3 },
      ],
    },
    {
      items: [
        { label: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-60 bg-[#0f172a] text-slate-400 border-r border-slate-800 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto shrink-0 py-3 px-2 transition-colors">
      <div className="space-y-1">
        {sections.map((section, sIdx) => (
          <React.Fragment key={sIdx}>
            {sIdx > 0 && <div className="border-t border-slate-800/60 my-1.5 mx-2" />}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0 opacity-70" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-slate-800 text-indigo-300">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </React.Fragment>
        ))}

        {recentlyViewed.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800/60">
            <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Recently Viewed</span>
              <Clock className="w-3 h-3 text-indigo-400" />
            </h3>
            <div className="mt-1 space-y-0.5">
              {recentlyViewed.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-1.5 rounded text-sm font-medium transition-colors group ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`
                  }
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 shrink-opacity-60 group-hover:opacity-100" />
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
