# Plano de testes — VZS-142

> Este documento preserva o plano formulado na etapa 2.1. As frases sobre execução pendente e seis automações descrevem aquele marco histórico; para cobertura e resultados atuais, consulte [matriz](matriz-rastreabilidade.md), [cenários](cenarios-de-teste.md) e [registro de execução](execucao.md).

## Objetivo e fontes

Planejar a avaliação funcional de cupons e frete grátis da Verzel Store, versão 2.3.0, com cobertura rastreável de CA01–CA11. A etapa 2.1 refina a consistência e a clareza do planejamento já revisado com os PDFs; não implementa automações nem executa testes funcionais.

Fontes consultadas em 08/10/2026 (America/Manaus):
- Pedido fornecido pela candidata.
- [Documentação oficial](https://verzel-store.qa-test-verzel-store.workers.dev/documentacao), card VZS-142, versão 2.3.0, publicada em 30/09/2026.
- O HTML da documentação depende de JavaScript. Seu conteúdo foi lido na seção de documentação do [arquivo público da página](https://verzel-store.qa-test-verzel-store.workers.dev/assets/index-DimFnQZA.js). A lógica da implementação não foi usada como requisito.
- Etapa 2: leitura visual integral dos PDFs fornecidos, ambos em pasta local fora do repositório. São PDFs de imagem, sem camada de texto extraível. As 12 páginas foram renderizadas e lidas.
- Fonte R1: documentacao.pdf, 7 páginas. P. 1: identificação do card e CA01–CA04; p. 2: CA05–CA11, cálculo, nome/e-mail; p. 3: CEP, pagamento e catálogo; pp. 3–6: contratos; pp. 6–7: erros; p. 7: limitações.
- Fonte R2: Teste tecnico QA Junior - Verzel.pdf, 5 páginas. P. 1: apresentação; p. 2: objetivo e URLs; p. 3: entregáveis; p. 4: regras; p. 5: envio.
- R1 corresponde à versão 2.3.0, publicada em 30/09/2026. Não foram identificadas divergências em CA01–CA11, preços ou contratos em relação ao planejamento inicial.
- Os PDFs são fontes de requisitos. Suas instruções de executar, publicar e enviar referem-se à entrega futura; não substituem a proibição da candidata de executar automações, fazer commits ou publicar nesta etapa.

## Requisitos da entrega final (R2, pp. 3–5)

| Exigência oficial | Planejamento / situação |
| --- | --- |
| Cenários derivados da documentação; Gherkin é diferencial | cenarios-de-teste.md, com positivos, negativos e limites |
| Execução manual e exploratória, com resultado por cenário | MAN-001–MAN-012 e EXP-001–EXP-003; todos NÃO EXECUTADO |
| Reportar todos os bugs encontrados | bugs.md contém apenas modelo; registrar somente após evidência |
| Documento com evidências de execução | execucao.md será o índice das evidências selecionadas |
| Pelo menos três cenários automatizados com Playwright | Planejados seis por escolha da candidata: quatro API e dois UI; nenhum implementado |
| README com execução e localização das entregas | README existente; implementação/execução ainda pendentes |
| Um único repositório público no GitHub | Exigência da entrega futura; não publicar nem fazer commits nesta etapa |
| Cinco dias corridos a partir do recebimento do documento | Data de recebimento original não informada; não inferir prazo pela data de impressão ou pela disponibilização nesta conversa |
| Formato livre, incluindo Markdown | Manter a arquitetura atual e os documentos Markdown |
| Uso de IA permitido, explicar onde e como | uso-de-ia.md; candidata deve informar também no formulário final |
| Envio por formulário; deploy não se aplica | R2 p. 5 indica https://elitedev.verzel.com.br/; conferir e preencher apenas na etapa de entrega autorizada |

A presença de um planejamento não satisfaz os requisitos de execução, evidências ou automação implementada. A checklist acima não é uma declaração de entrega final pronta.

## Escopo

Cupons válidos, normalização, inválidos e expirados; um cupom por vez; remoção e troca; frete e valor faltante; subtotal antes do desconto; limite de quantidade; precisão monetária; consistência entre API e interface.

Como regressão funcional complementar, planejar contratos HTTP, validações de itens, cliente, CEP e confirmação de pedido. Cenários de pedido são apenas documentados nesta etapa; não enviar requisições a POST /api/pedidos.

Fora do escopo: carga, estresse, segurança, login, cadastro, pagamento online e consulta de pedidos.

## Abordagem e prioridades

- P1: cálculo financeiro, aplicação/remoção de cupom e limites (CA01, CA05–CA11), pelo impacto no valor cobrado e no fluxo principal.
- P2: normalização e mensagens de cupons (CA02–CA04), contratos e validações complementares. A confirmação do pedido permanece P1; seus casos de dados inválidos ficam P2.
- Quatro cenários lógicos de API e dois de UI serão automatizados após revisão. Variações de dados poderão gerar mais de seis casos no relatório sem aumentar os seis objetivos de automação.
- Cenários complementares serão manuais inicialmente; sessões exploratórias terão objetivo, roteiro, observações e evidências próprios (EXP-001–EXP-003). A matriz distingue cobertura planejada de cobertura executada.
- Aplicar particionamento de equivalência (cupom válido/inválido/expirado) e análise de valores limite (quantidades 4, 5 e 6; subtotais abaixo, igual e acima de 200).
- Testes futuros independentes, com payload completo por chamada e novo contexto/carrinho por teste de UI. Sem POM ou abstrações adicionais nesta etapa.
- Comparar os resultados com valores esperados calculados a partir dos requisitos; não derivar o esperado da própria resposta da aplicação.

## Regras de referência

Subtotal = soma de preço unitário × quantidade. Desconto = 10% do subtotal com BEMVINDO10; zero sem cupom válido. Frete = zero para subtotal >= 200, senão 19,90. Faltante = máximo entre 200 − subtotal e zero. Total = subtotal − desconto + frete. Valores em reais, arredondados para duas casas decimais.

CA02 ignora caixa e espaços nas extremidades. CA03 exige “Cupom inválido.”; CA04 exige “Cupom expirado.”. CA05 exige remover o cupom atual antes de aplicar outro. CA10 limita cada produto a cinco unidades na UI e API.

Regras adicionais e contratos:
- Nome com nome e sobrenome, e-mail em formato válido, CEP de oito dígitos com ou sem hífen; pagamento na entrega.
- JSON na API e Content-Type: application/json. Valores monetários são números em reais; 59.9 no JSON representa R$ 59,90, sem obrigação de zeros textuais à direita.
- GET /api/produtos: 200 e lista. GET /api/produtos/{id}: 200 ou 404 para inexistente.
- POST /api/carrinho/calcular: recebe itens (produtoId, quantidade) e cupom opcional; calcula sem persistir. Cupom inválido/expirado retorna 200, desconto zero e motivo em cupom.mensagem.
- POST /api/pedidos: recebe cliente, itens e cupom opcional; sucesso 201, número no formato VZ-000000 e resumo de valores. Cupom inválido/expirado retorna 422, respectivamente CUPOM_INVALIDO/CUPOM_EXPIRADO.
- Erros usam o objeto erro, com codigo e mensagem; campo identifica a entrada no exemplo documentado. DADOS_INVALIDOS inclui detalhes em campos. Não exigir campos adicionais indiscriminadamente.
- 400 JSON_INVALIDO: corpo que não é objeto JSON válido.
- 404 ROTA_NAO_ENCONTRADA ou PRODUTO_NAO_ENCONTRADO na consulta individual.
- 405 METODO_NAO_PERMITIDO em rota existente com método incompatível.
- 422: ITENS_OBRIGATORIOS, ITEM_INVALIDO, PRODUTO_NAO_ENCONTRADO (item), ITEM_DUPLICADO, QUANTIDADE_INVALIDA, QUANTIDADE_MAXIMA_EXCEDIDA, DADOS_INVALIDOS e erros de cupom no pedido.

## Ambiente

- [Aplicação](https://verzel-store.qa-test-verzel-store.workers.dev/), API no mesmo host em /api.
- Windows, Node.js v24.18.0, npm 11.16.0 e Playwright Test 1.64.0 encontrados nesta preparação; dependências fixadas no package-lock.json.
- TypeScript e Chromium (perfil Desktop Chrome). Registrar versão efetiva do navegador e data em cada execução futura.
- Relatório HTML em playwright-report/; screenshots de UI e traces retidos em falhas em test-results/. Selecionar evidências de entrega para evidencias/api/ e evidencias/interface/.
- Nenhuma dependência adicionada. Git instalado; repositório local não encontrado na inspeção.

## Critérios de entrada

Revisão humana do planejamento e dos dados confrontados com os PDFs; ambiguidades registradas com interpretação e limitações explícitas; aplicação acessível; dependências e Chromium instalados; dados fictícios para cliente. Aguardar autorização da candidata para implementar automações; execuções funcionais e pedidos ficam para etapa posterior. Dúvidas localizadas não bloqueiam o planejamento dos demais casos.

## Critérios de saída

Para esta etapa: ambos os PDFs lidos integralmente; CA01–CA11 e contratos rastreados; dados e cálculos revisados; quatro automações API e duas UI confirmadas no planejamento; ambiguidades e validação manual documentadas; todos os cenários NÃO EXECUTADO.

Para a execução futura: registrar resultado e evidência de cada caso/variante; investigar divergências; retestar correções; explicitar bloqueios e cobertura residual. Sugestão sujeita à revisão humana: nenhum defeito crítico/alto aberto nos cálculos ou no fluxo principal antes de recomendar aceite. Não declarar aprovação enquanto houver cenários NÃO EXECUTADO.

## Requisitos, interpretações e ambiguidades

| Classificação | Tema | Decisão de planejamento |
| --- | --- | --- |
| Requisito confirmado | CA11: duas casas decimais | Conferir valores monetários com os resultados exatos dos dados documentados |
| Ambiguidade pendente | Modo e etapa do arredondamento | Não assumir HALF_UP, HALF_EVEN ou outro modo; investigar a especificação antes de classificar divergência de desempate como bug |
| Interpretação adotada | Representação monetária | O número JSON 59.9 equivale a R$ 59,90; não exigir zeros textuais na API nem arredondar a resposta para ocultar erro |
| Limitação de dados | Fronteiras monetárias | Preços múltiplos de R$ 0,10 impedem subtotais 199,99/200,01. Usar 199,90, exatamente 200,00 e 209,40 como subtotal reproduzível acima de 200,00 |
| Limitação de dados | Apenas BEMVINDO10 válido | Testar aplicação, remoção e reaplicação; troca entre dois cupons válidos distintos não é coberta |
| Requisito confirmado | Cupons inválidos/expirados | Cálculo: 200 sem desconto e motivo em cupom.mensagem; pedido: 422 com CUPOM_INVALIDO/CUPOM_EXPIRADO |
| Interpretação adotada | Bloqueio de cupom/unidades | Exigir um cupom e até cinco unidades por produto, sem prescrever botão desabilitado/oculto ou texto não especificado |
| Ambiguidade pendente | Campos de exemplo do pedido | criadoEm e CEP normalizado aparecem no exemplo; não impor formato exato sem requisito explícito |
| Requisito confirmado | Nome/e-mail/CEP | Nome e sobrenome, formato de e-mail válido e CEP com oito dígitos, com/sem hífen |
| Ambiguidade pendente | Regras adicionais de entrada | Não inventar limites de caracteres, validação real de CEP, precedência de erros ou regras para campos não documentados |
| Limitação da fonte | Exemplo cortado na p. 4 de R1 | Usar as regras textuais e a fonte web já lida para o exemplo; não inventar campos faltantes |
| Pendência administrativa | Prazo da entrega | Confirmar recebimento original com a candidata antes de contar os cinco dias corridos |

R$ 209,40 = P001 ×1 + P006 ×5; desconto de R$ 20,94 e total de R$ 188,46 com frete grátis. A finalidade de AUT-003 é cobrir as partições abaixo/acima e o limiar exato, sem depender de uma afirmação de mínimo global. A verificação completa das combinações está registrada como revisão documental em execucao.md.

O catálogo e o cupom válido de 10% produzem descontos exatos em centavos. Esses dados não provocam empate na terceira casa decimal; essa limitação de CA11 não bloqueia os cenários de cálculo exato.

## Simplificações confirmadas e fora do escopo

Comportamentos esperados, não bugs: carrinho independente por aba/navegador; pedidos não persistidos e números fictícios; ausência de e-mails e cobranças; catálogo/cupons fixos, sem controle de estoque; API sem estado entre chamadas.

Fora do escopo: carga, estresse, segurança, login, cadastro, pagamento online e consulta de pedidos. Não realizar essas verificações como parte da exploração.

## Validação manual e prontidão

Após autorização para execução, validar mensagens, recálculo, remoção/reaplicação, limite na vitrine e no carrinho, dados de cliente/CEP e confirmação, conforme MAN-001–MAN-012. A exploração deve buscar sequências adicionais, não duplicar os casos fixos como se fossem cobertura nova.

AUT-001 e AUT-002 foram implementados e passaram na API em 08/10/2026; resultados e evidências estão em [execucao.md](execucao.md). AUT-003 e AUT-004 foram implementados e executados em 08/10/2026; três falhas reproduzidas estão em [execucao.md](execucao.md) e [bugs.md](bugs.md). O modo de desempate do arredondamento e a ausência de um segundo cupom válido permanecem limitações documentadas. A aprovação funcional completa depende das demais execuções e evidências.
