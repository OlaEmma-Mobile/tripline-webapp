import { NextRequest, NextResponse } from 'next/server';
import { initiatePaymentSchema } from '@/lib/features/payments/payments.schemas';
import { paymentsService } from '@/lib/features/payments/payments.service';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { AppError } from '@/lib/utils/errors';
import { ZodError } from 'zod';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/payments/initiate
 * Initialize a Paystack token purchase.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);

    const auth = requireAccessAuth(request, {
      allowedRoles: ['rider', 'driver'],
      forbiddenMessage: 'Only riders and drivers can purchase tokens',
    });
    const userId = auth.userId;
    const email = auth.email;

    if (!email) {
      logOutgoing(400, { error: 'Email missing in token' });
      return errorResponse('Invalid token', 'Email is required for payment', 400);
    }

    const body = initiatePaymentSchema.parse(rawBody);
    logStep('validated payment initiate payload');

    const data = await paymentsService.initiatePaystackPayment({
      amountNgn: body.amountNgn,
      userId,
      email,
    });

    logOutgoing(200, data);
    return jsonResponse(data, 'Payment initialized', 'Continue payment via Paystack');
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'Payment initialization failed', error.status);
    }
    logOutgoing(500, { error: 'Unable to initialize payment' });
    return errorResponse('Unable to initialize payment', 'Unexpected server error', 500);
  }
}
