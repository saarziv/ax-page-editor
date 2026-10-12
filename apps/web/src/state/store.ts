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
  setContext: (target: Target, note: string) => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
  url: null,
  modificationsDraft: [],
  selectedId: null,
  // Node ids and modifications belong to one page, so opening another page clears both (loading saved configs comes in 04).
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
  // Called on every keystroke: adds the note, then replaces it in place, and clearing the box removes it.
  // So an element can never get two notes (K10). The note is kept as typed, not trimmed, so a space being typed isn't eaten.
  setContext: (target, note) =>
    set(({ modificationsDraft }) => {
      if (note.trim() === '') {
        return { modificationsDraft: modificationsDraft.filter((modification) => !isContextOf(modification, target)) };
      }

      const hasContext = modificationsDraft.some((modification) => isContextOf(modification, target));
      if (hasContext) {
        // Same id and same position, so the changes lists don't jump while the publisher types.
        const withNewNote = modificationsDraft.map((modification) =>
          isContextOf(modification, target) ? { ...modification, note } : modification,
        );
        return { modificationsDraft: withNewNote };
      }

      const newContext: Modification = { id: crypto.randomUUID(), type: 'context', target, note };
      return { modificationsDraft: [...modificationsDraft, newContext] };
    }),
}));

/** True when this modification is a hide on exactly this target (same selector and same text). */
function isHideOf(modification: Modification, target: Target): boolean {
  return modification.type === 'hide' && isSameTarget(modification.target, target);
}

/** True when this modification is a context note on exactly this target. */
function isContextOf(modification: Modification, target: Target): boolean {
  return modification.type === 'context' && isSameTarget(modification.target, target);
}

function isSameTarget(first: Target, second: Target): boolean {
  return first.selector === second.selector && first.text === second.text;
}
