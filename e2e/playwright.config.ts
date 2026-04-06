import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.APP_URL ?? 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'bff-only',
      grep: /@bff/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'full-stack',
      grep: /@proxy/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
