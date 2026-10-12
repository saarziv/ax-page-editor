import type { MouseEvent } from 'react';
import { useMarkedPage } from '@/state/derived';
import { usePageTree } from '@/state/queries';
import { useEditorStore } from '@/state/store';
import { HiddenLayer } from './HiddenLayer';
import { HoverLayer } from './HoverLayer';
import { PreviewNode } from './PreviewNode';

export function Preview({ url }: { url: string }) {
  const pageTreeQuery = usePageTree(url);
  const markedPage = useMarkedPage(url);
  const select = useEditorStore((state) => state.select);

  // One handler for the whole preview: closest() walks up from the exact element clicked,
  // so the innermost selectable element wins (a link inside a paragraph selects the link).
  // A click on a "Context for AI" callout selects the element the note explains.
  // A click that no selectable element covers is a click on empty space, and clears the selection.
  function handleClick(event: MouseEvent<HTMLElement>) {
    if (!(event.target instanceof Element)) return;
    const clickedElement = event.target.closest<HTMLElement>('[data-node-id], [data-context-for]');
    select(clickedElement?.dataset.nodeId ?? clickedElement?.dataset.contextFor ?? null);
  }

  return (
    <section aria-label="Preview" className="min-w-0 flex-1 overflow-auto p-6" onClick={handleClick}>
      {pageTreeQuery.isError && (
        <p role="alert" className="text-destructive">
          {pageTreeQuery.error.message}
        </p>
      )}
      {pageTreeQuery.isSuccess && markedPage && (
        <>
          <div className="mb-4 border-b pb-3">
            <h1 className="text-sm font-medium">{pageTreeQuery.data.title}</h1>
            <p className="text-xs text-muted-foreground">{pageTreeQuery.data.url}</p>
          </div>
          <div className="max-w-3xl">
            <HoverLayer root={markedPage.tree}>
              <PreviewNode node={markedPage.tree} />
              <HiddenLayer markedRoot={markedPage.tree} />
            </HoverLayer>
          </div>
        </>
      )}
    </section>
  );
}
