const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const raizProjeto = path.resolve(__dirname, '..');
const criteriosObrigatorios = Array.from({ length: 11 }, (_, indice) =>
  `CA${String(indice + 1).padStart(2, '0')}`,
);
const formatoAut = /^AUT-\d{3}(?:-V[1-9]\d*)?$/;

function normalizarIdDoTitulo(titulo) {
  const identificador = /^AUT-(\d{3})(?:[- ](V[1-9]\d*))?:/.exec(titulo);
  if (!identificador) return null;
  return `AUT-${identificador[1]}${identificador[2] ? `-${identificador[2]}` : ''}`;
}

function extrairTestesDaListagem(saida) {
  const testes = [];
  const erros = [];
  if (typeof saida !== 'string') {
    return { testes, erros: ['A saída da listagem do Playwright deve ser texto.'] };
  }

  for (const linha of saida.split(/\r?\n/)) {
    if (!linha.includes(' › ')) continue;
    const encontrada = /^\s*\[[^\]]+\]\s*›\s*(.+?):\d+:\d+\s*›\s*(.+)$/.exec(linha);
    if (!encontrada) {
      erros.push(`Linha de teste não reconhecida: ${linha.trim()}`);
      continue;
    }

    const id = normalizarIdDoTitulo(encontrada[2]);
    if (!id) {
      erros.push(`Teste sem ID AUT no início do título: ${encontrada[2]}`);
      continue;
    }
    testes.push({ id, arquivo: `tests/${encontrada[1].replaceAll('\\', '/') }` });
  }

  const total = /Total:\s*(\d+)\s+tests?\s+in\s+\d+\s+files?/.exec(saida);
  if (!total) erros.push('A listagem do Playwright não informou o total de testes.');
  else if (Number(total[1]) !== testes.length) {
    erros.push(`A listagem informa ${total[1]} testes, mas ${testes.length} IDs AUT foram reconhecidos.`);
  }

  const idsVistos = new Set();
  for (const teste of testes) {
    if (idsVistos.has(teste.id)) erros.push(`ID AUT duplicado após normalização na listagem: ${teste.id}`);
    idsVistos.add(teste.id);
  }
  return { testes, erros };
}

function arquivoReferenciadoExiste(raiz, relativo, pasta, extensao) {
  if (typeof relativo !== 'string' || !relativo.startsWith(`${pasta}/`) ||
      !relativo.endsWith(extensao) || path.isAbsolute(relativo)) return false;

  const pastaAbsoluta = path.resolve(raiz, pasta);
  const absoluto = path.resolve(raiz, relativo);
  const dentroDaPasta = path.relative(pastaAbsoluta, absoluto);
  if (dentroDaPasta.startsWith('..') || path.isAbsolute(dentroDaPasta)) return false;

  try {
    if (!fs.statSync(absoluto).isFile()) return false;
    const pastaReal = fs.realpathSync(pastaAbsoluta);
    const arquivoReal = fs.realpathSync(absoluto);
    const dentroDaPastaReal = path.relative(pastaReal, arquivoReal);
    return !dentroDaPastaReal.startsWith('..') && !path.isAbsolute(dentroDaPastaReal);
  } catch {
    return false;
  }
}

function familiasAut(ids) {
  return new Set(ids.map(id => /^AUT-\d{3}/.exec(id)?.[0]).filter(Boolean));
}

function familiasNaLinhaDaMatriz(linha) {
  return [...new Set(linha.match(/AUT-\d{3}/g) || [])];
}

function validarIndice(indice, testesDescobertos, raiz = raizProjeto) {
  const erros = [];
  const avisos = [];
  if (!indice || typeof indice !== 'object' || Array.isArray(indice)) {
    return { erros: ['O índice deve conter um objeto JSON.'], avisos };
  }
  if (indice.versao !== 1) erros.push('A versão do índice deve ser 1.');

  for (const chave of ['plano', 'matriz', 'cenarios']) {
    const referencia = indice.referencias?.[chave];
    if (!arquivoReferenciadoExiste(raiz, referencia, 'docs', '.md')) {
      erros.push(`Referência documental inválida (${chave}): ${String(referencia)}`);
    }
  }

  const inventario = Array.isArray(indice.testes) ? indice.testes : [];
  const criterios = Array.isArray(indice.criterios) ? indice.criterios : [];
  if (!Array.isArray(indice.testes)) erros.push('O campo testes deve ser uma lista.');
  if (!Array.isArray(indice.criterios)) erros.push('O campo criterios deve ser uma lista.');
  if (!Array.isArray(testesDescobertos)) {
    erros.push('A listagem de testes descobertos é obrigatória.');
    testesDescobertos = [];
  }

  const testesPorId = new Map();
  for (const teste of inventario) {
    if (!teste || !formatoAut.test(teste.id)) {
      erros.push(`ID AUT inválido no inventário: ${String(teste?.id)}`);
      continue;
    }
    if (testesPorId.has(teste.id)) erros.push(`ID AUT duplicado no inventário: ${teste.id}`);
    testesPorId.set(teste.id, teste);
    if (!arquivoReferenciadoExiste(raiz, teste.arquivo, 'tests', '.spec.ts')) {
      erros.push(`Arquivo de teste inválido para ${teste.id}: ${String(teste.arquivo)}`);
    }
  }

  const idsDeCriterios = new Set();
  const autComVinculoValido = new Set();
  const criteriosPorId = new Map();
  for (const criterio of criterios) {
    const id = criterio?.id;
    if (typeof id !== 'string' || !/^CA\d{2}$/.test(id)) {
      erros.push(`ID de critério inválido: ${String(id)}`);
      continue;
    }
    if (idsDeCriterios.has(id)) erros.push(`ID de critério duplicado: ${id}`);
    idsDeCriterios.add(id);
    criteriosPorId.set(id, criterio);
    const testesCriterio = criterio.testes;
    const coberturaVazia = Array.isArray(testesCriterio) && testesCriterio.length === 0;
    const explicitamenteSemAutomacao = criterio.statusAutomacao === 'sem cobertura' &&
      typeof criterio.motivo === 'string' && criterio.motivo.trim().length > 0;

    if (!Array.isArray(testesCriterio)) {
      erros.push(`${id}.testes deve ser uma lista.`);
      continue;
    }
    if (coberturaVazia) {
      if (explicitamenteSemAutomacao) avisos.push(`${id} está sem cobertura automatizada: ${criterio.motivo}`);
      else erros.push(`${id} sem AUT deve declarar statusAutomacao "sem cobertura" e um motivo.`);
      continue;
    }
    if (criterio.statusAutomacao === 'sem cobertura') {
      erros.push(`${id} declara ausência de automação, mas possui vínculos AUT.`);
    }

    const idsNoCriterio = new Set();
    for (const aut of testesCriterio) {
      if (idsNoCriterio.has(aut)) erros.push(`Vínculo duplicado em ${id}: ${aut}`);
      idsNoCriterio.add(aut);
      if (!testesPorId.has(aut)) {
        erros.push(`${id} referencia AUT inexistente no índice: ${aut}`);
        continue;
      }
      autComVinculoValido.add(aut);
    }
  }

  for (const id of criteriosObrigatorios) {
    if (!idsDeCriterios.has(id)) erros.push(`Critério obrigatório ausente: ${id}`);
  }
  for (const id of idsDeCriterios) {
    if (!criteriosObrigatorios.includes(id)) erros.push(`Critério fora de CA01–CA11: ${id}`);
  }
  for (const id of testesPorId.keys()) {
    if (!autComVinculoValido.has(id)) erros.push(`AUT sem associação válida a critério: ${id}`);
  }

  const descobertosPorId = new Map();
  for (const teste of testesDescobertos) {
    if (!teste || !formatoAut.test(teste.id)) {
      erros.push(`ID AUT inválido na listagem: ${String(teste?.id)}`);
      continue;
    }
    if (descobertosPorId.has(teste.id)) erros.push(`ID AUT duplicado na listagem: ${teste.id}`);
    descobertosPorId.set(teste.id, teste);
    const declarado = testesPorId.get(teste.id);
    if (!declarado) erros.push(`Teste descoberto sem registro no índice: ${teste.id}`);
    else if (declarado.arquivo !== teste.arquivo) {
      erros.push(`Arquivo divergente para ${teste.id}: índice ${declarado.arquivo}; Playwright ${teste.arquivo}`);
    }
  }
  for (const id of testesPorId.keys()) {
    if (!descobertosPorId.has(id)) erros.push(`Teste do índice ausente na listagem: ${id}`);
  }

  // A matriz usa famílias AUT enquanto o índice detalha variantes. Comparamos apenas famílias
  // e emitimos avisos para revisão; isso não prova que a associação semântica esteja correta.
  const caminhoMatriz = path.resolve(raiz, indice.referencias?.matriz || '');
  if (arquivoReferenciadoExiste(raiz, indice.referencias?.matriz, 'docs', '.md')) {
    const matriz = fs.readFileSync(caminhoMatriz, 'utf8');
    for (const linha of matriz.split(/\r?\n/)) {
      const linhaCa = /^\|\s*(CA\d{2})\s*\|/.exec(linha);
      if (!linhaCa || !criteriosPorId.has(linhaCa[1])) continue;
      const familiaMatriz = new Set(familiasNaLinhaDaMatriz(linha));
      const criterio = criteriosPorId.get(linhaCa[1]);
      const familiaIndice = familiasAut(Array.isArray(criterio.testes) ? criterio.testes : []);
      const somenteMatriz = [...familiaMatriz].filter(f => !familiaIndice.has(f));
      const somenteIndice = [...familiaIndice].filter(f => !familiaMatriz.has(f));
      if (somenteMatriz.length || somenteIndice.length) {
        avisos.push(`${linhaCa[1]}: famílias AUT divergem da matriz (somente matriz: ${somenteMatriz.join(', ') || 'nenhuma'}; somente índice: ${somenteIndice.join(', ') || 'nenhuma'}). Conferência humana necessária; variantes não são inferidas.`);
      }
    }
  }
  for (const revisao of indice.revisaoHumana || []) {
    if (Array.isArray(revisao.criterios) && typeof revisao.motivo === 'string') {
      avisos.push(`Revisão humana pendente (${revisao.criterios.join(', ')}): ${revisao.motivo}`);
    }
  }
  return { erros, avisos };
}

function listarTestesPlaywright(raiz = raizProjeto) {
  const cli = path.join(raiz, 'node_modules', '@playwright', 'test', 'cli.js');
  if (!fs.existsSync(cli)) throw new Error('Playwright não está instalado. Execute npm ci antes da validação.');

  const resultado = spawnSync(process.execPath, [cli, 'test', '--list', '--reporter=list'], {
    cwd: raiz,
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  if (resultado.error || resultado.status !== 0) {
    throw new Error(`Falha ao listar testes Playwright: ${resultado.error?.message || resultado.stderr}`);
  }
  return extrairTestesDaListagem(resultado.stdout);
}

if (require.main === module) {
  try {
    const indice = JSON.parse(fs.readFileSync(path.join(__dirname, 'indice.json'), 'utf8'));
    const listagem = listarTestesPlaywright();
    const validacao = validarIndice(indice, listagem.testes);
    for (const aviso of validacao.avisos) console.warn(`AVISO: ${aviso}`);
    if (listagem.erros.length || validacao.erros.length) {
      for (const erro of [...listagem.erros, ...validacao.erros]) console.error(`ERRO: ${erro}`);
      process.exitCode = 1;
    } else {
      console.log(`Índice estruturalmente válido: ${indice.criterios.length} critérios e ${listagem.testes.length} testes AUT.`);
    }
  } catch (erro) {
    console.error(`Não foi possível validar o índice: ${erro.message}`);
    process.exitCode = 1;
  }
}

module.exports = { normalizarIdDoTitulo, extrairTestesDaListagem, validarIndice, listarTestesPlaywright };
