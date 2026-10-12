import { findNodePath } from '@ax/core';
import { usePageTree } from '@/state/queries';
import { useEditorStore } from '@/state/store';
import { ElementDetails } from './ElementDetails';
import { PageChanges } from './PageChanges';

export function Inspector({ url }: { url: string }) {
  // Same query as the preview, so the tree comes from the cache with no second request.
  const pageTreeQuery = usePageTree(url);
  const selectedId = useEditorStore((state) => state.selectedId);
  const selectedPath = pageTreeQuery.data && selectedId ? findNodePath(pageTreeQuery.data.root, selectedId) : null;
  const selectedNode = selectedPath?.at(-1);

  return (
    <aside aria-label="Inspector" className="flex w-72 shrink-0 flex-col overflow-y-auto border-l bg-sidebar p-4">
      {pageTreeQuery.data && selectedPath && selectedNode ? (
        <ElementDetails key={selectedNode.id} path={selectedPath} node={selectedNode} pageUrl={pageTreeQuery.data.url} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Click an element in the preview to inspect it.</p>
          <PageChanges />
        </>
      )}
    </aside>
  );
}
