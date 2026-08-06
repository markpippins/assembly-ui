/**
 * Shared date formatting helpers for assembly-ui.
 *
 * `formatDateTime` renders the full date + time of a post/record (matching the
 * Angular app's `toLocaleString()` behavior on feed/forum/thread/spec-detail
 * views) so cards show exactly when something happened, not just the day.
 */
export function formatDateTime(date: string | number | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
