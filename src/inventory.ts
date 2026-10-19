import { OutOfStockError } from './errors';

export interface InventoryService {
  getStock(sku: string): Promise<number>;
  reserve(sku: string, quantity: number): Promise<void>;
  release(sku: string, quantity: number): Promise<void>;
}

export class InMemoryInventory implements InventoryService {
  private readonly stock: Map<string, number>;

  constructor(initial: Record<string, number> = {}) {
    this.stock = new Map(Object.entries(initial));
  }

  async getStock(sku: string): Promise<number> {
    return this.stock.get(sku) ?? 0;
  }

  async reserve(sku: string, quantity: number): Promise<void> {
    const available = await this.getStock(sku);
    if (available < quantity) throw new OutOfStockError(sku);
    this.stock.set(sku, available - quantity);
  }

  async release(sku: string, quantity: number): Promise<void> {
    this.stock.set(sku, (await this.getStock(sku)) + quantity);
  }
}
