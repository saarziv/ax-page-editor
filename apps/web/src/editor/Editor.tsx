import { useEffect } from 'react';
import { useConfig, usePageTree } from '@/state/queries';
import { useEditorStore } from '@/state/store';
import { Inspector } from './Inspector';
import { Preview } from './Preview';
import { TopBar } from './TopBar';

export function Editor({ url }: { url: string }) {
  const select = useEditorStore((state) => state.select);
  const pageTreeQuery = usePageTree(url);
  // The tree's url is the normalized key Save stores under, so the configuration is always looked up by that key.
  const pageUrl = pageTreeQuery.data?.url;
  const configQuery = useConfig(pageUrl);
  const restoredPageUrl = useEditorStore((state) => state.restoredPageUrl);
  const loadSavedModifications = useEditorStore((state) => state.loadSavedModifications);
  const isRestored = pageUrl !== undefined && restoredPageUrl === pageUrl;

  // Once per opened page: restoredPageUrl stops a second render (StrictMode, or the same data delivered again)
  // from filling the draft again and wiping the edits made since.
  useEffect(() => {
    if (pageUrl === undefined || !configQuery.isSuccess || restoredPageUrl === pageUrl) return;
    loadSavedModifications(pageUrl, configQuery.data?.modifications ?? []);
  }, [pageUrl, configQuery.isSuccess, configQuery.data, restoredPageUrl, loadSavedModifications]);

  // On window, not the preview: the preview can't take focus, so a key press there would never reach it.
  useEffect(() => {
    function clearSelectionOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') select(null);
    }
    window.addEventListener('keydown', clearSelectionOnEscape);
    return () => window.removeEventListener('keydown', clearSelectionOnEscape);
  }, [select]);

  return (
    <div className="flex h-screen flex-col">
      <TopBar url={url} />
      <div className="flex min-h-0 flex-1">
        {/* A page is never drawn without its saved changes. A page that failed to load shows its own error in the preview. */}
        {isRestored || pageTreeQuery.isError ? (
          <>
            <Preview url={url} />
            <Inspector url={url} />
          </>
        ) : (
          <p className="p-6 text-muted-foreground">Loading…</p>
        )}
      </div>
    </div>
  );
}
