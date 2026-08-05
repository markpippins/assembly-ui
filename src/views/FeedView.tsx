import React, { useState, useEffect } from 'react';
import { MessageSquare, Trash2, Send, Rss } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { TTSButton } from '../components/TTSButton';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { FeedPost } from '../types';

export const FeedView: React.FC = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const { showToast } = useToast();

  const loadFeed = () => {
    setPosts(dataService.getFeed());
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;
    dataService.createFeedPost({ text: newPostText.trim() });
    setNewPostText('');
    showToast('Feed post published!', 'success');
    loadFeed();
  };

  const handleDeletePost = (id: string) => {
    dataService.deleteFeedPost(id);
    showToast('Feed post removed', 'info');
    loadFeed();
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Activity Feed"
        subtitle="Real-time operational stream, thread updates, and announcements across Assembly"
        ttsContent="Welcome to Assembly Activity Feed. Review updates and publish posts."
      />

      {/* Create Post Input Box */}
      <form onSubmit={handleCreatePost} className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 space-y-3 shadow-sm">
        <div className="flex items-start gap-3">
          <Avatar name="You (Mock)" avatar="Y" size="md" />
          <textarea
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            placeholder="Share an operational update, observation, or question with the team..."
            rows={3}
            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
          />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700/50">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Posts are visible to all workspace contributors</span>
          <button
            type="submit"
            disabled={!newPostText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Post</span>
          </button>
        </div>
      </form>

      {/* Feed List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400 space-y-2 shadow-sm">
            <Rss className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">No activity posts yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Be the first to share an update using the form above.</p>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/70 rounded-xl p-5 space-y-3 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={post.author.name} avatar={post.author.avatar} size="md" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{post.author.name}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{new Date(post.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TTSButton text={`${post.title}. ${post.content}`} label="Read" />
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="Delete post"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-poppins">{post.title}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 whitespace-pre-line leading-relaxed">{post.content}</p>
              </div>

              {post.forum && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <Link
                    to={`/forums/${post.forum.slug}`}
                    className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>In {post.forum.name}</span>
                  </Link>
                  <span>{post.comments} comments</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
