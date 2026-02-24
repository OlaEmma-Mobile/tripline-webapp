'use client';

import { useEffect, useState, type ReactNode, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export interface PickupPointFormValues {
  name: string;
  latitude: string;
  longitude: string;
  orderIndex: string;
  tokenCost: string;
}

interface PickupPointFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: PickupPointFormValues;
  loading: boolean;
  errors: Record<string, string[]>;
  onClose: () => void;
  onSubmit: (values: PickupPointFormValues) => void;
}

export default function PickupPointFormModal({
  open,
  mode,
  initialValues,
  loading,
  errors,
  onClose,
  onSubmit,
}: PickupPointFormModalProps): ReactElement {
  const [values, setValues] = useState<PickupPointFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues, open]);

  function setField<K extends keyof PickupPointFormValues>(key: K, value: PickupPointFormValues[K]): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function errorText(key: string): string | null {
    return errors[key]?.[0] ?? null;
  }

  return (
    <DialogRoot open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Pickup Point' : 'Edit Pickup Point'}</DialogTitle>
          <DialogDescription>
            Set sequence order, location coordinates, and token cost.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pickup Point Name" error={errorText('name')}>
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2" value={values.name} onChange={(e) => setField('name', e.target.value)} />
          </Field>

          <Field label="Order Index" error={errorText('orderIndex')}>
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2" value={values.orderIndex} onChange={(e) => setField('orderIndex', e.target.value)} />
          </Field>

          <Field label="Latitude" error={errorText('latitude')}>
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2" value={values.latitude} onChange={(e) => setField('latitude', e.target.value)} />
          </Field>

          <Field label="Longitude" error={errorText('longitude')}>
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2" value={values.longitude} onChange={(e) => setField('longitude', e.target.value)} />
          </Field>

          <Field label="Token Cost" error={errorText('tokenCost')}>
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2" value={values.tokenCost} onChange={(e) => setField('tokenCost', e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(values)} disabled={loading}>
            {loading ? 'Saving...' : mode === 'create' ? 'Create Pickup Point' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

function Field({ label, error, children }: { label: string; error: string | null; children: ReactNode }): ReactElement {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-semibold text-foreground">{label}</span>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  );
}
