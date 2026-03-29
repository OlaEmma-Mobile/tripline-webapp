'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminRideMonitorActionClientSchema } from '@/lib/frontend-validation/admin-rides.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

interface ManifestPassenger {
  bookingId: string;
  riderName: string;
  riderPhone: string | null;
  riderEmail: string;
  pickupPointName: string | null;
  bookingStatus: string;
  tokenCost: number;
  bookedAt: string;
}

interface RideDetailsPayload {
  ride: {
    id: string;
    rideId: string;
    rideDate: string;
    timeSlot: string;
    status: string;
    route: { id: string; name: string; from_name: string; to_name: string } | null;
    drivers: Array<{
      id: string;
      driverTripId: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      assignedVehicle: {
        vehicleId: string;
        registrationNumber: string;
        model: string | null;
        capacity: number;
        assignedAt: string;
      } | null;
    }>;
    trips: Array<{
      id: string;
      tripId: string;
      driverTripId: string | null;
      departureTime: string;
      estimatedDurationMinutes: number;
      status: string;
      capacity: number;
      reservedSeats: number;
      availableSeats: number;
      driver: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
      } | null;
      vehicle: {
        id: string;
        registrationNumber: string;
        model: string | null;
        capacity: number;
      } | null;
    }>;
  };
  bookings: Array<{
    id: string;
    status: string;
    seatCount: number;
    tokenCost: number;
    pickupPoint: { id: string; name: string } | null;
    rider: { id: string; first_name: string; last_name: string; email: string; phone: string | null } | null;
    createdAt: string;
  }>;
}

interface RealtimePayload {
  rideInstanceId: string;
  status: string | null;
  driverOnline: boolean;
  location: { lat: number | null; lng: number | null };
}

export default function AdminRideMonitorPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ rideInstanceId: string }>();
  const rideInstanceId = params.rideInstanceId;
  const validation = validateOrReject(
    adminRideMonitorActionClientSchema,
    { rideInstanceId },
    'Invalid ride instance identifier.'
  );
  const validRideInstanceId = validation.isValid ? validation.data?.rideInstanceId ?? '' : '';

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const libraries = useMemo(() => ['places'] as ('places')[], []);
  const { isLoaded: mapLoaded } = useJsApiLoader({
    id: 'tripline-google-maps-loader',
    googleMapsApiKey: mapsKey,
    libraries,
  });

  const detailsQuery = useQuery({
    queryKey: adminQueryKeys.rideDetails(validRideInstanceId),
    enabled: Boolean(validRideInstanceId),
    queryFn: async ({ signal }): Promise<RideDetailsPayload> => {
      const response = await apiRequest<RideDetailsPayload>(
        `/api/admin/ride-instances/${validRideInstanceId}/details`,
        { signal }
      );
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load ride details');
      }
      return response.data;
    },
  });

  const realtimeQuery = useQuery({
    queryKey: adminQueryKeys.rideRealtime(validRideInstanceId),
    enabled: Boolean(validRideInstanceId),
    refetchInterval: 5000,
    queryFn: async ({ signal }): Promise<RealtimePayload> => {
      const response = await apiRequest<RealtimePayload>(
        `/api/admin/ride-instances/${validRideInstanceId}/realtime`,
        { signal }
      );
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load realtime state');
      }
      return response.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!validation.isValid) {
        throw new Error(validation.formMessage ?? 'Invalid ride instance identifier.');
      }
      const response = await apiRequest(`/api/admin/ride-instances/${validRideInstanceId}`, {
        method: 'DELETE',
      });
      if (response.hasError) {
        throw new Error(response.message || 'Unable to cancel ride');
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.rideDetails(validRideInstanceId) }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.rideRealtime(validRideInstanceId) }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'rides'] }),
      ]);
    },
  });

  const marker = useMemo(() => {
    const location = realtimeQuery.data?.location;
    if (!location || location.lat === null || location.lng === null) return null;
    return { lat: location.lat, lng: location.lng };
  }, [realtimeQuery.data]);

  const loading = detailsQuery.isLoading || realtimeQuery.isLoading;
  const details = detailsQuery.data;
  const realtime = realtimeQuery.data;
  const passengers: ManifestPassenger[] =
    details?.bookings?.map((booking) => ({
      bookingId: booking.id,
      riderName: `${booking.rider?.first_name ?? ''} ${booking.rider?.last_name ?? ''}`.trim(),
      riderPhone: booking.rider?.phone ?? null,
      riderEmail: booking.rider?.email ?? '',
      pickupPointName: booking.pickupPoint?.name ?? null,
      bookingStatus: booking.status,
      tokenCost: booking.tokenCost,
      bookedAt: booking.createdAt,
    })) ?? [];
  const totalTokensConsumed = passengers.reduce((sum, row) => sum + (row.tokenCost ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-foreground">Ride Monitor</h2>
          <p className="text-sm text-muted-foreground">Ride ID: {rideInstanceId}</p>
          {!validation.isValid ? <p className="mt-1 text-sm text-destructive">{validation.formMessage}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/rides/${validRideInstanceId}/details`}>View details</Link>
          </Button>
          <Button variant="destructive" onClick={() => void cancelMutation.mutateAsync()} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel ride'}
          </Button>
          <Button asChild>
            <a href={`/api/admin/ride-instances/${validRideInstanceId}/manifest.csv`} target="_blank" rel="noreferrer">
              Export manifest CSV
            </a>
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">Live State</h3>
        {loading ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}
        {realtimeQuery.isError ? <p className="mt-3 text-sm text-destructive">{(realtimeQuery.error as Error).message}</p> : null}

        {!loading ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{realtime?.status ?? 'unknown'}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Driver Online</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{realtime?.driverOnline ? 'Yes' : 'No'}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Coordinates</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {marker ? `${marker.lat.toFixed(5)}, ${marker.lng.toFixed(5)}` : 'No location'}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 h-80 w-full overflow-hidden rounded-xl border border-border bg-muted/20">
          {mapLoaded && marker ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={marker}
              zoom={14}
              options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
            >
              <MarkerF position={marker} title="Driver" />
            </GoogleMap>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {mapLoaded ? 'Waiting for driver location...' : 'Loading map...'}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">Assigned Drivers and Trips</h3>
        {loading ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}
        {detailsQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">{(detailsQuery.error as Error).message}</p>
        ) : null}

        {!loading && details ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {details.ride.trips.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trips yet. Assign drivers from the ride details screen to create trips.</p>
            ) : (
              details.ride.trips.map((trip) => (
                <div key={trip.id} className="rounded-xl border border-border bg-background p-4">
                  <p className="font-semibold text-foreground">
                    {trip.tripId}{trip.driverTripId ? ` · ${trip.driverTripId}` : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {trip.driver
                      ? `${trip.driver.firstName} ${trip.driver.lastName}`.trim()
                      : 'Driver unavailable'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {trip.vehicle
                      ? `${trip.vehicle.registrationNumber}${trip.vehicle.model ? ` · ${trip.vehicle.model}` : ''} · ${trip.vehicle.capacity} seats`
                      : 'Vehicle unavailable'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {trip.reservedSeats} reserved · {trip.availableSeats} available · {trip.status}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">Passengers</h3>
        <p className="mt-1 text-sm text-muted-foreground">Total tokens consumed: {totalTokensConsumed}</p>

        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={`manifest-skeleton-${idx}`} className="h-10 w-full" />
            ))}
          </div>
        ) : null}
        {detailsQuery.isError ? <p className="mt-4 text-sm text-destructive">{(detailsQuery.error as Error).message}</p> : null}
        {!loading && passengers.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No passengers yet.</p>
        ) : null}

        {!loading && passengers.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2">Passenger</th>
                  <th className="px-3 py-2">Pickup Point</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Token Cost</th>
                  <th className="px-3 py-2">Booked At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {passengers.map((row) => (
                  <tr key={row.bookingId}>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-foreground">{row.riderName}</p>
                      <p className="text-xs text-muted-foreground">{row.riderEmail}</p>
                    </td>
                    <td className="px-3 py-3">{row.pickupPointName ?? '-'}</td>
                    <td className="px-3 py-3">{row.bookingStatus}</td>
                    <td className="px-3 py-3">{row.tokenCost}</td>
                    <td className="px-3 py-3">{new Date(row.bookedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
