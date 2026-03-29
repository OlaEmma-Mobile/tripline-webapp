export type BulkBookingDurationType = '1_week' | '2_weeks' | '3_weeks' | '1_month';
export type BulkBookingDayMode = 'custom_days' | 'working_days';
export type BulkBookingStatus = 'active' | 'paused' | 'cancelled' | 'completed';
export type BulkBookingOccurrenceStatus = 'pending_trip' | 'pending_booking' | 'booked' | 'failed' | 'cancelled' | 'skipped';
export type BulkBookingWeekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type BulkBookingTimeSlot = 'morning' | 'evening';

export interface BulkBookingRuleRecord {
  id: string;
  rider_id: string;
  route_id: string;
  pickup_point_id: string;
  time_slots: string[];
  duration_type: BulkBookingDurationType;
  day_mode: BulkBookingDayMode;
  weekdays: string[];
  start_date: string;
  end_date: string;
  seat_count: number;
  status: BulkBookingStatus;
  last_processed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BulkBookingOccurrenceRecord {
  id: string;
  rule_id: string;
  rider_id: string;
  route_id: string;
  pickup_point_id: string;
  service_date: string;
  time_slot: 'morning' | 'afternoon' | 'evening';
  seat_count: number;
  trip_id: string | null;
  booking_id: string | null;
  status: BulkBookingOccurrenceStatus;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBulkBookingRuleInput {
  routeId: string;
  pickupPointId: string;
  timeSlots: BulkBookingTimeSlot[];
  durationType: BulkBookingDurationType;
  dayMode: BulkBookingDayMode;
  weekdays?: BulkBookingWeekday[];
  startDate: string;
  seatCount: number;
}

export interface UpdateBulkBookingRuleInput {
  status: Extract<BulkBookingStatus, 'active' | 'paused' | 'cancelled'>;
}

export interface BulkBookingRuleDTO {
  id: string;
  riderId: string;
  routeId: string;
  pickupPointId: string;
  timeSlots: BulkBookingTimeSlot[];
  durationType: BulkBookingDurationType;
  dayMode: BulkBookingDayMode;
  weekdays: BulkBookingWeekday[];
  startDate: string;
  endDate: string;
  seatCount: number;
  status: BulkBookingStatus;
  lastProcessedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BulkBookingOccurrenceDTO {
  id: string;
  ruleId: string;
  serviceDate: string;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  seatCount: number;
  tripId: string | null;
  bookingId: string | null;
  status: BulkBookingOccurrenceStatus;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BulkBookingRuleDetailDTO extends BulkBookingRuleDTO {
  occurrences: BulkBookingOccurrenceDTO[];
}

export interface ProcessBulkBookingResult {
  processed: number;
  booked: number;
  pendingTrip: number;
  failed: number;
  skipped: number;
}

export interface ReplicateRideInstancesInput {
  sourceRideInstanceId: string;
  duration: '7_days' | '1_month';
}

export interface ReplicateRideInstancesResult {
  createdRideInstances: number;
  reusedRideInstances: number;
  createdAssignments: number;
  skippedAssignments: number;
  createdTrips: number;
}
