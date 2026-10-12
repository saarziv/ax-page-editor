import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEditorStore } from '@/state/store';

export function TopBar({ url }: { url: string }) {
  const setUrl = useEditorStore((state) => state.setUrl);
  const [typedUrl, setTypedUrl] = useState(url);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedUrl = typedUrl.trim();
    if (trimmedUrl) setUrl(trimmedUrl);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-b p-3">
      <Input aria-label="Page URL" value={typedUrl} onChange={(event) => setTypedUrl(event.target.value)} />
      <Button type="submit">Open</Button>
    </form>
  );
}
