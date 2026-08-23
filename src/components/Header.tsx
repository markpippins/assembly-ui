import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Volume2, Cpu, Settings as SettingsIcon } from 'lucide-react';
import { useTTS } from '../context/TTSContext';
import { useIdentity } from '../context/IdentityContext';
import { Avatar } from './Avatar';
import { NotificationCenter } from './NotificationCenter';
import { RecentlyViewedDropdown } from './RecentlyViewedDropdown';

interface HeaderProps {
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { isPlaying, stop } = useTTS();
  const { currentUser } = useIdentity();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onOpenSearch) {
      onOpenSearch();
    } else if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full h-14 flex border-b border-slate-200 backdrop-blur-md transition-colors">
      {/* Dark blue brand area — matches sidebar */}
      <div className="w-60 shrink-0 bg-[#0f172a] flex items-center px-4 gap-2.5 border-r border-slate-800">
        <Link to="/feed" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-poppins font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              Assembly
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v2.0
              </span>
            </span>
          </div>
        </Link>
      </div>

      {/* White content area */}
      <div className="relative flex-1 flex items-center bg-white/90 backdrop-blur-md px-4 gap-4">
        {/* Global Search Trigger Bar — absolutely centered in the header so the
            brand box and the right-edge controls never shift it */}
        <div
          onClick={onOpenSearch}
          className="absolute left-1/2 -translate-x-1/2 w-full max-w-xl cursor-pointer group"
        >
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
          <div className="w-full h-9 pl-9 pr-3 text-sm bg-slate-100/90 border border-slate-200 rounded-lg text-slate-400 flex items-center justify-between transition-all group-hover:border-indigo-500/50 group-hover:ring-2 group-hover:ring-indigo-500/10">
            <span className="truncate">Search work requests, requirements, agendas, questions...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 rounded-md shadow-xs shrink-0">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Controls & User Profile — pinned to the right edge; without
            ml-auto the free space past search's max-w-xl collects here
            instead, bunching everything against the brand box. */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {isPlaying && (
            <button
              onClick={stop}
              className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium bg-rose-50 border border-rose-200 text-rose-700 rounded-lg animate-pulse"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>TTS Active</span>
            </button>
          )}

          {/* Notification Center */}
          <NotificationCenter />

          {/* Recently Viewed Dropdown */}
          <RecentlyViewedDropdown />

          {/* Settings button */}
          <Link
            to="/settings"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all"
            title="Workspace Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </Link>

          {/* Identity — posting as */}
          <Link
            to={`/profile/${currentUser?.id ?? '9abe1316-312e-4a2f-96ad-88c4b86c7b1e'}`}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 group"
            title={`Posting as ${currentUser?.name ?? 'User Contributor'}`}
          >
            <Avatar name={currentUser?.name ?? 'User Contributor'} email={currentUser?.email ?? undefined} size="sm" showStatus={true} />
            <span className="hidden lg:inline text-xs font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">
              {currentUser?.name ?? 'Profile'}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};
