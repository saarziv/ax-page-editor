import { describe, expect, it } from 'vitest';
import { configSchema, modificationSchema, saveConfigRequestSchema } from './schemas.js';

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

describe('saveConfigRequestSchema', () => {
  const hide = { id: 'm1', type: 'hide', target };
  const context = { id: 'm2', type: 'context', target, note: 'Customer growth from 1,200 to 8,500.' };

  it('accepts a url with a valid list of modifications, including an empty one', () => {
    expect(saveConfigRequestSchema.safeParse({ url: 'sample:demo', modifications: [hide, context] }).success).toBe(true);
    expect(saveConfigRequestSchema.safeParse({ url: 'sample:demo', modifications: [] }).success).toBe(true);
  });

  it('rejects an unknown type, a missing target and a 301-character note', () => {
    const unknownType = { id: 'm', type: 'blink', target };
    const missingTarget = { id: 'm', type: 'hide' };
    const longNote = { ...context, note: 'x'.repeat(301) };
    for (const modification of [unknownType, missingTarget, longNote]) {
      expect(saveConfigRequestSchema.safeParse({ url: 'sample:demo', modifications: [modification] }).success).toBe(false);
    }
  });

  it('rejects two modifications with the same id, since removing one would remove both', () => {
    const sameIdAsHide = { ...context, id: hide.id };
    expect(saveConfigRequestSchema.safeParse({ url: 'sample:demo', modifications: [hide, sameIdAsHide] }).success).toBe(false);
  });

  it('rejects an empty url', () => {
    expect(saveConfigRequestSchema.safeParse({ url: '', modifications: [] }).success).toBe(false);
  });
});

describe('configSchema', () => {
  const config = { version: 1, url: 'sample:demo', updatedAt: '2026-10-12T09:00:00.000Z', modifications: [{ id: 'm1', type: 'hide', target }] };

  it('accepts a stored configuration', () => {
    expect(configSchema.safeParse(config).success).toBe(true);
  });

  it('rejects an unknown version, a non-ISO updatedAt and repeated ids', () => {
    expect(configSchema.safeParse({ ...config, version: 2 }).success).toBe(false);
    expect(configSchema.safeParse({ ...config, updatedAt: 'yesterday' }).success).toBe(false);
    expect(configSchema.safeParse({ ...config, modifications: [...config.modifications, ...config.modifications] }).success).toBe(false);
  });
});
