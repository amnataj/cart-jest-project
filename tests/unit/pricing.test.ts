import { DiscountNotApplicableError, InvalidDiscountError } from '../../src/errors';
import {
  applyDiscount,
  calculateShipping,
  calculateSubtotal,
  calculateTax,
  calculateTotals,
} from '../../src/pricing';
import { makeItem } from '../helpers/factories';

describe('calculateSubtotal', () => {
  it('returns 0 for an empty cart', () => {
    expect(calculateSubtotal([])).toBe(0);
  });

  it('multiplies price by quantity and sums all lines', () => {
    const items = [makeItem({ priceCents: 1000, quantity: 2 }), makeItem({ sku: 'B', priceCents: 550 })];
    expect(calculateSubtotal(items)).toBe(2550);
  });
});

describe('applyDiscount', () => {
  it.each([
    ['SAVE10', 2550, 255],
    ['save10', 2550, 255], // case-insensitive
    ['  SAVE10  ', 1999, 200], // trimmed, rounded half up
    ['FLAT5', 3000, 500],
    ['FLAT5', 50_000, 500],
  ])('code %p on %p cents gives %p cents off', (code, subtotal, expected) => {
    expect(applyDiscount(subtotal, code).discountCents).toBe(expected);
  });

  it('gives no discount when no code is supplied', () => {
    expect(applyDiscount(5000)).toEqual({ discountCents: 0, freeShipping: false });
  });

  it('FREESHIP removes shipping but not price', () => {
    expect(applyDiscount(5000, 'FREESHIP')).toEqual({ discountCents: 0, freeShipping: true });
  });

  it('rejects FLAT5 below the minimum subtotal', () => {
    expect(() => applyDiscount(2999, 'FLAT5')).toThrow(DiscountNotApplicableError);
  });

  it('rejects unknown codes', () => {
    expect(() => applyDiscount(5000, 'BOGUS')).toThrow(InvalidDiscountError);
  });
});

describe('calculateShipping', () => {
  it.each([
    [0, false, 0],
    [5000, false, 799],
    [9999, false, 799],
    [10_000, false, 0], // threshold is inclusive
    [5000, true, 0],
  ])('subtotal %p, freeShipping %p => %p', (subtotal, free, expected) => {
    expect(calculateShipping(subtotal, free)).toBe(expected);
  });
});

describe('calculateTax', () => {
  it.each([
    [0, 0],
    [1, 0],
    [1000, 80],
    [1234, 99], // 98.72 rounds up
  ])('tax on %p cents is %p', (taxable, expected) => {
    expect(calculateTax(taxable)).toBe(expected);
  });
});

describe('calculateTotals', () => {
  it('combines discount, shipping and tax in the right order', () => {
    const items = [makeItem({ priceCents: 4000, quantity: 2 })];
    expect(calculateTotals(items, 'SAVE10')).toEqual({
      subtotalCents: 8000,
      discountCents: 800,
      shippingCents: 799,
      taxCents: 576, // tax is charged on the discounted subtotal only
      totalCents: 8575,
    });
  });

  it('charges nothing for an empty cart', () => {
    expect(calculateTotals([]).totalCents).toBe(0);
  });

  it('propagates discount errors', () => {
    expect(() => calculateTotals([makeItem()], 'NOPE')).toThrow(InvalidDiscountError);
  });
});
