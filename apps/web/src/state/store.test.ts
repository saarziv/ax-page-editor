import { beforeEach, describe, expect, it } from 'vitest';
import type { Target } from '@ax/core';
import { hasUnsavedChanges, useEditorStore } from './store';

const chart: Target = { selector: 'main:1>figure:1>image:1', text: 'Customer growth' };
const banner: Target = { selector: 'aside:1', text: 'We use cookies to improve your experience. By continuing you' };

const { markSaved, setContext, setUrl, toggleHide } = useEditorStore.getState();
const modificationsDraft = () => useEditorStore.getState().modificationsDraft;

describe('setContext', () => {
  beforeEach(() => useEditorStore.setState({ modificationsDraft: [] }));

  it('adds one context entry for an element that has no note yet', () => {
    setContext(chart, 'Customer growth');

    expect(modificationsDraft()).toEqual([{ id: expect.any(String), type: 'context', target: chart, note: 'Customer growth' }]);
  });

  it('replaces the note of the same element and keeps its id (K10)', () => {
    setContext(chart, 'Customer');
    const firstId = modificationsDraft()[0]?.id;

    setContext(chart, 'Customer growth from 1,200 to 8,500');

    expect(modificationsDraft()).toEqual([{ id: firstId, type: 'context', target: chart, note: 'Customer growth from 1,200 to 8,500' }]);
  });

  it('keeps the note as typed, so a trailing space survives while typing', () => {
    setContext(chart, 'Customer ');

    expect(modificationsDraft()[0]).toMatchObject({ note: 'Customer ' });
  });

  it('removes the entry when the note is empty or only whitespace', () => {
    setContext(chart, 'Customer growth');
    setContext(chart, '');
    expect(modificationsDraft()).toEqual([]);

    setContext(chart, 'Customer growth');
    setContext(chart, '   ');
    expect(modificationsDraft()).toEqual([]);
  });

  it('leaves other elements and the same element’s hide alone', () => {
    toggleHide(chart);
    setContext(banner, 'Cookie notice');
    setContext(chart, 'Customer growth');
    setContext(chart, '');

    expect(modificationsDraft()).toEqual([
      { id: expect.any(String), type: 'hide', target: chart },
      { id: expect.any(String), type: 'context', target: banner, note: 'Cookie notice' },
    ]);
  });
});

describe('hasUnsavedChanges', () => {
  beforeEach(() => setUrl('sample:demo'));
  const isDirty = () => hasUnsavedChanges(useEditorStore.getState());

  it('is false on a freshly opened page with no changes', () => {
    expect(isDirty()).toBe(false);
  });

  it('is true after a change, and false again once that draft is saved', () => {
    toggleHide(banner);
    expect(isDirty()).toBe(true);

    markSaved(modificationsDraft());
    expect(isDirty()).toBe(false);
  });

  it('is true when a change is made after the saved copy was sent', () => {
    toggleHide(banner);
    const sentModifications = modificationsDraft();
    setContext(chart, 'Customer growth');

    markSaved(sentModifications);
    expect(isDirty()).toBe(true);
  });

  it('is true when every saved change is removed again', () => {
    toggleHide(banner);
    markSaved(modificationsDraft());
    toggleHide(banner);

    expect(isDirty()).toBe(true);
  });

  it('is false after opening another page, even with an earlier unsaved draft', () => {
    toggleHide(banner);
    setUrl('https://example.com');

    expect(isDirty()).toBe(false);
  });
});
