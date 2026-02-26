'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  adminRideCreateClientSchema,
  adminRidesFilterClientSchema,
  adminRideStatusUpdateClientSchema,
} from '@/lib/frontend-validation/admin-rides.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

interface RideRow {
  id: string;
  routeName?: string;
  departureTime: string;
  rideDate: string;
  driverName?: string | null;
  vehiclePlate?: string;
  availableSeats: number;
  status: string;
  pickupPointsCount?: number;
}

interface RideListPayload {
  items: RideRow[];
  total: number;
}

interface DriversPayload {
  items: SimpleOption[];
  total: number;
}

interface SimpleOption {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  assignedVehicle?: {
    vehicleId: string;
    registrationNumber: string;
    assignedAt: string;
  } | null;
}

export default function AdminRidesPage() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const queryClient = useQueryClient();
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string[]>>({});
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    routeId: '',
    driverId: '',
    rideDate: today,
    departureTime: '06:30',
  });
  const [pendingRideAction, setPendingRideAction] = useState<{ rideId: string; action: 'boarding' | 'cancel' | 'delete' } | null>(null);

  const ridesQuery = useQuery({
    queryKey: adminQueryKeys.rides({ date, status, page, limit }),
    queryFn: async ({ signal }): Promise<RideListPayload> => {
      const filterValidation = validateOrReject(
        adminRidesFilterClientSchema,
        { date, status, page, limit },
        'Please provide valid ride filters.'
      );
      if (!filterValidation.isValid) {
        setClientFieldErrors(filterValidation.fieldErrors);
        setClientFormError(filterValidation.formMessage);
        throw new Error(filterValidation.formMessage ?? 'Invalid date filter');
      }
      setClientFieldErrors({});
      setClientFormError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (date) params.set('rideDate', date);
      if (status) params.set('status', status);
      const response = await apiRequest<RideListPayload>(`/api/admin/ride-instances?${params.toString()}`, {
        signal,
      });
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load rides');
      }
      return {
        total: response.data.total,
        items: (response.data.items ?? []).map((item: any) => ({
          id: item.id ?? item.rideInstanceId ?? item.ride_instance_id,
          routeName: item.routeName ?? item.route_name,
          departureTime: item.departureTime ?? item.departure_time,
          rideDate: item.rideDate ?? item.ride_date,
          driverName: item.driverName ?? item.driver_name ?? null,
          vehiclePlate: item.vehiclePlate ?? item.vehicle_plate,
          availableSeats: item.availableSeats ?? item.available_seats ?? 0,
          status: item.status,
          pickupPointsCount: item.pickupPointsCount ?? item.pickup_points_count ?? 0,
        })),
      };
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }): Promise<void> => {
      const validation = validateOrReject(
        adminRideStatusUpdateClientSchema,
        { id, status },
        'Invalid ride status update payload.'
      );
      if (!validation.isValid) {
        setClientFieldErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid ride status payload');
      }

      setClientFieldErrors({});
      setClientFormError(null);
      const response = await apiRequest(`/api/admin/ride-instances/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: validation.data?.status }),
      });
      if (response.hasError) {
        throw new Error(response.message || 'Unable to update ride status');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.rides({ date, status, page, limit }) });
    },
  });

  const deleteCancelledMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await apiRequest(`/api/admin/ride-instances/${id}`, {
        method: 'DELETE',
      });
      if (response.hasError) {
        throw new Error(response.message || 'Unable to delete cancelled ride');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.rides({ date, status, page, limit }) });
    },
  });

  const routesQuery = useQuery({
    queryKey: adminQueryKeys.routes({ status: 'active' }),
    queryFn: async ({ signal }): Promise<SimpleOption[]> => {
      const response = await apiRequest<{ items: SimpleOption[] }>(
        '/api/admin/routes?page=1&limit=100&status=active',
        { signal }
      );
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load routes');
      }
      return response.data.items;
    },
  });

  const driversQuery = useQuery({
    queryKey: adminQueryKeys.drivers({ page: 1, limit: 100, source: 'ride-create' }),
    queryFn: async ({ signal }): Promise<DriversPayload> => {
      const response = await apiRequest<DriversPayload>(
        '/api/admin/drivers?page=1&limit=100',
        { signal }
      );
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load drivers');
      }
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const validation = validateOrReject(
        adminRideCreateClientSchema,
        createForm,
        'Please correct create-ride form errors.'
      );
      if (!validation.isValid) {
        setCreateFieldErrors(validation.fieldErrors);
        setCreateFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid create ride payload');
      }

      setCreateFieldErrors({});
      setCreateFormError(null);

      if (!selectedDriver?.assignedVehicle?.vehicleId) {
        setCreateFieldErrors({ driverId: ['Selected driver must have an assigned vehicle'] });
        setCreateFormError('Selected driver must have an assigned vehicle.');
        throw new Error('Selected driver must have an assigned vehicle.');
      }

      const response = await apiRequest('/api/admin/ride-instances', {
        method: 'POST',
        body: JSON.stringify({
          routeId: validation.data?.routeId,
          vehicleId: selectedDriver?.assignedVehicle?.vehicleId,
          driverId: validation.data?.driverId,
          rideDate: validation.data?.rideDate,
          departureTime: validation.data?.departureTime,
        }),
      });

      if (response.hasError) {
        setCreateFieldErrors(response.errors ?? {});
        throw new Error(response.message || 'Unable to create ride instance');
      }
    },
    onSuccess: async () => {
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.rides({ date }) });
    },
  });

  const items = ridesQuery.data?.items ?? [];
  const total = ridesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const routeOptions = routesQuery.data ?? [];
  const driverOptions = (driversQuery.data?.items ?? []).filter((driver) =>
    Boolean(driver.assignedVehicle?.vehicleId)
  );
  const selectedDriver = driverOptions.find((driver) => driver.id === createForm.driverId);

  function getRideStatusClass(statusValue: string): string {
    switch (statusValue) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'boarding':
        return 'bg-amber-100 text-amber-700';
      case 'departed':
        return 'bg-violet-100 text-violet-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-muted text-foreground';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-foreground">Ride Instances</h2>
          <p className="text-sm text-muted-foreground">Operational departures per day.</p>
        </div>
        <div className="flex items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setPage(1);
                setDate(event.target.value);
              }}
              className="rounded-lg border border-input bg-background px-3 py-2"
            />
            {clientFieldErrors.date ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.date[0]}</p> : null}
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Status</span>
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
              className="rounded-lg border border-input bg-background px-3 py-2"
            >
              <option value="">All</option>
              <option value="scheduled">scheduled</option>
              <option value="boarding">boarding</option>
              <option value="departed">departed</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
            </select>
            {clientFieldErrors.status ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.status[0]}</p> : null}
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Per Page</span>
            <select
              value={limit}
              onChange={(event) => {
                setPage(1);
                setLimit(Number(event.target.value));
              }}
              className="rounded-lg border border-input bg-background px-3 py-2"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <Button
            onClick={() => {
              setCreateFieldErrors({});
              setCreateFormError(null);
              setCreateForm((prev) => ({ ...prev, rideDate: date || today }));
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Create Ride Instance
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        {clientFormError ? <p className="text-sm text-destructive">{clientFormError}</p> : null}
        {ridesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={`ride-skeleton-${idx}`} className="h-10 w-full" />
            ))}
          </div>
        ) : null}
        {ridesQuery.isError ? <p className="text-sm text-destructive">{(ridesQuery.error as Error).message}</p> : null}
        {!ridesQuery.isLoading && !ridesQuery.isError && items.length === 0 ? <p className="text-sm text-muted-foreground">No rides for this date.</p> : null}

        {!ridesQuery.isLoading && !ridesQuery.isError && items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2">Route</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Driver</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Available Seats</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Stops</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((ride) => (
                  <tr key={ride.id}>
                    {(() => {
                      const rowBusy = pendingRideAction?.rideId === ride.id;
                      return (
                        <>
                    <td className="px-3 py-3">{ride.routeName ?? '-'}</td>
                    <td className="px-3 py-3">{ride.rideDate}</td>
                    <td className="px-3 py-3">{ride.departureTime}</td>
                    <td className="px-3 py-3">{ride.driverName ?? '-'}</td>
                    <td className="px-3 py-3">{ride.vehiclePlate ?? '-'}</td>
                    <td className="px-3 py-3">{ride.availableSeats}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs ${getRideStatusClass(ride.status)}`}>{ride.status}</span>
                    </td>
                    <td className="px-3 py-3">{ride.pickupPointsCount ?? 0}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild disabled={rowBusy}>
                          <Link href={`/admin/rides/${ride.id}`}>Live monitor</Link>
                        </Button>
                        {ride.status !== 'cancelled' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void (async () => {
                                  setPendingRideAction({ rideId: ride.id, action: 'boarding' });
                                  try {
                                    await statusMutation.mutateAsync({ id: ride.id, status: 'boarding' });
                                  } finally {
                                    setPendingRideAction((current) =>
                                      current?.rideId === ride.id ? null : current
                                    );
                                  }
                                })()
                              }
                              disabled={!ride.id || rowBusy}
                            >
                              {rowBusy && pendingRideAction?.action === 'boarding' ? 'Updating...' : 'Boarding'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                void (async () => {
                                  setPendingRideAction({ rideId: ride.id, action: 'cancel' });
                                  try {
                                    await statusMutation.mutateAsync({ id: ride.id, status: 'cancelled' });
                                  } finally {
                                    setPendingRideAction((current) =>
                                      current?.rideId === ride.id ? null : current
                                    );
                                  }
                                })()
                              }
                              disabled={!ride.id || rowBusy}
                            >
                              {rowBusy && pendingRideAction?.action === 'cancel' ? 'Updating...' : 'Cancel'}
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              void (async () => {
                                setPendingRideAction({ rideId: ride.id, action: 'delete' });
                                try {
                                  await deleteCancelledMutation.mutateAsync(ride.id);
                                } finally {
                                  setPendingRideAction((current) =>
                                    current?.rideId === ride.id ? null : current
                                  );
                                }
                              })()
                            }
                            disabled={!ride.id || rowBusy}
                          >
                            <Trash2 className="h-3.5 w-3.5" />{' '}
                            {rowBusy && pendingRideAction?.action === 'delete' ? 'Deleting...' : 'Delete'}
                          </Button>
                        )}
                      </div>
                    </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Showing page {page} of {totalPages} ({total} total rides)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || ridesQuery.isFetching}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || ridesQuery.isFetching}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <DialogRoot open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Ride Instance</DialogTitle>
            <DialogDescription>Create one departure slot for a specific route/date/time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {createFormError ? <p className="text-sm text-destructive">{createFormError}</p> : null}
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Route</span>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                value={createForm.routeId}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, routeId: event.target.value }))}
              >
                <option value="">Select route</option>
                {routeOptions.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name ?? route.id}
                  </option>
                ))}
              </select>
              {createFieldErrors.routeId ? <p className="mt-1 text-xs text-destructive">{createFieldErrors.routeId[0]}</p> : null}
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Driver</span>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                value={createForm.driverId}
                onChange={(event) => {
                  const nextDriverId = event.target.value;
                  setCreateForm((prev) => ({
                    ...prev,
                    driverId: nextDriverId,
                  }));
                }}
              >
                <option value="">Select assigned driver</option>
                {driverOptions.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {`${[driver.firstName, driver.lastName].filter(Boolean).join(' ') || driver.id}${
                      driver.assignedVehicle?.registrationNumber
                        ? ` (${driver.assignedVehicle.registrationNumber})`
                        : ' (No vehicle)'
                    }`}
                  </option>
                ))}
              </select>
              {createFieldErrors.driverId ? <p className="mt-1 text-xs text-destructive">{createFieldErrors.driverId[0]}</p> : null}
              {selectedDriver?.assignedVehicle?.registrationNumber ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Vehicle will be auto-used: {selectedDriver.assignedVehicle.registrationNumber}
                </p>
              ) : null}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Ride Date</span>
                <input
                  type="date"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                  value={createForm.rideDate}
                  min={today}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, rideDate: event.target.value }))}
                />
                {createFieldErrors.rideDate ? <p className="mt-1 text-xs text-destructive">{createFieldErrors.rideDate[0]}</p> : null}
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Departure Time</span>
                <input
                  type="time"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                  value={createForm.departureTime.slice(0, 5)}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, departureTime: event.target.value }))}
                />
                {createFieldErrors.departureTime ? <p className="mt-1 text-xs text-destructive">{createFieldErrors.departureTime[0]}</p> : null}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => void createMutation.mutateAsync()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Ride'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
