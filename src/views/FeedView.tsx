import React, { useState, useEffect } from 'react';
import { MessageSquare, Trash2, Send, Rss } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { TTSButton } from '../components/TTSButton';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { dataService } from '../services/dataService';
import { formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { FeedPost } from '../types';

export const FeedView: React.FC = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Angular parity: clicking a post card with a forum carries you to the thread
  // detail (e.g. a sysadmin post -> /forums/syslog/:postId), not the forum list.
  const handlePostClick = (post: FeedPost) => {
    if (post.forum) navigate(`/forums/${post.forum.slug}/${post.id}`);
  };

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
      <form onSubmit={handleCreatePost} className="app-panel p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar name="You (Mock)" avatar="Y" size="md" />
          <div className="flex-1 space-y-1.5">
            <label
              htmlFor="feed-post-text"
              className="sr-only"
            >
              Share an operational update
            </label>
            <textarea
              id="feed-post-text"
              name="feed-post-text"
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            placeholder="Share an operational update, observation, or question with the team..."
            rows={3}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
            />
          </div>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700/50">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Posts are visible to all workspace contributors</span>
          <button
            type="submit"
            disabled={!newPostText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Post</span>
          </button>
        </div>
      </form>

      {/* Feed List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div              className="app-panel p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <Rss className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">No activity posts yet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Be the first to share an update using the form above.</p>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              onClick={() => handlePostClick(post)}
              onKeyDown={(e) => {
                if (post.forum && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handlePostClick(post);
                }
              }}
              role={post.forum ? 'link' : undefined}
              tabIndex={post.forum ? 0 : undefined}
              className={`app-panel p-4 space-y-3 hover:shadow-soft transition-all duration-150 ${
                post.forum ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2' : ''
              }`}
              title={post.forum ? `Open thread: ${post.title}` : undefined}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={post.author.name} avatar={post.author.avatar} size="md" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{post.author.name}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatDateTime(post.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TTSButton text={`${post.title}. ${post.content}`} label="Read" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePost(post.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="Delete post"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-poppins">{post.title}</h2>
                <div className="mt-1.5 line-clamp-3">
                  <MarkdownRenderer content={post.content} />
                </div>
              </div>

              {post.forum && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                  <Link
                    to={`/forums/${post.forum.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>In {post.forum.name}</span>
                  </Link>
                  <Link
                    to={`/forums/${post.forum.slug}/${post.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <span>{post.comments} comments</span>
                  </Link>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
