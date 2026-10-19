import type { Product } from './types';

export const CATALOG: readonly Product[] = [
  { sku: 'SOFA-001', name: 'Oslo Sofa', priceCents: 89_900 },
  { sku: 'CHAIR-002', name: 'Lund Chair', priceCents: 14_900 },
  { sku: 'LAMP-003', name: 'Arc Floor Lamp', priceCents: 5_900 },
  { sku: 'RUG-004', name: 'Woven Rug', priceCents: 2_900 },
];

export const DEFAULT_STOCK: Record<string, number> = {
  'SOFA-001': 2,
  'CHAIR-002': 10,
  'LAMP-003': 25,
  'RUG-004': 50,
};

export const findProduct = (sku: unknown): Product | undefined => CATALOG.find((p) => p.sku === sku);
