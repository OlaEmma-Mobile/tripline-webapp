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

export interface AdminRideInstanceDetails {
  ride: {
    id: string;
    rideId: string;
    routeId: string;
    rideDate: string;
    departureTime: string;
    timeSlot: string;
    status: string;
    route: {
      id: string;
      name: string;
      from_name: string;
      to_name: string;
    } | null;
    drivers: Array<{
      id: string;
      driverTripId: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      assignedVehicle: {
        vehicleId: string;
        registrationNumber: string;
        model: string | null;
        capacity: number;
        assignedAt: string;
      } | null;
    }>;
    trips: Array<{
      id: string;
      tripId: string;
      driverTripId: string;
      status: string;
      capacity: number;
      reservedSeats: number;
      availableSeats: number;
      driver: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
      } | null;
      vehicle: {
        id: string;
        registrationNumber: string;
        model: string | null;
        capacity: number;
      } | null;
    }>;
  };
  bookings: Array<{
    id: string;
    status: string;
    seatCount: number;
    tokenCost: number;
    pickupPoint: { id: string; name: string } | null;
    rider: { id: string; first_name: string; last_name: string; email: string; phone: string | null } | null;
    createdAt: string;
  }>;
}
