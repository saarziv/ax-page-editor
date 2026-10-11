import { readFile } from 'node:fs/promises';
import { FetchError } from '../fetch/fetch-error.js';

// Same relative path from src/page and dist/page, so it works in dev, tests and the build.
const SAMPLES_DIR = new URL('../../../../samples/', import.meta.url);

// An allowlist, not a path: `sample:../secrets` must never turn into a file read.
const SAMPLE_NAMES = new Set(['demo']);

export const SAMPLE_PREFIX = 'sample:';

/** Reads a bundled sample page from disk. Never fetched, so it works offline (spec AC7). */
export async function loadSample(sampleUrl: string): Promise<string> {
  const name = sampleUrl.slice(SAMPLE_PREFIX.length);
  if (!SAMPLE_NAMES.has(name)) {
    throw new FetchError('INVALID_URL', `Unknown sample page: ${JSON.stringify(sampleUrl)}`);
  }
  return readFile(new URL(`${name}.html`, SAMPLES_DIR), 'utf8');
}
