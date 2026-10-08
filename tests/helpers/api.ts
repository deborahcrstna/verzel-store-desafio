import type { APIRequestContext, TestInfo } from '@playwright/test';

const caminhoCalculo = '/api/carrinho/calcular';

export async function postCarrinhoCalcular(
  request: APIRequestContext,
  testInfo: TestInfo,
  idCenario: string,
  payload: object,
) {
  const response = await request.post(caminhoCalculo, {
    headers: { 'Content-Type': 'application/json' },
    data: payload,
  });
  const responseText = await response.text();

  await testInfo.attach(`${idCenario}-requisicao-resposta`, {
    body: JSON.stringify({
      request: { method: 'POST', path: caminhoCalculo, body: payload },
      response: { status: response.status(), body: responseText },
    }, null, 2),
    contentType: 'application/json',
  });

  return { response, responseText };
}
