import { AppError } from '@/lib/utils/errors';
import { paymentsRepository, PaymentsRepository } from './payments.repository';
import type { InitiatePaymentResult, InitiatePurchasePayload, PaystackInitResponse } from './payments.types';
import { logStep } from '@/lib/utils/logger';

const TOKEN_RATE = 10; // ₦10 per token

/**
 * Payment service for token purchases.
 */
export class PaymentsService {
  constructor(private readonly repo: PaymentsRepository) {}

  /**
   * Initialize Paystack payment and create a pending purchase.
   */
  async initiatePaystackPayment({
    amountNgn,
    userId,
    email,
  }: InitiatePurchasePayload): Promise<InitiatePaymentResult> {
    if (!Number.isInteger(amountNgn) || amountNgn < 100 || amountNgn % TOKEN_RATE !== 0) {
      throw new AppError('Invalid amount', 400);
    }

    const tokens = amountNgn / TOKEN_RATE;
    const reference = generateReference();

    logStep('creating pending token purchase');
    const purchase = await this.repo.createPurchase({
      userId,
      reference,
      amountNgn,
      tokens,
    });

    logStep('initializing paystack transaction');
    const init = await initializePaystack({
      email,
      amountKobo: amountNgn * 100,
      reference,
    });

    return {
      purchaseId: purchase.id,
      reference: init.reference,
      amountNgn,
      tokens,
      authorizationUrl: init.authorization_url,
    };
  }
}

export const paymentsService = new PaymentsService(paymentsRepository);

/**
 * Calls Paystack initialize endpoint for checkout URL creation.
 * @param email Rider email for payment initialization.
 * @param amountKobo Amount to charge in kobo.
 * @param reference Backend-generated unique transaction reference.
 * @returns Paystack response with reference and authorization URL.
 */
async function initializePaystack({
  email,
  amountKobo,
  reference,
}: {
  email: string;
  amountKobo: number;
  reference: string;
}): Promise<PaystackInitResponse> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new AppError('PAYSTACK_SECRET_KEY is not set', 500);
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amountKobo,
      reference,
      currency: 'NGN',
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.status) {
    throw new AppError(payload?.message || 'Unable to initialize payment', 502);
  }

  return {
    reference: payload.data.reference,
    authorization_url: payload.data.authorization_url,
  };
}

/**
 * Generates a unique transaction reference for a token purchase attempt.
 * @returns Unique reference string.
 */
function generateReference(): string {
  return `tpl_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}
