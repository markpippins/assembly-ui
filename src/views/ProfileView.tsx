import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User as UserIcon, Mail, Calendar, ShieldCheck, ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { dataService } from '../services/dataService';
import { User } from '../types';

export const ProfileView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (id) {
      const u = dataService.getUser(id);
      if (u) setUser(u);
    }
  }, [id]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-8 text-center text-slate-400">
        <p>User profile not found</p>
        <Link to="/feed" className="text-xs text-indigo-400 hover:underline mt-2 inline-block">
          Return to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/feed" className="hover:text-indigo-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Feed</span>
        </Link>
        <span>/</span>
        <span className="text-white font-mono">{user.name}</span>
      </div>

      <PageHeader
        title="User Profile"
        subtitle="Assembly workspace contributor details and preferences"
      />

      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl p-6 space-y-6 shadow-sm text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-700/60 pb-5">
          <Avatar name={user.name} email={user.email} avatar={user.avatar} size="xl" showStatus={true} />
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-poppins">{user.name}</h2>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">Contributor ID: {user.id}</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center gap-3 text-slate-200">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>{user.email || 'No public email provided'}</span>
          </div>

          <div className="flex items-center gap-3 text-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Member since {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="flex items-center gap-3 text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Status: Active Assembly Contributor (Mock Mode)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
