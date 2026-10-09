'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');
const { criarNovoIdExecucao, VARIAVEL_ID_EXECUCAO } = require('./identificador-execucao.cjs');

const raizProjeto = path.resolve(__dirname, '..');
const cliPlaywright = path.join(raizProjeto, 'node_modules', '@playwright', 'test', 'cli.js');

function executarPlaywright(argumentos, opcoes = {}) {
  if (!Array.isArray(argumentos) || argumentos.some((argumento) => typeof argumento !== 'string')) {
    throw new TypeError('Os argumentos do Playwright devem ser uma lista de textos.');
  }

  const idExecucao = criarNovoIdExecucao();
  const env = { ...process.env, ...(opcoes.envBase || {}), [VARIAVEL_ID_EXECUCAO]: idExecucao };
  const spawnProcesso = opcoes.spawnProcess || spawn;
  const processo = spawnProcesso(process.execPath, [cliPlaywright, ...argumentos], {
    cwd: opcoes.cwd || raizProjeto,
    env,
    stdio: opcoes.stdio || 'inherit',
    windowsHide: true,
    shell: false,
  });

  return new Promise((resolve, reject) => {
    processo.once('error', reject);
    processo.once('close', (codigo, sinal) => {
      resolve({ idExecucao, codigoSaida: codigo ?? 1, sinal: sinal || null });
    });
  });
}

if (require.main === module) {
  executarPlaywright(process.argv.slice(2)).then(({ codigoSaida }) => {
    process.exitCode = codigoSaida;
  }).catch((erro) => {
    console.error(`Não foi possível iniciar o Playwright: ${erro.message}`);
    process.exitCode = 1;
  });
}

module.exports = { executarPlaywright };
