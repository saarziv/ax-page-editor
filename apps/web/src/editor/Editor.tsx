import { useEffect } from 'react';
import { useEditorStore } from '@/state/store';
import { Inspector } from './Inspector';
import { Preview } from './Preview';
import { TopBar } from './TopBar';

export function Editor({ url }: { url: string }) {
  const select = useEditorStore((state) => state.select);

  // On window, not the preview: the preview can't take focus, so a key press there would never reach it.
  useEffect(() => {
    function clearSelectionOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') select(null);
    }
    window.addEventListener('keydown', clearSelectionOnEscape);
    return () => window.removeEventListener('keydown', clearSelectionOnEscape);
  }, [select]);

  return (
    <div className="flex h-screen flex-col">
      <TopBar url={url} />
      <div className="flex min-h-0 flex-1">
        <Preview url={url} />
        <Inspector url={url} />
      </div>
    </div>
  );
}
