import { randomUUID } from 'crypto';
import { PaymentDeclinedError } from './errors';
import type { PaymentResult } from './types';

export interface PaymentGateway {
  charge(amountCents: number, token: string): Promise<PaymentResult>;
}

/** Demo gateway: the token "tok_declined" is always declined. */
export class SimulatedPaymentGateway implements PaymentGateway {
  async charge(_amountCents: number, token: string): Promise<PaymentResult> {
    if (token === 'tok_declined') throw new PaymentDeclinedError();
    return { id: `pay_${randomUUID()}`, status: 'succeeded' };
  }
}
