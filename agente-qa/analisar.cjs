const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const raizProjeto = path.resolve(__dirname, '..');
const ansi = /\u001b\[[0-?]*[ -/]*[@-~]/g;

function normalizarIdAut(valor) {
  if (typeof valor !== 'string') return null;
  const match = /^\s*(AUT-\d{3})(?:[- ](V[1-9]\d*))?(?::|\b)/.exec(valor);
  return match ? match[1] + (match[2] ? '-' + match[2] : '') : null;
}

function validarRelatorio(relatorio) {
  if (!relatorio || typeof relatorio !== 'object' || Array.isArray(relatorio)) {
    throw new Error('O relatório deve ser um objeto JSON.');
  }
  if (!Array.isArray(relatorio.suites)) throw new Error('Relatório inválido: campo suites ausente ou inválido.');
  if (!relatorio.stats || typeof relatorio.stats !== 'object') throw new Error('Relatório inválido: campo stats ausente ou inválido.');
  for (const campo of ['expected', 'unexpected', 'skipped']) {
    if (!Number.isInteger(relatorio.stats[campo]) || relatorio.stats[campo] < 0) {
      throw new Error('Relatório inválido: stats.' + campo + ' deve ser inteiro não negativo.');
    }
  }
}

function textoSeguro(valor, limite = 240) {
  return String(valor || '')
    .replace(ansi, '')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b(token|password|authorization)\s*[:=]\s*\S+/gi, (_match, chave) => chave + '=[REDACTED]')
    .replace(/([?&](?:access_token|refresh_token|token|api_key|password|authorization)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\b\d{5}-?\d{3}\b/g, '[CEP]')
    .split(/\r?\n/)[0]
    .slice(0, limite);
}

function coletarTestes(suites, resultado = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const teste of spec.tests || []) {
        const tentativas = Array.isArray(teste.results) ? teste.results : [];
        const ultima = tentativas.at(-1);
        const status = ultima?.status || 'inconclusivo';
        const falhaAnterior = tentativas.slice(0, -1).some(item =>
          ['failed', 'timedOut', 'interrupted'].includes(item.status),
        );
        resultado.push({
          id: normalizarIdAut(spec.title),
          titulo: String(spec.title || ''),
          arquivo: spec.file ? String(spec.file).replaceAll('\\', '/') : null,
          projeto: teste.projectName || null,
          status,
          tentativas: tentativas.length,
          flaky: status === 'passed' && falhaAnterior,
          anexosOriginais: tentativas.flatMap(item => item.attachments || []),
          errosOriginais: tentativas.flatMap(item => item.errors || []),
        });
      }
    }
    coletarTestes(suite.suites, resultado);
  }
  return resultado;
}

function extrairBugsDocumentados(markdown) {
  const texto = String(markdown || '');
  const cabecalhos = [...texto.matchAll(/^##\s+(BUG-\d{3})\s+—\s+([^\r\n]+)\r?$/gm)];
  return cabecalhos.map((cabecalho, indice) => {
    const inicio = cabecalho.index + cabecalho[0].length;
    const fim = cabecalhos[indice + 1]?.index ?? texto.length;
    const corpo = texto.slice(inicio, fim);
    return {
      id: cabecalho[1],
      titulo: cabecalho[2],
      ids: new Set([...corpo.matchAll(/\bAUT-\d{3}(?:-V[1-9]\d*)?\b/g)].map(item => item[0])),
    };
  });
}

function textoDeErros(teste) {
  return teste.errosOriginais
    .map(erro => String(erro.message || erro.value || ''))
    .join('\n')
    .replace(ansi, '');
}

function evidenciarBugConhecido(teste, bugs) {
  if (!teste.id) return null;
  const texto = textoDeErros(teste);
  for (const bug of bugs) {
    if (!bug.ids.has(teste.id)) continue;
    if (bug.id === 'BUG-001' &&
        (/Expected:\s*0\b[\s\S]{0,160}?Received:\s*19\.9\b/i.test(texto) ||
         /Expected:\s*true\b[\s\S]{0,160}?Received:\s*false\b/i.test(texto) ||
         /Expected:\s*"Grátis"[\s\S]{0,160}?Received:\s*"R\$\s*19,90"/i.test(texto))) {
      return {
        bugId: bug.id,
        titulo: bug.titulo,
        regra: 'ID AUT documentado e assertion observando frete de R$ 19,90 ou freteGratis falso no limite.',
        evidencia: 'A assertion esperava frete grátis/zero e recebeu R$ 19,90 ou freteGratis=false.',
      };
    }
    if (bug.id === 'BUG-002' &&
        /Expected:\s*422\b[\s\S]{0,160}?Received:\s*(?:200|201)\b/i.test(texto)) {
      return {
        bugId: bug.id,
        titulo: bug.titulo,
        regra: 'ID AUT documentado e assertion observando HTTP 200/201 em vez do HTTP 422 esperado.',
        evidencia: 'A assertion esperava HTTP 422 para quantidade acima do limite e recebeu HTTP 200 ou 201.',
      };
    }
  }
  return null;
}

function statusHistoricoPorTeste(historico) {
  const mapa = new Map();
  if (!historico) return mapa;
  for (const teste of coletarTestes(historico.suites)) {
    if (teste.id) mapa.set([teste.id, teste.titulo, teste.projeto || ''].join('|'), teste.status);
  }
  return mapa;
}

function verificarAnexo(anexo, caminhoRelatorio, raiz = raizProjeto) {
  const nome = String(anexo.name || 'anexo');
  if (typeof anexo.path !== 'string' || !anexo.path) {
    return { nome, tipo: anexo.contentType || null, embutido: true };
  }
  const caminho = path.isAbsolute(anexo.path)
    ? path.resolve(anexo.path)
    : path.resolve(path.dirname(caminhoRelatorio), anexo.path);
  const relativoProjeto = path.relative(raiz, caminho);
  const dentroProjeto = !relativoProjeto.startsWith('..') && !path.isAbsolute(relativoProjeto);
  let existe = false;
  if (dentroProjeto) {
    try {
      existe = fs.statSync(caminho).isFile();
      if (existe) fs.accessSync(caminho, fs.constants.R_OK);
    } catch {
      existe = false;
    }
  }
  return {
    nome,
    tipo: anexo.contentType || null,
    embutido: false,
    existe,
    verificavelDentroProjeto: dentroProjeto,
    caminhoRelativo: dentroProjeto ? relativoProjeto.replaceAll('\\', '/') : path.basename(caminho),
  };
}

function resumirErro(teste) {
  return teste.errosOriginais.map(erro => textoSeguro(erro.message || erro.value));
}

function renderizarMarkdown(analise) {
  const linhas = [
    '# Análise determinística de regressão — AAR',
    '',
    '- Relatório: `' + analise.execucao.arquivo + '`',
    '- Início registrado: ' + (analise.execucao.inicio || 'não informado'),
    '- Duração: ' + (analise.execucao.duracaoMs == null ? 'não informada' : analise.execucao.duracaoMs + ' ms'),
    '- Resultado do processamento: **' + analise.execucao.estado + '**',
    '',
    '## Resumo',
    '',
    '| Total | Aprovados | Reprovados | Ignorados | Inconclusivos | Flaky |',
    '| ---: | ---: | ---: | ---: | ---: | ---: |',
    '| ' + analise.resumo.total + ' | ' + analise.resumo.aprovados + ' | ' + analise.resumo.reprovados + ' | ' + analise.resumo.ignorados + ' | ' + analise.resumo.inconclusivos + ' | ' + analise.resumo.flaky + ' |',
    '',
    'Um resultado aprovado em casos AUT não comprova que o critério de aceite inteiro foi validado.',
    '',
    '## Falhas',
    '',
  ];
  const falhas = analise.testes.filter(teste => teste.status === 'failed');
  if (!falhas.length) linhas.push('Nenhuma falha foi encontrada no relatório.');
  else {
    linhas.push('| AUT | Resultado | Classificação | Bug | Critérios | Evidência da assertion |');
    linhas.push('| --- | --- | --- | --- | --- | --- |');
    for (const falha of falhas) {
      linhas.push('| ' + (falha.id || 'ID ausente') + ' | reprovado | ' + falha.classificacao.tipo +
        ' | ' + (falha.classificacao.bugId || '—') + ' | ' + (falha.criterios.join(', ') || 'sem vínculo') +
        ' | ' + (falha.classificacao.evidencia || falha.erros[0] || 'sem mensagem de assertion') + ' |');
    }
  }
  linhas.push('', '## Rastreabilidade por critério', '',
    '| Critério | AUT declarados no índice | Passaram | Falharam | Ignorados | Ausentes | Situação observada |',
    '| --- | --- | ---: | ---: | ---: | --- | --- |');
  for (const criterio of analise.cobertura.criterios) {
    linhas.push('| ' + criterio.id + ' | ' + (criterio.autDeclarados.join(', ') || 'nenhum') +
      ' | ' + criterio.aprovados + ' | ' + criterio.reprovados + ' | ' + criterio.ignorados +
      ' | ' + (criterio.autSemResultado.join(', ') || 'nenhum') + ' | ' + criterio.situacaoExecucao + ' |');
  }
  const diag = analise.diagnosticos;
  linhas.push('', '## Integridade e lacunas', '');
  linhas.push('- IDs AUT ausentes nos títulos: ' + (diag.idsAusentes.join(', ') || 'nenhum'));
  linhas.push('- IDs AUT duplicados no relatório: ' + (diag.idsDuplicados.join(', ') || 'nenhum'));
  linhas.push('- IDs AUT desconhecidos no índice: ' + (diag.idsDesconhecidos.join(', ') || 'nenhum'));
  linhas.push('- AUT declarados sem resultado: ' + (diag.autSemResultado.join(', ') || 'nenhum'));
  linhas.push('- AUT sem associação a critério: ' + (diag.autSemCriterio.join(', ') || 'nenhum'));
  linhas.push('- Anexos de arquivo ausentes: ' + (diag.anexosAusentes.map(item => item.nome).join(', ') || 'nenhum'));
  linhas.push('- Inconsistências de contagem: ' + (diag.inconsistenciasContagem.join('; ') || 'nenhuma'));
  linhas.push('', '## Pendências de revisão humana', '');
  if (!analise.cobertura.revisaoHumana.length) linhas.push('Nenhuma pendência foi registrada no índice.');
  else for (const item of analise.cobertura.revisaoHumana) {
    linhas.push('- **' + item.criterios.join(', ') + ':** ' + item.motivo);
  }
  linhas.push('', '## Classificação e limites', '');
  linhas.push('- Bug conhecido exige ID AUT presente na seção do bug e evidência compatível na mensagem da assertion.');
  linhas.push('- Falha sem essa evidência fica não classificada. Possível regressão exige histórico com o mesmo AUT, título e projeto aprovado.');
  linhas.push('- Histórico comparável: **' + (analise.historico.disponivel ? 'fornecido' : 'não fornecido') + '**. Sem histórico, regressão não é confirmada.');
  linhas.push('- A cobertura é a declarada no índice e observada neste relatório. O analisador não prova suficiência das assertions nem valida integralmente um CA.');
  linhas.push('- Corpos de requisição/resposta e conteúdo de anexos não são copiados; são registrados metadados, existência e mensagens resumidas.');
  linhas.push('- Análise determinística, sem IA; a classificação requer revisão de QA antes de decisões de aceite.');
  return linhas.join('\n') + '\n';
}

function analisarRelatorio(relatorio, opcoes = {}) {
  validarRelatorio(relatorio);
  const indice = opcoes.indice;
  if (!indice || !Array.isArray(indice.testes) || !Array.isArray(indice.criterios)) {
    throw new Error('Índice inválido: testes e criterios devem ser listas.');
  }
  const caminhoRelatorio = path.resolve(opcoes.caminhoRelatorio || path.join(raizProjeto, 'relatorio.json'));
  const brutos = coletarTestes(relatorio.suites);
  const bugs = extrairBugsDocumentados(opcoes.bugsMarkdown);
  const testesIndice = new Map();
  for (const teste of indice.testes) {
    const id = normalizarIdAut(teste.id);
    if (id) testesIndice.set(id, teste);
  }
  const criteriosPorAut = new Map();
  for (const criterio of indice.criterios) for (const aut of criterio.testes || []) {
    const id = normalizarIdAut(aut);
    if (!id) continue;
    if (!criteriosPorAut.has(id)) criteriosPorAut.set(id, []);
    criteriosPorAut.get(id).push(criterio.id);
  }

  const contagemIds = new Map();
  for (const teste of brutos) if (teste.id) contagemIds.set(teste.id, (contagemIds.get(teste.id) || 0) + 1);
  const idsDuplicados = [...contagemIds].filter(([, n]) => n > 1).map(([id]) => id);
  const idsDesconhecidos = [...new Set(brutos.filter(t => t.id && !testesIndice.has(t.id)).map(t => t.id))];
  const idsAusentes = brutos.filter(t => !t.id).map(t => t.titulo || '(título vazio)');
  const idsObservados = new Set(brutos.filter(t => t.id && testesIndice.has(t.id)).map(t => t.id));
  const autSemResultado = [...testesIndice.keys()].filter(id => !idsObservados.has(id));
  const autSemCriterio = [...testesIndice.keys()].filter(id => !criteriosPorAut.has(id));
  const historico = opcoes.historico || null;
  const anteriores = statusHistoricoPorTeste(historico);

  const testes = brutos.map(teste => {
    const criterios = teste.id ? (criteriosPorAut.get(teste.id) || []) : [];
    const bug = teste.status === 'failed' ? evidenciarBugConhecido(teste, bugs) : null;
    const chaveHistorico = [teste.id, teste.titulo, teste.projeto || ''].join('|');
    const passouAntes = anteriores.get(chaveHistorico) === 'passed';
    let classificacao;
    if (teste.status === 'failed' && bug) {
      classificacao = { tipo: 'bug-conhecido-compativel', bugId: bug.bugId, evidencia: bug.evidencia, regra: bug.regra };
    } else if (teste.status === 'failed' && passouAntes) {
      classificacao = {
        tipo: 'possivel-regressao',
        bugId: null,
        evidencia: 'O mesmo AUT, título e projeto aparece aprovado no relatório histórico fornecido.',
        regra: 'Comparação de status com histórico explícito; requer revisão humana.',
      };
    } else if (teste.status === 'failed') {
      classificacao = { tipo: 'falha-nao-classificada', bugId: null, evidencia: null, regra: 'Sem correspondência conjunta entre bug documentado e evidência da assertion.' };
    } else if (teste.status === 'skipped') {
      classificacao = { tipo: 'ignorado', bugId: null, evidencia: null, regra: 'O Playwright marcou o teste como skipped.' };
    } else if (teste.status === 'passed') {
      classificacao = { tipo: 'sem-falha-observada', bugId: null, evidencia: null, regra: 'Aprovado neste AUT; não certifica o CA completo.' };
    } else {
      classificacao = { tipo: 'resultado-inconclusivo', bugId: null, evidencia: null, regra: 'Sem resultado final aprovado, reprovado ou ignorado.' };
    }
    return {
      id: teste.id,
      titulo: textoSeguro(teste.titulo, 300),
      arquivo: teste.arquivo,
      projeto: teste.projeto,
      status: teste.status,
      tentativas: teste.tentativas,
      flaky: teste.flaky,
      criterios,
      classificacao,
      erros: resumirErro(teste),
      anexos: teste.anexosOriginais.map(anexo => verificarAnexo(anexo, caminhoRelatorio, opcoes.raizProjeto || raizProjeto)),
    };
  });

  const resumo = { total: testes.length, aprovados: 0, reprovados: 0, ignorados: 0, inconclusivos: 0, flaky: 0 };
  for (const teste of testes) {
    if (teste.status === 'passed') resumo.aprovados++;
    else if (teste.status === 'failed') resumo.reprovados++;
    else if (teste.status === 'skipped') resumo.ignorados++;
    else resumo.inconclusivos++;
    if (teste.flaky) resumo.flaky++;
  }
  const stats = relatorio.stats;
  const inconsistenciasContagem = [];
  const totalDeclarado = stats.expected + stats.unexpected + stats.skipped +
    (Number.isInteger(stats.flaky) ? stats.flaky : 0);
  if (totalDeclarado !== testes.length) {
    inconsistenciasContagem.push('stats totaliza ' + totalDeclarado + ', mas suites contém ' + testes.length + ' casos.');
  }
  const anexosAusentes = [];
  for (const teste of testes) for (const anexo of teste.anexos) {
    if (!anexo.embutido && !anexo.existe) {
      anexosAusentes.push({ aut: teste.id, nome: anexo.nome, caminhoRelativo: anexo.caminhoRelativo });
    }
  }

  const coberturaCriterios = indice.criterios.map(criterio => {
    const declarados = (criterio.testes || []).map(normalizarIdAut).filter(Boolean);
    const associados = testes.filter(teste => teste.id && declarados.includes(teste.id));
    const aprovados = associados.filter(t => t.status === 'passed').length;
    const reprovados = associados.filter(t => t.status === 'failed').length;
    const ignorados = associados.filter(t => t.status === 'skipped').length;
    const inconclusivos = associados.filter(t => !['passed', 'failed', 'skipped'].includes(t.status)).length;
    const presentes = new Set(associados.map(t => t.id));
    const faltantes = declarados.filter(id => !presentes.has(id));
    let situacao;
    if (!declarados.length) situacao = 'sem cobertura automatizada declarada';
    else if (reprovados) situacao = 'falha em caso automatizado associado';
    else if (ignorados || inconclusivos || faltantes.length) situacao = 'cobertura de execução parcial ou inconclusiva';
    else situacao = 'sem falha nos casos automatizados observados';
    return {
      id: criterio.id,
      autDeclarados: declarados,
      aprovados,
      reprovados,
      ignorados,
      inconclusivos,
      autSemResultado: faltantes,
      situacaoExecucao: situacao,
      validacaoIntegral: false,
      revisaoHumana: (indice.revisaoHumana || []).filter(item => (item.criterios || []).includes(criterio.id)).map(item => item.motivo),
    };
  });

  const incompleto = idsAusentes.length || idsDuplicados.length || idsDesconhecidos.length ||
    autSemResultado.length || autSemCriterio.length || anexosAusentes.length ||
    inconsistenciasContagem.length || resumo.inconclusivos;
  const analise = {
    versaoEsquema: 1,
    execucao: {
      arquivo: path.basename(caminhoRelatorio),
      inicio: stats.startTime || null,
      duracaoMs: Number.isFinite(stats.duration) ? stats.duration : null,
      estado: incompleto ? 'incompleto' : resumo.reprovados ? 'concluido-com-falhas' : 'concluido',
    },
    resumo,
    testes,
    cobertura: {
      criterios: coberturaCriterios,
      revisaoHumana: (indice.revisaoHumana || []).map(item => ({
        criterios: item.criterios || [],
        motivo: textoSeguro(item.motivo, 1000),
      })),
    },
    diagnosticos: { idsAusentes, idsDuplicados, idsDesconhecidos, autSemResultado, autSemCriterio, anexosAusentes, inconsistenciasContagem },
    historico: {
      disponivel: Boolean(historico),
      comparacao: historico ? 'AUT, título e projeto' : null,
      regressaoConfirmada: false,
    },
  };
  analise.markdown = renderizarMarkdown(analise);
  return analise;
}

function lerJson(caminho, rotulo) {
  let texto;
  try {
    texto = fs.readFileSync(caminho, 'utf8');
  } catch {
    throw new Error(rotulo + ' não encontrado ou inacessível: ' + path.basename(caminho));
  }
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(rotulo + ' não contém JSON válido: ' + path.basename(caminho));
  }
}

function executar(args) {
  const caminho = args[0];
  if (!caminho || caminho.startsWith('--')) {
    throw new Error('Uso: node agente-qa/analisar.cjs <relatorio-playwright.json> [--historico <relatorio-anterior.json>]');
  }
  const posHistorico = args.indexOf('--historico');
  if (posHistorico >= 0 && !args[posHistorico + 1]) throw new Error('Informe o caminho após --historico.');
  const relatorioAbsoluto = path.resolve(process.cwd(), caminho);
  const relatorio = lerJson(relatorioAbsoluto, 'Relatório');
  const indice = lerJson(path.join(__dirname, 'indice.json'), 'Índice');
  const bugsMarkdown = fs.readFileSync(path.join(raizProjeto, 'docs', 'bugs.md'), 'utf8');
  const historico = posHistorico >= 0 ? lerJson(path.resolve(process.cwd(), args[posHistorico + 1]), 'Relatório histórico') : null;
  if (historico) validarRelatorio(historico);
  const analise = analisarRelatorio(relatorio, { indice, bugsMarkdown, historico, caminhoRelatorio: relatorioAbsoluto, raizProjeto });
  const idSaida = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID();
  const pastaSaida = path.join(__dirname, 'analises', idSaida);
  fs.mkdirSync(pastaSaida, { recursive: true });
  const json = { ...analise };
  delete json.markdown;
  fs.writeFileSync(path.join(pastaSaida, 'analise.json'), JSON.stringify(json, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(pastaSaida, 'analise.md'), analise.markdown, 'utf8');
  console.log('Análise concluída: ' + path.relative(raizProjeto, pastaSaida).replaceAll('\\', '/'));
  console.log('Testes: ' + analise.resumo.total + '; aprovados: ' + analise.resumo.aprovados +
    '; reprovados: ' + analise.resumo.reprovados + '; ignorados: ' + analise.resumo.ignorados + '.');
  return pastaSaida;
}

if (require.main === module) {
  try {
    executar(process.argv.slice(2));
  } catch (erro) {
    console.error('Falha na análise: ' + erro.message);
    process.exitCode = 1;
  }
}

module.exports = { analisarRelatorio, validarRelatorio, normalizarIdAut, renderizarMarkdown, lerJson, coletarTestes, executar };
