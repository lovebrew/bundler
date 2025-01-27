import { defineConfig } from '@playwright/test';

const browser = process.env.BROWSER || 'chromium';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  workers: undefined,

  reporter: 'html',

  use: {
    browserName: browser as 'chromium' | 'firefox' | 'webkit',
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
    headless: false,
  },
});
