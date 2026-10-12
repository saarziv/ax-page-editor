import { describe, expect, it } from 'vitest';
import { clean } from './index.js';
import type { PageNode } from '../schemas.js';

const BASE_URL = 'https://site.com/blog/post';

function cleanBody(bodyHtml: string): PageNode[] {
  return clean(`<html><body>${bodyHtml}</body></html>`, BASE_URL).root.children ?? [];
}

describe('clean', () => {
  describe('meaningful tags become nodes', () => {
    it('maps headings with their level', () => {
      expect(cleanBody('<h2>Pricing</h2>')).toEqual([
        { id: 'heading:1', kind: 'heading', tag: 'h2', text: 'Pricing', attrs: { level: 2 } },
      ]);
    });

    it('maps a link with href and an image with src and alt', () => {
      expect(cleanBody('<a href="https://x.com/">X</a><img src="https://x.com/a.png" alt="Chart">')).toEqual([
        { id: 'link:1', kind: 'link', tag: 'a', text: 'X', attrs: { href: 'https://x.com/' } },
        { id: 'image:1', kind: 'image', tag: 'img', attrs: { src: 'https://x.com/a.png', alt: 'Chart' } },
      ]);
    });

    it('maps lists, tables, quotes, code and landmarks', () => {
      const kinds = cleanBody(
        '<nav><ul><li>One</li></ul></nav><table><tr><th>A</th><td>B</td></tr></table>' +
          '<blockquote>Q</blockquote><pre>x = 1</pre><footer>F</footer>',
      ).map((node) => node.kind);
      expect(kinds).toEqual(['nav', 'table', 'quote', 'code', 'footer']);

      const [nav, table] = cleanBody('<nav><ul><li>One</li></ul></nav><table><tr><th>A</th><td>B</td></tr></table>');
      expect(nav?.children?.[0]?.children?.[0]).toMatchObject({ kind: 'listItem', text: 'One' });
      expect(table?.children?.[0]?.children?.map((cell) => cell.kind)).toEqual(['cell', 'cell']);
    });

    it('turns an anchor without href into its content', () => {
      expect(cleanBody('<p><a name="top">Top</a></p>')).toEqual([
        { id: 'paragraph:1', kind: 'paragraph', tag: 'p', text: 'Top' },
      ]);
    });

    it('drops an image without src', () => {
      expect(cleanBody('<p>Hi</p><img alt="nothing">')).toHaveLength(1);
    });
  });

  describe('image size', () => {
    function imageAttrs(imgAttributes: string) {
      return cleanBody(`<img src="/logo.svg" alt="Logo" ${imgAttributes}>`)[0]?.attrs;
    }

    it('keeps the width and height attributes, in pixels', () => {
      expect(imageAttrs('width="50" height="50"')).toMatchObject({ width: 50, height: 50 });
      expect(imageAttrs('width="50px"')).toMatchObject({ width: 50 });
    });

    it('reads width and height from the inline style, counting em and rem as 16px', () => {
      expect(imageAttrs('style="width: 8.75em; height: 1.375em"')).toMatchObject({ width: 140, height: 22 });
      expect(imageAttrs('style="WIDTH:2rem;height:10px"')).toMatchObject({ width: 32, height: 10 });
    });

    it('lets the style win over the attributes, as in the browser', () => {
      expect(imageAttrs('width="300" height="40" style="width: 100px"')).toMatchObject({ width: 100, height: 40 });
    });

    it('leaves out sizes it cannot turn into pixels', () => {
      const attrs = imageAttrs('width="100%" style="height: auto; max-width: 20px"');
      expect(attrs).not.toHaveProperty('width');
      expect(attrs).not.toHaveProperty('height');
    });
  });

  describe('decorative images are dropped', () => {
    it('drops an image the page marks as decoration', () => {
      for (const decoration of ['alt=""', 'aria-hidden="true"', 'role="presentation"', 'role="none"']) {
        expect(cleanBody(`<p>Hi</p><img src="/logo.svg" ${decoration}>`), decoration).toHaveLength(1);
      }
    });

    it('keeps an image with no alt at all, since missing is not the same as empty', () => {
      expect(cleanBody('<img src="/chart.png">')).toEqual([
        { id: 'image:1', kind: 'image', tag: 'img', attrs: { src: 'https://site.com/chart.png' } },
      ]);
    });

    it('treats a whitespace-only alt as empty', () => {
      expect(cleanBody('<p>Hi</p><img src="/logo.svg" alt="  ">')).toHaveLength(1);
    });

    it('keeps an image that is explicitly not hidden', () => {
      expect(cleanBody('<img src="/chart.png" alt="Chart" aria-hidden="false">')).toHaveLength(1);
    });
  });

  describe('wrappers disappear, their content stays', () => {
    it('unwraps divs and spans', () => {
      expect(cleanBody('<div><span><p>Hi</p></span></div>')).toEqual([
        { id: 'paragraph:1', kind: 'paragraph', tag: 'p', text: 'Hi' },
      ]);
    });

    it('merges text split by unwrapped inline elements', () => {
      expect(cleanBody('<p>Plans <strong>start</strong> at $9</p>')).toEqual([
        { id: 'paragraph:1', kind: 'paragraph', tag: 'p', text: 'Plans start at $9' },
      ]);
    });

    it('keeps mixed content as text children', () => {
      const [paragraph] = cleanBody('<p>Read <a href="/terms">terms</a> now</p>');
      expect(paragraph?.children).toEqual([
        { id: 'paragraph:1>text:1', kind: 'text', tag: '#text', text: 'Read ' },
        { id: 'paragraph:1>link:1', kind: 'link', tag: 'a', text: 'terms', attrs: { href: 'https://site.com/terms' } },
        { id: 'paragraph:1>text:2', kind: 'text', tag: '#text', text: ' now' },
      ]);
    });
  });

  describe('text', () => {
    it('collapses whitespace and trims at element edges', () => {
      expect(cleanBody('<p>\n   Hello \t\n  world   </p>')[0]?.text).toBe('Hello world');
    });

    it('turns br into a space', () => {
      expect(cleanBody('<p>Line one<br>line two</p>')[0]?.text).toBe('Line one line two');
    });

    it('drops whitespace-only text between blocks', () => {
      expect(cleanBody('<main>\n  <p>A</p>\n  <p>B</p>\n</main>')[0]?.children?.map((node) => node.kind)).toEqual([
        'paragraph',
        'paragraph',
      ]);
    });

    it('decodes entities', () => {
      expect(cleanBody('<p>Fish &amp; chips</p>')[0]?.text).toBe('Fish & chips');
    });
  });

  describe('junk is removed', () => {
    it('drops scripts, styles and other non-content elements with their content', () => {
      const tree = cleanBody(
        '<script>alert(1)</script><style>p{}</style><noscript>Enable JS</noscript><template><p>T</p></template>' +
          '<iframe src="https://x.com"></iframe><svg><title>Icon</title></svg><hr><!-- note --><p>Kept</p>',
      );
      expect(tree).toEqual([{ id: 'paragraph:1', kind: 'paragraph', tag: 'p', text: 'Kept' }]);
    });

    it('never copies event handlers', () => {
      const tree = cleanBody('<button onclick="steal()">Buy</button>');
      expect(tree).toEqual([{ id: 'button:1', kind: 'button', tag: 'button', text: 'Buy' }]);
      expect(JSON.stringify(tree)).not.toContain('steal');
    });

    it('turns javascript: links into their text', () => {
      const tree = cleanBody('<p><a href="javascript:steal()">Click</a></p>');
      expect(tree).toEqual([{ id: 'paragraph:1', kind: 'paragraph', tag: 'p', text: 'Click' }]);
      expect(JSON.stringify(tree)).not.toContain('javascript');
    });

    it('prunes elements left with no text and no meaningful children', () => {
      expect(cleanBody('<section><div></div><p>  </p></section><p>Kept</p>')).toEqual([
        { id: 'paragraph:1', kind: 'paragraph', tag: 'p', text: 'Kept' },
      ]);
    });
  });

  describe('links and images become absolute URLs', () => {
    it('resolves relative href and src against the base URL', () => {
      const [link, image] = cleanBody('<a href="/about">About</a><img src="chart.png">');
      expect(link?.attrs?.href).toBe('https://site.com/about');
      expect(image?.attrs?.src).toBe('https://site.com/blog/chart.png');
    });

    it('unwraps links that cannot be resolved (e.g. relative on the demo page)', () => {
      const tree = clean('<body><p><a href="/x">X</a></p></body>', 'sample:demo').root.children;
      expect(tree).toEqual([{ id: 'paragraph:1', kind: 'paragraph', tag: 'p', text: 'X' }]);
    });
  });

  describe('forms', () => {
    it('keeps fields as leaves, ignores option text and drops hidden inputs', () => {
      const [form] = cleanBody(
        '<form><input type="hidden" name="csrf" value="secret"><select name="plan"><option>Pro</option></select>' +
          '<textarea name="msg">typed</textarea><input type="submit" value="Send"></form>',
      );
      expect(form?.children).toEqual([
        { id: 'form:1>field:1', kind: 'field', tag: 'select', attrs: { label: 'plan' } },
        { id: 'form:1>field:2', kind: 'field', tag: 'textarea', attrs: { label: 'msg' } },
        { id: 'form:1>button:1', kind: 'button', tag: 'input', text: 'Send' },
      ]);
    });

    it('labels a field by aria-label, then label[for], wrapping label, placeholder, name', () => {
      const labels = cleanBody(
        '<form>' +
          '<label for="e">Email</label><input id="e" aria-label="Your email" name="a">' +
          '<label for="p">Phone</label><input id="p" placeholder="555" name="b">' +
          '<label>City <input placeholder="Paris" name="c"></label>' +
          '<input placeholder="Zip" name="d">' +
          '<input name="e">' +
          '<input>' +
          '</form>',
      )[0]
        ?.children?.filter((node) => node.kind === 'field')
        .map((field) => field.attrs?.label);
      expect(labels).toEqual(['Your email', 'Phone', 'City', 'Zip', 'e', undefined]);
    });

    it('records the type of an input, so a checkbox is not drawn as a text box', () => {
      const [form] = cleanBody(
        '<form><input type="checkbox" aria-label="Main menu"><input type="Radio" name="size">' +
          '<input name="q"><input type="email" name="e"><select name="plan"></select></form>',
      );
      expect(form?.children?.map((field) => field.attrs)).toEqual([
        { label: 'Main menu', inputType: 'checkbox' },
        { label: 'size', inputType: 'radio' },
        { label: 'q', inputType: 'text' },
        { label: 'e', inputType: 'email' },
        { label: 'plan' },
      ]);
    });
  });

  describe('addresses (ids)', () => {
    it('numbers each kind among its siblings, starting below the root', () => {
      const [main] = cleanBody('<main><h1>T</h1><p>A</p><p>B</p></main>');
      expect(main?.id).toBe('main:1');
      expect(main?.children?.map((node) => node.id)).toEqual(['main:1>heading:1', 'main:1>paragraph:1', 'main:1>paragraph:2']);
    });

    it('gives the same address when a paragraph gets wrapped in extra divs', () => {
      const plain = clean('<body><main><p>A</p><p>B</p></main></body>', BASE_URL);
      const wrapped = clean('<body><div><main><p>A</p><div class="x"><div><p>B</p></div></div></main></div></body>', BASE_URL);
      expect(wrapped).toEqual(plain);
      expect(wrapped.root.children?.[0]?.children?.[1]?.id).toBe('main:1>paragraph:2');
    });

    it('does not count pruned nodes', () => {
      const [main] = cleanBody('<main><p></p><p>A</p></main>');
      expect(main?.children?.[0]?.id).toBe('main:1>paragraph:1');
    });

    it('is deterministic', () => {
      const html = '<body><main><h1>T</h1><p>Read <a href="/a">a</a></p><img src="/i.png"></main></body>';
      expect(clean(html, BASE_URL)).toEqual(clean(html, BASE_URL));
    });
  });

  describe('root and title', () => {
    it('returns the page root with the base URL', () => {
      const tree = clean('<html><head><title>Home</title></head><body><p>Hi</p></body></html>', BASE_URL);
      expect(tree.url).toBe(BASE_URL);
      expect(tree.root).toMatchObject({ id: '', kind: 'page', tag: 'body' });
    });

    it('uses <title>, then the first heading, then the base URL', () => {
      expect(clean('<head><title> Home  page </title></head><body><h1>H</h1></body>', BASE_URL).title).toBe('Home page');
      expect(clean('<body><p>x</p><h2>First <em>heading</em></h2></body>', BASE_URL).title).toBe('First heading');
      expect(clean('<body><p>x</p></body>', BASE_URL).title).toBe(BASE_URL);
    });

    it('works without html or body tags', () => {
      expect(clean('<p>Fragment</p>', BASE_URL).root.children).toEqual([
        { id: 'paragraph:1', kind: 'paragraph', tag: 'p', text: 'Fragment' },
      ]);
    });
  });
});
