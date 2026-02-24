import argon2 from 'argon2';

/**
 * Hash a plain-text password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 19456),
    timeCost: Number(process.env.ARGON2_TIME_COST ?? 2),
    parallelism: Number(process.env.ARGON2_PARALLELISM ?? 1),
  });
}

/**
 * Verify a password against an Argon2id hash.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
