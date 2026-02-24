'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RouteFormModal, { type RouteFormValues } from '@/components/admin/route-form-modal';

interface RouteItem {
  id: string;
  name: string;
  fromName: string;
  toName: string;
  baseTokenCost: number;
  status: 'active' | 'inactive';
  pickupPointsCount?: number;
  updatedAt: string;
  matchedPickupPoints?: Array<{ id: string; name: string }>;
}

const MOCK_ROUTES: RouteItem[] = [
  {
    id: 'route-1',
    name: 'Ajah -> VI Morning',
    fromName: 'Ajah Roundabout',
    toName: 'Victoria Island',
    baseTokenCost: 5,
    status: 'active',
    pickupPointsCount: 4,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'route-2',
    name: 'Yaba -> Ikeja',
    fromName: 'Yaba',
    toName: 'Ikeja',
    baseTokenCost: 4,
    status: 'inactive',
    pickupPointsCount: 3,
    updatedAt: new Date().toISOString(),
  },
];

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
  const [items, setItems] = useState<RouteItem[]>(MOCK_ROUTES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formValues, setFormValues] = useState<RouteFormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const statusOk = statusFilter === 'all' || item.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return statusOk;
      const match =
        item.name.toLowerCase().includes(q) ||
        item.fromName.toLowerCase().includes(q) ||
        item.toName.toLowerCase().includes(q) ||
        (item.matchedPickupPoints ?? []).some((point) => point.name.toLowerCase().includes(q));
      return statusOk && match;
    });
  }, [items, searchQuery, statusFilter]);

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
      fromLatitude: '',
      fromLongitude: '',
      toName: route.toName,
      toLatitude: '',
      toLongitude: '',
      baseTokenCost: String(route.baseTokenCost),
      status: route.status,
    });
    setModalOpen(true);
  }

  async function submitRoute(values: RouteFormValues): Promise<void> {
    setSubmitting(true);
    setFormErrors({});

    try {
      if (!values.name.trim()) {
        setFormErrors({ name: ['Route name is required'] });
        return;
      }

      const route: RouteItem = {
        id: editingRouteId ?? `route-${Date.now()}`,
        name: values.name,
        fromName: values.fromName,
        toName: values.toName,
        baseTokenCost: Number(values.baseTokenCost || 0),
        status: values.status,
        pickupPointsCount: 0,
        updatedAt: new Date().toISOString(),
      };

      setItems((prev) =>
        modalMode === 'create' ? [route, ...prev] : prev.map((item) => (item.id === editingRouteId ? route : item))
      );

      setModalOpen(false);
      setFormValues(EMPTY_FORM);
      setEditingRouteId(null);
    } finally {
      setSubmitting(false);
    }
  }

  function deleteRoute(id: string): void {
    if (!window.confirm('Delete this route and all its pickup points?')) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground font-mono">Route Management</h2>
            <p className="text-sm text-muted-foreground">Manage fixed routes, from/to points, and pickup point pricing.</p>
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
        {loading ? <p className="text-sm text-muted-foreground">Loading routes...</p> : null}

        {!loading && filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No routes found.</p>
        ) : null}

        {!loading && filteredItems.length > 0 ? (
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
                {filteredItems.map((item) => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                    <td className="px-3 py-3">{new Date(item.updatedAt).toLocaleString().toString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(item)}>
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/routes/${item.id}/pickup-points`}>Manage Stops</Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteRoute(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                      {item.matchedPickupPoints && item.matchedPickupPoints.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Matches: {item.matchedPickupPoints.map((point) => point.name).join(', ')}
                        </p>
                      ) : null}
                    </td>
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
        loading={submitting}
        errors={formErrors}
        onClose={() => setModalOpen(false)}
        onSubmit={(values) => void submitRoute(values)}
      />
    </div>
  );
}
