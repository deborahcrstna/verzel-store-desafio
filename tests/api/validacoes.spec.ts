import { test, expect } from '@playwright/test';
import { postCarrinhoCalcular } from '../helpers/api';

test('AUT-004-V1: aceita cinco unidades de P006', async ({ request }, testInfo) => {
  const payload = { itens: [{ produtoId: 'P006', quantidade: 5 }] };
  const { response, responseText } = await postCarrinhoCalcular(
    request, testInfo, 'AUT-004-V1', payload,
  );

  expect(response.status(), 'A API deve aceitar exatamente cinco unidades').toBe(200);
  const body = JSON.parse(responseText);
  expect(body.itens).toHaveLength(1);
  expect(body.itens[0].produtoId).toBe('P006');
  expect(body.itens[0].quantidade).toBe(5);
  expect(body.subtotal).toBeCloseTo(149.5, 8);
  expect(body.desconto).toBeCloseTo(0, 8);
  expect(body.frete).toBeCloseTo(19.9, 8);
  expect(body.freteGratis).toBe(false);
  expect(body.valorFaltanteFreteGratis).toBeCloseTo(50.5, 8);
  expect(body.total).toBeCloseTo(169.4, 8);
});

test('AUT-004-V2: rejeita seis unidades de P006', async ({ request }, testInfo) => {
  const payload = { itens: [{ produtoId: 'P006', quantidade: 6 }] };
  const { response, responseText } = await postCarrinhoCalcular(
    request, testInfo, 'AUT-004-V2', payload,
  );

  expect.soft(response.status(), 'Seis unidades devem ser rejeitadas com HTTP 422').toBe(422);
  const body = JSON.parse(responseText);
  expect.soft(body.erro?.codigo, 'Código esperado para exceder o limite de unidades')
    .toBe('QUANTIDADE_MAXIMA_EXCEDIDA');
  expect.soft(body.erro?.mensagem, 'A resposta deve explicar a rejeição')
    .toEqual(expect.any(String));
  expect.soft(body.erro?.mensagem?.trim().length, 'A mensagem de erro não deve estar vazia')
    .toBeGreaterThan(0);
});
