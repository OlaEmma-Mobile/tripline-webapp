import { z } from 'zod';

export const assignDriverVehicleSchema = z.object({
  driverId: z.string().uuid('Driver id must be a valid UUID'),
  vehicleId: z.string().uuid('Vehicle id must be a valid UUID'),
});

export const assignDriverRouteSchema = z.object({
  driverId: z.string().uuid('Driver id must be a valid UUID'),
  routeId: z.string().uuid('Route id must be a valid UUID'),
});

export const assignRideInstanceDriversSchema = z.object({
  rideInstanceId: z.string().uuid('Ride instance id must be a valid UUID'),
  assignments: z
    .array(
      z.object({
        driverId: z.string().uuid('Driver id must be a valid UUID'),
        departureTime: z
          .string()
          .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Departure time must be HH:MM or HH:MM:SS'),
        estimatedDurationMinutes: z.coerce
          .number()
          .int('Estimated duration must be a whole number')
          .positive('Estimated duration must be greater than 0'),
      })
    )
    .min(1, 'At least one driver is required'),
});
