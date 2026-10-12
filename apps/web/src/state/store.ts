import { create } from 'zustand';

// Draft + UI state only. Server data lives in TanStack Query, derived values are never stored.
interface EditorState {
  url: string | null;
  selectedId: string | null;
  setUrl: (url: string | null) => void;
  select: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
  url: null,
  selectedId: null,
  // Node ids belong to one page's tree, so opening another page clears the selection.
  setUrl: (url) => set({ url, selectedId: null }),
  select: (id) => set({ selectedId: id }),
}));
