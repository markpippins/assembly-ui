import React from 'react';
import MarkdownRenderer, { renderInlineMarkdown } from './MarkdownRenderer';

/**
 * Interactive markdown — renders markdown exactly like <MarkdownRenderer> but
 * treats choice blocks as interactive decision cards bound to caller-provided
 * state. Used where a human picks from agent-proposed options (the Assembly
 * analogue of the CLI's ask_user contract).
 *
 * Two interactive modes (the decision-card vocabulary, Part 1):
 * - tasks (multi-select checkboxes): `- [ ] item` / `- [x] item`
 * - choices (single-select radio): `- ( ) item` / `- (x) item`
 *
 * Either mode also supports an "Other" escape hatch: a choice line whose text
 * starts with "Other" (case-insensitive) reveals a free-text field once
 * checked/selected; the typed value becomes part of the submitted reply as
 * `Other: <text>` so agents can parse it deterministically.
 *
 * Selection state keys:
 * - checkbox: `${sourceId}:${blockIdx}:${itemIdx}` -> boolean
 * - radio: `${sourceId}:${blockIdx}` -> selected itemIdx
 * - other: `other:${sourceId}:${blockIdx}:${itemIdx}` -> free text
 * Stable across re-renders because splitSegments only counts choice blocks.
 */

export interface TaskItem {
 text: string;
 initiallyChecked: boolean;
}

export interface ChoiceItem {
 text: string;
 initiallySelected: boolean;
}

export type Segment =
 | { type: 'markdown'; content: string }
 | { type: 'tasks'; blockIdx: number; items: TaskItem[] }
 | { type: 'choices'; blockIdx: number; items: ChoiceItem[]; header?: string };

const TASK_LINE_RE = /^\s*[-*]\s+\[([ xX])\][ \t]*(.*)$/;
const CHOICE_LINE_RE = /^\s*[-*]\s+\(([ xX])\)[ \t]*(.*)$/;

/** An "Other" escape-hatch item — label starts with "Other" (case-insensitive). */
export function isOtherItem(text: string): boolean {
 const t = text.trim();
 return /^other[\s:.,;!-]|^other$/i.test(t);
}

export function splitSegments(content: string): Segment[] {
 if (!content) return [];
 const blocks = content.split(/\n\s*\n/);
 const segments: Segment[] = [];
 let blockIdx = 0;
 for (const block of blocks) {
 const lines = block.split('\n').filter((l) => l.trim().length > 0);
 if (lines.length === 0) {
 segments.push({ type: 'markdown', content: block });
 continue;
 }
 if (lines.every((l) => TASK_LINE_RE.test(l))) {
 segments.push({
 type: 'tasks',
 blockIdx: blockIdx++,
 items: lines.map((l) => {
 const m = l.match(TASK_LINE_RE)!;
 return { text: m[2], initiallyChecked: m[1].toLowerCase() === 'x' };
 }),
 });
 } else if (lines.every((l) => CHOICE_LINE_RE.test(l))) {
 segments.push({
 type: 'choices',
 blockIdx: blockIdx++,
 items: lines.map((l) => {
 const m = l.match(CHOICE_LINE_RE)!;
 return { text: m[2], initiallySelected: m[1].toLowerCase() === 'x' };
 }),
 });
 } else {
 // Card-with-header support (promotion-gate batch format): a block whose
 // leading line(s) are bold card headers followed by ALL radio-choice
 // lines is one decision card — the header renders above the radios.
 // Without this, the header line poisons the block into plain markdown
 // and the operator sees raw parens instead of usable cards.
 const firstChoice = lines.findIndex((l) => CHOICE_LINE_RE.test(l));
 const headLines = firstChoice > 0 ? lines.slice(0, firstChoice) : [];
 const restAllChoices =
 firstChoice > 0 && lines.slice(firstChoice).every((l) => CHOICE_LINE_RE.test(l));
 const headersOk =
 headLines.length > 0 &&
 headLines.length <= 2 &&
 headLines.every((l) => /^\*\*.+\*\*/.test(l.trim()));
 if (restAllChoices && headersOk) {
 segments.push({
 type: 'choices',
 blockIdx: blockIdx++,
 header: headLines.join(' '),
 items: lines.slice(firstChoice).map((l) => {
 const m = l.match(CHOICE_LINE_RE)!;
 return { text: m[2], initiallySelected: m[1].toLowerCase() === 'x' };
 }),
 });
 } else {
 segments.push({ type: 'markdown', content: block });
 }
 }
 }
 return segments;
}

/** Effective item label — appends typed "Other" text when present. */
function itemLabel(text: string, typed: string | undefined): string {
 if (isOtherItem(text) && typed) return `Other: ${typed}`;
 return text;
}

/**
 * Build the reply body for a submitted agreement: re-emits the source's choice
 * blocks prefixed with an "Agreed selection:" header so agents can parse the
 * outcome as plain markdown.
 *
 * WYSIWYG rule (deliberate — do not "fix"): the reply mirrors the final visual
 * state of the list. Untouched items keep their original marker ([ ]/[x],
 * ( )/(x)); only toggled/selected items flip. Typed "Other" text is appended
 * to the item label as `Other: <value>`.
 */
export function buildSelectionBody(
 content: string,
 sourceId: string,
 checkedMap: Record<string, boolean>,
 radioMap: Record<string, number> = {},
 otherMap: Record<string, string> = {},
): string {
 const segments = splitSegments(content);
 const parts: string[] = ['**Agreed selection:**', ''];
 for (const seg of segments) {
 if (seg.type === 'tasks') {
 seg.items.forEach((item, j) => {
 const key = `${sourceId}:${seg.blockIdx}:${j}`;
 const checked = checkedMap[key] ?? item.initiallyChecked;
 const label = itemLabel(item.text, otherMap[`other:${key}`]);
 parts.push(`- [${checked ? 'x' : ' '}] ${label}`);
 });
 parts.push('');
 } else if (seg.type === 'choices') {
 const blockKey = `${sourceId}:${seg.blockIdx}`;
 const initialIdx = seg.items.findIndex((i) => i.initiallySelected);
 const selected = radioMap[blockKey] ?? (initialIdx >= 0 ? initialIdx : -1);
 seg.items.forEach((item, j) => {
 const key = `${sourceId}:${seg.blockIdx}:${j}`;
 const label = itemLabel(item.text, otherMap[`other:${key}`]);
 parts.push(`- ${j === selected ? '(x)' : '( )'} ${label}`);
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
 /** checkedMap keyed `${sourceId}:${blockIdx}:${itemIdx}` (checkbox mode). */
 checkedMap: Record<string, boolean>;
 onToggle: (sourceId: string, blockIdx: number, itemIdx: number, checked: boolean) => void;
 /** radioMap keyed `${sourceId}:${blockIdx}` -> selected itemIdx (single-choice mode). */
 radioMap?: Record<string, number>;
 onRadio?: (sourceId: string, blockIdx: number, itemIdx: number) => void;
 /** otherMap keyed `other:${sourceId}:${blockIdx}:${itemIdx}` -> free text. */
 otherMap?: Record<string, string>;
 onOtherChange?: (sourceId: string, blockIdx: number, itemIdx: number, value: string) => void;
 /** Freeze the cards (e.g. after an agreement has been submitted). */
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
 radioMap,
 onRadio,
 otherMap,
 onOtherChange,
 disabled = false,
}) => {
 const segments = React.useMemo(() => splitSegments(content), [content]);

 const renderOtherInput = (
 blockIdx: number,
 itemIdx: number,
 enabled: boolean,
 ) => {
 if (!enabled || !onOtherChange) return null;
 const key = `other:${sourceId}:${blockIdx}:${itemIdx}`;
 const value = otherMap?.[key] ?? '';
 return (
 <input
 type="text"
 value={value}
 disabled={disabled}
 onChange={(e) => onOtherChange(sourceId, blockIdx, itemIdx, e.target.value)}
 placeholder="Type your own answer…"
 className="mt-1 ml-6 w-full max-w-xs rounded border border-steel-200 bg-white px-2 py-1 text-xs text-steel-900 placeholder-steel-400 focus:outline-none focus:border-primary-500"
 />
 );
 };

 return (
 <>
 {segments.map((seg, i) => {
 if (seg.type === 'markdown') {
 return <MarkdownRenderer key={i} content={seg.content} />;
 }
 if (seg.type === 'tasks') {
 return (
 <div key={i} className="task-list space-y-0.5 my-1.5">
 {seg.items.map((item, j) => {
 const key = `${sourceId}:${seg.blockIdx}:${j}`;
 const checked = checkedMap[key] ?? item.initiallyChecked;
 const isOther = isOtherItem(item.text);
 const label = itemLabel(item.text, otherMap?.[`other:${key}`]);
 return (
 <div key={j}>
 <label
 className={`flex items-start gap-2 rounded px-1.5 py-1 transition-colors select-none ${
 disabled
 ? 'cursor-default opacity-70'
 : checked
 ? 'bg-primary-50 cursor-pointer'
 : 'hover:bg-gray-50 :bg-steel-800/60 cursor-pointer'
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
 className={`text-sm ${checked ? 'text-gray-400 line-through' : 'text-gray-800 '}`}
 dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(label) }}
 />
 </label>
 {isOther && renderOtherInput(seg.blockIdx, j, checked)}
 </div>
 );
 })}
 </div>
 );
 }
 // choices — radio (single-choice) mode
 const blockKey = `${sourceId}:${seg.blockIdx}`;
 const initialIdx = seg.items.findIndex((item) => item.initiallySelected);
 const selected = radioMap?.[blockKey] ?? (initialIdx >= 0 ? initialIdx : -1);
 return (
 <div key={i} role="radiogroup" className="choice-list space-y-0.5 my-1.5" aria-label={`Decision ${seg.blockIdx + 1}`}>
 {'header' in seg && seg.header && (
 <MarkdownRenderer content={seg.header} />
 )}
 {seg.items.map((item, j) => {
 const key = `${sourceId}:${seg.blockIdx}:${j}`;
 const isSelected = selected === j;
 const isOther = isOtherItem(item.text);
 const label = itemLabel(item.text, otherMap?.[`other:${key}`]);
 return (
 <div key={j}>
 <label
 className={`flex items-start gap-2 rounded px-1.5 py-1 transition-colors select-none ${
 disabled
 ? 'cursor-default opacity-70'
 : isSelected
 ? 'bg-primary-50 cursor-pointer'
 : 'hover:bg-gray-50 :bg-steel-800/60 cursor-pointer'
 }`}
 >
 <input
 type="radio"
 name={`dc-${sourceId}-${seg.blockIdx}`}
 className="mt-0.5 h-3.5 w-3.5 accent-primary-600"
 checked={isSelected}
 disabled={disabled}
 onChange={() => onRadio?.(sourceId, seg.blockIdx, j)}
 />
 <span
 className={`text-sm ${isSelected ? 'text-gray-800 font-medium' : 'text-gray-800 '}`}
 dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(label) }}
 />
 </label>
 {isOther && renderOtherInput(seg.blockIdx, j, isSelected)}
 </div>
 );
 })}
 </div>
 );
 })}
 </>
 );
};

export default InteractiveMarkdown;