'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Car, Edit, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  adminDriverAssignVehicleClientSchema,
  adminDriverCreateClientSchema,
  adminDriverUpdateClientSchema,
} from '@/lib/frontend-validation/admin-drivers.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

interface DriverItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'restricted';
  kycStatus: 'pending' | 'verified' | 'rejected' | null;
  assignedVehicle: {
    assignmentId: string;
    vehicleId: string;
    registrationNumber: string;
    assignedAt: string;
  } | null;
}

interface VehicleItem {
  id: string;
  registrationNumber: string;
  status: string;
}

interface DriversPayload {
  items: DriverItem[];
  total: number;
}

interface VehiclesPayload {
  items: VehicleItem[];
  total: number;
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  status: 'active' as 'active' | 'inactive' | 'restricted',
};

export default function AdminDriversPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDriverId, setAssignDriverId] = useState<string | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState<string>('');
  const [pendingDriverAction, setPendingDriverAction] = useState<{ driverId: string; action: 'assign' | 'unassign' } | null>(null);

  const driversQuery = useQuery({
    queryKey: adminQueryKeys.drivers({ page: 1, limit: 100 }),
    queryFn: async (): Promise<DriversPayload> => {
      const response = await apiRequest<DriversPayload>('/api/admin/drivers?page=1&limit=100');
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load drivers');
      }
      return response.data;
    },
  });

  const vehiclesQuery = useQuery({
    queryKey: adminQueryKeys.vehicles({ page: 1, limit: 100, status: 'active' }),
    queryFn: async (): Promise<VehiclesPayload> => {
      const response = await apiRequest<VehiclesPayload>('/api/admin/vehicles?page=1&limit=100&status=active');
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load active vehicles');
      }
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      setFormErrors({});
      const basePayload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        status: form.status,
      };

      const payload =
        mode === 'create'
          ? (() => {
              const validation = validateOrReject(
                adminDriverCreateClientSchema,
                { ...basePayload, password: form.password },
                'Please correct driver form errors.'
              );
              if (!validation.isValid) {
                setFormErrors(validation.fieldErrors);
                setClientFieldErrors(validation.fieldErrors);
                setClientFormError(validation.formMessage);
                throw new Error(validation.formMessage ?? 'Invalid driver payload');
              }
              const parsed = validation.data;
              if (!parsed) {
                throw new Error('Invalid driver payload');
              }
              return {
                firstName: parsed.firstName,
                lastName: parsed.lastName,
                email: parsed.email,
                phone: parsed.phone || undefined,
                password: parsed.password,
                status: parsed.status,
              };
            })()
          : (() => {
              const validation = validateOrReject(
                adminDriverUpdateClientSchema,
                basePayload,
                'Please correct driver form errors.'
              );
              if (!validation.isValid) {
                setFormErrors(validation.fieldErrors);
                setClientFieldErrors(validation.fieldErrors);
                setClientFormError(validation.formMessage);
                throw new Error(validation.formMessage ?? 'Invalid driver payload');
              }
              const parsed = validation.data;
              if (!parsed) {
                throw new Error('Invalid driver payload');
              }
              return {
                firstName: parsed.firstName,
                lastName: parsed.lastName,
                email: parsed.email,
                phone: parsed.phone || undefined,
                status: parsed.status,
              };
            })();

      setClientFieldErrors({});
      setClientFormError(null);

      const response = await apiRequest(
        mode === 'create' ? '/api/admin/drivers' : `/api/admin/drivers/${editingId}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          body: JSON.stringify(payload),
        }
      );

      if (response.hasError) {
        setFormErrors(response.errors ?? {});
        throw new Error(response.message || 'Unable to save driver');
      }
    },
    onSuccess: async () => {
      setOpen(false);
      setForm(EMPTY_FORM);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const validation = validateOrReject(
        adminDriverAssignVehicleClientSchema,
        { driverId: assignDriverId, vehicleId: assignVehicleId },
        'Select both driver and vehicle.'
      );
      if (!validation.isValid) {
        setClientFieldErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid assignment payload');
      }

      setClientFieldErrors({});
      setClientFormError(null);
      const response = await apiRequest('/api/admin/assignments/driver-vehicle', {
        method: 'POST',
        body: JSON.stringify(validation.data),
      });
      if (response.hasError) {
        throw new Error(response.message || 'Unable to assign vehicle');
      }
    },
    onSuccess: async () => {
      setAssignOpen(false);
      setAssignDriverId(null);
      setAssignVehicleId('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (assignmentId: string): Promise<void> => {
      const response = await apiRequest(`/api/admin/assignments/driver-vehicle/${assignmentId}/end`, {
        method: 'POST',
      });
      if (response.hasError) {
        throw new Error(response.message || 'Unable to unassign vehicle');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
    },
  });

  const items = driversQuery.data?.items ?? [];
  const vehicles = vehiclesQuery.data?.items ?? [];
  const unavailableVehicleIds = new Set(
    items
      .filter((driver) => driver.assignedVehicle?.vehicleId && driver.id !== assignDriverId)
      .map((driver) => driver.assignedVehicle?.vehicleId as string)
  );
  const assignableVehicles = vehicles.filter((vehicle) => !unavailableVehicleIds.has(vehicle.id));

  function openCreate(): void {
    setMode('create');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setOpen(true);
  }

  function openEdit(driver: DriverItem): void {
    setMode('edit');
    setEditingId(driver.id);
    setForm({
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phone: driver.phone ?? '',
      password: '',
      status: driver.status,
    });
    setFormErrors({});
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-mono">Drivers</h2>
          <p className="text-sm text-muted-foreground">Onboard drivers and assign vehicles for operations.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add driver
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        {clientFormError ? <p className="text-sm text-destructive">{clientFormError}</p> : null}
        {driversQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={`drivers-skeleton-${idx}`} className="h-10 w-full" />
            ))}
          </div>
        ) : null}
        {driversQuery.isError ? <p className="text-sm text-destructive">{(driversQuery.error as Error).message}</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Assigned Vehicle</th>
                <th className="px-3 py-2">KYC</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {items.map((driver) => (
                  <motion.tr key={driver.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {(() => {
                      const rowBusy = pendingDriverAction?.driverId === driver.id;
                      return (
                        <>
                  <td className="px-3 py-3 font-semibold text-foreground">{`${driver.firstName} ${driver.lastName}`}</td>
                  <td className="px-3 py-3">{driver.email}</td>
                  <td className="px-3 py-3">{driver.phone ?? '-'}</td>
                  <td className="px-3 py-3">{driver.status}</td>
                  <td className="px-3 py-3">{driver.assignedVehicle?.registrationNumber ?? 'Unassigned'}</td>
                  <td className="px-3 py-3">{driver.kycStatus ?? 'none'}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(driver)} disabled={rowBusy}>
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const assignmentId = driver.assignedVehicle?.assignmentId;
                          if (assignmentId) {
                            void (async () => {
                              setPendingDriverAction({ driverId: driver.id, action: 'unassign' });
                              try {
                                await unassignMutation.mutateAsync(assignmentId);
                              } finally {
                                setPendingDriverAction((current) =>
                                  current?.driverId === driver.id ? null : current
                                );
                              }
                            })();
                            return;
                          }
                          setAssignDriverId(driver.id);
                          setAssignOpen(true);
                        }}
                        disabled={rowBusy}
                      >
                        <Car className="h-3.5 w-3.5" />{' '}
                        {rowBusy
                          ? pendingDriverAction?.action === 'unassign'
                            ? 'Unassigning...'
                            : 'Assigning...'
                          : driver.assignedVehicle
                            ? 'Unassign vehicle'
                            : 'Assign vehicle'}
                      </Button>
                    </div>
                  </td>
                        </>
                      );
                    })()}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Add driver' : 'Edit driver'}</DialogTitle>
            <DialogDescription>Capture profile details and driver account status.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {formErrors._form ? <p className="text-sm text-destructive">{formErrors._form[0]}</p> : null}
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="First name" value={form.firstName} onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))} />
            {formErrors.firstName ? <p className="text-xs text-destructive">{formErrors.firstName[0]}</p> : null}
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Last name" value={form.lastName} onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))} />
            {formErrors.lastName ? <p className="text-xs text-destructive">{formErrors.lastName[0]}</p> : null}
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
            {formErrors.email ? <p className="text-xs text-destructive">{formErrors.email[0]}</p> : null}
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
            {formErrors.phone ? <p className="text-xs text-destructive">{formErrors.phone[0]}</p> : null}
            {mode === 'create' ? (
              <>
                <input className="w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Password" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
                {formErrors.password ? <p className="text-xs text-destructive">{formErrors.password[0]}</p> : null}
              </>
            ) : null}
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' | 'restricted' }))}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="restricted">restricted</option>
            </select>
            {formErrors.status ? <p className="text-xs text-destructive">{formErrors.status[0]}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveMutation.mutateAsync()}>{saveMutation.isPending ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign vehicle</DialogTitle>
            <DialogDescription>Assign selected driver to an active vehicle.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
              value={assignVehicleId}
              onChange={(event) => setAssignVehicleId(event.target.value)}
            >
              <option value="">Select vehicle</option>
              {assignableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.registrationNumber}</option>
              ))}
            </select>
            {assignableVehicles.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No unassigned active vehicles available.</p>
            ) : null}
            {clientFieldErrors.driverId ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.driverId[0]}</p> : null}
            {clientFieldErrors.vehicleId ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.vehicleId[0]}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                void (async () => {
                  if (!assignDriverId) return;
                  setPendingDriverAction({ driverId: assignDriverId, action: 'assign' });
                  try {
                    await assignMutation.mutateAsync();
                  } finally {
                    setPendingDriverAction((current) =>
                      current?.driverId === assignDriverId ? null : current
                    );
                  }
                })()
              }
              disabled={!assignVehicleId || assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
