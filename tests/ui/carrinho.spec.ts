import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

function localizarResumoPedido(page: Page) {
  const resumo = page.getByRole('region', { name: 'Resumo do pedido' });

  return {
    subtotal: resumo.locator('dd[data-valor="subtotal"]'),
    desconto: resumo.locator('dd[data-valor="desconto"]'),
    frete: resumo.locator('dd[data-valor="frete"]'),
    total: resumo.locator('dd[data-valor="total"]'),
  };
}

async function anexarCaptura(page: Page, testInfo: TestInfo, nome: string) {
  await testInfo.attach(nome, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
}

test('AUT-005: aplica e remove BEMVINDO10 no carrinho de P005', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('article', { name: 'Mochila Urbana 20L' })
    .getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  await page.getByRole('link', { name: /Carrinho 1 itens no carrinho/ }).click();

  const { subtotal, desconto, frete, total } = localizarResumoPedido(page);

  await expect(subtotal).toHaveText('R$ 100,00');
  await page.getByRole('textbox', { name: 'Cupom de desconto' }).fill('BEMVINDO10');
  await page.getByRole('button', { name: 'Aplicar cupom' }).click();
  await expect(page.getByRole('button', { name: 'Remover cupom' })).toBeVisible();
  await expect(desconto).toHaveText('- R$ 10,00');
  await anexarCaptura(page, testInfo, 'AUT-005-cupom-aplicado');
  await expect.soft(subtotal, 'Subtotal deve permanecer em R$ 100,00').toHaveText('R$ 100,00');
  await expect.soft(frete, 'Frete deve permanecer em R$ 19,90').toHaveText('R$ 19,90');
  await expect.soft(total, 'Total com cupom deve ser R$ 109,90').toHaveText('R$ 109,90');

  await page.getByRole('button', { name: 'Remover cupom' }).click();
  await expect(page.getByRole('textbox', { name: 'Cupom de desconto' })).toBeVisible();
  await expect(desconto).toHaveText('R$ 0,00');
  await anexarCaptura(page, testInfo, 'AUT-005-cupom-removido');
  await expect.soft(subtotal, 'Subtotal deve permanecer em R$ 100,00').toHaveText('R$ 100,00');
  await expect.soft(frete, 'Frete deve permanecer em R$ 19,90').toHaveText('R$ 19,90');
  await expect.soft(total, 'Total sem cupom deve ser R$ 119,90').toHaveText('R$ 119,90');
});

test('AUT-006-V1: mantém frete grátis acima do limite mesmo após desconto', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('article', { name: 'Tênis Casual Urbano' })
    .getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  await page.getByRole('article', { name: 'Kit 3 Pares de Meias' })
    .getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  await page.getByRole('link', { name: /Carrinho 2 itens no carrinho/ }).click();

  const { subtotal, desconto, frete, total } = localizarResumoPedido(page);
  await expect(subtotal).toHaveText('R$ 219,80');

  await page.getByRole('textbox', { name: 'Cupom de desconto' }).fill('BEMVINDO10');
  await page.getByRole('button', { name: 'Aplicar cupom' }).click();
  await expect(page.getByRole('button', { name: 'Remover cupom' })).toBeVisible();
  await expect(desconto).toHaveText('- R$ 21,98');
  await anexarCaptura(page, testInfo, 'AUT-006-V1-frete-apos-desconto');
  await expect.soft(subtotal, 'Subtotal esperado antes do desconto: R$ 219,80')
    .toHaveText('R$ 219,80');
  await expect.soft(frete, 'O frete deve continuar grátis após o desconto').toHaveText('Grátis');
  await expect.soft(total, 'Total esperado após o desconto: R$ 197,82').toHaveText('R$ 197,82');
});

test('AUT-006-V2: concede frete grátis no subtotal exato de R$ 200,00', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('article', { name: 'Mochila Urbana 20L' })
    .getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  await page.getByRole('link', { name: /Carrinho 1 itens no carrinho/ }).click();
  await page.getByRole('group', { name: 'Quantidade de Mochila Urbana 20L' })
    .getByRole('button', { name: 'Aumentar quantidade de Mochila Urbana 20L' }).click();

  const { subtotal, desconto, frete, total } = localizarResumoPedido(page);
  await expect(page.getByRole('status', { name: 'Quantidade de Mochila Urbana 20L' })).toHaveText('2');
  await expect(subtotal).toHaveText('R$ 200,00');
  await anexarCaptura(page, testInfo, 'AUT-006-V2-limite-exato');
  await expect.soft(desconto, 'Desconto esperado sem cupom: R$ 0,00').toHaveText('R$ 0,00');
  await expect.soft(frete, 'O frete deve ser grátis no subtotal exato de R$ 200,00')
    .toHaveText('Grátis');
  await expect.soft(total, 'Total esperado no limite exato: R$ 200,00').toHaveText('R$ 200,00');
});
