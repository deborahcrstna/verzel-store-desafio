import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Preserva o exemplo do instalador sem incluí-lo na suíte do desafio.
  testIgnore: '**/example.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'https://verzel-store.qa-test-verzel-store.workers.dev',
    screenshot: 'only-on-failure',
    // Também preserva falhas locais, mesmo quando retries = 0.
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
