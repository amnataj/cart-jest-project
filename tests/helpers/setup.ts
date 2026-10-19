import type { Order } from '../../src/types';

expect.extend({
  toBeValidOrder(received: unknown) {
    const o = received as Order;
    const t = o?.totals;
    const pass =
      !!o &&
      typeof o.id === 'string' &&
      typeof o.paymentId === 'string' &&
      Array.isArray(o.items) &&
      o.items.length > 0 &&
      t.totalCents === t.subtotalCents - t.discountCents + t.shippingCents + t.taxCents;

    return {
      pass,
      message: () =>
        pass
          ? 'expected value not to be a valid order'
          : `expected a valid order with consistent totals, received ${JSON.stringify(received)}`,
    };
  },
});
