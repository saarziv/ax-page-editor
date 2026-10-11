import { create } from 'zustand';

// Draft + UI state only. Server data lives in TanStack Query, derived values are never stored.
interface EditorState {
  url: string | null;
  setUrl: (url: string | null) => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
  url: null,
  setUrl: (url) => set({ url }),
}));
