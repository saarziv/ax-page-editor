import { create } from 'zustand';
import type { Modification, Target } from '@ax/core';

// Draft + UI state only. Server data lives in TanStack Query, derived values are never stored.
interface EditorState {
  url: string | null;
  modificationsDraft: Modification[];
  // The last saved draft as JSON, compared with modificationsDraft to derive the dirty flag.
  savedJson: string;
  // The page whose saved configuration the draft was filled from, so the fill happens once per opened page.
  restoredPageUrl: string | null;
  selectedId: string | null;
  setUrl: (url: string | null) => void;
  loadSavedModifications: (pageUrl: string, savedModifications: Modification[]) => void;
  select: (id: string | null) => void;
  toggleHide: (target: Target) => void;
  toggleForward: (target: Target, href: string) => void;
  setContext: (target: Target, note: string) => void;
  removeModification: (modificationId: string) => void;
  markSaved: (savedModifications: Modification[]) => void;
}

const NOTHING_SAVED_JSON = JSON.stringify([]);

export const useEditorStore = create<EditorState>()((set) => ({
  url: null,
  modificationsDraft: [],
  savedJson: NOTHING_SAVED_JSON,
  restoredPageUrl: null,
  selectedId: null,
  // Node ids and modifications belong to one page, so opening a page clears both, and clearing restoredPageUrl
  // makes even the same page restore its saved configuration fresh.
  setUrl: (url) => set({ url, selectedId: null, modificationsDraft: [], savedJson: NOTHING_SAVED_JSON, restoredPageUrl: null }),
  // Fills the draft and the saved copy together, so the page opens with its changes and nothing unsaved.
  loadSavedModifications: (pageUrl, savedModifications) =>
    set({ modificationsDraft: savedModifications, savedJson: JSON.stringify(savedModifications), restoredPageUrl: pageUrl }),
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
  // Same switch as toggleHide, so a link can never get two forwards. Only the href is stored, never the page content (K8).
  toggleForward: (target, href) =>
    set(({ modificationsDraft }) => {
      const isAlreadyForwarded = modificationsDraft.some((modification) => isForwardOf(modification, target));

      if (isAlreadyForwarded) {
        return { modificationsDraft: modificationsDraft.filter((modification) => !isForwardOf(modification, target)) };
      }

      const newForward: Modification = { id: crypto.randomUUID(), type: 'forward', target, href };
      return { modificationsDraft: [...modificationsDraft, newForward] };
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
  // By id, not by target: ids are unique within a configuration, so a remove can never take another change with it.
  // savedJson stays as it was, so the removal shows as unsaved until the next save.
  removeModification: (modificationId) =>
    set(({ modificationsDraft }) => ({
      modificationsDraft: modificationsDraft.filter((modification) => modification.id !== modificationId),
    })),
  // Takes the modifications that were sent, not the current draft: edits made while the save ran stay unsaved.
  markSaved: (savedModifications) => set({ savedJson: JSON.stringify(savedModifications) }),
}));

/** The dirty flag: derived from the draft and the last saved copy, never stored. */
export function hasUnsavedChanges({ modificationsDraft, savedJson }: Pick<EditorState, 'modificationsDraft' | 'savedJson'>): boolean {
  return JSON.stringify(modificationsDraft) !== savedJson;
}

/** True when this modification is a hide on exactly this target (same selector and same text). */
function isHideOf(modification: Modification, target: Target): boolean {
  return modification.type === 'hide' && isSameTarget(modification.target, target);
}

/** True when this modification is a context note on exactly this target. */
function isContextOf(modification: Modification, target: Target): boolean {
  return modification.type === 'context' && isSameTarget(modification.target, target);
}

/** True when this modification is a forward of exactly this target. */
function isForwardOf(modification: Modification, target: Target): boolean {
  return modification.type === 'forward' && isSameTarget(modification.target, target);
}

function isSameTarget(first: Target, second: Target): boolean {
  return first.selector === second.selector && first.text === second.text;
}
