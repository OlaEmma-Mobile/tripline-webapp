import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import { logStep } from '../utils/logger';

const ACCESS_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m';
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d';
const RESET_EXPIRES_IN = process.env.RESET_TOKEN_EXPIRES_IN ?? '15m';
const VERIFY_EXPIRES_IN = process.env.VERIFY_TOKEN_EXPIRES_IN ?? '10m';

/**
 * Sign a short-lived access token.
 */
export function signAccessToken(payload: { sub: string; role: string; email?: string }): string {
  const options: SignOptions = { expiresIn: ACCESS_EXPIRES_IN as any };
  return jwt.sign({ ...payload, type: 'access' }, getJwtSecret(), options);
}

/**
 * Sign a long-lived refresh token.
 */
export function signRefreshToken(payload: { sub: string; role?: string }): string {
  const options: SignOptions = { expiresIn: REFRESH_EXPIRES_IN as any };
  return jwt.sign({ ...payload, type: 'refresh' }, getJwtSecret(), options);
}

/**
 * Sign a reset verification token after OTP verification.
 */
export function signResetVerifyToken(payload: { sub: string; email: string }): string {
  const options: SignOptions = { expiresIn: RESET_EXPIRES_IN as any };
  return jwt.sign({ ...payload, type: 'reset' }, getJwtSecret(), options);
}

/**
 * Sign a short-lived OTP verification token.
 */
export function signOtpVerifyToken(payload: { sub: string; email: string; purpose: string }): string {
  const options: SignOptions = { expiresIn: VERIFY_EXPIRES_IN as any };
  return jwt.sign({ ...payload, type: 'otp' }, getJwtSecret(), options);
}

/**
 * Verify a JWT and return payload.
 */
export function verifyToken(token: string): JwtPayload {
  logStep('Verifying token', { token });
  const secrete = getJwtSecret();
  logStep('JWT Secret', { secrete });
  const v = jwt.verify(token, secrete) as JwtPayload;
  logStep('Token Verified', { payload: v });
  return v;
}

/**
 * Verify access token and ensure correct type.
 */
export function verifyAccessToken(token: string): JwtPayload {
  const payload = verifyToken(token);
  logStep('Token Payload', { payload });
  if (payload.type !== 'access') {
    throw new Error('Invalid access token');
  }
  return payload;
}

function getJwtSecret(): Secret {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret as Secret;
}
