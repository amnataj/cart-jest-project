import request from 'supertest';
import { createApp } from '../../src/app';
import { InMemoryInventory } from '../../src/inventory';
import { PaymentDeclinedError } from '../../src/errors';
import { mockPayment } from '../helpers/factories';

describe('Cart & Checkout API', () => {
  let inventory: InMemoryInventory;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    inventory = new InMemoryInventory({ 'SOFA-001': 2, 'CHAIR-002': 10, 'LAMP-003': 25, 'RUG-004': 50 });
    app = createApp({ inventory });
  });

  const newCart = async (): Promise<string> => {
    const res = await request(app).post('/carts').expect(201);
    return res.body.id as string;
  };

  const addItem = (cartId: string, sku: string, quantity: number) =>
    request(app).post(`/carts/${cartId}/items`).send({ sku, quantity });

  it('lists the product catalog', async () => {
    const res = await request(app).get('/products').expect(200);
    expect(res.body.products).toHaveLength(4);
  });

  describe('building a cart', () => {
    it('creates a cart and adds items', async () => {
      const id = await newCart();
      const res = await addItem(id, 'CHAIR-002', 2);
      expect(res.status).toBe(201);
      expect(res.body.items).toEqual([expect.objectContaining({ sku: 'CHAIR-002', quantity: 2 })]);
    });

    it('returns totals, optionally with a discount code', async () => {
      const id = await newCart();
      await addItem(id, 'CHAIR-002', 2); // 29 800

      const plain = await request(app).get(`/carts/${id}`).expect(200);
      expect(plain.body.totals.subtotalCents).toBe(29_800);

      const discounted = await request(app).get(`/carts/${id}?code=SAVE10`).expect(200);
      expect(discounted.body.totals.discountCents).toBe(2980);
    });

    it.each([
      ['unknown cart', '/carts/does-not-exist', 404, 'CART_NOT_FOUND'],
    ])('GET %s => %i', async (_name, path, status, code) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(status);
      expect(res.body.error.code).toBe(code);
    });

    it('returns 404 for an unknown SKU', async () => {
      const res = await addItem(await newCart(), 'NOPE', 1);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it.each([0, -3, 1.5, 100])('returns 400 for quantity %p', async (quantity) => {
      const res = await addItem(await newCart(), 'RUG-004', quantity);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_QUANTITY');
    });

    it('returns 400 for a missing quantity', async () => {
      const res = await request(app)
        .post(`/carts/${await newCart()}/items`)
        .send({ sku: 'RUG-004' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for a bad discount code', async () => {
      const id = await newCart();
      await addItem(id, 'RUG-004', 1);
      const res = await request(app).get(`/carts/${id}?code=BOGUS`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DISCOUNT');
    });

    it('returns 400 for malformed JSON', async () => {
      const res = await request(app)
        .post('/carts/x/items')
        .set('Content-Type', 'application/json')
        .send('{"sku": ');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_JSON');
    });
  });

  describe('checkout', () => {
    it('completes an order, decrements stock and empties the cart', async () => {
      const id = await newCart();
      await addItem(id, 'CHAIR-002', 2);

      const res = await request(app).post(`/carts/${id}/checkout`).send({ paymentToken: 'tok_ok' });

      expect(res.status).toBe(201);
      expect(res.body.order).toBeValidOrder();
      await expect(inventory.getStock('CHAIR-002')).resolves.toBe(8);

      const cart = await request(app).get(`/carts/${id}`).expect(200);
      expect(cart.body.items).toEqual([]);
    });

    it('returns 402 and restores stock when payment is declined', async () => {
      const id = await newCart();
      await addItem(id, 'CHAIR-002', 2);

      const res = await request(app).post(`/carts/${id}/checkout`).send({ paymentToken: 'tok_declined' });

      expect(res.status).toBe(402);
      expect(res.body.error.code).toBe('PAYMENT_DECLINED');
      await expect(inventory.getStock('CHAIR-002')).resolves.toBe(10);
    });

    it('returns 409 when an item is out of stock', async () => {
      const id = await newCart();
      await addItem(id, 'SOFA-001', 3); // only 2 in stock

      const res = await request(app).post(`/carts/${id}/checkout`).send({ paymentToken: 'tok_ok' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('OUT_OF_STOCK');
    });

    it('returns 400 for an empty cart', async () => {
      const res = await request(app)
        .post(`/carts/${await newCart()}/checkout`)
        .send({ paymentToken: 'tok_ok' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EMPTY_CART');
    });

    it('returns 404 when checking out an unknown cart', async () => {
      await request(app).post('/carts/nope/checkout').send({ paymentToken: 'tok' }).expect(404);
    });

    it('maps unexpected errors to a safe 500 response', async () => {
      const payment = mockPayment();
      payment.charge.mockRejectedValue(new Error('db exploded: password=secret'));
      const brokenApp = createApp({ inventory, payment });

      const created = await request(brokenApp).post('/carts');
      const id = created.body.id as string;
      await request(brokenApp).post(`/carts/${id}/items`).send({ sku: 'RUG-004', quantity: 1 });

      const res = await request(brokenApp).post(`/carts/${id}/checkout`).send({ paymentToken: 'tok' });

      expect(res.status).toBe(500);
      expect(res.body.error.message).toBe('Unexpected error'); // internals are not leaked
      expect(JSON.stringify(res.body)).not.toContain('secret');
    });

    it('surfaces a gateway decline injected through a mock', async () => {
      const payment = mockPayment();
      payment.charge.mockRejectedValue(new PaymentDeclinedError());
      const mockedApp = createApp({ inventory, payment });

      const id = (await request(mockedApp).post('/carts')).body.id as string;
      await request(mockedApp).post(`/carts/${id}/items`).send({ sku: 'RUG-004', quantity: 1 });
      await request(mockedApp).post(`/carts/${id}/checkout`).send({ paymentToken: 'x' }).expect(402);
    });
  });
});
