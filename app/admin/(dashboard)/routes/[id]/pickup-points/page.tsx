'use client';

import { useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, Edit, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PickupPointFormModal, { type PickupPointFormValues } from '@/components/admin/pickup-point-form-modal';
import GlobalConfirmationDialog from '@/components/global-confirmation-dialog';
import {
  adminPickupPointFormClientSchema,
  adminPickupReorderClientSchema,
  adminPickupRoutePathClientSchema,
} from '@/lib/frontend-validation/admin-pickup-points.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

interface PickupPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
  tokenModifier: number;
  updatedAt: string;
}

interface RouteDetails {
  id: string;
  name: string;
  fromName: string;
  toName: string;
  baseTokenCost: number;
}

const EMPTY_FORM: PickupPointFormValues = {
  name: '',
  latitude: '',
  longitude: '',
  orderIndex: '',
  tokenCost: '',
};

export default function PickupPointsPage(): ReactElement {
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const routeId = params.id;
  const routeValidation = validateOrReject(
    adminPickupRoutePathClientSchema,
    { routeId },
    'Invalid route ID.'
  );
  const validRouteId = routeValidation.isValid ? routeValidation.data?.routeId ?? '' : '';

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<PickupPointFormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const routeQuery = useQuery({
    queryKey: adminQueryKeys.routeDetail(validRouteId),
    enabled: Boolean(validRouteId),
    queryFn: async (): Promise<RouteDetails> => {
      const response = await apiRequest<RouteDetails>(`/api/admin/routes/${validRouteId}`);
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load route');
      }
      return response.data;
    },
  });

  const pickupQuery = useQuery({
    queryKey: adminQueryKeys.pickupPoints(validRouteId),
    enabled: Boolean(validRouteId),
    queryFn: async (): Promise<PickupPoint[]> => {
      const response = await apiRequest<PickupPoint[]>(`/api/admin/routes/${validRouteId}/pickup-points`);
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load pickup points');
      }

      return response.data.map((item: any) => ({
        ...item,
        sequence: item.sequence ?? item.orderIndex,
        tokenModifier: item.tokenModifier ?? item.tokenCost,
      }));
    },
  });

  const sortedPoints = useMemo(
    () => [...(pickupQuery.data ?? [])].sort((a, b) => a.sequence - b.sequence),
    [pickupQuery.data]
  );

  const saveMutation = useMutation({
    mutationFn: async (values: PickupPointFormValues): Promise<void> => {
      setFormErrors({});
      const validation = validateOrReject(
        adminPickupPointFormClientSchema,
        {
          name: values.name,
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
          sequence: Number(values.orderIndex),
          tokenModifier: Number(values.tokenCost),
        },
        'Please correct pickup point form errors.'
      );
      if (!validation.isValid) {
        setFormErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid pickup point payload');
      }

      setClientFormError(null);
      const payload = {
        name: validation.data?.name,
        latitude: validation.data?.latitude,
        longitude: validation.data?.longitude,
        orderIndex: validation.data?.sequence,
        tokenCost: validation.data?.tokenModifier,
      };

      const response = await apiRequest<PickupPoint>(
        modalMode === 'create'
          ? `/api/admin/routes/${validRouteId}/pickup-points`
          : `/api/admin/routes/${validRouteId}/pickup-points/${editingId}`,
        {
          method: modalMode === 'create' ? 'POST' : 'PATCH',
          body: JSON.stringify(payload),
        }
      );

      if (response.hasError) {
        setFormErrors(response.errors ?? {});
        throw new Error(response.message || 'Unable to save pickup point');
      }
    },
    onSuccess: async () => {
      setModalOpen(false);
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.pickupPoints(validRouteId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (pickupPointId: string): Promise<void> => {
      const response = await apiRequest<{ deleted: boolean }>(
        `/api/admin/routes/${validRouteId}/pickup-points/${pickupPointId}`,
        { method: 'DELETE' }
      );
      if (response.hasError) {
        throw new Error(response.message || 'Unable to delete pickup point');
      }
    },
    onSuccess: async () => {
      setDeletingId(null);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.pickupPoints(validRouteId) });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: Array<{ id: string; sequence: number }>): Promise<void> => {
      const validation = validateOrReject(
        adminPickupReorderClientSchema,
        { items },
        'Pickup point reorder payload is invalid.'
      );
      if (!validation.isValid) {
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid reorder payload');
      }

      setClientFormError(null);
      const response = await apiRequest(`/api/admin/routes/${validRouteId}/pickup-points/reorder`, {
        method: 'PATCH',
        body: JSON.stringify(validation.data),
      });
      if (response.hasError) {
        throw new Error(response.message || 'Unable to reorder pickup points');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.pickupPoints(validRouteId) });
    },
  });

  function openCreate(): void {
    setModalMode('create');
    setEditingId(null);
    setFormValues({
      ...EMPTY_FORM,
      orderIndex: String(sortedPoints.length + 1),
      tokenCost: String(routeQuery.data?.baseTokenCost ?? 0),
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(point: PickupPoint): void {
    setModalMode('edit');
    setEditingId(point.id);
    setFormValues({
      name: point.name,
      latitude: String(point.latitude),
      longitude: String(point.longitude),
      orderIndex: String(point.sequence),
      tokenCost: String(point.tokenModifier),
    });
    setFormErrors({});
    setModalOpen(true);
  }

  async function movePoint(pointId: string, direction: 'up' | 'down'): Promise<void> {
    const index = sortedPoints.findIndex((item) => item.id === pointId);
    if (index === -1) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= sortedPoints.length) return;

    const reordered = [...sortedPoints];
    const [current] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, current);

    const items = reordered.map((item, idx) => ({ id: item.id, sequence: idx + 1 }));
    await reorderMutation.mutateAsync(items);
  }

  const isLoading = routeQuery.isLoading || pickupQuery.isLoading;
  const loadError =
    clientFormError ??
    (routeValidation.isValid ? null : routeValidation.formMessage) ??
    (routeQuery.error as Error | null)?.message ??
    (pickupQuery.error as Error | null)?.message;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" asChild>
            <Link href="/admin/routes">
              <ArrowLeft className="h-4 w-4" />
              Back to Routes
            </Link>
          </Button>
          <h2 className="mt-3 text-2xl font-bold font-mono text-foreground">Pickup Points</h2>
          {routeQuery.data ? (
            <p className="text-sm text-muted-foreground">
              {routeQuery.data.name} | {routeQuery.data.fromName} {'->'} {routeQuery.data.toName} | Base token: {routeQuery.data.baseTokenCost}
            </p>
          ) : null}
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Pickup Point
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={`pickup-skeleton-${idx}`} className="h-10 w-full" />
            ))}
          </div>
        ) : null}
        {clientFormError ? <p className="text-sm text-destructive">{clientFormError}</p> : null}
        {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

        {!isLoading && !loadError && sortedPoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pickup points configured yet.</p>
        ) : null}

        {!isLoading && !loadError && sortedPoints.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Latitude</th>
                  <th className="px-3 py-2">Longitude</th>
                  <th className="px-3 py-2">Token Modifier</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedPoints.map((point, index) => (
                  <tr key={point.id}>
                    <td className="px-3 py-3">{point.sequence}</td>
                    <td className="px-3 py-3 font-semibold text-foreground">{point.name}</td>
                    <td className="px-3 py-3">{point.latitude}</td>
                    <td className="px-3 py-3">{point.longitude}</td>
                    <td className="px-3 py-3">{point.tokenModifier}</td>
                    <td className="px-3 py-3">{new Date(point.updatedAt).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => void movePoint(point.id, 'up')} disabled={index === 0 || reorderMutation.isPending}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void movePoint(point.id, 'down')}
                          disabled={index === sortedPoints.length - 1 || reorderMutation.isPending}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(point)}>
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeletingId(point.id)}>
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <PickupPointFormModal
        open={modalOpen}
        mode={modalMode}
        initialValues={formValues}
        loading={saveMutation.isPending}
        errors={formErrors}
        onClose={() => setModalOpen(false)}
        onSubmit={(values) => void saveMutation.mutateAsync(values)}
      />

      <GlobalConfirmationDialog
        open={Boolean(deletingId)}
        onOpenChange={(next) => {
          if (!next) setDeletingId(null);
        }}
        title="Delete pickup point"
        description="This stop will be removed from the route."
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        onConfirm={() => {
          if (deletingId) {
            void deleteMutation.mutateAsync(deletingId);
          }
        }}
      />
    </div>
  );
}
