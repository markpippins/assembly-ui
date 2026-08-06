import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  FileText,
  MessageSquare,
  HelpCircle,
  Briefcase,
  Layers,
  Settings,
  User,
  Rss,
  ArrowRight,
  CornerDownLeft,
  Command,
  Sliders,
  ClipboardList,
  Compass,
  FileCode,
  Activity,
  AlertTriangle,
  Folder,
  Sparkles
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { SearchResult } from '../types';

interface NavRoute {
  title: string;
  description: string;
  href: string;
  category: string;
  icon: React.ElementType;
}

const NAVIGATION_ROUTES: NavRoute[] = [
  { title: 'Activity Feed', description: 'Recent updates, announcements, and team posts', href: '/feed', category: 'Navigation', icon: Rss },
  { title: 'Work Requests', description: 'Catalog of active tasks, bug reports, and features', href: '/work-requests', category: 'Navigation', icon: Briefcase },
  { title: 'Open Questions', description: 'Blockers and design trade-offs awaiting decision', href: '/open-questions', category: 'Navigation', icon: HelpCircle },
  { title: 'Forums & Discussions', description: 'Team discussion categories and threads', href: '/forums', category: 'Navigation', icon: MessageSquare },
  { title: 'Requirements', description: 'Functional and non-functional requirements catalog', href: '/requirements', category: 'Navigation', icon: ClipboardList },
  { title: 'Agendas & Sprints', description: 'Sprint goals, milestones, and planning agendas', href: '/agendas', category: 'Navigation', icon: Compass },
  { title: 'Candidates & Proposals', description: 'Proposed solutions and architectural options', href: '/candidates', category: 'Navigation', icon: Layers },
  { title: 'Agent Records', description: 'Execution logs, telemetry, and agent outputs', href: '/agent-records', category: 'Navigation', icon: Activity },
  { title: 'Specifications', description: 'Technical specifications and architectural docs', href: '/specifications', category: 'Navigation', icon: FileCode },
  { title: 'Execution Plans', description: 'Step-by-step rollout plans and procedures', href: '/plans', category: 'Navigation', icon: Folder },
  { title: 'Workspace Settings', description: 'Configure workspace preferences and integrations', href: '/settings', category: 'Navigation', icon: Settings },
  { title: 'User Profile', description: 'Your profile details and assigned items', href: '/profile/9abe1316-312e-4a2f-96ad-88c4b86c7b1e', category: 'Navigation', icon: User },
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle global shortcuts to open/close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled outside if triggered, or we can toggle if needed
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter routes
  const matchingRoutes = NAVIGATION_ROUTES.filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase()) ||
    r.description.toLowerCase().includes(query.toLowerCase()) ||
    r.category.toLowerCase().includes(query.toLowerCase())
  );

  // Search entities using dataService
  const entityResults: SearchResult[] = query.trim() ? dataService.searchAll(query.trim()) : [];

  // Combine items for unified keyboard navigation
  const combinedItems = [
    ...matchingRoutes.map((r) => ({
      id: r.href,
      title: r.title,
      description: r.description,
      type: 'Navigation',
      href: r.href,
      icon: r.icon,
    })),
    ...entityResults.map((e) => ({
      id: `${e.type}-${e.id}`,
      title: e.title,
      description: e.description,
      type: e.type,
      href: e.href,
      status: e.status,
      icon: getEntityIcon(e.type),
    })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (combinedItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % combinedItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + combinedItems.length) % combinedItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedItem = combinedItems[selectedIndex];
      if (selectedItem) {
        navigate(selectedItem.href);
        onClose();
      }
    }
  };

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-16 px-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-slate-900 dark:text-slate-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Header */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mr-3" />
          <label htmlFor="search-modal-input" className="sr-only">Search</label>
          <input
            ref={inputRef}
            id="search-modal-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search entities, work requests, questions..."
            className="w-full bg-transparent text-sm md:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={resultsRef} className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/50">
          {combinedItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 animate-pulse" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No matching routes or entities</p>
              <p className="text-sm">Try searching for terms like "Work Request", "Forum", "Bug", or "Question".</p>
            </div>
          ) : (
            <div>
              {/* Category: Navigation Routes if present */}
              {matchingRoutes.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Quick Navigation
                  </div>
                  {matchingRoutes.map((route, idx) => {
                    const isSelected = selectedIndex === idx;
                    const IconComponent = route.icon;
                    return (
                      <div
                        key={route.href}
                        onClick={() => {
                          navigate(route.href);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-medium shadow-sm'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${
                              isSelected
                                ? 'bg-indigo-500/30 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="font-semibold">{route.title}</div>
                            <div className={`text-[11px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                              {route.description}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-indigo-700 text-white'
                                : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Jump
                          </span>
                          <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Category: Search Entity Results */}
              {entityResults.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Matching Entities & Records</span>
                    <span className="text-[10px] font-normal text-slate-400">{entityResults.length} found</span>
                  </div>
                  {entityResults.map((item, idx) => {
                    const globalIdx = matchingRoutes.length + idx;
                    const isSelected = selectedIndex === globalIdx;
                    const IconComponent = getEntityIcon(item.type);

                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => {
                          navigate(item.href);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-medium shadow-sm'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${
                              isSelected
                                ? 'bg-indigo-500/30 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="font-semibold flex items-center gap-2">
                              <span>{item.title}</span>
                              {item.status && (
                                <span
                                  className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                                    isSelected
                                      ? 'bg-indigo-700 text-white'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {item.status}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <div className={`text-[11px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                              isSelected
                                ? 'bg-indigo-700 border-indigo-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.type}
                          </span>
                          <CornerDownLeft className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800/90 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-xs text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-xs text-[10px]">
                ↓
              </kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-xs text-[10px]">
                ↵
              </kbd>
              <span>to select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-xs text-[10px]">
                esc
              </kbd>
              <span>to close</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
            <Command className="w-3 h-3" />
            <span>Assembly Workspace</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function getEntityIcon(type: string): React.ElementType {
  switch (type.toLowerCase()) {
    case 'thread':
    case 'forum':
      return MessageSquare;
    case 'work request':
      return Briefcase;
    case 'requirement':
      return ClipboardList;
    case 'agenda':
      return Compass;
    case 'candidate':
      return Layers;
    case 'open question':
      return HelpCircle;
    case 'agent record':
      return Activity;
    case 'plan':
      return Folder;
    default:
      return FileText;
  }
}
