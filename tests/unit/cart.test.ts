import { Cart, MAX_QUANTITY } from '../../src/cart';
import { InvalidQuantityError, ProductNotFoundError } from '../../src/errors';
import { makeProduct } from '../helpers/factories';

describe('Cart', () => {
  let cart: Cart;
  const chair = makeProduct({ sku: 'CHAIR', name: 'Chair', priceCents: 14_900 });

  beforeEach(() => {
    cart = new Cart();
  });

  it('starts empty', () => {
    expect(cart.isEmpty()).toBe(true);
    expect(cart.getItems()).toEqual([]);
  });

  it('adds an item and merges quantities for the same SKU', () => {
    cart.addItem(chair, 2);
    cart.addItem(chair, 3);
    expect(cart.getItems()).toEqual([{ ...chair, quantity: 5 }]);
  });

  it.each([0, -1, 1.5, NaN, MAX_QUANTITY + 1])('rejects invalid quantity %p', (quantity) => {
    expect(() => cart.addItem(chair, quantity)).toThrow(InvalidQuantityError);
  });

  it('rejects a merge that would exceed the maximum quantity', () => {
    cart.addItem(chair, MAX_QUANTITY);
    expect(() => cart.addItem(chair, 1)).toThrow(InvalidQuantityError);
    expect(cart.getItems()[0]?.quantity).toBe(MAX_QUANTITY); // unchanged
  });

  it('updates a quantity', () => {
    cart.addItem(chair, 1);
    cart.updateQuantity('CHAIR', 4);
    expect(cart.getItems()[0]?.quantity).toBe(4);
  });

  it('throws when updating or removing an unknown SKU', () => {
    expect(() => cart.updateQuantity('NOPE', 1)).toThrow(ProductNotFoundError);
    expect(() => cart.removeItem('NOPE')).toThrow(ProductNotFoundError);
  });

  it('rejects an invalid quantity on update', () => {
    cart.addItem(chair, 1);
    expect(() => cart.updateQuantity('CHAIR', 0)).toThrow(InvalidQuantityError);
  });

  it('removes and clears items', () => {
    cart.addItem(chair, 1);
    cart.addItem(makeProduct({ sku: 'LAMP' }), 1);
    cart.removeItem('CHAIR');
    expect(cart.getItems().map((i) => i.sku)).toEqual(['LAMP']);
    cart.clear();
    expect(cart.isEmpty()).toBe(true);
  });

  it('returns defensive copies of its items', () => {
    cart.addItem(chair, 1);
    const [item] = cart.getItems();
    item!.quantity = 50;
    expect(cart.getItems()[0]?.quantity).toBe(1);
  });
});
