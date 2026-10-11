import { usePageTree } from '@/state/queries';
import { PreviewNode } from './PreviewNode';

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
          <div className="mb-4 border-b pb-3">
            <h1 className="text-sm font-medium">{pageTreeQuery.data.title}</h1>
            <p className="text-xs text-muted-foreground">{pageTreeQuery.data.url}</p>
          </div>
          <div className="max-w-3xl">
            <PreviewNode node={pageTreeQuery.data.root} />
          </div>
        </>
      )}
    </section>
  );
}
