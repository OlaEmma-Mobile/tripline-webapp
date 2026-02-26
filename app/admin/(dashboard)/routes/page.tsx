'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import GlobalConfirmationDialog from '@/components/global-confirmation-dialog';
import RouteFormModal, { type RouteFormValues } from '@/components/admin/route-form-modal';
import { adminRouteFormClientSchema, adminRoutesFilterClientSchema } from '@/lib/frontend-validation/admin-routes.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

interface RouteItem {
  id: string;
  name: string;
  fromName: string;
  toName: string;
  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
  baseTokenCost: number;
  status: 'active' | 'inactive';
  pickupPointsCount?: number;
  updatedAt: string;
  matchedPickupPoints?: Array<{ id: string; name: string }>;
}

interface RouteListResponse {
  items: RouteItem[];
  total: number;
}

const EMPTY_FORM: RouteFormValues = {
  name: '',
  fromName: '',
  fromLatitude: '',
  fromLongitude: '',
  toName: '',
  toLatitude: '',
  toLongitude: '',
  baseTokenCost: '',
  status: 'active',
};

export default function RoutesPage(): ReactElement {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formValues, setFormValues] = useState<RouteFormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);
  const [pendingRouteAction, setPendingRouteAction] = useState<{ routeId: string; action: 'toggle' | 'delete' } | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const routeFilters = useMemo(
    () => ({ q: debouncedQuery, status: statusFilter }),
    [debouncedQuery, statusFilter]
  );

  const routesQuery = useQuery({
    queryKey: adminQueryKeys.routes(routeFilters),
    queryFn: async (): Promise<RouteListResponse> => {
      const filterValidation = validateOrReject(
        adminRoutesFilterClientSchema,
        { q: debouncedQuery, status: statusFilter },
        'Invalid route filters.'
      );
      if (!filterValidation.isValid) {
        setClientFormError(filterValidation.formMessage);
        throw new Error(filterValidation.formMessage ?? 'Invalid route filters.');
      }
      setClientFormError(null);

      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);

      let path = `/api/admin/routes?${params.toString()}`;
      if (debouncedQuery) {
        params.set('q', debouncedQuery);
        path = `/api/admin/routes/search?${params.toString()}`;
      }

      const response = await apiRequest<RouteListResponse>(path);
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load routes');
      }

      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: RouteFormValues): Promise<void> => {
      setFormErrors({});
      const validation = validateOrReject(
        adminRouteFormClientSchema,
        {
          name: values.name,
          fromName: values.fromName,
          fromLatitude: Number(values.fromLatitude),
          fromLongitude: Number(values.fromLongitude),
          toName: values.toName,
          toLatitude: Number(values.toLatitude),
          toLongitude: Number(values.toLongitude),
          baseTokenCost: Number(values.baseTokenCost),
          status: values.status,
        },
        'Please correct the route form errors.'
      );
      if (!validation.isValid) {
        setFormErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid route payload');
      }

      setClientFormError(null);
      const payload = {
        ...validation.data,
      };

      const response = await apiRequest<RouteItem>(
        modalMode === 'create' ? '/api/admin/routes' : `/api/admin/routes/${editingRouteId}`,
        {
          method: modalMode === 'create' ? 'POST' : 'PATCH',
          body: JSON.stringify(payload),
        }
      );

      if (response.hasError) {
        setFormErrors(response.errors ?? {});
        throw new Error(response.message || 'Unable to save route');
      }
    },
    onSuccess: async () => {
      setModalOpen(false);
      setEditingRouteId(null);
      setFormValues(EMPTY_FORM);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'routes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (routeId: string): Promise<void> => {
      const response = await apiRequest<{ deleted: boolean }>(`/api/admin/routes/${routeId}`, {
        method: 'DELETE',
      });
      if (response.hasError) {
        const isReferencedConflict =
          (response.message ?? '').toLowerCase().includes('referenced by other records');

        if (isReferencedConflict) {
          const fallback = await apiRequest<RouteItem>(`/api/admin/routes/${routeId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'inactive' }),
          });

          if (fallback.hasError) {
            throw new Error(fallback.message || 'Unable to deactivate referenced route');
          }

          return;
        }

        throw new Error(response.message || 'Unable to delete route');
      }
    },
    onSuccess: async () => {
      setDeletingRouteId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'routes'] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (input: { routeId: string; status: 'active' | 'inactive' }): Promise<void> => {
      const response = await apiRequest<RouteItem>(`/api/admin/routes/${input.routeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: input.status }),
      });
      if (response.hasError) {
        throw new Error(response.message || 'Unable to update route status');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'routes'] });
    },
  });

  const items = routesQuery.data?.items ?? [];

  function openCreateModal(): void {
    setModalMode('create');
    setEditingRouteId(null);
    setFormErrors({});
    setFormValues(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(route: RouteItem): void {
    setModalMode('edit');
    setEditingRouteId(route.id);
    setFormErrors({});
    setFormValues({
      name: route.name,
      fromName: route.fromName,
      fromLatitude: String(route.fromLatitude ?? ''),
      fromLongitude: String(route.fromLongitude ?? ''),
      toName: route.toName,
      toLatitude: String(route.toLatitude ?? ''),
      toLongitude: String(route.toLongitude ?? ''),
      baseTokenCost: String(route.baseTokenCost),
      status: route.status,
    });
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground font-mono">Route Management</h2>
            <p className="text-sm text-muted-foreground">Manage fixed routes, pickup stop sequence, and token pricing.</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Create Route
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search route or pickup point name..."
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-lg border border-input bg-background px-3 py-2.5"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        {routesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={`route-skeleton-${idx}`} className="h-10 w-full" />
            ))}
          </div>
        ) : null}
        {clientFormError ? <p className="text-sm text-destructive">{clientFormError}</p> : null}
        {routesQuery.isError ? (
          <p className="text-sm text-destructive">{(routesQuery.error as Error).message}</p>
        ) : null}

        {!routesQuery.isLoading && !routesQuery.isError && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No routes found.</p>
        ) : null}

        {!routesQuery.isLoading && !routesQuery.isError && items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">From</th>
                  <th className="px-3 py-2">To</th>
                  <th className="px-3 py-2">Base Token</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Stops</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/** Disable row-level actions while this row is mutating. */}
                    {(() => {
                      const rowBusy = pendingRouteAction?.routeId === item.id;
                      return (
                        <>
                    <td className="px-3 py-3 font-semibold text-foreground">{item.name}</td>
                    <td className="px-3 py-3">{item.fromName}</td>
                    <td className="px-3 py-3">{item.toName}</td>
                    <td className="px-3 py-3">{item.baseTokenCost}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">{item.pickupPointsCount ?? 0}</td>
                    <td className="px-3 py-3">{new Date(item.updatedAt).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(item)} disabled={rowBusy}>
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" asChild disabled={rowBusy}>
                          <Link href={`/admin/routes/${item.id}/pickup-points`}>Manage Stops</Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            setPendingRouteAction({ routeId: item.id, action: 'toggle' });
                            try {
                              await toggleStatusMutation.mutateAsync({
                                routeId: item.id,
                                status: item.status === 'active' ? 'inactive' : 'active',
                              });
                            } finally {
                              setPendingRouteAction((current) =>
                                current?.routeId === item.id ? null : current
                              );
                            }
                          }}
                          disabled={rowBusy}
                        >
                          {rowBusy && pendingRouteAction?.action === 'toggle'
                            ? 'Updating...'
                            : item.status === 'active'
                              ? 'Deactivate'
                              : 'Activate'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingRouteId(item.id)}
                          disabled={rowBusy}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                      {item.matchedPickupPoints && item.matchedPickupPoints.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Matches: {item.matchedPickupPoints.map((point) => point.name).join(', ')}
                        </p>
                      ) : null}
                    </td>
                        </>
                      );
                    })()}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <RouteFormModal
        open={modalOpen}
        mode={modalMode}
        initialValues={formValues}
        loading={saveMutation.isPending}
        errors={formErrors}
        onClose={() => setModalOpen(false)}
        onSubmit={(values) => void saveMutation.mutateAsync(values)}
      />

      <GlobalConfirmationDialog
        open={Boolean(deletingRouteId)}
        onOpenChange={(next) => {
          if (!next) setDeletingRouteId(null);
        }}
        title="Delete route"
        description="This will permanently delete the route if it is not referenced by rides/bookings."
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        onConfirm={() => {
          if (deletingRouteId) {
            void (async () => {
              setPendingRouteAction({ routeId: deletingRouteId, action: 'delete' });
              try {
                await deleteMutation.mutateAsync(deletingRouteId);
              } finally {
                setPendingRouteAction((current) =>
                  current?.routeId === deletingRouteId ? null : current
                );
              }
            })();
          }
        }}
      />
    </div>
  );
}
