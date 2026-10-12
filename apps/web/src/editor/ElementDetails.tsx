import { useId, useState, type ReactNode } from 'react';
import { nodeText, targetFor, type PageNode } from '@ax/core';
import { Switch } from '@/components/ui/switch';
import { useNodeModifications } from '@/state/derived';
import { useEditorStore } from '@/state/store';
import { Breadcrumb } from './Breadcrumb';
import { ContextBox } from './ContextBox';
import { ForwardSwitch } from './ForwardSwitch';
import { describeModification } from './modificationLabels';
import { NODE_LABELS } from './nodeLabels';

// Past this, the text is clamped to four lines with a toggle, so a long paragraph doesn't push everything else away.
const LONG_TEXT_LENGTH = 200;

/** `path` runs from the root down to the selected node, which is its last item. `pageUrl` is the loaded page's normalized url. */
export function ElementDetails({ path, node, pageUrl }: { path: PageNode[]; node: PageNode; pageUrl: string }) {
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

      <div className="flex flex-col gap-3 border-t pt-4">
        <HideSwitch node={node} />
        <ContextBox node={node} />
        {node.kind === 'link' && <ForwardSwitch link={node} pageUrl={pageUrl} />}
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

// Its state is read from the draft, never stored, so an already-hidden element shows on when selected.
function HideSwitch({ node }: { node: PageNode }) {
  const switchId = useId();
  const toggleHide = useEditorStore((state) => state.toggleHide);
  const isHidden = useNodeModifications(node).some((modification) => modification.type === 'hide');

  return (
    <div className="flex items-center justify-between py-1">
      <label htmlFor={switchId} className="cursor-pointer text-sm font-medium">
        Hide from AI
      </label>
      <Switch id={switchId} checked={isHidden} onCheckedChange={() => toggleHide(targetFor(node))} className="data-[state=checked]:bg-green-600" />
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
