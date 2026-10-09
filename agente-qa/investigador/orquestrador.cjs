'use strict';

const { INSTRUCOES_INVESTIGACAO } = require('./instrucoes.cjs');
const { criarFerramentas, NOMES_FERRAMENTAS, textoSeguro } = require('./ferramentas.cjs');

const PADRAO_LIMITES = Object.freeze({ iteracoes: 6, chamadasFerramenta: 8, respostaModeloChars: 12_000, historicoChars: 28_000 });
const LIMITES_ABSOLUTOS = Object.freeze({ iteracoes: 10, chamadasFerramenta: 20, respostaModeloChars: 20_000, historicoChars: 40_000, respostaFinalChars: 24_000, fatos: 20, hipoteses: 8, incertezas: 10 });
const CHAVES_FINAIS = ['fatosObservados', 'hipoteses', 'incertezas', 'revisaoHumanaObrigatoria'];

function comprimentoJson(valor) {
  try { return JSON.stringify(valor).length; } catch { return Infinity; }
}

function serializarHistorico(historico, limite) {
  const saida = [];
  let tamanho = 0;
  for (let i = historico.length - 1; i >= 0; i -= 1) {
    const item = historico[i];
    const tamanhoItem = comprimentoJson(item);
    if (tamanho + tamanhoItem > limite) break;
    saida.unshift(item);
    tamanho += tamanhoItem;
  }
  return saida;
}

function argumentoIdSeguro(args) {
  if (!args || typeof args.id !== 'string') return null;
  const id = args.id.trim().toUpperCase().replace(/\s+V/, '-V');
  return /^(?:AUT-\d{3}(?:-V\d+)?|CA\d{2}|BUG-\d{3})$/.test(id) ? id : null;
}

function finalInvalido(mensagem) {
  return { valido: false, erro: mensagem };
}

function validarFinal(final, evidenciasConsultadas) {
  if (!final || typeof final !== 'object' || Array.isArray(final)) return finalInvalido('Resposta final deve ser um objeto.');
  if (Object.keys(final).some((chave) => !CHAVES_FINAIS.includes(chave))) return finalInvalido('A resposta final contém campos não permitidos.');
  if (!Array.isArray(final.fatosObservados) || !Array.isArray(final.hipoteses) || !Array.isArray(final.incertezas)) {
    return finalInvalido('Fatos, hipóteses e incertezas devem ser listas.');
  }
  if (final.fatosObservados.length > LIMITES_ABSOLUTOS.fatos || final.hipoteses.length > LIMITES_ABSOLUTOS.hipoteses
      || final.incertezas.length > LIMITES_ABSOLUTOS.incertezas) return finalInvalido('A resposta final excede os limites de itens.');
  if (final.revisaoHumanaObrigatoria !== true) return finalInvalido('A revisão humana é obrigatória.');
  if (final.fatosObservados.some((id) => typeof id !== 'string' || !evidenciasConsultadas.has(id))) {
    return finalInvalido('Fato cita evidência que não foi consultada.');
  }
  const refsHipoteses = [];
  for (const hipotese of final.hipoteses) {
    if (!hipotese || typeof hipotese !== 'object' || Array.isArray(hipotese)
        || Object.keys(hipotese).some((key) => !['texto', 'referencias'].includes(key))
        || typeof hipotese.texto !== 'string' || !Array.isArray(hipotese.referencias) || hipotese.referencias.length === 0) {
      return finalInvalido('Hipótese inválida ou sem referências.');
    }
    if (hipotese.texto.length > 500 || hipotese.referencias.some((id) => typeof id !== 'string' || !evidenciasConsultadas.has(id))) {
      return finalInvalido('Hipótese excede limites ou cita evidência não consultada.');
    }
    if (/\bbug(?:-\d+)?\b.{0,60}\b(?:corrigid[oa]s?|resolvid[oa]s?|confirmad[oa]s?)\b|\bregress[aã]o\b.{0,60}\bconfirmad[oa]\b|\bcrit[eé]rio\b.{0,60}\baprovad[oa]\b/i.test(hipotese.texto)) {
      return finalInvalido('Não é permitido declarar bug corrigido, regressão confirmada ou critério aprovado.');
    }
    refsHipoteses.push({ texto: textoSeguro(hipotese.texto, 500), referencias: [...new Set(hipotese.referencias)] });
  }
  if (final.incertezas.some((item) => typeof item !== 'string' || item.length > 500)) return finalInvalido('Incerteza inválida ou excede o limite.');
  return {
    valido: true,
    normalizado: {
      fatosObservados: [...new Set(final.fatosObservados)].map((id) => evidenciasConsultadas.get(id)),
      hipoteses: refsHipoteses,
      incertezas: [...new Set(final.incertezas.map((item) => textoSeguro(item, 500)))],
      revisaoHumanaObrigatoria: true,
    },
  };
}

function criarOrquestrador({ modelo, ferramentas, limites = {} }) {
  const iteracoesMax = limites.iteracoes ?? PADRAO_LIMITES.iteracoes;
  const chamadasMax = limites.chamadasFerramenta ?? PADRAO_LIMITES.chamadasFerramenta;
  const tamanhoModeloMax = limites.respostaModeloChars ?? PADRAO_LIMITES.respostaModeloChars;
  const tamanhoHistoricoMax = limites.historicoChars ?? PADRAO_LIMITES.historicoChars;
  if (!modelo || typeof modelo.proximaEtapa !== 'function') throw new TypeError('Injete um adaptador com proximaEtapa(contexto).');
  if (!ferramentas || typeof ferramentas.executar !== 'function' || !Array.isArray(ferramentas.descricoes)) {
    throw new TypeError('Ferramentas de leitura não foram configuradas.');
  }
  for (const [nome, valor] of Object.entries({ iteracoesMax, chamadasMax, tamanhoModeloMax, tamanhoHistoricoMax })) {
    if (!Number.isInteger(valor) || valor < 1) throw new TypeError(`Limite inválido: ${nome}.`);
  }
  if (iteracoesMax > LIMITES_ABSOLUTOS.iteracoes || chamadasMax > LIMITES_ABSOLUTOS.chamadasFerramenta
      || tamanhoModeloMax > LIMITES_ABSOLUTOS.respostaModeloChars || tamanhoHistoricoMax > LIMITES_ABSOLUTOS.historicoChars) {
    throw new TypeError('Um limite configurado excede o máximo de segurança.');
  }

  function dadosDaReferencia(retorno, referencia) {
    const dados = retorno.dados;
    const testeId = /^analise:teste:(AUT-\d{3}(?:-V\d+)?)$/.exec(referencia.id)?.[1];
    if (testeId && Array.isArray(dados?.falhas)) return dados.falhas.find((teste) => teste.id === testeId) || { id: testeId, resultado: 'referência sem registro correspondente' };
    if (testeId && dados?.id === testeId) return dados;
    return dados;
  }

  function limitarResultadoFinal(resultado) {
    if (comprimentoJson(resultado) <= LIMITES_ABSOLUTOS.respostaFinalChars) return resultado;
    return {
      ...resultado,
      fatosObservados: resultado.fatosObservados.slice(0, LIMITES_ABSOLUTOS.fatos).map(({ id, fonte, tipo }) => ({ id, fonte, tipo })),
      incertezas: [...resultado.incertezas, 'Detalhes foram reduzidos para respeitar o limite de tamanho da resposta.'],
      limitacoes: [...resultado.limitacoes, 'O resultado final foi compactado por limite de tamanho.'],
    };
  }

  async function investigar(pergunta = 'Analise a execução disponível e identifique evidências, hipóteses e lacunas.') {
    const perguntaSegura = textoSeguro(pergunta, 1_000);
    const historico = [{ papel: 'solicitante', conteudo: perguntaSegura }];
    const logFerramentas = [];
    const evidenciasConsultadas = new Map();
    let chamadas = 0;

    for (let iteracao = 1; iteracao <= iteracoesMax; iteracao += 1) {
      let resposta;
      try {
        resposta = await modelo.proximaEtapa({
          instrucoes: INSTRUCOES_INVESTIGACAO,
          ferramentas: ferramentas.descricoes,
          historico: serializarHistorico(historico, tamanhoHistoricoMax),
        });
      } catch {
        return resultadoInconclusivo('O adaptador do modelo não retornou uma resposta válida.', iteracao, chamadas, logFerramentas, evidenciasConsultadas);
      }
      if (comprimentoJson(resposta) > tamanhoModeloMax) {
        return resultadoInconclusivo('A resposta do modelo excedeu o limite configurado.', iteracao, chamadas, logFerramentas, evidenciasConsultadas);
      }
      if (!resposta || typeof resposta !== 'object' || Array.isArray(resposta)) {
        return resultadoInconclusivo('Resposta malformada do modelo.', iteracao, chamadas, logFerramentas, evidenciasConsultadas);
      }

      if (resposta.tipo === 'ferramentas' && Array.isArray(resposta.chamadas) && Object.keys(resposta).every((key) => ['tipo', 'chamadas'].includes(key))) {
        if (!resposta.chamadas.length) return resultadoInconclusivo('O modelo solicitou uma lista vazia de ferramentas.', iteracao, chamadas, logFerramentas, evidenciasConsultadas);
        for (const chamada of resposta.chamadas) {
          if (chamadas >= chamadasMax) return resultadoInconclusivo('Limite de chamadas de ferramenta atingido.', iteracao, chamadas, logFerramentas, evidenciasConsultadas);
          chamadas += 1;
          const nome = chamada && typeof chamada.nome === 'string' ? chamada.nome.slice(0, 80) : '[inválida]';
          const id = argumentoIdSeguro(chamada?.argumentos);
          let retorno;
          if (!chamada || typeof chamada !== 'object' || Array.isArray(chamada)
              || Object.keys(chamada).some((key) => !['nome', 'argumentos'].includes(key))) {
            retorno = { ok: false, erro: { codigo: 'CHAMADA_INVALIDA', mensagem: 'Formato de chamada inválido.' }, referencias: [] };
          } else {
            try {
              retorno = ferramentas.executar(nome, chamada.argumentos || {});
            } catch {
              retorno = { ok: false, erro: { codigo: 'FERRAMENTA_INDISPONIVEL', mensagem: 'A consulta não pôde ser concluída.' }, referencias: [] };
            }
          }
          const codigo = retorno?.ok ? 'ok' : (retorno?.erro?.codigo || 'erro');
          logFerramentas.push({ nome: NOMES_FERRAMENTAS.includes(nome) ? nome : '[desconhecida]', id, resultado: codigo });
          if (retorno?.ok && Array.isArray(retorno.referencias)) {
            for (const referencia of retorno.referencias) {
              if (referencia && typeof referencia.id === 'string' && typeof referencia.fonte === 'string'
                  && /^(?:analise:resumo|analise:teste:AUT-\d{3}(?:-V\d+)?|analise:criterio:CA\d{2}|indice:criterio:CA\d{2}|docs:bug:BUG-\d{3})$/.test(referencia.id)) {
                evidenciasConsultadas.set(referencia.id, {
                  id: referencia.id,
                  fonte: textoSeguro(referencia.fonte, 160),
                  tipo: textoSeguro(referencia.tipo, 100),
                  dados: dadosDaReferencia(retorno, referencia),
                });
              }
            }
          }
          historico.push({ papel: 'ferramenta', nome: NOMES_FERRAMENTAS.includes(nome) ? nome : '[desconhecida]', resultado: retorno });
        }
        continue;
      }

      if (resposta.tipo === 'final' && Object.keys(resposta).every((key) => ['tipo', 'resultado'].includes(key))) {
        const validacao = validarFinal(resposta.resultado, evidenciasConsultadas);
        if (!validacao.valido) return resultadoInconclusivo(validacao.erro, iteracao, chamadas, logFerramentas, evidenciasConsultadas);
        return limitarResultadoFinal({
          estado: 'concluida-com-revisao-humana',
          ...validacao.normalizado,
          auditoria: { iteracoes: iteracao, chamadasFerramenta: chamadas, ferramentasConsultadas: logFerramentas },
          limitacoes: ['Conclusões semânticas das hipóteses não são verificadas pelo núcleo determinístico.'],
        });
      }
      return resultadoInconclusivo('Resposta malformada ou tipo de etapa não permitido.', iteracao, chamadas, logFerramentas, evidenciasConsultadas);
    }
    return resultadoInconclusivo('Limite de iterações atingido.', iteracoesMax, chamadas, logFerramentas, evidenciasConsultadas);
  }

  function resultadoInconclusivo(motivo, iteracoes, chamadas, log, evidencias) {
    return limitarResultadoFinal({
      estado: 'inconclusivo',
      fatosObservados: [...evidencias.values()],
      hipoteses: [],
      incertezas: [textoSeguro(motivo, 300), 'A análise requer revisão humana.'],
      revisaoHumanaObrigatoria: true,
      auditoria: { iteracoes, chamadasFerramenta: chamadas, ferramentasConsultadas: log },
      limitacoes: ['Nenhuma hipótese ou classificação do modelo foi aceita como fato.'],
    });
  }

  return { investigar };
}

module.exports = { criarOrquestrador, validarFinal, PADRAO_LIMITES };
