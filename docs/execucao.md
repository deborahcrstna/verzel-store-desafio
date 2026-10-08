# Registro de execução

## Situação atual

A regressão final foi executada no PowerShell externo em **08/10/2026 às 18:59:18 (America/Manaus)**: **20 testes, 15 passaram, cinco falharam, zero skipped e zero flaky**, com duração de 17,2 segundos. AUT-003-V2, AUT-003-V4 e AUT-006-V2 reproduzem BUG-001; AUT-004-V2 e AUT-008 reproduzem BUG-002. AUT-007-V1/V2 passaram. As cinco falhas são divergências observadas da aplicação em relação aos requisitos, não erros da automação. O relatório HTML local foi conferido visualmente e confirma a contagem; como `playwright-report/` é ignorado pelo Git, ele não será disponibilizado no repositório público. Os detalhes da execução instrumentada manual/exploratória estão em [execucao-etapa5.md](execucao-etapa5.md); não equivalem a uma avaliação humana independente.

### Última regressão automatizada — 08/10/2026, 18:59:18 (America/Manaus)

| Resultado | Testes |
| --- | --- |
| Total | 20 |
| Passaram | 15 |
| Falharam | 5 |
| Skipped | 0 |
| Flaky | 0 |
| Duração | 17,2 segundos |
| BUG-001 | AUT-003-V2, AUT-003-V4, AUT-006-V2 |
| BUG-002 | AUT-004-V2, AUT-008 |

A regressão confirmou os dois defeitos já registrados. AUT-008 recebeu HTTP 201 para seis unidades em `POST /api/pedidos`, embora o esperado documentado seja HTTP 422 com `QUANTIDADE_MAXIMA_EXCEDIDA`. AUT-007-V1/V2 retornaram os valores e mensagens esperados para cupom inexistente/expirado. O contexto detalhado do AUT-008 e o último resumo do Playwright estão em `test-results/etapa2-20261008-01/`, pasta temporária ignorada pelo Git; não foi criado um novo arquivo de evidência versionado para essa regressão.

## Execução assistida — etapa 5, 08/10/2026 (America/Manaus)

- [Registro detalhado por cenário/variante, com dados, passos, esperado, observado, status e evidências](execucao-etapa5.md).
- MAN-001/002: cálculo HTTP 200 e UI mostraram mensagens de cupom inválido/expirado, sem desconto. MAN-003: aplicação, prevenção de segundo cupom pelo controle, remoção e reaplicação. MAN-004: UI bloqueou sexta unidade de P005 e aceitou P008 como sexta unidade total. MAN-005: cálculo 239,70 − 23,97 + 0 = 215,73 na API/UI.
- MAN-006: 12/12 variantes de validação de itens/JSON passaram. MAN-007: 5/5 rotas/métodos passaram. MAN-008: 8/8 variantes negativas passaram em API e UI; V9/V10 positivos foram cobertos por MAN-009. MAN-009: 4/4 combinações de CEP/cupom passaram em ambas as camadas, com pedidos fictícios 201. MAN-010: 2/2 erros de cupom no pedido passaram. MAN-011: cinco unidades passaram, mas seis foram aceitas indevidamente em duas tentativas de `POST /api/pedidos`, vinculadas a BUG-002. MAN-012: 5/5 normalizações passaram na UI.
- EXP-001: fluxo exploratório com cupom antes do aumento de quantidade reproduziu BUG-001; EXP-002 e EXP-003 observaram recuperação de cupom/entradas e bloqueio de quantidade, sem novo defeito. As durações instrumentadas reais e evidências estão no registro detalhado.

## Execução de UI e regressão — etapa 4, 08/10/2026 04:52 (America/Manaus)

- **Ambiente:** Verzel Store QA, VZS-142 v2.3.0, Windows, Playwright 1.64.0, Chromium 156.0.8078.4, sessões independentes por teste. URL: `https://verzel-store.qa-test-verzel-store.workers.dev/`.
- **Comando inicial:** `npm run test`: 17 testes, 12 PASSARAM e cinco FALHARAM; saída 1. AUT-006-V1 falhou apenas porque a asserção esperava o texto `R$ 0,00` para o frete, enquanto a interface exibia `Grátis`. A captura confirmou subtotal 219,80, desconto 21,98 e total 197,82. A asserção de apresentação foi corrigida para `Grátis`, sem mudar o valor financeiro esperado.
- **Regressão final:** `npm test`: 17 testes, 13 PASSARAM e quatro FALHARAM; saída 1. As falhas são AUT-003-V2, AUT-003-V4, AUT-004-V2 e AUT-006-V2. Os testes de API e seus esperados permaneceram inalterados. Relatório Playwright em `playwright-report/`; traces e screenshot automática para AUT-006-V2 em `test-results/`.
- **AUT-005 — PASSOU:** P005 ×1. Após aplicar BEMVINDO10, subtotal R$ 100,00, desconto R$ 10,00, frete R$ 19,90 e total R$ 109,90; após remover, desconto R$ 0,00 e total R$ 119,90, mantendo subtotal e frete. [Cupom aplicado](../evidencias/interface/AUT-005-aplicado-2026-10-08.png), [cupom removido](../evidencias/interface/AUT-005-removido-2026-10-08.png).
- **AUT-006-V1 — PASSOU:** P003 ×1 + P006 ×1 com BEMVINDO10. Subtotal R$ 219,80, desconto R$ 21,98, frete exibido como `Grátis` (R$ 0,00) e total R$ 197,82. [Captura](../evidencias/interface/AUT-006-V1-2026-10-08.png).
- **AUT-006-V2 — FALHOU:** P005 ×2 sem cupom; quantidade 2 e subtotal R$ 200,00 observados. Desconto R$ 0,00, frete **R$ 19,90** e total **R$ 219,90**, em vez de frete grátis e total R$ 200,00. A UI também mostra `Faltam R$ 0,00 para o frete grátis.`. [Captura](../evidencias/interface/AUT-006-V2-2026-10-08.png). Corresponde ao mesmo payload e resultado de AUT-003-V2 na API, confirmando manifestação de [BUG-001](bugs.md) na interface; não foi aberto terceiro bug.
- **Cobertura de UI:** AUT-005 exercitou CA01/CA05/CA09 e valores de CA11; AUT-006-V1 exercitou CA06/CA08 e valores de CA11 acima do limite; AUT-006-V2 evidenciou falha de CA06 no limite inclusivo. Naquele ponto histórico da etapa 4, CA07, CA10 em pedido, mensagens inválidas/expiradas e os cenários manuais/exploratórios ainda estavam pendentes. Posteriormente, AUT-007/008 e as execuções da etapa 5 ampliaram essa cobertura; ver o status atual acima e a matriz.

## Execução e preparação — etapa 3.4, 08/10/2026 (America/Manaus)

- **Ambiente:** Verzel Store QA, VZS-142 v2.3.0, Windows, Playwright 1.64.0, Chromium 156.0.8078.4; `POST https://verzel-store.qa-test-verzel-store.workers.dev/api/carrinho/calcular`.
- **Isolado:** `npm run test -- --grep AUT-003-V6`: 1/1 PASSOU. Repetição isolada com `--reporter=json` também passou para preservar o anexo da requisição/resposta. [Evidência JSON](../evidencias/api/AUT-003-V6-2026-10-08.json) extraída desse anexo; contém dados fictícios, status HTTP 200 e corpo real.
- **AUT-003-V6 observado:** P003 ×1 + P006 ×1 com `BEMVINDO10`; subtotal 219,80, desconto 21,98, frete 0, `freteGratis: true`, faltante 0, total 197,82 e `cupom.aplicado: true`. A diferença subtotal − desconto é 197,82; o contrato não contém campo separado para ela. **PASSOU:** CA08 confirmado na API nessa partição, sem usar o limite exato de BUG-001.
- **Regressão:** `npm run test`: 14 testes, 11 PASSARAM e três FALHARAM; código de saída 1. AUT-001 1/1, AUT-002 5/5, AUT-003 V1/V3/V5/V6 passaram e V2/V4 falharam, AUT-004 V1 passou e V2 falhou. As três falhas repetiram os resultados de BUG-001 e BUG-002 sem mudança de expectativas. Relatório HTML em `playwright-report/`; traces das falhas em `test-results/`.
- **Inspeção exploratória da UI, sem automação e sem checkout:** vitrine em `/`, carrinho em `/carrinho`. Produtos são `article` com nome acessível e botão `Adicionar ao carrinho`; navegação tem link `Carrinho N itens no carrinho`. No carrinho, cada item tem grupo `Quantidade de <produto>`, botões `Diminuir quantidade de <produto>` e `Aumentar quantidade de <produto>`, e `status` com a quantidade. Cupom usa textbox `Cupom de desconto`, botão `Aplicar cupom` e, após aplicação, botão `Remover cupom`. A região `Resumo do pedido` exibe subtotal, desconto, frete, total e aviso de frete; os valores estão em `dd[data-valor="subtotal|desconto|frete|total"]`. As atualizações são assíncronas: aguardar valores/controles observáveis. Em P006 ×5, o botão de aumentar ficou desabilitado e apareceu `Limite de 5 unidades por produto.`. Essa observação da UI não altera o estado de BUG-002, que se refere à API.

## Regressão completa — etapa 3.3, 08/10/2026 04:28 (America/Manaus)

- **Comando:** `npm run test` (Playwright Test, projeto Chromium, 13 testes com oito workers). Código de saída 1 devido às três falhas abaixo.
- **Ambiente:** Verzel Store QA, VZS-142 v2.3.0; endpoint `POST https://verzel-store.qa-test-verzel-store.workers.dev/api/carrinho/calcular`; Windows, Playwright 1.64.0, Chromium.
- **AUT-001:** PASSOU (1/1). **AUT-002:** PASSARAM V1–V5 (5/5).
- **AUT-003:** PASSARAM V1, V3 e V5; FALHARAM V2 e V4. Em V2, HTTP 200, subtotal 200 e faltante 0, mas frete 19,90, `freteGratis: false` e total 219,90 (esperado frete 0, `true`, total 200). Em V4, HTTP 200, subtotal 200 e desconto 20, mas frete 19,90, `freteGratis: false` e total 199,90 (esperado frete 0, `true`, total 180). As duas variantes reproduzem BUG-001; V4 não confirma defeito distinto em CA08.
- **AUT-004:** PASSOU V1; FALHOU V2. Para P006 × 6, a API retornou HTTP 200 e total 199,30, sem `erro`, em vez de HTTP 422 com `erro.codigo: QUANTIDADE_MAXIMA_EXCEDIDA`. Reproduz BUG-002.
- **Evidências:** requisições/respostas JSON preservadas nas linhas por variante abaixo; a execução atual gerou `playwright-report/` e traces em `test-results/` para as três falhas. As evidências JSON são das execuções iniciais e dos retestes da etapa 3.2; a regressão repetiu as mesmas divergências, mas não gerou novos JSON versionados.
- **CA08, proposta da etapa 3.3 (implementada na etapa 3.4):** P003 × 1 (R$ 189,90) e P006 × 1 (R$ 29,90), cupom `BEMVINDO10`. Esperado: HTTP 200, subtotal R$ 219,80, desconto R$ 21,98, frete R$ 0,00, `freteGratis: true`, faltante R$ 0,00 e total R$ 197,82. O subtotal após desconto fica abaixo de R$ 200,00, sem usar o limite exato que falha em BUG-001. Resultado atual registrado na seção da etapa 3.4 acima.

A candidata informou que os testes iniciais do instalador passaram no Chromium. Esse relato não representa execução de CA01–CA11. Não associar os relatórios antigos a estes cenários.

### Evidências automatizadas preservadas — AUT-001 a AUT-004

Os oito registros abaixo foram conferidos no disco antes da inclusão dos links. Os arquivos identificam o cenário como aprovado e preservam a requisição e a resposta real daquela execução.

| Cenário | Resultado registrado | Evidência |
| --- | --- | --- |
| AUT-001 | PASSOU — HTTP 200; P001 ×1, subtotal 59,90, desconto 5,99, frete 19,90, total 73,81 | [Requisição e resposta AUT-001](../evidencias/api/AUT-001-2026-10-08.json) |
| AUT-002-V1 | PASSOU — HTTP 200; código canônico, desconto 10,00 e total 109,90 | [Requisição e resposta AUT-002-V1](../evidencias/api/AUT-002-V1-2026-10-08.json) |
| AUT-002-V2 | PASSOU — HTTP 200; código em minúsculas, desconto 10,00 e total 109,90 | [Requisição e resposta AUT-002-V2](../evidencias/api/AUT-002-V2-2026-10-08.json) |
| AUT-002-V3 | PASSOU — HTTP 200; caixa mista, desconto 10,00 e total 109,90 | [Requisição e resposta AUT-002-V3](../evidencias/api/AUT-002-V3-2026-10-08.json) |
| AUT-002-V4 | PASSOU — HTTP 200; espaços externos, desconto 10,00 e total 109,90 | [Requisição e resposta AUT-002-V4](../evidencias/api/AUT-002-V4-2026-10-08.json) |
| AUT-002-V5 | PASSOU — HTTP 200; minúsculas e espaços externos, desconto 10,00 e total 109,90 | [Requisição e resposta AUT-002-V5](../evidencias/api/AUT-002-V5-2026-10-08.json) |
| AUT-003-V3 | PASSOU — HTTP 200; P007 ×1, subtotal e total 229,90, frete grátis | [Requisição e resposta AUT-003-V3](../evidencias/api/AUT-003-V3-2026-10-08.json) |
| AUT-004-V1 | PASSOU — HTTP 200; P006 ×5, subtotal 149,50, frete 19,90, total 169,40 | [Requisição e resposta AUT-004-V1](../evidencias/api/AUT-004-V1-2026-10-08.json) |

O relatório `playwright-report/index.html` da regressão acima foi aberto e conferido visualmente; seus números são 20 testes, 15 aprovados, 5 reprovados, 0 skipped e 0 flaky. O arquivo permanece apenas no ambiente local, ignorado pelo Git, e não será disponibilizado no repositório público. As evidências versionáveis por cenário permanecem nos links desta seção e nos registros históricos abaixo.

## Controle consolidado dos cenários

Os resultados abaixo refletem os registros mais recentes disponíveis. A descrição detalhada por variante e as evidências históricas permanecem nas seções da etapa correspondente e em execucao-etapa5.md.

| Grupo | Resultado mais recente | Evidência / observação |
| --- | --- | --- |
| AUT-001–AUT-006 | 13 aprovados, 4 reprovados no marco da etapa 4 (17 testes) | Falhas então observadas: AUT-003-V2/V4, AUT-004-V2 e AUT-006-V2. |
| AUT-007-V1/V2 | 2 aprovados | Códigos e mensagens do cálculo registrados em MAN-001/MAN-002; resultado automatizado resumido acima. |
| AUT-008 | Reprovado — BUG-002 | HTTP 201 para seis unidades em POST /api/pedidos; contexto temporário em test-results/. |
| Regressão automatizada consolidada | 20 testes: 15 aprovados, 5 reprovados | Reprovados: AUT-003-V2/V4, AUT-004-V2, AUT-006-V2 e AUT-008. |
| MAN-001–MAN-010, MAN-012 | Passaram conforme variantes registradas | Execução assistida/instrumentada por Codex; detalhes, datas, resultados e evidências em execucao-etapa5.md. |
| MAN-011 | Cinco unidades passou; seis unidades falhou em duas tentativas (BUG-002) | [Primeira execução](../evidencias/api/MAN-011-seis-2026-10-08.json), [reteste](../evidencias/api/MAN-011-seis-reteste-2026-10-08.json). |
| EXP-001 | Reproduziu BUG-001; sem novo defeito | Sequência e observações em execucao-etapa5.md. |
| EXP-002/EXP-003 | Nenhuma divergência nova observada | Explorações assistidas; não equivalem a aprovação integral de todos os critérios citados. |

## Modelo de registro detalhado

- Data/hora e fuso:
- Responsável:
- Cenário, variante e CA/contrato:
- URL e versão da aplicação:
- Sistema, Node, Playwright e navegador/versão:
- Pré-condições e dados fictícios:
- Comando ou passos manuais:
- Resultado esperado:
- Resultado observado (status/corpo HTTP ou valores/mensagem na UI):
- Resultado: Passou / Falhou / Bloqueado / NÃO EXECUTADO.
- Evidência (caminho relativo):
- Bug relacionado, se reproduzido:
- Reteste:

Passou exige confronto do observado com o esperado; Falhou exige divergência registrada; Bloqueado exige motivo que impediu a execução. Arquivos ainda sem implementação permanecem NÃO EXECUTADO.

## Evidências

Salvar requisição/resposta de API em evidencias/api/ e capturas selecionadas de UI em evidencias/interface/. Usar dados fictícios. Nome sugerido: ID-variante-AAAA-MM-DD-descricao.ext.

O Playwright gera relatório HTML em playwright-report/ e artefatos em test-results/. A configuração captura screenshots de UI e retém traces em falhas; testes apenas de API não geram screenshot de página automaticamente. Copiar os arquivos selecionados para as pastas de entrega antes de limpar resultados temporários. Não usar a evidência de uma variante como prova de outra.

## Verificação da infraestrutura

A preparação e a leitura de requisitos não contam como testes funcionais.
- 08/10/2026: ambiente inspecionado com Node v24.18.0, npm 11.16.0 e Playwright 1.64.0.
- 08/10/2026: npm run test:list -- --reporter=list carregou a configuração e retornou zero testes, com mensagem No tests found e código de saída 1, esperado nesta etapa. A listagem não executa cenários nem chama a aplicação. O reporter de terminal evitou gerar/substituir relatório HTML nesta verificação.
- 08/10/2026: conferência local confirmou os 18 arquivos esperados (incluindo o exemplo preservado), links Markdown locais válidos, CA01–CA11 na matriz, dependências coerentes com o lockfile e arquivos API/UI sem testes implementados. Nenhuma aprovação funcional foi inferida.



## Revisão documental da etapa 2 — 08/10/2026

Atividade de revisão, não execução funcional. Leitura visual integral das 12 páginas; PDFs sem camada de texto extraível.

- R1: documentacao.pdf, 7 páginas, SHA-256 ad9a70eb296463651081b38518c08c517dec695453552c2a5eb7dcc256a77110.
- R2: Teste tecnico QA Junior - Verzel.pdf, 5 páginas, SHA-256 2b8a65d25d0a0e216c2a6cf6810ac568b1904c398d95afbe0476e7156f931aff.
- Originais na pasta Documents da candidata, fora do repositório. Imagens renderizadas são intermediários de leitura, não evidências funcionais.
- Resolvida a pendência de leitura de PDFs; registradas exigências de entrega, exploração manual e normalização do cupom na UI.
- AUT-003 V3 passou de 229,90 para 209,40, o vizinho atingível acima de 200,00; desconto 20,94 e total 188,46. O valor anterior estava correto, mas era representante da partição acima, não vizinho.
- Enumeração local de quantidades 0–5 dos oito produtos confirmou os vizinhos 199,90/209,40, sem chamadas à API.
- Confirmados 200 no cálculo e 422 no pedido para cupons inválidos/expirados.
- Seis objetivos de automação (4 API + 2 UI), 12 cenários manuais e três sessões exploratórias: todos os 21 registros e variantes NÃO EXECUTADO.
- Revisão humana e autorização para implementar testes continuam pendentes. Nenhum pedido, commit ou publicação.

### Registro futuro de exploração

Além do modelo de execução, informar objetivo, duração real, sequência de ações, observações, dúvidas e critérios exercitados. Registrar resultado por cenário derivado e vincular evidências; uma sessão não aprova automaticamente todos os critérios citados.

### Índice futuro de evidências

| Cenário/variante ou sessão | Tipo (API/UI) | Arquivo selecionado | Resultado relacionado |
| --- | --- | --- | --- |
| A preencher após execução | — | Nenhuma evidência funcional nesta etapa | NÃO EXECUTADO |

- Conferência final da revisão: 15 conjuntos financeiros verificados em centavos, 11 critérios na matriz, 4 objetivos API e 2 UI, 21 registros NÃO EXECUTADO e links locais válidos. Comparação com os arquivos anteriores confirmou alterações somente nos seis documentos de docs/ e no README; testes, configuração, package.json, lockfile e .gitignore preservados. Essa conferência é documental, não resultado funcional.

## Execução de API — etapa 3.1 (08/10/2026)

Comando: `npx playwright test tests/api/cupons.spec.ts --project=chromium`. Escopo: AUT-001 e AUT-002 V1–V5. Resultado do Playwright: **6 passed (2.1s)**, código de saída 0, sem falhas, retries ou testes pulados. O relatório HTML foi gerado em `playwright-report/`; `test-results/.last-run.json` registrou `passed` e lista vazia de falhas.

- AUT-001: P001 ×1 com BEMVINDO10 retornou HTTP 200, subtotal 59.9, desconto 5.99, frete 19.9, `freteGratis` false, faltante 140.1, total 73.81 e cupom BEMVINDO10 aplicado com mensagem não vazia.
- AUT-002 V1–V5: P005 ×1 com código canônico, minúsculo, misto, com espaços externos e minúsculo com espaços externos retornou HTTP 200 em chamadas independentes. Todas retornaram cupom BEMVINDO10 aplicado, subtotal 100, desconto 10, frete 19.9, `freteGratis` false, faltante 100 e total 109.9.

As evidências vinculadas na tabela foram extraídas dos anexos reais de requisição e resposta do relatório. Contêm apenas IDs de produtos, quantidades, cupons e respostas do ambiente fictício. Nenhuma chamada a `/api/pedidos` foi feita. CA01, CA02 e CA09 foram exercitados pela API; os valores de CA11 foram conferidos nestes casos, enquanto o desempate do arredondamento continua indefinido. Nenhum bug foi confirmado.


## Refinamento documental — etapa 2.1

Revisão de planejamento em 08/10/2026, sem execução funcional. Recalculados os 15 conjuntos financeiros distintos em centavos, incluindo subtotal, desconto, frete, faltante e total; nenhum erro aritmético encontrado.

A enumeração das 6^8 = 1.679.616 combinações (quantidades 0–5 de cada produto; 1.679.615 carrinhos não vazios) confirmou a afirmação anterior de vizinhos 199,90/209,40. Para simplificar a justificativa do teste, o planejamento passa a chamar 209,40 apenas de “subtotal reproduzível acima de R$ 200,00”. Essa redação não altera os dados nem os resultados esperados.

Matriz refinada com modalidade explícita, prioridade, resultado e evidência pendente. README reorganizado; pré-condições, variantes e natureza dos cenários esclarecidas. Os registros históricos acima são conferências documentais, não evidências da aplicação. Os 21 registros continuam NÃO EXECUTADO. Nenhum arquivo de automação, configuração ou dependência foi alterado.

## Execução de API — etapa 3.2 (08/10/2026)

Comando inicial: `npx playwright test tests/api/frete.spec.ts tests/api/validacoes.spec.ts --project=chromium`. Resultado: 7 casos, 4 passed e 3 failed; saída 1. AUT-001/002 não foram reexecutados nesta etapa.

Primeira tentativa de selecionar retestes com uma expressão contendo barras verticais falhou antes de iniciar o Playwright por interpretação do shell. Comando de reteste efetivo: `npx playwright test tests/api/frete.spec.ts tests/api/validacoes.spec.ts --project=chromium --grep AUT-00[34]-V[24]`. Somente AUT-003-V2, AUT-003-V4 e AUT-004-V2 foram executados; os três falharam novamente, saída 1. Reteste às 03:46 (America/Manaus), sem alterar expectativas.

| Variante | Esperado | Observado na execução e no reteste | Classificação |
| --- | --- | --- | --- |
| AUT-003-V2 | Subtotal 200; frete 0; freteGratis true; faltante 0; total 200 | HTTP 200, subtotal 200, frete 19.9, freteGratis false, faltante 0, total 219.9 | [BUG-001](bugs.md) |
| AUT-003-V4 | Subtotal 200; desconto 20; frete 0; freteGratis true; faltante 0; total 180 | HTTP 200, subtotal 200, desconto 20, frete 19.9, freteGratis false, faltante 0, total 199.9 | [BUG-001](bugs.md) |
| AUT-004-V2 | HTTP 422 e erro.codigo QUANTIDADE_MAXIMA_EXCEDIDA para P006 ×6 | HTTP 200, seis unidades aceitas, subtotal 179.4, sem objeto erro | [BUG-002](bugs.md) |

Os payloads usam IDs, preços e quantidades documentados. O contrato de R1, pp. 2 e 6–7, confirma o limiar inclusivo e o erro de quantidade. A API calcula corretamente o subtotal de 200 e o desconto de 20 em V4; a cobrança do frete no limiar e a aceitação da sexta unidade são divergências reproduzidas. Não há indício de erro de fixture, rota ou dados de teste. As evidências JSON contêm as requisições/respostas reais, sem dados pessoais. Nenhuma chamada a /api/pedidos foi feita.

V4 sozinho não separa CA08 da falha do limite inclusivo: V2, sem cupom, já cobra frete com o mesmo subtotal de 200. Na etapa 3.2, a validação isolada da elegibilidade antes do desconto permanecia pendente; foi executada como V6 na etapa 3.4. Não atribuir uma causa interna a V4 sem evidência.

Depois da investigação, as asserções de AUT-003/004 foram ajustadas para mostrar todas as diferenças da mesma resposta no relatório, sem alterar payloads ou valores esperados. O comando inicial foi repetido com o código final: **4 passaram, 3 falharam novamente** (saída 1). AUT-003 V2/V4 indicaram frete, `freteGratis` e total divergentes; AUT-004 V2 indicou HTTP 200 e ausência de `erro.codigo`/`erro.mensagem`. Esse resultado descreve a etapa 3.2; o relatório HTML local foi substituído pela regressão da etapa 3.4.
