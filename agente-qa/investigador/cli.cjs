'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { criarAdaptadorModelo } = require('./adaptador-openai.cjs');
const { criarOrquestrador } = require('./orquestrador.cjs');
const { criarFerramentas, textoSeguro } = require('./ferramentas.cjs');

const LIMITES_CLI = Object.freeze({
  chamadasApi: 4,
  chamadasFerramenta: 3,
  iteracoes: 4,
  timeoutMs: 10_000,
  tokensSaida: 400,
});
const raizPadrao = path.resolve(__dirname, '../..');
const USO = 'Uso: node agente-qa/investigador/cli.cjs --modo <simulado|real> --analise <caminho-para-analise.json>';
const ESTADOS_EXECUCAO = new Set(['concluido', 'concluido-com-falhas', 'incompleto']);
const STATUS_TESTE = new Set(['passed', 'failed', 'skipped', 'timedOut', 'interrupted', 'inconclusivo', 'sem resultado']);

function erroCli(codigo) {
  const erro = new Error('Falha segura no CLI do investigador.');
  erro.code = codigo;
  return erro;
}

function parsearArgumentos(argv) {
  const argumentos = {};
  for (let i = 0; i < argv.length; i += 1) {
    const nome = argv[i];
    if (!['--modo', '--analise'].includes(nome) || argumentos[nome]) throw erroCli('ARGUMENTOS_INVALIDOS');
    const valor = argv[i + 1];
    if (typeof valor !== 'string' || !valor || valor.startsWith('--')) throw erroCli('ARGUMENTOS_INVALIDOS');
    argumentos[nome] = valor;
    i += 1;
  }
  if (!['simulado', 'real'].includes(argumentos['--modo']) || !argumentos['--analise']) {
    throw erroCli('ARGUMENTOS_INVALIDOS');
  }
  return { modo: argumentos['--modo'], caminhoAnalise: argumentos['--analise'] };
}

function estaDentro(raiz, alvo) {
  const relativo = path.relative(raiz, alvo);
  return relativo !== '' && relativo !== '..' && !relativo.startsWith(`..${path.sep}`) && !path.isAbsolute(relativo);
}

function validarLocalAnalise(caminhoInformado, raizProjeto, fsApi = fs) {
  let raizReal;
  let pastaAnalisesReal;
  let arquivoReal;
  try {
    raizReal = fsApi.realpathSync(raizProjeto);
    const pastaAnalisesEsperada = path.join(raizReal, 'agente-qa', 'analises');
    pastaAnalisesReal = fsApi.realpathSync(pastaAnalisesEsperada);
    if (path.relative(pastaAnalisesEsperada, pastaAnalisesReal) !== '') throw erroCli('CAMINHO_ANALISE_INVALIDO');

    const caminhoAbsoluto = path.isAbsolute(caminhoInformado)
      ? path.resolve(caminhoInformado)
      : path.resolve(raizReal, caminhoInformado);
    if (!estaDentro(pastaAnalisesReal, caminhoAbsoluto) || path.basename(caminhoAbsoluto) !== 'analise.json') {
      throw erroCli('CAMINHO_ANALISE_INVALIDO');
    }
    try { arquivoReal = fsApi.realpathSync(caminhoAbsoluto); } catch { throw erroCli('ARQUIVO_INDISPONIVEL'); }
    if (!estaDentro(pastaAnalisesReal, arquivoReal)) throw erroCli('CAMINHO_ANALISE_INVALIDO');
    const relativo = path.relative(pastaAnalisesReal, arquivoReal).split(path.sep);
    if (relativo.length !== 2 || relativo[1] !== 'analise.json' || !fsApi.statSync(arquivoReal).isFile()) {
      throw erroCli('CAMINHO_ANALISE_INVALIDO');
    }
  } catch (erro) {
    if (['CAMINHO_ANALISE_INVALIDO', 'ARQUIVO_INDISPONIVEL'].includes(erro?.code)) throw erro;
    throw erroCli('CAMINHO_ANALISE_INVALIDO');
  }
  return arquivoReal;
}

function validarAnalise(analise) {
  if (!analise || typeof analise !== 'object' || Array.isArray(analise) || analise.versaoEsquema !== 1) {
    throw erroCli('ESQUEMA_INCOMPATIVEL');
  }
  if (!analise.execucao || typeof analise.execucao !== 'object'
      || !(analise.execucao.inicio === null || (typeof analise.execucao.inicio === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(analise.execucao.inicio)))
      || !ESTADOS_EXECUCAO.has(analise.execucao.estado)) throw erroCli('ESQUEMA_INCOMPATIVEL');

  const resumo = analise.resumo;
  const contagens = ['total', 'aprovados', 'reprovados', 'ignorados', 'inconclusivos', 'flaky'];
  if (!resumo || typeof resumo !== 'object'
      || contagens.some((campo) => !Number.isInteger(resumo[campo]) || resumo[campo] < 0)
      || resumo.total !== resumo.aprovados + resumo.reprovados + resumo.ignorados + resumo.inconclusivos) {
    throw erroCli('ESQUEMA_INCOMPATIVEL');
  }
  if (!Array.isArray(analise.testes) || !analise.cobertura || !Array.isArray(analise.cobertura.criterios)
      || !Array.isArray(analise.cobertura.revisaoHumana) || !analise.diagnosticos || !analise.historico
      || typeof analise.historico.disponivel !== 'boolean') throw erroCli('ESQUEMA_INCOMPATIVEL');

  for (const teste of analise.testes) {
    if (!teste || typeof teste !== 'object' || !(typeof teste.id === 'string' || teste.id === null)
        || typeof teste.titulo !== 'string' || !STATUS_TESTE.has(teste.status)
        || !Array.isArray(teste.criterios) || !Array.isArray(teste.erros) || !Array.isArray(teste.anexos)
        || typeof teste.flaky !== 'boolean') throw erroCli('ESQUEMA_INCOMPATIVEL');
  }
  for (const criterio of analise.cobertura.criterios) {
    if (!criterio || typeof criterio.id !== 'string' || !Array.isArray(criterio.autDeclarados)
        || typeof criterio.validacaoIntegral !== 'boolean') throw erroCli('ESQUEMA_INCOMPATIVEL');
  }
  const diagnosticosEsperados = ['idsAusentes', 'idsDuplicados', 'idsDesconhecidos', 'autSemResultado', 'autSemCriterio', 'anexosAusentes', 'inconsistenciasContagem'];
  if (diagnosticosEsperados.some((campo) => !Array.isArray(analise.diagnosticos[campo]))) throw erroCli('ESQUEMA_INCOMPATIVEL');
  return analise;
}

function lerJson(caminho, fsApi = fs) {
  let texto;
  try { texto = fsApi.readFileSync(caminho, 'utf8'); } catch { throw erroCli('ARQUIVO_INDISPONIVEL'); }
  try { return JSON.parse(texto); } catch { throw erroCli('JSON_INVALIDO'); }
}

function lerArquivoFixo(caminho, raizReal, fsApi = fs) {
  let real;
  try { real = fsApi.realpathSync(caminho); } catch { throw erroCli('ARQUIVO_PROJETO_INDISPONIVEL'); }
  if (path.relative(path.resolve(caminho), real) !== '') throw erroCli('CAMINHO_PROJETO_INVALIDO');
  if (path.relative(raizReal, real) === '..' || path.relative(raizReal, real).startsWith(`..${path.sep}`)
      || path.isAbsolute(path.relative(raizReal, real))) throw erroCli('CAMINHO_PROJETO_INVALIDO');
  return real;
}

function sanitizarTextoSaida(valor, limite = 500) {
  return textoSeguro(valor, limite)
    .replace(/\b[A-Z]:\\[^\s"'<>]+/gi, '[caminho local omitido]')
    .replace(/(^|\s)\/(?:home|Users|tmp|var|etc|root)\/[^\s"'<>]+/g, '$1[caminho local omitido]');
}

function projetarInvestigacao(investigacao) {
  const fatos = Array.isArray(investigacao.fatosObservados) ? investigacao.fatosObservados : [];
  return {
    estado: investigacao.estado,
    fatosObservados: fatos.filter((fato) => fato && typeof fato.id === 'string').map((fato) => ({
      id: fato.id,
      fonte: sanitizarTextoSaida(fato.fonte, 160),
      tipo: sanitizarTextoSaida(fato.tipo, 100),
    })),
    hipoteses: (investigacao.hipoteses || []).map((hipotese) => ({
      texto: sanitizarTextoSaida(hipotese.texto),
      referencias: Array.isArray(hipotese.referencias) ? hipotese.referencias : [],
    })),
    incertezas: (investigacao.incertezas || []).map((item) => sanitizarTextoSaida(item)),
    revisaoHumanaObrigatoria: investigacao.revisaoHumanaObrigatoria === true,
    auditoria: investigacao.auditoria,
    limitacoes: (investigacao.limitacoes || []).map((item) => sanitizarTextoSaida(item)),
  };
}

function criarModeloSimulado() {
  let consultasSolicitadas = false;
  return {
    async proximaEtapa({ historico }) {
      if (!consultasSolicitadas) {
        consultasSolicitadas = true;
        return { tipo: 'ferramentas', chamadas: [
          { nome: 'consultar_resumo', argumentos: {} },
          { nome: 'listar_falhas', argumentos: {} },
        ] };
      }
      const resultados = historico.filter((item) => item.papel === 'ferramenta' && item.resultado?.ok);
      const resumo = resultados.find((item) => item.nome === 'consultar_resumo')?.resultado?.dados;
      const falhas = resultados.find((item) => item.nome === 'listar_falhas')?.resultado?.dados?.falhas || [];
      const referencias = [...new Set(resultados.flatMap((item) => (item.resultado.referencias || []).map((ref) => ref.id)))];
      const refsFalhas = falhas.map((item) => item.referencia).filter((ref) => typeof ref === 'string');
      const bugs = [...new Set(falhas.map((item) => item.classificacao?.bugId).filter(Boolean))];
      const hipoteses = refsFalhas.length ? [{
        texto: bugs.length
          ? `O analisador determinístico classificou ${refsFalhas.length} falha(s) como compatíveis com ${bugs.join(', ')}; a classificação requer revisão humana.`
          : `${refsFalhas.length} falha(s) foram listadas e precisam de avaliação humana; não há associação determinística suficiente a bug conhecido.`,
        referencias: refsFalhas,
      }] : [];
      const incertezas = resumo
        ? ['A simulação valida o fluxo local de ferramentas; não representa julgamento de um modelo real.']
        : ['O resumo determinístico não foi obtido; não é possível resumir a execução.'];
      return { tipo: 'final', resultado: {
        fatosObservados: referencias,
        hipoteses,
        incertezas,
        revisaoHumanaObrigatoria: true,
      } };
    },
  };
}

function erroSeguro(erro) {
  const codigo = typeof erro?.code === 'string' && /^[A-Z0-9_]{1,48}$/.test(erro.code) ? erro.code : 'ERRO_CLI';
  return { codigo };
}

async function executarInvestigacao({ modo, caminhoAnalise }, dependencias = {}) {
  if (!['simulado', 'real'].includes(modo)) throw erroCli('MODO_INVALIDO');
  const fsApi = dependencias.fs || fs;
  const raizProjeto = dependencias.raizProjeto || raizPadrao;
  const caminho = validarLocalAnalise(caminhoAnalise, raizProjeto, fsApi);
  const analise = validarAnalise(lerJson(caminho, fsApi));
  const raizReal = fsApi.realpathSync(raizProjeto);
  const caminhoIndice = lerArquivoFixo(path.join(raizReal, 'agente-qa', 'indice.json'), raizReal, fsApi);
  const indice = lerJson(caminhoIndice, fsApi);
  if (!indice || indice.versao !== 1 || !Array.isArray(indice.testes) || !Array.isArray(indice.criterios)
      || !Array.isArray(indice.revisaoHumana)) throw erroCli('INDICE_INVALIDO');
  let bugsMarkdown;
  const caminhoBugs = lerArquivoFixo(path.join(raizReal, 'docs', 'bugs.md'), raizReal, fsApi);
  try { bugsMarkdown = fsApi.readFileSync(caminhoBugs, 'utf8'); } catch { throw erroCli('DOCUMENTACAO_INDISPONIVEL'); }

  const ferramentas = (dependencias.criarFerramentas || criarFerramentas)({ analise, indice, bugsMarkdown });
  const factoryModelo = dependencias.criarAdaptadorModelo || criarAdaptadorModelo;
  const opcoesModelo = modo === 'simulado'
    ? { modo: 'simulado', modeloSimulado: dependencias.modeloSimulado || criarModeloSimulado() }
    : {
      modo: 'real',
      env: dependencias.env || process.env,
      fetchImpl: dependencias.fetchImpl,
      timeoutMs: LIMITES_CLI.timeoutMs,
      maxApiCalls: LIMITES_CLI.chamadasApi,
      maxOutputTokens: LIMITES_CLI.tokensSaida,
    };
  const adaptador = factoryModelo(opcoesModelo);
  let codigoErroAdaptador = null;
  const modelo = {
    proximaEtapa: async (contexto) => {
      try { return await adaptador.proximaEtapa(contexto); } catch (erro) {
        codigoErroAdaptador = erroSeguro(erro).codigo;
        throw erro;
      }
    },
  };
  const orquestrador = (dependencias.criarOrquestrador || criarOrquestrador)({
    modelo,
    ferramentas,
    limites: { iteracoes: LIMITES_CLI.iteracoes, chamadasFerramenta: LIMITES_CLI.chamadasFerramenta },
  });
  const investigacao = await orquestrador.investigar('Analise as falhas e lacunas da execucao deterministica carregada.');
  const classificacoesDeterministicas = analise.testes
    .filter((teste) => teste.status === 'failed')
    .map((teste) => ({
      id: typeof teste.id === 'string' && /^AUT-\d{3}(?:-V\d+)?$/.test(teste.id) ? teste.id : null,
      tipo: ['bug-conhecido-compativel', 'possivel-regressao', 'falha-nao-classificada', 'resultado-inconclusivo'].includes(teste.classificacao?.tipo)
        ? teste.classificacao.tipo : 'resultado-inconclusivo',
      bugId: typeof teste.classificacao?.bugId === 'string' && /^BUG-\d{3}$/.test(teste.classificacao.bugId)
        ? teste.classificacao.bugId : null,
    }));
  const resultado = {
    modo,
    execucao: { inicio: analise.execucao.inicio, estado: analise.execucao.estado, contagens: analise.resumo },
    classificacoesDeterministicas,
    investigacao: projetarInvestigacao(investigacao),
  };
  if (codigoErroAdaptador) resultado.erroAdaptador = { codigo: codigoErroAdaptador };
  return { resultado, codigoSaida: investigacao.estado === 'inconclusivo' ? 2 : 0 };
}

async function main(argv = process.argv.slice(2), dependencias = {}) {
  const stdout = dependencias.stdout || ((texto) => process.stdout.write(texto));
  const stderr = dependencias.stderr || ((texto) => process.stderr.write(texto));
  try {
    const argumentos = parsearArgumentos(argv);
    const { resultado, codigoSaida } = await executarInvestigacao(argumentos, dependencias);
    stdout(`${JSON.stringify(resultado, null, 2)}\n`);
    return codigoSaida;
  } catch (erro) {
    stderr(`${JSON.stringify({ erro: erroSeguro(erro) })}\n`);
    return 1;
  }
}

if (require.main === module) {
  main().then((codigoSaida) => { process.exitCode = codigoSaida; });
}

module.exports = {
  LIMITES_CLI,
  parsearArgumentos,
  validarLocalAnalise,
  validarAnalise,
  criarModeloSimulado,
  executarInvestigacao,
  main,
};
