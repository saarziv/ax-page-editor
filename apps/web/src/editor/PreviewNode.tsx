import type { PageNode } from '@ax/core';
import { useEditorStore } from '@/state/store';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
const HEADING_SIZES = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];

// A text node is a piece of a sentence, so a click on it should select its parent; page is the whole document.
// annotation and forwarded are inserted by transform and get their own behaviour in 03 and 04.
const UNSELECTABLE_KINDS = new Set<PageNode['kind']>(['text', 'page', 'annotation', 'forwarded']);

// Draws one page tree node and, through itself, everything below it.
// The preview is for looking, not using: links, forms, fields and buttons are deliberately inert.
export function PreviewNode({ node }: { node: PageNode }) {
  // A boolean, so moving the selection re-renders only the old and the new node.
  const isSelected = useEditorStore((state) => state.selectedId === node.id);
  // Preview reads data-node-id to find what was clicked; index.css styles both attributes.
  const selectable = UNSELECTABLE_KINDS.has(node.kind)
    ? {}
    : { 'data-node-id': node.id, 'data-selected': isSelected ? 'true' : undefined };
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

    case 'list':
      return <ul {...selectable} className="my-2 list-disc pl-6">{content}</ul>;
    case 'listItem':
      return <li {...selectable} className="my-1">{content}</li>;

    case 'table':
      return (
        <table {...selectable} className="my-3 border-collapse">
          <tbody>{content}</tbody>
        </table>
      );
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

    // Inserted by transform; 03 and 04 define how they look.
    case 'annotation':
    case 'forwarded':
      return null;

    default: {
      const unhandledKind: never = node.kind;
      throw new Error(`PreviewNode has no rendering for kind "${String(unhandledKind)}"`);
    }
  }
}
