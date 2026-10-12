import { BadRequestException, NotFoundException } from '@nestjs/common';
import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { configSchema, type Modification } from '@ax/core';
import { ConfigRepository, createConfigTable } from './config.repository.js';
import { ConfigsController } from './configs.controller.js';

const hide: Modification = { id: 'm1', type: 'hide', target: { selector: 'aside:1', text: 'We use cookies' } };
const context: Modification = {
  id: 'm2',
  type: 'context',
  target: { selector: 'main:1>figure:1>image:1', text: 'Customer growth' },
  note: 'Customer growth from 1,200 to 8,500.',
};

type StoredRow = { url: string; config: string; updated_at: string };

describe('ConfigsController.save', () => {
  let database: Database.Database;
  let controller: ConfigsController;
  const storedRows = () => database.prepare('SELECT url, config, updated_at FROM page_configs').all() as StoredRow[];

  beforeEach(() => {
    database = new Database(':memory:');
    createConfigTable(database);
    controller = new ConfigsController(new ConfigRepository(database));
  });

  it('stores the full configuration, with version and updatedAt, under the normalized url', () => {
    const saved = controller.save({ url: 'acme.com/pricing/?utm_source=x', modifications: [hide, context] });

    expect(saved).toEqual({ version: 1, url: 'https://acme.com/pricing', updatedAt: expect.any(String), modifications: [hide, context] });
    expect(configSchema.safeParse(saved).success).toBe(true);

    const rows = storedRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.url).toBe('https://acme.com/pricing');
    expect(rows[0]?.updated_at).toBe(saved.updatedAt);
    expect(JSON.parse(rows[0]?.config ?? '')).toEqual(saved);
  });

  it('replaces the stored configuration when the same url is saved again', () => {
    controller.save({ url: 'https://acme.com/pricing', modifications: [hide, context] });
    const second = controller.save({ url: 'acme.com/pricing/', modifications: [hide] });

    const rows = storedRows();
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0]?.config ?? '')).toEqual(second);
  });

  it('rejects a url that is not a web address with a 400 INVALID_REQUEST', () => {
    expect(() => controller.save({ url: 'ftp://acme.com', modifications: [] })).toThrow(BadRequestException);
    expect(storedRows()).toHaveLength(0);
  });
});

describe('ConfigsController.findByUrl', () => {
  let controller: ConfigsController;

  beforeEach(() => {
    const database = new Database(':memory:');
    createConfigTable(database);
    controller = new ConfigsController(new ConfigRepository(database));
  });

  it('returns the configuration saved for an equivalent url (tracking parameter, trailing slash)', () => {
    const saved = controller.save({ url: 'https://acme.com/pricing', modifications: [hide, context] });

    expect(controller.findByUrl('acme.com/pricing/?utm_source=x')).toEqual(saved);
  });

  it('answers 404 NOT_FOUND for a url with nothing saved', () => {
    controller.save({ url: 'https://acme.com/pricing', modifications: [hide] });

    expect(() => controller.findByUrl('https://acme.com/terms')).toThrow(NotFoundException);
  });

  it('rejects a url that is not a web address with a 400 INVALID_REQUEST', () => {
    expect(() => controller.findByUrl('ftp://acme.com')).toThrow(BadRequestException);
  });
});
