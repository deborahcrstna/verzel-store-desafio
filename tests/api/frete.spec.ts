import { test, expect } from '@playwright/test';
import { postCarrinhoCalcular } from '../helpers/api';

const formatoMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const casos = [
  {
    id: 'AUT-003-V1',
    descricao: 'cobra frete abaixo de R$ 200,00',
    payload: {
      itens: [
        { produtoId: 'P001', quantidade: 1 },
        { produtoId: 'P002', quantidade: 1 },
      ],
    },
    esperado: {
      subtotal: 199.8,
      desconto: 0,
      frete: 19.9,
      freteGratis: false,
      valorFaltanteFreteGratis: 0.2,
      total: 219.7,
    },
  },
  {
    id: 'AUT-003-V2',
    descricao: 'concede frete grátis no subtotal exato de R$ 200,00',
    payload: { itens: [{ produtoId: 'P005', quantidade: 2 }] },
    esperado: {
      subtotal: 200,
      desconto: 0,
      frete: 0,
      freteGratis: true,
      valorFaltanteFreteGratis: 0,
      total: 200,
    },
  },
  {
    id: 'AUT-003-V3',
    descricao: 'concede frete grátis acima de R$ 200,00',
    payload: { itens: [{ produtoId: 'P007', quantidade: 1 }] },
    esperado: {
      subtotal: 229.9,
      desconto: 0,
      frete: 0,
      freteGratis: true,
      valorFaltanteFreteGratis: 0,
      total: 229.9,
    },
  },
  {
    id: 'AUT-003-V4',
    descricao: 'mantém frete grátis após aplicar desconto',
    payload: { itens: [{ produtoId: 'P005', quantidade: 2 }], cupom: 'BEMVINDO10' },
    esperado: {
      subtotal: 200,
      desconto: 20,
      frete: 0,
      freteGratis: true,
      valorFaltanteFreteGratis: 0,
      total: 180,
    },
  },
  {
    id: 'AUT-003-V5',
    descricao: 'não aplica desconto ao frete',
    payload: { itens: [{ produtoId: 'P005', quantidade: 1 }], cupom: 'BEMVINDO10' },
    esperado: {
      subtotal: 100,
      desconto: 10,
      frete: 19.9,
      freteGratis: false,
      valorFaltanteFreteGratis: 100,
      total: 109.9,
    },
  },
  {
    id: 'AUT-003-V6',
    descricao: 'mantém frete grátis quando o desconto reduz o subtotal abaixo de R$ 200,00',
    payload: {
      itens: [
        { produtoId: 'P003', quantidade: 1 },
        { produtoId: 'P006', quantidade: 1 },
      ],
      cupom: 'BEMVINDO10',
    },
    esperado: {
      subtotal: 219.8,
      desconto: 21.98,
      subtotalAposDesconto: 197.82,
      frete: 0,
      freteGratis: true,
      valorFaltanteFreteGratis: 0,
      total: 197.82,
    },
  },
];

for (const { id, descricao, payload, esperado } of casos) {
  test(`${id}: ${descricao}`, async ({ request }, testInfo) => {
    const { response, responseText } = await postCarrinhoCalcular(
      request, testInfo, id, payload,
    );

    expect(response.status(), 'A API deve aceitar os dados deste cenário').toBe(200);
    const body = JSON.parse(responseText);
    expect.soft(body.subtotal, `Subtotal esperado: ${formatoMoeda.format(esperado.subtotal)}`)
      .toBeCloseTo(esperado.subtotal, 8);
    expect.soft(body.desconto, `Desconto esperado: ${formatoMoeda.format(esperado.desconto)}`)
      .toBeCloseTo(esperado.desconto, 8);
    expect.soft(body.frete, `Frete esperado: ${formatoMoeda.format(esperado.frete)}`)
      .toBeCloseTo(esperado.frete, 8);
    expect.soft(body.freteGratis, `Frete grátis esperado: ${esperado.freteGratis}`)
      .toBe(esperado.freteGratis);
    expect.soft(
      body.valorFaltanteFreteGratis,
      `Valor faltante esperado: ${formatoMoeda.format(esperado.valorFaltanteFreteGratis)}`,
    ).toBeCloseTo(esperado.valorFaltanteFreteGratis, 8);
    expect.soft(body.total, `Total esperado: ${formatoMoeda.format(esperado.total)}`)
      .toBeCloseTo(esperado.total, 8);
    if ('subtotalAposDesconto' in esperado) {
      expect.soft(body.subtotal - body.desconto).toBeCloseTo(esperado.subtotalAposDesconto, 8);
    }
    if ('cupom' in payload) {
      expect(body.cupom.codigo).toBe('BEMVINDO10');
      expect(body.cupom.aplicado).toBe(true);
    }
  });
}
