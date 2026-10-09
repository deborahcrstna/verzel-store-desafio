'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
  criarNovoIdExecucao,
  obterIdExecucao,
  VARIAVEL_ID_EXECUCAO,
} = require('./identificador-execucao.cjs');
const { executarPlaywright } = require('./executar-playwright.cjs');

test('uma invocação gera e registra um identificador válido', () => {
  const ambiente = {};
  const id = obterIdExecucao(ambiente);

  assert.match(id, /^\d{4}-\d{2}-\d{2}T[\d-]+Z-[a-f0-9-]{36}$/i);
  assert.equal(ambiente[VARIAVEL_ID_EXECUCAO], id);
});

test('a configuração reutiliza o ID herdado sem depender do marcador do worker', () => {
  const id = criarNovoIdExecucao();
  const ambiente = { [VARIAVEL_ID_EXECUCAO]: id };

  assert.equal(obterIdExecucao(ambiente), id);
  assert.equal(obterIdExecucao(ambiente), id);
});

test('invocações independentes recebem IDs diferentes', () => {
  const idA = obterIdExecucao({});
  const idB = obterIdExecucao({});

  assert.notEqual(idA, idB);
});

test('launchers simultâneos recebem IDs distintos mesmo com ambiente-base igual', async () => {
  const iniciarFake = () => {
    const processoFalso = new EventEmitter();
    process.nextTick(() => processoFalso.emit('close', 0, null));
    return processoFalso;
  };
  const opcoes = {
    envBase: { [VARIAVEL_ID_EXECUCAO]: 'id-herdado-antigo' },
    spawnProcess: iniciarFake,
    stdio: 'ignore',
  };

  const [a, b] = await Promise.all([
    executarPlaywright(['test'], opcoes),
    executarPlaywright(['test'], opcoes),
  ]);

  assert.notEqual(a.idExecucao, b.idExecucao);
});

test('ID herdado malformado é rejeitado', () => {
  assert.throws(
    () => obterIdExecucao({ [VARIAVEL_ID_EXECUCAO]: 'id-invalido' }),
    /identificador herdado.*formato inválido/i,
  );
});

test('o launcher injeta um ID novo explicitamente no processo Playwright', async () => {
  let chamadaCapturada;
  const processoFalso = new EventEmitter();
  const executar = executarPlaywright(['test', '--list'], {
    envBase: { [VARIAVEL_ID_EXECUCAO]: 'id-antigo' },
    spawnProcess: (comando, argumentos, opcoes) => {
      chamadaCapturada = { comando, argumentos, opcoes };
      process.nextTick(() => processoFalso.emit('close', 0, null));
      return processoFalso;
    },
    stdio: 'ignore',
  });

  const resultado = await executar;
  assert.match(resultado.idExecucao, /^\d{4}-\d{2}-\d{2}T[\d-]+Z-[a-f0-9-]{36}$/i);
  assert.equal(chamadaCapturada.opcoes.env[VARIAVEL_ID_EXECUCAO], resultado.idExecucao);
  assert.notEqual(chamadaCapturada.opcoes.env[VARIAVEL_ID_EXECUCAO], 'id-antigo');
  assert.equal(chamadaCapturada.opcoes.shell, false);
  assert.deepEqual(chamadaCapturada.argumentos.slice(1), ['test', '--list']);
  assert.equal(resultado.codigoSaida, 0);
});

test('execução local comprova o mesmo ID no relatório e nos workers Playwright', async () => {
  const resultado = await executarPlaywright([
    'test',
    '--config', 'agente-qa/fixtures/playwright.config.ts',
    '--workers=2',
  ], { stdio: 'ignore' });

  assert.equal(resultado.codigoSaida, 0, `Playwright local terminou com ${resultado.codigoSaida}.`);

  const pastaExecucao = resultado.idExecucao;
  const raizRelatorios = require('node:path').resolve(__dirname, '..', 'playwright-report', 'execucoes');
  const raizTestResults = require('node:path').resolve(__dirname, '..', 'test-results', 'execucoes');
  const arquivoJson = require('node:path').join(raizRelatorios, pastaExecucao, 'resultado.json');
  const arquivoHtml = require('node:path').join(raizRelatorios, pastaExecucao, 'html', 'index.html');

  assert.equal(require('node:fs').existsSync(arquivoJson), true, 'JSON deve estar na pasta do ID de execução.');
  assert.equal(require('node:fs').existsSync(arquivoHtml), true, 'HTML deve estar na pasta do mesmo ID.');

  const relatorio = JSON.parse(require('node:fs').readFileSync(arquivoJson, 'utf8'));
  assert.equal(relatorio.stats.expected, 2);
  assert.equal(relatorio.stats.unexpected, 0);
  assert.equal(relatorio.stats.skipped, 0);

  const anexos = [];
  const visitarSuites = (suites) => {
    for (const suite of suites || []) {
      for (const spec of suite.specs || []) {
        for (const teste of spec.tests || []) {
          for (const tentativa of teste.results || []) anexos.push(...(tentativa.attachments || []));
        }
      }
      visitarSuites(suite.suites);
    }
  };
  visitarSuites(relatorio.suites);

  assert.equal(anexos.length, 2, 'fixture deve anexar o ID em cada worker.');
  for (const anexo of anexos) {
    if (!anexo.path) continue;
    const caminhoAnexo = require('node:path').resolve(anexo.path);
    const relativo = require('node:path').relative(raizTestResults, caminhoAnexo).replaceAll('\\', '/');
    assert.ok(relativo.startsWith(`${pastaExecucao}/`), 'anexo deve ficar sob o ID compartilhado.');
    assert.equal(require('node:fs').existsSync(caminhoAnexo), true, 'anexo citado deve existir.');
  }
});
