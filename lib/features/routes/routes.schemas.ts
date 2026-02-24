import { z } from 'zod';

const coordinateSchema = z.number().finite();

export const routeStatusSchema = z.enum(['active', 'inactive']);

export const createRouteSchema = z.object({
  name: z.string().min(1, 'Route name is required'),
  companyId: z.string().uuid().nullable().optional(),
  fromName: z.string().min(1, 'From name is required'),
  fromLatitude: coordinateSchema.min(-90, 'From latitude must be between -90 and 90').max(90, 'From latitude must be between -90 and 90'),
  fromLongitude: coordinateSchema.min(-180, 'From longitude must be between -180 and 180').max(180, 'From longitude must be between -180 and 180'),
  toName: z.string().min(1, 'To name is required'),
  toLatitude: coordinateSchema.min(-90, 'To latitude must be between -90 and 90').max(90, 'To latitude must be between -90 and 90'),
  toLongitude: coordinateSchema.min(-180, 'To longitude must be between -180 and 180').max(180, 'To longitude must be between -180 and 180'),
  baseTokenCost: z.number().int().min(0, 'Base token cost must be 0 or greater'),
  status: routeStatusSchema.optional(),
});

export const updateRouteSchema = createRouteSchema.partial();

export const routesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: routeStatusSchema.optional(),
  companyId: z.string().uuid().optional(),
});

export const routeSearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  status: routeStatusSchema.optional(),
  companyId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
