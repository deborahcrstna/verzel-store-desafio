# Verzel Store — Desafio de QA Júnior

Avaliação funcional do card **VZS-142**, versão **2.3.0**, com testes de API e interface em Node.js, TypeScript e Playwright. O foco são os cálculos de desconto e frete, o limite de unidades e a consistência dos contratos de pedido.

[Aplicação](https://verzel-store.qa-test-verzel-store.workers.dev/) · [Documentação oficial](https://verzel-store.qa-test-verzel-store.workers.dev/documentacao)

## Resultado mais recente

A regressão final foi executada no PowerShell externo em **08/10/2026**: **20 testes, 15 aprovados, 5 reprovados, 0 skipped e 0 flaky**, em 17,2 segundos. O relatório HTML local foi aberto e conferido visualmente, confirmando esses números. As cinco falhas são reproduções dos dois defeitos conhecidos, sem serem classificadas como erros da automação:

- **BUG-001 — frete no limite exato de R$ 200,00:** AUT-003-V2, AUT-003-V4 e AUT-006-V2.
- **BUG-002 — mais de cinco unidades do mesmo produto aceitas pela API:** AUT-004-V2 e AUT-008.

AUT-007-V1/V2 e AUT-008 foram incluídos na suíte ampliada. A regressão mais recente ocorreu em 08/10/2026. Consulte [execução](docs/execucao.md) e [bugs](docs/bugs.md) para contexto e resultados históricos.

## Objetivo e estratégia

A cobertura prioriza as regras que podem alterar o valor final ou permitir uma operação fora dos limites: desconto de 10%, elegibilidade ao frete grátis (inclusive no limite), quantidade máxima por produto, cupons inválidos/expirados e resposta de criação de pedido. Particionamento de entradas e valores limite orientam os casos. Os valores esperados são calculados a partir dos requisitos e do catálogo documentado, não da resposta da aplicação.

### Análise de riscos

| Risco | Prioridade | Justificativa |
| --- | --- | --- |
| Frete e descontos calculados incorretamente | P1 | Afetam diretamente o total apresentado ao cliente; BUG-001 demonstra uma cobrança indevida de R$ 19,90 no limite inclusivo. |
| Limites de quantidade inconsistentes | P1 | Permitir seis unidades ultrapassa CA10; a UI bloqueia a sexta unidade, mas API e criação de pedido a aceitaram (BUG-002). |
| Divergência entre API e interface | P1 | Camadas diferentes podem aplicar regras distintas, levando a valores ou confirmações contraditórias. A cobertura compara resultados onde há cenários correspondentes. |
| Mensagens e rejeição de cupons inválidos/expirados | P2 | O cálculo deve responder sem desconto e informar o motivo; erros no contrato de pedido têm códigos próprios. |

## Cobertura

A suíte tem **20 casos automatizados em cinco arquivos de especificação**, além de helpers. Ela cobre API (cálculo, normalização e rejeição de cupons, frete, validações de quantidade e pedidos) e UI (aplicação/remoção de cupom e resumo do carrinho). A matriz relaciona cada automação com CA01–CA11.

Também há 12 cenários manuais documentados (MAN-001–MAN-012) e três sessões exploratórias (EXP-001–EXP-003), executados com interações instrumentadas por Codex e chamadas HTTP; isso não equivale a uma avaliação humana independente de usabilidade. MAN-011 reproduziu a aceitação de seis unidades no endpoint de pedidos. Veja [execução etapa 5](docs/execucao-etapa5.md) e o índice em [execução](docs/execucao.md).

## Estrutura

```text
docs/
  plano-de-testes.md
  matriz-rastreabilidade.md
  cenarios-de-teste.md
  execucao.md
  execucao-etapa5.md
  bugs.md
  uso-de-ia.md
evidencias/
  api/
  interface/
tests/
  api/
    cupons.spec.ts
    frete.spec.ts
    pedidos.spec.ts
    validacoes.spec.ts
  helpers/api.ts
  ui/carrinho.spec.ts
playwright.config.ts
package.json
package-lock.json
README.md
```

Scripts auxiliares locais de execução manual são ignorados pelo Git e não fazem parte da entrega pública.

## Instalação e execução

Requer Node.js compatível com Playwright (>=20). Na raiz do projeto:

```powershell
npm ci
npx playwright install chromium
npx playwright test --list
npm test
```

Comandos úteis definidos em package.json: `npm run test:api`, `npm run test:ui`, `npm run test:headed` e `npm run test:report` (abre um relatório HTML já gerado).

O relatório Playwright e os artefatos de falha ficam em `playwright-report/` e `test-results/`, ignorados pelo Git. O `playwright-report/index.html` local corresponde à regressão final de 08/10/2026 e foi conferido visualmente; ele não será incluído nem disponibilizado pelo repositório público. Relatórios e traces podem conter dados de requisições, respostas e capturas. Evidências versionáveis selecionadas e referenciadas ficam em `evidencias/api/` e `evidencias/interface/`. Os dados de cliente usados nos registros são fictícios. Conferir artefatos e configuração local antes de qualquer publicação. Os scripts manual-stage5.cjs e manual-ui-stage5.cjs gravam nomes de evidência fixos com a data da etapa; não os reexecute sem alterar o destino, pois isso pode sobrescrever arquivos históricos.

## Documentação

- [Plano de testes](docs/plano-de-testes.md): escopo, fontes, prioridades e limitações.
- [Matriz de rastreabilidade](docs/matriz-rastreabilidade.md): critérios e resultados por modalidade.
- [Cenários de teste](docs/cenarios-de-teste.md): dados, passos e resultados esperados.
- [Registro de execução](docs/execucao.md) e [execução etapa 5](docs/execucao-etapa5.md): histórico e evidências.
- [Bugs](docs/bugs.md): divergências confirmadas.
- [Uso de IA](docs/uso-de-ia.md): contribuições assistidas e revisão pendente.

## Limitações conhecidas

Apenas BEMVINDO10 está documentado como cupom válido; não há cobertura de troca entre dois cupons válidos distintos. Os preços fixos do catálogo não permitem gerar subtotais de R$ 199,99 ou R$ 200,01. O modo de desempate de arredondamento não está especificado. A regressão atual mantém cinco falhas correspondentes aos dois bugs em aberto; nenhum bug foi ocultado alterando os resultados esperados. A execução instrumentada por Codex ainda requer revisão da candidata antes da entrega.
