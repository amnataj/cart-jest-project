import { OutOfStockError } from '../../src/errors';
import { InMemoryInventory } from '../../src/inventory';

describe('InMemoryInventory', () => {
  it('reports 0 for unknown SKUs', async () => {
    await expect(new InMemoryInventory().getStock('NOPE')).resolves.toBe(0);
  });

  it('reserves and releases stock', async () => {
    const inventory = new InMemoryInventory({ A: 5 });
    await inventory.reserve('A', 3);
    await expect(inventory.getStock('A')).resolves.toBe(2);
    await inventory.release('A', 3);
    await expect(inventory.getStock('A')).resolves.toBe(5);
  });

  it('refuses to reserve more than is available and leaves stock untouched', async () => {
    const inventory = new InMemoryInventory({ A: 2 });
    await expect(inventory.reserve('A', 3)).rejects.toBeInstanceOf(OutOfStockError);
    await expect(inventory.getStock('A')).resolves.toBe(2);
  });
});
