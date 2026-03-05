import { NextRequest, NextResponse } from 'next/server';
import { verifyPaystackSignature } from '@/lib/security/paystack';
import { paymentsRepository } from '@/lib/features/payments/payments.repository';
import { walletService } from '@/lib/features/wallet/wallet.service';
import { realtimeService } from '@/lib/features/realtime/realtime.service';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/paystack/webhook
 * Handle Paystack payment events.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  logIncoming(request, rawBody ? JSON.parse(rawBody) : {});

  const signature = request.headers.get('x-paystack-signature');
  const isValid = verifyPaystackSignature(rawBody, signature);
  if (!isValid) {
    logOutgoing(401, { error: 'Invalid signature' });
    return errorResponse('Unauthorized', 'Invalid webhook signature', 401);
  }

  try {
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const event = payload.event as string;
    const data = payload.data || {};
    const reference = data.reference as string | undefined;

    if (!reference) {
      logOutgoing(400, { error: 'Missing reference' });
      return errorResponse('Invalid payload', 'Reference is required', 400);
    }

    logStep('loading purchase for webhook');
    const purchase = await paymentsRepository.findPurchaseByReference(reference);
    if (!purchase) {
      logOutgoing(404, { error: 'Purchase not found' });
      return errorResponse('Not found', 'Purchase not found', 404);
    }

    if (event === 'charge.success') {
      if (purchase.status === 'success') {
        logOutgoing(200, { ok: true, message: 'Already processed' });
        return jsonResponse({ ok: true }, 'Webhook processed', 'Already credited');
      }

      logStep('marking purchase success');
      await paymentsRepository.updatePurchaseStatus(purchase.id, 'success');

      logStep('crediting wallet');
      await walletService.creditPurchase({
        userId: purchase.user_id,
        purchaseId: purchase.id,
        tokens: purchase.tokens,
      });

      try {
        await realtimeService.notifyUserEvent({
          userId: purchase.user_id,
          type: 'token_purchase',
          title: 'Tokens purchased',
          message: `Your payment was successful. ${purchase.tokens} tokens were credited.`,
          reference: purchase.id,
          reason: 'TOKEN_PURCHASE_SUCCESS',
          metadata: {
            amountNgn: purchase.amount_ngn,
            tokens: purchase.tokens,
          },
        });
      } catch {
        logStep('token purchase success notification failed', {
          purchaseId: purchase.id,
          userId: purchase.user_id,
        });
      }

      logOutgoing(200, { ok: true });
      return jsonResponse({ ok: true }, 'Webhook processed', 'Wallet credited');
    }

    if (event === 'charge.failed' || event === 'charge.abandoned') {
      logStep('marking purchase failed');
      await paymentsRepository.updatePurchaseStatus(purchase.id, 'failed');
      try {
        await realtimeService.notifyUserEvent({
          userId: purchase.user_id,
          type: 'token_purchase',
          title: 'Payment failed',
          message: 'Your token purchase payment failed or was abandoned.',
          reference: purchase.id,
          reason: 'TOKEN_PURCHASE_FAILED',
          metadata: {
            amountNgn: purchase.amount_ngn,
            tokens: purchase.tokens,
          },
        });
      } catch {
        logStep('token purchase failure notification failed', {
          purchaseId: purchase.id,
          userId: purchase.user_id,
        });
      }
      logOutgoing(200, { ok: true });
      return jsonResponse({ ok: true }, 'Webhook processed', 'Payment failed');
    }

    logOutgoing(200, { ok: true, ignored: true });
    return jsonResponse({ ok: true }, 'Webhook processed', 'Event ignored');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    logOutgoing(500, { error: message });
    return errorResponse('Webhook failed', message, 500);
  }
}
