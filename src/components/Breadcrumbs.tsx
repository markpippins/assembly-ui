import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_NAME_MAP: Record<string, string> = {
  feed: 'Activity Feed',
  'work-requests': 'Work Requests',
  'open-questions': 'Open Questions',
  forums: 'Forums & Discussions',
  todo: 'To Do',
  requirements: 'Requirements Catalog',
  agendas: 'Agendas & Planning',
  candidates: 'Candidates & Proposals',
  harvests: 'Harvested Intelligence',
  conversations: 'Conversations',
  resolutions: 'Resolutions',
  intents: 'Intents',
  assessments: 'Assessments',
  observations: 'Observations',
  'agent-records': 'Agent Execution Records',
  reports: 'Status Reports',
  specifications: 'Specifications',
  plans: 'Execution Plans',
  specs: 'Specifications',
  settings: 'Workspace Settings',
  search: 'Search Results',
  profile: 'User Profile',
};

function formatSegmentLabel(segment: string): string {
  if (ROUTE_NAME_MAP[segment]) {
    return ROUTE_NAME_MAP[segment];
  }

  // Check if it's a UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return `ID: ${segment.slice(0, 8)}...`;
  }

  // Check if it's a slug like general-discussions
  if (segment.includes('-')) {
    return segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Standard string capitalization
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // If on root, don't show or show just workspace
  if (pathnames.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="px-6 py-2.5 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800/60 flex items-center text-sm text-slate-500 dark:text-slate-400 font-medium overflow-x-auto whitespace-nowrap"
    >
      <ol className="inline-flex items-center space-x-1.5 md:space-x-2">
        <li className="inline-flex items-center">
          <Link
            to="/feed"
            className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Workspace</span>
          </Link>
        </li>

        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const label = formatSegmentLabel(value);

          return (
            <li key={to} className="inline-flex items-center">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 mx-0.5 shrink-0" />
              {isLast ? (
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {label}
                </span>
              ) : (
                <Link
                  to={to}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[150px]"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
