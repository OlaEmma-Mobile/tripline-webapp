import type { NextRequest } from 'next/server';
import type { JwtPayload } from 'jsonwebtoken';
import { verifyAccessToken } from '@/lib/security/jwt';
import { AppError } from '@/lib/utils/errors';

export interface AccessAuthContext {
  /** Authenticated user id from `sub` claim. */
  userId: string;
  /** Optional role claim. */
  role?: string;
  /** Optional email claim. */
  email?: string;
  /** Full verified JWT payload for advanced use-cases. */
  payload: JwtPayload;
}

interface RequireAccessOptions {
  /** Optional role allow-list. */
  allowedRoles?: string[];
  /** Custom forbidden message when role check fails. */
  forbiddenMessage?: string;
}

/**
 * Validates bearer access token from request headers and optionally enforces role access.
 * @param request Next.js request object.
 * @param options Optional role-based authorization settings.
 * @returns Auth context extracted from verified token.
 * @throws AppError 401 for missing/invalid token, 403 for role violations.
 */
/**
 * requireAccessAuth Pure helper that transforms data between transport, domain, and persistence shapes.
 */
export function requireAccessAuth(
  request: NextRequest,
  options: RequireAccessOptions = {}
): AccessAuthContext {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token || token === authHeader) {
    throw new AppError('Unauthorized', 401);
  }

  let payload: JwtPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  const role = payload.role as string | undefined;
  if (options.allowedRoles && (!role || !options.allowedRoles.includes(role))) {
    throw new AppError(options.forbiddenMessage ?? 'Forbidden', 403);
  }

  return {
    userId: payload.sub as string,
    role,
    email: payload.email as string | undefined,
    payload,
  };
}
