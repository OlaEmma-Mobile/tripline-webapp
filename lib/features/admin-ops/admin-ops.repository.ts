import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import { tripsRepository } from '@/lib/features/trips/trips.repository';
import type {
  AdminBookingProblemInput,
  AdminBookingRefundInput,
  AdminBookingsFilters,
  AdminRideInstanceDetails,
  AdminRideManifestRow,
  AdminSettingsInput,
  AdminSettingsRecord,
  AdminTokensFilters,
  AdminUsersFilters,
  AdminWalletAdjustInput,
} from './admin-ops.types';

interface AdminAdjustWalletRpcRow {
  user_id: string;
  amount: number;
  balance_after: number;
  ledger_id: string;
}

interface AdminRefundBookingRpcRow {
  booking_id: string;
  refunded_tokens: number;
  wallet_balance_after: number;
  ledger_id: string;
}

/**
 * Admin operational repository for bookings/users/tokens/settings queries.
 */
export class AdminOpsRepository {
  /**
   * Detects whether the ride-driver assignment table is missing in the current DB state.
   */
  private isMissingRideDriverAssignmentsTable(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    const message = (error.message ?? '').toLowerCase();
    return error.code === '42P01' || message.includes('ride_instance_driver_assignments');
  }

  /**
   * Loads assigned driver records for ride instances.
   */
  private async getDriversByRideInstanceIds(
    rideInstanceIds: string[]
  ): Promise<
    Record<
      string,
      Array<{
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
      }>
    >
  > {
    if (rideInstanceIds.length === 0) return {};

    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('ride_instance_driver_assignments')
.select('ride_instance_id, driver_id, driver_trip_id')
      .in('ride_instance_id', rideInstanceIds)
      .eq('status', 'active')
.returns<Array<{ ride_instance_id: string; driver_id: string; driver_trip_id: string }>>();

    if (this.isMissingRideDriverAssignmentsTable(assignmentsError)) {
      throw new AppError('Ride driver assignment schema not migrated', 500);
    }
    if (assignmentsError) {
      throw new AppError('Unable to fetch ride driver assignments', 500);
    }

    const driverIds = Array.from(new Set((assignments ?? []).map((row) => row.driver_id).filter(Boolean)));
    if (driverIds.length === 0) {
      return {};
    }

    const { data: drivers, error: driversError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, phone')
      .in('id', driverIds)
      .returns<
        Array<{
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
        }>
      >();

    if (driversError) {
      throw new AppError('Unable to fetch drivers for ride assignments', 500);
    }

    const driversById = new Map<
      string,
      { id: string; first_name: string; last_name: string; email: string; phone: string | null }
    >();
    for (const driver of drivers ?? []) {
      driversById.set(driver.id, driver);
    }

    const { data: vehicleAssignments, error: vehicleAssignmentError } = await supabaseAdmin
      .from('driver_vehicle_assignments')
      .select('driver_id, vehicle_id, assigned_at, vehicle:vehicles(id, registration_number, model, capacity)')
      .in('driver_id', driverIds)
      .eq('status', 'active')
      .returns<
        Array<{
          driver_id: string;
          vehicle_id: string;
          assigned_at: string;
          vehicle: {
            id: string;
            registration_number: string;
            model: string | null;
            capacity: number;
          } | null;
        }>
      >();

    if (vehicleAssignmentError) {
      throw new AppError('Unable to fetch ride driver vehicles', 500);
    }

    const vehicleAssignmentsByDriver = new Map<
      string,
      {
        vehicleId: string;
        registrationNumber: string;
        model: string | null;
        capacity: number;
        assignedAt: string;
      }
    >();
    for (const assignment of vehicleAssignments ?? []) {
      if (!assignment.vehicle || vehicleAssignmentsByDriver.has(assignment.driver_id)) continue;
      vehicleAssignmentsByDriver.set(assignment.driver_id, {
        vehicleId: assignment.vehicle_id,
        registrationNumber: assignment.vehicle.registration_number,
        model: assignment.vehicle.model,
        capacity: assignment.vehicle.capacity,
        assignedAt: assignment.assigned_at,
      });
    }

    const out: Record<
      string,
      Array<{
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
      }>
    > = {};

    for (const row of assignments ?? []) {
      const driver = driversById.get(row.driver_id);
      if (!driver) continue;
      if (!out[row.ride_instance_id]) out[row.ride_instance_id] = [];
      out[row.ride_instance_id].push({
        ...driver,
        driverTripId: row.driver_trip_id,
        assignedVehicle: vehicleAssignmentsByDriver.get(driver.id) ?? null,
      });
    }

    return out;
  }

  /**
   * Loads assigned driver display names for ride instances.
   */
  private async getDriverNamesByRideInstanceIds(
    rideInstanceIds: string[]
  ): Promise<Record<string, string[]>> {
    const driversByRide = await this.getDriversByRideInstanceIds(rideInstanceIds);
    const out: Record<string, string[]> = {};
    for (const [rideInstanceId, drivers] of Object.entries(driversByRide)) {
      out[rideInstanceId] = drivers.map((driver) =>
        `${driver.first_name ?? ''} ${driver.last_name ?? ''}`.trim() || driver.email
      );
    }
    return out;
  }

  /**
   * Detects missing-column errors for optional `fcm_token` field when migration is not yet applied.
   */
  private isMissingFcmTokenColumn(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    const msg = (error.message ?? '').toLowerCase();
    return msg.includes('fcm_token') || msg.includes("column 'fcm_token'") || msg.includes('column "fcm_token"');
  }

  /**
   * Detects missing booking operations columns when migrations are partially applied.
   */
  private isMissingBookingOpsColumn(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    const msg = (error.message ?? '').toLowerCase();
    return (
      msg.includes('pickup_point_id') ||
      msg.includes('token_cost') ||
      msg.includes('problem_flag') ||
      msg.includes('problem_note') ||
      msg.includes('refunded_tokens') ||
      msg.includes('refunded_at')
    );
  }
  /**
   * Lists bookings with related rider, route, ride, and pickup point context.
   */
  async listBookings(filters: AdminBookingsFilters): Promise<{ items: Record<string, unknown>[]; total: number }> {
    let query = supabaseAdmin.from('bookings').select(
      'id, ride_instance_id, rider_id, pickup_point_id, token_cost, status, seat_count, refunded_tokens, refunded_at, problem_flag, problem_note, created_at',
      { count: 'exact' }
    );

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.userId) query = query.eq('rider_id', filters.userId);

    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;

    let { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
      .returns<Record<string, unknown>[]>();

    if (this.isMissingBookingOpsColumn(error)) {
      const fallback = await supabaseAdmin
        .from('bookings')
        .select(
          'id, ride_instance_id, rider_id, status, seat_count, created_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(from, to)
        .returns<Record<string, unknown>[]>();

      data = (fallback.data ?? []).map((row) => ({
        ...row,
        pickup_point_id: null,
        pickup_point: null,
        token_cost: 0,
        refunded_tokens: 0,
        refunded_at: null,
        problem_flag: false,
        problem_note: null,
      }));
      error = fallback.error;
      count = fallback.count;
    }

    if (error) {
      throw new AppError('Unable to fetch bookings', 500);
    }

    const baseItems = data ?? [];
    const rideInstanceIds = [...new Set(baseItems.map((item) => String(item.ride_instance_id)).filter(Boolean))];
    const riderIds = [...new Set(baseItems.map((item) => String(item.rider_id)).filter(Boolean))];
    const pickupPointIds = [...new Set(baseItems.map((item) => String(item.pickup_point_id ?? '')).filter(Boolean))];

    const [ridesRes, ridersRes, pickupsRes] = await Promise.all([
      rideInstanceIds.length
        ? supabaseAdmin
            .from('ride_instances')
            .select('id, route_id, ride_date, departure_time, status')
            .in('id', rideInstanceIds)
            .returns<Array<{ id: string; route_id: string; ride_date: string; departure_time: string; status: string }>>()
        : Promise.resolve({ data: [], error: null }),
      riderIds.length
        ? supabaseAdmin
            .from('users')
            .select('id, first_name, last_name, email, phone')
            .in('id', riderIds)
            .returns<Array<{ id: string; first_name: string; last_name: string; email: string; phone: string | null }>>()
        : Promise.resolve({ data: [], error: null }),
      pickupPointIds.length
        ? supabaseAdmin
            .from('pickup_points')
            .select('id, name')
            .in('id', pickupPointIds)
            .returns<Array<{ id: string; name: string }>>()
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (ridesRes.error || ridersRes.error || pickupsRes.error) {
      throw new AppError('Unable to fetch bookings relationships', 500);
    }

    const ridesById: Record<string, { id: string; route_id: string; ride_date: string; departure_time: string; status: string }> = {};
    for (const row of ridesRes.data ?? []) ridesById[row.id] = row;

    const routeIds = [...new Set((ridesRes.data ?? []).map((ride) => ride.route_id).filter(Boolean))];
    let routeNames: Record<string, string> = {};
    if (routeIds.length > 0) {
      const { data: routes, error: routesError } = await supabaseAdmin
        .from('routes')
        .select('id, name')
        .in('id', routeIds)
        .returns<Array<{ id: string; name: string }>>();
      if (routesError) {
        throw new AppError('Unable to fetch route names for bookings', 500);
      }
      routeNames = Object.fromEntries((routes ?? []).map((route) => [route.id, route.name]));
    }

    const ridersById: Record<string, { id: string; first_name: string; last_name: string; email: string; phone: string | null }> = {};
    for (const row of ridersRes.data ?? []) ridersById[row.id] = row;

    const pickupsById: Record<string, { id: string; name: string }> = {};
    for (const row of pickupsRes.data ?? []) pickupsById[row.id] = row;

    let items = baseItems.map((item) => {
      const ride = ridesById[String(item.ride_instance_id)] ?? null;
      const rider = ridersById[String(item.rider_id)] ?? null;
      const pickup = item.pickup_point_id ? pickupsById[String(item.pickup_point_id)] ?? null : null;
      return {
        ...item,
        ride_instance: ride
          ? {
              ...ride,
              route: { name: routeNames[ride.route_id] ?? null },
            }
          : null,
        rider,
        pickup_point: pickup,
      };
    });

    if (filters.routeId || filters.date) {
      items = items.filter((item) => {
        const ride = (item.ride_instance as { route_id?: string; ride_date?: string } | null) ?? null;
        if (!ride) return false;
        if (filters.routeId && ride.route_id !== filters.routeId) return false;
        if (filters.date && ride.ride_date !== filters.date) return false;
        return true;
      });
    }

    return { items, total: count ?? items.length };
  }

  /**
   * Updates booking problem flag/note.
   */
  async markBookingProblem(input: AdminBookingProblemInput): Promise<Record<string, unknown>> {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({
        problem_flag: input.flagged,
        problem_note: input.note ?? null,
      })
      .eq('id', input.bookingId)
      .select('id, problem_flag, problem_note, updated_at')
      .single<Record<string, unknown>>();

    if (error || !data) {
      throw new AppError('Unable to update booking problem flag', 500);
    }

    return data;
  }

  /**
   * Executes transactional booking refund RPC and returns resulting balances.
   */
  async refundBooking(input: AdminBookingRefundInput): Promise<AdminRefundBookingRpcRow> {
    const { data, error } = await supabaseAdmin.rpc('admin_refund_booking', {
      p_booking_id: input.bookingId,
      p_amount: input.amount,
      p_reason: input.reason,
      p_admin_id: input.adminId,
    });

    if (error) {
      throw new AppError(error.message, 500);
    }

    const row = (Array.isArray(data) ? data[0] : data) as AdminRefundBookingRpcRow | undefined;
    if (!row) {
      throw new AppError('Unable to refund booking', 500);
    }

    return row;
  }

  /**
   * Lists users with optional role/status/search filters.
   */
  async listUsers(filters: AdminUsersFilters): Promise<{ items: Record<string, unknown>[]; total: number }> {
    let query = supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, phone, role, status, fcm_token, created_at, updated_at', {
        count: 'exact',
      });

    if (filters.role) query = query.eq('role', filters.role);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.q) {
      query = query.or(
        `first_name.ilike.%${filters.q}%,last_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%`
      );
    }

    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;

    let { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(from, to)
      .returns<Record<string, unknown>[]>();

    if (this.isMissingFcmTokenColumn(error)) {
      let fallbackQuery = supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email, phone, role, status, created_at, updated_at', {
          count: 'exact',
        });

      if (filters.role) fallbackQuery = fallbackQuery.eq('role', filters.role);
      if (filters.status) fallbackQuery = fallbackQuery.eq('status', filters.status);
      if (filters.q) {
        fallbackQuery = fallbackQuery.or(
          `first_name.ilike.%${filters.q}%,last_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%`
        );
      }

      const fallback = await fallbackQuery
        .order('updated_at', { ascending: false })
        .range(from, to)
        .returns<Record<string, unknown>[]>();

      data = (fallback.data ?? []).map((row) => ({ ...row, fcm_token: null }));
      error = fallback.error;
      count = fallback.count;
    }

    if (error) {
      throw new AppError('Unable to fetch users', 500);
    }

    return { items: data ?? [], total: count ?? 0 };
  }

  /**
   * Loads wallet balances for many users.
   */
  async getWalletBalances(userIds: string[]): Promise<Record<string, number>> {
    if (userIds.length === 0) return {};

    const { data, error } = await supabaseAdmin
      .from('token_wallets')
      .select('user_id, balance')
      .in('user_id', userIds)
      .returns<Array<{ user_id: string; balance: number }>>();

    if (error) {
      throw new AppError('Unable to fetch wallet balances', 500);
    }

    const out: Record<string, number> = {};
    for (const row of data ?? []) out[row.user_id] = row.balance;
    return out;
  }

  /**
   * Loads total successful purchased tokens for users.
   */
  async getPurchasedTokenTotals(userIds: string[]): Promise<Record<string, number>> {
    if (userIds.length === 0) return {};

    const { data, error } = await supabaseAdmin
      .from('token_purchases')
      .select('user_id, tokens')
      .in('user_id', userIds)
      .eq('status', 'success')
      .returns<Array<{ user_id: string; tokens: number }>>();

    if (error) {
      throw new AppError('Unable to fetch token totals', 500);
    }

    const out: Record<string, number> = {};
    for (const row of data ?? []) {
      out[row.user_id] = (out[row.user_id] ?? 0) + (row.tokens ?? 0);
    }
    return out;
  }

  /**
   * Fetches one user profile.
   */
  async getUserById(userId: string): Promise<Record<string, unknown> | null> {
    let { data, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, phone, role, status, fcm_token, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle<Record<string, unknown>>();

    if (this.isMissingFcmTokenColumn(error)) {
      const fallback = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email, phone, role, status, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle<Record<string, unknown>>();
      data = fallback.data ? { ...fallback.data, fcm_token: null } : null;
      error = fallback.error;
    }

    if (error) {
      throw new AppError('Unable to fetch user', 500);
    }

    return data ?? null;
  }

  /**
   * Returns wallet ledger rows for one user.
   */
  async getWalletLedger(userId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabaseAdmin
      .from('wallet_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200)
      .returns<Record<string, unknown>[]>();

    if (error) {
      throw new AppError('Unable to fetch wallet ledger', 500);
    }

    return data ?? [];
  }

  /**
   * Returns token purchase history for one user.
   */
  async getTokenPurchases(userId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabaseAdmin
      .from('token_purchases')
      .select('id, amount_ngn, tokens, status, reference, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200)
      .returns<Record<string, unknown>[]>();

    if (error) {
      throw new AppError('Unable to fetch token purchases', 500);
    }

    return data ?? [];
  }

  /**
   * Returns active bookings for one user.
   */
  async getActiveBookings(userId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select(
        'id, ride_instance_id, pickup_point_id, token_cost, status, seat_count, created_at, ride_instance:ride_instances(ride_date, departure_time, route:routes(name)), pickup_point:pickup_points(name)'
      )
      .eq('rider_id', userId)
      .in('status', ['booked', 'confirmed', 'pending'])
      .order('created_at', { ascending: false })
      .returns<Record<string, unknown>[]>();

    if (error) {
      throw new AppError('Unable to fetch active bookings', 500);
    }

    return data ?? [];
  }

  /**
   * Executes transactional wallet adjustment RPC.
   */
  async adjustWallet(input: AdminWalletAdjustInput): Promise<AdminAdjustWalletRpcRow> {
    const { data, error } = await supabaseAdmin.rpc('admin_adjust_wallet', {
      p_user_id: input.userId,
      p_amount: input.amount,
      p_reason: input.reason,
      p_reference: input.reference ?? null,
      p_created_by: input.adminId,
    });

    if (error) {
      const message = (error.message ?? '').toLowerCase();
      if (message.includes('column reference \"user_id\" is ambiguous')) {
        const wallet = await supabaseAdmin
          .from('token_wallets')
          .select('user_id, balance')
          .eq('user_id', input.userId)
          .maybeSingle<{ user_id: string; balance: number }>();

        if (wallet.error) {
          throw new AppError('Unable to adjust wallet', 500);
        }

        const currentBalance = wallet.data?.balance ?? 0;
        const newBalance = currentBalance + input.amount;
        if (input.amount === 0) {
          throw new AppError('AMOUNT_MUST_NOT_BE_ZERO', 400);
        }
        if (newBalance < 0) {
          throw new AppError('INSUFFICIENT_WALLET_BALANCE', 409);
        }

        if (wallet.data) {
          const updateWallet = await supabaseAdmin
            .from('token_wallets')
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq('user_id', input.userId);
          if (updateWallet.error) {
            throw new AppError('Unable to adjust wallet', 500);
          }
        } else {
          const insertWallet = await supabaseAdmin.from('token_wallets').insert({
            user_id: input.userId,
            balance: newBalance,
          });
          if (insertWallet.error) {
            throw new AppError('Unable to adjust wallet', 500);
          }
        }

        const ledger = await supabaseAdmin
          .from('wallet_ledger')
          .insert({
            user_id: input.userId,
            amount: input.amount,
            balance_after: newBalance,
            type: input.amount > 0 ? 'CREDIT' : 'DEBIT',
            reason: input.reason,
            reference: input.reference ?? null,
            created_by: input.adminId,
          })
          .select('id')
          .single<{ id: string }>();

        if (ledger.error || !ledger.data) {
          throw new AppError('Unable to adjust wallet', 500);
        }

        return {
          user_id: input.userId,
          amount: input.amount,
          balance_after: newBalance,
          ledger_id: ledger.data.id,
        };
      }

      throw new AppError(error.message, 500);
    }

    const row = (Array.isArray(data) ? data[0] : data) as AdminAdjustWalletRpcRow | undefined;
    if (!row) {
      throw new AppError('Unable to adjust wallet', 500);
    }

    return row;
  }

  /**
   * Lists token purchase transactions for admin.
   */
  async listTokens(filters: AdminTokensFilters): Promise<{ items: Record<string, unknown>[]; total: number }> {
    let query = supabaseAdmin
      .from('token_purchases')
      .select('id, user_id, amount_ngn, tokens, status, reference, created_at', { count: 'exact' });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00.000Z`);
    if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);

    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
      .returns<Record<string, unknown>[]>();

    if (error) {
      throw new AppError('Unable to fetch token transactions', 500);
    }

    return { items: data ?? [], total: count ?? 0 };
  }

  /**
   * Returns app settings singleton row.
   */
  async getSettings(): Promise<AdminSettingsRecord> {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single<AdminSettingsRecord>();

    if (error || !data) {
      throw new AppError('Unable to fetch app settings', 500);
    }

    return data;
  }

  /**
   * Updates app settings row.
   */
  async updateSettings(input: AdminSettingsInput, adminId: string): Promise<AdminSettingsRecord> {
    const current = await this.getSettings();
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .update({
        booking_window_days_ahead: input.bookingWindowDaysAhead,
        cancellation_window_minutes: input.cancellationWindowMinutes,
        token_expiry_days: input.tokenExpiryDays,
        updated_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id)
      .select('*')
      .single<AdminSettingsRecord>();

    if (error || !data) {
      throw new AppError('Unable to update app settings', 500);
    }

    return data;
  }

  /**
   * Returns rows used to generate admin ride manifest CSV export.
   */
  async getRideManifestRows(rideInstanceId: string): Promise<AdminRideManifestRow[]> {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id, token_cost, status, created_at, rider:users(first_name, last_name, phone, email), pickup_point:pickup_points(name)')
      .eq('ride_instance_id', rideInstanceId)
      .order('created_at', { ascending: true })
      .returns<
        Array<{
          id: string;
          token_cost: number;
          status: string;
          created_at: string;
          rider: { first_name: string; last_name: string; phone: string | null; email: string } | null;
          pickup_point: { name: string } | null;
        }>
      >();

    if (error) {
      throw new AppError('Unable to fetch ride manifest', 500);
    }

    return (data ?? []).map((row) => ({
      bookingId: row.id,
      riderName: `${row.rider?.first_name ?? ''} ${row.rider?.last_name ?? ''}`.trim(),
      riderPhone: row.rider?.phone ?? null,
      riderEmail: row.rider?.email ?? '',
      pickupPointName: row.pickup_point?.name ?? null,
      bookingStatus: row.status,
      tokenCost: row.token_cost,
      bookedAt: row.created_at,
    }));
  }

  /**
   * Returns full ride instance details for admin view.
   */
  async getRideInstanceDetails(rideInstanceId: string): Promise<AdminRideInstanceDetails> {
    const { data: ride, error: rideError } = await supabaseAdmin
      .from('ride_instances')
      .select(
        'id, ride_id, route_id, ride_date, departure_time, time_slot, status, route:routes(id, name, from_name, to_name)'
      )
      .eq('id', rideInstanceId)
      .maybeSingle<{
        id: string;
        ride_id: string;
        route_id: string;
        ride_date: string;
        departure_time: string;
        time_slot: string;
        status: string;
        route: { id: string; name: string; from_name: string; to_name: string } | null;
      }>();

    if (rideError) {
      throw new AppError('Unable to fetch ride instance details', 500);
    }
    if (!ride) {
      throw new AppError('Ride instance not found', 404);
    }

    const driversByRide = await this.getDriversByRideInstanceIds([rideInstanceId]);
    const trips = await tripsRepository.listDetailedByRideInstanceId(rideInstanceId);
    const tripIds = trips.map((trip) => trip.id);

    let bookingsQuery = supabaseAdmin
      .from('bookings')
      .select('id, trip_id, ride_instance_id, rider_id, pickup_point_id, status, seat_count, token_cost, created_at')
      .order('created_at', { ascending: true });

    if (tripIds.length > 0) {
      bookingsQuery = bookingsQuery.in('trip_id', tripIds);
    } else {
      bookingsQuery = bookingsQuery.eq('ride_instance_id', rideInstanceId);
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery.returns<
      Array<{
        id: string;
        trip_id: string | null;
        ride_instance_id: string;
        rider_id: string;
        pickup_point_id: string | null;
        status: string;
        seat_count: number;
        token_cost: number;
        created_at: string;
      }>
    >();

    if (bookingsError) {
      throw new AppError('Unable to fetch ride bookings', 500);
    }

    const riderIds = Array.from(new Set((bookings ?? []).map((row) => row.rider_id).filter(Boolean)));
    const pickupPointIds = Array.from(
      new Set((bookings ?? []).map((row) => row.pickup_point_id).filter((value): value is string => Boolean(value)))
    );

    const [{ data: riders, error: ridersError }, { data: pickupPoints, error: pickupPointsError }] =
      await Promise.all([
        riderIds.length > 0
          ? supabaseAdmin
              .from('users')
              .select('id, first_name, last_name, email, phone')
              .in('id', riderIds)
          : Promise.resolve({ data: [], error: null }),
        pickupPointIds.length > 0
          ? supabaseAdmin.from('pickup_points').select('id, name').in('id', pickupPointIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (ridersError) {
      throw new AppError('Unable to fetch ride booking riders', 500);
    }
    if (pickupPointsError) {
      throw new AppError('Unable to fetch ride booking pickup points', 500);
    }

    const ridersById = new Map((riders ?? []).map((row: any) => [row.id, row]));
    const pickupPointsById = new Map((pickupPoints ?? []).map((row: any) => [row.id, row]));

    return {
      ride: {
        id: ride.id,
        rideId: ride.ride_id,
        routeId: ride.route_id,
        rideDate: ride.ride_date,
        departureTime: ride.departure_time,
        timeSlot: ride.time_slot,
        status: ride.status,
        route: ride.route,
        drivers: driversByRide[ride.id] ?? [],
        trips: trips.map((trip) => ({
          id: trip.id,
          tripId: trip.trip_id,
          driverTripId: trip.driver_trip_id,
          status: trip.status,
          capacity: trip.capacity,
          reservedSeats: trip.reserved_seats,
          availableSeats: trip.available_seats,
          driver: trip.driver
            ? {
                id: trip.driver.id,
                firstName: trip.driver.first_name,
                lastName: trip.driver.last_name,
                email: trip.driver.email,
                phone: trip.driver.phone,
              }
            : null,
          vehicle: trip.vehicle
            ? {
                id: trip.vehicle.id,
                registrationNumber: trip.vehicle.registration_number,
                model: trip.vehicle.model,
                capacity: trip.vehicle.capacity,
              }
            : null,
        })),
      },
      bookings: (bookings ?? []).map((row) => ({
        id: row.id,
        status: row.status,
        seatCount: row.seat_count,
        tokenCost: row.token_cost,
        pickupPoint: row.pickup_point_id ? pickupPointsById.get(row.pickup_point_id) ?? null : null,
        rider: ridersById.get(row.rider_id) ?? null,
        createdAt: row.created_at,
      })),
    };
  }

  /**
   * Returns dashboard summary metrics and quick lists.
   */
  async getDashboardSummary(from: string, to: string): Promise<Record<string, unknown>> {
    const fromIso = `${from}T00:00:00.000Z`;
    const toIso = `${to}T23:59:59.999Z`;

    const [
      ridesRes,
      bookingsRes,
      purchasesRes,
      walletsRes,
      upcomingRes,
      cancelledTodayRes,
      lowSeatsRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('ride_instances')
        .select('id, status', { count: 'exact' })
        .gte('ride_date', from)
        .lte('ride_date', to),
      supabaseAdmin.from('bookings').select('id', { count: 'exact' }).gte('created_at', fromIso).lte('created_at', toIso),
      supabaseAdmin
        .from('token_purchases')
        .select('tokens')
        .eq('status', 'success')
        .gte('created_at', fromIso)
        .lte('created_at', toIso),
      supabaseAdmin.from('token_wallets').select('balance'),
      supabaseAdmin
        .from('ride_instance_availability')
        .select('ride_instance_id, ride_date, departure_time, status, route:routes(name), vehicle:vehicles(registration_number)')
        .gte('ride_date', from)
        .lte('ride_date', to)
        .in('status', ['scheduled', 'boarding'])
        .order('ride_date', { ascending: true })
        .order('departure_time', { ascending: true })
        .limit(20),
      supabaseAdmin.from('ride_instances').select('id').eq('status', 'cancelled').eq('ride_date', from),
      supabaseAdmin
        .from('ride_instance_availability')
        .select('ride_instance_id, available_seats, route:routes(name), departure_time')
        .lt('available_seats', 4)
        .in('status', ['scheduled', 'boarding'])
        .order('available_seats', { ascending: true })
        .limit(10),
    ]);

    if (ridesRes.error || bookingsRes.error || purchasesRes.error || walletsRes.error || upcomingRes.error || cancelledTodayRes.error || lowSeatsRes.error) {
      throw new AppError('Unable to fetch dashboard summary', 500);
    }

    const rides = (ridesRes.data ?? []) as Array<{ status: string }>;
    const totalRides = ridesRes.count ?? rides.length;
    const activeRides = rides.filter((row) => ['scheduled', 'boarding', 'departed'].includes(row.status)).length;
    const completedRides = rides.filter((row) => row.status === 'completed').length;
    const totalBookings = bookingsRes.count ?? 0;
    const totalTokensSold = ((purchasesRes.data ?? []) as Array<{ tokens: number }>).reduce((sum, row) => sum + (row.tokens ?? 0), 0);
    const totalWalletBalance = ((walletsRes.data ?? []) as Array<{ balance: number }>).reduce((sum, row) => sum + (row.balance ?? 0), 0);
    const upcomingRideIds = ((upcomingRes.data ?? []) as Array<{ ride_instance_id: string }>).map((row) => row.ride_instance_id);
    const upcomingDriverNames = await this.getDriverNamesByRideInstanceIds(upcomingRideIds);

    return {
      totalRides,
      activeRides,
      completedRides,
      totalBookings,
      totalTokensSold,
      totalWalletBalance,
      upcomingRides: ((upcomingRes.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        driverNames: upcomingDriverNames[String(row.ride_instance_id)] ?? [],
      })),
      alerts: {
        cancelledToday: (cancelledTodayRes.data ?? []).length,
        lowSeatRides: lowSeatsRes.data ?? [],
      },
    };
  }
}

export const adminOpsRepository = new AdminOpsRepository();
