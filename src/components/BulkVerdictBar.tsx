import React from 'react';
import { splitSegments } from './InteractiveMarkdown';

/**
 * BulkVerdictBar — bulk affordance for promotion-gate decision-card threads
 * (to-do d9ac7608). Renders above the card list when a thread body contains
 * multiple choice blocks.
 *
 * - "Approve all as mapped": selects the Requirement radio on every card
 *   whose current selection isn't Strike (per-item overrides remain editable
 *   pre-submit; unmapped items are non-promotable downstream by design).
 * - "Strike selected": arm mode exposes per-card chips (short ids parsed
 *   from `**Card \`id\`**` headers); applying selects the Strike radio on
 *   chosen cards.
 *
 * State manipulation goes through the SAME onRadio handler the individual
 * radios use, so the single "Submit selection" reply stays WYSIWYG-faithful
 * and stage-3's section-scoped parser sees one Agreed-selection block.
 */

export interface BulkTarget {
 blockIdx: number;
 /** Short candidate id parsed from the card header, if present. */
 shortId?: string;
}

export interface BulkVerdictBarProps {
 threadBody: string;
 sourceId: string;
 disabled?: boolean;
 onRadio: (sourceId: string, blockIdx: number, itemIdx: number) => void;
}

function extractTargets(body: string): BulkTarget[] {
 return splitSegments(body)
 .filter((s): s is Extract<typeof s, { type: 'choices'; blockIdx: number }> => s.type === 'choices')
 .map((seg) => {
 const m = seg.header?.match(/Card `([0-9a-f]{8})`/i);
 return { blockIdx: seg.blockIdx, shortId: m ? m[1].toLowerCase() : undefined };
 });
}

function radioIndexFor(items: { text: string }[], prefix: 'requirement' | 'sandbox' | 'strike'): number {
 return items.findIndex((it) => it.text.trim().toLowerCase().startsWith(prefix));
}

export const BulkVerdictBar: React.FC<BulkVerdictBarProps> = ({
 threadBody,
 sourceId,
 disabled = false,
 onRadio,
}) => {
 const targets = React.useMemo(() => extractTargets(threadBody), [threadBody]);
 const [strikeArmed, setStrikeArmed] = React.useState(false);
 const [strikeSet, setStrikeSet] = React.useState<Set<number>>(new Set());
 const [note, setNote] = React.useState<string>('');

 if (targets.length < 2 || disabled) return null;

 const segments = splitSegments(threadBody);
 const choiceSegs = segments.filter(
 (s): s is Extract<typeof s, { type: 'choices'; blockIdx: number }> => s.type === 'choices',
 );

 const approveAll = () => {
 let applied = 0;
 let skippedStruck = 0;
 for (const seg of choiceSegs) {
 const reqIdx = radioIndexFor(seg.items, 'requirement');
 if (reqIdx < 0) continue;
 const strikeIdx = radioIndexFor(seg.items, 'strike');
 const cur = seg.items.findIndex((i) => i.initiallySelected);
 if (cur === strikeIdx && strikeIdx >= 0) {
 skippedStruck++;
 continue;
 }
 onRadio(sourceId, seg.blockIdx, reqIdx);
 applied++;
 }
 setNote(`Requirement selected on ${applied} card(s)${skippedStruck ? ` · ${skippedStruck} struck card(s) untouched` : ''}`);
 };

 const applyStrikes = () => {
 let n = 0;
 for (const blockIdx of strikeSet) {
 const seg = choiceSegs.find((s) => s.blockIdx === blockIdx);
 if (!seg) continue;
 const idx = radioIndexFor(seg.items, 'strike');
 if (idx >= 0) {
 onRadio(sourceId, blockIdx, idx);
 n++;
 }
 }
 setNote(`Strike selected on ${n} card(s)`);
 setStrikeSet(new Set());
 setStrikeArmed(false);
 };

 const btn =
 'px-2.5 py-1 rounded text-xs font-medium border transition-colors disabled:opacity-50';
 const idle =
 'border-steel-200 bg-white text-steel-800 hover:bg-gray-50 dark:bg-steel-900/40';

 return (
 <div className="mb-2 rounded border border-steel-200 bg-gray-50 px-2.5 py-2 dark:border-steel-700 dark:bg-steel-900/30">
 <div className="flex flex-wrap items-center gap-2">
 <span className="text-[11px] font-semibold uppercase tracking-wide text-steel-500">
 Bulk verdict ({targets.length} cards)
 </span>
 <button type="button" disabled={disabled} onClick={approveAll}
 className={`${btn} ${idle}`}>
 Approve all as mapped
 </button>
 <button
 type="button"
 disabled={disabled}
 onClick={() => {
 setStrikeArmed((v) => !v);
 setStrikeSet(new Set());
 }}
 className={`${btn} ${strikeArmed ? 'border-red-300 bg-red-50 text-red-700' : idle}`}
 >
 {strikeArmed ? 'Cancel strike selection' : 'Strike selected…'}
 </button>
 {strikeArmed && (
 <button
 type="button"
 disabled={disabled || strikeSet.size === 0}
 onClick={applyStrikes}
 className={`${btn} border-red-400 bg-red-600 text-white hover:bg-red-700`}
 >
 Apply strike ({strikeSet.size})
 </button>
 )}
 {note && <span className="text-xs text-steel-500">{note}</span>}
 </div>
 {strikeArmed && (
 <div className="mt-2 flex flex-wrap gap-1.5">
 {targets.map((t) => {
 const on = strikeSet.has(t.blockIdx);
 return (
 <button
 key={t.blockIdx}
 type="button"
 onClick={() =>
 setStrikeSet((prev) => {
 const next = new Set(prev);
 if (next.has(t.blockIdx)) next.delete(t.blockIdx);
 else next.add(t.blockIdx);
 return next;
 })
 }
 className={`rounded-full px-2 py-0.5 text-[11px] font-mono border ${
 on
 ? 'bg-red-600 border-red-600 text-white'
 : 'bg-white border-steel-200 text-steel-700 hover:bg-gray-50'
 }`}
 title={t.shortId ?? `card block #${t.blockIdx}`}
 >
 {t.shortId ?? `#${t.blockIdx}`}
 </button>
 );
 })}
 </div>
 )}
 </div>
 );
};
