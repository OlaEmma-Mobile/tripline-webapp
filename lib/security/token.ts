import crypto from 'crypto';

/**
 * Hash tokens for storage using SHA-256.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
