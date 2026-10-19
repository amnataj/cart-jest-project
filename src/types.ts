export interface Product {
  sku: string;
  name: string;
  priceCents: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OrderTotals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export interface PaymentResult {
  id: string;
  status: 'succeeded';
}

export interface Order {
  id: string;
  items: CartItem[];
  totals: OrderTotals;
  paymentId: string;
  createdAt: Date;
}
