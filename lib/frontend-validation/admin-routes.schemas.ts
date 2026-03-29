import { z } from 'zod';

const latitudeSchema = z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90');
const longitudeSchema = z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180');

export const adminRouteFormClientSchema = z.object({
  name: z.string().trim().min(1, 'Route name is required'),
  fromName: z.string().trim().min(1, 'From name is required'),
  fromLatitude: latitudeSchema,
  fromLongitude: longitudeSchema,
  toName: z.string().trim().min(1, 'To name is required'),
  toLatitude: latitudeSchema,
  toLongitude: longitudeSchema,
  baseTokenCost: z.number().int().min(0, 'Base token cost must be 0 or greater'),
  status: z.enum(['available', 'coming_soon']),
});

export const adminRoutesFilterClientSchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(['all', 'available', 'coming_soon']),
});
