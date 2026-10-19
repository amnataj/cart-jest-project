import { randomUUID } from 'crypto';
import type { Cart } from './cart';
import { EmptyCartError, TransientPaymentError } from './errors';
import type { InventoryService } from './inventory';
import type { PaymentGateway } from './payment';
import { calculateTotals } from './pricing';
import { RetryOptions, withRetry } from './retry';
import type { CartItem, Order } from './types';

export class CheckoutService {
  constructor(
    private readonly inventory: InventoryService,
    private readonly payment: PaymentGateway,
    private readonly retry: Pick<RetryOptions, 'retries' | 'delayMs'> = { retries: 2, delayMs: 200 },
  ) {}

  async checkout(cart: Cart, paymentToken: string, discountCode?: string): Promise<Order> {
    if (cart.isEmpty()) throw new EmptyCartError();

    const items = cart.getItems();
    // Validate pricing/discount first so we never reserve stock for a doomed order.
    const totals = calculateTotals(items, discountCode);

    const reserved: CartItem[] = [];
    try {
      for (const item of items) {
        await this.inventory.reserve(item.sku, item.quantity);
        reserved.push(item);
      }

      const payment = await withRetry(() => this.payment.charge(totals.totalCents, paymentToken), {
        ...this.retry,
        shouldRetry: (error) => error instanceof TransientPaymentError,
      });

      cart.clear();
      return { id: randomUUID(), items, totals, paymentId: payment.id, createdAt: new Date() };
    } catch (error) {
      // Compensate: put back everything we reserved.
      await Promise.all(reserved.map((i) => this.inventory.release(i.sku, i.quantity)));
      throw error;
    }
  }
}
