const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// numeric: 'auto' turns "1 day ago" into "yesterday".
const relativeTimeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "just now", "5 minutes ago", "2 hours ago", "yesterday". Takes `now` so tests don't depend on the clock. */
export function formatSavedAgo(updatedAt: string, now: Date): string {
  const elapsedMs = now.getTime() - new Date(updatedAt).getTime();
  if (elapsedMs < MINUTE_MS) return 'just now';
  if (elapsedMs < HOUR_MS) return relativeTimeFormat.format(-Math.floor(elapsedMs / MINUTE_MS), 'minute');
  if (elapsedMs < DAY_MS) return relativeTimeFormat.format(-Math.floor(elapsedMs / HOUR_MS), 'hour');
  return relativeTimeFormat.format(-Math.floor(elapsedMs / DAY_MS), 'day');
}

export function formatChangeCount(modificationCount: number): string {
  return modificationCount === 1 ? '1 change' : `${modificationCount} changes`;
}
