const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const raiz = path.resolve(__dirname, '..');
const argumento = process.argv[2];
if (!argumento) {
  console.error('Informe o caminho explícito da pasta HTML, por exemplo: npm run test:report -- playwright-report/execucoes/<id>/html');
  process.exit(1);
}

const pastaPermitida = path.resolve(raiz, 'playwright-report', 'execucoes');
const relatorio = path.resolve(process.cwd(), argumento);
const relativo = path.relative(pastaPermitida, relatorio);
if (!relativo || relativo.startsWith('..') || path.isAbsolute(relativo)) {
  console.error('O relatório deve estar dentro de playwright-report/execucoes/.');
  process.exit(1);
}
if (!fs.existsSync(path.join(relatorio, 'index.html'))) {
  console.error(`Não encontrei index.html em: ${relatorio}`);
  process.exit(1);
}

const cli = path.join(raiz, 'node_modules', '@playwright', 'test', 'cli.js');
if (!fs.existsSync(cli)) {
  console.error('Playwright não está instalado. Execute npm ci antes de abrir o relatório.');
  process.exit(1);
}
const processo = spawn(process.execPath, [cli, 'show-report', relatorio], {
  cwd: raiz,
  stdio: 'inherit',
});
processo.on('error', erro => {
  console.error(`Não foi possível iniciar o relatório: ${erro.message}`);
  process.exitCode = 1;
});
processo.on('exit', (codigo, sinal) => {
  process.exitCode = codigo ?? (sinal ? 1 : 0);
});
