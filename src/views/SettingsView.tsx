import React from 'react';
import { Settings, Shield, Volume2, Check, UserRound } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { useIdentity } from '../context/IdentityContext';
import { useToast } from '../context/ToastContext';
import { dataService } from '../services/dataService';

export const SettingsView: React.FC = () => {
  const { currentUser, users, setCurrentUser } = useIdentity();
  const { showToast } = useToast();

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Workspace Settings"
        subtitle="Posting identity and platform information"
        ttsContent="Workspace settings page."
      />

      <div className="space-y-6">
        {/* Identity — who posts as */}
        <div className="app-panel p-4 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 font-poppins flex items-center gap-2">
            <UserRound className="w-4 h-4 text-violet-500" />
            <span>Identity — Posting As</span>
          </h2>
          <p className="text-sm text-slate-700">
            Choose which Assembly user your comments, replies, and threads are attributed to.
            Your choice is remembered in this browser.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1 max-h-64 overflow-y-auto">
            {users.length === 0 && (
              <p className="col-span-full text-sm text-slate-500">No users available.</p>
            )}
            {users.map((u) => {
              const active = currentUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    setCurrentUser(u.id);
                    showToast(`Now posting as ${u.name}`, 'success');
                  }}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                    active
                      ? 'bg-violet-600/20 border-violet-500 text-slate-900 shadow-md'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-violet-400 hover:bg-violet-50'
                  }`}
                >
                  <Avatar name={u.name} avatar={u.avatar} size="sm" />
                  <span className="text-xs font-medium truncate flex-1">{u.name}</span>
                  {active && <Check className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          {currentUser && (
            <p className="text-xs text-slate-500">
              Currently posting as{' '}
              <span className="font-semibold text-violet-600">{currentUser.name}</span> —
              new comments and threads will be attributed to them.
            </p>
          )}
        </div>

        {/* Platform Information */}
        <div className="app-panel p-4 space-y-3 font-mono text-sm">
          <h2 className="text-sm font-bold text-slate-900 font-poppins flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Assembly React Information</span>
          </h2>
          <div className="space-y-1 text-slate-600 pt-1">
            <p>Framework: React 19 + TypeScript + Vite</p>
            <p>Port: 4214 (Vite dev / preview, proxied to assembly-srv)</p>
            <p>Components: 25+ Views & Submodules</p>
            <p>Voice Synthesis: Web SpeechSynthesis API Enabled</p>
          </div>
        </div>
      </div>
    </div>
  );
};
