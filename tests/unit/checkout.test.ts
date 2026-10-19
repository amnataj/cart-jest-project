import { Cart } from '../../src/cart';
import { CheckoutService } from '../../src/checkout';
import {
  EmptyCartError,
  InvalidDiscountError,
  OutOfStockError,
  PaymentDeclinedError,
  TransientPaymentError,
} from '../../src/errors';
import { makeProduct, mockInventory, mockPayment } from '../helpers/factories';

describe('CheckoutService', () => {
  const chair = makeProduct({ sku: 'CHAIR', name: 'Chair', priceCents: 4000 });
  const lamp = makeProduct({ sku: 'LAMP', name: 'Lamp', priceCents: 1500 });

  let inventory: ReturnType<typeof mockInventory>;
  let payment: ReturnType<typeof mockPayment>;
  let cart: Cart;
  let service: CheckoutService;

  beforeEach(() => {
    inventory = mockInventory();
    payment = mockPayment();
    cart = new Cart();
    cart.addItem(chair, 2);
    cart.addItem(lamp, 1);
    service = new CheckoutService(inventory, payment, { retries: 2, delayMs: 10 });
  });

    it('uses default retry options when none are given', async () => {
    const defaultService = new CheckoutService(inventory, payment);
    await expect(defaultService.checkout(cart, 'tok_ok')).resolves.toBeValidOrder();
  });

  describe('happy path', () => {
    it('reserves stock, charges the exact total and returns a valid order', async () => {
      const order = await service.checkout(cart, 'tok_ok');

      expect(inventory.reserve).toHaveBeenNthCalledWith(1, 'CHAIR', 2);
      expect(inventory.reserve).toHaveBeenNthCalledWith(2, 'LAMP', 1);
      // subtotal 9500 + shipping 799 + tax 760 = 11059
      expect(payment.charge).toHaveBeenCalledWith(11_059, 'tok_ok');
      expect(order).toBeValidOrder();
      expect(order.paymentId).toBe('pay_123');
    });

    it('empties the cart after a successful order', async () => {
      await service.checkout(cart, 'tok_ok');
      expect(cart.isEmpty()).toBe(true);
    });

    it('applies a discount code to the charged amount', async () => {
      await service.checkout(cart, 'tok_ok', 'FREESHIP');
      expect(payment.charge).toHaveBeenCalledWith(10_260, 'tok_ok'); // no shipping
    });
  });

  describe('validation failures', () => {
    it('rejects an empty cart without touching inventory or payment', async () => {
      await expect(service.checkout(new Cart(), 'tok')).rejects.toBeInstanceOf(EmptyCartError);
      expect(inventory.reserve).not.toHaveBeenCalled();
      expect(payment.charge).not.toHaveBeenCalled();
    });

    it('rejects a bad discount code before reserving any stock', async () => {
      await expect(service.checkout(cart, 'tok', 'BOGUS')).rejects.toBeInstanceOf(InvalidDiscountError);
      expect(inventory.reserve).not.toHaveBeenCalled();
    });
  });

  describe('compensation on failure', () => {
    it('releases already-reserved items when a later item is out of stock', async () => {
      inventory.reserve.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new OutOfStockError('LAMP'));

      await expect(service.checkout(cart, 'tok')).rejects.toBeInstanceOf(OutOfStockError);

      expect(inventory.release).toHaveBeenCalledTimes(1);
      expect(inventory.release).toHaveBeenCalledWith('CHAIR', 2);
      expect(payment.charge).not.toHaveBeenCalled();
    });

    it('releases all stock and keeps the cart when payment is declined', async () => {
      payment.charge.mockRejectedValue(new PaymentDeclinedError());

      await expect(service.checkout(cart, 'tok')).rejects.toBeInstanceOf(PaymentDeclinedError);

      expect(inventory.release).toHaveBeenCalledWith('CHAIR', 2);
      expect(inventory.release).toHaveBeenCalledWith('LAMP', 1);
      expect(cart.isEmpty()).toBe(false);
      expect(payment.charge).toHaveBeenCalledTimes(1); // declines are not retried
    });
  });

  describe('transient payment errors (fake timers)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('retries a transient failure and then succeeds', async () => {
      payment.charge
        .mockRejectedValueOnce(new TransientPaymentError())
        .mockResolvedValueOnce({ id: 'pay_retry', status: 'succeeded' });

      const promise = service.checkout(cart, 'tok');
      await jest.advanceTimersByTimeAsync(10);

      await expect(promise).resolves.toMatchObject({ paymentId: 'pay_retry' });
      expect(payment.charge).toHaveBeenCalledTimes(2);
      expect(inventory.release).not.toHaveBeenCalled();
    });

    it('releases stock if the gateway never recovers', async () => {
      payment.charge.mockRejectedValue(new TransientPaymentError());

      const assertion = expect(service.checkout(cart, 'tok')).rejects.toBeInstanceOf(TransientPaymentError);
      await jest.advanceTimersByTimeAsync(1000);
      await assertion;

      expect(payment.charge).toHaveBeenCalledTimes(3);
      expect(inventory.release).toHaveBeenCalledTimes(2);
    });
  });
});
