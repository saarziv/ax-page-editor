import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { useSnapshot } from '@/state/queries';
import { useEditorStore } from '@/state/store';

export function Editor({ url }: { url: string }) {
  const setUrl = useEditorStore((state) => state.setUrl);
  const [typedUrl, setTypedUrl] = useState(url);
  const snapshotQuery = useSnapshot(url);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedUrl = typedUrl.trim();
    if (trimmedUrl) setUrl(trimmedUrl);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="border-b p-3">
        <Input aria-label="Page URL" value={typedUrl} onChange={(event) => setTypedUrl(event.target.value)} />
      </form>
      <main className="p-6">
        {snapshotQuery.isPending && <p className="text-muted-foreground">Loading…</p>}
        {snapshotQuery.isError && (
          <p role="alert" className="text-destructive">
            {snapshotQuery.error.message}
          </p>
        )}
        {snapshotQuery.isSuccess && (
          <>
            <h1 className="text-xl font-semibold">{snapshotQuery.data.title}</h1>
            <p className="text-sm text-muted-foreground">{snapshotQuery.data.url}</p>
          </>
        )}
      </main>
    </div>
  );
}
