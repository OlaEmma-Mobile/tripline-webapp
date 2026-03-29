import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAccessAuth } from '@/lib/features/auth/request-auth';
import { usersService } from '@/lib/features/users/users.service';
import { setupRidePasscodeSchema } from '@/lib/features/users/users.schemas';
import { AppError } from '@/lib/utils/errors';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';
import { zodErrorToFieldErrors } from '@/lib/utils/validation';

/**
 * @openapi
 * /api/users/me/passcode/setup:
 *   post:
 *     tags:
 *       - Users
 *     summary: Set the rider ride passcode
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RidePasscodeSetupRequest'
 *     responses:
 *       '200':
 *         description: Ride passcode created
 *       '400':
 *         description: Invalid passcode payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       '403':
 *         description: Only riders can set a ride passcode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAccessAuth(request, { allowedRoles: ['rider'] });
    const body = setupRidePasscodeSchema.parse(await request.json());
    const data = await usersService.setupRidePasscode(auth.userId, body.passcode);
    return jsonResponse(data, 'Ride passcode set', 'Ride passcode created successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse('Invalid request payload', 'Please fix the highlighted fields', 400, zodErrorToFieldErrors(error));
    }
    if (error instanceof AppError) {
      const description = error.status === 403 ? 'Only riders can set ride passcode' : 'Unable to set ride passcode';
      return errorResponse(error.message, description, error.status);
    }
    return errorResponse('Unable to set ride passcode', 'Unexpected server error', 500);
  }
}
