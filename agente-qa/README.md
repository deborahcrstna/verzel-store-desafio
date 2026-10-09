# AAR — Agente de Aceitação e Regressão

O arquivo `indice.json` cataloga CA01–CA11 e os 20 casos AUT, com vínculos por variante e referências aos documentos existentes. Ele é um catálogo curado, não uma fonte independente de requisitos. As associações descrevem assertions observadas nos testes e não indicam aprovação do critério. Diferenças de granularidade em relação à matriz e pontos que precisam de revisão humana estão registrados no próprio índice.

Valide a estrutura e execute apenas os testes locais da fundação:

```powershell
node agente-qa/validar.cjs
node --test agente-qa/validar.test.cjs agente-qa/identificador-execucao.test.cjs
```

O validador usa `playwright test --list --reporter=list` para comparar a descoberta real de IDs e arquivos. A opção `--list` enumera os testes, sem executar os cenários contra a aplicação. O resultado separa erros estruturais de avisos, como critério sem automação declarado e divergência entre famílias AUT do índice e da matriz. A comparação com a matriz é apenas por família; não confirma a semântica de cada vínculo nem substitui a revisão humana.

Cada invocação principal do Playwright gera um ID novo e o coloca no ambiente do processo. Os workers herdam esse valor ao serem iniciados e o reutilizam ao recarregar a configuração; se um worker não o receber, a configuração falha explicitamente em vez de criar uma pasta fragmentada. Assim, HTML e JSON ficam em `playwright-report/execucoes/<id>/`, e traces, screenshots e demais saídas em `test-results/execucoes/<id>/`. Cada invocação tem seu próprio processo e ID, inclusive quando invocações são simultâneas. Os dois diretórios estão ignorados pelo Git e o JSON usa o reporter nativo do Playwright. A herança e a separação de IDs foram testadas em subprocessos Node; duas regressões Playwright simultâneas não foram executadas nesta etapa.

Para abrir uma execução específica, informe a pasta HTML:

```powershell
npm run test:report -- playwright-report/execucoes/<id>/html
```

O comando exige o caminho e confere a existência de `index.html`; não escolhe uma execução automaticamente. Relatórios e anexos permanecem locais e podem conter dados de requisições e capturas.

O analisador determinístico e o CLI do investigador estão implementados. O modo simulado funciona localmente sem rede; o adaptador opcional para a Responses API só é usado quando o modo real é explicitamente selecionado. Uma tentativa real terminou em HTTP 429 antes de consultar ferramentas, em contexto de ausência de créditos na conta, e não validou a integração.

## Demonstração offline para avaliadores

Na raiz do repositório, execute:

```powershell
node agente-qa/demonstrar.cjs
```

O comando usa a fixture sanitizada e reduzida `fixtures/playwright-regressao-referencia-2026-10-09.json`, executa o analisador determinístico e, em seguida, o investigador no modo simulado. A fixture preserva a execução de referência (20 testes: 15 aprovados e 5 reprovados), os IDs AUT e as mensagens mínimas de assertion necessárias para classificar três falhas compatíveis com BUG-001 e duas com BUG-002. Não contém o relatório bruto, dados pessoais, credenciais, payloads completos ou anexos. A análise resultante é criada em uma pasta exclusiva sob `agente-qa/analises/`; nenhuma análise local anterior é necessária ou sobrescrita.

A demonstração não acessa a loja, não usa rede nem chave de API. O investigador é um modelo simulado determinístico: a saída mostra as classificações, as ferramentas locais consultadas e a necessidade de revisão humana, mas não representa uma investigação feita por IA real. Ela prova o fluxo local do AAR a partir da fixture; não reexecuta a regressão histórica da loja nem comprova que o Playwright foi executado durante a demonstração.
## Analisador determinístico

O analisador complementa os relatórios do Playwright com um diagnóstico baseado no índice de rastreabilidade e nos bugs documentados. Ele funciona localmente com Node.js, sem IA, serviços externos ou dependências adicionais.

Execute-o informando explicitamente o caminho do relatório JSON nativo do Playwright:

```powershell
node agente-qa/analisar.cjs <caminho-do-relatorio.json>
```

Opcionalmente, informe um relatório anterior para comparar resultados por teste:

```powershell
node agente-qa/analisar.cjs <relatorio-atual.json> --historico <relatorio-anterior.json>
```

Cada chamada cria `analise.json` e `analise.md` em um diretório exclusivo ignorado pelo Git, sob `agente-qa/analises/`. As classificações distinguem falha compatível com bug documentado, falha não classificada, possível regressão quando existe resultado histórico aprovado comparável e resultado inconclusivo. O analisador não declara regressão confirmada sem evidência comparável.

O relatório separa os vínculos automatizados declarados dos resultados observados. Um teste aprovado não valida integralmente um critério; cobertura parcial, critérios sem automação, IDs inconsistentes, resultados incompletos e pendências de revisão humana permanecem explícitos.

O AAR não executa os testes nem acessa a aplicação. Ele depende de um JSON Playwright existente, do índice e de `docs/bugs.md`. A comparação histórica é limitada à correspondência de IDs e resultados disponíveis. A classificação determinística é indicativa e requer avaliação de QA; não interpreta conteúdo de anexos, não mede cobertura de código e não substitui revisão humana.

Os dados estruturados em `analise.json` podem ser fornecidos ao núcleo descrito abaixo. O adaptador opcional da Responses API está implementado; uma tentativa real retornou HTTP 429 antes da consulta a ferramentas e não concluiu a investigação. A integração real não está validada.

## Núcleo do investigador (modelo simulado)

O núcleo em `investigador/` oferece cinco ferramentas somente de leitura: resumo da análise, listagem de falhas, consulta por ID AUT, por ID CA e por ID BUG. Os dados de análise, índice e bugs são injetados pelo chamador; o modelo não fornece caminhos. As ferramentas retornam campos selecionados e sanitizados, referências verificáveis e limites de tamanho. Anexos são representados apenas por contagem; traces, screenshots e corpos completos não são expostos.

O orquestrador recebe um adaptador por injeção (`proximaEtapa(contexto)`). Uma implementação simulada pode solicitar ferramentas em várias etapas e depois devolver fatos observados por referência, hipóteses referenciadas e incertezas. O núcleo valida IDs, argumentos, ferramentas e referências, limita iterações e chamadas, registra somente nomes, IDs válidos e códigos de resultado, e sempre exige revisão humana. Fatos apresentados no resultado são derivados dos dados determinísticos consultados; hipóteses permanecem explicitamente não verificadas.

Execute os testes isolados do investigador e a suíte local do AAR:

```powershell
node --test agente-qa/investigador/*.test.cjs
node --test agente-qa/*.test.cjs agente-qa/investigador/*.test.cjs
```

Os testes do núcleo simulado não exigem chave, `.env`, internet ou dependências extras. O modo real é detalhado na seção seguinte e permanece sem ativação ou chamadas externas nesta etapa. O modelo simulado valida o protocolo e os limites do núcleo, não a qualidade de respostas de um modelo real.

## CLI do investigador

O CLI recebe explicitamente o `analise.json` criado pelo analisador e aceita somente arquivos dentro de `agente-qa/analises/<execução>/`. Ele resolve caminhos reais antes de ler, rejeitando escapes por `..` e links simbólicos para fora da pasta. O índice e `docs/bugs.md` são lidos de caminhos fixos do projeto. O resultado é impresso no terminal; o CLI não altera a análise original nem grava outro relatório.

Defina o caminho da análise que deseja consultar e execute o modo simulado:

```powershell
$analise = 'agente-qa/analises/<id-da-execucao>/analise.json'
node agente-qa/investigador/cli.cjs --modo simulado --analise $analise
```

O modo simulado solicita resumo e falhas às ferramentas locais e produz uma saída determinística. Ele não usa chave, rede ou modelo externo. Para a análise de referência iniciada em 09/10/2026, utilize o diretório da análise local correspondente ao horário `2026-10-09T05:04:18.393Z`; para uma demonstração reproduzível em clone limpo, use `node agente-qa/demonstrar.cjs`.

Para uma investigação real, configure a chave somente na sessão atual do PowerShell. O prompt a recebe como texto seguro, sem colocá-la no histórico dos comandos nem em arquivo:

```powershell
$secureKey = Read-Host 'OPENAI_API_KEY' -AsSecureString
$env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new('', $secureKey).Password
try {
    node agente-qa/investigador/cli.cjs --modo real --analise $analise
} finally {
    Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
    $secureKey.Dispose()
}
```

O CLI usa `gpt-4.1-mini` e limita cada investigação a 4 chamadas à API, 3 chamadas de ferramentas, 4 iterações, 10 segundos por chamada e 400 tokens de saída por resposta. Permanecem os limites do adaptador: solicitação de até 18.000 caracteres, saída de ferramenta até 8.000 caracteres e corpo HTTP até 96 KB. Não há teto monetário; o uso real pode gerar cobrança. A integração real não foi validada com sucesso: a tentativa reportada terminou em HTTP 429 antes da investigação. O corpo enviado inclui instruções, esquemas de ferramentas e somente projeções sanitizadas de contagens, estados, IDs, classificações e referências. Não inclui chave no prompt, mensagens de assertion, títulos, corpos de requisição, dados pessoais, traces, screenshots ou caminhos locais. A chave é transmitida apenas no cabeçalho de autenticação HTTPS. Não use o modo real sem autorização e revisão dos custos e da privacidade.

Uma falha, timeout ou limite no modo real resulta em estado inconclusivo e código de saída não zero; o CLI não troca para o modo simulado. Toda saída exige revisão humana.

## Adaptador Responses API (opcional; integração não validada)

`investigador/adaptador-openai.cjs` oferece dois modos. O padrão é `simulado`: não lê credenciais nem chama `fetch`; aceita um adaptador local injetado e, sem ele, responde de forma inconclusiva. O modo `real` exige a opção explícita `modo: 'real'` e `OPENAI_API_KEY` no ambiente do processo. A chave é lida somente nesse modo. O modelo `gpt-4.1-mini` é fixo nesta etapa para manter o fluxo stateless limitado; trocar o modelo requer nova revisão de protocolo e privacidade. O projeto não carrega `.env`, não cria arquivos de segredo e não inclui chave de API.

O adaptador usa `fetch` nativo por padrão, mas recebe um cliente HTTP por injeção. Os testes injetam um `fetch` falso que devolve respostas HTTP locais. Separadamente, foi feita uma tentativa real com o endpoint Responses API, que retornou HTTP 429 antes de qualquer consulta a ferramenta; não houve resposta investigativa válida e a integração continua sem validação bem-sucedida. A conversa é reenviada em modo stateless com os itens validados `function_call` e `function_call_output`, usando `store: false` e sem `previous_response_id`, conforme o [guia oficial de function calling](https://developers.openai.com/api/docs/guides/function-calling). O modelo só recebe os cinco esquemas de ferramentas permitidos. As solicitações de ferramenta são validadas localmente e entregues ao orquestrador, sem execução de comandos ou escrita de arquivos.

Em uma futura ativação real, poderiam sair do ambiente local os IDs AUT/CA/BUG, estados e contagens, classificações determinísticas, vínculos de rastreabilidade, severidade documentada e referências a arquivos documentais. O adaptador transmite somente uma projeção estruturada desses campos: omite pergunta livre, títulos, mensagens de assertion, trechos de documentos, anexos, paths, traces, screenshots e payloads. Emails, telefones, CEPs, URLs e formatos conhecidos de credenciais também são removidos. A documentação e os resultados são tratados como conteúdo não confiável; instruções embutidas não são transmitidas como texto livre nem executadas.

Os limites operacionais atuais são seis chamadas HTTP por instância do adaptador, 800 tokens de saída por resposta (configurável até 1.000), timeout padrão de 15 segundos (máximo de 30), requisição de até 18.000 caracteres, corpo de resposta de até 96 KB, resultado de ferramenta de até 8.000 caracteres e sem retries. Redirecionamentos são recusados e a requisição usa `store: false`. Esses limites não estabelecem um teto monetário: chamadas reais podem gerar custos conforme modelo e tarifas vigentes. Uma ativação futura precisa de autorização, revisão de privacidade e confirmação dos custos.

Teste os modos e o protocolo localmente:

```powershell
node --test agente-qa/investigador/*.test.cjs
node --test agente-qa/*.test.cjs agente-qa/investigador/*.test.cjs
```

Os testes exercitam o caminho de configuração real somente com `fetch` simulado, incluindo erros HTTP, timeout e limites; isso não representa ativação ou validação do serviço externo. Respostas do modelo continuam sujeitas a erro ou prompt injection. O orquestrador verifica formato e referências consultadas, exige revisão humana e não substitui a análise determinística nem confirma bugs corrigidos, regressões ou aprovação integral de critérios.
