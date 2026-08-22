import React from 'react';
import { statusMeta } from '../types';

// ── Thread status indicator ─────────────────────────────────────────
// Two visual variants for the colored thread-status indicator:
//   'bar' — thin full-width strip along the top edge of a card (list scans)
//   'led' — small dot (bottom-right area of a card, or inline in headers)
// The default 'Posted' state renders nothing in bar mode so unstatused
// cards stay visually quiet; pass showDefault to force a visible bar.

export const StatusIndicator: React.FC<{
  status?: number | null;
  variant?: 'bar' | 'led';
  showDefault?: boolean;
}> = ({ status, variant = 'bar', showDefault = false }) => {
  const meta = statusMeta(status);
  if (!showDefault && (status ?? 0) === 0) return null;

  if (variant === 'bar') {
    return (
      <span
        aria-label={`Status: ${meta.label}`}
        title={`Status: ${meta.label}`}
        className={`absolute inset-x-0 top-0 h-[3px] ${meta.color} opacity-90`}
      />
    );
  }

  return (
    <span
      aria-label={`Status: ${meta.label}`}
      title={`Status: ${meta.label}`}
      className={`inline-block w-2.5 h-2.5 rounded-full ${meta.color} shadow-sm ring-2 ring-white/70 dark:ring-slate-800`}
    />
  );
};
