import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: '.env' });

const webPort = Number(process.env.E2E_WEB_PORT) || 8081;

export default defineConfig({
  testDir: 'e2e/',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['blob', { outputDir: 'e2e/blob-report' }], ['github']]
    : [['html', { open: 'never' }]],

  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testDir: '.', // Look in e2e/ root for setup files
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/primary-state.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/primary-state.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/primary-state.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        storageState: 'e2e/.auth/primary-state.json',
      },
      dependencies: ['setup'],
    },
    /* Test against branded browsers. */
    {
      name: 'google chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' }, // or 'chrome-beta'
    },
    {
      name: 'microsoft edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' }, // or 'msedge-dev'
    },
  ],

  // In CI, the web server is started by the workflow (build + serve)
  // Locally, Playwright starts the dev server
  webServer: process.env.CI
    ? undefined
    : {
        command: `RCT_METRO_PORT=${webPort} EXPO_DEV_SERVER_PORT=${webPort} EXPO_WEB_PORT=${webPort} pnpm web -- --port ${webPort}`,
        url: `http://localhost:${webPort}`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
