import { test, expect } from '@playwright/test';
import { postCarrinhoCalcular } from '../helpers/api';

test('AUT-001: BEMVINDO10 desconta 10% do subtotal de P001', async ({ request }, testInfo) => {
  const payload = {
    itens: [{ produtoId: 'P001', quantidade: 1 }],
    cupom: 'BEMVINDO10',
  };

  const { response, responseText } = await postCarrinhoCalcular(
    request, testInfo, 'AUT-001', payload,
  );

  expect(response.status(), 'A API deve aceitar o cálculo do carrinho').toBe(200);
  const body = JSON.parse(responseText);

  expect(body.subtotal, 'Subtotal esperado para P001 ×1').toBeCloseTo(59.9, 8);
  expect(body.desconto, 'Desconto esperado de 10%').toBeCloseTo(5.99, 8);
  expect(body.frete, 'Frete esperado abaixo de R$ 200,00').toBeCloseTo(19.9, 8);
  expect(body.freteGratis).toBe(false);
  expect(body.valorFaltanteFreteGratis).toBeCloseTo(140.1, 8);
  expect(body.total, 'Total esperado após desconto e frete').toBeCloseTo(73.81, 8);
  expect(body.cupom.codigo).toBe('BEMVINDO10');
  expect(body.cupom.aplicado).toBe(true);
  expect(body.cupom.mensagem).toEqual(expect.any(String));
  expect(body.cupom.mensagem.trim().length).toBeGreaterThan(0);
});

const codigosNormalizados = [
  { variante: 'V1', descricao: 'código canônico', codigo: 'BEMVINDO10' },
  { variante: 'V2', descricao: 'letras minúsculas', codigo: 'bemvindo10' },
  { variante: 'V3', descricao: 'maiúsculas e minúsculas misturadas', codigo: 'BeMvInDo10' },
  { variante: 'V4', descricao: 'espaços nas extremidades', codigo: '  BEMVINDO10  ' },
  { variante: 'V5', descricao: 'minúsculas e espaços nas extremidades', codigo: '  bemvindo10  ' },
];

for (const { variante, descricao, codigo } of codigosNormalizados) {
  test(`AUT-002 ${variante}: aceita ${descricao}`, async ({ request }, testInfo) => {
    const payload = {
      itens: [{ produtoId: 'P005', quantidade: 1 }],
      cupom: codigo,
    };

    const { response, responseText } = await postCarrinhoCalcular(
      request, testInfo, `AUT-002-${variante}`, payload,
    );

    expect(response.status(), 'A API deve aceitar a forma normalizada do cupom').toBe(200);
    const body = JSON.parse(responseText);

    expect(body.cupom.codigo, 'Código normalizado esperado').toBe('BEMVINDO10');
    expect(body.cupom.aplicado, 'O cupom deve ser aplicado').toBe(true);
    expect(body.subtotal, 'Subtotal esperado para P005 ×1').toBeCloseTo(100, 8);
    expect(body.desconto, 'Desconto esperado de 10%').toBeCloseTo(10, 8);
    expect(body.frete, 'Frete esperado abaixo de R$ 200,00').toBeCloseTo(19.9, 8);
    expect(body.freteGratis).toBe(false);
    expect(body.valorFaltanteFreteGratis, 'Valor faltante esperado para frete grátis')
      .toBeCloseTo(100, 8);
    expect(body.total, 'Total esperado após desconto e frete').toBeCloseTo(109.9, 8);
  });
}

const cuponsRejeitados = [
  {
    variante: 'V1',
    descricao: 'cupom inexistente',
    codigo: 'NAOEXISTE142',
    mensagem: 'Cupom inválido.',
  },
  {
    variante: 'V2',
    descricao: 'cupom expirado',
    codigo: 'VERAO2026',
    mensagem: 'Cupom expirado.',
  },
];

for (const { variante, descricao, codigo, mensagem } of cuponsRejeitados) {
  test(`AUT-007-${variante}: rejeita ${descricao}`, async ({ request }, testInfo) => {
    const payload = {
      itens: [{ produtoId: 'P005', quantidade: 1 }],
      cupom: codigo,
    };

    const { response, responseText } = await postCarrinhoCalcular(
      request, testInfo, `AUT-007-${variante}`, payload,
    );

    expect(response.status(), 'Cupom inválido ou expirado deve retornar HTTP 200').toBe(200);
    const body = JSON.parse(responseText);

    expect(body.subtotal).toBeCloseTo(100, 8);
    expect(body.cupom.aplicado, 'Cupom rejeitado não deve ser aplicado').toBe(false);
    expect(body.cupom.mensagem, 'Mensagem documentada para o cupom informado').toBe(mensagem);
    expect(body.desconto, 'Cupom rejeitado não deve gerar desconto').toBeCloseTo(0, 8);
    expect(body.frete).toBeCloseTo(19.9, 8);
    expect(body.freteGratis).toBe(false);
    expect(body.valorFaltanteFreteGratis).toBeCloseTo(100, 8);
    expect(body.total, 'Total sem desconto para P005 ×1').toBeCloseTo(119.9, 8);
  });
}
