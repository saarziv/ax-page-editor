import { ChevronRight, FileText } from 'lucide-react';
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
      <ul className="divide-y overflow-hidden rounded-lg border bg-background shadow-xs">
        {savedPages.data.map((summary) => (
          <li key={summary.url}>
            <button
              type="button"
              className="group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-accent/60"
              onClick={() => setUrl(summary.url)}
            >
              <FileText className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{summary.url}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatChangeCount(summary.modificationCount)} · saved {formatSavedAgo(summary.updatedAt, now)}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 group-hover:text-primary" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
