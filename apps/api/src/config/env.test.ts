import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('falls back to the documented defaults when nothing is set', () => {
    expect(parseEnv({})).toEqual({
      API_PORT: 3001,
      WEB_ORIGIN: 'http://localhost:5173',
      DB_PATH: './data/ax.db',
    });
  });

  it('reads the port as a number', () => {
    expect(parseEnv({ API_PORT: '4000' }).API_PORT).toBe(4000);
  });

  it.each(['abc', '0', '70000', '30.5'])('rejects API_PORT=%s', (port) => {
    expect(() => parseEnv({ API_PORT: port })).toThrow(/API_PORT/);
  });

  it('reduces WEB_ORIGIN to a bare origin so it matches the browser Origin header', () => {
    expect(parseEnv({ WEB_ORIGIN: 'http://localhost:5173/' }).WEB_ORIGIN).toBe('http://localhost:5173');
  });

  it('rejects a WEB_ORIGIN that is not a URL', () => {
    expect(() => parseEnv({ WEB_ORIGIN: 'localhost' })).toThrow(/WEB_ORIGIN/);
  });
});
