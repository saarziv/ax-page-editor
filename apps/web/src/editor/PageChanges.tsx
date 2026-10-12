import { X } from 'lucide-react';
import type { Modification } from '@ax/core';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/state/store';
import { MODIFICATION_LABELS } from './modificationLabels';

// A simple flat list; the restore task groups it by status and adds "Needs attention" for changes that no longer match.
export function PageChanges() {
  const modificationsDraft = useEditorStore((state) => state.modificationsDraft);

  return (
    <section aria-label="Changes on this page" className="mt-auto border-t pt-4">
      <h2 className="text-sm font-medium">Changes on this page</h2>
      {modificationsDraft.length === 0 ? (
        <p className="text-sm text-muted-foreground">No changes yet.</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-1">
          {modificationsDraft.map((modification) => (
            <PageChangeRow key={modification.id} modification={modification} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PageChangeRow({ modification }: { modification: Modification }) {
  const removeModification = useEditorStore((state) => state.removeModification);
  const label = MODIFICATION_LABELS[modification.type];
  const snippet = modification.target.text;

  return (
    <li className="flex items-start gap-1 text-sm">
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
