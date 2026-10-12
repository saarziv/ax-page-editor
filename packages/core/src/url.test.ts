import { describe, expect, it } from 'vitest';
import { InvalidUrlError, normalizeUrl } from './url.js';

describe('normalizeUrl', () => {
  it('drops tracking params and the trailing slash, and assumes https without a scheme (spec AC)', () => {
    expect(normalizeUrl('example.com/page/?utm_source=x')).toBe('https://example.com/page');
  });

  it('lowercases the scheme and host but not the path', () => {
    expect(normalizeUrl('HTTPS://Example.COM/About')).toBe('https://example.com/About');
  });

  it('drops the fragment', () => {
    expect(normalizeUrl('https://example.com/page#top')).toBe('https://example.com/page');
  });

  it('drops utm_*, fbclid and gclid but keeps other params', () => {
    expect(normalizeUrl('https://example.com/p?utm_medium=a&id=7&fbclid=b&gclid=c')).toBe('https://example.com/p?id=7');
  });

  it('sorts the query', () => {
    expect(normalizeUrl('https://example.com/p?b=2&a=1')).toBe('https://example.com/p?a=1&b=2');
  });

  it('leaves no "?" when every param was tracking', () => {
    expect(normalizeUrl('https://example.com/p?utm_source=x&gclid=y')).toBe('https://example.com/p');
  });

  it('keeps the root slash', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('treats host:port without a scheme as a host', () => {
    expect(normalizeUrl('example.com:8080/x/')).toBe('https://example.com:8080/x');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeUrl('  https://example.com/a  ')).toBe('https://example.com/a');
  });

  it('passes sample: URLs through unchanged', () => {
    expect(normalizeUrl('sample:demo')).toBe('sample:demo');
  });

  it.each(['ftp://x', 'javascript:alert(1)', 'mailto:a@b.c', 'http://', '', '   '])(
    'rejects %j with InvalidUrlError',
    (rawUrl) => {
      expect(() => normalizeUrl(rawUrl)).toThrow(InvalidUrlError);
    },
  );

  it('is idempotent', () => {
    const once = normalizeUrl('Example.com/a/?z=1&utm_source=x&a=2#f');
    expect(normalizeUrl(once)).toBe(once);
  });
});
