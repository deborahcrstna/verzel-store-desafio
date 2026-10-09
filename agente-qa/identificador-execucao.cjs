const { randomUUID } = require('node:crypto');

const VARIAVEL_ID_EXECUCAO = 'VERZEL_AAR_EXECUTION_ID';
const FORMATO_ID_EXECUCAO = /^\d{4}-\d{2}-\d{2}T[\d-]+Z-[a-f0-9-]{36}$/i;

function criarNovoIdExecucao() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${timestamp}-${randomUUID()}`;
}

function obterIdExecucao(ambiente = process.env) {
  const idHerdado = ambiente[VARIAVEL_ID_EXECUCAO];
  if (idHerdado !== undefined) {
    if (typeof idHerdado !== 'string' || !FORMATO_ID_EXECUCAO.test(idHerdado)) {
      throw new Error('O identificador herdado da execução possui formato inválido.');
    }
    return idHerdado;
  }

  const idExecucao = criarNovoIdExecucao();
  ambiente[VARIAVEL_ID_EXECUCAO] = idExecucao;
  return idExecucao;
}

module.exports = { criarNovoIdExecucao, obterIdExecucao, VARIAVEL_ID_EXECUCAO };
