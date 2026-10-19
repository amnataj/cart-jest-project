import type { Order } from './types';

export const formatMoney = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export function formatReceipt(order: Order): string {
  const lines = [
    `Order ${order.id}`,
    `Date: ${order.createdAt.toISOString()}`,
    '',
    ...order.items.map(
      (i) => `${i.quantity} x ${i.name} @ ${formatMoney(i.priceCents)} = ${formatMoney(i.quantity * i.priceCents)}`,
    ),
    '',
    `Subtotal: ${formatMoney(order.totals.subtotalCents)}`,
    `Discount: -${formatMoney(order.totals.discountCents)}`,
    `Shipping: ${formatMoney(order.totals.shippingCents)}`,
    `Tax: ${formatMoney(order.totals.taxCents)}`,
    `Total: ${formatMoney(order.totals.totalCents)}`,
  ];
  return lines.join('\n');
}
