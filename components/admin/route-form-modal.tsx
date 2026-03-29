'use client';

import { useEffect, useMemo, useState, useRef, type ReactNode, type ReactElement } from 'react';
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

export interface RouteFormValues {
  name: string;
  fromName: string;
  fromLatitude: string;
  fromLongitude: string;
  toName: string;
  toLatitude: string;
  toLongitude: string;
  baseTokenCost: string;
  status: 'available' | 'coming_soon';
}

interface RouteFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: RouteFormValues;
  loading: boolean;
  errors: Record<string, string[]>;
  onClose: () => void;
  onSubmit: (values: RouteFormValues) => void;
}

export default function RouteFormModal({
  open,
  mode,
  initialValues,
  loading,
  errors,
  onClose,
  onSubmit,
}: RouteFormModalProps): ReactElement {
  const [values, setValues] = useState<RouteFormValues>(initialValues);
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

  function setField<K extends keyof RouteFormValues>(key: K, value: RouteFormValues[K]): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function errorText(key: string): string | null {
    return errors[key]?.[0] ?? null;
  }

  return (
    <DialogRoot open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Route' : 'Edit Route'}</DialogTitle>
          <DialogDescription>
            Define route endpoints with Google Places and token pricing.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {errorText('_form') ? (
            <p className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorText('_form')}
            </p>
          ) : null}
          <Field label="Route Name" error={errorText('name')}>
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2" value={values.name} onChange={(e) => setField('name', e.target.value)} />
          </Field>

          <Field label="Status" error={errorText('status')}>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2" value={values.status} onChange={(e) => setField('status', e.target.value as 'available' | 'coming_soon')}>
              <option value="available">Available</option>
              <option value="coming_soon">Coming Soon</option>
            </select>
          </Field>

          {isLoaded ? (
            <PlaceAutocompleteField
              label="From Location"
              value={values.fromName}
              error={errorText('fromName') ?? errorText('fromLatitude') ?? errorText('fromLongitude')}
              placeholder="Search origin with Google Places"
              onPlaceSelected={({ name, latitude, longitude }) => {
                setField('fromName', name);
                setField('fromLatitude', String(latitude));
                setField('fromLongitude', String(longitude));
              }}
              onInputChange={(next) => setField('fromName', next)}
            />
          ) : (
            <Field label="From Location" error={null}>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                placeholder="Loading Google Places..."
                disabled
              />
            </Field>
          )}
          {isLoaded ? (
            <PlaceAutocompleteField
              label="To Location"
              value={values.toName}
              error={errorText('toName') ?? errorText('toLatitude') ?? errorText('toLongitude')}
              placeholder={isLoaded ? 'Search destination with Google Places' : 'Loading Google Places...'}
              disabled={!isLoaded}
              onPlaceSelected={({ name, latitude, longitude }) => {
                setField('toName', name);
                setField('toLatitude', String(latitude));
                setField('toLongitude', String(longitude));
              }}
              onInputChange={(next) => setField('toName', next)}
            />
          ) : (
            <Field label="To Location" error={null}>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                placeholder="Loading Google Places..."
                disabled
              />
            </Field>
          )}


          <Field label="From Latitude" error={errorText('fromLatitude')}>
            <input
              className="w-full rounded-lg border border-input bg-muted px-3 py-2"
              value={values.fromLatitude}
              readOnly
            />
          </Field>
          <Field label="From Longitude" error={errorText('fromLongitude')}>
            <input
              className="w-full rounded-lg border border-input bg-muted px-3 py-2"
              value={values.fromLongitude}
              readOnly
            />
          </Field>

          <Field label="To Latitude" error={errorText('toLatitude')}>
            <input
              className="w-full rounded-lg border border-input bg-muted px-3 py-2"
              value={values.toLatitude}
              readOnly
            />
          </Field>
          <Field label="To Longitude" error={errorText('toLongitude')}>
            <input
              className="w-full rounded-lg border border-input bg-muted px-3 py-2"
              value={values.toLongitude}
              readOnly
            />
          </Field>
          <Field label="Base Token Cost" error={errorText('baseTokenCost')}>
            <input className="w-full rounded-lg border border-input bg-background px-3 py-2" value={values.baseTokenCost} onChange={(e) => setField('baseTokenCost', e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(values)} disabled={loading}>
            {loading ? 'Saving...' : mode === 'create' ? 'Create Route' : 'Save Changes'}
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

interface PlaceResult {
  name: string;
  latitude: number;
  longitude: number;
}

interface PlaceAutocompleteFieldProps {
  label: string;
  value: string;
  placeholder: string;
  error: string | null;
  disabled?: boolean;
  onInputChange: (value: string) => void;
  onPlaceSelected: (place: PlaceResult) => void;
}

function PlaceAutocompleteField({
  label,
  value,
  placeholder,
  error,
  disabled = false,
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
    const resolvedName = place.formatted_address ?? place.name ?? value;
    onPlaceSelected({
      name: resolvedName,
      latitude: location.lat(),
      longitude: location.lng(),
    });
  }

  return (
    <Field label={label} error={error}>
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <input
          className="w-full rounded-lg border border-input bg-background px-3 py-2"
          value={value}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </Autocomplete>
    </Field>
  );
}
