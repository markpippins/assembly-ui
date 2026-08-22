import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User as UserIcon, Mail, Calendar, ShieldCheck, ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import { User, FeedPost } from '../types';

export const ProfileView: React.FC = () => {
 const { version } = useLiveData();
 const { id } = useParams<{ id: string }>();
 const [user, setUser] = useState<User | null>(null);
 const [posts, setPosts] = useState<FeedPost[]>([]);

 useEffect(() => {
 if (id) {
 const u = dataService.getUser(id);
 if (u) setUser(u);
 setPosts(dataService.getFeed().filter((p) => p.author.id === id));
 }
 }, [id, version]);

 if (!user) {
 return (
 <div className="max-w-4xl mx-auto py-8 text-center text-slate-400">
 <p>User profile not found</p>
 <Link to="/feed" className="text-sm text-indigo-400 hover:underline mt-2 inline-block">
 Return to Feed
 </Link>
 </div>
 );
 }

 return (
 <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
 <div className="flex items-center gap-2 text-sm text-slate-500 ">
 <Link to="/feed" className="hover:text-indigo-400 flex items-center gap-1">
 <ArrowLeft className="w-3.5 h-3.5" />
 <span>Feed</span>
 </Link>
 <span>/</span>
 <span className="text-slate-900 font-mono">{user.name}</span>
 </div>

 <PageHeader
 title="User Profile"
 subtitle="Assembly workspace contributor details and preferences"
 />

 <div className="app-panel p-4 space-y-6">
 <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
 <Avatar name={user.name} email={user.email ?? undefined} avatar={user.avatar} size="xl" showStatus={true} />
 <div>
 <h2 className="text-lg font-bold text-slate-900 font-poppins">{user.name}</h2>
 <p className="text-sm text-indigo-600 font-mono">Contributor ID: <Link to={`/profile/${user.id}`} className="text-indigo-600 hover:underline">{user.id}</Link></p>
 </div>
 </div>

 <div className="space-y-4 text-sm">
 <div className="flex items-center gap-3 text-slate-700 ">
 <Mail className="w-4 h-4 text-slate-400" />
 <span>{user.email || 'No public email provided'}</span>
 </div>

 <div className="flex items-center gap-3 text-slate-700 ">
 <Calendar className="w-4 h-4 text-slate-400" />
 <span>Member since {new Date(user.createdAt).toLocaleDateString()}</span>
 </div>

 <div className="flex items-center gap-3 text-slate-700 ">
 <ShieldCheck className="w-4 h-4 text-emerald-600 " />
 <span>Status: Active Assembly Contributor</span>
 </div>
 </div>
 </div>

 {/* User posts (markdown) — parity with the Angular profile view */}
 <div className="space-y-3">
 <h2 className="text-sm font-semibold text-gray-900 ">Posts ({posts.length})</h2>
 {posts.length === 0 ? (
 <div className="app-panel p-4 text-center text-sm text-gray-400 ">
 <p className="font-medium text-gray-600 ">No posts</p>
 <p className="mt-1">This user has not published any posts yet.</p>
 </div>
 ) : (
 posts.map((post) => (
 <div key={post.id} className="app-panel p-4 space-y-2">
 {post.title && <h3 className="text-sm font-medium text-gray-900 ">{post.title}</h3>}
 <MarkdownRenderer content={post.content} />
 <div className="text-[11px] text-gray-400 ">
 {formatDateTime(post.createdAt)}
 {post.forum && (
 <Link to={`/forums/${post.forum.slug}`} className="ml-2 text-primary-600 hover:underline">
 in {post.forum.name}
 </Link>
 )}
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 );
};
