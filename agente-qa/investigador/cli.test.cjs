'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { criarOrquestrador } = require('./orquestrador.cjs');
const { LIMITES_CLI, main, executarInvestigacao } = require('./cli.cjs');

function criarProjetoTemporario() {
  const raizProjeto = fs.mkdtempSync(path.join(os.tmpdir(), 'aar-cli-'));
  const pastaAnalises = path.join(raizProjeto, 'agente-qa', 'analises', 'execucao-fixture');
  fs.mkdirSync(pastaAnalises, { recursive: true });
  fs.mkdirSync(path.join(raizProjeto, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(raizProjeto, 'agente-qa', 'indice.json'), JSON.stringify({
    versao: 1,
    testes: [{ id: 'AUT-001', arquivo: 'tests/api/cupons.spec.ts' }],
    criterios: [{ id: 'CA01', testes: ['AUT-001'] }],
    revisaoHumana: [],
  }));
  fs.writeFileSync(path.join(raizProjeto, 'docs', 'bugs.md'), [
    '# Bugs',
    '## BUG-001 — Falha de cálculo',
    '- **Severidade:** Alta',
    '- **Critérios/cenários:** CA01, AUT-001',
  ].join('\n'));
  const analise = {
    versaoEsquema: 1,
    execucao: { arquivo: 'resultado.json', inicio: '2026-10-09T05:04:18.393Z', duracaoMs: 100, estado: 'concluido-com-falhas' },
    resumo: { total: 1, aprovados: 0, reprovados: 1, ignorados: 0, inconclusivos: 0, flaky: 0 },
    testes: [{
      id: 'AUT-001', titulo: 'AUT-001: falha controlada', arquivo: 'tests/api/cupons.spec.ts', projeto: 'chromium',
      status: 'failed', tentativas: 1, flaky: false, criterios: ['CA01'],
      classificacao: { tipo: 'bug-conhecido-compativel', bugId: 'BUG-001', evidencia: 'Assertion divergente.' },
      erros: ['Assertion: token=sk-test-12345678901234567890 email alice@example.com path C:\\Private\\home.txt'], anexos: [],
    }],
    cobertura: { criterios: [{ id: 'CA01', autDeclarados: ['AUT-001'], aprovados: 0, reprovados: 1, ignorados: 0, inconclusivos: 0, autSemResultado: [], situacaoExecucao: 'falha em caso automatizado associado', validacaoIntegral: false, revisaoHumana: [] }], revisaoHumana: [] },
    diagnosticos: { idsAusentes: [], idsDuplicados: [], idsDesconhecidos: [], autSemResultado: [], autSemCriterio: [], anexosAusentes: [], inconsistenciasContagem: [] },
    historico: { disponivel: false, comparacao: null, regressaoConfirmada: false },
  };
  const caminhoAnalise = path.join(pastaAnalises, 'analise.json');
  fs.writeFileSync(caminhoAnalise, JSON.stringify(analise));
  return { raizProjeto, pastaAnalises, caminhoAnalise, analise };
}

function capturarSaida() {
  let stdout = '';
  let stderr = '';
  return {
    stdout: (texto) => { stdout += texto; },
    stderr: (texto) => { stderr += texto; },
    ler: () => ({ stdout, stderr }),
  };
}

function dependencias(projeto, extras = {}) {
  return { raizProjeto: projeto.raizProjeto, ...extras };
}

function respostaJson(conteudo) {
  const texto = JSON.stringify(conteudo);
  return { ok: true, status: 200, headers: { get: () => String(Buffer.byteLength(texto)) }, text: async () => texto };
}

test('modo simulado consulta ferramentas e resume a análise sem rede', async (t) => {
  const projeto = criarProjetoTemporario();
  t.after(() => fs.rmSync(projeto.raizProjeto, { recursive: true, force: true }));
  const saida = capturarSaida();
  let chamadasRede = 0;
  const codigo = await main(['--modo', 'simulado', '--analise', projeto.caminhoAnalise], dependencias(projeto, {
    fetchImpl: async () => { chamadasRede += 1; throw new Error('não deve chamar rede'); },
    ...saida,
  }));
  const capturado = saida.ler();
  const json = JSON.parse(capturado.stdout);

  assert.equal(codigo, 0);
  assert.equal(chamadasRede, 0);
  assert.equal(capturado.stderr, '');
  assert.equal(json.modo, 'simulado');
  assert.deepEqual(json.execucao.contagens, projeto.analise.resumo);
  assert.equal(json.classificacoesDeterministicas[0].bugId, 'BUG-001');
  assert.equal(json.investigacao.revisaoHumanaObrigatoria, true);
  assert.ok(json.investigacao.fatosObservados.some((fato) => fato.id === 'analise:resumo'));
  assert.match(json.investigacao.hipoteses[0].texto, /revisão humana/i);
});

test('modo real sem chave encerra com erro sanitizado antes do fetch', async (t) => {
  const projeto = criarProjetoTemporario();
  t.after(() => fs.rmSync(projeto.raizProjeto, { recursive: true, force: true }));
  const saida = capturarSaida();
  let chamadasRede = 0;
  const codigo = await main(['--modo', 'real', '--analise', projeto.caminhoAnalise], dependencias(projeto, {
    env: {}, fetchImpl: async () => { chamadasRede += 1; return respostaJson({}); }, ...saida,
  }));
  assert.equal(codigo, 1);
  assert.equal(chamadasRede, 0);
  assert.deepEqual(JSON.parse(saida.ler().stderr), { erro: { codigo: 'CHAVE_AUSENTE' } });
});

test('arquivo de análise inexistente é recusado', async (t) => {
  const projeto = criarProjetoTemporario();
  t.after(() => fs.rmSync(projeto.raizProjeto, { recursive: true, force: true }));
  const saida = capturarSaida();
  const faltante = path.join(projeto.pastaAnalises, 'ausente', 'analise.json');
  const codigo = await main(['--modo', 'simulado', '--analise', faltante], dependencias(projeto, saida));
  assert.equal(codigo, 1);
  assert.deepEqual(JSON.parse(saida.ler().stderr), { erro: { codigo: 'ARQUIVO_INDISPONIVEL' } });
});

test('JSON inválido é rejeitado sem expor caminho ou conteúdo', async (t) => {
  const projeto = criarProjetoTemporario();
  t.after(() => fs.rmSync(projeto.raizProjeto, { recursive: true, force: true }));
  fs.writeFileSync(projeto.caminhoAnalise, '{"segredo":"sk-proj-nao-exibir"');
  const saida = capturarSaida();
  const codigo = await main(['--modo', 'simulado', '--analise', projeto.caminhoAnalise], dependencias(projeto, saida));
  assert.equal(codigo, 1);
  assert.deepEqual(JSON.parse(saida.ler().stderr), { erro: { codigo: 'JSON_INVALIDO' } });
  assert.doesNotMatch(saida.ler().stderr, /sk-proj|aar-cli/);
});

test('versão ou estrutura incompatível da análise é rejeitada', async (t) => {
  const projeto = criarProjetoTemporario();
  t.after(() => fs.rmSync(projeto.raizProjeto, { recursive: true, force: true }));
  fs.writeFileSync(projeto.caminhoAnalise, JSON.stringify({ ...projeto.analise, versaoEsquema: 2 }));
  const saida = capturarSaida();
  const codigo = await main(['--modo', 'simulado', '--analise', projeto.caminhoAnalise], dependencias(projeto, saida));
  assert.equal(codigo, 1);
  assert.deepEqual(JSON.parse(saida.ler().stderr), { erro: { codigo: 'ESQUEMA_INCOMPATIVEL' } });
});

test('caminho fora da pasta de análises é rejeitado', async (t) => {
  const projeto = criarProjetoTemporario();
  t.after(() => fs.rmSync(projeto.raizProjeto, { recursive: true, force: true }));
  const externo = path.join(projeto.raizProjeto, 'fora', 'analise.json');
  fs.mkdirSync(path.dirname(externo), { recursive: true });
  fs.copyFileSync(projeto.caminhoAnalise, externo);
  const saida = capturarSaida();
  const codigo = await main(['--modo', 'simulado', '--analise', externo], dependencias(projeto, saida));
  assert.equal(codigo, 1);
  assert.deepEqual(JSON.parse(saida.ler().stderr), { erro: { codigo: 'CAMINHO_ANALISE_INVALIDO' } });
});

test('symlink que escapa de agente-qa/analises é rejeitado', async (t) => {
  const projeto = criarProjetoTemporario();
  t.after(() => fs.rmSync(projeto.raizProjeto, { recursive: true, force: true }));
  const externo = path.join(projeto.raizProjeto, 'fora');
  fs.mkdirSync(externo);
  fs.copyFileSync(projeto.caminhoAnalise, path.join(externo, 'analise.json'));
  const link = path.join(projeto.raizProjeto, 'agente-qa', 'analises', 'atalho');
  fs.symlinkSync(externo, link, process.platform === 'win32' ? 'junction' : 'dir');
  const saida = capturarSaida();
  const codigo = await main(['--modo', 'simulado', '--analise', path.join(link, 'analise.json')], dependencias(projeto, saida));
  assert.equal(codigo, 1);
  assert.deepEqual(JSON.parse(saida.ler().stderr), { erro: { codigo: 'CAMINHO_ANALISE_INVALIDO' } });
});

test('falha do adaptador real produz resultado inconclusivo sem simular sucesso', async (t) => {
  const projeto = criarProjetoTemporario();
  t.after(() => fs.rmSync(projeto.raizProjeto, { recursive: true, force: true }));
  const saida = capturarSaida();
  const chaveFalsa = 'sk-proj-fake-not-a-secret-000000000000';
  let chamadasSimuladas = 0;
  const codigo = await main(['--modo', 'real', '--analise', projeto.caminhoAnalise], dependencias(projeto, {
    env: { OPENAI_API_KEY: chaveFalsa },
    fetchImpl: async () => { throw new Error(`rede indisponível ${chaveFalsa}`); },
    modeloSimulado: { async proximaEtapa() { chamadasSimuladas += 1; return { tipo: 'final' }; } },
    ...saida,
  }));
  const capturado = saida.ler();
  const json = JSON.parse(capturado.stdout);
  assert.equal(codigo, 2);
  assert.equal(chamadasSimuladas, 0);
  assert.equal(json.modo, 'real');
  assert.equal(json.investigacao.estado, 'inconclusivo');
  assert.equal(json.erroAdaptador.codigo, 'ERRO_DE_REDE');
  assert.doesNotMatch(capturado.stdout + capturado.stderr, new RegExp(chaveFalsa));
  assert.equal(capturado.stderr, '');
});

test('modo real integrado usa somente fetch simulado e formato Responses API', async (t) => {
  const projeto = criarProjetoTemporario();
  t.after(() => fs.rmSync(projeto.raizProjeto, { recursive: true, force: true }));
  const saida = capturarSaida();
  const corpos = [];
  const fetchFalso = async (_url, opcoes) => {
    const body = JSON.parse(opcoes.body);
    corpos.push(body);
    if (corpos.length === 1) return respostaJson({ status: 'completed', output: [{
      type: 'function_call', call_id: 'call_resumo', name: 'consultar_resumo', arguments: '{}',
    }] });
    return respostaJson({ status: 'completed', output: [{ type: 'message', content: [{
      type: 'output_text', text: JSON.stringify({ fatosObservados: ['analise:resumo'], hipoteses: [], incertezas: [], revisaoHumanaObrigatoria: true }),
    }] }] });
  };
  const codigo = await main(['--modo', 'real', '--analise', projeto.caminhoAnalise], dependencias(projeto, {
    env: { OPENAI_API_KEY: 'sk-proj-fake-not-a-secret-000000000000' }, fetchImpl: fetchFalso, ...saida,
  }));
  const json = JSON.parse(saida.ler().stdout);
  assert.equal(codigo, 0);
  assert.equal(corpos.length, 2);
  assert.equal(corpos[0].model, 'gpt-4.1-mini');
  assert.equal(corpos[0].max_output_tokens, 400);
  assert.equal(corpos[0].store, false);
  assert.equal(json.modo, 'real');
  assert.equal(json.investigacao.estado, 'concluida-com-revisao-humana');
});

test('CLI aplica os limites conservadores ao adaptador e ao orquestrador', async (t) => {
  const projeto = criarProjetoTemporario();
  t.after(() => fs.rmSync(projeto.raizProjeto, { recursive: true, force: true }));
  let opcoesAdaptador;
  let opcoesOrquestrador;
  const codigo = await executarInvestigacao({ modo: 'real', caminhoAnalise: projeto.caminhoAnalise }, {
    ...dependencias(projeto), env: { OPENAI_API_KEY: 'dummy' }, fetchImpl: async () => { throw new Error('não chamar'); },
    criarAdaptadorModelo: (opcoes) => {
      opcoesAdaptador = opcoes;
      return { async proximaEtapa() { return { tipo: 'final', resultado: { fatosObservados: [], hipoteses: [], incertezas: [], revisaoHumanaObrigatoria: true } }; } };
    },
    criarOrquestrador: (opcoes) => {
      opcoesOrquestrador = opcoes;
      return criarOrquestrador(opcoes);
    },
  });
  assert.equal(codigo.codigoSaida, 0);
  assert.equal(opcoesAdaptador.maxApiCalls, 4);
  assert.equal(opcoesAdaptador.timeoutMs, 10_000);
  assert.equal(opcoesAdaptador.maxOutputTokens, 400);
  assert.deepEqual(opcoesOrquestrador.limites, { iteracoes: 4, chamadasFerramenta: 3 });
  assert.deepEqual(LIMITES_CLI, { chamadasApi: 4, chamadasFerramenta: 3, iteracoes: 4, timeoutMs: 10_000, tokensSaida: 400 });
});

test('saída omite dados brutos e sanitiza erro com caminho, e-mail e token', async (t) => {
  const projeto = criarProjetoTemporario();
  t.after(() => fs.rmSync(projeto.raizProjeto, { recursive: true, force: true }));
  const saida = capturarSaida();
  let etapa = 0;
  const modeloSimulado = { async proximaEtapa() {
    etapa += 1;
    if (etapa === 1) return { tipo: 'ferramentas', chamadas: [
      { nome: 'consultar_resumo', argumentos: {} }, { nome: 'listar_falhas', argumentos: {} },
    ] };
    return { tipo: 'final', resultado: {
      fatosObservados: ['analise:resumo'],
      hipoteses: [{ texto: 'Examinar C:\\Private\\home.txt alice@example.com token=sk-test-12345678901234567890', referencias: ['analise:resumo'] }],
      incertezas: [], revisaoHumanaObrigatoria: true,
    } };
  } };
  const codigo = await main(['--modo', 'simulado', '--analise', projeto.caminhoAnalise], dependencias(projeto, { modeloSimulado, ...saida }));
  const capturado = saida.ler();
  assert.equal(codigo, 0);
  assert.doesNotMatch(capturado.stdout, /alice@example\.com|sk-test-|C:\\Private|home\.txt/);
  assert.doesNotMatch(capturado.stdout, /mensagensAssertion|errosOriginais|anexosOriginais/);
  assert.match(capturado.stdout, /\[caminho local omitido\]/);
});

test('limite de chamadas de ferramenta encerra como inconclusivo sem diagnóstico inventado', async (t) => {
  const projeto = criarProjetoTemporario();
  t.after(() => fs.rmSync(projeto.raizProjeto, { recursive: true, force: true }));
  const saida = capturarSaida();
  const modeloSimulado = { async proximaEtapa() {
    return { tipo: 'ferramentas', chamadas: Array.from({ length: 4 }, () => ({ nome: 'consultar_resumo', argumentos: {} })) };
  } };
  const codigo = await main(['--modo', 'simulado', '--analise', projeto.caminhoAnalise], dependencias(projeto, { modeloSimulado, ...saida }));
  const json = JSON.parse(saida.ler().stdout);
  assert.equal(codigo, 2);
  assert.equal(json.investigacao.estado, 'inconclusivo');
  assert.equal(json.investigacao.auditoria.chamadasFerramenta, 3);
  assert.deepEqual(json.investigacao.hipoteses, []);
});
