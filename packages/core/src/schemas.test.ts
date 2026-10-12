import { describe, expect, it } from 'vitest';
import { modificationSchema } from './schemas.js';

const target = { selector: 'main:1>figure:1>image:1', text: 'Customer growth' };

describe('modificationSchema', () => {
  it('accepts one modification of each type', () => {
    expect(modificationSchema.safeParse({ id: 'm1', type: 'hide', target }).success).toBe(true);
    expect(modificationSchema.safeParse({ id: 'm2', type: 'context', target, note: 'Monthly customers.' }).success).toBe(true);
    expect(modificationSchema.safeParse({ id: 'm3', type: 'forward', target, href: 'https://example.com/terms' }).success).toBe(true);
  });

  it('rejects a context note that is empty or over 300 characters', () => {
    expect(modificationSchema.safeParse({ id: 'm', type: 'context', target, note: '' }).success).toBe(false);
    expect(modificationSchema.safeParse({ id: 'm', type: 'context', target, note: 'x'.repeat(301) }).success).toBe(false);
    expect(modificationSchema.safeParse({ id: 'm', type: 'context', target, note: 'x'.repeat(300) }).success).toBe(true);
  });

  it('rejects a forward href that is relative or not http(s)', () => {
    expect(modificationSchema.safeParse({ id: 'm', type: 'forward', target, href: '/terms' }).success).toBe(false);
    expect(modificationSchema.safeParse({ id: 'm', type: 'forward', target, href: 'javascript:alert(1)' }).success).toBe(false);
    expect(modificationSchema.safeParse({ id: 'm', type: 'forward', target, href: 'ftp://example.com/file' }).success).toBe(false);
  });

  it('rejects a target text over 60 characters, since the snippet is at most 60', () => {
    const longTarget = { selector: 'aside:1', text: 'x'.repeat(61) };
    expect(modificationSchema.safeParse({ id: 'm', type: 'hide', target: longTarget }).success).toBe(false);
  });
});
