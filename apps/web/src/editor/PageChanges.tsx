import { useEditorStore } from '@/state/store';
import { MODIFICATION_LABELS } from './modificationLabels';

// A simple flat list; 05 groups it by status and marks the ones that no longer match the page.
export function PageChanges() {
  const draft = useEditorStore((state) => state.draft);

  return (
    <section aria-label="Changes on this page" className="mt-auto border-t pt-4">
      <h2 className="text-sm font-medium">Changes on this page</h2>
      {draft.length === 0 ? (
        <p className="text-sm text-muted-foreground">No changes yet.</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-1">
          {draft.map((modification) => (
            <li key={modification.id} className="truncate text-sm" title={modification.target.text}>
              <span className="font-medium">{MODIFICATION_LABELS[modification.type]}</span>
              <span className="text-muted-foreground"> · {modification.target.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
