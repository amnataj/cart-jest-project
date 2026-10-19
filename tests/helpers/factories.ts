import type { InventoryService } from '../../src/inventory';
import type { PaymentGateway } from '../../src/payment';
import type { CartItem, Product } from '../../src/types';

export const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  sku: 'SKU-1',
  name: 'Test Item',
  priceCents: 1000,
  ...overrides,
});

export const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  ...makeProduct(),
  quantity: 1,
  ...overrides,
});

export const mockInventory = (): jest.Mocked<InventoryService> => ({
  getStock: jest.fn().mockResolvedValue(100),
  reserve: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
});

export const mockPayment = (): jest.Mocked<PaymentGateway> => ({
  charge: jest.fn().mockResolvedValue({ id: 'pay_123', status: 'succeeded' }),
});
