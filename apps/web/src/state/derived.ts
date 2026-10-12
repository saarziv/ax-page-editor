import { useShallow } from 'zustand/react/shallow';
import { matchesTarget, type Modification, type PageNode } from '@ax/core';
import { useEditorStore } from './store';

/** The draft modifications that really belong to this node: same selector and same text snippet, never a guess. */
export function useNodeModifications(node: PageNode): Modification[] {
  // useShallow compares the filtered list item by item, so a new array with the same modifications doesn't re-render.
  return useEditorStore(useShallow((state) => state.modificationsDraft.filter((modification) => matchesTarget(node, modification.target))));
}
