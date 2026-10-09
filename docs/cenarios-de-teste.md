# Cenários de teste

Estado atual: a regressão automatizada de referência, iniciada em 09/10/2026, teve 20 testes, 15 aprovados e 5 reprovados. AUT-007-V1/V2 passaram; AUT-008 reprovou pela aceitação de seis unidades (BUG-002). AUT-003-V2/V4 e AUT-006-V2 reproduzem BUG-001; AUT-004-V2 e AUT-008 reproduzem BUG-002. MAN-001–010 e MAN-012 passaram; MAN-011 passou com cinco unidades e falhou com seis. EXP-001 reproduziu BUG-001; EXP-002/003 não apontaram divergência nova. Registros e evidências em [execucao.md](execucao.md) e [execucao-etapa5.md](execucao-etapa5.md). Esperados revisados em 08/10/2026 contra documentacao.pdf (R1, pp. 1–7) e Teste tecnico QA Junior - Verzel.pdf (R2, pp. 1–5). Identificação e limites das fontes no [plano](plano-de-testes.md). Os blocos Gherkin são documentação Markdown; não há Cucumber.

## Pré-condições e procedimento comuns

- Usar o ambiente VZS-142 v2.3.0 e o catálogo abaixo. Cada variante começa sem efeitos de outra; não reutilizar cupom aplicado.
- API de cálculo: enviar POST /api/carrinho/calcular com Content-Type: application/json. Base válida: `{"itens":[{"produtoId":"P005","quantidade":1}]}`. Substituir itens/quantidades e acrescentar cupom conforme o caso; omitido significa sem cupom.
- UI: abrir nova sessão com carrinho vazio, adicionar os produtos pela vitrine, abrir o carrinho e ajustar as quantidades indicadas. Nos casos API/UI, executar cada camada separadamente.
- MAN-008–MAN-011: os resultados registrados de POST /api/pedidos e da UI estão em execucao-etapa5.md. A execução observada foi instrumentada por Codex; 201/422 são verificações da API, não textos exigidos na tela.
- Variantes negativas alteram somente a entrada indicada. As regras de cálculo se aplicam às variantes aceitas; para requisições rejeitadas, verificar o erro esperado, sem inventar resumo financeiro.
- Modalidade: AUT = automatizado planejado; MAN = manual; EXP = exploratório. Prioridade P1/P2 segue o risco definido no plano. Os cenários complementares sem CA próprio indicam a regra e a página de R1.
- Cada variante/camada é registrada separadamente em execucao.md e execucao-etapa5.md. Quando uma regressão não gerou evidência durável, isso é indicado; referências de evidência apontam somente a arquivos existentes.

## Dados de referência

| Produto | Preço (R$) |
| --- | ---: |
| P001 — Camiseta Essencial | 59,90 |
| P002 — Calça Jeans Slim | 139,90 |
| P003 — Tênis Casual Urbano | 189,90 |
| P004 — Boné Aba Curva | 49,90 |
| P005 — Mochila Urbana 20L | 100,00 |
| P006 — Kit 3 Pares de Meias | 29,90 |
| P007 — Jaqueta Corta-Vento | 229,90 |
| P008 — Garrafa Térmica 750ml | 50,00 |

Cupom válido: BEMVINDO10 (10%). Expirado: VERAO2026 (15%, expirado em 31/03/2026). Inexistente planejado: NAOEXISTE142 (conferir contra o catálogo documentado antes de executar). Não alterar preços recebidos.

## Oito objetivos de automação implementados

### AUT-001 — Cupom válido e desconto de 10% (API, P1)

Natureza: Positivo; cálculo financeiro.
Arquivo: tests/api/cupons.spec.ts. CA01, CA09, CA11.
```gherkin
Dado um carrinho com 1 unidade de P001, subtotal de R$ 59,90
Quando calcular o carrinho com o cupom BEMVINDO10
Então o status será 200 e o cupom estará aplicado
E o desconto será R$ 5,99, o frete R$ 19,90 e o total R$ 73,81
E o faltante será R$ 140,10 e freteGratis será falso
```
Validar subtotal, desconto, frete, total e cupom no corpo. Calcular o esperado em centavos a partir do catálogo; não arredondar arbitrariamente o observado, o que poderia esconder erro de CA11. A futura comparação numérica deve tolerar apenas a representação binária, não uma diferença de centavos. O desconto não deve incluir o frete.

### AUT-002 — Normalização do cupom (API, P2)

Natureza: Positivo; partições de entrada.
Arquivo: tests/api/cupons.spec.ts. CA02.
```gherkin
Dado um carrinho com 1 unidade de P005
Quando calcular o carrinho com cada código da tabela
Então o status será 200 e o cupom estará aplicado
E o desconto será R$ 10,00 e o total R$ 109,90
```

| Variante | Código de entrada |
| --- | --- |
| V1 | BEMVINDO10 |
| V2 | bemvindo10 |
| V3 | BeMvInDo10 |
| V4 | `"  BEMVINDO10  "` (dois espaços de cada lado; não enviar as aspas) |
| V5 | `"  bemvindo10  "` (dois espaços de cada lado; não enviar as aspas) |

Comparar os mesmos resultados financeiros entre variantes; não estender a regra a espaços internos.

### AUT-003 — Frete e consistência do cálculo (API, P1)

Natureza: positivo e valores limite; cálculo financeiro. Arquivo: tests/api/frete.spec.ts. CA06–CA09, CA11.

Em cada variante independente, enviar POST /api/carrinho/calcular com os itens e o cupom da linha (quando indicado). Esperar HTTP 200 e comparar subtotal, desconto, frete, freteGratis, valorFaltanteFreteGratis e total aos valores explícitos. Nos casos com cupom, esperar `cupom.codigo = BEMVINDO10` e `cupom.aplicado = true`.

| Variante | Itens | Cupom | Subtotal | Desconto | Frete | Faltante | freteGratis | Total |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | ---: |
| V1 — abaixo | P001 ×1 + P002 ×1 | — | 199,80 | 0,00 | 19,90 | 0,20 | false | 219,70 |
| V2 — exato | P005 ×2 | — | 200,00 | 0,00 | 0,00 | 0,00 | true | 200,00 |
| V3 — acima | P007 ×1 | — | 229,90 | 0,00 | 0,00 | 0,00 | true | 229,90 |
| V4 — exato após desconto | P005 ×2 | BEMVINDO10 | 200,00 | 20,00 | 0,00 | 0,00 | true | 180,00 |
| V5 — desconto sem afetar frete | P005 ×1 | BEMVINDO10 | 100,00 | 10,00 | 19,90 | 100,00 | false | 109,90 |
| V6 — elegibilidade antes do desconto | P003 ×1 + P006 ×1 | BEMVINDO10 | 219,80 | 21,98 | 0,00 | 0,00 | true | 197,82 |

V1–V5 foram definidos na etapa 3.2 com produtos e preços documentados. V6 foi acrescentado na etapa 3.4 para isolar CA08 sem depender do subtotal exato de R$ 200,00: R$ 219,80 − R$ 21,98 = R$ 197,82, mas a elegibilidade deve usar R$ 219,80. A resposta documentada não possui campo separado de subtotal após desconto; conferir a diferença dos campos existentes. V4 exercita a elegibilidade no limite exato, e V5 verifica que o desconto não incide sobre o frete. R$ 199,99 e R$ 200,01 não são geráveis com o catálogo. Resultados e evidências em [execucao.md](execucao.md).

### AUT-004 — Limite de unidades (API, P1)

Natureza: positivo, negativo e valor limite. Arquivo: tests/api/validacoes.spec.ts. CA10.

Em cada variante independente, enviar POST /api/carrinho/calcular sem cupom com P006 e a quantidade indicada. O contrato de erro em R1, pp. 6–7, usa `erro.codigo`.

| Variante | Quantidade de P006 | Status | Esperado |
| --- | ---: | ---: | --- |
| V1 | 5 | 200 | Subtotal 149,50; desconto 0,00; frete 19,90; freteGratis false; faltante 50,50; total 169,40 |
| V2 | 6 | 422 | `erro.codigo = QUANTIDADE_MAXIMA_EXCEDIDA` e mensagem pertinente; não aceitar a sexta unidade |

Quantidades menores e seis unidades distribuídas entre produtos distintos podem ser avaliadas manualmente depois; não têm resultado declarado nesta etapa.

### AUT-007 — Cupons rejeitados no cálculo (API, P2; CA03 e CA04)

Natureza: Negativo; cupom inexistente e expirado. Arquivo: tests/api/cupons.spec.ts.

Em chamadas independentes com P005 ×1, o endpoint POST /api/carrinho/calcular deve retornar HTTP 200, preservar subtotal de R$ 100,00, não aplicar o cupom, conceder desconto de R$ 0,00, manter frete de R$ 19,90, valor faltante de R$ 100,00 e total de R$ 119,90. As mensagens são as documentadas para cada código.

| Variante | Código confirmado na documentação/cenários | Resultado esperado |
| --- | --- | --- |
| V1 | NAOEXISTE142 | cupom.aplicado = false; mensagem “Cupom inválido.” |
| V2 | VERAO2026 | cupom.aplicado = false; mensagem “Cupom expirado.” |

Os dois casos passaram na última regressão. Evidências duráveis da execução manual assistida estão em MAN-001/MAN-002; o resultado automatizado mais recente está resumido em execucao.md.

### AUT-005 — Aplicação e remoção (UI, P1)

Natureza: Positivo; transição de estado e recálculo.
Arquivo: tests/ui/carrinho.spec.ts. CA01, CA05, CA09, CA11.
```gherkin
Dado um novo carrinho com 1 unidade de P005
Quando aplicar BEMVINDO10
Então haverá um único cupom aplicado e desconto de R$ 10,00
E o subtotal será R$ 100,00, o frete R$ 19,90 e o total R$ 109,90
Quando remover o cupom
Então não haverá cupom aplicado e o desconto será R$ 0,00
E o total será R$ 119,90, mantendo o frete em R$ 19,90
```
Não confirmar pedido. A troca entre cupons distintos é complementar (MAN-003).

### AUT-006 — Frete e total no carrinho (UI, P1)

Natureza: Positivo e valor limite; recálculo.
Arquivo: tests/ui/carrinho.spec.ts. CA06–CA09, CA11.
```gherkin
Dado um novo carrinho com P003 ×1 e P006 ×1
Quando aplicar BEMVINDO10
Então o subtotal será R$ 219,80, o desconto R$ 21,98, o frete grátis e o total R$ 197,82
E o frete seguirá grátis embora o subtotal após desconto seja R$ 197,82

Dado outro carrinho novo com P005 ×2 e sem cupom
Então o subtotal será R$ 200,00, o desconto R$ 0,00, o frete grátis e o total R$ 200,00
```

As variantes são independentes. A interface apresenta frete zero como `Grátis`, equivalente financeiro a R$ 0,00. V2 falhou com R$ 19,90 de frete e foi vinculada ao BUG-001 após confrontar o carrinho e a resposta da API; não alterar o esperado.

### AUT-008 — Limite de unidades na criação de pedido (API, P1; CA10)

Natureza: Negativo; valor limite acima do máximo. Arquivo: tests/api/pedidos.spec.ts.

Enviar POST /api/pedidos com cliente fictício válido e P005 ×6. Esperar HTTP 422, erro.codigo = QUANTIDADE_MAXIMA_EXCEDIDA e mensagem de erro não vazia, conforme CA10 e o contrato documentado. AUT-008 reprovou na regressão de referência: a API retornou HTTP 201 e aceitou as seis unidades, reproduzindo BUG-002. O anexo temporário da execução não está disponível no workspace atual; MAN-011 contém duas reproduções assistidas com evidências duráveis.

## Cenários complementares manuais

Cada linha de tabela abaixo representa uma variante a registrar separadamente durante a execução.

### MAN-001 — Cupom inexistente (API e UI, P2; CA03)

Natureza: Negativo; mensagem e ausência de desconto.
Dado P005 ×1 e nenhum cupom aplicado, quando usar NAOEXISTE142, então o cálculo retorna 200, cupom.aplicado falso, cupom.mensagem “Cupom inválido.”, desconto zero e total R$ 119,90. Na UI, apresentar a mensagem e os mesmos valores.

### MAN-002 — Cupom expirado (API e UI, P2; CA04)

Natureza: Negativo; mensagem e ausência de desconto.
Dado P005 ×1 sem cupom, quando usar VERAO2026, então o cálculo retorna 200, cupom.aplicado falso, mensagem “Cupom expirado.”, desconto zero e total R$ 119,90. Na UI, apresentar a mensagem e os mesmos valores.

### MAN-003 — Um cupom por vez e troca (UI, P1; CA05)

Natureza: Positivo e negativo; prevenção de acúmulo e troca após remoção. Status registrado: passou na execução assistida.
Dado P005 ×1 com BEMVINDO10 aplicado, tentar reaplicá-lo pelos controles disponíveis: não deve haver segundo desconto. Se não houver controle de aplicação enquanto um cupom está ativo, registrar essa forma de prevenção, sem exigir uma implementação específica. Remover o atual e aplicar VERAO2026: esperar mensagem de expirado e desconto zero. Sem supor que o cupom expirado tenha sido aplicado, substituir o conteúdo do campo por BEMVINDO10 e aplicar: esperar somente R$ 10,00 de desconto. A troca entre dois cupons válidos não é coberta porque só há um válido documentado.

### MAN-004 — Limite de quantidade na interface (UI, P1; CA10)

Natureza: Positivo, negativo e valores limite. Status registrado: a UI impediu a sexta unidade de P005 e aceitou seis unidades totais quando distribuídas entre P005/P008.
Dado um carrinho novo e sem cupom, adicionar P005 até quatro e depois cinco unidades. Tentar a sexta pela vitrine e pelo carrinho: não ultrapassar cinco. Remover uma unidade e voltar a cinco. Adicionar P008 ×1 com P005 ×5: permitir seis unidades no total, pois o limite é por produto.

### MAN-005 — Representação monetária (API e UI, P1; CA11)

Natureza: Positivo; precisão e apresentação monetária. Status registrado: passou na execução assistida.
Dado P002 ×1 + P004 ×2 com BEMVINDO10, calcular e verificar subtotal R$ 239,70, desconto R$ 23,97, frete zero e total R$ 215,73. UI apresenta duas casas; API admite 239.7 como número. Este caso valida precisão/representação, sem comprovar desempate de arredondamento (ver lacunas no plano).

### MAN-006 — Contrato e validações de itens (API, P2)

Natureza: Positivo, negativo e limite inferior. Regra adicional: itens/JSON/quantidade, R1 p. 6; sem CA específico além do limite máximo já coberto em AUT-004.
Partir da base válida das pré-condições comuns e calcular cada payload independentemente, sem cupom. Para V1 enviar literalmente `{` como corpo, em vez de um objeto serializado. Para V2 enviar `{}`. Nas demais variantes substituir o corpo ou a entrada indicada. Esperar o status/código abaixo e mensagem pertinente no objeto erro; não combinar múltiplas falhas.

| Variante | Entrada | Status | erro.codigo |
| --- | --- | ---: | --- |
| V1 | JSON malformado | 400 | JSON_INVALIDO |
| V2 | Lista itens ausente | 422 | ITENS_OBRIGATORIOS |
| V3 | itens: [] | 422 | ITENS_OBRIGATORIOS |
| V4 | itens: [null] | 422 | ITEM_INVALIDO |
| V5 | P999 (fora do catálogo) com quantidade 1 | 422 | PRODUTO_NAO_ENCONTRADO |
| V6 | Duas entradas de P005, cada uma com quantidade 1 | 422 | ITEM_DUPLICADO |
| V7 | P005 com quantidade 0 | 422 | QUANTIDADE_INVALIDA |
| V8 | P005 com quantidade -1 | 422 | QUANTIDADE_INVALIDA |
| V9 | P005 com quantidade 1.5 | 422 | QUANTIDADE_INVALIDA |
| V10 | P005 com quantidade 1 | 200 | Sem erro, total 119.90 sem cupom |
| V11 | Corpo JSON null (válido sintaticamente, mas não é objeto) | 400 | JSON_INVALIDO |
| V12 | P005 com quantidade "1" (string) | 422 | QUANTIDADE_INVALIDA |

### MAN-007 — Rotas e métodos (API, P2)

Natureza: Positivo e negativo. Regra adicional: contratos de rotas/métodos, R1 pp. 4 e 6.
V1: GET /api/produtos → 200 e lista conforme catálogo. V2: GET /api/produtos/P005 → 200 e preço 100. V3: GET /api/produtos/P999 (fora do catálogo) → 404/PRODUTO_NAO_ENCONTRADO. V4: GET /api/rota-inexistente-vzs142 → 404/ROTA_NAO_ENCONTRADA. V5: GET /api/carrinho/calcular → 405/METODO_NAO_PERMITIDO. Confirmar corpo JSON e códigos, sem depender apenas do status.

### MAN-008 — Dados de cliente e CEP (API e UI, P2)

Natureza: Negativo e valores limite de CEP; referências positivas em MAN-009. Regra adicional: cliente/CEP, R1 pp. 2–3 e 7. Status registrado: 8/8 variantes negativas passaram; V9/V10 foram cobertas em MAN-009.
Base fictícia: Maria Silva, maria@example.com, CEP 01310-100 e P005 ×1. Variar apenas um campo inválido por vez.

| Variante | Entrada | Esperado |
| --- | --- | --- |
| V1 | Nome vazio | UI impede confirmação; API 422 DADOS_INVALIDOS com detalhe em campos |
| V2 | Nome Maria (sem sobrenome) | Mesmo comportamento de rejeição |
| V3 | E-mail vazio | Mesmo comportamento de rejeição |
| V4 | E-mail maria-sem-arroba | Mesmo comportamento de rejeição |
| V5 | CEP vazio | Mesmo comportamento de rejeição |
| V6 | CEP 0131010 (7 dígitos) | Mesmo comportamento de rejeição |
| V7 | CEP 013101000 (9 dígitos) | Mesmo comportamento de rejeição |
| V8 | CEP ABCDE-FGH | Mesmo comportamento de rejeição |
| V9 | CEP 01310-100 com demais dados válidos | Aceitar na confirmação planejada em MAN-009 |
| V10 | CEP 01310100 com demais dados válidos | Aceitar na confirmação planejada em MAN-009 |

V9/V10 são referências aos dados positivos de MAN-009, não execuções adicionais duplicadas. Não inferir consulta a endereço real, restrições de domínio ou mensagens literais não documentadas.

### MAN-009 — Confirmação e contrato de pedido (API e UI, P1)

Natureza: Positivo. Regra adicional: confirmação/contrato, R1 pp. 5–6; os cálculos reutilizam CA01, CA07 e CA09 sem ampliar a automação planejada. Status registrado: 4/4 combinações passaram.
Dado cliente fictício válido e P005 ×1, quando confirmar pedido sem cupom ou com BEMVINDO10, então esperar 201, número VZ- seguido de seis dígitos e resumo consistente. Esperados: subtotal 100, frete 19.90, total 119.90 sem cupom; desconto 10 e total 109.90 com cupom. Exercitar CEP com e sem hífen (MAN-008 V9/V10). Na UI, verificar confirmação e os valores apresentados. Não exigir persistência, consulta futura, e-mail ou cobrança.

### MAN-010 — Cupom inválido/expirado no pedido (API, P2)

Natureza: Negativo. Regra adicional: erro de cupom em pedido, R1 pp. 5 e 7; não confundir com CA03/CA04 no cálculo. Status registrado: 2/2 casos passaram.
Dado cliente válido e P005 ×1, quando enviar pedido com NAOEXISTE142, esperar 422/CUPOM_INVALIDO. Com VERAO2026, esperar 422/CUPOM_EXPIRADO. Contrasta com 200 no cálculo de MAN-001/002. Não enviar pedidos nesta etapa.

### MAN-011 — Limite de quantidade no pedido (API, P1; CA10)

Natureza: Positivo, negativo e valores limite.
Dado cliente válido e P005, quando enviar pedido com quantidade 5, esperar 201 e subtotal/total 500 sem cupom. Em chamada independente com quantidade 6, esperar 422/QUANTIDADE_MAXIMA_EXCEDIDA. Complementa AUT-004 no contrato de pedidos e AUT-008. Foi executado com chamadas HTTP assistidas: cinco unidades retornaram 201; seis foram aceitas indevidamente com 201 em duas tentativas. Veja execucao-etapa5.md e as evidências MAN-011.


### MAN-012 — Normalização de cupom na interface (UI, P2; CA02)

Natureza: Positivo; partições de entrada.
Dado um carrinho novo com P005 ×1, executar cada variante de AUT-002 em contexto independente. Ao aplicar, esperar um único desconto de R$ 10,00, subtotal R$ 100,00, frete R$ 19,90 e total R$ 109,90. Remover antes de tentar outra entrada ou reiniciar o carrinho. Não exigir transformação visual do texto digitado: o critério trata da aceitação do código.

## Contratos comuns a verificar na execução futura

Fonte: R1, pp. 3–7. Para as chamadas de cálculo válidas, usar POST /api/carrinho/calcular com Content-Type: application/json e payload itens, incluindo cupom apenas quando previsto. Os campos do resumo incluem itens, subtotal, desconto, frete, freteGratis, valorFaltanteFreteGratis, total e cupom. Validar os valores dos itens contra preço × quantidade, além do total agregado; não exigir texto literal de sucesso fora dos exemplos.

| Cupom (com demais dados válidos) | Cálculo do carrinho | Confirmação de pedido | Cenários |
| --- | --- | --- | --- |
| BEMVINDO10 | 200, aplicado, desconto de 10% do subtotal | 201, resumo e número VZ- com seis dígitos | AUT-001/002/003, MAN-009 |
| NAOEXISTE142 | 200, sem desconto; cupom.mensagem = “Cupom inválido.” | 422, erro.codigo = CUPOM_INVALIDO | MAN-001, MAN-010 |
| VERAO2026 | 200, sem desconto; cupom.mensagem = “Cupom expirado.” | 422, erro.codigo = CUPOM_EXPIRADO | MAN-002, MAN-010 |

Mensagens literais dos erros de pedido não estão especificadas; não reutilizar obrigatoriamente os textos do cálculo. Um status 422 de pedido não deve ser usado como esperado para cupom inválido no cálculo.

Em MAN-009, planejar quatro combinações independentes: sem cupom/com BEMVINDO10 × CEP com/sem hífen, em cada camada. Esperar faltante 100 e freteGratis falso. Validar os dados do cliente e os itens; criadoEm e a normalização do CEP de saída aparecem no exemplo, mas não têm regra de formato explícita. Registrar observações, sem transformar o exemplo em exigência adicional.

## Sessões exploratórias planejadas

Exigência de execução manual e exploratória: R2, p. 3. EXP-001–EXP-003 foram executados com instrumentação por Codex e não representam avaliação humana independente nem novos testes automatizados; seus resultados estão em execucao-etapa5.md. EXP-004 é um registro separado de execução manual independente da candidata.

### EXP-001 — Recálculo e transições do carrinho (UI, P1)

Natureza: Exploratório; transições positivas e limites.
Objetivo: explorar sequências adicionais de adição/remoção e alteração de quantidade, cruzando o limite de frete. Começar com P005 ×1, passar para ×2, aplicar BEMVINDO10, reduzir para ×1 e remover o cupom. Os totais esperados pela fórmula oficial são 119,90 → 200,00 → 180,00 → 109,90 → 119,90; o limite exato pode manifestar BUG-001, sem mudar os esperados. Variar a ordem para obter cobertura exploratória além dos casos fixos. CA01, CA05–CA09 e CA11. Observar valores desatualizados, mensagens contraditórias e recálculo; não criar regras de tempo de resposta.

### EXP-002 — Cupons e quantidade (UI, P1)

Natureza: Exploratório; positivos, negativos e limites (cupons P2, limite por produto P1).
Objetivo: alternar entradas válidas, normalizadas, inválidas e expiradas em carrinho com P005, removendo o cupom aplicado antes da troca; explorar o limite na vitrine e no carrinho. Referências: AUT-002/005, MAN-001–MAN-004 e MAN-012; CA01–CA05 e CA10. Não assumir troca entre dois cupons válidos. Para cinco P005, subtotal 500; com BEMVINDO10, desconto 50 e total 450; seis unidades do mesmo produto devem ser impedidas. Confirmar que a rejeição não cria um sexto item nem acumula descontos.

### EXP-003 — Cliente e correção de entradas (UI, P2)

Natureza: Exploratório; dados inválidos e recuperação. Regra adicional: cliente/CEP, R1 pp. 2–3 e 7.
Objetivo: observar validação e recuperação de campos inválidos de cliente antes da confirmação. Usar os dados e partições de MAN-008, corrigindo um campo por vez, sem inferir mensagens não publicadas. A sessão registrada corrigiu entradas de cliente observando a UI, sem consulta posterior de pedido. Nenhuma divergência nova foi observada.

### EXP-004 — CEP zerado aceito no checkout (UI, manual; MEL-001)

**Responsável e modalidade:** candidata; execução manual independente, sem Codex ou Playwright neste cenário. Data e horário não informados.

**Passos observados:** (1) Adicionar uma unidade de Camiseta Essencial (R$ 59,90), Calça Jeans Slim (R$ 139,90), Tênis Casual Urbano (R$ 189,90) e Boné Aba Curva (R$ 49,90), formando subtotal de R$ 439,60. (2) Aplicar BEMVINDO10. (3) Avançar à finalização da compra com os dados de cliente preenchidos. (4) Informar `00000-000` no campo CEP. (5) Clicar em **Confirmar pedido**.

**Resultado observado:** a aplicação aceitou o CEP e apresentou o pedido `VZ-907297` como confirmado. O resumo mostrou subtotal R$ 439,60, desconto de R$ 43,96, frete grátis e total R$ 395,64.

**Resultado esperado proposto:** caso o requisito de negócio exija validar a existência/entregabilidade do CEP, a confirmação deve ser impedida com indicação clara no campo. A exigência de existência do CEP não foi confirmada nos critérios CA01–CA11; tratar como sugestão de melhoria/possível lacuna, não como defeito confirmado. Registro relacionado: [MEL-001](bugs.md#mel-001--validação-de-existência-do-cep-no-checkout).

**Evidências:** [checkout com CEP informado](../evidencias/interface/mel-001-checkout-cep-zerado.png) e [pedido confirmado](../evidencias/interface/mel-001-pedido-confirmado.png).

Registro obrigatório por sessão: objetivo, responsável, data/fuso, duração real, dados/sequência efetivamente usados, esperado e observado, evidências, dúvidas, cenários derivados e bugs somente se reproduzidos. Exploração sem divergência observada não comprova cobertura integral dos critérios.
