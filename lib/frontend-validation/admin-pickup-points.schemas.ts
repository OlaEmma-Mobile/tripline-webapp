import { z } from 'zod';

const latitudeSchema = z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90');
const longitudeSchema = z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180');

export const adminPickupPointFormClientSchema = z.object({
  name: z.string().trim().min(1, 'Pickup point name is required'),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  sequence: z.number().int().positive('Sequence must be greater than 0'),
  tokenModifier: z.number().int('Token modifier must be an integer'),
});

export const adminPickupReorderClientSchema = z
  .object({
    items: z
      .array(
        z.object({
          id: z.string().uuid('Pickup point ID must be a valid UUID'),
          sequence: z.number().int().positive('Sequence must be greater than 0'),
        })
      )
      .min(1, 'At least one pickup point is required'),
  })
  .refine((input) => new Set(input.items.map((item) => item.sequence)).size === input.items.length, {
    message: 'Sequence values must be unique',
    path: ['items'],
  });

export const adminPickupRoutePathClientSchema = z.object({
  routeId: z.string().uuid('Route ID must be a valid UUID'),
});
