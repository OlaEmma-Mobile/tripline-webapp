import { NextRequest, NextResponse } from 'next/server';
import { driverKycSchema } from '@/lib/features/driver/kyc.schemas';
import { driverKycService } from '@/lib/features/driver/kyc.service';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { AppError } from '@/lib/utils/errors';
import { ZodError } from 'zod';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';
import { logIncoming, logOutgoing, logStep } from '@/lib/utils/logger';

/**
 * POST /api/driver/kyc
 * Submit encrypted KYC details for a driver.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    logIncoming(request, rawBody);
    const body = driverKycSchema.parse(rawBody);
    logStep('validated driver kyc payload');
    const data = await driverKycService.submitDriverKyc(body);
    const payload = { id: data.id };
    logOutgoing(201, payload);
    return jsonResponse(payload, 'KYC submitted', 'Verification pending', 201);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = zodErrorToFieldErrors(error);
      logOutgoing(400, { error: 'Invalid request payload', errors });
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, errors);
    }
    if (error instanceof AppError) {
      logOutgoing(error.status, { error: error.message });
      return errorResponse(error.message, 'KYC submission failed', error.status);
    }
    logOutgoing(500, { error: 'Unable to submit KYC' });
    return errorResponse('Unable to submit KYC', 'Unexpected server error', 500);
  }
}
