import React from 'react';
import MarkdownRenderer, { renderInlineMarkdown } from './MarkdownRenderer';

/**
 * Interactive markdown — renders markdown exactly like <MarkdownRenderer> but
 * treats task-list blocks (- [ ] / - [x]) as interactive checkboxes bound to
 * caller-provided state. Used where a human picks a subset of agent-proposed
 * items (the Assembly analogue of the CLI's ask_user checkbox groups).
 *
 * Selection state keys are `${sourceId}:${blockIdx}:${itemIdx}` — stable across
 * re-renders because splitSegments only counts task blocks.
 */

export interface TaskItem {
  text: string;
  initiallyChecked: boolean;
}

export type Segment =
  | { type: 'markdown'; content: string }
  | { type: 'tasks'; blockIdx: number; items: TaskItem[] };

const TASK_LINE_RE = /^\s*[-*]\s+\[([ xX])\][ \t]*(.*)$/;

export function splitSegments(content: string): Segment[] {
  if (!content) return [];
  const blocks = content.split(/\n\s*\n/);
  const segments: Segment[] = [];
  let taskBlockIdx = 0;
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length > 0 && lines.every((l) => TASK_LINE_RE.test(l))) {
      segments.push({
        type: 'tasks',
        blockIdx: taskBlockIdx++,
        items: lines.map((l) => {
          const m = l.match(TASK_LINE_RE)!;
          return { text: m[2], initiallyChecked: m[1].toLowerCase() === 'x' };
        }),
      });
    } else {
      segments.push({ type: 'markdown', content: block });
    }
  }
  return segments;
}

/**
 * Build the reply body for a submitted agreement: re-emits the source's task
 * blocks prefixed with an "Agreed selection:" header so agents can parse the
 * outcome as plain markdown.
 *
 * WYSIWYG rule (deliberate — do not "fix"): the reply mirrors the final visual
 * state of the list. Items the user never toggled keep their initiallyChecked
 * marker ([x] stays [x], [ ] stays [ ]); only toggled items flip. This keeps
 * the reply identical to what the user saw when they hit submit.
 */
export function buildSelectionBody(
  content: string,
  sourceId: string,
  checkedMap: Record<string, boolean>,
): string {
  const segments = splitSegments(content);
  const parts: string[] = ['**Agreed selection:**', ''];
  for (const seg of segments) {
    if (seg.type === 'tasks') {
      seg.items.forEach((item, j) => {
        const key = `${sourceId}:${seg.blockIdx}:${j}`;
        const checked = checkedMap[key] ?? item.initiallyChecked;
        parts.push(`- [${checked ? 'x' : ' '}] ${item.text}`);
      });
      parts.push('');
    }
  }
  return parts.join('\n').trimEnd();
}

interface InteractiveMarkdownProps {
  content: string;
  /** Stable identity for selection state keys (comment id, or 'thread'). */
  sourceId: string;
  /** checkedMap keyed `${sourceId}:${blockIdx}:${itemIdx}`. */
  checkedMap: Record<string, boolean>;
  onToggle: (sourceId: string, blockIdx: number, itemIdx: number, checked: boolean) => void;
  /** Freeze the checkboxes (e.g. after an agreement has been submitted). */
  disabled?: boolean;
}

// Note: the post-submit freeze is client-side only — a page reload resets
// `submittedFor` and unfreezes the list. The durable agreement reply in the
// thread remains the source of truth; the freeze is purely cosmetic.

export const InteractiveMarkdown: React.FC<InteractiveMarkdownProps> = ({
  content,
  sourceId,
  checkedMap,
  onToggle,
  disabled = false,
}) => {
  const segments = React.useMemo(() => splitSegments(content), [content]);

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'markdown' ? (
          <MarkdownRenderer key={i} content={seg.content} />
        ) : (
          <div key={i} className="task-list space-y-0.5 my-1.5">
            {seg.items.map((item, j) => {
              const key = `${sourceId}:${seg.blockIdx}:${j}`;
              const checked = checkedMap[key] ?? item.initiallyChecked;
              return (
                <label
                  key={j}
                  className={`flex items-start gap-2 rounded px-1.5 py-1 transition-colors select-none ${
                    disabled
                      ? 'cursor-default opacity-70'
                      : checked
                        ? 'bg-primary-50 dark:bg-primary-900/20 cursor-pointer'
                        : 'hover:bg-gray-50 dark:hover:bg-steel-800/60 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3.5 w-3.5 accent-primary-600"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => onToggle(sourceId, seg.blockIdx, j, e.target.checked)}
                  />
                  <span
                    className={`text-sm ${checked ? 'text-gray-400 dark:text-steel-500 line-through' : 'text-gray-800 dark:text-steel-100'}`}
                    dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(item.text) }}
                  />
                </label>
              );
            })}
          </div>
        ),
      )}
    </>
  );
};

export default InteractiveMarkdown;
