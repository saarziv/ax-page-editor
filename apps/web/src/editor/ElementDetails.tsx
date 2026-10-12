import { useState, type ReactNode } from 'react';
import { nodeText, type PageNode } from '@ax/core';
import { Button } from '@/components/ui/button';
import { useNodeModifications } from '@/state/derived';
import { Breadcrumb } from './Breadcrumb';
import { describeModification } from './modificationLabels';
import { NODE_LABELS } from './nodeLabels';

const MODIFICATION_CONTROLS = ['Hide from AI', 'Context for AI', 'Forward this link'];

// Past this, the text is clamped to four lines with a toggle, so a long paragraph doesn't push everything else away.
const LONG_TEXT_LENGTH = 200;

/** `path` runs from the root down to the selected node, which is its last item. */
export function ElementDetails({ path, node }: { path: PageNode[]; node: PageNode }) {
  return (
    <section aria-label="Selected element" className="flex flex-col gap-4">
      <Breadcrumb path={path} />
      <div>
        <h2 className="text-base font-semibold">{NODE_LABELS[node.kind]}</h2>
        <p className="text-xs text-muted-foreground">
          Tag: <code>{`<${node.tag}>`}</code>
        </p>
      </div>

      <DetailRow label="Text">
        <ElementText node={node} />
      </DetailRow>

      {/* Plain text, not a link, so nothing leaves the editor from here. */}
      {node.kind === 'link' && node.attrs?.href && (
        <DetailRow label="Destination">
          <p className="text-sm break-all">{node.attrs.href}</p>
        </DetailRow>
      )}

      <DetailRow label="Changes on this element">
        <ElementChanges node={node} />
      </DetailRow>

      {/* Disabled until 03 and 04 make them work. */}
      <div className="flex flex-col gap-2 border-t pt-4">
        {MODIFICATION_CONTROLS.map((controlName) => (
          <Button key={controlName} variant="outline" disabled>
            {controlName}
          </Button>
        ))}
      </div>
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-medium text-muted-foreground">{label}</h3>
      {children}
    </div>
  );
}

function ElementChanges({ node }: { node: PageNode }) {
  const nodeModifications = useNodeModifications(node);
  if (nodeModifications.length === 0) return <p className="text-sm text-muted-foreground">No changes on this element.</p>;

  return (
    <ul className="flex flex-col gap-1">
      {nodeModifications.map((modification) => (
        <li key={modification.id} className="text-sm break-words">
          {describeModification(modification)}
        </li>
      ))}
    </ul>
  );
}

function ElementText({ node }: { node: PageNode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (node.kind === 'image') {
    return node.attrs?.alt ? (
      <p className="text-sm">{node.attrs.alt}</p>
    ) : (
      <p className="text-sm text-muted-foreground">No description</p>
    );
  }

  const text = node.kind === 'field' ? (node.attrs?.label ?? '') : nodeText(node);
  if (!text) return <p className="text-sm text-muted-foreground">No text</p>;

  const isLong = text.length > LONG_TEXT_LENGTH;
  return (
    <div>
      <p className={`text-sm ${isLong && !isExpanded ? 'line-clamp-4' : ''}`}>{text}</p>
      {isLong && (
        <button type="button" className="mt-1 text-xs text-primary underline" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
