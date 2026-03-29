import { supabaseAdmin } from '@/lib/db/supabase';
import { AppError } from '@/lib/utils/errors';
import type {
  BulkBookingOccurrenceRecord,
  BulkBookingRuleRecord,
  CreateBulkBookingRuleInput,
  UpdateBulkBookingRuleInput,
} from './bulk-bookings.types';

export class BulkBookingsRepository {
  async getRoute(routeId: string): Promise<{ id: string; status: string } | null> {
    const { data, error } = await supabaseAdmin.from('routes').select('id, status').eq('id', routeId).maybeSingle();
    if (error) throw new AppError('Unable to fetch route', 500);
    return data ?? null;
  }

  async getPickupPoint(pickupPointId: string): Promise<{ id: string; route_id: string } | null> {
    const { data, error } = await supabaseAdmin.from('pickup_points').select('id, route_id').eq('id', pickupPointId).maybeSingle();
    if (error) throw new AppError('Unable to fetch pickup point', 500);
    return data ?? null;
  }

  async createRule(input: CreateBulkBookingRuleInput & { riderId: string; endDate: string; weekdays: string[] }): Promise<BulkBookingRuleRecord> {
    const { data, error } = await supabaseAdmin
      .from('bulk_booking_rules')
      .insert({
        rider_id: input.riderId,
        route_id: input.routeId,
        pickup_point_id: input.pickupPointId,
        time_slots: input.timeSlots,
        duration_type: input.durationType,
        day_mode: input.dayMode,
        weekdays: input.weekdays,
        start_date: input.startDate,
        end_date: input.endDate,
        seat_count: input.seatCount,
        status: 'active',
      })
      .select('*')
      .single<BulkBookingRuleRecord>();
    if (error || !data) throw new AppError('Unable to create bulk booking rule', 500);
    return data;
  }

  async createOccurrences(rows: Array<Omit<BulkBookingOccurrenceRecord, 'id' | 'trip_id' | 'booking_id' | 'failure_reason' | 'created_at' | 'updated_at'>>): Promise<BulkBookingOccurrenceRecord[]> {
    if (rows.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from('bulk_booking_occurrences')
      .insert(rows.map((row) => ({ ...row, trip_id: null, booking_id: null, failure_reason: null })))
      .select('*')
      .returns<BulkBookingOccurrenceRecord[]>();
    if (error) throw new AppError('Unable to create bulk booking occurrences', 500);
    return data ?? [];
  }

  async listRulesByRider(riderId: string): Promise<BulkBookingRuleRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('bulk_booking_rules')
      .select('*')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })
      .returns<BulkBookingRuleRecord[]>();
    if (error) throw new AppError('Unable to fetch bulk booking rules', 500);
    return data ?? [];
  }

  async getRuleById(id: string): Promise<BulkBookingRuleRecord | null> {
    const { data, error } = await supabaseAdmin.from('bulk_booking_rules').select('*').eq('id', id).maybeSingle<BulkBookingRuleRecord>();
    if (error) throw new AppError('Unable to fetch bulk booking rule', 500);
    return data ?? null;
  }

  async updateRule(id: string, input: UpdateBulkBookingRuleInput): Promise<BulkBookingRuleRecord> {
    const { data, error } = await supabaseAdmin
      .from('bulk_booking_rules')
      .update({ status: input.status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single<BulkBookingRuleRecord>();
    if (error || !data) throw new AppError('Unable to update bulk booking rule', 500);
    return data;
  }

  async listOccurrencesByRule(ruleId: string): Promise<BulkBookingOccurrenceRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('bulk_booking_occurrences')
      .select('*')
      .eq('rule_id', ruleId)
      .order('service_date', { ascending: true })
      .order('time_slot', { ascending: true })
      .returns<BulkBookingOccurrenceRecord[]>();
    if (error) throw new AppError('Unable to fetch bulk booking occurrences', 500);
    return data ?? [];
  }

  async listProcessableOccurrences(limit = 200): Promise<BulkBookingOccurrenceRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('bulk_booking_occurrences')
      .select('*')
      .in('status', ['pending_trip', 'pending_booking', 'failed'])
      .order('service_date', { ascending: true })
      .limit(limit)
      .returns<BulkBookingOccurrenceRecord[]>();
    if (error) throw new AppError('Unable to fetch pending bulk booking occurrences', 500);
    return data ?? [];
  }

  async getMatchingTrip(routeId: string, serviceDate: string, timeSlot: string): Promise<{ id: string } | null> {
    const { data, error } = await supabaseAdmin
      .from('trip_availability')
      .select('id')
      .eq('route_id', routeId)
      .eq('ride_date', serviceDate)
      .eq('time_slot', timeSlot)
      .in('status', ['scheduled', 'awaiting_driver'])
      .gt('available_seats', 0)
      .order('departure_time', { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (error) throw new AppError('Unable to match bulk booking trip', 500);
    return data ?? null;
  }

  async markOccurrencePendingTrip(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('bulk_booking_occurrences').update({ status: 'pending_trip', trip_id: null, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw new AppError('Unable to update bulk booking occurrence', 500);
  }

  async markOccurrenceFailed(id: string, failureReason: string, tripId?: string | null): Promise<void> {
    const { error } = await supabaseAdmin
      .from('bulk_booking_occurrences')
      .update({ status: 'failed', failure_reason: failureReason, trip_id: tripId ?? null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new AppError('Unable to update bulk booking occurrence', 500);
  }

  async markOccurrenceBooked(id: string, tripId: string, bookingId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('bulk_booking_occurrences')
      .update({ status: 'booked', trip_id: tripId, booking_id: bookingId, failure_reason: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new AppError('Unable to update bulk booking occurrence', 500);
  }

  async linkBookingToOccurrence(bookingId: string, occurrenceId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('bookings').update({ bulk_booking_occurrence_id: occurrenceId }).eq('id', bookingId);
    if (error) throw new AppError('Unable to link booking to bulk occurrence', 500);
  }

  async getRideInstanceById(id: string): Promise<{ id: string; route_id: string; ride_date: string; time_slot: 'morning'|'afternoon'|'evening'; status: 'scheduled'|'cancelled' } | null> {
    const { data, error } = await supabaseAdmin.from('ride_instances').select('id, route_id, ride_date, time_slot, status').eq('id', id).maybeSingle<any>();
    if (error) throw new AppError('Unable to fetch ride instance', 500);
    return data ?? null;
  }

  async getRideInstanceByRouteDateSlot(routeId: string, rideDate: string, timeSlot: string): Promise<{ id: string } | null> {
    const { data, error } = await supabaseAdmin.from('ride_instances').select('id').eq('route_id', routeId).eq('ride_date', rideDate).eq('time_slot', timeSlot).maybeSingle<{ id: string }>();
    if (error) throw new AppError('Unable to fetch replicated ride instance', 500);
    return data ?? null;
  }

  async createRideInstance(routeId: string, rideDate: string, timeSlot: string): Promise<{ id: string }> {
    const { data, error } = await supabaseAdmin.from('ride_instances').insert({ route_id: routeId, ride_date: rideDate, time_slot: timeSlot, status: 'scheduled' }).select('id').single<{ id: string }>();
    if (error || !data) throw new AppError('Unable to create replicated ride instance', 500);
    return data;
  }
}

export const bulkBookingsRepository = new BulkBookingsRepository();
