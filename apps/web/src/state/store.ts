import { create } from 'zustand';
import type { Modification } from '@ax/core';
import { DEMO_MODIFICATIONS, DEMO_URL } from '@/editor/demoMock';

// Draft + UI state only. Server data lives in TanStack Query, derived values are never stored.
interface EditorState {
  url: string | null;
  draft: Modification[];
  selectedId: string | null;
  setUrl: (url: string | null) => void;
  select: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
  url: null,
  draft: [],
  selectedId: null,
  // Node ids and modifications belong to one page, so opening another page clears both.
  // The demo opens with the mock until 03 adds real controls (and loading saved configs comes in 05).
  setUrl: (url) => set({ url, selectedId: null, draft: url === DEMO_URL ? DEMO_MODIFICATIONS : [] }),
  select: (id) => set({ selectedId: id }),
}));
