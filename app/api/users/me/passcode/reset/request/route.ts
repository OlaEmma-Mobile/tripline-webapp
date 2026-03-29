import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { authService } from '@/lib/features/auth/auth.service';
import { requestRidePasscodeResetSchema } from '@/lib/features/users/users.schemas';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * @openapi
 * /api/users/me/passcode/reset/request:
 *   post:
 *     tags:
 *       - Users
 *     summary: Request a ride passcode reset OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RidePasscodeResetRequest'
 *     responses:
 *       '200':
 *         description: Reset OTP sent
 *       '400':
 *         description: Invalid email payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = requestRidePasscodeResetSchema.parse(await request.json());
    const data = await authService.forgotRidePasscode(body.email);
    return jsonResponse(data, 'OTP sent', 'Check your email for ride passcode reset code');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, zodErrorToFieldErrors(error));
    }
    if (error instanceof AppError) {
      return errorResponse(error.message, 'Ride passcode reset failed', error.status);
    }
    return errorResponse('Unable to start ride passcode reset', 'Unexpected server error', 500);
  }
}
