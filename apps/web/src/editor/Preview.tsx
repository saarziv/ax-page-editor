import type { MouseEvent } from 'react';
import { usePageTree } from '@/state/queries';
import { useEditorStore } from '@/state/store';
import { PreviewNode } from './PreviewNode';

export function Preview({ url }: { url: string }) {
  const pageTreeQuery = usePageTree(url);
  const select = useEditorStore((state) => state.select);

  // One handler for the whole page: closest() walks up from the exact element clicked,
  // so the innermost selectable element wins (a link inside a paragraph selects the link).
  function handleClick(event: MouseEvent<HTMLElement>) {
    if (!(event.target instanceof Element)) return;
    const clickedNodeId = event.target.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId;
    if (clickedNodeId) select(clickedNodeId);
  }

  return (
    <section aria-label="Preview" className="min-w-0 flex-1 overflow-auto p-6">
      {pageTreeQuery.isPending && <p className="text-muted-foreground">Loading…</p>}
      {pageTreeQuery.isError && (
        <p role="alert" className="text-destructive">
          {pageTreeQuery.error.message}
        </p>
      )}
      {pageTreeQuery.isSuccess && (
        <>
          <div className="mb-4 border-b pb-3">
            <h1 className="text-sm font-medium">{pageTreeQuery.data.title}</h1>
            <p className="text-xs text-muted-foreground">{pageTreeQuery.data.url}</p>
          </div>
          <div className="max-w-3xl" onClick={handleClick}>
            <PreviewNode node={pageTreeQuery.data.root} />
          </div>
        </>
      )}
    </section>
  );
}
