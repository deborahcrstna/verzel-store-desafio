const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  analisarRelatorio,
  validarRelatorio,
  lerJson,
  normalizarIdAut,
} = require('./analisar.cjs');

const raiz = path.resolve(__dirname, '..');
const bugs = [
  '## BUG-001 — Frete cobrado no limite',
  '',
  'Cenários afetados: AUT-003-V2 e AUT-006-V2.',
  '',
  '## BUG-002 — Quantidade acima do limite',
  '',
  'Cenários afetados: AUT-004-V2 e AUT-008.',
].join('\n');

function indice(tests = ['AUT-001']) {
  return {
    testes: tests.map(id => ({ id, arquivo: 'tests/api/exemplo.spec.ts' })),
    criterios: [{ id: 'CA01', testes: tests }],
    revisaoHumana: [],
  };
}

function caso(titulo, status = 'passed', opcoes = {}) {
  return {
    title: titulo,
    file: opcoes.file || 'api/exemplo.spec.ts',
    tests: [{
      projectName: opcoes.projeto || 'chromium',
      expectedStatus: 'passed',
      results: opcoes.results || [{
        status,
        errors: opcoes.erros || [],
        attachments: opcoes.anexos || [],
      }],
    }],
  };
}

function relatorio(specs, opcoes = {}) {
  const tests = specs.flatMap(spec => spec.tests || []);
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let flaky = 0;
  for (const item of tests) {
    const attempts = item.results || [];
    const final = attempts.at(-1)?.status || 'inconclusivo';
    if (final === 'passed') passed++;
    else if (final === 'failed') failed++;
    else if (final === 'skipped') skipped++;
    if (final === 'passed' && attempts.slice(0, -1).some(a => a.status !== 'passed')) flaky++;
  }
  return {
    suites: [{ title: 'exemplo.spec.ts', file: 'api/exemplo.spec.ts', specs }],
    stats: {
      expected: passed - flaky,
      unexpected: failed,
      skipped,
      flaky,
      duration: 25,
      startTime: '2026-10-09T10:00:00.000Z',
    },
    ...opcoes,
  };
}

function analisar(report, testIndex = indice(), extra = {}) {
  return analisarRelatorio(report, {
    indice: testIndex,
    bugsMarkdown: bugs,
    caminhoRelatorio: path.join(raiz, 'sample-report.json'),
    raizProjeto: raiz,
    ...extra,
  });
}

test('analisa relatório válido e não declara CA integralmente validado', () => {
  const result = analisar(relatorio([caso('AUT-001: cenário válido')]));
  assert.deepEqual(result.resumo, {
    total: 1, aprovados: 1, reprovados: 0, ignorados: 0, inconclusivos: 0, flaky: 0,
  });
  assert.equal(result.cobertura.criterios[0].validacaoIntegral, false);
  assert.equal(result.cobertura.criterios[0].situacaoExecucao, 'sem falha nos casos automatizados observados');
});

test('rejeita relatório ausente, malformado ou com estrutura mínima inválida', () => {
  assert.throws(() => validarRelatorio(null), /objeto JSON/);
  assert.throws(() => validarRelatorio({ suites: [] }), /stats ausente/);
  assert.throws(() => validarRelatorio({ suites: [], stats: { expected: 0 } }), /stats.unexpected/);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aar-relatorio-'));
  try {
    assert.throws(() => lerJson(path.join(temp, 'ausente.json'), 'Relatório'), /não encontrado/);
    const malformed = path.join(temp, 'malformado.json');
    fs.writeFileSync(malformed, '{ json incompleto', 'utf8');
    assert.throws(() => lerJson(malformed, 'Relatório'), /JSON válido/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('registra teste reprovado com associação de critério', () => {
  const report = relatorio([caso('AUT-001: caso com falha', 'failed', {
    erros: [{ message: 'Error: assertion de exemplo' }],
  })]);
  const result = analisar(report);
  assert.equal(result.testes[0].status, 'failed');
  assert.deepEqual(result.testes[0].criterios, ['CA01']);
  assert.equal(result.resumo.reprovados, 1);
});

test('identifica teste ignorado como skipped', () => {
  const result = analisar(relatorio([caso('AUT-001: ignorado', 'skipped')]));
  assert.equal(result.testes[0].classificacao.tipo, 'ignorado');
  assert.equal(result.resumo.ignorados, 1);
});

test('detecta ID AUT desconhecido e IDs ausentes no título', () => {
  const result = analisar(relatorio([
    caso('AUT-999: não catalogado'),
    caso('cenário sem ID'),
  ]));
  assert.deepEqual(result.diagnosticos.idsDesconhecidos, ['AUT-999']);
  assert.deepEqual(result.diagnosticos.idsAusentes, ['cenário sem ID']);
});

test('classifica bug conhecido somente com ID documentado e evidência da assertion', () => {
  const result = analisar(relatorio([caso('AUT-003-V2: frete no limite', 'failed', {
    erros: [{ message: 'Error: Frete esperado\nExpected: 0\nReceived: 19.9' }],
  })]), indice(['AUT-003-V2']));
  assert.equal(result.testes[0].classificacao.tipo, 'bug-conhecido-compativel');
  assert.equal(result.testes[0].classificacao.bugId, 'BUG-001');
});

test('não classifica bug apenas pelo ID quando falta evidência compatível', () => {
  const result = analisar(relatorio([caso('AUT-003-V2: erro diferente', 'failed', {
    erros: [{ message: 'Error: Timeout inesperado' }],
  })]), indice(['AUT-003-V2']));
  assert.equal(result.testes[0].classificacao.tipo, 'falha-nao-classificada');
  assert.equal(result.testes[0].classificacao.bugId, null);
});

test('não chama falha de regressão quando nenhum histórico foi fornecido', () => {
  const result = analisar(relatorio([caso('AUT-001: falhou', 'failed', {
    erros: [{ message: 'Error: assertion sem correspondência' }],
  })]));
  assert.equal(result.historico.disponivel, false);
  assert.equal(result.historico.regressaoConfirmada, false);
  assert.equal(result.testes[0].classificacao.tipo, 'falha-nao-classificada');
});

test('só indica possível regressão ao comparar mesmo AUT, título e projeto aprovado', () => {
  const titulo = 'AUT-001: falhou agora';
  const atual = relatorio([caso(titulo, 'failed', { erros: [{ message: 'Error: resultado divergente' }] })]);
  const anterior = relatorio([caso(titulo, 'passed')]);
  const result = analisar(atual, indice(), { historico: anterior });
  assert.equal(result.testes[0].classificacao.tipo, 'possivel-regressao');
});

test('identifica cobertura de execução parcial quando AUT declarado não aparece', () => {
  const result = analisar(
    relatorio([caso('AUT-001: passou')]),
    indice(['AUT-001', 'AUT-002-V1']),
  );
  assert.deepEqual(result.cobertura.criterios[0].autSemResultado, ['AUT-002-V1']);
  assert.equal(result.cobertura.criterios[0].situacaoExecucao, 'cobertura de execução parcial ou inconclusiva');
});

test('detecta anexo ausente sem copiar seu conteúdo ou caminho absoluto', () => {
  const result = analisar(relatorio([caso('AUT-001: anexo', 'failed', {
    erros: [{ message: 'Error: falha' }],
    anexos: [{ name: 'trace', contentType: 'application/zip', path: path.join(os.tmpdir(), 'aar-anexo-ausente.zip') }],
  })]));
  assert.equal(result.diagnosticos.anexosAusentes.length, 1);
  assert.equal(result.diagnosticos.anexosAusentes[0].nome, 'trace');
  assert.equal(JSON.stringify(result).includes(os.tmpdir()), false);
});

test('trata várias tentativas como um único teste flaky', () => {
  const result = analisar(relatorio([caso('AUT-001: retry', 'passed', {
    results: [
      { status: 'failed', errors: [{ message: 'Error: primeira tentativa' }], attachments: [] },
      { status: 'passed', errors: [], attachments: [] },
    ],
  })]));
  assert.equal(result.resumo.total, 1);
  assert.equal(result.resumo.aprovados, 1);
  assert.equal(result.resumo.flaky, 1);
  assert.equal(result.testes[0].tentativas, 2);
});

test('detecta IDs duplicados e AUT sem associação válida a critério', () => {
  const testIndex = indice(['AUT-001', 'AUT-002-V1']);
  testIndex.criterios[0].testes = ['AUT-001'];
  const result = analisar(relatorio([
    caso('AUT-001: primeiro'),
    caso('AUT-001: duplicado'),
  ]), testIndex);
  assert.deepEqual(result.diagnosticos.idsDuplicados, ['AUT-001']);
  assert.deepEqual(result.diagnosticos.autSemCriterio, ['AUT-002-V1']);
});

test('normaliza IDs com espaço e hífen sem perder variante', () => {
  assert.equal(normalizarIdAut('AUT-002 V1: aceita cupom'), 'AUT-002-V1');
  assert.equal(normalizarIdAut('AUT-002-V1: aceita cupom'), 'AUT-002-V1');
  assert.equal(normalizarIdAut('título sem ID'), null);
});
