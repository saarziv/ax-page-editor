import { describe, expect, it } from 'vitest';
import { forwardBlockReason } from './forward.js';

const NOT_A_PAGE = "This link doesn't lead to a page.";
const pageUrl = 'https://acme.com/';

describe('forwardBlockReason', () => {
  it('allows a link to another site or another page on this site', () => {
    expect(forwardBlockReason('https://www.iana.org/help/example-domains', pageUrl)).toBeNull();
    expect(forwardBlockReason('https://acme.com/terms', pageUrl)).toBeNull();
    expect(forwardBlockReason('http://acme.com/terms', pageUrl)).toBeNull();
  });

  it('blocks links that are not http(s)', () => {
    expect(forwardBlockReason('mailto:hi@acme.com', pageUrl)).toBe(NOT_A_PAGE);
    expect(forwardBlockReason('tel:+123', pageUrl)).toBe(NOT_A_PAGE);
    expect(forwardBlockReason('javascript:alert(1)', pageUrl)).toBe(NOT_A_PAGE);
    expect(forwardBlockReason('ftp://acme.com/file', pageUrl)).toBe(NOT_A_PAGE);
  });

  it('blocks an anchor on this page, which clean has already resolved to a full address', () => {
    expect(forwardBlockReason('https://acme.com/#pricing', pageUrl)).toBe(NOT_A_PAGE);
    expect(forwardBlockReason('https://acme.com/#', pageUrl)).toBe(NOT_A_PAGE);
    // The page url is normalized, the href isn't: a trailing slash or tracking param still means this page.
    expect(forwardBlockReason('https://acme.com/pricing/?utm_source=x#plans', 'https://acme.com/pricing')).toBe(NOT_A_PAGE);
  });

  it('allows an anchor on another page', () => {
    expect(forwardBlockReason('https://acme.com/terms#refunds', pageUrl)).toBeNull();
  });

  it('blocks an href that is not a valid address', () => {
    expect(forwardBlockReason('not a url', pageUrl)).toBe(NOT_A_PAGE);
  });
});
