export interface AdminBookingsFilters {
  page: number;
  limit: number;
  routeId?: string;
  date?: string;
  userId?: string;
  status?: string;
}

export interface AdminTokensFilters {
  page: number;
  limit: number;
  from?: string;
  to?: string;
  status?: string;
  userId?: string;
}

export interface AdminUsersFilters {
  page: number;
  limit: number;
  q?: string;
  role?: 'driver' | 'rider' | 'admin' | 'sub_admin';
  status?: 'active' | 'inactive' | 'restricted';
}

export interface AdminWalletAdjustInput {
  userId: string;
  amount: number;
  reason: string;
  reference?: string;
  adminId: string;
}

export interface AdminSettingsInput {
  bookingWindowDaysAhead: number;
  cancellationWindowMinutes: number;
  tokenExpiryDays: number;
}

export interface AdminBookingProblemInput {
  bookingId: string;
  flagged: boolean;
  note?: string;
}

export interface AdminBookingRefundInput {
  bookingId: string;
  amount: number;
  reason: string;
  adminId: string;
}

export interface AdminRideManifestRow {
  bookingId: string;
  riderName: string;
  riderPhone: string | null;
  riderEmail: string;
  pickupPointName: string | null;
  bookingStatus: string;
  tokenCost: number;
  bookedAt: string;
}

export interface AdminSettingsRecord {
  id: string;
  booking_window_days_ahead: number;
  cancellation_window_minutes: number;
  token_expiry_days: number;
  updated_at: string;
  updated_by: string | null;
}

export interface AdminSettingsDTO {
  bookingWindowDaysAhead: number;
  cancellationWindowMinutes: number;
  tokenExpiryDays: number;
  updatedAt: string;
  updatedBy: string | null;
}
