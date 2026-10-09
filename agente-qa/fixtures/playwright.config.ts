import { defineConfig } from '@playwright/test';
import path from 'node:path';
import rootConfig from '../../playwright.config';

const { obterIdExecucao } = require('../identificador-execucao.cjs');
const idExecucao = obterIdExecucao();
const raizProjeto = path.resolve(__dirname, '../..');
const pastaExecucao = path.join(raizProjeto, 'playwright-report', 'execucoes', idExecucao);

export default defineConfig({
  ...rootConfig,
  testDir: __dirname,
  testMatch: 'identificador-execucao.spec.cjs',
  outputDir: path.join(raizProjeto, 'test-results', 'execucoes', idExecucao),
  reporter: [
    ['html', { open: 'never', outputFolder: path.join(pastaExecucao, 'html') }],
    ['json', { outputFile: path.join(pastaExecucao, 'resultado.json') }],
  ],
});
