import { defineConfig, devices } from '@playwright/test';
const { obterIdExecucao } = require('./agente-qa/identificador-execucao.cjs');

const idExecucao = obterIdExecucao();
const pastaExecucao = `playwright-report/execucoes/${idExecucao}`;
const pastaResultados = `test-results/execucoes/${idExecucao}`;

export default defineConfig({
  testDir: './tests',
  outputDir: pastaResultados,
  // Preserva o exemplo do instalador sem incluí-lo na suíte do desafio.
  testIgnore: '**/example.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never', outputFolder: `${pastaExecucao}/html` }],
    ['json', { outputFile: `${pastaExecucao}/resultado.json` }],
  ],
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
