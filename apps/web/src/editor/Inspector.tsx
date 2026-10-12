import { PageChanges } from './PageChanges';

export function Inspector() {
  return (
    <aside aria-label="Inspector" className="flex w-72 shrink-0 flex-col border-l p-4">
      <p className="text-sm text-muted-foreground">Click an element in the preview to inspect it.</p>
      <PageChanges />
    </aside>
  );
}
