import type { Modification } from '@ax/core';

// Served from disk by the api (samples/demo.html), so it opens without any network fetch.
export const DEMO_URL = 'sample:demo';

// Stand-in for real controls until 03: one modification of each type, written like a saved config,
// so the markers and change lists can be seen on the demo. 03 deletes this file.
// Targets are the demo's clean-tree selectors and their 60-character snippets; editing demo.html can unmatch them.
export const DEMO_MODIFICATIONS: Modification[] = [
  {
    id: 'demo-hide-cookie-banner',
    type: 'hide',
    target: { selector: 'aside:1', text: 'We use cookies to improve your experience. By continuing you' },
  },
  {
    id: 'demo-context-growth-chart',
    type: 'context',
    target: { selector: 'main:1>figure:1>image:1', text: 'Customer growth' },
    note: 'Paying customers per month in 2026, growing from 1,200 in January to 4,800 in September.',
  },
  {
    id: 'demo-forward-analytics-guide',
    type: 'forward',
    target: { selector: 'main:1>section:1>paragraph:1>link:2', text: 'guide to web analytics' },
    href: 'https://en.wikipedia.org/wiki/Web_analytics',
  },
];
