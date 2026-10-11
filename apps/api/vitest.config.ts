import { defineConfig } from 'vitest/config';

// Only src: stale build output in dist/ must never be picked up as tests.
// passWithNoTests: tests arrive with real logic, not as placeholders.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], passWithNoTests: true },
});
