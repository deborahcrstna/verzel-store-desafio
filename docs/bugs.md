# Registro de bugs

Dois defeitos funcionais foram confirmados por automação e execução assistida: BUG-001 afeta o cálculo de frete na API e se manifesta também na UI; BUG-002 afeta os limites de quantidade na API. O histórico anterior permanece abaixo para deixar claro quando ainda não havia evidência.

Copiar o modelo somente após reproduzir uma divergência:

| Campo | Preenchimento |
| --- | --- |
| ID | BUG-NNN |
| Título | Comportamento observado, de forma objetiva |
| Cenário / critério | ID e CA ou contrato afetado |
| Severidade | Crítica / Alta / Média / Baixa, com impacto justificado |
| Ambiente | URL, versão da aplicação, sistema, navegador/versão |
| Data e responsável | Data/hora com fuso e pessoa que executou |
| Pré-condições | Estado inicial, produtos, quantidades, cupom e dados fictícios |
| Passos | Lista numerada e reproduzível |
| Resultado esperado | Regra e fonte documental |
| Resultado obtido | Observação real, status/corpo HTTP ou mensagem da UI |
| Evidências | Caminhos relativos em evidencias/api/ ou evidencias/interface/ |
| Frequência | Tentativas e reproduções |
| Estado | Aberto / Em análise / Corrigido / Reteste / Encerrado |
| Reteste | Data, resultado e nova evidência |

Referência de severidade: crítica = indisponibilidade geral que impede a avaliação; alta = cálculo financeiro ou fluxo principal comprometido; média = função com alternativa viável; baixa = apresentação sem impacto no cálculo/fluxo. Ajustar ao impacto comprovado, não apenas ao critério afetado.

Não registrar como defeitos as simplificações do ambiente listadas no plano.


## Revisão dos requisitos — etapa 2
R1 (documentacao.pdf, p. 7) confirma as simplificações do ambiente; R2 (Teste tecnico QA Junior - Verzel.pdf, p. 3) exige reportar os bugs efetivamente encontrados. Na etapa 2, a revisão dos PDFs não produziu evidência de falha da aplicação. Não converter ambiguidades de arredondamento, campos de exemplo ou dados indisponíveis em defeitos.

## BUG-001 — Carrinho cobra frete no subtotal exato de R$ 200,00

- **Severidade:** Alta. Altera o total cobrado em R$ 19,90 no limite inclusivo do frete grátis.
- **Critérios/cenários:** CA06; AUT-003-V2, AUT-003-V4 e AUT-006-V2. Os dois casos de API no limite não isolam CA08 porque o mesmo subtotal de R$ 200,00 falha também sem cupom; CA08 passou em AUT-003-V6 e AUT-006-V1 acima do limite.
- **Ambiente e data:** `https://verzel-store.qa-test-verzel-store.workers.dev`, Verzel Store QA, VZS-142 v2.3.0, Windows, Playwright 1.64.0, Chromium 156.0.8078.4, 08/10/2026 às 03:45 (America/Manaus); reteste às 03:46 e regressão completa às 04:28.
- **Pré-condição:** API de cálculo acessível. Payload JSON válido, P005 a R$ 100,00, sem estado prévio necessário.
- **Passos:** (1) Enviar `POST /api/carrinho/calcular` com `{"itens":[{"produtoId":"P005","quantidade":2}]}`. (2) Repetir em chamada independente com `"cupom":"BEMVINDO10"`.
- **Esperado:** HTTP 200 nos dois casos, subtotal 200, frete 0, `freteGratis: true`, faltante 0. Sem cupom, total 200; com cupom, desconto 20 e total 180. Fonte: documentação oficial, CA06/CA08 e regra de cálculo.
- **Obtido:** HTTP 200, subtotal 200 e faltante 0, mas frete 19.9 e `freteGratis: false`. Total 219.9 sem cupom; total 199.9 com desconto 20. A divergência se repetiu com os mesmos dados.
- **Manifestação na UI:** Em sessão limpa, adicionar P005 na vitrine, abrir `/carrinho` e aumentar para duas unidades. O resumo mostra subtotal R$ 200,00, desconto R$ 0,00, frete R$ 19,90, total R$ 219,90 e aviso `Faltam R$ 0,00 para o frete grátis.`; o esperado é frete grátis e total R$ 200,00. A mesma entrada e os mesmos valores de AUT-003-V2 na API sustentam o vínculo, sem presumir a causa interna.
- **Evidências:** [API V2 inicial](../evidencias/api/AUT-003-V2-2026-10-08.json), [API V2 reteste](../evidencias/api/AUT-003-V2-reteste-2026-10-08.json), [API V4 inicial](../evidencias/api/AUT-003-V4-2026-10-08.json), [API V4 reteste](../evidencias/api/AUT-003-V4-reteste-2026-10-08.json), [UI AUT-006-V2](../evidencias/interface/AUT-006-V2-2026-10-08.png); screenshot automática e trace no relatório Playwright da etapa 4.
- **Frequência/estado:** API 6/6 em cada variante (execução inicial, reteste seletivo e quatro regressões em [execucao.md](execucao.md)); UI 2/2 na etapa 4; Aberto. Retestar depois de uma correção, sem mudar as expectativas.

## BUG-002 — API aceita seis unidades do mesmo produto

- **Severidade:** Média. A confirmação permite ultrapassar CA10 e cria uma resposta de pedido bem-sucedida para quantidade fora do limite. O impacto financeiro/operacional além dessa violação não foi avaliado, pois o ambiente não persiste pedidos nem realiza cobrança.
- **Critério/cenários:** CA10; AUT-004-V2 (cálculo), MAN-011 (criação de pedido) e AUT-008 (criação de pedido).
- **Ambiente e data:** `https://verzel-store.qa-test-verzel-store.workers.dev`, Verzel Store QA, VZS-142 v2.3.0, Windows, Playwright 1.64.0, Chromium 156.0.8078.4; execuções documentadas em 08/10/2026 (America/Manaus). Horários detalhados constam nos registros individuais; o horário exato da regressão AUT-008 não foi preservado.
- **Pré-condições:** endpoint acessível; cliente fictício válido Maria Silva, maria@example.com, CEP 01310-100; sem cupom; P005 custa R$ 100,00.
- **Reprodução em POST /api/pedidos (MAN-011 e AUT-008):** enviar requisição JSON com cliente válido e `itens: [{ produtoId: "P005", quantidade: 6 }]`. MAN-011 também enviou uma chamada independente com quantidade 5 como controle.
- **Esperado:** para seis unidades, HTTP 422 e `erro.codigo = QUANTIDADE_MAXIMA_EXCEDIDA`; cinco unidades devem ser aceitas conforme MAN-011. Fonte: CA10 e contrato de erros do documento oficial.
- **Obtido no pedido:** MAN-011 recebeu HTTP 201 e aceitou seis unidades em duas tentativas; cada resposta mostrou P005 com quantidade 6, subtotal R$ 600,00 e total R$ 600,00. AUT-008 também recebeu HTTP 201, sem objeto `erro`, em vez de 422. A resposta automatizada observada está no contexto temporário gerado pelo Playwright; os dois registros de MAN-011 são evidências duráveis.
- **Reprodução no cálculo (AUT-004-V2):** enviar `POST /api/carrinho/calcular` com P006 ×6. Esperado HTTP 422/QUANTIDADE_MAXIMA_EXCEDIDA; obtido HTTP 200, seis unidades aceitas, subtotal R$ 179,40, total R$ 199,30 e sem objeto `erro`. A UI bloqueou a sexta unidade durante a exploração, mas isso não impede a API de aceitar a mesma violação.
- **Evidências:** [AUT-004-V2 inicial](../evidencias/api/AUT-004-V2-2026-10-08.json), [AUT-004-V2 reteste](../evidencias/api/AUT-004-V2-reteste-2026-10-08.json), [MAN-011 primeira reprodução](../evidencias/api/MAN-011-seis-2026-10-08.json), [MAN-011 reteste](../evidencias/api/MAN-011-seis-reteste-2026-10-08.json). O anexo/contexto de AUT-008 está em `test-results/etapa2-20261008-01/` e é artefato temporário ignorado pelo Git.
- **Frequência/estado:** seis unidades foram aceitas em duas execuções assistidas MAN-011 e na última regressão automatizada AUT-008; a divergência de cálculo AUT-004-V2 também foi reproduzida. Aberto. Retestar após correção nos endpoints de cálculo e criação de pedido; verificar que cinco são aceitas e seis são rejeitadas.
