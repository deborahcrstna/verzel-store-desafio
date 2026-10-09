'use strict';

const path = require('node:path');
const { executar: executarAnalise } = require('./analisar.cjs');
const { main: investigar } = require('./investigador/cli.cjs');

const caminhoFixture = path.join(__dirname, 'fixtures', 'playwright-regressao-referencia-2026-10-09.json');
const raizProjeto = path.resolve(__dirname, '..');

function formatarClassificacoes(classificacoes) {
  if (!classificacoes.length) return ['- Nenhuma falha reprovada.'];
  return classificacoes.map((item) => `- ${item.id}: ${item.tipo}${item.bugId ? ` (${item.bugId})` : ''}`);
}

async function executarDemonstracao(dependencias = {}) {
  const analisar = dependencias.executarAnalise || executarAnalise;
  const investigarCli = dependencias.investigar || investigar;
  const stdout = dependencias.stdout || ((texto) => process.stdout.write(texto));
  const stderr = dependencias.stderr || ((texto) => process.stderr.write(texto));

  let pastaAnalise;
  try {
    pastaAnalise = analisar([caminhoFixture]);
  } catch {
    stderr('Falha segura: não foi possível processar a fixture local.\n');
    return 1;
  }

  let saidaInvestigador = '';
  let erroInvestigador = '';
  const codigo = await investigar(
    ['--modo', 'simulado', '--analise', path.join(pastaAnalise, 'analise.json')],
    { stdout: (texto) => { saidaInvestigador += texto; }, stderr: (texto) => { erroInvestigador += texto; } },
  );
  if (codigo !== 0 || erroInvestigador) {
    stderr('Falha segura: a investigação local terminou sem conclusão.\n');
    return codigo || 1;
  }

  let resultado;
  try { resultado = JSON.parse(saidaInvestigador); } catch {
    stderr('Falha segura: o investigador não retornou JSON válido.\n');
    return 1;
  }
  const consulta = resultado.investigacao?.auditoria?.ferramentasConsultadas || [];
  const linhas = [
    '',
    'Demonstração offline do AAR (investigador simulado; não é uma análise por IA real).',
    'Etapa determinística: EXECUTADA nesta demonstração sobre uma fixture sanitizada versionada.',
    `Execução de referência: ${resultado.execucao.inicio || 'data não informada'}`,
    `Testes: ${resultado.execucao.contagens.total}; aprovados: ${resultado.execucao.contagens.aprovados}; reprovados: ${resultado.execucao.contagens.reprovados}; ignorados: ${resultado.execucao.contagens.ignorados}; flaky: ${resultado.execucao.contagens.flaky}.`,
    'Classificações determinísticas:',
    ...formatarClassificacoes(resultado.classificacoesDeterministicas || []),
    'Ferramentas locais consultadas:',
    ...(consulta.length ? consulta.map((item) => `- ${item.nome}: ${item.resultado}`) : ['- Nenhuma.']),
    `Investigação simulada: ${resultado.investigacao.estado}.`,
    'Revisão humana obrigatória: sim.',
    'Limitação: o modelo simulado exercita o protocolo local; não valida respostas de uma IA real.',
    `Análise criada em: ${path.relative(raizProjeto, pastaAnalise).replaceAll('\\', '/')}`,
    '',
  ];
  stdout(linhas.join('\n'));
  return 0;
}

if (require.main === module) {
  executarDemonstracao().then((codigo) => { process.exitCode = codigo; });
}

module.exports = { executarDemonstracao, caminhoFixture };
