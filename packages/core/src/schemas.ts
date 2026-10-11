import { z } from 'zod';

export const nodeKindSchema = z.enum([
  'heading', 'paragraph', 'link', 'image', 'list', 'listItem',
  'table', 'row', 'cell', 'form', 'field', 'button', 'quote', 'code',
  'section', 'article', 'nav', 'header', 'footer', 'aside', 'main', 'figure',
  'text',
  'page', // the root only
  // Inserted by transform, never produced by clean.
  'annotation', 'forwarded',
]);

export type PageNode = {
  id: string;
  kind: z.infer<typeof nodeKindSchema>;
  tag: string;
  text?: string;
  attrs?: { href?: string; src?: string; alt?: string; level?: number; label?: string };
  children?: PageNode[];
};

// A node contains nodes, so the schema refers to itself: z.lazy delays that reference until first use.
// TS can't infer a self-referencing type, so PageNode is written by hand and the schema is checked against it.
export const pageNodeSchema: z.ZodType<PageNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    kind: nodeKindSchema,
    tag: z.string(),
    text: z.string().optional(),
    attrs: z
      .object({
        href: z.string().optional(),
        src: z.string().optional(),
        alt: z.string().optional(),
        level: z.number().optional(),
        label: z.string().optional(),
      })
      .optional(),
    children: z.array(pageNodeSchema).optional(),
  }),
);

export const pageTreeSchema = z.object({
  url: z.string(),
  title: z.string(),
  root: pageNodeSchema,
});

export type PageTree = z.infer<typeof pageTreeSchema>;

// Why a page couldn't be loaded. The api sends it as `{ code, message }`; the web maps it to the spec's plain-language messages.
export const fetchErrorCodeSchema = z.enum(['INVALID_URL', 'BLOCKED', 'NOT_HTML', 'TOO_LARGE', 'TIMEOUT', 'UNREACHABLE']);

export type FetchErrorCode = z.infer<typeof fetchErrorCodeSchema>;
