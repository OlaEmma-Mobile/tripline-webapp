import { addBusinessDays, businessDaysBetween } from '@/lib/utils/business-days';
import { walletRepository, WalletRepository } from './wallet.repository';
import { logStep } from '@/lib/utils/logger';

const EXPIRY_DAYS = 60;
const RESET_DAYS = 90;
const RESET_THRESHOLD_DAYS = 7;

/**
 * Token wallet service for credits and expiry logic.
 */
export class WalletService {
  constructor(private readonly repo: WalletRepository) {}

  /**
   * Apply expiry rules and credit new tokens for a purchase.
   */
  async creditPurchase({
    userId,
    purchaseId,
    tokens,
    now = new Date(),
  }: {
    userId: string;
    purchaseId: string;
    tokens: number;
    now?: Date;
  }): Promise<{ balance: number }> {
    logStep('expiring old credits if needed');
    await this.repo.expireCredits(userId, now);

    logStep('checking reset rule for expiring credits');
    const activeCredits = await this.repo.listActiveCredits(userId);
    const shouldReset = activeCredits.some((credit) => {
      const expiresAt = new Date(credit.expires_at);
      const daysLeft = businessDaysBetween(now, expiresAt);
      return daysLeft <= RESET_THRESHOLD_DAYS;
    });

    if (shouldReset) {
      logStep('extending active credits to reset expiry');
      const newExpiry = addBusinessDays(now, RESET_DAYS);
      await this.repo.extendActiveCredits(userId, newExpiry);
    }

    const expiry = addBusinessDays(now, EXPIRY_DAYS);
    logStep('creating new credit');
    await this.repo.createCredit({ userId, purchaseId, tokens, expiresAt: expiry });

    logStep('computing wallet balance');
    const balance = await this.repo.computeActiveBalance(userId);
    logStep('upserting wallet balance', { balance });
    await this.repo.upsertWallet(userId, balance);

    return { balance };
  }

  /**
   * Retrieve wallet info.
   */
  async getWallet(userId: string): Promise<{ balance: number }> {
    await this.repo.expireCredits(userId, new Date());
    const balance = await this.repo.computeActiveBalance(userId);
    await this.repo.upsertWallet(userId, balance);
    return { balance };
  }
}

export const walletService = new WalletService(walletRepository);
