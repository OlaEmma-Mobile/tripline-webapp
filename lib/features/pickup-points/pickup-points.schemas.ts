import { z } from 'zod';

const coordinateSchema = z.number().finite();

export const createPickupPointSchema = z.object({
  name: z.string().min(1, 'Pickup point name is required'),
  latitude: coordinateSchema.min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  longitude: coordinateSchema.min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
  orderIndex: z.number().int().positive('Order index must be greater than 0'),
  tokenCost: z.number().int().min(0, 'Token cost must be 0 or greater'),
});

export const updatePickupPointSchema = createPickupPointSchema.partial();
