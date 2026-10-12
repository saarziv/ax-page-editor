import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { hasUnsavedChanges, useEditorStore } from '@/state/store';
import { SaveButton } from './SaveButton';

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
    <div className="flex items-center gap-4 border-b p-3">
      <form onSubmit={handleSubmit} className="flex flex-1 gap-2">
        <Input aria-label="Page URL" value={typedUrl} onChange={(event) => setTypedUrl(event.target.value)} />
        <Button type="submit">Open</Button>
      </form>
      <SaveButton url={url} />
      {isDirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
    </div>
  );
}
