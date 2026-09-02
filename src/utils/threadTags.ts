// ── Thread title tag parsing (shared) ──────────────────────────────
// Forum threads are often machine-titled with a leading [TAG] prefix
// (e.g. `[SQ BLOCKER] typescript:S2077 — ...`, `[engineer] ...`,
// `[github] ...`). These helpers parse the prefix for badges/filters so
// bot-populated forums (sonar, jenkins, github, to-do) render scannably.

export interface ThreadTag {
  /** Raw tag text inside the brackets, e.g. "SQ BLOCKER". */
  tag: string;
  /** Short badge label (severity for SQ tags, raw tag otherwise). */
  badge: string;
  /** Tailwind chip classes for the badge. */
  cls: string;
  /** Character length of the `[TAG] ` prefix, for stripping from titles. */
  stripLen: number;
}

export const SQ_COLORS: Record<string, string> = {
  BLOCKER: 'bg-rose-100 text-rose-700 ring-rose-300',
  CRITICAL: 'bg-orange-100 text-orange-700 ring-orange-300',
  'MAJOR+': 'bg-amber-100 text-amber-700 ring-amber-300',
  MINOR: 'bg-sky-100 text-sky-700 ring-sky-300',
  INFO: 'bg-slate-100 text-slate-600 ring-slate-300',
  HOTSPOT: 'bg-violet-100 text-violet-700 ring-violet-300',
};

export function titleTag(title: string): ThreadTag | null {
  const m = title.match(/^\[([^\]]+)\]\s*/);
  if (!m) return null;
  const tag = m[1];
  if (tag.startsWith('SQ ')) {
    const sev = tag.slice(3);
    if (SQ_COLORS[sev]) {
      return { tag, badge: sev, cls: SQ_COLORS[sev], stripLen: m[0].length };
    }
  }
  // Generic role/forum tags ([engineer], [github], [planner], ...).
  return { tag, badge: tag, cls: 'bg-indigo-50 text-indigo-600 ring-indigo-200', stripLen: m[0].length };
}

/** Title with the `[TAG] ` prefix removed, for display. */
export function stripTag(title: string): string {
  const tg = titleTag(title);
  return tg ? title.slice(tg.stripLen) : title;
}

/** Extract the sonar finding key from a thread body (`Sonar key: <key>`). */
export function sonarKeyOf(body: string): string | null {
  const m = (body || '').match(/Sonar key:\s*(\S+)/);
  return m ? m[1] : null;
}

/** Extract the grouped rule key from a thread body (`Rule family: <key>`). */
export function ruleFamilyOf(body: string): string | null {
  const m = (body || '').match(/Rule family:\s*(\S+)/);
  return m ? m[1] : null;
}