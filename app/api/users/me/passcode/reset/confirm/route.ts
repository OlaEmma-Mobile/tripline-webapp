import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { authService } from '@/lib/features/auth/auth.service';
import { confirmRidePasscodeResetSchema } from '@/lib/features/users/users.schemas';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * @openapi
 * /api/users/me/passcode/reset/confirm:
 *   post:
 *     tags:
 *       - Users
 *     summary: Confirm a ride passcode reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RidePasscodeResetConfirmRequest'
 *     responses:
 *       '200':
 *         description: Ride passcode reset complete
 *       '400':
 *         description: Invalid reset payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = confirmRidePasscodeResetSchema.parse(await request.json());
    const data = await authService.resetRidePasscode(body);
    return jsonResponse(data, 'Ride passcode updated', 'You can now approve boarding with your new passcode');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, zodErrorToFieldErrors(error));
    }
    if (error instanceof AppError) {
      return errorResponse(error.message, 'Ride passcode reset failed', error.status);
    }
    return errorResponse('Unable to reset ride passcode', 'Unexpected server error', 500);
  }
}
