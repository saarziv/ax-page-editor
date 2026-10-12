import { beforeEach, describe, expect, it } from 'vitest';
import type { Modification, Target } from '@ax/core';
import { hasUnsavedChanges, useEditorStore } from './store';

const chart: Target = { selector: 'main:1>figure:1>image:1', text: 'Customer growth' };
const banner: Target = { selector: 'aside:1', text: 'We use cookies to improve your experience. By continuing you' };
const termsLink: Target = { selector: 'main:1>paragraph:2>link:1', text: 'terms of service' };
const termsHref = 'https://www.iana.org/help/example-domains';

const { loadSavedModifications, markSaved, removeModification, setContext, setUrl, toggleForward, toggleHide } = useEditorStore.getState();
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

describe('toggleForward', () => {
  beforeEach(() => setUrl('sample:demo'));

  it('adds one forward with the link’s href, and removes it on the next call', () => {
    toggleForward(termsLink, termsHref);
    expect(modificationsDraft()).toEqual([{ id: expect.any(String), type: 'forward', target: termsLink, href: termsHref }]);

    toggleForward(termsLink, termsHref);
    expect(modificationsDraft()).toEqual([]);
  });

  it('never gives a link two forwards', () => {
    toggleForward(termsLink, termsHref);
    toggleForward(termsLink, termsHref);
    toggleForward(termsLink, termsHref);

    expect(modificationsDraft().filter((modification) => modification.type === 'forward')).toHaveLength(1);
  });

  it('leaves a hide and a note on the same link alone', () => {
    toggleHide(termsLink);
    setContext(termsLink, 'Our refund rules');
    toggleForward(termsLink, termsHref);
    toggleForward(termsLink, termsHref);

    expect(modificationsDraft()).toEqual([
      { id: expect.any(String), type: 'hide', target: termsLink },
      { id: expect.any(String), type: 'context', target: termsLink, note: 'Our refund rules' },
    ]);
  });
});

describe('removeModification', () => {
  beforeEach(() => setUrl('sample:demo'));

  it('drops only the entry with that id', () => {
    toggleHide(banner);
    setContext(chart, 'Customer growth');
    const [bannerHide, chartContext] = modificationsDraft();

    removeModification(bannerHide!.id);

    expect(modificationsDraft()).toEqual([chartContext]);
  });

  it('leaves the draft unchanged for an unknown id', () => {
    toggleHide(banner);
    const draftBefore = modificationsDraft();

    removeModification('not-a-real-id');

    expect(modificationsDraft()).toEqual(draftBefore);
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

  it('is true after removing a saved change', () => {
    toggleHide(banner);
    markSaved(modificationsDraft());

    removeModification(modificationsDraft()[0]!.id);
    expect(isDirty()).toBe(true);
  });

  it('is false after opening another page, even with an earlier unsaved draft', () => {
    toggleHide(banner);
    setUrl('https://example.com');

    expect(isDirty()).toBe(false);
  });
});

describe('loadSavedModifications', () => {
  beforeEach(() => setUrl('sample:demo'));
  const savedModifications: Modification[] = [
    { id: 'a1', type: 'hide', target: banner },
    { id: 'b2', type: 'context', target: chart, note: 'Customer growth' },
  ];

  it('fills the draft with the saved changes, with the dirty flag off', () => {
    loadSavedModifications('sample:demo', savedModifications);

    expect(modificationsDraft()).toEqual(savedModifications);
    expect(useEditorStore.getState().restoredPageUrl).toBe('sample:demo');
    expect(hasUnsavedChanges(useEditorStore.getState())).toBe(false);
  });

  it('counts an edit after the restore as unsaved', () => {
    loadSavedModifications('sample:demo', savedModifications);
    removeModification('a1');

    expect(hasUnsavedChanges(useEditorStore.getState())).toBe(true);
  });

  it('is undone by opening a page, so the next page is restored fresh', () => {
    loadSavedModifications('sample:demo', savedModifications);
    setUrl('sample:demo');

    expect(useEditorStore.getState().restoredPageUrl).toBeNull();
    expect(modificationsDraft()).toEqual([]);
  });
});
