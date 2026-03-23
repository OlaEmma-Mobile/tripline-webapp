/**
 * Centralized query key factory for admin server-state.
 */
export const adminQueryKeys = {
  session: ['admin', 'session'] as const,
  dashboard: (filters: { from: string; to: string }) => ['admin', 'dashboard', filters] as const,
  routes: (filters: Record<string, unknown>) => ['admin', 'routes', filters] as const,
  routeDetail: (routeId: string) => ['admin', 'route', routeId] as const,
  pickupPoints: (routeId: string) => ['admin', 'pickup-points', routeId] as const,
  rides: (filters: Record<string, unknown>) => ['admin', 'rides', filters] as const,
  rideManifest: (rideInstanceId: string) => ['admin', 'ride-manifest', rideInstanceId] as const,
  rideRealtime: (rideInstanceId: string) => ['admin', 'ride-realtime', rideInstanceId] as const,
  rideDetails: (rideInstanceId: string) => ['admin', 'ride-details', rideInstanceId] as const,
  bookings: (filters: Record<string, unknown>) => ['admin', 'bookings', filters] as const,
  users: (filters: Record<string, unknown>) => ['admin', 'users', filters] as const,
  userDetail: (userId: string) => ['admin', 'user-detail', userId] as const,
  vehicles: (filters: Record<string, unknown>) => ['admin', 'vehicles', filters] as const,
  drivers: (filters: Record<string, unknown>) => ['admin', 'drivers', filters] as const,
  tokens: (filters: Record<string, unknown>) => ['admin', 'tokens', filters] as const,
  settings: ['admin', 'settings'] as const,
};
