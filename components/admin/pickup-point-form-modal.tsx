'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode, type ReactElement } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
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
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const libraries = useMemo(() => ['places'] as ('places')[], []);
  const { isLoaded } = useJsApiLoader({
    id: 'tripline-google-maps-loader',
    googleMapsApiKey: mapsKey,
    libraries,
  });

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
          {errorText('_form') ? (
            <p className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorText('_form')}
            </p>
          ) : null}
          <Field label="Pickup Point Name" error={errorText('name')}>
            {isLoaded ? (
              <PlaceAutocompleteField
                value={values.name}
                placeholder="Search stop with Google Places"
                onInputChange={(next) => setField('name', next)}
                onPlaceSelected={({ name, latitude, longitude }) => {
                  setField('name', name);
                  setField('latitude', String(latitude));
                  setField('longitude', String(longitude));
                }}
              />
            ) : (
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                value={values.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Search loading... enter stop name manually"
              />
            )}
          </Field>

          <Field label="Order Index" error={errorText('orderIndex')}>
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2" value={values.orderIndex} onChange={(e) => setField('orderIndex', e.target.value)} />
          </Field>

          <Field label="Latitude" error={errorText('latitude')}>
            <input
              className={`w-full rounded-lg border border-input px-3 py-2 ${isLoaded ? 'bg-muted' : 'bg-background'}`}
              value={values.latitude}
              onChange={(e) => setField('latitude', e.target.value)}
              readOnly={isLoaded}
            />
          </Field>

          <Field label="Longitude" error={errorText('longitude')}>
            <input
              className={`w-full rounded-lg border border-input px-3 py-2 ${isLoaded ? 'bg-muted' : 'bg-background'}`}
              value={values.longitude}
              onChange={(e) => setField('longitude', e.target.value)}
              readOnly={isLoaded}
            />
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

interface PlaceResult {
  name: string;
  latitude: number;
  longitude: number;
}

interface PlaceAutocompleteFieldProps {
  value: string;
  placeholder: string;
  onInputChange: (value: string) => void;
  onPlaceSelected: (place: PlaceResult) => void;
}

function PlaceAutocompleteField({
  value,
  placeholder,
  onInputChange,
  onPlaceSelected,
}: PlaceAutocompleteFieldProps): ReactElement {
  const autocompleteRef = useRef<any | null>(null);

  function onLoad(autocomplete: any): void {
    autocompleteRef.current = autocomplete;
  }

  function onPlaceChanged(): void {
    const place = autocompleteRef.current?.getPlace?.();
    const location = place?.geometry?.location;
    if (!location) return;
    onPlaceSelected({
      name: place.formatted_address ?? place.name ?? value,
      latitude: location.lat(),
      longitude: location.lng(),
    });
  }

  return (
    <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
      <input
        className="w-full rounded-lg border border-input bg-background px-3 py-2"
        value={value}
        onChange={(event) => onInputChange(event.target.value)}
        placeholder={placeholder}
      />
    </Autocomplete>
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
