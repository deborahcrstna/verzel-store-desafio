# Execução assistida de cenários manuais e exploração — etapa 5

**Data:** 08/10/2026, aproximadamente 04:59–05:03 (America/Manaus). **Ambiente:** Verzel Store QA, VZS-142 v2.3.0, Windows, Node 24.18.0, Chromium 156.0.8078.4, `https://verzel-store.qa-test-verzel-store.workers.dev`. **Executor:** Codex, por interações instrumentadas no Chromium e chamadas HTTP sequenciais. Estas são observações reais da aplicação, mas não substituem uma revisão humana de usabilidade. Carrinho/contexto novo por variante de UI; chamadas de API independentes. Dados de cliente exclusivamente fictícios: Maria Silva, `maria@example.com`, CEPs documentados. Pedidos aceitos são fictícios e não persistidos, conforme R1 p. 7. Nenhum teste de carga foi realizado.

As fontes para os esperados são `documentacao.pdf` (R1, pp. 1–7) e [documentação oficial da loja](https://verzel-store.qa-test-verzel-store.workers.dev/documentacao), VZS-142 v2.3.0. Os passos específicos abaixo complementam as pré-condições e dados de [cenarios-de-teste.md](cenarios-de-teste.md). Cada link JSON contém entrada, horário e resposta ou estado acessível observado; os JSON de UI apontam para screenshots reais da mesma execução. **PASSOU** significa que todas as verificações previstas daquela variante corresponderam ao esperado; **FALHOU** conserva a divergência.

## Cupons, quantidade e valores na UI/API

| ID | Pré-condição, ação e dado | Esperado | Observado | Status e evidência |
| --- | --- | --- | --- | --- |
| MAN-001 API/UI | P005 ×1; calcular/aplicar `NAOEXISTE142` | Cálculo 200, sem desconto, mensagem `Cupom inválido.`, total 119,90; UI igual | API 200, `cupom.aplicado=false`, desconto 0, total 119,90; UI exibiu alerta literal e resumo 100/0/19,90/119,90 | **PASSOU** [API](../evidencias/api/MAN-001-API-2026-10-08.json), [UI](../evidencias/interface/MAN-001-UI-2026-10-08.json) |
| MAN-002 API/UI | P005 ×1; calcular/aplicar `VERAO2026` | Cálculo 200, sem desconto, `Cupom expirado.`, total 119,90; UI igual | API 200, `cupom.aplicado=false`, desconto 0, total 119,90; UI mostrou alerta literal e mesmo resumo | **PASSOU** [API](../evidencias/api/MAN-002-API-2026-10-08.json), [UI](../evidencias/interface/MAN-002-UI-2026-10-08.json) |
| MAN-003 UI | P005 ×1; aplicar BEMVINDO10, verificar impossibilidade de reaplicar, remover, tentar VERAO2026, corrigir para BEMVINDO10 | Um cupom por vez; 10/109,90 aplicado, zero/119,90 após remoção e expirado; novamente 10/109,90 | Com cupom ativo não havia botão de aplicar (`applyButtonCount=0`); remoção revelou campo; expirado exibiu mensagem e zero desconto; reaplicação produziu apenas R$ 10,00 de desconto | **PASSOU** [aplicado](../evidencias/interface/MAN-003-aplicado-2026-10-08.json), [expirado](../evidencias/interface/MAN-003-expirado-2026-10-08.json), [reaplicado](../evidencias/interface/MAN-003-reaplicado-2026-10-08.json) |
| MAN-004 UI | P005 ×1 até ×4 e ×5; tentar sexta na vitrine/carrinho, reduzir e voltar a cinco; adicionar P008 ×1 | Não exceder cinco de P005; permitir seis itens totais distribuídos | Em ×5, botão de aumentar e botão da vitrine desabilitados; P005 permaneceu ×5, voltou de ×4 a ×5; P008 ×1 aceito, subtotal 550 e total 550 | **PASSOU** [cinco](../evidencias/interface/MAN-004-cinco-2026-10-08.json), [vitrine](../evidencias/interface/MAN-004-vitrine-limite-2026-10-08.json), [sexta tentativa](../evidencias/interface/MAN-004-sexta-tentativa-2026-10-08.json), [distribuídos](../evidencias/interface/MAN-004-seis-distribuidos-2026-10-08.json) |
| MAN-005 API/UI | P002 ×1 + P004 ×2 com BEMVINDO10 | Subtotal 239,70, desconto 23,97, frete 0, total 215,73; UI com duas casas | API 200: 239.7/23.97/0/215.73; UI 239,70/23,97/`Grátis`/215,73 | **PASSOU** [API](../evidencias/api/MAN-005-API-2026-10-08.json), [UI](../evidencias/interface/MAN-005-UI-2026-10-08.json) |

MAN-005 não determina o modo de desempate de arredondamento, ausente na especificação. Em MAN-004, o bloqueio na UI não elimina [BUG-002](bugs.md) na API.

### MAN-006 — contrato de itens (`POST /api/carrinho/calcular`)

**Pré-condição:** chamadas JSON independentes, sem cupom, alterando somente a entrada da tabela. **Passo:** enviar o corpo indicado e comparar HTTP, `erro.codigo`/mensagem ou resumo aceito. R1 pp. 6–7. Todas as variantes **PASSARAM**.

| ID | Dado enviado | Esperado → observado | Evidência |
| --- | --- | --- | --- |
| V1 | Corpo literal `{` | 400 `JSON_INVALIDO` → 400 `JSON_INVALIDO` | [JSON](../evidencias/api/MAN-006-V1-2026-10-08.json) |
| V2 | `{}` | 422 `ITENS_OBRIGATORIOS` → mesmo | [JSON](../evidencias/api/MAN-006-V2-2026-10-08.json) |
| V3 | `itens: []` | 422 `ITENS_OBRIGATORIOS` → mesmo | [JSON](../evidencias/api/MAN-006-V3-2026-10-08.json) |
| V4 | `itens: [null]` | 422 `ITEM_INVALIDO` → mesmo | [JSON](../evidencias/api/MAN-006-V4-2026-10-08.json) |
| V5 | P999 ×1 | 422 `PRODUTO_NAO_ENCONTRADO` → mesmo | [JSON](../evidencias/api/MAN-006-V5-2026-10-08.json) |
| V6 | P005 ×1 duplicado na lista | 422 `ITEM_DUPLICADO` → mesmo | [JSON](../evidencias/api/MAN-006-V6-2026-10-08.json) |
| V7 | P005 ×0 | 422 `QUANTIDADE_INVALIDA` → mesmo | [JSON](../evidencias/api/MAN-006-V7-2026-10-08.json) |
| V8 | P005 ×−1 | 422 `QUANTIDADE_INVALIDA` → mesmo | [JSON](../evidencias/api/MAN-006-V8-2026-10-08.json) |
| V9 | P005 ×1,5 | 422 `QUANTIDADE_INVALIDA` → mesmo | [JSON](../evidencias/api/MAN-006-V9-2026-10-08.json) |
| V10 | P005 ×1 | 200, total 119,90 → 200, total 119,90 | [JSON](../evidencias/api/MAN-006-V10-2026-10-08.json) |
| V11 | JSON `null` | 400 `JSON_INVALIDO` → mesmo | [JSON](../evidencias/api/MAN-006-V11-2026-10-08.json) |
| V12 | P005 quantidade string `"1"` | 422 `QUANTIDADE_INVALIDA` → mesmo | [JSON](../evidencias/api/MAN-006-V12-2026-10-08.json) |

### MAN-007 — rotas e métodos

**Passo:** fazer GET independente para cada rota e conferir corpo JSON, status e código quando houver erro. R1 pp. 4 e 6. Todas as variantes **PASSARAM**.

| ID | Rota | Esperado → observado | Evidência |
| --- | --- | --- | --- |
| V1 | `/api/produtos` | 200/lista do catálogo → 200/lista de 8 | [JSON](../evidencias/api/MAN-007-V1-2026-10-08.json) |
| V2 | `/api/produtos/P005` | 200/P005 preço 100 → 200/P005 preço 100 | [JSON](../evidencias/api/MAN-007-V2-2026-10-08.json) |
| V3 | `/api/produtos/P999` | 404 `PRODUTO_NAO_ENCONTRADO` → mesmo | [JSON](../evidencias/api/MAN-007-V3-2026-10-08.json) |
| V4 | `/api/rota-inexistente-vzs142` | 404 `ROTA_NAO_ENCONTRADA` → mesmo | [JSON](../evidencias/api/MAN-007-V4-2026-10-08.json) |
| V5 | GET `/api/carrinho/calcular` | 405 `METODO_NAO_PERMITIDO` → mesmo | [JSON](../evidencias/api/MAN-007-V5-2026-10-08.json) |

## Cliente, pedidos e normalização

### MAN-008 — nome, e-mail e CEP

**Pré-condição:** P005 ×1 e cliente fictícia Maria Silva / `maria@example.com` / `01310-100`; em cada variante V1–V8 alterar somente o campo descrito. **Passos:** enviar um pedido pela API com dado inválido; em contexto UI novo preencher checkout com o mesmo dado, tentar confirmar e observar URL, erro e envio de `POST /api/pedidos`. **Esperado:** API 422 `DADOS_INVALIDOS` com detalhe em `campos`; UI impede confirmação. Todas V1–V8 **PASSARAM**: API retornou o código e o campo esperado; UI ficou em `/checkout`, indicou campo inválido e fez zero POST de pedido. Para V4, o navegador também marcou o e-mail inválido. V9/V10 são as referências positivas executadas em MAN-009.

| ID | Entrada inválida | Detalhe observado na API | Evidências |
| --- | --- | --- | --- |
| V1 | Nome vazio | `cliente.nome` | [API](../evidencias/api/MAN-008-V1-API-2026-10-08.json), [UI](../evidencias/interface/MAN-008-V1-UI-2026-10-08.json) |
| V2 | Nome `Maria` | `cliente.nome` | [API](../evidencias/api/MAN-008-V2-API-2026-10-08.json), [UI](../evidencias/interface/MAN-008-V2-UI-2026-10-08.json) |
| V3 | E-mail vazio | `cliente.email` | [API](../evidencias/api/MAN-008-V3-API-2026-10-08.json), [UI](../evidencias/interface/MAN-008-V3-UI-2026-10-08.json) |
| V4 | `maria-sem-arroba` | `cliente.email` | [API](../evidencias/api/MAN-008-V4-API-2026-10-08.json), [UI](../evidencias/interface/MAN-008-V4-UI-2026-10-08.json) |
| V5 | CEP vazio | `cliente.cep` | [API](../evidencias/api/MAN-008-V5-API-2026-10-08.json), [UI](../evidencias/interface/MAN-008-V5-UI-2026-10-08.json) |
| V6 | CEP `0131010` | `cliente.cep` | [API](../evidencias/api/MAN-008-V6-API-2026-10-08.json), [UI](../evidencias/interface/MAN-008-V6-UI-2026-10-08.json) |
| V7 | CEP `013101000` | `cliente.cep` | [API](../evidencias/api/MAN-008-V7-API-2026-10-08.json), [UI](../evidencias/interface/MAN-008-V7-UI-2026-10-08.json) |
| V8 | CEP `ABCDE-FGH` | `cliente.cep` | [API](../evidencias/api/MAN-008-V8-API-2026-10-08.json), [UI](../evidencias/interface/MAN-008-V8-UI-2026-10-08.json) |

### MAN-009 — confirmação e contrato de pedido

**Pré-condição:** cliente fictícia válida e P005 ×1. **Passos:** em quatro chamadas API independentes e quatro contextos UI novos, usar CEP com/sem hífen × cupom ausente/BEMVINDO10, confirmar e comparar resposta/observação da página `/pedido-confirmado`. **Esperado:** 201, `numero` no padrão `VZ-` + seis dígitos, subtotal 100, frete 19,90, faltante 100; sem cupom desconto 0/total 119,90; com cupom desconto 10/total 109,90. **Observado:** as oito confirmações foram 201, com número no formato, item P005 ×1 e valores esperados; UI exibiu os mesmos totais. **PASSOU** nas quatro combinações em ambas as camadas. O CEP de resposta apareceu sem hífen, observação do exemplo documentado, sem tratá-lo como requisito adicional.

| ID | CEP / cupom | API | UI |
| --- | --- | --- | --- |
| V1 | `01310-100` / sem cupom | [201, total 119,90](../evidencias/api/MAN-009-V1-API-2026-10-08.json) | [Confirmação](../evidencias/interface/MAN-009-V1-UI-2026-10-08.json) |
| V2 | `01310100` / sem cupom | [201, total 119,90](../evidencias/api/MAN-009-V2-API-2026-10-08.json) | [Confirmação](../evidencias/interface/MAN-009-V2-UI-2026-10-08.json) |
| V3 | `01310-100` / BEMVINDO10 | [201, total 109,90](../evidencias/api/MAN-009-V3-API-2026-10-08.json) | [Confirmação](../evidencias/interface/MAN-009-V3-UI-2026-10-08.json) |
| V4 | `01310100` / BEMVINDO10 | [201, total 109,90](../evidencias/api/MAN-009-V4-API-2026-10-08.json) | [Confirmação](../evidencias/interface/MAN-009-V4-UI-2026-10-08.json) |

### MAN-010 — cupom no pedido

**Pré-condição:** cliente válida e P005 ×1. **Passos:** chamar `POST /api/pedidos` separadamente com `NAOEXISTE142` e `VERAO2026`. **Esperado/observado:** 422 `CUPOM_INVALIDO` e 422 `CUPOM_EXPIRADO`, respectivamente; nenhum pedido aceito. **PASSOU** nas duas variantes. O cálculo de MAN-001/002 retornou 200, confirmando a distinção entre endpoints. [Inválido](../evidencias/api/MAN-010-invalido-2026-10-08.json), [expirado](../evidencias/api/MAN-010-expirado-2026-10-08.json).

### MAN-011 — quantidade máxima no pedido

**Pré-condição:** cliente válida, P005, sem cupom. **Passos:** dois `POST /api/pedidos` independentes com quantidades cinco e seis; repetir somente a divergência de seis uma vez. Cinco unidades: esperado/observado 201, subtotal/total 500 e frete grátis — **PASSOU** [evidência](../evidencias/api/MAN-011-cinco-2026-10-08.json). Seis unidades: esperado 422 `QUANTIDADE_MAXIMA_EXCEDIDA`; observado **201**, item com quantidade 6, subtotal/total 600. Repetição também 201 — **FALHOU** [inicial](../evidencias/api/MAN-011-seis-2026-10-08.json), [reteste](../evidencias/api/MAN-011-seis-reteste-2026-10-08.json). Manifestação da mesma violação de CA10 registrada como [BUG-002](bugs.md), agora também em `/api/pedidos`.

### MAN-012 — normalização do cupom na UI

**Pré-condição:** contexto/carrinho novo com P005 ×1 para cada V1–V5. **Passo:** preencher e aplicar cada código da tabela planejada. **Esperado/observado:** nas cinco variantes, um único desconto R$ 10,00, subtotal R$ 100,00, frete R$ 19,90 e total R$ 109,90 — **PASSARAM**. O critério não exige transformação visual do texto digitado.

| Variante | Entrada | Evidência |
| --- | --- | --- |
| V1 | `BEMVINDO10` | [UI](../evidencias/interface/MAN-012-V1-2026-10-08.json) |
| V2 | `bemvindo10` | [UI](../evidencias/interface/MAN-012-V2-2026-10-08.json) |
| V3 | `BeMvInDo10` | [UI](../evidencias/interface/MAN-012-V3-2026-10-08.json) |
| V4 | `  BEMVINDO10  ` | [UI](../evidencias/interface/MAN-012-V4-2026-10-08.json) |
| V5 | `  bemvindo10  ` | [UI](../evidencias/interface/MAN-012-V5-2026-10-08.json) |

## Sessões exploratórias assistidas

Os arquivos de sessão contêm início/fim UTC e **duração real das interações instrumentadas**, sem atribuir duração humana adicional para análise. O objetivo e o escopo seguem [cenarios-de-teste.md](cenarios-de-teste.md). Os roteiros foram temporários e não integram a suíte Playwright; a revisão humana da experiência continua recomendada.

| Sessão | Duração real | Objetivo, fluxo, dados e observações | Evidências / resultado |
| --- | ---: | --- | --- |
| EXP-001 | 1,688 s | Recálculo/transições: P005 ×1, aplicar BEMVINDO10 antes de aumentar para ×2; remover cupom, reduzir para ×1 e adicionar P006. No limite exato com cupom, frete 19,90 e total 199,90: **BUG-001 conhecido**. Após reduzir/adicionar, subtotal 129,90 sem cupom. | [Sessão](../evidencias/interface/EXP-001-sessao-2026-10-08.json), [limite](../evidencias/interface/EXP-001-limite-com-cupom-2026-10-08.json), [final](../evidencias/interface/EXP-001-final-2026-10-08.json). **FALHOU** no fluxo do limite; demais transições observadas. |
| EXP-002 | 1,763 s | Cupons/quantidade: P005 ×1, inexistente, correção no mesmo campo para `  bemvindo10  `, remoção, expirado e aumento até cinco. Desconto único após correção, expirado sem desconto, botão de aumento desabilitado em cinco. Nenhum comportamento inesperado distinto. | [Sessão](../evidencias/interface/EXP-002-sessao-2026-10-08.json), [corrigido](../evidencias/interface/EXP-002-corrigido-2026-10-08.json), [limite](../evidencias/interface/EXP-002-limite-2026-10-08.json). **PASSOU** no fluxo observado. |
| EXP-003 | 1,566 s | Cliente/recuperação: checkout P005 ×1; nome sem sobrenome, corrigir; e-mail sem `@`, corrigir; CEP de sete dígitos, corrigir. A interface permaneceu no checkout durante rejeições; nenhuma confirmação válida nesta sessão. | [Sessão](../evidencias/interface/EXP-003-sessao-2026-10-08.json), [nome](../evidencias/interface/EXP-003-nome-invalido-2026-10-08.json), [e-mail](../evidencias/interface/EXP-003-email-invalido-2026-10-08.json), [CEP](../evidencias/interface/EXP-003-cep-invalido-2026-10-08.json), [corrigido](../evidencias/interface/EXP-003-corrigido-2026-10-08.json). **PASSOU** no fluxo observado. |

**Limites desta execução:** não houve avaliação humana de usabilidade; as durações curtas representam apenas ações instrumentadas. O pedido com seis unidades em MAN-011 retornou 201, mas é fictício e não persistido. Não foram testados carga, segurança, pagamento, e-mails ou consulta de pedidos.
