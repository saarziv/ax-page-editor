import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './renderMarkdown.js';
import type { PageNode } from './schemas.js';

// Ids don't affect rendering, so the test trees leave them empty.
function node(kind: PageNode['kind'], fields: Omit<Partial<PageNode>, 'kind'> = {}): PageNode {
  return { id: '', kind, tag: kind, ...fields };
}

function page(...children: PageNode[]): PageNode {
  return node('page', { tag: 'body', children });
}

const text = (value: string): PageNode => node('text', { tag: '#text', text: value });
const link = (value: string, href: string): PageNode => node('link', { tag: 'a', text: value, attrs: { href } });
const listItem = (...children: PageNode[]): PageNode => node('listItem', { tag: 'li', children });
const cell = (value: string): PageNode => node('cell', { tag: 'td', text: value });
const row = (...values: string[]): PageNode => node('row', { tag: 'tr', children: values.map(cell) });

describe('renderMarkdown', () => {
  describe('each kind', () => {
    it('writes a heading with one # per level', () => {
      expect(renderMarkdown(page(node('heading', { tag: 'h2', text: 'Pricing', attrs: { level: 2 } })))).toBe('## Pricing\n');
    });

    it('writes a paragraph as its line', () => {
      expect(renderMarkdown(page(node('paragraph', { tag: 'p', text: 'Plans start at $9.' })))).toBe('Plans start at $9.\n');
    });

    it('writes a link and an image', () => {
      const markdown = renderMarkdown(
        page(
          node('paragraph', { tag: 'p', children: [link('terms', 'https://acme.com/terms')] }),
          node('image', { tag: 'img', attrs: { src: 'https://acme.com/growth.png', alt: 'Customer growth' } }),
        ),
      );
      expect(markdown).toBe('[terms](https://acme.com/terms)\n\n![Customer growth](https://acme.com/growth.png)\n');
    });

    it('writes a ul with - and an ol with numbers', () => {
      const items = [listItem(text('One')), listItem(text('Two'))];
      expect(renderMarkdown(page(node('list', { tag: 'ul', children: items })))).toBe('- One\n- Two\n');
      expect(renderMarkdown(page(node('list', { tag: 'ol', children: items })))).toBe('1. One\n2. Two\n');
    });

    it('indents a nested list under its item', () => {
      const nested = node('list', { tag: 'ul', children: [listItem(text('Monthly')), listItem(text('Yearly'))] });
      const markdown = renderMarkdown(page(node('list', { tag: 'ol', children: [listItem(text('Plans'), nested), listItem(text('Seats'))] })));
      expect(markdown).toBe('1. Plans\n   - Monthly\n   - Yearly\n2. Seats\n');
    });

    it('writes a table with its first row as the header row', () => {
      const table = node('table', { tag: 'table', children: [row('Plan', 'Price'), row('Starter', '$9 / month'), row('Pro', '$49 / month')] });
      expect(renderMarkdown(page(table))).toBe('| Plan | Price |\n| --- | --- |\n| Starter | $9 / month |\n| Pro | $49 / month |\n');
    });

    it('pads a short row so every row has the same number of cells', () => {
      const table = node('table', { tag: 'table', children: [row('Plan', 'Price'), row('Free')] });
      expect(renderMarkdown(page(table))).toBe('| Plan | Price |\n| --- | --- |\n| Free |  |\n');
    });

    it('writes a quote with every line prefixed by >', () => {
      const quote = node('quote', { tag: 'blockquote', children: [node('paragraph', { text: 'Fast.' }), node('paragraph', { text: 'Cheap.' })] });
      expect(renderMarkdown(page(quote))).toBe('> Fast.\n>\n> Cheap.\n');
    });

    it('writes code as a fenced block, as is', () => {
      expect(renderMarkdown(page(node('code', { tag: 'pre', text: 'const a = b * c; // <ok>' })))).toBe('```\nconst a = b * c; // <ok>\n```\n');
    });

    it('makes the fence longer than any backtick run inside the code', () => {
      expect(renderMarkdown(page(node('code', { tag: 'pre', text: 'use ``` to fence' })))).toBe('````\nuse ``` to fence\n````\n');
    });

    it('names fields and buttons, since an agent cannot use them', () => {
      const form = node('form', {
        children: [node('field', { tag: 'input', attrs: { label: 'Work email', inputType: 'email' } }), node('button', { text: 'Request a demo' })],
      });
      expect(renderMarkdown(page(form))).toBe('Field: Work email\n\nButton: Request a demo\n');
    });

    it('writes containers as just their children', () => {
      const markdown = renderMarkdown(
        page(node('header', { children: [node('nav', { children: [node('paragraph', { text: 'Menu' })] })] }), node('main', { children: [node('heading', { text: 'Hi', attrs: { level: 1 } })] })),
      );
      expect(markdown).toBe('Menu\n\n# Hi\n');
    });

    it('writes nothing for a forwarded node yet', () => {
      expect(renderMarkdown(page(node('paragraph', { text: 'Before' }), node('forwarded'), node('paragraph', { text: 'After' })))).toBe('Before\n\nAfter\n');
    });
  });

  describe('layout', () => {
    it('separates blocks with one blank line', () => {
      const markdown = renderMarkdown(page(node('heading', { text: 'Plans', attrs: { level: 2 } }), node('paragraph', { text: 'One' }), node('paragraph', { text: 'Two' })));
      expect(markdown).toBe('## Plans\n\nOne\n\nTwo\n');
    });

    it('keeps inline text and links on one line', () => {
      const paragraph = node('paragraph', { children: [text('Read our '), link('terms', 'https://acme.com/terms'), text(' first.')] });
      expect(renderMarkdown(page(paragraph))).toBe('Read our [terms](https://acme.com/terms) first.\n');
    });

    it('puts an inline run next to blocks on its own line', () => {
      const form = node('form', { children: [text('Work email'), node('field', { attrs: { label: 'Email' } })] });
      expect(renderMarkdown(page(form))).toBe('Work email\n\nField: Email\n');
    });

    it('writes an empty page as nothing', () => {
      expect(renderMarkdown(page())).toBe('');
    });
  });

  describe('context notes', () => {
    const note = (value: string, about?: string): PageNode => node('annotation', { tag: 'aside', text: value, attrs: { forId: 'x', ...(about && { about }) } });
    const image = node('image', { tag: 'img', attrs: { src: 'https://acme.com/growth.png', alt: 'Customer growth' } });

    it('writes a note after a leaf as a blockquote right after it', () => {
      const figure = node('figure', { children: [image, note('Growth from 1,200 to 8,500.'), node('paragraph', { text: 'Jan to Sep.' })] });
      expect(renderMarkdown(page(figure))).toBe('![Customer growth](https://acme.com/growth.png)\n\n> **Context:** Growth from 1,200 to 8,500.\n\nJan to Sep.\n');
    });

    it('writes a section\'s note first, before its content', () => {
      const section = node('section', { children: [note('Prices exclude VAT.'), node('heading', { text: 'Plans', attrs: { level: 2 } })] });
      expect(renderMarkdown(page(section))).toBe('> **Context:** Prices exclude VAT.\n\n## Plans\n');
    });

    it('writes a list\'s note just before the list', () => {
      const list = node('list', { tag: 'ul', children: [note('Main menu.'), listItem(text('Home')), listItem(text('Blog'))] });
      expect(renderMarkdown(page(list))).toBe('> **Context:** Main menu.\n\n- Home\n- Blog\n');
    });

    it('writes an item\'s note inside that item, under its text', () => {
      const list = node('list', { tag: 'ol', children: [listItem(text('Home')), note('The landing page.'), listItem(text('Blog'))] });
      expect(renderMarkdown(page(list))).toBe('1. Home\n   > **Context:** The landing page.\n2. Blog\n');
    });

    it('writes a table\'s note just before the table', () => {
      const table = node('table', { children: [note('Monthly prices.'), row('Plan', 'Price'), row('Pro', '$49')] });
      expect(renderMarkdown(page(table))).toBe('> **Context:** Monthly prices.\n\n| Plan | Price |\n| --- | --- |\n| Pro | $49 |\n');
    });

    it('writes a note inside a cell inline, since a cell is one line', () => {
      const cellWithNote = node('cell', { tag: 'td', children: [link('Pro', 'https://acme.com/pro'), note('Billed yearly.')] });
      const table = node('table', { children: [row('Plan'), node('row', { tag: 'tr', children: [cellWithNote] })] });
      expect(renderMarkdown(page(table))).toBe('| Plan |\n| --- |\n| [Pro](https://acme.com/pro) (Context: Billed yearly.) |\n');
    });

    it('names the element when the note was moved away from it', () => {
      expect(renderMarkdown(page(node('paragraph', { text: 'Read our terms.' }), note('Terms changed in 2026.', 'terms')))).toBe(
        'Read our terms.\n\n> **Context** (on "terms"): Terms changed in 2026.\n',
      );
    });

    it('writes a note as literal characters, never as Markdown', () => {
      expect(renderMarkdown(page(note('Growth. # hi [x](y)', '*terms*')))).toBe('> **Context** (on "\\*terms\\*"): Growth. \\# hi \\[x\\](y)\n');
    });

    it('keeps every line of a multi-line note inside the blockquote', () => {
      expect(renderMarkdown(page(note('Line one.\nLine two.')))).toBe('> **Context:** Line one.\n> Line two.\n');
    });
  });

  describe('escaping', () => {
    it('writes page text as literal characters, never as Markdown', () => {
      expect(renderMarkdown(page(node('paragraph', { text: '# hi [x](y) <b>' })))).toBe('\\# hi \\[x\\](y) \\<b\\>\n');
    });

    it('escapes every Markdown character in text', () => {
      expect(renderMarkdown(page(node('paragraph', { text: '\\ ` * _ [ ] < > # |' })))).toBe('\\\\ \\` \\* \\_ \\[ \\] \\< \\> \\# \\|\n');
    });

    it('escapes link text, alt text, field labels and cells', () => {
      const markdown = renderMarkdown(
        page(
          node('paragraph', { children: [link('[click]', 'https://acme.com/a')] }),
          node('image', { attrs: { src: 'https://acme.com/a.png', alt: '*chart*' } }),
          node('field', { attrs: { label: '<email>' } }),
          node('table', { children: [row('a|b'), row('c')] }),
        ),
      );
      expect(markdown).toBe('[\\[click\\]](https://acme.com/a)\n\n![\\*chart\\*](https://acme.com/a.png)\n\nField: \\<email\\>\n\n| a\\|b |\n| --- |\n| c |\n');
    });

    it('keeps a URL from closing its link early', () => {
      expect(renderMarkdown(page(node('paragraph', { children: [link('wiki', 'https://en.wikipedia.org/wiki/Foo_(bar) x')] })))).toBe(
        '[wiki](https://en.wikipedia.org/wiki/Foo_%28bar%29%20x)\n',
      );
    });

    it('turns a <script> in page text into literal text', () => {
      expect(renderMarkdown(page(node('paragraph', { text: '<script>alert(1)</script>' })))).toBe('\\<script\\>alert(1)\\</script\\>\n');
    });
  });
});
