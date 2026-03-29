'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminRideMonitorActionClientSchema } from '@/lib/frontend-validation/admin-rides.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

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

export default function AdminRideDetailsPage() {
  const params = useParams<{ rideInstanceId: string }>();
  const validation = validateOrReject(
    adminRideMonitorActionClientSchema,
    { rideInstanceId: params.rideInstanceId },
    'Invalid ride instance identifier.'
  );
  const rideInstanceId = validation.isValid ? validation.data?.rideInstanceId ?? '' : '';

  const detailsQuery = useQuery({
    queryKey: adminQueryKeys.rideDetails(rideInstanceId || 'pending'),
    enabled: Boolean(rideInstanceId),
    queryFn: async ({ signal }): Promise<RideDetailsPayload> => {
      const response = await apiRequest<RideDetailsPayload>(
        `/api/admin/ride-instances/${rideInstanceId}/details`,
        { signal }
      );
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load ride details');
      }
      return response.data;
    },
  });

  const details = detailsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-foreground">Ride Details</h2>
          <p className="text-sm text-muted-foreground">
            Ride instance summary, assigned drivers, generated trips, and bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/rides">Back to rides</Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/rides/${rideInstanceId}`}>Open live monitor</Link>
          </Button>
        </div>
      </div>

      {!validation.isValid ? <p className="text-sm text-destructive">{validation.formMessage}</p> : null}
      {detailsQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      ) : null}
      {detailsQuery.isError ? (
        <p className="text-sm text-destructive">{(detailsQuery.error as Error).message}</p>
      ) : null}

      {!detailsQuery.isLoading && details ? (
        <>
          <section className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ride</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{details.ride.rideId}</p>
              <p className="text-xs text-muted-foreground">
                {details.ride.rideDate} · {details.ride.timeSlot}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Route</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {details.ride.route?.name ?? 'Unknown route'}
              </p>
              <p className="text-xs text-muted-foreground">
                {details.ride.route
                  ? `${details.ride.route.from_name} → ${details.ride.route.to_name}`
                  : 'Route details unavailable'}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{details.ride.status}</p>
              <p className="text-xs text-muted-foreground">{details.ride.timeSlot}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Trips</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{details.ride.trips.length}</p>
              <p className="text-xs text-muted-foreground">{details.ride.drivers.length} assigned drivers</p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">Assigned Drivers</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Driver assignment flow: create the ride instance, assign eligible drivers, and let the system create one trip per assignment.
            </p>
            <div className="mt-4 grid gap-3">
              {details.ride.drivers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No drivers assigned yet. Use the rides page drawer to assign drivers.</p>
              ) : (
                details.ride.drivers.map((driver) => (
                  <div key={driver.id} className="rounded-xl border border-border bg-background p-4">
                    <p className="font-semibold text-foreground">
                      {`${driver.first_name} ${driver.last_name}`.trim() || driver.email}
                    </p>
                    <p className="text-xs text-muted-foreground">Driver Trip ID: {driver.driverTripId}</p>
                    <p className="text-sm text-muted-foreground">{driver.phone ?? driver.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Vehicle:{' '}
                      {driver.assignedVehicle
                        ? `${driver.assignedVehicle.registrationNumber}${driver.assignedVehicle.model ? ` · ${driver.assignedVehicle.model}` : ''} · ${driver.assignedVehicle.capacity} seats`
                        : 'No active vehicle assignment'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">Trips</h3>
            <div className="mt-4 grid gap-3">
              {details.ride.trips.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trips yet. Assign a driver to create a trip.</p>
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
                      {trip.departureTime} · {trip.estimatedDurationMinutes} mins
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {trip.vehicle
                        ? `${trip.vehicle.registrationNumber}${trip.vehicle.model ? ` · ${trip.vehicle.model}` : ''} · ${trip.vehicle.capacity} seats`
                        : 'Vehicle unavailable'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
