import React from 'react';
import { Settings, RefreshCw, Sun, Moon, Shield, Volume2, Check, UserRound } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { useTheme } from '../context/ThemeContext';
import { useIdentity } from '../context/IdentityContext';
import { useToast } from '../context/ToastContext';
import { dataService } from '../services/dataService';

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { currentUser, users, setCurrentUser } = useIdentity();
  const { showToast } = useToast();

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all Assembly local workspace data to default seed data?')) {
      dataService.resetToDefault();
      showToast('Workspace data reset to defaults. Reloading page...', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Workspace Settings"
        subtitle="Theme configuration, local runtime state management, and accessibility options"
        ttsContent="Workspace settings page."
      />

      <div className="space-y-6">
        {/* Appearance Section */}
        <div className="app-panel p-4 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white font-poppins flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Appearance & Theme</span>
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">Choose your visual aesthetic theme for Assembly.</p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => {
                setTheme('steel');
                showToast('Theme set to Steel', 'success');
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                theme === 'steel'
                  ? 'bg-indigo-600/20 border-indigo-500 text-slate-900 dark:text-white shadow-md'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="font-bold text-sm block mb-1">Steel Theme (Default)</span>
              <span className="text-[11px] text-slate-400 block">Sophisticated slate gray palette with indigo accents.</span>
            </button>

            <button
              onClick={() => {
                setTheme('dark');
                showToast('Theme set to Dark', 'success');
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                theme === 'dark'
                  ? 'bg-indigo-600/20 border-indigo-500 text-slate-900 dark:text-white shadow-md'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="font-bold text-sm block mb-1">Deep Dark</span>
              <span className="text-[11px] text-slate-400 block">High contrast midnight dark background.</span>
            </button>

            <button
              onClick={() => {
                setTheme('light');
                showToast('Theme set to Light', 'success');
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                theme === 'light'
                  ? 'bg-indigo-600/20 border-indigo-500 text-slate-900 dark:text-white shadow-md'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="font-bold text-sm block mb-1">Light Theme</span>
              <span className="text-[11px] text-slate-400 block">Clean high-contrast light layout.</span>
            </button>
          </div>
        </div>

        {/* Identity — who posts as */}
        <div className="app-panel p-4 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white font-poppins flex items-center gap-2">
            <UserRound className="w-4 h-4 text-violet-500" />
            <span>Identity — Posting As</span>
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Choose which Assembly user your comments, replies, and threads are attributed to.
            Your choice is remembered in this browser.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1 max-h-64 overflow-y-auto">
            {users.length === 0 && (
              <p className="col-span-full text-sm text-slate-500 dark:text-slate-400">No users available.</p>
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
                      ? 'bg-violet-600/20 border-violet-500 text-slate-900 dark:text-white shadow-md'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-slate-800'
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
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Currently posting as{' '}
              <span className="font-semibold text-violet-600 dark:text-violet-400">{currentUser.name}</span> —
              new comments and threads will be attributed to them.
            </p>
          )}
        </div>

        {/* Runtime State Reset */}
        <div className="app-panel p-4 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white font-poppins flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-sky-400" />
            <span>Local State & Data Reset</span>
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Assembly stores interactive mock data in your browser's local storage so state updates persist seamlessly across navigation.
          </p>

          <div className="pt-2">
            <button
              onClick={handleResetData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-sm font-semibold rounded-lg transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset State to Default Seed Data</span>
            </button>
          </div>
        </div>

        {/* Platform Information */}
        <div className="app-panel p-4 space-y-3 font-mono text-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white font-poppins flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Assembly React Information</span>
          </h2>
          <div className="space-y-1 text-slate-600 dark:text-slate-300 pt-1">
            <p>Framework: React 19 + TypeScript + Vite</p>
            <p>Port: 3000 (Cloud Run Container binding 0.0.0.0)</p>
            <p>Components: 25+ Views & Submodules</p>
            <p>Voice Synthesis: Web SpeechSynthesis API Enabled</p>
          </div>
        </div>
      </div>
    </div>
  );
};
