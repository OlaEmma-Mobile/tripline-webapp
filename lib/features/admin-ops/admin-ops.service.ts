import { AppError } from '@/lib/utils/errors';
import { adminOpsRepository, AdminOpsRepository } from './admin-ops.repository';
import type {
  AdminBookingProblemInput,
  AdminBookingRefundInput,
  AdminBookingsFilters,
  AdminRideInstanceDetails,
  AdminSettingsDTO,
  AdminSettingsInput,
  AdminTokensFilters,
  AdminUsersFilters,
  AdminWalletAdjustInput,
} from './admin-ops.types';

/**
 * Admin operational service layer.
 */
export class AdminOpsService {
  constructor(private readonly repo: AdminOpsRepository) {}

  /**
   * Returns bookings list for admin operations screen.
   */
  async listBookings(filters: AdminBookingsFilters): Promise<{ items: Record<string, unknown>[]; total: number }> {
    return this.repo.listBookings(filters);
  }

  /**
   * Flags/unflags a booking as operational issue.
   */
  async markBookingProblem(input: AdminBookingProblemInput): Promise<Record<string, unknown>> {
    return this.repo.markBookingProblem(input);
  }

  /**
   * Applies a booking refund and wallet credit transactionally.
   */
  async refundBooking(input: AdminBookingRefundInput): Promise<Record<string, unknown>> {
    try {
      const result = await this.repo.refundBooking(input);
      return {
        bookingId: result.booking_id,
        refundedTokens: result.refunded_tokens,
        walletBalanceAfter: result.wallet_balance_after,
        ledgerId: result.ledger_id,
      };
    } catch (error) {
      if (error instanceof AppError) {
        const message = error.message.toUpperCase();
        if (message.includes('BOOKING_NOT_FOUND')) throw new AppError('Booking not found', 404);
        if (message.includes('INVALID_REFUND_AMOUNT')) throw new AppError('Refund amount must be greater than zero', 400);
        if (message.includes('REFUND_EXCEEDS_TOKEN_COST')) {
          throw new AppError('Refund exceeds booking token cost', 409);
        }
      }
      throw error;
    }
  }

  /**
   * Returns admin users list with wallet and token aggregates.
   */
  async listUsers(filters: AdminUsersFilters): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const { items, total } = await this.repo.listUsers(filters);
    const userIds = items.map((user) => String(user.id));
    const wallets = await this.repo.getWalletBalances(userIds);
    const purchasedTotals = await this.repo.getPurchasedTokenTotals(userIds);

    return {
      total,
      items: items.map((user) => {
        const id = String(user.id);
        return {
          ...user,
          walletBalance: wallets[id] ?? 0,
          totalTokensBought: purchasedTotals[id] ?? 0,
          lastFcmToken: user.fcm_token ?? null,
        };
      }),
    };
  }

  /**
   * Returns admin user detail with wallet ledger, purchases, and active bookings.
   */
  async getUserDetail(userId: string): Promise<Record<string, unknown>> {
    const user = await this.repo.getUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const [wallets, purchasedTotals, walletLedger, tokenPurchases, activeBookings] = await Promise.all([
      this.repo.getWalletBalances([userId]),
      this.repo.getPurchasedTokenTotals([userId]),
      this.repo.getWalletLedger(userId),
      this.repo.getTokenPurchases(userId),
      this.repo.getActiveBookings(userId),
    ]);

    return {
      profile: {
        ...user,
        walletBalance: wallets[userId] ?? 0,
        totalTokensBought: purchasedTotals[userId] ?? 0,
      },
      walletLedger,
      tokenPurchases,
      activeBookings,
    };
  }

  /**
   * Applies admin wallet adjustment with non-negative balance rule.
   */
  async adjustWallet(input: AdminWalletAdjustInput): Promise<Record<string, unknown>> {
    try {
      const result = await this.repo.adjustWallet(input);
      return {
        userId: result.user_id,
        amount: result.amount,
        balanceAfter: result.balance_after,
        ledgerId: result.ledger_id,
      };
    } catch (error) {
      if (error instanceof AppError) {
        const message = error.message.toUpperCase();
        if (message.includes('AMOUNT_MUST_NOT_BE_ZERO')) {
          throw new AppError('Amount must not be zero', 400);
        }
        if (message.includes('INSUFFICIENT_WALLET_BALANCE')) {
          throw new AppError('Adjustment would produce a negative wallet balance', 409);
        }
      }
      throw error;
    }
  }

  /**
   * Returns token purchase transactions with pagination and filters.
   */
  async listTokens(filters: AdminTokensFilters): Promise<{ items: Record<string, unknown>[]; total: number }> {
    return this.repo.listTokens(filters);
  }

  /**
   * Returns settings DTO.
   */
  async getSettings(): Promise<AdminSettingsDTO> {
    const record = await this.repo.getSettings();
    return {
      bookingWindowDaysAhead: record.booking_window_days_ahead,
      cancellationWindowMinutes: record.cancellation_window_minutes,
      tokenExpiryDays: record.token_expiry_days,
      updatedAt: record.updated_at,
      updatedBy: record.updated_by,
    };
  }

  /**
   * Updates settings DTO.
   */
  async updateSettings(input: AdminSettingsInput, adminId: string): Promise<AdminSettingsDTO> {
    const record = await this.repo.updateSettings(input, adminId);
    return {
      bookingWindowDaysAhead: record.booking_window_days_ahead,
      cancellationWindowMinutes: record.cancellation_window_minutes,
      tokenExpiryDays: record.token_expiry_days,
      updatedAt: record.updated_at,
      updatedBy: record.updated_by,
    };
  }

  /**
   * Generates manifest CSV from ride booking rows.
   */
  async getManifestCsv(rideInstanceId: string): Promise<string> {
    const rows = await this.repo.getRideManifestRows(rideInstanceId);

    const header = [
      'booking_id',
      'rider_name',
      'rider_phone',
      'rider_email',
      'pickup_point_name',
      'booking_status',
      'token_cost',
      'booked_at',
    ];

    const escape = (value: string): string => `"${value.replace(/"/g, '""')}"`;

    const body = rows.map((row) => [
      escape(row.bookingId),
      escape(row.riderName),
      escape(row.riderPhone ?? ''),
      escape(row.riderEmail),
      escape(row.pickupPointName ?? ''),
      escape(row.bookingStatus),
      String(row.tokenCost),
      escape(row.bookedAt),
    ].join(','));

    const total = rows.reduce((sum, row) => sum + row.tokenCost, 0);
    body.push(`"TOTAL_TOKENS_CONSUMED",,,,,,${total},`);

    return [header.join(','), ...body].join('\n');
  }

  /**
   * Returns full ride instance details for admin view.
   */
  async getRideInstanceDetails(rideInstanceId: string): Promise<AdminRideInstanceDetails> {
    return this.repo.getRideInstanceDetails(rideInstanceId);
  }

  /**
   * Returns admin dashboard summary metrics and quick operational lists.
   */
  async getDashboardSummary(from: string, to: string): Promise<Record<string, unknown>> {
    return this.repo.getDashboardSummary(from, to);
  }
}

export const adminOpsService = new AdminOpsService(adminOpsRepository);
