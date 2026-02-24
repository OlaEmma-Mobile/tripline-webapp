import { z } from 'zod';

export const assignDriverVehicleSchema = z.object({
  driverId: z.string().uuid('Driver id must be a valid UUID'),
  vehicleId: z.string().uuid('Vehicle id must be a valid UUID'),
});

export const assignDriverRouteSchema = z.object({
  driverId: z.string().uuid('Driver id must be a valid UUID'),
  routeId: z.string().uuid('Route id must be a valid UUID'),
});
