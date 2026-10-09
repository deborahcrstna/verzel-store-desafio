'use strict';

const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { obterIdExecucao } = require('../identificador-execucao.cjs');

const raizProjeto = path.resolve(__dirname, '../..');

async function validarIdNoOutputDir(testInfo, nomeAnexo) {
  const idExecucao = obterIdExecucao();
  const relativo = path.relative(raizProjeto, testInfo.outputDir).replaceAll('\\', '/');
  const pastaId = /^test-results\/execucoes\/([^/]+)\//.exec(relativo)?.[1];

  expect(pastaId, 'outputDir do teste deve conter a pasta da execução').toBe(idExecucao);
  await testInfo.attach(nomeAnexo, { body: idExecucao, contentType: 'text/plain' });
}

test('primeiro worker usa o ID da invocação em outputDir', async ({}, testInfo) => {
  await validarIdNoOutputDir(testInfo, 'id-execucao-worker-1');
});

test('segundo worker usa o mesmo ID da invocação em outputDir', async ({}, testInfo) => {
  await validarIdNoOutputDir(testInfo, 'id-execucao-worker-2');
});
