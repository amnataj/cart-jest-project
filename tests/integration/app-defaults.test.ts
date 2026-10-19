import request from 'supertest';
import { createApp } from '../../src/app';

it('works with the default inventory and payment gateway', async () => {
  const app = createApp();
  const { body } = await request(app).post('/carts').expect(201);
  await request(app).post(`/carts/${body.id}/items`).send({ sku: 'RUG-004', quantity: 1 }).expect(201);
  await request(app).post(`/carts/${body.id}/checkout`).send({ paymentToken: 'tok_ok' }).expect(201);
});
