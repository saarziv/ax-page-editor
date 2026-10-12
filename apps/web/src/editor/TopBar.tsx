import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/AppLogo';
import { Input } from '@/components/ui/input';
import { hasUnsavedChanges, useEditorStore } from '@/state/store';
import { SaveButton } from './SaveButton';
import { ViewAsAgentButton } from './ViewAsAgentButton';

export function TopBar({ url }: { url: string }) {
  const setUrl = useEditorStore((state) => state.setUrl);
  // The same derived flag that enables Save, so the text and the button always agree.
  const isDirty = useEditorStore(hasUnsavedChanges);
  const [typedUrl, setTypedUrl] = useState(url);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedUrl = typedUrl.trim();
    if (trimmedUrl) setUrl(trimmedUrl);
  }

  return (
    <div className="flex items-center gap-4 border-b bg-sidebar p-3">
      <div className="border-r pr-4">
        <AppLogo />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-1 gap-2">
        <Input aria-label="Page URL" value={typedUrl} onChange={(event) => setTypedUrl(event.target.value)} />
        <Button type="submit">Open</Button>
      </form>
      <SaveButton url={url} />
      <ViewAsAgentButton url={url} />
      {isDirty && (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-amber-500" aria-hidden />
          Unsaved changes
        </span>
      )}
    </div>
  );
}
