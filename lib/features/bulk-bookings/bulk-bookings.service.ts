import { AppError } from '@/lib/utils/errors';
import { logStep } from '@/lib/utils/logger';
import { bookingsService } from '@/lib/features/bookings/bookings.service';
import { assignmentsRepository } from '@/lib/features/assignments/assignments.repository';
import { tripsRepository } from '@/lib/features/trips/trips.repository';
import { bulkBookingsRepository, BulkBookingsRepository } from './bulk-bookings.repository';
import type {
  BulkBookingDayMode,
  BulkBookingDurationType,
  BulkBookingOccurrenceDTO,
  BulkBookingOccurrenceRecord,
  BulkBookingRuleDTO,
  BulkBookingRuleDetailDTO,
  BulkBookingTimeSlot,
  BulkBookingWeekday,
  CreateBulkBookingRuleInput,
  ProcessBulkBookingResult,
  ReplicateRideInstancesInput,
  ReplicateRideInstancesResult,
  UpdateBulkBookingRuleInput,
} from './bulk-bookings.types';

const WORKING_DAYS: BulkBookingWeekday[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const WEEKDAY_ORDER: BulkBookingWeekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addCalendarMonths(value: Date, months: number): Date {
  const next = new Date(value);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function getEndDate(startDate: string, durationType: BulkBookingDurationType): string {
  const start = parseIsoDate(startDate);
  if (durationType === '1_week') return formatIsoDate(addDays(start, 6));
  if (durationType === '2_weeks') return formatIsoDate(addDays(start, 13));
  if (durationType === '3_weeks') return formatIsoDate(addDays(start, 20));
  return formatIsoDate(addDays(addCalendarMonths(start, 1), -1));
}

function weekdayForDate(value: Date): BulkBookingWeekday {
  return WEEKDAY_ORDER[value.getUTCDay()] ?? 'sun';
}

function normalizeWeekdays(dayMode: BulkBookingDayMode, weekdays?: BulkBookingWeekday[]): BulkBookingWeekday[] {
  const selected = dayMode === 'working_days' ? WORKING_DAYS : weekdays ?? [];
  return [...new Set(selected)].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
}

function mapRule(record: any): BulkBookingRuleDTO {
  return {
    id: record.id,
    riderId: record.rider_id,
    routeId: record.route_id,
    pickupPointId: record.pickup_point_id,
    timeSlots: record.time_slots,
    durationType: record.duration_type,
    dayMode: record.day_mode,
    weekdays: record.weekdays,
    startDate: record.start_date,
    endDate: record.end_date,
    seatCount: record.seat_count,
    status: record.status,
    lastProcessedDate: record.last_processed_date,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapOccurrence(record: BulkBookingOccurrenceRecord): BulkBookingOccurrenceDTO {
  return {
    id: record.id,
    ruleId: record.rule_id,
    serviceDate: record.service_date,
    timeSlot: record.time_slot,
    seatCount: record.seat_count,
    tripId: record.trip_id,
    bookingId: record.booking_id,
    status: record.status,
    failureReason: record.failure_reason,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapFailureReason(error: AppError): string {
  const message = error.message.toLowerCase();
  if (message.includes('not found')) return 'trip_not_found';
  if (message.includes('not open for booking') || message.includes('not scheduled')) return 'trip_not_scheduled';
  if (message.includes('no seats')) return 'no_seats';
  if (message.includes('insufficient tokens')) return 'insufficient_tokens';
  if (message.includes('pickup point')) return 'pickup_invalid';
  return 'booking_failed';
}

export class BulkBookingsService {
  constructor(private readonly repo: BulkBookingsRepository) {}

  private buildOccurrences(
    ruleId: string,
    riderId: string,
    routeId: string,
    pickupPointId: string,
    seatCount: number,
    startDate: string,
    endDate: string,
    weekdays: BulkBookingWeekday[],
    timeSlots: BulkBookingTimeSlot[]
  ): Array<Omit<BulkBookingOccurrenceRecord, 'id' | 'trip_id' | 'booking_id' | 'failure_reason' | 'created_at' | 'updated_at'>> {
    const start = parseIsoDate(startDate);
    const end = parseIsoDate(endDate);
    const rows: Array<Omit<BulkBookingOccurrenceRecord, 'id' | 'trip_id' | 'booking_id' | 'failure_reason' | 'created_at' | 'updated_at'>> = [];

    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      const weekday = weekdayForDate(cursor);
      if (!weekdays.includes(weekday)) continue;
      const serviceDate = formatIsoDate(cursor);
      for (const timeSlot of timeSlots) {
        rows.push({
          rule_id: ruleId,
          service_date: serviceDate,
          rider_id: riderId,
          route_id: routeId,
          pickup_point_id: pickupPointId,
          time_slot: timeSlot,
          seat_count: seatCount,
          status: 'pending_trip',
        });
      }
    }

    return rows;
  }

  async createRule(input: CreateBulkBookingRuleInput, riderId: string): Promise<BulkBookingRuleDetailDTO> {
    const route = await this.repo.getRoute(input.routeId);
    if (!route) throw new AppError('Route not found', 404);
    if (route.status !== 'available' && route.status !== 'active') {
      throw new AppError('Route must be available for bulk booking', 400);
    }

    const pickupPoint = await this.repo.getPickupPoint(input.pickupPointId);
    if (!pickupPoint || pickupPoint.route_id !== input.routeId) {
      throw new AppError('Pickup point not found for this route', 404);
    }

    const weekdays = normalizeWeekdays(input.dayMode, input.weekdays);
    const endDate = getEndDate(input.startDate, input.durationType);
    const rule = await this.repo.createRule({ ...input, riderId, endDate, weekdays });
    await this.repo.createOccurrences(
      this.buildOccurrences(
        rule.id,
        riderId,
        input.routeId,
        input.pickupPointId,
        input.seatCount,
        input.startDate,
        endDate,
        weekdays,
        input.timeSlots
      )
    );
    await this.processPendingOccurrences(200, rule.id, riderId);

    return this.getRuleDetails(rule.id, riderId);
  }

  async listRulesByRider(riderId: string): Promise<BulkBookingRuleDTO[]> {
    const rows = await this.repo.listRulesByRider(riderId);
    return rows.map(mapRule);
  }

  async getRuleDetails(id: string, riderId: string): Promise<BulkBookingRuleDetailDTO> {
    const rule = await this.repo.getRuleById(id);
    if (!rule || rule.rider_id !== riderId) throw new AppError('Bulk booking rule not found', 404);
    const occurrences = await this.repo.listOccurrencesByRule(id);
    return {
      ...mapRule(rule),
      occurrences: occurrences.map(mapOccurrence),
    };
  }

  async updateRule(id: string, riderId: string, input: UpdateBulkBookingRuleInput): Promise<BulkBookingRuleDTO> {
    const existing = await this.repo.getRuleById(id);
    if (!existing || existing.rider_id !== riderId) throw new AppError('Bulk booking rule not found', 404);
    const updated = await this.repo.updateRule(id, input);
    if (updated.status === 'active') {
      await this.processPendingOccurrences(200, updated.id, riderId);
    }
    return mapRule(updated);
  }

  async processPendingOccurrences(limit = 200, ruleId?: string, riderIdHint?: string): Promise<ProcessBulkBookingResult> {
    const occurrences = ruleId
      ? await this.repo.listOccurrencesByRule(ruleId)
      : await this.repo.listProcessableOccurrences(limit);
    const queue = occurrences
      .filter((item) => ['pending_trip', 'pending_booking', 'failed'].includes(item.status))
      .slice(0, limit);

    const result: ProcessBulkBookingResult = {
      processed: 0,
      booked: 0,
      pendingTrip: 0,
      failed: 0,
      skipped: 0,
    };

    for (const occurrence of queue) {
      result.processed += 1;
      const rule = await this.repo.getRuleById(occurrence.rule_id);
      if (!rule) {
        await this.repo.markOccurrenceFailed(occurrence.id, 'rule_not_found');
        result.failed += 1;
        continue;
      }
      if (rule.status !== 'active') {
        result.skipped += 1;
        continue;
      }

      const matchedTrip = await this.repo.getMatchingTrip(rule.route_id, occurrence.service_date, occurrence.time_slot);
      if (!matchedTrip) {
        await this.repo.markOccurrencePendingTrip(occurrence.id);
        result.pendingTrip += 1;
        continue;
      }

      try {
        const booking = await bookingsService.createBooking(
          {
            tripId: matchedTrip.id,
            pickupPointId: rule.pickup_point_id,
            seatCount: rule.seat_count,
          },
          riderIdHint ?? rule.rider_id
        );
        await this.repo.markOccurrenceBooked(occurrence.id, matchedTrip.id, booking.bookingId);
        await this.repo.linkBookingToOccurrence(booking.bookingId, occurrence.id);
        result.booked += 1;
      } catch (error) {
        const failureReason = error instanceof AppError ? mapFailureReason(error) : 'booking_failed';
        await this.repo.markOccurrenceFailed(occurrence.id, failureReason, matchedTrip.id);
        result.failed += 1;
      }
    }

    return result;
  }

  async replicateRideInstances(input: ReplicateRideInstancesInput): Promise<ReplicateRideInstancesResult> {
    const sourceRide = await this.repo.getRideInstanceById(input.sourceRideInstanceId);
    if (!sourceRide) throw new AppError('Ride instance not found', 404);
    if (sourceRide.status === 'cancelled') throw new AppError('Cancelled ride instances cannot be replicated', 409);

    const sourceAssignments = await assignmentsRepository.listActiveRideDriverAssignments(sourceRide.id);
    const sourceTrips = await tripsRepository.listDetailedByRideInstanceId(sourceRide.id);
    const tripByDriverId = new Map(sourceTrips.map((trip) => [trip.driver_id, trip]));

    const start = addDays(parseIsoDate(sourceRide.ride_date), 1);
    const end = input.duration === '7_days' ? addDays(start, 6) : addDays(addCalendarMonths(start, 1), -1);

    const result: ReplicateRideInstancesResult = {
      createdRideInstances: 0,
      reusedRideInstances: 0,
      createdAssignments: 0,
      createdTrips: 0,
      skippedAssignments: 0,
    };

    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      const rideDate = formatIsoDate(cursor);
      let targetRide = await this.repo.getRideInstanceByRouteDateSlot(sourceRide.route_id, rideDate, sourceRide.time_slot);
      if (!targetRide) {
        targetRide = await this.repo.createRideInstance(sourceRide.route_id, rideDate, sourceRide.time_slot);
        result.createdRideInstances += 1;
      } else {
        result.reusedRideInstances += 1;
      }

      for (const assignment of sourceAssignments) {
        const existingAssignment = await assignmentsRepository.getActiveRideDriverAssignment(targetRide.id, assignment.driver_id);
        if (existingAssignment) {
          result.skippedAssignments += 1;
          continue;
        }

        const conflict = await assignmentsRepository.getDriverRideAssignmentConflict(
          assignment.driver_id,
          rideDate,
          sourceRide.time_slot
        );
        if (conflict) {
          result.skippedAssignments += 1;
          continue;
        }

        const vehicleAssignment = await assignmentsRepository.getActiveDriverVehicleAssignmentByDriver(assignment.driver_id);
        if (!vehicleAssignment) {
          result.skippedAssignments += 1;
          continue;
        }

        const sourceTrip = tripByDriverId.get(assignment.driver_id);
        if (!sourceTrip) {
          result.skippedAssignments += 1;
          continue;
        }

        const createdAssignment = await assignmentsRepository.createRideDriverAssignment(targetRide.id, assignment.driver_id);
        result.createdAssignments += 1;

        try {
          await tripsRepository.create({
            rideInstanceId: targetRide.id,
            assignmentId: createdAssignment.id,
            driverId: assignment.driver_id,
            vehicleId: vehicleAssignment.vehicle_id,
            driverTripId: createdAssignment.driver_trip_id,
            departureTime: sourceTrip.departure_time,
            estimatedDurationMinutes: sourceTrip.estimated_duration_minutes,
            status: 'scheduled',
          });
          result.createdTrips += 1;
          await assignmentsRepository.syncRideVehicleFromAssignments(targetRide.id);
        } catch (error) {
          logStep('replicated trip creation skipped', {
            rideInstanceId: targetRide.id,
            driverId: assignment.driver_id,
            error: error instanceof Error ? error.message : 'unknown',
          });
          result.skippedAssignments += 1;
        }
      }
    }

    return result;
  }
}

export const bulkBookingsService = new BulkBookingsService(bulkBookingsRepository);
