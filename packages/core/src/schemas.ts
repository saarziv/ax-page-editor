import { z } from 'zod';

export const nodeKindSchema = z.enum([
  'heading', 'paragraph', 'link', 'image', 'list', 'listItem',
  'table', 'row', 'cell', 'form', 'field', 'button', 'quote', 'code',
  'section', 'article', 'nav', 'header', 'footer', 'aside', 'main', 'figure',
  'text',
  'page', // the root only
  // Inserted by markModificationsInTree, never produced by clean.
  'annotation', 'forwarded',
]);

export type PageNode = {
  id: string;
  kind: z.infer<typeof nodeKindSchema>;
  tag: string;
  text?: string;
  attrs?: {
    href?: string; src?: string; alt?: string; level?: number; label?: string; inputType?: string; width?: number; height?: number;
    // annotation only: the element the note explains, and its target text when the note sits after an enclosing block.
    forId?: string; about?: string;
  };
  children?: PageNode[];
  // Set by markModificationsInTree on a hidden element, which stays in place so the preview can still draw it.
  hidden?: true;
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
        inputType: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        forId: z.string().optional(),
        about: z.string().optional(),
      })
      .optional(),
    children: z.array(pageNodeSchema).optional(),
    hidden: z.literal(true).optional(),
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

// A saved pointer to one element: its selector in the clean tree plus a text snippet that must still match (global plan §3.3).
export const targetSchema = z.object({
  selector: z.string(),
  text: z.string().max(60),
});

export type Target = z.infer<typeof targetSchema>;

const absoluteHttpUrlSchema = z.string().refine(isAbsoluteHttpUrl, { message: 'Must be an absolute http(s) URL' });

function isAbsoluteHttpUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const { protocol } = new URL(value);
  return protocol === 'http:' || protocol === 'https:';
}

// Spec D8. Exported so the Context box stops input at the same limit the schema enforces.
export const CONTEXT_NOTE_MAX_LENGTH = 300;

export const modificationSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string(), type: z.literal('hide'), target: targetSchema }),
  z.object({ id: z.string(), type: z.literal('context'), target: targetSchema, note: z.string().min(1).max(CONTEXT_NOTE_MAX_LENGTH) }),
  z.object({ id: z.string(), type: z.literal('forward'), target: targetSchema, href: absoluteHttpUrlSchema }),
]);

export type Modification = z.infer<typeof modificationSchema>;

// What markModificationsInTree did with one modification (global plan §3.4).
export const modificationStatusSchema = z.enum(['active', 'inactive', 'unmatched', 'overBudget', 'failed']);

export type ModificationStatus = z.infer<typeof modificationStatusSchema>;
