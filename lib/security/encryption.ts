import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive values using AES-256-GCM.
 * Returns base64 string: iv:tag:ciphertext
 */
export function encryptValue(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

/**
 * Decrypt AES-256-GCM payloads produced by encryptValue.
 */
export function decryptValue(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted payload format');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

function getKey(): Buffer {
  const keyValue = process.env.ENCRYPTION_KEY;
  if (!keyValue) {
    throw new Error('ENCRYPTION_KEY is not set');
  }
  const decoded = Buffer.from(keyValue, 'base64');
  if (decoded.length === 32) {
    return decoded;
  }
  // Fallback: derive a 32-byte key from the raw string for non-base64 envs.
  return crypto.createHash('sha256').update(keyValue).digest();
}
