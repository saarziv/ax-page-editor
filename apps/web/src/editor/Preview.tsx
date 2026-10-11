import { usePageTree } from '@/state/queries';

export function Preview({ url }: { url: string }) {
  const pageTreeQuery = usePageTree(url);

  return (
    <section aria-label="Preview" className="min-w-0 flex-1 overflow-auto p-6">
      {pageTreeQuery.isPending && <p className="text-muted-foreground">Loading…</p>}
      {pageTreeQuery.isError && (
        <p role="alert" className="text-destructive">
          {pageTreeQuery.error.message}
        </p>
      )}
      {pageTreeQuery.isSuccess && (
        <>
          <h1 className="text-xl font-semibold">{pageTreeQuery.data.title}</h1>
          <p className="text-sm text-muted-foreground">{pageTreeQuery.data.url}</p>
        </>
      )}
    </section>
  );
}
