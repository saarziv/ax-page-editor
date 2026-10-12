import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { Config } from '@ax/core';

/** Opens the SQLite file at `databasePath`, creating its folder and the table on first run. */
export function openConfigDatabase(databasePath: string): Database.Database {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  createConfigTable(database);
  return database;
}

// updated_at is copied out of the JSON so the saved pages list can be sorted without reading every document.
export function createConfigTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS page_configs (
      url TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

/** One configuration per page URL. Hides SQLite from the controller, so the store could be swapped later. */
export class ConfigRepository {
  constructor(private readonly database: Database.Database) {}

  // url is the primary key, so saving a page again overwrites its row and can never add a second one.
  save(config: Config): void {
    this.database
      .prepare(
        `INSERT INTO page_configs (url, config, updated_at) VALUES (@url, @config, @updatedAt)
         ON CONFLICT(url) DO UPDATE SET config = excluded.config, updated_at = excluded.updated_at`,
      )
      .run({ url: config.url, config: JSON.stringify(config), updatedAt: config.updatedAt });
  }
}
