import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { markModificationsInTree, matchesTarget, type Marked, type Modification, type PageNode } from '@ax/core';
import { usePageTree } from './queries';
import { useEditorStore } from './store';

/** The draft modifications that really belong to this node: same selector and same text snippet, never a guess. */
export function useNodeModifications(node: PageNode): Modification[] {
  // useShallow compares the filtered list item by item, so a new array with the same modifications doesn't re-render.
  return useEditorStore(useShallow((state) => state.modificationsDraft.filter((modification) => matchesTarget(node, modification.target))));
}

/** The page with `modificationsDraft` applied, or null until the page has loaded. */
export function useMarkedPage(url: string): Marked | null {
  const pageTree = usePageTree(url).data;
  const modificationsDraft = useEditorStore((state) => state.modificationsDraft);
  // Recomputed only when the page or the draft changes, never on hover or selection.
  return useMemo(() => (pageTree ? markModificationsInTree(pageTree.root, modificationsDraft) : null), [pageTree, modificationsDraft]);
}
