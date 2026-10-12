import { useSavedPages } from '@/state/queries';
import { useEditorStore } from '@/state/store';
import { formatChangeCount, formatSavedAgo } from './savedPageLabels';

export function SavedPages() {
  const setUrl = useEditorStore((state) => state.setUrl);
  const savedPages = useSavedPages();

  // A failed list never blocks the rest of the start screen (spec, Edge cases).
  if (savedPages.isError) {
    return (
      <section aria-label="Saved pages" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Saved pages</h2>
        <p className="rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">
          Saved pages couldn't be loaded.
        </p>
      </section>
    );
  }
  if (!savedPages.data || savedPages.data.length === 0) return null;

  const now = new Date();
  return (
    <section aria-label="Saved pages" className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Saved pages</h2>
      <ul className="divide-y overflow-hidden rounded-lg border bg-background">
        {savedPages.data.map((summary) => (
          <li key={summary.url}>
            <button
              type="button"
              className="w-full cursor-pointer px-4 py-3 text-left hover:bg-muted"
              onClick={() => setUrl(summary.url)}
            >
              <span className="block truncate text-sm font-medium">{summary.url}</span>
              <span className="block text-xs text-muted-foreground">
                {formatChangeCount(summary.modificationCount)} · saved {formatSavedAgo(summary.updatedAt, now)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
