import { describe, expect, it } from 'vitest';
import { agentViewUrl } from './agentViewUrl';

describe('agentViewUrl', () => {
  it('opens Agent View for a sample page', () => {
    expect(agentViewUrl('sample:demo')).toBe('http://localhost:3001/agentView?url=sample%3Ademo');
  });

  // Unencoded, `lang=en` would become a second parameter of Agent View's own query string.
  it("encodes the page URL's own query string so it doesn't leak into Agent View's", () => {
    expect(agentViewUrl('https://acme.com/p?id=2&lang=en')).toBe(
      'http://localhost:3001/agentView?url=https%3A%2F%2Facme.com%2Fp%3Fid%3D2%26lang%3Den',
    );
  });
});
