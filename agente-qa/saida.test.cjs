const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('analisador utiliza criação recursiva da pasta de saída', () => {
  const codigo = fs.readFileSync(path.join(__dirname, 'analisar.cjs'), 'utf8');

  assert.match(
    codigo,
    /fs\.mkdirSync\(pastaSaida,\s*\{\s*recursive:\s*true\s*\}\)/,
  );
});

test('Markdown do analisador não contém marcador @TICK@', () => {
  const codigo = fs.readFileSync(path.join(__dirname, 'analisar.cjs'), 'utf8');

  assert.equal(codigo.includes('@TICK@'), false);
});

test('Node.js cria pasta de análise mesmo quando o diretório pai não existe', (t) => {
  const temporario = fs.mkdtempSync(path.join(os.tmpdir(), 'aar-saida-'));

  t.after(() => fs.rmSync(temporario, { recursive: true, force: true }));

  const destino = path.join(temporario, 'analises', 'execucao-exemplo');

  fs.mkdirSync(destino, { recursive: true });

  assert.equal(fs.statSync(destino).isDirectory(), true);
});