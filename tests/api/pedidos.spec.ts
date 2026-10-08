import { test, expect } from '@playwright/test';

test('AUT-008: rejeita seis unidades do mesmo produto no pedido', async ({ request }, testInfo) => {
  const caminho = '/api/pedidos';
  const payload = {
    cliente: {
      nome: 'Maria Silva',
      email: 'maria@example.com',
      cep: '01310-100',
    },
    itens: [{ produtoId: 'P005', quantidade: 6 }],
  };

  const response = await request.post(caminho, {
    headers: { 'Content-Type': 'application/json' },
    data: payload,
  });
  const responseText = await response.text();

  await testInfo.attach('AUT-008-pedido-seis-unidades-requisicao-resposta', {
    body: JSON.stringify({
      request: { method: 'POST', path: caminho, body: payload },
      response: { status: response.status(), body: responseText },
    }, null, 2),
    contentType: 'application/json',
  });

  expect.soft(response.status(), 'Pedido com seis unidades deve retornar HTTP 422').toBe(422);
  const body = JSON.parse(responseText);
  expect.soft(body.erro?.codigo, 'Código esperado ao exceder cinco unidades')
    .toBe('QUANTIDADE_MAXIMA_EXCEDIDA');
  expect.soft(body.erro?.mensagem, 'A resposta deve explicar a rejeição do pedido')
    .toEqual(expect.any(String));
  expect.soft(body.erro?.mensagem?.trim().length, 'A mensagem de erro não deve estar vazia')
    .toBeGreaterThan(0);
});
