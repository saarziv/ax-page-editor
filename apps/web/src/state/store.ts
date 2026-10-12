import { create } from 'zustand';
import type { Modification, Target } from '@ax/core';

// Draft + UI state only. Server data lives in TanStack Query, derived values are never stored.
interface EditorState {
  url: string | null;
  modificationsDraft: Modification[];
  selectedId: string | null;
  setUrl: (url: string | null) => void;
  select: (id: string | null) => void;
  toggleHide: (target: Target) => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
  url: null,
  modificationsDraft: [],
  selectedId: null,
  // Node ids and modifications belong to one page, so opening another page clears both (loading saved configs comes in 05).
  setUrl: (url) => set({ url, selectedId: null, modificationsDraft: [] }),
  select: (id) => set({ selectedId: id }),
  // A switch, not an "add": the first call hides the element, the next one un-hides it.
  // So an element can never get two hides, and the caller never has to check first.
  toggleHide: (target) =>
    set(({ modificationsDraft }) => {
      const isAlreadyHidden = modificationsDraft.some((modification) => isHideOf(modification, target));

      if (isAlreadyHidden) {
        const withoutThisHide = modificationsDraft.filter((modification) => !isHideOf(modification, target));
        return { modificationsDraft: withoutThisHide };
      }

      const newHide: Modification = { id: crypto.randomUUID(), type: 'hide', target };
      return { modificationsDraft: [...modificationsDraft, newHide] };
    }),
}));

/** True when this modification is a hide on exactly this target (same selector and same text). */
function isHideOf(modification: Modification, target: Target): boolean {
  return modification.type === 'hide' && modification.target.selector === target.selector && modification.target.text === target.text;
}
