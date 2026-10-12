import { describe, expect, it } from 'vitest';
import { formatChangeCount, formatSavedAgo } from './savedPageLabels';

const now = new Date('2026-10-12T12:00:00.000Z');
const savedBefore = (milliseconds: number) => new Date(now.getTime() - milliseconds).toISOString();

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatSavedAgo', () => {
  it('says "just now" under a minute', () => {
    expect(formatSavedAgo(savedBefore(30 * SECOND), now)).toBe('just now');
  });

  it('counts minutes, then hours', () => {
    expect(formatSavedAgo(savedBefore(5 * MINUTE), now)).toBe('5 minutes ago');
    expect(formatSavedAgo(savedBefore(1 * MINUTE), now)).toBe('1 minute ago');
    expect(formatSavedAgo(savedBefore(2 * HOUR), now)).toBe('2 hours ago');
  });

  it('counts days, with "yesterday" for one', () => {
    expect(formatSavedAgo(savedBefore(1 * DAY), now)).toBe('yesterday');
    expect(formatSavedAgo(savedBefore(3 * DAY), now)).toBe('3 days ago');
  });

  // The server's clock decides updatedAt, so it can be slightly ahead of the browser's.
  it('says "just now" for a save time slightly in the future', () => {
    expect(formatSavedAgo(savedBefore(-5 * SECOND), now)).toBe('just now');
  });
});

describe('formatChangeCount', () => {
  it('uses the singular only for one', () => {
    expect(formatChangeCount(1)).toBe('1 change');
    expect(formatChangeCount(0)).toBe('0 changes');
    expect(formatChangeCount(3)).toBe('3 changes');
  });
});
