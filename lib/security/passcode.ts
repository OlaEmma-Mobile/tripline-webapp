import { hashPassword, verifyPassword } from './password';

const PASSCODE_REGEX = /^\d{4}$/;

export function assertValidRidePasscode(passcode: string): void {
  if (!PASSCODE_REGEX.test(passcode)) {
    throw new Error('Ride passcode must be exactly 4 digits');
  }
}

export async function hashRidePasscode(passcode: string): Promise<string> {
  assertValidRidePasscode(passcode);
  return hashPassword(passcode);
}

export async function verifyRidePasscode(hash: string, passcode: string): Promise<boolean> {
  if (!PASSCODE_REGEX.test(passcode)) return false;
  return verifyPassword(hash, passcode);
}
