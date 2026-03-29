'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';




interface RideDetailsDrawerProps {
  open: boolean;
  rideInstanceId: string | null;
  onOpenChange: (open: boolean) => void;
}

interface RideDetailsPayload {
  ride: {
    id: string;
    rideId: string;
    routeId: string;
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

interface DriverOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  assignedVehicle: {
    vehicleId: string;
    registrationNumber: string;
    assignedAt: string;
  } | null;
}

interface SelectedDriverConfig {
  departureTime: string;
  estimatedDurationMinutes: string;
}

export function RideDetailsDrawer({
  open,
  rideInstanceId,
  onOpenChange,
}: RideDetailsDrawerProps) {
  const queryClient = useQueryClient();
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, SelectedDriverConfig>>({});
  const [replicateDuration, setReplicateDuration] = useState<'7_days' | '1_month'>('7_days');

  const detailsQuery = useQuery({
    queryKey: adminQueryKeys.rideDetails(rideInstanceId ?? 'pending'),
    enabled: open && Boolean(rideInstanceId),
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

  const availableDriversQuery = useQuery({
    queryKey: adminQueryKeys.drivers({ rideInstanceId, source: 'ride-drawer', page: 1, limit: 100 }),
    enabled: open && Boolean(rideInstanceId),
    queryFn: async ({ signal }): Promise<DriverOption[]> => {
      const response = await apiRequest<{ items: DriverOption[] }>(
        `/api/admin/drivers?page=1&limit=100&rideInstanceId=${encodeURIComponent(rideInstanceId ?? '')}`,
        { signal }
      );
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load assignable drivers');
      }
      return response.data.items ?? [];
    },
  });

  const refreshQueries = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'rides'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'ride-details', rideInstanceId] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] }),
    ]);
  };

  const assignMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!rideInstanceId) throw new Error('Ride instance is required');
      const assignments = Object.entries(selectedDrivers).map(([driverId, config]) => ({
        driverId,
        departureTime: config.departureTime,
        estimatedDurationMinutes: Number(config.estimatedDurationMinutes),
      }));
      if (assignments.length === 0) throw new Error('Choose one or more drivers before assigning');
      const response = await apiRequest(`/api/admin/ride-instances/${rideInstanceId}/drivers`, {
        method: 'POST',
        body: JSON.stringify({ assignments }),
      });
      if (response.hasError) throw new Error(response.message || 'Unable to assign drivers');
    },
    onSuccess: async () => {
      setSelectedDrivers({});
      await refreshQueries();
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (driverId: string): Promise<void> => {
      if (!rideInstanceId) throw new Error('Ride instance is required');
      const response = await apiRequest(
        `/api/admin/ride-instances/${rideInstanceId}/drivers/${driverId}`,
        { method: 'DELETE' }
      );
      if (response.hasError) throw new Error(response.message || 'Unable to unassign driver');
    },
    onSuccess: refreshQueries,
  });

  const replicateMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!rideInstanceId) throw new Error('Ride instance is required');
      const response = await apiRequest('/api/admin/ride-instances/replicate', {
        method: 'POST',
        body: JSON.stringify({ sourceRideInstanceId: rideInstanceId, duration: replicateDuration }),
      });
      if (response.hasError) throw new Error(response.message || 'Unable to replicate ride templates');
    },
    onSuccess: refreshQueries,
  });

  const totalTokensConsumed = useMemo(
    () => detailsQuery.data?.bookings.reduce((sum, booking) => sum + (booking.tokenCost ?? 0), 0) ?? 0,
    [detailsQuery.data]
  );

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setSelectedDrivers({});
        onOpenChange(nextOpen);
      }}
      direction="right"
    >
      <DrawerContent className="left-auto right-0 top-0 h-screen w-[min(96vw,64rem)] mt-0 rounded-none rounded-l-2xl overflow-y-auto p-6">
        <DrawerHeader>
          <DrawerTitle>Ride Details</DrawerTitle>
          <DrawerDescription>
            Create the ride template first, then assign one or more drivers. Each assignment creates its own timed trip under this ride instance.
          </DrawerDescription>
        </DrawerHeader>

        {detailsQuery.isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : null}

        {detailsQuery.isError ? (
          <p className="py-4 text-sm text-destructive">{(detailsQuery.error as Error).message}</p>
        ) : null}

        {!detailsQuery.isLoading && detailsQuery.data ? (
          <div className="space-y-6 py-4">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ride</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{detailsQuery.data.ride.rideId}</p>
                <p className="text-xs text-muted-foreground">
                  {detailsQuery.data.ride.rideDate} · {detailsQuery.data.ride.timeSlot}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Route</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {detailsQuery.data.ride.route?.name ?? 'Unknown route'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {detailsQuery.data.ride.route
                    ? `${detailsQuery.data.ride.route.from_name} → ${detailsQuery.data.ride.route.to_name}`
                    : 'Route details unavailable'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{detailsQuery.data.ride.status}</p>
                <p className="text-xs text-muted-foreground">Template slot</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Trips Created</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{detailsQuery.data.ride.trips.length}</p>
                <p className="text-xs text-muted-foreground">
                  {detailsQuery.data.ride.drivers.length} assigned driver
                  {detailsQuery.data.ride.drivers.length === 1 ? '' : 's'}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Replicate This Template</h3>
                  <p className="text-sm text-muted-foreground">
                    Create future ride instances for this same slot and carry forward current driver assignments and trip timings.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-foreground">Range</span>
                    <select
                      className="rounded-lg border border-input bg-background px-3 py-2"
                      value={replicateDuration}
                      onChange={(event) => setReplicateDuration(event.target.value as '7_days' | '1_month')}
                    >
                      <option value="7_days">Next 7 days</option>
                      <option value="1_month">Next 1 month</option>
                    </select>
                  </label>
                  <Button onClick={() => void replicateMutation.mutateAsync()} disabled={replicateMutation.isPending}>
                    {replicateMutation.isPending ? 'Replicating...' : 'Replicate rides'}
                  </Button>
                </div>
              </div>
              {replicateMutation.isError ? (
                <p className="mt-2 text-sm text-destructive">{(replicateMutation.error as Error).message}</p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Driver Assignment Flow</h3>
                  <p className="text-sm text-muted-foreground">
                    Step 1: create the ride template. Step 2: pick eligible drivers below. Step 3: for each selected driver, enter a departure time and estimated duration. Each assignment creates one timed trip using the driver&apos;s active vehicle automatically.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                <div className="flex-1 rounded-xl border border-border bg-background p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Eligible Drivers</p>
                  <div className="mt-3 grid gap-2">
                    {(availableDriversQuery.data ?? []).map((driver) => {
                      const checked = Boolean(selectedDrivers[driver.id]);
                      return (
                        <div key={driver.id} className="rounded-lg border border-border px-3 py-2">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={checked}
                              onChange={(event) => {
                                setSelectedDrivers((current) => {
                                  if (event.target.checked) {
                                    return {
                                      ...current,
                                      [driver.id]: { departureTime: '06:30', estimatedDurationMinutes: '60' },
                                    };
                                  }
                                  const next = { ...current };
                                  delete next[driver.id];
                                  return next;
                                });
                              }}
                            />
                            <span className="text-sm">
                              <span className="block font-medium text-foreground">
                                {`${driver.firstName} ${driver.lastName}`.trim()}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {driver.assignedVehicle?.registrationNumber ?? 'No vehicle'}
                              </span>
                            </span>
                          </label>
                          {checked ? (
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <label className="text-xs">
                                <span className="mb-1 block font-medium text-foreground">Departure Time</span>
                                <input
                                  type="time"
                                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                  value={selectedDrivers[driver.id]?.departureTime ?? '06:30'}
                                  onChange={(event) =>
                                    setSelectedDrivers((current) => ({
                                      ...current,
                                      [driver.id]: {
                                        ...(current[driver.id] ?? { departureTime: '06:30', estimatedDurationMinutes: '60' }),
                                        departureTime: event.target.value,
                                      },
                                    }))
                                  }
                                />
                              </label>
                              <label className="text-xs">
                                <span className="mb-1 block font-medium text-foreground">Estimated Duration (mins)</span>
                                <input
                                  type="number"
                                  min={1}
                                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                  value={selectedDrivers[driver.id]?.estimatedDurationMinutes ?? '60'}
                                  onChange={(event) =>
                                    setSelectedDrivers((current) => ({
                                      ...current,
                                      [driver.id]: {
                                        ...(current[driver.id] ?? { departureTime: '06:30', estimatedDurationMinutes: '60' }),
                                        estimatedDurationMinutes: event.target.value,
                                      },
                                    }))
                                  }
                                />
                              </label>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Button
                  onClick={() => void assignMutation.mutateAsync()}
                  disabled={Object.keys(selectedDrivers).length === 0 || assignMutation.isPending}
                >
                  {assignMutation.isPending
                    ? 'Assigning...'
                    : `Assign ${Object.keys(selectedDrivers).length} Driver${Object.keys(selectedDrivers).length === 1 ? '' : 's'}`}
                </Button>
              </div>
              {availableDriversQuery.isError ? (
                <p className="mt-2 text-sm text-destructive">{(availableDriversQuery.error as Error).message}</p>
              ) : null}
              {!availableDriversQuery.isLoading && (availableDriversQuery.data?.length ?? 0) === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No eligible drivers available for this ride. Drivers shown here must already have active vehicle assignments and must not already be assigned to another ride instance in this same slot.
                </p>
              ) : null}

              <div className="mt-4 space-y-3">
                {detailsQuery.data.ride.drivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No drivers assigned yet.</p>
                ) : (
                  detailsQuery.data.ride.drivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {`${driver.first_name} ${driver.last_name}`.trim() || driver.email}
                        </p>
                        <p className="text-xs text-muted-foreground">Driver Trip ID: {driver.driverTripId}</p>
                        <p className="text-sm text-muted-foreground">{driver.phone ?? driver.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Vehicle:{' '}
                          {driver.assignedVehicle
                            ? `${driver.assignedVehicle.registrationNumber}${driver.assignedVehicle.model ? ` · ${driver.assignedVehicle.model}` : ''} · ${driver.assignedVehicle.capacity} seats`
                            : 'No active vehicle assignment'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => void unassignMutation.mutateAsync(driver.id)}
                        disabled={unassignMutation.isPending}
                      >
                        {unassignMutation.isPending ? 'Updating...' : 'Unassign'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Bookings</h3>
                  <p className="text-sm text-muted-foreground">Total tokens consumed: {totalTokensConsumed}</p>
                </div>
              </div>

              {detailsQuery.data.bookings.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No passengers booked for this ride yet.</p>
              ) : (
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
                      {detailsQuery.data.bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-foreground">
                              {`${booking.rider?.first_name ?? ''} ${booking.rider?.last_name ?? ''}`.trim() || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">{booking.rider?.email ?? '-'}</p>
                          </td>
                          <td className="px-3 py-3">{booking.pickupPoint?.name ?? '-'}</td>
                          <td className="px-3 py-3">{booking.status}</td>
                          <td className="px-3 py-3">{booking.tokenCost}</td>
                          <td className="px-3 py-3">{new Date(booking.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}