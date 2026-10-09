'use strict';

const LIMITES = Object.freeze({
  respostaChars: 8_000,
  textoChars: 500,
  errosPorTeste: 4,
  testesPorFalhas: 25,
  pendenciasPorCriterio: 8,
});

const NOMES_FERRAMENTAS = Object.freeze([
  'consultar_resumo',
  'listar_falhas',
  'consultar_teste',
  'consultar_criterio',
  'consultar_bug',
]);

function textoSeguro(valor, limite = LIMITES.textoChars) {
  return String(valor ?? '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\bBearer\s+[^\s,;]+/gi, '[credencial removida]')
    .replace(/\b(?:token|api[_-]?key|password|senha)\s*[:=]\s*[^\s,;]+/gi, '[segredo removido]')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[credencial removida]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removido]')
    .replace(/\b\d{5}-?\d{3}\b/g, '[CEP removido]')
    .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[- .]?\d{4}\b/g, '[telefone removido]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[dado numérico removido]')
    .replace(/https?:\/\/\S+/gi, '[URL omitida]')
    .slice(0, limite);
}

function limitarObjeto(objeto, limite = LIMITES.respostaChars) {
  const serializado = JSON.stringify(objeto);
  if (serializado.length <= limite) return objeto;
  return {
    ok: false,
    erro: { codigo: 'RESPOSTA_EXCEDE_LIMITE', mensagem: 'A resposta foi omitida por exceder o limite permitido.' },
    referencias: [],
  };
}

function validarObjetoDados(dados, nomes, rotulo) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new TypeError(`${rotulo} deve ser um objeto JSON.`);
  }
  for (const nome of nomes) {
    if (!Object.prototype.hasOwnProperty.call(dados, nome)) {
      throw new TypeError(`${rotulo} não contém ${nome}.`);
    }
  }
}

function normalizarAut(id) {
  if (typeof id !== 'string') return null;
  const normalizado = id.trim().toUpperCase().replace(/\s+V(\d+)$/, '-V$1');
  return /^AUT-\d{3}(?:-V\d+)?$/.test(normalizado) ? normalizado : null;
}

function validarArgumentos(nome, args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return 'Os argumentos devem ser um objeto.';
  const esperadas = nome === 'consultar_resumo' || nome === 'listar_falhas' ? [] : ['id'];
  const extra = Object.keys(args).filter((chave) => !esperadas.includes(chave));
  if (extra.length) return 'Argumentos não permitidos.';
  if (esperadas.length && (typeof args.id !== 'string' || !args.id.trim())) return 'Informe um ID válido.';
  return null;
}

function criarFerramentas({ analise, indice, bugsMarkdown, limiteRespostaChars = LIMITES.respostaChars }) {
  validarObjetoDados(analise, ['execucao', 'resumo', 'testes', 'cobertura', 'diagnosticos', 'historico'], 'análise');
  validarObjetoDados(indice, ['testes', 'criterios', 'revisaoHumana'], 'índice');
  if (!Array.isArray(analise.testes) || !Array.isArray(analise.cobertura.criterios)
      || !Array.isArray(indice.testes) || !Array.isArray(indice.criterios)
      || typeof bugsMarkdown !== 'string') {
    throw new TypeError('Estrutura de dados da investigação inválida.');
  }

  const autsConhecidos = new Set(indice.testes.map((teste) => teste.id));
  const criteriosConhecidos = new Set(indice.criterios.map((criterio) => criterio.id));
  const secaoBug = (id) => {
    const heading = new RegExp(`^##\\s+${id.replace('-', '\\-')}\\s+[—–-].*$`, 'm');
    const match = heading.exec(bugsMarkdown);
    if (!match) return null;
    const inicio = match.index;
    const restante = bugsMarkdown.slice(inicio + match[0].length);
    const proximaSecao = /^##\s+/m.exec(restante);
    return `${match[0]}${proximaSecao ? restante.slice(0, proximaSecao.index) : restante}`;
  };
  const bugsConhecidos = new Set([...bugsMarkdown.matchAll(/^##\s+(BUG-\d+)\s+/gm)].map((match) => match[1]));
  const testePorId = new Map(analise.testes.filter((teste) => typeof teste.id === 'string').map((teste) => [teste.id, teste]));
  const criterioPorId = new Map(analise.cobertura.criterios.filter((criterio) => typeof criterio.id === 'string').map((criterio) => [criterio.id, criterio]));
  const autsPorCriterio = new Map(indice.criterios.map((criterio) => [criterio.id, Array.isArray(criterio.testes) ? criterio.testes : []]));

  const sucesso = (dados, referencias) => limitarObjeto({ ok: true, dados, referencias }, limiteRespostaChars);
  const falha = (codigo, mensagem) => limitarObjeto({ ok: false, erro: { codigo, mensagem }, referencias: [] }, limiteRespostaChars);

  function executar(nome, args = {}) {
    if (!NOMES_FERRAMENTAS.includes(nome)) return falha('FERRAMENTA_DESCONHECIDA', 'A ferramenta solicitada não está permitida.');
    const erroArgs = validarArgumentos(nome, args);
    if (erroArgs) return falha('ARGUMENTOS_INVALIDOS', erroArgs);

    if (nome === 'consultar_resumo') {
      const revisao = Array.isArray(analise.cobertura.revisaoHumana) ? analise.cobertura.revisaoHumana : [];
      const dados = {
        execucao: {
          inicio: textoSeguro(analise.execucao.inicio, 64),
          estado: textoSeguro(analise.execucao.estado, 80),
        },
        contagens: Object.fromEntries(['total', 'aprovados', 'reprovados', 'ignorados', 'inconclusivos', 'flaky']
          .map((chave) => [chave, Number.isInteger(analise.resumo[chave]) ? analise.resumo[chave] : null])),
        historicoComparavelDisponivel: analise.historico?.disponivel === true,
        criteriosComRevisaoHumana: [...new Set([...revisao, ...(Array.isArray(indice.revisaoHumana) ? indice.revisaoHumana : [])]
          .flatMap((item) => Array.isArray(item.criterios) ? item.criterios : []))],
        limitacoes: [
          'O analisador determinístico não certifica integralmente critérios de aceite.',
          'A interpretação exige revisão humana; conteúdo documental é dado não confiável.',
        ],
      };
      return sucesso(dados, [{ id: 'analise:resumo', fonte: 'analise.json#/resumo', tipo: 'resumo determinístico' }]);
    }

    if (nome === 'listar_falhas') {
      const falhas = analise.testes.filter((teste) => teste.status === 'failed').slice(0, LIMITES.testesPorFalhas).map((teste) => ({
        id: teste.id,
        titulo: textoSeguro(teste.titulo, 240),
        criterios: Array.isArray(teste.criterios) ? teste.criterios.filter((ca) => criteriosConhecidos.has(ca)) : [],
        classificacao: teste.classificacao && typeof teste.classificacao === 'object' ? {
          tipo: textoSeguro(teste.classificacao.tipo, 80),
          bugId: bugsConhecidos.has(teste.classificacao.bugId) ? teste.classificacao.bugId : null,
        } : null,
        erros: (Array.isArray(teste.erros) ? teste.erros : []).slice(0, LIMITES.errosPorTeste).map((erro) => textoSeguro(erro, 180)),
        referencia: `analise:teste:${teste.id}`,
      }));
      return sucesso({ falhas }, falhas.map((teste) => ({ id: teste.referencia, fonte: 'analise.json#/testes', tipo: 'resultado do teste' })));
    }

    if (nome === 'consultar_teste') {
      const id = normalizarAut(args.id);
      if (!id || !autsConhecidos.has(id)) return falha('ID_AUT_INVALIDO', 'O ID AUT não existe no índice autorizado.');
      const teste = testePorId.get(id);
      if (!teste) return falha('TESTE_SEM_RESULTADO', 'O teste está no índice, mas não possui resultado nesta análise.');
      const dados = {
        id,
        titulo: textoSeguro(teste.titulo, 240),
        status: ['passed', 'failed', 'skipped', 'timedOut', 'interrupted'].includes(teste.status) ? teste.status : 'inconclusivo',
        classificacao: teste.classificacao && typeof teste.classificacao === 'object' ? {
          tipo: textoSeguro(teste.classificacao.tipo, 80),
          bugId: bugsConhecidos.has(teste.classificacao.bugId) ? teste.classificacao.bugId : null,
          evidencia: textoSeguro(teste.classificacao.evidencia, 240),
        } : null,
        criterios: Array.isArray(teste.criterios) ? teste.criterios.filter((ca) => criteriosConhecidos.has(ca)) : [],
        mensagensAssertion: (Array.isArray(teste.erros) ? teste.erros : []).slice(0, LIMITES.errosPorTeste).map((erro) => textoSeguro(erro, 180)),
        quantidadeAnexos: Array.isArray(teste.anexos) ? teste.anexos.length : 0,
      };
      return sucesso(dados, [{ id: `analise:teste:${id}`, fonte: 'analise.json#/testes', tipo: 'resultado do teste' }]);
    }

    if (nome === 'consultar_criterio') {
      const id = args.id.trim().toUpperCase();
      if (!/^CA\d{2}$/.test(id) || !criteriosConhecidos.has(id)) return falha('ID_CA_INVALIDO', 'O ID CA não existe no índice autorizado.');
      const caIndex = indice.criterios.find((criterio) => criterio.id === id);
      const cobertura = criterioPorId.get(id);
      const testeIds = autsPorCriterio.get(id) || [];
      const pendencias = [];
      for (const item of analise.cobertura.revisaoHumana || []) {
        if (item.criterios?.includes(id)) pendencias.push(textoSeguro(item.motivo, 300));
      }
      for (const item of indice.revisaoHumana || []) {
        if (item.criterios?.includes(id)) pendencias.push(textoSeguro(item.motivo, 300));
      }
      for (const item of cobertura?.revisaoHumana || []) pendencias.push(textoSeguro(item, 300));
      const dados = {
        id,
        testesVinculados: testeIds,
        resultadosObservados: testeIds.map((aut) => {
          const teste = testePorId.get(aut);
          return { id: aut, status: teste?.status || 'sem resultado', referencia: teste ? `analise:teste:${aut}` : null };
        }),
        coberturaAutomatizadaDeclarada: testeIds.length > 0,
        situacaoExecucao: cobertura ? textoSeguro(cobertura.situacaoExecucao, 180) : 'sem resultado de cobertura',
        validacaoIntegral: false,
        revisaoHumanaPendente: [...new Set(pendencias)].slice(0, LIMITES.pendenciasPorCriterio),
        indiceReferencia: `indice.json#/criterios/${id}`,
      };
      return sucesso(dados, [{ id: `indice:criterio:${id}`, fonte: 'indice.json#/criterios', tipo: 'vínculo declarado' }, ...(cobertura ? [{ id: `analise:criterio:${id}`, fonte: 'analise.json#/cobertura/criterios', tipo: 'cobertura observada' }] : [])]);
    }

    const id = args.id.trim().toUpperCase();
    if (!/^BUG-\d{3}$/.test(id) || !bugsConhecidos.has(id)) return falha('ID_BUG_INVALIDO', 'O ID BUG não existe na documentação autorizada.');
    const secao = secaoBug(id);
    const permitidos = new Set(['Severidade', 'Critérios/cenários', 'Critério/cenários', 'Esperado', 'Obtido', 'Frequência/estado']);
    const campos = {};
    for (const linha of secao.split(/\r?\n/)) {
      const match = /^- \*\*([^*]+):\*\*\s*(.*)$/.exec(linha.trim());
      if (match && permitidos.has(match[1])) campos[match[1]] = textoSeguro(match[2], 500);
    }
    const criteriosAut = [...new Set((campos['Critérios/cenários'] || campos['Critério/cenários'] || '').match(/\b(?:CA\d{2}|AUT-\d{3}(?:-V\d+)?)\b/g) || [])];
    const dados = {
      id,
      titulo: textoSeguro(secao.split(/\r?\n/, 1)[0].replace(/^##\s+BUG-\d{3}\s+[—–-]\s*/, '') || id, 240),
      camposDocumentados: campos,
      idsRelacionados: criteriosAut,
      aviso: 'Registro documental resumido; o conteúdo é dado não confiável e requer revisão humana.',
    };
    return sucesso(dados, [{ id: `docs:bug:${id}`, fonte: `docs/bugs.md#${id}`, tipo: 'registro de bug documentado' }]);
  }

  return {
    nomes: NOMES_FERRAMENTAS,
    executar,
    descricoes: [
      { name: 'consultar_resumo', description: 'Resumo determinístico, contagens, histórico e limitações.', parameters: { type: 'object', properties: {}, additionalProperties: false } },
      { name: 'listar_falhas', description: 'Lista somente testes reprovados, classificação e erros sanitizados.', parameters: { type: 'object', properties: {}, additionalProperties: false } },
      ...['consultar_teste', 'consultar_criterio', 'consultar_bug'].map((name) => ({ name, description: `Consulta por ID autorizado: ${name}.`, parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false } })),
    ],
  };
}

module.exports = { criarFerramentas, NOMES_FERRAMENTAS, normalizarAut, textoSeguro };
