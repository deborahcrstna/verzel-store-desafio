const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizarIdDoTitulo, extrairTestesDaListagem, validarIndice, listarTestesPlaywright } = require('./validar.cjs');

const raiz = path.resolve(__dirname, '..');
const original = JSON.parse(fs.readFileSync(path.join(__dirname, 'indice.json'), 'utf8'));
// Fixture independente: esta lista não é derivada do índice que está sendo validado.
const idsEsperados = [
  'AUT-001', 'AUT-002-V1', 'AUT-002-V2', 'AUT-002-V3', 'AUT-002-V4', 'AUT-002-V5',
  'AUT-007-V1', 'AUT-007-V2',
  'AUT-003-V1', 'AUT-003-V2', 'AUT-003-V3', 'AUT-003-V4', 'AUT-003-V5', 'AUT-003-V6',
  'AUT-008', 'AUT-004-V1', 'AUT-004-V2', 'AUT-005', 'AUT-006-V1', 'AUT-006-V2',
];
const arquivoPorFamilia = {
  'AUT-001': 'tests/api/cupons.spec.ts',
  'AUT-002': 'tests/api/cupons.spec.ts',
  'AUT-003': 'tests/api/frete.spec.ts',
  'AUT-004': 'tests/api/validacoes.spec.ts',
  'AUT-005': 'tests/ui/carrinho.spec.ts',
  'AUT-006': 'tests/ui/carrinho.spec.ts',
  'AUT-007': 'tests/api/cupons.spec.ts',
  'AUT-008': 'tests/api/pedidos.spec.ts',
};
const descobertosFixture = idsEsperados.map(id => ({
  id,
  arquivo: arquivoPorFamilia[id.slice(0, 7)],
}));

function copiarIndice() {
  return structuredClone(original);
}

function apenasErros(indice, descobertos = descobertosFixture) {
  return validarIndice(indice, descobertos, raiz).erros;
}

test('aceita a estrutura atual usando fixture independente dos 20 AUT', () => {
  assert.equal(original.criterios.length, 11);
  assert.equal(original.testes.length, 20);
  assert.deepEqual(apenasErros(copiarIndice()), []);
});

test('normaliza variantes com espaço ou hífen sem apagar o identificador da versão', () => {
  assert.equal(normalizarIdDoTitulo('AUT-002 V1: aceita cupom'), 'AUT-002-V1');
  assert.equal(normalizarIdDoTitulo('AUT-003-V2: frete grátis'), 'AUT-003-V2');
  assert.equal(normalizarIdDoTitulo('AUT-001: aplica cupom'), 'AUT-001');
  assert.equal(normalizarIdDoTitulo('teste sem identificador'), null);
});

test('reconhece listagem Playwright em caminho Windows', () => {
  const saida = [
    'Listing tests:',
    '  [chromium] › api\\cupons.spec.ts:38:7 › AUT-002 V1: aceita cupom',
    '  [chromium] › api\\frete.spec.ts:103:7 › AUT-003-V2: frete grátis',
    'Total: 2 tests in 2 files',
  ].join('\n');
  assert.deepEqual(extrairTestesDaListagem(saida), {
    testes: [
      { id: 'AUT-002-V1', arquivo: 'tests/api/cupons.spec.ts' },
      { id: 'AUT-003-V2', arquivo: 'tests/api/frete.spec.ts' },
    ],
    erros: [],
  });
});

test('descoberta local real do Playwright corresponde ao fixture e ao catálogo', () => {
  const descoberta = listarTestesPlaywright(raiz);
  assert.deepEqual(descoberta.erros, []);
  assert.deepEqual(descoberta.testes, descobertosFixture);
  assert.deepEqual(apenasErros(copiarIndice(), descoberta.testes), []);
});

test('detecta critério obrigatório ausente e duplicidades no índice', () => {
  const indice = copiarIndice();
  indice.criterios = indice.criterios.filter(criterio => criterio.id !== 'CA11');
  indice.criterios.push(structuredClone(indice.criterios[0]));
  indice.testes.push(structuredClone(indice.testes[0]));
  const erros = apenasErros(indice);
  assert.ok(erros.some(erro => erro.includes('Critério obrigatório ausente: CA11')));
  assert.ok(erros.some(erro => erro.includes('ID de critério duplicado: CA01')));
  assert.ok(erros.some(erro => erro.includes('ID AUT duplicado no inventário: AUT-001')));
});

test('detecta referências documentais ausentes ou fora de docs', () => {
  const indice = copiarIndice();
  indice.referencias.matriz = 'docs/arquivo-inexistente.md';
  indice.referencias.plano = 'docs/../README.md';
  const erros = apenasErros(indice);
  assert.ok(erros.some(erro => erro.includes('Referência documental inválida (matriz)')));
  assert.ok(erros.some(erro => erro.includes('Referência documental inválida (plano)')));
});

test('distingue critério explicitamente sem cobertura de índice inválido', () => {
  const indice = copiarIndice();
  indice.criterios.find(criterio => criterio.id === 'CA03').testes = [];
  indice.criterios.find(criterio => criterio.id === 'CA03').statusAutomacao = 'sem cobertura';
  indice.criterios.find(criterio => criterio.id === 'CA03').motivo = 'Sem cenário automatizado para esta regra.';
  indice.testes = indice.testes.filter(teste => teste.id !== 'AUT-007-V1');
  const descoberta = descobertosFixture.filter(teste => teste.id !== 'AUT-007-V1');
  const resultado = validarIndice(indice, descoberta, raiz);
  assert.deepEqual(resultado.erros, []);
  assert.ok(resultado.avisos.some(aviso => aviso.includes('CA03 está sem cobertura automatizada')));
});

test('detecta AUT descoberto e inventariado sem associação válida', () => {
  const indice = copiarIndice();
  indice.criterios.find(criterio => criterio.id === 'CA10').testes = ['AUT-004-V1', 'AUT-004-V2'];
  const erros = apenasErros(indice);
  assert.ok(erros.some(erro => erro.includes('AUT sem associação válida a critério: AUT-008')));
});

test('detecta vínculo desconhecido e repetido dentro de um critério', () => {
  const indice = copiarIndice();
  indice.criterios[0].testes.push('AUT-999', 'AUT-001');
  const erros = apenasErros(indice);
  assert.ok(erros.some(erro => erro.includes('CA01 referencia AUT inexistente')));
  assert.ok(erros.some(erro => erro.includes('Vínculo duplicado em CA01: AUT-001')));
});

test('detecta colisão de títulos após normalização', () => {
  const saida = [
    '[chromium] › api\\cupons.spec.ts:10:1 › AUT-002 V1: caso um',
    '[chromium] › api\\cupons.spec.ts:20:1 › AUT-002-V1: caso dois',
    'Total: 2 tests in 1 file',
  ].join('\n');
  const resultado = extrairTestesDaListagem(saida);
  assert.ok(resultado.erros.some(erro => erro.includes('ID AUT duplicado após normalização na listagem: AUT-002-V1')));
});

test('avisa quando famílias de AUT diferem entre índice e matriz sem alegar semântica', () => {
  const resultado = validarIndice(copiarIndice(), descobertosFixture, raiz);
  assert.deepEqual(resultado.erros, []);
  assert.ok(resultado.avisos.some(aviso => aviso.includes('CA07: famílias AUT divergem da matriz')));
  assert.ok(resultado.avisos.some(aviso => aviso.includes('CA09: famílias AUT divergem da matriz')));
  assert.ok(resultado.avisos.some(aviso => aviso.includes('diferença') || aviso.includes('variantes não são inferidas')));
});

test('formato inesperado de saída da listagem produz erro claro', () => {
  const resultado = extrairTestesDaListagem('Listing tests\nsaída incompatível');
  assert.deepEqual(resultado.testes, []);
  assert.ok(resultado.erros.some(erro => erro.includes('não informou o total de testes')));
});

test('detecta teste descoberto sem índice, teste ausente e arquivo divergente', () => {
  const alterados = descobertosFixture.slice(1).map(teste => ({ ...teste }));
  alterados[0].arquivo = 'tests/api/frete.spec.ts';
  alterados.push({ id: 'AUT-999', arquivo: 'tests/api/cupons.spec.ts' });
  const erros = apenasErros(copiarIndice(), alterados);
  assert.ok(erros.some(erro => erro.includes('Teste do índice ausente na listagem: AUT-001')));
  assert.ok(erros.some(erro => erro.includes('Arquivo divergente para AUT-002-V1')));
  assert.ok(erros.some(erro => erro.includes('Teste descoberto sem registro no índice: AUT-999')));
});
