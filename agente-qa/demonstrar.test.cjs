'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const raizOrigem = path.resolve(__dirname, '..');

function copiar(caminhoRelativo, raizDestino) {
  const origem = path.join(raizOrigem, caminhoRelativo);
  const destino = path.join(raizDestino, caminhoRelativo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.cpSync(origem, destino, { recursive: true });
}

test('demonstração completa funciona em clone limpo, sem relatórios locais nem rede', (t) => {
  const raizLimpa = fs.mkdtempSync(path.join(os.tmpdir(), 'aar-demo-clone-limpo-'));
  t.after(() => fs.rmSync(raizLimpa, { recursive: true, force: true }));
  for (const caminho of [
    'agente-qa/demonstrar.cjs',
    'agente-qa/analisar.cjs',
    'agente-qa/indice.json',
    'agente-qa/fixtures',
    'agente-qa/investigador',
    'docs/bugs.md',
  ]) copiar(caminho, raizLimpa);

  const analises = path.join(raizLimpa, 'agente-qa', 'analises');
  assert.equal(fs.existsSync(analises), false, 'o clone de fixture começa sem análises locais');
  const bloqueioRede = path.join(raizLimpa, 'bloquear-rede.cjs');
  fs.writeFileSync(bloqueioRede, "global.fetch = async () => { throw new Error('rede proibida no teste'); };\n", 'utf8');

  const saida = execFileSync(process.execPath, ['--require', bloqueioRede, 'agente-qa/demonstrar.cjs'], {
    cwd: raizLimpa,
    encoding: 'utf8',
    env: { ...process.env, OPENAI_API_KEY: '' },
    timeout: 15_000,
  });
  assert.match(saida, /Etapa determinística: EXECUTADA nesta demonstração/);
  assert.match(saida, /Testes: 20; aprovados: 15; reprovados: 5; ignorados: 0; flaky: 0\./);
  assert.match(saida, /AUT-003-V2: bug-conhecido-compativel \(BUG-001\)/);
  assert.match(saida, /AUT-003-V4: bug-conhecido-compativel \(BUG-001\)/);
  assert.match(saida, /AUT-006-V2: bug-conhecido-compativel \(BUG-001\)/);
  assert.match(saida, /AUT-004-V2: bug-conhecido-compativel \(BUG-002\)/);
  assert.match(saida, /AUT-008: bug-conhecido-compativel \(BUG-002\)/);
  assert.match(saida, /consultar_resumo: ok/);
  assert.match(saida, /listar_falhas: ok/);
  assert.match(saida, /Revisão humana obrigatória: sim/);
  assert.match(saida, /não é uma análise por IA real/);

  const match = /Análise concluída: agente-qa\/analises\/([^\r\n]+)/.exec(saida);
  assert.ok(match, 'o analisador informou uma pasta de saída exclusiva');
  const pastaExecucao = path.join(analises, match[1]);
  const analise = JSON.parse(fs.readFileSync(path.join(pastaExecucao, 'analise.json'), 'utf8'));
  assert.equal(analise.resumo.total, 20);
  assert.equal(analise.resumo.aprovados, 15);
  assert.equal(analise.resumo.reprovados, 5);
  assert.deepEqual(analise.testes.map((item) => item.id).sort(), JSON.parse(fs.readFileSync(path.join(raizLimpa, 'agente-qa', 'indice.json'), 'utf8')).testes.map((item) => item.id).sort());
  assert.deepEqual(analise.cobertura.criterios.map((item) => item.id), Array.from({ length: 11 }, (_, index) => `CA${String(index + 1).padStart(2, '0')}`));
  assert.equal(fs.existsSync(path.join(pastaExecucao, 'analise.md')), true);
});
