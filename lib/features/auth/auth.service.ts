import type { OtpPurpose, UserRole } from './auth.types';
import { AppError } from '@/lib/utils/errors';
import { buildOtpEmail } from '@/lib/mail/templates';
import { sendMail } from '@/lib/mail/mailer';
import { hashPassword, verifyPassword } from '@/lib/security/password';
import { generateOtp, hashOtp, verifyOtpHash } from '@/lib/security/otp';
import {
  signAccessToken,
  signOtpVerifyToken,
  signRefreshToken,
  signResetVerifyToken,
  verifyAccessToken,
  verifyToken,
} from '@/lib/security/jwt';
import { hashToken } from '@/lib/security/token';
import { authRepository, AuthRepository } from './auth.repository';
import { walletRepository } from '@/lib/features/wallet/wallet.repository';
import { logStep } from '@/lib/utils/logger';

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const ADMIN_ROLES: UserRole[] = ['admin', 'sub_admin'];

/**
 * Auth service for registration, OTP verification, login, and reset flows.
 */
export class AuthService {
  constructor(private readonly repo: AuthRepository) { }

  /** Register a rider or driver and send verification OTP. */
  async registerUser({
    firstName,
    lastName,
    email,
    phone,
    password,
    role,
  }: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    role: 'rider' | 'driver';
  }): Promise<{ user: { id: string }; verifyToken: string }> {
    logStep('checking existing user');
    const existing = await this.repo.findUserByEmail(email);
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    logStep('hashing password');
    const passwordHash = await hashPassword(password);
    logStep('creating user record');
    const user = await this.repo.createUser({
      firstName,
      lastName,
      email,
      phone,
      role: role as UserRole, 
      passwordHash,
    });

    logStep('issuing verification otp');
    const { verifyToken } = await this.issueOtp({ userId: user.id, email, firstName, purpose: 'verify_email' });

    logStep('creating empty wallet');
    await walletRepository.upsertWallet(user.id, 0);

    return { user, verifyToken };
  }

  /** Verify OTP and mark email as verified. */
  async verifyOtp({
    verifyToken,
    otp,
  }: {
    verifyToken: string;
    otp: string;
  }): Promise<{ success: boolean; purpose: OtpPurpose; verifyToken?: string }> {
    const tokenPayload = verifyOtpToken(verifyToken);
    const { sub: userId, email, purpose } = tokenPayload;

    logStep('loading user for otp verification');
    const user = await this.repo.findUserByEmail(email);
    if (!user) {
      throw new AppError('Account not found', 404);
    }
    if (user.id !== userId) {
      throw new AppError('Invalid verification token', 401);
    }

    logStep('fetching latest otp');
    const latestOtp = await this.repo.findLatestOtp(user.id, purpose as OtpPurpose);
    if (!latestOtp) {
      throw new AppError('OTP not found', 404);
    }

    if (latestOtp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError('OTP attempts exceeded', 429);
    }

    if (new Date(latestOtp.expires_at) < new Date()) {
      throw new AppError('OTP has expired', 410);
    }

    const valid = verifyOtpHash(otp, latestOtp.code_hash);
    if (!valid) {
      await this.repo.incrementOtpAttempts(latestOtp.id);
      throw new AppError('Invalid OTP', 401);
    }

    await this.repo.deleteOtp(latestOtp.id);

    if (purpose === 'verify_email') {
      logStep('marking email verified');
      await this.repo.markEmailVerified(user.id);
      return { success: true, purpose };
    }

    logStep('issuing reset verify token');
    const resetVerifyToken = signResetVerifyToken({ sub: user.id, email: user.email });
    return { success: true, verifyToken: resetVerifyToken, purpose };
  }

  /** Validate login credentials and return tokens + account flags. */
  async loginUser({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    email_verified: boolean;
    account_status: string;
    driver_kyc_status: string | null;
  }> {
    const user = await this.repo.findUserByEmailWithKyc(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const ok = await verifyPassword(user.password_hash, password);
    if (!ok) {
      throw new AppError('Invalid credentials', 401);
    }

    logStep('issuing access token');
    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role });
    const refreshHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.repo.createRefreshToken({ userId: user.id, tokenHash: refreshHash, expiresAt: refreshExpiresAt });

    return {
      accessToken,
      refreshToken,
      email_verified: Boolean(user.email_verified_at),
      account_status: user.status,
      driver_kyc_status: user.role === 'driver' ? user.kyc?.status ?? 'pending' : null,
    };
  }

  /**
   * Validate admin/sub-admin login credentials and return auth tokens.
   */
  async loginAdmin({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    role: 'admin' | 'sub_admin';
    account_status: string;
  }> {
    const result = await this.loginUser({ email, password });
    const payload = verifyAccessToken(result.accessToken) as { role?: string };
    if (!payload.role || !ADMIN_ROLES.includes(payload.role as UserRole)) {
      throw new AppError('Admin access required', 403);
    }

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      role: payload.role as 'admin' | 'sub_admin',
      account_status: result.account_status,
    };
  }

  /** Refresh access and refresh tokens using a valid refresh token. */
  async refreshSession(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    logStep('verifying refresh token');
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);
    const stored = await this.repo.findRefreshTokenByHash(tokenHash);
    if (!stored || stored.revoked_at || new Date(stored.expires_at) < new Date()) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Rotate refresh token
    await this.repo.revokeRefreshToken(stored.id);
    const user = await this.repo.findUserById(payload.sub);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    const newAccessToken = signAccessToken({
      sub: payload.sub,
      role: payload.role ?? 'rider',
      email: user.email,
    });
    const newRefreshToken = signRefreshToken({ sub: payload.sub, role: payload.role });
    const refreshHash = hashToken(newRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.repo.createRefreshToken({ userId: payload.sub, tokenHash: refreshHash, expiresAt: refreshExpiresAt });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Refresh admin/sub-admin session and enforce admin roles on rotated token.
   */
  async refreshAdminSession(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    role: 'admin' | 'sub_admin';
  }> {
    const tokens = await this.refreshSession(refreshToken);
    const payload = verifyAccessToken(tokens.accessToken) as { role?: string };
    if (!payload.role || !ADMIN_ROLES.includes(payload.role as UserRole)) {
      throw new AppError('Admin access required', 403);
    }
    return {
      ...tokens,
      role: payload.role as 'admin' | 'sub_admin',
    };
  }

  /**
   * Create admin/sub-admin account without OTP flow.
   */
  async registerAdminUser({
    firstName,
    lastName,
    email,
    phone,
    password,
    role,
    status,
  }: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    role: 'admin' | 'sub_admin';
    status?: 'active' | 'inactive' | 'restricted';
  }): Promise<{ id: string; role: 'admin' | 'sub_admin' }> {
    const existing = await this.repo.findUserByEmail(email);
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await hashPassword(password);
    const created = await this.repo.createUser({
      firstName,
      lastName,
      email,
      phone,
      role,
      passwordHash,
    });

    if (status && status !== created.status) {
      await this.repo.updateUserStatus(created.id, status);
    }

    return {
      id: created.id,
      role,
    };
  }

  /** Start forgot password flow by sending reset OTP. */
  async forgotPassword(email: string): Promise<{ success: boolean; verifyToken: string }> {
    logStep('loading user for forgot password');
    const user = await this.repo.findUserByEmail(email);
    if (!user) {
      throw new AppError('Account not found', 404);
    }

    logStep('issuing reset otp');
    const { verifyToken } = await this.issueOtp({
      userId: user.id,
      email,
      firstName: user.first_name,
      purpose: 'reset_password',
    });
    return { success: true, verifyToken };
  }

  /** Reset password after OTP verification and verify token. */
  async resetPassword({
    newPassword,
    verifyToken,
  }: {
    newPassword: string;
    verifyToken: string;
  }): Promise<{ success: boolean }> {
    // Ensure verify token matches user
    logStep('verifying reset token');
    const payload = verifyResetToken(verifyToken);
    const user = await this.repo.findUserByEmail(payload.email);
    if (!user || user.id !== payload.sub) {
      throw new AppError('Invalid reset verification token', 401);
    }

    logStep('hashing new password');
    const passwordHash = await hashPassword(newPassword);
    await this.repo.updatePassword(user.id, passwordHash);

    return { success: true };
  }

  /** Resend OTP using existing verification token. */
  async resendOtp(verifyToken: string): Promise<{ success: boolean; verifyToken: string; purpose: OtpPurpose }> {
    logStep('verifying resend otp token');
    const payload = verifyOtpToken(verifyToken);
    const user = await this.repo.findUserByEmail(payload.email);
    if (!user || user.id !== payload.sub) {
      throw new AppError('Invalid verification token', 401);
    }

    logStep('issuing new otp for resend');
    const firstName = user.first_name ?? 'there';
    const { verifyToken: nextVerifyToken } = await this.issueOtp({
      userId: user.id,
      email: user.email,
      firstName,
      purpose: payload.purpose as OtpPurpose,
    });

    return { success: true, verifyToken: nextVerifyToken, purpose: payload.purpose };
  }

  /**
   * issueOtp Executes a core module operation used by API workflows.
   */
  private async issueOtp({
    userId,
    email,
    firstName,
    purpose,
  }: {
    userId: string;
    email: string;
    firstName: string;
    purpose: OtpPurpose;
  }): Promise<{ verifyToken: string }> {
    const otp = generateOtp();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    logStep('storing otp hash');
    await this.repo.createOtp({ userId, codeHash, purpose, expiresAt });
    const verifyToken = signOtpVerifyToken({ sub: userId, email, purpose });

    logStep('sending otp email');
    const html = buildOtpEmail({ firstName, otp, purpose });
    sendMail({ to: email, subject: 'Tripline verification code', html });
    return { verifyToken };
  }
}

/**
 * verifyResetToken Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function verifyResetToken(token: string): { sub: string; email: string } {
  try {
    const payload = verifyToken(token) as { sub: string; email: string; type?: string };
    if (payload.type !== 'reset') {
      throw new AppError('Invalid reset verification token', 401);
    }
    return { sub: payload.sub, email: payload.email };
  } catch {
    throw new AppError('Invalid reset verification token', 401);
  }
}

/**
 * verifyOtpToken Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function verifyOtpToken(token: string): { sub: string; email: string; purpose: OtpPurpose } {
  try {
    const payload = verifyToken(token) as { sub: string; email: string; purpose?: string; type?: string };
    if (payload.type !== 'otp' || !payload.purpose) {
      throw new AppError('Invalid verification token', 401);
    }
    const allowed: OtpPurpose[] = ['verify_email', 'reset_password'];
    if (!allowed.includes(payload.purpose as OtpPurpose)) {
      throw new AppError('Invalid verification token', 401);
    }
    return { sub: payload.sub, email: payload.email, purpose: payload.purpose as OtpPurpose };
  } catch {
    throw new AppError('Invalid verification token', 401);
  }
}

/**
 * verifyRefreshToken Pure helper that transforms data between transport, domain, and persistence shapes.
 */
function verifyRefreshToken(token: string): { sub: string; role?: string } {
  try {
    const payload = verifyToken(token) as { sub: string; role?: string; type?: string };
    if (payload.type !== 'refresh') {
      throw new AppError('Invalid refresh token', 401);
    }
    return { sub: payload.sub, role: payload.role };
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }
}

export const authService = new AuthService(authRepository);
