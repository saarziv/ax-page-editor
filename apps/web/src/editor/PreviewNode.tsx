import { createContext, memo, useContext, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { PageNode } from '@ax/core';
import { useEditorStore } from '@/state/store';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
const HEADING_SIZES = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];

// A text node is a piece of a sentence, so a click on it should select its parent; page is the whole document.
// annotation and forwarded are inserted by markModificationsInTree: a click on one selects the element it belongs to instead.
const UNSELECTABLE_KINDS = new Set<PageNode['kind']>(['text', 'page', 'annotation', 'forwarded']);

// Forwarded content is another page, read-only here: nothing in it can be selected, hidden, noted or forwarded (K5).
const InsideForwardedContentContext = createContext(false);

// Draws one page tree node and, through itself, everything below it.
// The preview is for looking, not using: links, forms, fields and buttons are deliberately inert.
// Memoized: markModificationsInTree shares every node it didn't change, so a keystroke in a note
// re-renders only the nodes on the path to the edited element.
export const PreviewNode = memo(function PreviewNode({ node }: { node: PageNode }) {
  // A boolean, so moving the selection re-renders only the old and the new node.
  const isSelected = useEditorStore((state) => state.selectedId === node.id);
  const insideForwardedContent = useContext(InsideForwardedContentContext);
  // Preview reads data-node-id to find what was clicked; index.css styles data-selected; HiddenLayer veils data-hidden.
  // Without data-node-id, a click or hover inside forwarded content lands on the forwarded block around it.
  const selectable = UNSELECTABLE_KINDS.has(node.kind) || insideForwardedContent
    ? {}
    : { 'data-node-id': node.id, 'data-selected': isSelected ? 'true' : undefined, 'data-hidden': node.hidden ? 'true' : undefined };
  const content = node.text ?? node.children?.map((child) => <PreviewNode key={child.id} node={child} />);

  switch (node.kind) {
    case 'text':
      return <>{node.text}</>;

    case 'heading': {
      const levelIndex = Math.min(Math.max((node.attrs?.level ?? 2) - 1, 0), 5);
      const HeadingTag = HEADING_TAGS[levelIndex] ?? 'h2';
      return <HeadingTag {...selectable} className={`mt-6 mb-2 font-semibold ${HEADING_SIZES[levelIndex] ?? ''}`}>{content}</HeadingTag>;
    }

    case 'paragraph':
      return <p {...selectable} className="my-2 leading-relaxed">{content}</p>;

    case 'link':
      // No href, so a click can never leave the editor; it selects the link instead.
      return (
        <span {...selectable} title={node.attrs?.href} className="text-primary underline underline-offset-2">
          {content}
        </span>
      );

    case 'image':
      // no-referrer keeps every preview out of the publisher's logs as a visit from the editor.
      // Drawn at the size the tag gave it. The cap covers images with no size, which would
      // otherwise show at their natural size; object-contain keeps a capped image from stretching.
      return (
        <img
          {...selectable}
          src={node.attrs?.src}
          alt={node.attrs?.alt ?? ''}
          width={node.attrs?.width}
          height={node.attrs?.height}
          referrerPolicy="no-referrer"
          className="my-3 max-h-64 max-w-full object-contain"
        />
      );

    // A <div> can't sit inside <ul> or <tbody>, so the note that comes first in a list or table is drawn just above it.
    case 'list': {
      const { leadingNotes, otherChildren } = splitLeadingNotes(node);
      return (
        <>
          {leadingNotes}
          <ul {...selectable} className="my-2 list-disc pl-6">
            {node.text ??
              otherChildren.map((child) =>
                // A note or forward on a list item comes right after it, inside the list, so it needs its own <li>.
                child.kind === 'annotation' || child.kind === 'forwarded' ? (
                  <li key={child.id} className="list-none">
                    <PreviewNode node={child} />
                  </li>
                ) : (
                  <PreviewNode key={child.id} node={child} />
                ),
              )}
          </ul>
        </>
      );
    }
    case 'listItem':
      return <li {...selectable} className="my-1">{content}</li>;

    case 'table': {
      // Notes on rows and cells go after the whole table, so the only notes inside one are its own.
      const { leadingNotes, otherChildren } = splitLeadingNotes(node);
      return (
        <>
          {leadingNotes}
          <table {...selectable} className="my-3 border-collapse">
            <tbody>
              {otherChildren.map((child) => (
                <PreviewNode key={child.id} node={child} />
              ))}
            </tbody>
          </table>
        </>
      );
    }
    case 'row':
      return <tr {...selectable}>{content}</tr>;
    case 'cell':
      return <td {...selectable} className="border px-3 py-1">{content}</td>;

    case 'form':
      // A plain box, not a <form>, so nothing can ever submit.
      return <div {...selectable} className="my-3 flex max-w-md flex-col gap-3 rounded-md border p-4">{content}</div>;

    case 'field': {
      const inputType = node.attrs?.inputType;
      // Browsers swallow clicks on disabled inputs, so the click passes through to the label, which selects the field.
      // A checkbox drawn as a text box would mislead the publisher about what the page offers.
      if (inputType === 'checkbox' || inputType === 'radio') {
        return (
          <label {...selectable} className="flex w-fit items-center gap-2 text-sm">
            <input type={inputType} disabled className="pointer-events-none" />
            {node.attrs?.label}
          </label>
        );
      }
      return (
        <label {...selectable} className="flex flex-col gap-1 text-sm">
          {node.attrs?.label}
          <input disabled className="pointer-events-none h-8 rounded-md border bg-muted" />
        </label>
      );
    }

    case 'button':
      return (
        <button {...selectable} type="button" className="w-fit rounded-md border px-3 py-1 text-sm">
          {content}
        </button>
      );

    case 'quote':
      return <blockquote {...selectable} className="my-3 border-l-4 pl-4 italic">{content}</blockquote>;

    case 'code':
      return <pre {...selectable} className="my-3 whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-sm">{content}</pre>;

    // Real landmark tags would mix with the editor's own landmarks for screen readers. 02 adds visible labels.
    case 'page':
    case 'section':
    case 'article':
    case 'nav':
    case 'header':
    case 'footer':
    case 'aside':
    case 'main':
    case 'figure':
      return <div {...selectable}>{content}</div>;

    case 'annotation':
      return <ContextCallout annotation={node} />;

    case 'forwarded':
      return <ForwardedBlock forwarded={node} />;

    default: {
      const unhandledKind: never = node.kind;
      throw new Error(`PreviewNode has no rendering for kind "${String(unhandledKind)}"`);
    }
  }
});

// The note is plain React text, so React escapes it: `<script>` shows as those characters (K9).
// A <span> drawn as a block, so it stays valid HTML even when the note sits inside a paragraph.
// data-callout-for, not data-node-id: the hover and hidden layers find elements by data-node-id,
// and two elements with one id would confuse them. Preview reads it to select the element on click.
function ContextCallout({ annotation }: { annotation: PageNode }) {
  const about = annotation.attrs?.about;
  return (
    <span
      role="note"
      data-callout-for={annotation.attrs?.forId}
      className="my-2 block cursor-pointer rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-normal not-italic text-foreground hover:border-sky-400 dark:border-sky-900 dark:bg-sky-950/40"
    >
      <span className="block text-[11px] font-medium text-sky-700 dark:text-sky-300">
        Context for AI{about !== undefined && ` (on "${about}")`}
      </span>
      <span className="block whitespace-pre-wrap break-words">{annotation.text}</span>
    </span>
  );
}

// Like a note callout, a click anywhere on it selects the link it forwards (Preview reads data-callout-for).
// A <div>, unlike the callout: placement always puts a forward after its paragraph, and its content holds blocks.
function ForwardedBlock({ forwarded }: { forwarded: PageNode }) {
  // Collapsed by default, so a long forwarded page doesn't push the rest of the page away (K2). UI only, so local state.
  const [expanded, setExpanded] = useState(false);
  const href = forwarded.attrs?.href;
  const blockClassName = 'my-2 block cursor-pointer rounded-md border border-dashed px-3 py-2 text-sm font-normal not-italic';

  if (forwarded.attrs?.forwardState === 'loading') {
    return (
      <div data-callout-for={forwarded.attrs.forId} className={`${blockClassName} bg-muted/40 text-muted-foreground`}>
        Loading {href}…
      </div>
    );
  }
  if (forwarded.attrs?.forwardState === 'failed') {
    return (
      <div data-callout-for={forwarded.attrs.forId} className={`${blockClassName} bg-muted/40 text-muted-foreground`}>
        Couldn't forward {href}
      </div>
    );
  }
  return (
    <div data-callout-for={forwarded.attrs?.forId} className={`${blockClassName} border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/30`}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((wasExpanded) => !wasExpanded)}
        className="flex w-full items-center gap-1 text-left text-[11px] font-medium text-violet-700 dark:text-violet-300"
      >
        <ChevronRight aria-hidden="true" className={`size-3.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        Forwarded from {href}
      </button>
      {expanded && (
        <div className="mt-2 border-t border-violet-200 pt-2 text-foreground dark:border-violet-900">
          <InsideForwardedContentContext.Provider value={true}>
            {forwarded.children?.map((child) => <PreviewNode key={child.id} node={child} />)}
          </InsideForwardedContentContext.Provider>
        </div>
      )}
    </div>
  );
}

function splitLeadingNotes(node: PageNode): { leadingNotes: ReactNode[]; otherChildren: PageNode[] } {
  const children = node.children ?? [];
  const firstNonNoteIndex = children.findIndex((child) => child.kind !== 'annotation');
  const leadingCount = firstNonNoteIndex === -1 ? children.length : firstNonNoteIndex;
  return {
    leadingNotes: children.slice(0, leadingCount).map((child) => <PreviewNode key={child.id} node={child} />),
    otherChildren: children.slice(leadingCount),
  };
}
