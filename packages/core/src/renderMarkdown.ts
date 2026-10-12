import type { PageNode } from './schemas.js';

// Written inside a line, next to their neighbours. Every other kind is a block of its own.
const INLINE_KINDS: ReadonlySet<PageNode['kind']> = new Set(['text', 'link', 'image']);

// Characters Markdown reads as syntax. Page text and notes are plain text, so each gets a backslash (03 spec K9).
const MARKDOWN_SYNTAX_CHARACTERS = /[\\`*_[\]<>#|]/g;

/**
 * The agent tree (prune's output) as Markdown, one blank line between blocks.
 *
 *   heading "Pricing" (level 2)            → ## Pricing
 *   paragraph [text "Read ", link "terms"] → Read [terms](https://acme.com/terms)
 *   paragraph "# hi [x](y)"                → \# hi \[x\](y)
 */
export function renderMarkdown(root: PageNode): string {
  const blocks = renderBlock(root);
  return blocks.length === 0 ? '' : `${blocks.join('\n\n')}\n`;
}

/** A node as the Markdown blocks it becomes. A container becomes its children's blocks, so it can be several. */
function renderBlock(node: PageNode): string[] {
  switch (node.kind) {
    case 'heading':
      return nonEmpty(`${'#'.repeat(headingLevel(node))} ${renderLine(node)}`, renderLine(node));
    case 'paragraph':
      return nonEmpty(renderLine(node));
    case 'text':
    case 'link':
    case 'image':
      return nonEmpty(renderInline(node));
    case 'list':
      return renderList(node);
    case 'table':
      return renderTable(node);
    case 'quote':
      return nonEmpty(quoteLines(renderContentBlocks(node).join('\n\n')));
    case 'code':
      return [renderCode(node)];
    case 'field':
      return [labelled('Field', escapeText(node.attrs?.label ?? ''))];
    case 'button':
      return [labelled('Button', renderLine(node))];
    case 'annotation':
      return [renderNote(node)];
    case 'forwarded':
      return [];
    default:
      // Containers (page, main, section, …) add no text of their own. A row, cell or item found
      // outside its table or list is written the same way, so its content is never lost.
      return renderContentBlocks(node);
  }
}

/**
 * A node's content as blocks: each run of inline children becomes one line, each other child its own blocks.
 * `notesInline` is for places Markdown allows only one line (a cell), where a note can't be a blockquote.
 */
function renderContentBlocks(node: PageNode, notesInline = false): string[] {
  if (!node.children) return nonEmpty(escapeText(node.text ?? ''));

  const blocks: string[] = [];
  let inlineRun = '';
  const endInlineRun = (): void => {
    blocks.push(...nonEmpty(inlineRun.trim()));
    inlineRun = '';
  };
  for (const child of node.children) {
    if (INLINE_KINDS.has(child.kind)) {
      inlineRun += renderInline(child);
    } else if (notesInline && child.kind === 'annotation') {
      inlineRun += ` (Context: ${escapeText(child.text ?? '')})`;
    } else {
      endInlineRun();
      blocks.push(...renderBlock(child));
    }
  }
  endInlineRun();
  return blocks;
}

/** A node's content squeezed onto one line, for places Markdown allows only one: headings, cells, link text. */
function renderLine(node: PageNode): string {
  return renderContentBlocks(node, true).join(' ').replace(/\s*\n\s*/g, ' ');
}

function renderInline(node: PageNode): string {
  switch (node.kind) {
    case 'link': {
      const href = node.attrs?.href ?? '';
      return `[${renderLine(node) || escapeText(href)}](${escapeUrl(href)})`;
    }
    case 'image':
      return `![${escapeText(node.attrs?.alt ?? '')}](${escapeUrl(node.attrs?.src ?? '')})`;
    default:
      // clean keeps the spaces between a text and its neighbouring link, so the text is used as is.
      return escapeText(node.text ?? '');
  }
}

function renderList(list: PageNode): string[] {
  // Markdown can't put a blockquote inside a list before its first item, so the list's own note is written just before it.
  const notesBeforeList: string[] = [];
  const blocksByItem: string[][] = [];
  for (const child of list.children ?? []) {
    const previousItemBlocks = blocksByItem.at(-1);
    const isNoteOrForward = child.kind === 'annotation' || child.kind === 'forwarded';
    if (!isNoteOrForward) blocksByItem.push(renderContentBlocks(child));
    // A note or forward on an item comes right after it, so it's written inside that item, under its text.
    else if (previousItemBlocks) previousItemBlocks.push(...renderBlock(child));
    else notesBeforeList.push(...renderBlock(child));
  }

  const items = blocksByItem.map((itemBlocks, index) => {
    const marker = list.tag === 'ol' ? `${index + 1}. ` : '- ';
    // Continuation lines line up under the item's text, so a nested list or a note stays inside its item.
    return marker + itemBlocks.join('\n').replace(/\n/g, `\n${' '.repeat(marker.length)}`);
  });
  return [...notesBeforeList, ...nonEmpty(items.join('\n'))];
}

function renderTable(table: PageNode): string[] {
  const rows = (table.children ?? []).filter((child) => child.kind === 'row');
  // A table's content outside its rows (its own note, or a caption clean unwrapped) is written before it:
  // Markdown has no place for it inside a table.
  const blocksBeforeTable = (table.children ?? []).filter((child) => child.kind !== 'row').flatMap(renderBlock);
  if (rows.length === 0) return blocksBeforeTable;

  const cellTextsByRow = rows.map((tableRow) => (tableRow.children ?? []).map(renderLine));
  const columnCount = Math.max(...cellTextsByRow.map((cellTexts) => cellTexts.length));
  const tableLine = (cellTexts: string[]): string =>
    `| ${Array.from({ length: columnCount }, (_, column) => cellTexts[column] ?? '').join(' | ')} |`;
  const [headerCells = [], ...bodyRows] = cellTextsByRow;
  const separatorLine = `| ${Array.from({ length: columnCount }, () => '---').join(' | ')} |`;

  return [...blocksBeforeTable, [tableLine(headerCells), separatorLine, ...bodyRows.map(tableLine)].join('\n')];
}

// Code is written as is: a fence longer than any backtick run inside it keeps the content from closing it.
function renderCode(node: PageNode): string {
  const code = rawText(node);
  const longestBacktickRun = Math.max(0, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longestBacktickRun + 1));
  return `${fence}\n${code}\n${fence}`;
}

function rawText(node: PageNode): string {
  return (node.text ?? '') + (node.children ?? []).map(rawText).join('');
}

/** `> **Context:** <note>`, or `> **Context** (on "terms"): <note>` when the note was moved away from its element. */
function renderNote(annotation: PageNode): string {
  const note = escapeText(annotation.text ?? '');
  const about = annotation.attrs?.about;
  return quoteLines(about === undefined ? `**Context:** ${note}` : `**Context** (on "${escapeText(about)}"): ${note}`);
}

function quoteLines(markdown: string): string {
  return markdown
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n');
}

// An agent can't click or type, so naming the control is enough for it to know it's there.
function labelled(name: string, escapedLabel: string): string {
  return escapedLabel ? `${name}: ${escapedLabel}` : name;
}

function headingLevel(heading: PageNode): number {
  return Math.min(6, Math.max(1, heading.attrs?.level ?? 1));
}

/** The block, or nothing when its content is empty, so an empty heading or paragraph leaves no gap. */
function nonEmpty(block: string, content: string = block): string[] {
  return content.trim() ? [block] : [];
}

function escapeText(text: string): string {
  return text.replace(MARKDOWN_SYNTAX_CHARACTERS, (character) => `\\${character}`);
}

// Percent-encodes what would end a link's URL early or break it across words.
function escapeUrl(url: string): string {
  return url.replace(/[()<>\s]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
}
