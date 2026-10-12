import { useEffect } from 'react';
import { Editor } from '@/editor/Editor';
import { useEditorStore } from '@/state/store';
import { StartScreen } from './StartScreen';

// No router: the store's url decides the screen.
export function App() {
  const url = useEditorStore((state) => state.url);

  // The address bar only mirrors the screen; it never drives it. replaceState, not pushState, because the
  // back button has nothing to restore: a reload of /editor lands on the start screen, which rewrites it to /home.
  useEffect(() => {
    const screenPath = url ? '/editor' : '/home';
    if (window.location.pathname !== screenPath) window.history.replaceState(null, '', screenPath);
  }, [url]);

  return url ? <Editor url={url} /> : <StartScreen />;
}
