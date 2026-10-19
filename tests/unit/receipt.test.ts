import { formatMoney, formatReceipt } from '../../src/receipt';
import type { Order } from '../../src/types';
import { makeItem } from '../helpers/factories';

describe('formatMoney', () => {
  it.each([
    [0, '$0.00'],
    [5, '$0.05'],
    [1999, '$19.99'],
    [123_456, '$1234.56'],
  ])('%p cents => %p', (cents, expected) => {
    expect(formatMoney(cents)).toBe(expected);
  });
});

describe('formatReceipt', () => {
  it('matches the stored snapshot', () => {
    const order: Order = {
      id: 'order-1',
      createdAt: new Date('2026-01-15T10:30:00.000Z'),
      paymentId: 'pay_1',
      items: [
        makeItem({ sku: 'CHAIR', name: 'Lund Chair', priceCents: 14_900, quantity: 2 }),
        makeItem({ sku: 'LAMP', name: 'Arc Floor Lamp', priceCents: 5900 }),
      ],
      totals: { subtotalCents: 35_700, discountCents: 3570, shippingCents: 0, taxCents: 2570, totalCents: 34_700 },
    };
    expect(formatReceipt(order)).toMatchSnapshot();
  });
});
