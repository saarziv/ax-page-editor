import { ScanEye } from 'lucide-react';
import { useEditorStore } from '@/state/store';

// Back to the start screen. Same as opening another page: the current draft is dropped.
export function AppLogo() {
  const setUrl = useEditorStore((state) => state.setUrl);

  return (
    <button type="button" className="flex cursor-pointer items-center gap-2 rounded-md px-1" onClick={() => setUrl(null)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <ScanEye className="size-4" aria-hidden />
      </span>
      <span className="text-sm font-semibold tracking-tight">AX Editor</span>
    </button>
  );
}
