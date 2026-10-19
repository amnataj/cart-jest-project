import { InvalidQuantityError, ProductNotFoundError } from './errors';
import type { CartItem, Product } from './types';

export const MAX_QUANTITY = 99;

function assertValidQuantity(quantity: unknown): asserts quantity is number {
  if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > MAX_QUANTITY) {
    throw new InvalidQuantityError(quantity);
  }
}

export class Cart {
  private readonly items = new Map<string, CartItem>();

  addItem(product: Product, quantity: number): void {
    assertValidQuantity(quantity);
    const existing = this.items.get(product.sku);
    const newQuantity = (existing?.quantity ?? 0) + quantity;
    assertValidQuantity(newQuantity);
    this.items.set(product.sku, { ...product, quantity: newQuantity });
  }

  updateQuantity(sku: string, quantity: number): void {
    const existing = this.items.get(sku);
    if (!existing) throw new ProductNotFoundError(sku);
    assertValidQuantity(quantity);
    this.items.set(sku, { ...existing, quantity });
  }

  removeItem(sku: string): void {
    if (!this.items.delete(sku)) throw new ProductNotFoundError(sku);
  }

  clear(): void {
    this.items.clear();
  }

  isEmpty(): boolean {
    return this.items.size === 0;
  }

  /** Returns copies so callers cannot mutate cart state. */
  getItems(): CartItem[] {
    return [...this.items.values()].map((item) => ({ ...item }));
  }
}
