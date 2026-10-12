import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Config, Modification } from '@ax/core';
import { ConfigRepository, createConfigTable } from './config.repository.js';

const hide: Modification = { id: 'm1', type: 'hide', target: { selector: 'aside:1', text: 'We use cookies' } };
const context: Modification = { id: 'm2', type: 'context', target: { selector: 'main:1', text: 'Pricing' }, note: 'Prices in USD.' };

function configFor(url: string, updatedAt: string, modifications: Modification[]): Config {
  return { version: 1, url, updatedAt, modifications };
}

describe('ConfigRepository.listSummaries', () => {
  let repository: ConfigRepository;

  beforeEach(() => {
    const database = new Database(':memory:');
    createConfigTable(database);
    repository = new ConfigRepository(database);
  });

  it('gives an empty list when nothing is saved', () => {
    expect(repository.listSummaries()).toEqual([]);
  });

  it('lists pages newest first, with their modification counts', () => {
    repository.save(configFor('sample:demo', '2026-10-12T09:00:00.000Z', [hide]));
    repository.save(configFor('https://example.com', '2026-10-12T10:00:00.000Z', [hide, context]));
    repository.save(configFor('https://acme.com/terms', '2026-10-11T09:00:00.000Z', [context]));

    expect(repository.listSummaries()).toEqual([
      { url: 'https://example.com', updatedAt: '2026-10-12T10:00:00.000Z', modificationCount: 2 },
      { url: 'sample:demo', updatedAt: '2026-10-12T09:00:00.000Z', modificationCount: 1 },
      { url: 'https://acme.com/terms', updatedAt: '2026-10-11T09:00:00.000Z', modificationCount: 1 },
    ]);
  });

  it('counts 0 for an empty configuration', () => {
    repository.save(configFor('sample:demo', '2026-10-12T09:00:00.000Z', []));

    expect(repository.listSummaries()).toEqual([{ url: 'sample:demo', updatedAt: '2026-10-12T09:00:00.000Z', modificationCount: 0 }]);
  });

  it('moves a page to the top when it is saved again', () => {
    repository.save(configFor('sample:demo', '2026-10-12T09:00:00.000Z', [hide]));
    repository.save(configFor('https://example.com', '2026-10-12T10:00:00.000Z', [hide]));
    repository.save(configFor('sample:demo', '2026-10-12T11:00:00.000Z', []));

    expect(repository.listSummaries().map((summary) => summary.url)).toEqual(['sample:demo', 'https://example.com']);
  });
});
