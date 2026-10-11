import { useSnapshot } from '@/state/queries';

export function Preview({ url }: { url: string }) {
  const snapshotQuery = useSnapshot(url);

  return (
    <section aria-label="Preview" className="min-w-0 flex-1 overflow-auto p-6">
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
    </section>
  );
}
