import crypto from 'crypto';

const OTP_LENGTH = 4;

/**
 * Generate a numeric OTP of fixed length.
 */
export function generateOtp(): string {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return String(crypto.randomInt(min, max + 1));
}

/**
 * Hash an OTP using HMAC-SHA256.
 */
export function hashOtp(otp: string): string {
  const secret = process.env.OTP_SECRET;
  if (!secret) {
    throw new Error('OTP_SECRET is not set');
  }
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
}

/**
 * Compare raw OTP to hashed OTP.
 */
export function verifyOtpHash(rawOtp: string, hashedOtp: string): boolean {
  const computed = hashOtp(rawOtp);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hashedOtp));
}
