# Matriz de rastreabilidade — VZS-142 v2.3.0

Fontes dos critérios: R1 (documentacao.pdf, CA01–CA11) e R2 (Teste tecnico QA Junior - Verzel.pdf, entregas). Referências do planejamento no [plano](plano-de-testes.md); passos e dados nos [cenários](cenarios-de-teste.md).

AUT = teste automatizado; MAN = execução manual assistida/instrumentada; EXP = sessão exploratória assistida. A etapa 5 foi realizada por Codex com interações instrumentadas no Chromium e chamadas HTTP sequenciais; não representa avaliação humana independente de usabilidade. P1 prioriza risco financeiro, limites e fluxo principal; P2 cobre mensagens e contratos complementares.

| CA | Regra | Automatizado | Manual | Exploratório | Prioridade | Resultado consolidado | Evidência / registro |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CA01 | 10% do subtotal | AUT-001, AUT-005 | MAN-005, MAN-009 | EXP-001, EXP-002 | P1 | Parcial: automações passaram; variantes manuais documentadas passaram; exploração não apontou divergência nova | [Execução](execucao.md), [MAN-005](execucao-etapa5.md) |
| CA02 | Caixa e espaços externos | AUT-002 | MAN-012 | EXP-002 | P2 | Parcial: AUT-002 V1–V5 e MAN-012 V1–V5 passaram; exploração sem divergência nova | [Execução](execucao.md), [etapa 5](execucao-etapa5.md) |
| CA03 | Cupom inexistente | AUT-007-V1 | MAN-001 | EXP-002 | P2 | AUT-007-V1 e MAN-001 passaram; exploração não apontou divergência nova | [MAN-001 API](../evidencias/api/MAN-001-API-2026-10-08.json), [execução](execucao.md) |
| CA04 | Cupom expirado | AUT-007-V2 | MAN-002 | EXP-002 | P2 | AUT-007-V2 e MAN-002 passaram; exploração não apontou divergência nova | [MAN-002 API](../evidencias/api/MAN-002-API-2026-10-08.json), [execução](execucao.md) |
| CA05 | Um cupom; remoção antes da troca | AUT-005 | MAN-003 | EXP-001, EXP-002 | P1 | AUT-005 e MAN-003 passaram; exploração não encontrou divergência nova | [UI aplicado/removido](../evidencias/interface/AUT-005-aplicado-2026-10-08.png), [etapa 5](execucao-etapa5.md) |
| CA06 | Frete grátis com subtotal >= R$ 200 | AUT-003, AUT-006 | MAN-005 | EXP-001 | P1 | Parcial: casos acima passaram; três casos no limite exato falharam (BUG-001); EXP-001 também reproduziu BUG-001 | [API V2](../evidencias/api/AUT-003-V2-2026-10-08.json), [UI V2](../evidencias/interface/AUT-006-V2-2026-10-08.png), [bugs](bugs.md) |
| CA07 | Frete de R$ 19,90 abaixo de 200; valor faltante | AUT-003, AUT-006 | MAN-009 | EXP-001 | P1 | Coberto pelos casos abaixo do limite e pelos resumos manuais registrados; sem divergência nova nesta revisão | [V1](../evidencias/api/AUT-003-V1-2026-10-08.json), [etapa 5](execucao-etapa5.md) |
| CA08 | Elegibilidade do frete pelo subtotal antes do desconto | AUT-003, AUT-006 | MAN-005 | EXP-001 | P1 | Casos acima do limite passaram; V4 no limite exato falhou como manifestação de BUG-001; exploração registrou a mesma falha | [API V6](../evidencias/api/AUT-003-V6-2026-10-08.json), [bugs](bugs.md) |
| CA09 | Desconto não incide no frete | AUT-001, AUT-003, AUT-005, AUT-006 | MAN-005, MAN-009 | EXP-001 | P1 | Casos automatizados e manuais citados passaram; sem nova divergência relatada | [API V5](../evidencias/api/AUT-003-V5-2026-10-08.json), [etapa 5](execucao-etapa5.md) |
| CA10 | Até cinco unidades por produto na UI e API | AUT-004, AUT-008 | MAN-004, MAN-011 | EXP-002 | P1 | Parcial: cinco unidades aceitas; UI bloqueou a sexta; API de cálculo e de pedido aceitaram seis (BUG-002). EXP-002 observou bloqueio na UI | [AUT-004](../evidencias/api/AUT-004-V2-2026-10-08.json), [MAN-011](../evidencias/api/MAN-011-seis-2026-10-08.json), [reteste](../evidencias/api/MAN-011-seis-reteste-2026-10-08.json), [bugs](bugs.md) |
| CA11 | Duas casas decimais | AUT-001, AUT-003, AUT-005, AUT-006 | MAN-005 | EXP-001 | P1 | Valores conferidos nos casos registrados; regra de desempate continua sem especificação | [Execução](execucao.md), [etapa 5](execucao-etapa5.md) |

### Regras complementares dos contratos

| Regra / fonte | Cenários | Resultado etapa 5 | Registro |
| --- | --- | --- | --- |
| JSON, itens e quantidades — R1 pp. 6–7 | MAN-006 | 12/12 variantes passaram | [Execução etapa 5](execucao-etapa5.md) |
| Produtos, rotas e métodos — R1 pp. 4 e 6 | MAN-007 | 5/5 variantes passaram | [Execução etapa 5](execucao-etapa5.md) |
| Cliente e CEP — R1 pp. 2–3 e 7 | MAN-008, MAN-009, EXP-003 | MAN-008: 8/8 negativas passaram; MAN-009: 4/4 combinações positivas passaram; EXP-003 sem divergência nova | [Execução etapa 5](execucao-etapa5.md) |
| Pedido e resumo — R1 pp. 5–6 | MAN-009 | 4/4 combinações passaram; respostas de sucesso 201 registradas | [Execução etapa 5](execucao-etapa5.md) |
| Cupom inválido/expirado em pedido — R1 pp. 5 e 7 | MAN-010 | 2/2 casos passaram | [Execução etapa 5](execucao-etapa5.md) |
| Limite de quantidade na criação de pedido — CA10 | MAN-011, AUT-008 | Cinco unidades aceitas; seis aceitas indevidamente nas duas execuções MAN-011 e na regressão AUT-008 | [MAN-011 evidências](../evidencias/api/MAN-011-seis-2026-10-08.json), [AUT-008](execucao.md), [BUG-002](bugs.md) |

### Inventário automatizado

A suíte contém 20 testes em cinco arquivos de especificação (quatro API e um UI). AUT-001–006 são objetivos originais; AUT-007 cobre os dois tipos de cupom rejeitado no cálculo; AUT-008 verifica o limite de quantidade no endpoint de pedidos.

| ID / variantes | Camada | Objetivo | Arquivo |
| --- | --- | --- | --- |
| AUT-001 | API | Cupom válido | tests/api/cupons.spec.ts |
| AUT-002 V1–V5 | API | Normalização de cupom | tests/api/cupons.spec.ts |
| AUT-003 V1–V6 | API | Frete e cálculos limite | tests/api/frete.spec.ts |
| AUT-004 V1–V2 | API | Quantidade máxima no cálculo | tests/api/validacoes.spec.ts |
| AUT-005 | UI | Aplicação e remoção de cupom | tests/ui/carrinho.spec.ts |
| AUT-006 V1–V2 | UI | Frete grátis e total do carrinho | tests/ui/carrinho.spec.ts |
| AUT-007 V1–V2 | API | Cupom inexistente e expirado | tests/api/cupons.spec.ts |
| AUT-008 | API | Limite de unidades no pedido | tests/api/pedidos.spec.ts |

Na última regressão registrada: 20 testes, 15 passaram e 5 falharam. AUT-003-V2/V4, AUT-006-V2 e AUT-004-V2/AUT-008 reproduziram BUG-001 e BUG-002, respectivamente. Os códigos de saída e o histórico estão em [execucao.md](execucao.md).

### Limites da cobertura

Cobertura de um critério não equivale à aprovação do comportamento: CA06 e CA10 mantêm defeitos abertos. CA05 não cobre troca entre dois cupons válidos, pois apenas BEMVINDO10 está documentado como válido. CA11 não especifica o modo de desempate de arredondamento. O catálogo fixo não permite gerar subtotais de R$ 199,99 ou R$ 200,01. MAN/EXP foram assistidos por Codex; a revisão humana da candidata permanece necessária.
