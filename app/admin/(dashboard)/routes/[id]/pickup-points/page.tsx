'use client';

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Edit, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PickupPointFormModal, { type PickupPointFormValues } from '@/components/admin/pickup-point-form-modal';

interface PickupPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  orderIndex: number;
  tokenCost: number;
  updatedAt: string;
}

interface RouteDetails {
  id: string;
  name: string;
  fromName: string;
  toName: string;
  baseTokenCost: number;
}

const MOCK_ROUTE: RouteDetails = {
  id: 'route-1',
  name: 'Ajah -> VI Morning',
  fromName: 'Ajah Roundabout',
  toName: 'Victoria Island',
  baseTokenCost: 5,
};

const MOCK_POINTS: PickupPoint[] = [
  {
    id: 'point-1',
    name: 'Chevron',
    latitude: 6.4401,
    longitude: 3.4988,
    orderIndex: 1,
    tokenCost: 4,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'point-2',
    name: 'Lekki Phase 1',
    latitude: 6.4477,
    longitude: 3.4722,
    orderIndex: 2,
    tokenCost: 3,
    updatedAt: new Date().toISOString(),
  },
];

const EMPTY_FORM: PickupPointFormValues = {
  name: '',
  latitude: '',
  longitude: '',
  orderIndex: '',
  tokenCost: '',
};

export default function PickupPointsPage(): ReactElement {
  const params = useParams<{ id: string }>();
  const routeId = params.id;

  const [route, setRoute] = useState<RouteDetails | null>(MOCK_ROUTE);
  const [points, setPoints] = useState<PickupPoint[]>(MOCK_POINTS);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<PickupPointFormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!routeId) return;
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
      setRoute((prev) => (prev ? { ...prev, id: routeId } : { ...MOCK_ROUTE, id: routeId }));
    }, 200);
    return () => clearTimeout(timer);
  }, [routeId]);

  function openCreate(): void {
    setModalMode('create');
    setEditingId(null);
    setFormValues(EMPTY_FORM);
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
      orderIndex: String(point.orderIndex),
      tokenCost: String(point.tokenCost),
    });
    setFormErrors({});
    setModalOpen(true);
  }

  async function submit(values: PickupPointFormValues): Promise<void> {
    setSubmitting(true);
    setFormErrors({});

    const point: PickupPoint = {
      id: editingId ?? `point-${Date.now()}`,
      name: values.name,
      latitude: Number(values.latitude || 0),
      longitude: Number(values.longitude || 0),
      orderIndex: Number(values.orderIndex || 0),
      tokenCost: Number(values.tokenCost || 0),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (!point.name.trim()) {
        setFormErrors({ name: ['Pickup point name is required'] });
        return;
      }

      setPoints((prev) =>
        modalMode === 'create' ? [...prev, point] : prev.map((item) => (item.id === editingId ? point : item))
      );

      setModalOpen(false);
      setEditingId(null);
      setFormValues(EMPTY_FORM);
    } finally {
      setSubmitting(false);
    }
  }

  function remove(pointId: string): void {
    if (!window.confirm('Delete this pickup point?')) return;
    setPoints((prev) => prev.filter((item) => item.id !== pointId));
  }

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
          {route ? (
            <p className="text-sm text-muted-foreground">
              {route.name} | {route.fromName} {'->'} {route.toName} | Base token: {route.baseTokenCost}
            </p>
          ) : null}
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Pickup Point
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        {loading ? <p className="text-sm text-muted-foreground">Loading pickup points...</p> : null}

        {!loading && points.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pickup points configured yet.</p>
        ) : null}

        {!loading && points.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Latitude</th>
                  <th className="px-3 py-2">Longitude</th>
                  <th className="px-3 py-2">Token Cost</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {points.map((point) => (
                  <tr key={point.id}>
                    <td className="px-3 py-3">{point.orderIndex}</td>
                    <td className="px-3 py-3 font-semibold text-foreground">{point.name}</td>
                    <td className="px-3 py-3">{point.latitude}</td>
                    <td className="px-3 py-3">{point.longitude}</td>
                    <td className="px-3 py-3">{point.tokenCost}</td>
                    <td className="px-3 py-3">{new Date(point.updatedAt).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(point)}>
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => remove(point.id)}>
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
        loading={submitting}
        errors={formErrors}
        onClose={() => setModalOpen(false)}
        onSubmit={(values) => void submit(values)}
      />
    </div>
  );
}
