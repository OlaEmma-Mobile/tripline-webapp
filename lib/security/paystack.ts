import crypto from 'crypto';

/**
 * Verify Paystack webhook signature using HMAC SHA512.
 */
export function verifyPaystackSignature(payload: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error('PAYSTACK_SECRET_KEY is not set');
  }
  if (!signature) return false;
  const computed = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  if (computed.length !== signature.length) {
    return false;
  }
  const computedBuf = Buffer.from(computed, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');
  if (computedBuf.length !== signatureBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(computedBuf, signatureBuf);
}
