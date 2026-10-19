export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status:number,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidQuantityError extends AppError {
  constructor(quantity: unknown) {
    super(`Invalid quantity: ${String(quantity)}`, 'INVALID_QUANTITY', 400);
  }
}

export class ProductNotFoundError extends AppError {
  constructor(sku: string) {
    super(`Product not found: ${sku}`, 'PRODUCT_NOT_FOUND', 404);
  }
}

export class CartNotFoundError extends AppError {
  constructor(id: string) {
    super(`Cart not found: ${id}`, 'CART_NOT_FOUND', 404);
  }
}

export class OutOfStockError extends AppError {
  constructor(sku: string) {
    super(`Out of stock: ${sku}`, 'OUT_OF_STOCK', 409);
  }
}

export class InvalidDiscountError extends AppError {
  constructor(code: string) {
    super(`Invalid discount code: ${code}`, 'INVALID_DISCOUNT', 400);
  }
}

export class DiscountNotApplicableError extends AppError {
  constructor(code: string, minSubtotalCents: number) {
    super(
      `Discount ${code} requires a minimum subtotal of ${minSubtotalCents} cents`,
      'DISCOUNT_NOT_APPLICABLE',
      400,
    );
  }
}

export class EmptyCartError extends AppError {
  constructor() {
    super('Cart is empty', 'EMPTY_CART', 400);
  }
}

export class PaymentDeclinedError extends AppError {
  constructor() {
    super('Payment was declined', 'PAYMENT_DECLINED', 402);
  }
}

/** A temporary gateway failure that is safe to retry. */
export class TransientPaymentError extends AppError {
  constructor() {
    super('Payment gateway temporarily unavailable', 'PAYMENT_UNAVAILABLE', 503);
  }
}
