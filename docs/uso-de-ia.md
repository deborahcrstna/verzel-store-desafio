# Uso de IA

## Etapa 1 — Preparação em 08/10/2026

O Codex foi usado como assistente para ler o pedido, inspecionar arquivos, consultar a documentação oficial, organizar a estrutura, preparar cenários/matriz e ajustar a configuração do Playwright.

Contribuições:
- Análise de CA01–CA11, dados fixos, regras de cliente e contratos HTTP.
- Planejamento de seis automações, sem implementá-las.
- Cálculo dos valores esperados dos exemplos e registro de lacunas.
- Criação dos documentos iniciais e arquivos de teste sem testes artificiais.
- Revisão da configuração do instalador, preservando dependências, lockfile e exemplo original.
- Verificação técnica de carregamento/listagem da suíte, registrada separadamente em execucao.md.

A leitura da documentação utilizou a seção documental do JavaScript público que monta a página, pois a ferramenta de leitura web não acessou a página e não havia navegador conectado. O código funcional da loja não foi adotado como fonte de comportamento esperado.

## ChatGPT e contribuições anteriores

Não há histórico suficiente nesta sessão para afirmar quais análises anteriores foram feitas com ChatGPT. A candidata deve complementar este registro com usos efetivos, incluindo prompts relevantes e alterações que aceitou ou corrigiu. O relato de que os testes iniciais passaram veio da candidata; não é resultado funcional verificado nesta etapa.

## Validação humana

Pendente: revisão pela candidata das interpretações, cálculos, prioridades e cenários já confrontados pelo Codex com os PDFs; compreensão e execução futura dos testes; confirmação dos resultados e evidências.

A geração/revisão por IA não equivale a validação humana nem a aprovação da aplicação. Não foram inventados bugs ou resultados. Não houve criação de pedidos, commits ou publicação.

## Modelo para próximas contribuições

| Data | Ferramenta | Solicitação | Sugestão/alteração | Revisão humana e decisão | Evidência |
| --- | --- | --- | --- | --- | --- |
| A preencher | ChatGPT / Codex | Descrever | Descrever | Pendente / aceita / corrigida / rejeitada, com motivo | Link ou arquivo |


## Etapa 2 — Revisão documental em 08/10/2026

- Leitura visual das sete páginas de documentacao.pdf e cinco páginas de Teste tecnico QA Junior - Verzel.pdf. A extração textual resultou vazia porque os arquivos são imagens.
- Renderização com leitor PDF instalado somente em pasta temporária; nenhuma dependência foi adicionada ao projeto.
- Confronto dos 11 critérios, catálogo, contratos HTTP e limitações com todos os documentos de docs/.
- Conferência aritmética local dos valores esperados, sem chamar a API, e enumeração de quantidades 0–5 para determinar os vizinhos monetários atingíveis do limiar.
- Inclusão do planejamento exploratório e de normalização manual na UI; atualização das exigências de entrega e ambiguidades.
- Conferência de rastreabilidade, links e manutenção de todos os cenários como NÃO EXECUTADO.
- Nenhuma automação implementada ou executada, bug inventado, pedido criado, commit ou publicação realizado.

R2 permite IA e solicita explicar onde e como ela foi usada no formulário final. Este registro auxilia a candidata, mas não substitui sua revisão nem o preenchimento pessoal do formulário na etapa de entrega.


## Etapa 2.1 — Refinamento em 08/10/2026

Codex apoiou a simplificação do README, a explicitação de modalidades/prioridades/evidências na matriz e a revisão das pré-condições e variantes dos cenários. Recalculou 15 conjuntos financeiros e enumerou todas as combinações de quantidades 0–5 do catálogo, sem acessar a aplicação. A descrição do subtotal acima de 200 foi simplificada; nenhum modo de arredondamento foi assumido. A revisão humana e a autorização para implementar continuam pendentes; não houve implementação ou execução funcional.

## Etapa 3.1 — Cupons de API em 08/10/2026

Codex implementou AUT-001 e AUT-002 com o fixture request, executou somente esse arquivo e extraiu as seis requisições/respostas reais dos anexos do relatório. Atualizou execução, matriz e README. Os seis casos passaram; a candidata ainda deve revisar código e resultados. Nenhum pedido foi criado e AUT-003–AUT-006 permanecem para etapas posteriores.

## Etapa 3.2 — Frete e limite de quantidade em 08/10/2026

Codex conferiu o planejamento e os PDFs oficiais, implementou AUT-003 V1–V5 e AUT-004 V1–V2 com os dados indicados pela candidata, executou apenas os dois arquivos novos e preservou os anexos de requisição/resposta. As três falhas foram repetidas sem alterar expectativas; duas divergências confirmadas foram registradas em bugs.md. As asserções dos casos falhos passaram a relatar todos os campos divergentes, e a suíte delimitada foi executada com o código final. AUT-001/002 não foram modificados. A candidata deve revisar os resultados e as classificações antes das próximas etapas.


## Etapas 3.3–3.4 — Refatoração e ampliação da automação em 08/10/2026

Codex revisou e refatorou os testes existentes, mantendo IDs, cenários e valores esperados, sem alterar a aplicação ou adicionar dependências. A assistência incluiu simplificação de duplicação real, ajustes de legibilidade e assertions/mensagens, além de preservar anexos de execução existentes. Em seguida, Codex adicionou AUT-007-V1/V2 para cupons inexistente/expirado e AUT-008 para seis unidades no endpoint POST /api/pedidos. A suíte passou a conter 20 testes em cinco arquivos de especificação.

A validação automatizada mais recente registrada teve 15 aprovações e cinco reprovações: AUT-003-V2/V4 e AUT-006-V2 manifestaram BUG-001; AUT-004-V2 e AUT-008 manifestaram BUG-002. AUT-007-V1/V2 passaram. Os resultados e limites de evidência estão em execucao.md. As asserções esperadas não foram relaxadas para ocultar defeitos.

## Etapa 5 — Execução manual assistida e exploração em 08/10/2026

As interações no Chromium e chamadas HTTP foram realizadas por Codex com instrumentação/scripts, conforme execucao-etapa5.md. MAN-001–010 e MAN-012 passaram, MAN-011 reproduziu BUG-002 no endpoint POST /api/pedidos e EXP-001 reproduziu BUG-001; EXP-002/003 não mostraram divergência nova. Essas atividades não devem ser descritas como execução independente por uma pessoa. As respostas MAN-001, MAN-002 e MAN-011 preservadas em evidencias/api são registros da execução assistida, não anexos produzidos pelos casos AUT-007/AUT-008.

## Etapa 3 — Consolidação documental em 08/10/2026

Codex atualizou README.md, matriz-rastreabilidade.md, cenarios-de-teste.md, execucao.md e bugs.md para reconciliar os resultados atuais com o histórico e os artefatos disponíveis, sem alterar testes, aplicação ou evidências. Também conferiu links locais e a presença de arquivos temporários/dados sensíveis. A candidata ainda precisa revisar o material e completar qualquer declaração pessoal de uso de IA exigida na entrega.
