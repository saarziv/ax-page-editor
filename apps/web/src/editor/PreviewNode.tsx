import type { PageNode } from '@ax/core';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
const HEADING_SIZES = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];

// Draws one page tree node and, through itself, everything below it.
// The preview is for looking, not using: links, forms, fields and buttons are deliberately inert.
export function PreviewNode({ node }: { node: PageNode }) {
  const content = node.text ?? node.children?.map((child) => <PreviewNode key={child.id} node={child} />);

  switch (node.kind) {
    case 'text':
      return <>{node.text}</>;

    case 'heading': {
      const levelIndex = Math.min(Math.max((node.attrs?.level ?? 2) - 1, 0), 5);
      const HeadingTag = HEADING_TAGS[levelIndex] ?? 'h2';
      return <HeadingTag className={`mt-6 mb-2 font-semibold ${HEADING_SIZES[levelIndex] ?? ''}`}>{content}</HeadingTag>;
    }

    case 'paragraph':
      return <p className="my-2 leading-relaxed">{content}</p>;

    case 'link':
      // No href, so a click can never leave the editor. 02 turns the click into a selection.
      return (
        <span title={node.attrs?.href} className="text-primary underline underline-offset-2">
          {content}
        </span>
      );

    case 'image':
      // no-referrer keeps every preview out of the publisher's logs as a visit from the editor.
      return <img src={node.attrs?.src} alt={node.attrs?.alt ?? ''} referrerPolicy="no-referrer" className="my-3 max-w-full" />;

    case 'list':
      return <ul className="my-2 list-disc pl-6">{content}</ul>;
    case 'listItem':
      return <li className="my-1">{content}</li>;

    case 'table':
      return (
        <table className="my-3 border-collapse">
          <tbody>{content}</tbody>
        </table>
      );
    case 'row':
      return <tr>{content}</tr>;
    case 'cell':
      return <td className="border px-3 py-1">{content}</td>;

    case 'form':
      // A plain box, not a <form>, so nothing can ever submit.
      return <div className="my-3 flex max-w-md flex-col gap-3 rounded-md border p-4">{content}</div>;

    case 'field':
      return (
        <label className="flex flex-col gap-1 text-sm">
          {node.attrs?.label}
          <input disabled className="h-8 rounded-md border bg-muted" />
        </label>
      );

    case 'button':
      return (
        <button type="button" className="w-fit rounded-md border px-3 py-1 text-sm">
          {content}
        </button>
      );

    case 'quote':
      return <blockquote className="my-3 border-l-4 pl-4 italic">{content}</blockquote>;

    case 'code':
      return <pre className="my-3 whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-sm">{content}</pre>;

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
      return <div>{content}</div>;

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
