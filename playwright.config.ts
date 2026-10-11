import { defineConfig } from '@playwright/test';

// reuseExistingServer lets the test run against the dev's own `pnpm dev`;
// servers Playwright starts itself are stopped when the run ends.
export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    // The smoke test takes under a second; SLOW_MO makes `pnpm e2e:headed` watchable.
    launchOptions: { slowMo: Number(process.env.SLOW_MO ?? 0) },
  },
  webServer: [
    {
      command: 'pnpm --filter @ax/core build && pnpm --filter @ax/api dev',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: true,
    },
    {
      command: 'pnpm --filter @ax/web dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
  ],
});
