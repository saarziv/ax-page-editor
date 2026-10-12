import { X } from 'lucide-react';
import type { Modification } from '@ax/core';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/state/store';
import { MODIFICATION_LABELS } from './modificationLabels';

// A simple flat list; the restore task groups it by status and adds "Needs attention" for changes that no longer match.
export function PageChanges() {
  const modificationsDraft = useEditorStore((state) => state.modificationsDraft);

  return (
    <section aria-label="Changes on this page" className="mt-auto flex min-h-72 flex-col gap-2 border-t pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Changes on this page</h2>
        {modificationsDraft.length > 0 && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            {modificationsDraft.length}
          </span>
        )}
      </div>
      {modificationsDraft.length === 0 ? (
        <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No changes yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border bg-background">
          {modificationsDraft.map((modification) => (
            <PageChangeRow key={modification.id} modification={modification} />
          ))}
        </ul>
      )}
    </section>
  );
}

// The same hues as the markers in the preview (sky note callout, violet forwarded block), so a row is easy to match to its marker.
const TYPE_DOT_COLORS: Record<Modification['type'], string> = {
  hide: 'bg-slate-400',
  context: 'bg-sky-500',
  forward: 'bg-violet-500',
};

function PageChangeRow({ modification }: { modification: Modification }) {
  const removeModification = useEditorStore((state) => state.removeModification);
  const label = MODIFICATION_LABELS[modification.type];
  const snippet = modification.target.text;

  return (
    <li className="flex items-start gap-2 px-3 py-2 text-sm">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${TYPE_DOT_COLORS[modification.type]}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate" title={snippet}>
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground"> · {snippet}</span>
        </p>
        {modification.type === 'context' && (
          <p className="truncate text-muted-foreground" title={modification.note}>
            {modification.note}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="cursor-pointer"
        // Every row has the same ✕, so the label names what it removes.
        aria-label={`Remove ${label}: ${snippet}`}
        onClick={() => removeModification(modification.id)}
      >
        <X />
      </Button>
    </li>
  );
}
