import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessagesSquare, ChevronRight, User, Bot, Code } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { TTSButton } from '../components/TTSButton';
import { dataService } from '../services/dataService';
import { formatDateTime } from '../utils/format';
import { ConversationSnapshot, ConversationBlock } from '../types';

export const ConversationsView: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<ConversationBlock[]>([]);

  useEffect(() => {
    const list = dataService.getConversations();
    setConversations(list);
    if (list.length > 0) {
      setSelectedSnapshotId(list[0].id);
      setBlocks(dataService.getConversationBlocks(list[0].id));
    }
  }, []);

  const handleSelectSnapshot = (id: string) => {
    setSelectedSnapshotId(id);
    setBlocks(dataService.getConversationBlocks(id));
  };

  const selectedConv = conversations.find((c) => c.id === selectedSnapshotId);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Conversation Snapshots"
        subtitle="Nebula service conversation history, turn segments, and segmented blocks"
        ttsContent="Conversation snapshots and turn breakdown."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: List of snapshots */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Snapshots</h2>
          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectSnapshot(conv.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedSnapshotId === conv.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-slate-900 dark:text-white shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-sm font-mono mb-1">
                  <span className="font-bold text-indigo-600 dark:text-indigo-300">Idx #{conv.snapshotIndex}</span>
                  <span className="text-slate-400">{conv.blockCount} blocks</span>
                </div>
                <h3 className="text-sm font-bold font-poppins text-slate-900 dark:text-white line-clamp-1">
                  {conv.sourceFilename || conv.id}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  Created by {conv.createdBy || 'User'} · {conv.captureMode || '—'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                  {formatDateTime(conv.createdAt)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: Conversation Blocks Viewer */}
        <div className="md:col-span-2 space-y-4">
          {selectedConv && (
            <div className="app-panel p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white font-poppins">
                    <Link to={`/conversations/${selectedConv.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{selectedConv.sourceFilename || selectedConv.id}</Link>
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono">Snapshot Hash: {selectedConv.sourceHash}</p>
                </div>
                <TTSButton
                  text={blocks.map((b) => `${b.role}: ${b.contentMd}`).join('. ')}
                  label="Read Conversation"
                />
              </div>

              {/* Blocks */}
              <div className="space-y-4">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className={`p-4 rounded-xl border space-y-2 ${
                      block.role === 'user'
                        ? 'bg-slate-900/80 border-slate-700 text-slate-100'
                        : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-700/40 pb-2">
                      <div className="flex items-center gap-2">
                        {block.role === 'user' ? (
                          <User className="w-3.5 h-3.5 text-sky-400" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span className="font-bold uppercase tracking-wider">{block.role || 'System'}</span>
                        <span className="text-slate-500">({block.blockType})</span>
                      </div>
                      <span className="text-slate-400">Idx #{block.blockIndex}</span>
                    </div>

                    <div className="text-sm leading-relaxed whitespace-pre-line font-sans">
                      {block.contentMd}
                    </div>

                    {block.domPath && (
                      <div className="pt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Code className="w-3 h-3 text-slate-500" />
                        <span>DOM Path: {block.domPath}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
