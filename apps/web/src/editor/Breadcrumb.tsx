import type { PageNode } from '@ax/core';
import { useEditorStore } from '@/state/store';
import { NODE_LABELS } from './nodeLabels';

// A click always picks the innermost element, so this is how the user reaches the containers around it.
export function Breadcrumb({ path }: { path: PageNode[] }) {
  const select = useEditorStore((state) => state.select);
  // The page root is the whole document, not something to select.
  const steps = path.filter((node) => node.kind !== 'page');
  const ancestors = steps.slice(0, -1);
  const current = steps.at(-1);
  if (!current || ancestors.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {ancestors.map((ancestor) => (
          <li key={ancestor.id} className="flex items-center gap-1">
            {/* Styled as a link, against the plain current step, so it reads as clickable. Tailwind v4 drops the pointer cursor on buttons. */}
            <button
              type="button"
              className="cursor-pointer text-primary underline-offset-2 hover:underline"
              onClick={() => select(ancestor.id)}
            >
              {NODE_LABELS[ancestor.kind]}
            </button>
            <span aria-hidden="true">›</span>
          </li>
        ))}
        <li aria-current="location" className="font-medium text-foreground">
          {NODE_LABELS[current.kind]}
        </li>
      </ol>
    </nav>
  );
}
