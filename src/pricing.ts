import { DiscountNotApplicableError, InvalidDiscountError } from './errors';
import type { CartItem, OrderTotals } from './types';

export const TAX_RATE = 0.08;
export const FLAT_SHIPPING_CENTS = 799;
export const FREE_SHIPPING_THRESHOLD_CENTS = 10_000;
export const FLAT5_MIN_SUBTOTAL_CENTS = 3_000;

export interface DiscountResult {
  discountCents: number;
  freeShipping: boolean;
}

export function calculateSubtotal(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

export function applyDiscount(subtotalCents: number, code?: string): DiscountResult {
  if (!code) return { discountCents: 0, freeShipping: false };

  const normalized = code.trim().toUpperCase();
  switch (normalized) {
    case 'SAVE10':
      return { discountCents: Math.round(subtotalCents * 0.1), freeShipping: false };
    case 'FLAT5':
      if (subtotalCents < FLAT5_MIN_SUBTOTAL_CENTS) {
        throw new DiscountNotApplicableError(normalized, FLAT5_MIN_SUBTOTAL_CENTS);
      }
      return { discountCents: 500, freeShipping: false };
    case 'FREESHIP':
      return { discountCents: 0, freeShipping: true };
    default:
      throw new InvalidDiscountError(code);
  }
}

export function calculateShipping(discountedSubtotalCents: number, freeShipping: boolean): number {
  if (discountedSubtotalCents <= 0) return 0;
  if (freeShipping || discountedSubtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) return 0;
  return FLAT_SHIPPING_CENTS;
}

export function calculateTax(taxableCents: number): number {
  return Math.round(taxableCents * TAX_RATE);
}

export function calculateTotals(items: readonly CartItem[], code?: string): OrderTotals {
  const subtotalCents = calculateSubtotal(items);
  const { discountCents, freeShipping } = applyDiscount(subtotalCents, code);
  const discounted = subtotalCents - discountCents;
  const shippingCents = calculateShipping(discounted, freeShipping);
  const taxCents = calculateTax(discounted);

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents: discounted + shippingCents + taxCents,
  };
}
