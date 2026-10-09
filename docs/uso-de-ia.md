# Uso de IA

## Participação das ferramentas

ChatGPT foi utilizado de forma significativa para estruturar prompts enviados ao Codex, orientar o planejamento, apoiar a interpretação de requisitos e resultados, discutir cenários e estratégias de teste e revisar decisões de documentação e apresentação. Codex apoiou a interpretação dos requisitos, a organização dos cenários e da rastreabilidade, a implementação e revisão dos testes, a produção e organização de documentação e evidências, a execução de atividades instrumentadas e a análise dos resultados.

Os cenários, dados de teste e resultados esperados foram fundamentados nos critérios de aceitação CA01–CA11, nas regras de negócio, nos contratos HTTP e na documentação fornecida no desafio. ChatGPT e Codex apoiaram essa análise e a estruturação dos testes. Em determinadas etapas, a candidata também forneceu parâmetros e direcionamentos específicos, incluindo dados utilizados na implementação de AUT-003 e AUT-004. Os valores esperados foram confrontados com os requisitos, e as expectativas não foram alteradas para fazer passar testes que reproduzem defeitos conhecidos.

A leitura dos requisitos considerou visualmente os PDFs do desafio. Como a extração textual resultou vazia por serem documentos em imagem, foi utilizado um leitor de PDF para examiná-los. O código funcional da loja não foi usado como fonte dos resultados esperados.

## Resultados automatizados

Codex implementou e revisou a automação Playwright e apoiou a análise das respostas. A regressão mais recente documentada contém **20 testes: 15 aprovados e 5 reprovados**. AUT-003-V2, AUT-003-V4 e AUT-006-V2 reproduziram o comportamento registrado como BUG-001; AUT-004-V2 e AUT-008 reproduziram o comportamento registrado como BUG-002. AUT-007-V1 e AUT-007-V2 passaram. Os resultados e seus limites estão descritos em [execucao.md](execucao.md) e [bugs.md](bugs.md). Não foram relaxadas asserções nem alterados valores esperados para ocultar as falhas.

## AAR — Agente de Aceitação e Regressão

O AAR foi desenvolvido com apoio de ChatGPT e Codex em sua estruturação, implementação, revisão, testes isolados e documentação. Seu analisador determinístico interpreta relatórios Playwright e relaciona os testes a critérios de aceite e bugs documentados. O investigador usa ferramentas controladas de leitura e um orquestrador validado com modelos simulados.

Foi implementado um adaptador opcional para a OpenAI Responses API. Houve uma tentativa de conexão em modo real com uma chave configurada temporariamente no PowerShell, mas a API respondeu HTTP 429 em contexto de ausência de créditos na conta. A investigação não chegou a consultar ferramentas nem produziu uma conclusão de IA; isso não valida o funcionamento da integração real. A demonstração reproduzível do AAR usa uma fixture sanitizada e o modo simulado, sem chave e sem rede. A suíte isolada mais recente do AAR teve **95 testes aprovados e 0 reprovados**; esse resultado não corresponde à regressão da Verzel Store. A regressão de referência da loja teve **20 testes: 15 aprovados e 5 reprovados**, associados a BUG-001 e BUG-002.

Os resultados foram acompanhados e revisados pela candidata. As implementações e as sessões manuais/exploratórias descritas acima foram realizadas com assistência do Codex; não são apresentadas como implementação autônoma ou execução manual independente da candidata. As conclusões do AAR são indicativas e exigem revisão humana.

## Atividades instrumentadas

As sessões manuais e exploratórias registradas foram realizadas com auxílio do Codex, por interações instrumentadas no Chromium e chamadas HTTP; não correspondem a uma execução manual independente pela candidata. Conforme [execucao-etapa5.md](execucao-etapa5.md), MAN-001–MAN-010 e MAN-012 passaram, MAN-011 observou a aceitação indevida de seis unidades no endpoint `POST /api/pedidos`, e EXP-001 observou o comportamento de BUG-001. EXP-002 e EXP-003 não registraram divergência nova. As evidências citadas nesses registros são da execução assistida.

## Histórico das contribuições

### Preparação e revisão documental — 08/10/2026

Codex inspecionou o pedido e os arquivos do projeto, consultou a documentação do desafio, organizou a estrutura inicial e preparou o plano, os cenários, a matriz e a configuração do Playwright. Também revisou a configuração do instalador preservando dependências e lockfile, e verificou o carregamento/listagem da suíte. Foram analisados CA01–CA11, os dados e contratos documentados; calculados os valores esperados; e registradas lacunas e ambiguidades. Na revisão documental, foram conferidos os cálculos, enumeradas as combinações de quantidades de 0 a 5 e mantidos os cenários como NÃO EXECUTADO naquele momento. Na etapa 2, não houve automação funcional nem pedido de teste; a ausência de commit e publicação registrada refere-se somente àquela etapa.

### Refinamento e implementação de API — 08/10/2026

No refinamento, Codex apoiou a revisão das pré-condições, variantes, prioridades e evidências dos cenários, além de conferir os cálculos sem acessar a aplicação. Naquele ponto, ainda não havia execução funcional. O documento do desafio também solicita que a candidata explique o uso de IA no formulário de entrega; este registro auxilia, mas não substitui o preenchimento pessoal desse formulário.

Na etapa de cupons, Codex implementou AUT-001 e AUT-002 com o fixture `request`, executou esse arquivo e organizou os registros de requisição e resposta. Os seis casos passaram. Não foi executada criação de pedido nessa etapa; AUT-003–AUT-006 ficaram para etapas posteriores.

Na etapa de frete e quantidade, Codex implementou AUT-003 V1–V5 e AUT-004 V1–V2 usando, entre outros direcionamentos registrados, dados fornecidos pela candidata. Os casos foram executados sem alterar as expectativas. Três falhas observadas foram registradas como divergências da aplicação em `bugs.md`; as asserções passaram a apresentar os campos divergentes com clareza.

### Refatoração e ampliação da automação — 08/10/2026

Codex refatorou os testes existentes preservando IDs, cenários e valores esperados, sem alterar a aplicação ou adicionar dependências. Depois implementou AUT-007-V1/V2, para cupons inexistente e expirado, e AUT-008, para seis unidades no endpoint `POST /api/pedidos`. A suíte chegou a 20 testes em cinco arquivos de especificação. Na regressão mais recente documentada, 15 passaram e 5 falharam: três reproduziram BUG-001 e dois reproduziram BUG-002. AUT-007-V1/V2 passaram. As falhas são comportamentos observados e documentados; não se atribui a elas uma causa interna não verificada.

### Execução assistida e consolidação documental — 08/10/2026

Codex executou as interações instrumentadas no Chromium e chamadas HTTP registradas na etapa 5 e apoiou a consolidação de README, cenários, matriz, execução e bugs. Os resultados dessa atividade estão resumidos na seção anterior e detalhados em [execucao-etapa5.md](execucao-etapa5.md). Os pedidos aceitos nas chamadas de teste eram fictícios no ambiente de QA e, segundo os registros do projeto, não foram persistidos.
