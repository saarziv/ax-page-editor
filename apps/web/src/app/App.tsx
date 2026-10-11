import { Editor } from '@/editor/Editor';
import { useEditorStore } from '@/state/store';
import { StartScreen } from './StartScreen';

// No router: the store's url decides the screen.
export function App() {
  const url = useEditorStore((state) => state.url);
  return url ? <Editor url={url} /> : <StartScreen />;
}
