import { randomUUID } from 'crypto';
import express, { ErrorRequestHandler } from 'express';
import { Cart } from './cart';
import { CATALOG, DEFAULT_STOCK, findProduct } from './catalog';
import { CheckoutService } from './checkout';
import { AppError, CartNotFoundError, ProductNotFoundError } from './errors';
import { InMemoryInventory, InventoryService } from './inventory';
import { PaymentGateway, SimulatedPaymentGateway } from './payment';
import { calculateTotals } from './pricing';

export interface AppDeps {
  inventory?: InventoryService;
  payment?: PaymentGateway;
}

export function createApp(deps: AppDeps = {}) {
  const inventory = deps.inventory ?? new InMemoryInventory(DEFAULT_STOCK);
  const payment = deps.payment ?? new SimulatedPaymentGateway();
  const checkout = new CheckoutService(inventory, payment, { retries: 2, delayMs: 10 });
  const carts = new Map<string, Cart>();

  const getCart = (id: string): Cart => {
    const cart = carts.get(id);
    if (!cart) throw new CartNotFoundError(id);
    return cart;
  };

  const app = express();
  app.use(express.json());

  app.get('/products', (_req, res) => {
    res.json({ products: CATALOG });
  });

  app.post('/carts', (_req, res) => {
    const id = randomUUID();
    carts.set(id, new Cart());
    res.status(201).json({ id });
  });

  app.post('/carts/:id/items', (req, res) => {
    const cart = getCart(req.params.id);
    const { sku, quantity } = req.body ?? {};
    const product = findProduct(sku);
    if (!product) throw new ProductNotFoundError(String(sku));
    cart.addItem(product, quantity);
    res.status(201).json({ items: cart.getItems() });
  });

  app.get('/carts/:id', (req, res) => {
    const cart = getCart(req.params.id);
    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    const items = cart.getItems();
    res.json({ items, totals: calculateTotals(items, code) });
  });

  app.post('/carts/:id/checkout', async (req, res, next) => {
    try {
      const cart = getCart(req.params.id);
      const { paymentToken, discountCode } = req.body ?? {};
      const order = await checkout.checkout(cart, String(paymentToken ?? ''), discountCode);
      res.status(201).json({ order });
    } catch (error) {
      next(error);
    }
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message } });
    } else if (err instanceof SyntaxError) {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Malformed JSON body' } });
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } });
    }
  };
  app.use(errorHandler);

  return app;
}
