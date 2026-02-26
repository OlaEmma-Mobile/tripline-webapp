'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit, Plus } from 'lucide-react';
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
import { adminVehicleFormClientSchema, adminVehicleToggleClientSchema } from '@/lib/frontend-validation/admin-vehicles.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

interface VehicleItem {
  id: string;
  providerId: string | null;
  registrationNumber: string;
  model: string | null;
  capacity: number;
  status: 'active' | 'inactive' | 'maintenance';
}

interface VehiclesPayload {
  items: VehicleItem[];
  total: number;
}

const EMPTY_FORM = {
  registrationNumber: '',
  model: '',
  capacity: '14',
  status: 'active' as 'active' | 'inactive' | 'maintenance',
};

export default function AdminVehiclesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [pendingVehicleId, setPendingVehicleId] = useState<string | null>(null);

  const vehiclesQuery = useQuery({
    queryKey: adminQueryKeys.vehicles({ page: 1, limit: 100 }),
    queryFn: async (): Promise<VehiclesPayload> => {
      const response = await apiRequest<VehiclesPayload>('/api/admin/vehicles?page=1&limit=100');
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load vehicles');
      }
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      setFormErrors({});
      const validation = validateOrReject(
        adminVehicleFormClientSchema,
        {
          registrationNumber: form.registrationNumber,
          model: form.model || undefined,
          capacity: Number(form.capacity),
          status: form.status,
        },
        'Please correct vehicle form errors.'
      );
      if (!validation.isValid) {
        setFormErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid vehicle payload');
      }

      setClientFormError(null);
      const payload = {
        registrationNumber: validation.data?.registrationNumber,
        model: validation.data?.model,
        capacity: validation.data?.capacity,
        status: validation.data?.status,
      };

      const response = await apiRequest(
        mode === 'create' ? '/api/admin/vehicles' : `/api/admin/vehicles/${editingId}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          body: JSON.stringify(payload),
        }
      );

      if (response.hasError) {
        setFormErrors(response.errors ?? {});
        throw new Error(response.message || 'Unable to save vehicle');
      }
    },
    onSuccess: async () => {
      setOpen(false);
      setForm(EMPTY_FORM);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'vehicles'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (vehicle: VehicleItem): Promise<void> => {
      const nextStatus = vehicle.status === 'active' ? 'inactive' : 'active';
      const validation = validateOrReject(
        adminVehicleToggleClientSchema,
        { id: vehicle.id, status: nextStatus },
        'Invalid vehicle status update.'
      );
      if (!validation.isValid) {
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid vehicle status payload');
      }

      setClientFormError(null);
      const response = await apiRequest(`/api/admin/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: validation.data?.status }),
      });
      if (response.hasError) {
        throw new Error(response.message || 'Unable to update vehicle status');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'vehicles'] });
    },
  });

  const items = vehiclesQuery.data?.items ?? [];

  function openCreate(): void {
    setMode('create');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setOpen(true);
  }

  function openEdit(vehicle: VehicleItem): void {
    setMode('edit');
    setEditingId(vehicle.id);
    setForm({
      registrationNumber: vehicle.registrationNumber,
      model: vehicle.model ?? '',
      capacity: String(vehicle.capacity),
      status: vehicle.status,
    });
    setFormErrors({});
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-foreground">Vehicles</h2>
          <p className="text-sm text-muted-foreground">Fleet status and capacity control.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        {clientFormError ? <p className="text-sm text-destructive">{clientFormError}</p> : null}
        {vehiclesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={`vehicles-skeleton-${idx}`} className="h-10 w-full" />
            ))}
          </div>
        ) : null}
        {vehiclesQuery.isError ? <p className="text-sm text-destructive">{(vehiclesQuery.error as Error).message}</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">Registration</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Capacity</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {items.map((vehicle) => (
                  <motion.tr key={vehicle.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {(() => {
                    const rowBusy = pendingVehicleId === vehicle.id;
                    return (
                      <>
                  <td className="px-3 py-3">{vehicle.registrationNumber}</td>
                  <td className="px-3 py-3">{vehicle.model ?? '-'}</td>
                  <td className="px-3 py-3">{vehicle.capacity}</td>
                  <td className="px-3 py-3">{vehicle.status}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(vehicle)} disabled={rowBusy}>
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void (async () => {
                            setPendingVehicleId(vehicle.id);
                            try {
                              await toggleMutation.mutateAsync(vehicle);
                            } finally {
                              setPendingVehicleId((current) => (current === vehicle.id ? null : current));
                            }
                          })()
                        }
                        disabled={rowBusy}
                      >
                        {rowBusy ? 'Updating...' : vehicle.status === 'active' ? 'Deactivate' : 'Activate'}
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
            <DialogTitle>{mode === 'create' ? 'Add vehicle' : 'Edit vehicle'}</DialogTitle>
            <DialogDescription>
              Configure registration, model, capacity, and operational status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {formErrors._form ? <p className="text-sm text-destructive">{formErrors._form[0]}</p> : null}
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Registration Number</span>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                value={form.registrationNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, registrationNumber: event.target.value }))}
              />
              {formErrors.registrationNumber ? <span className="text-xs text-destructive">{formErrors.registrationNumber[0]}</span> : null}
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Model</span>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                value={form.model}
                onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Capacity</span>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                type="number"
                value={form.capacity}
                onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
              />
              {formErrors.capacity ? <span className="text-xs text-destructive">{formErrors.capacity[0]}</span> : null}
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Status</span>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' | 'maintenance' }))}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="maintenance">maintenance</option>
              </select>
              {formErrors.status ? <span className="text-xs text-destructive">{formErrors.status[0]}</span> : null}
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveMutation.mutateAsync()}>{saveMutation.isPending ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
