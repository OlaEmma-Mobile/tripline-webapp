'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminSettingsClientSchema } from '@/lib/frontend-validation/admin-settings.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

interface SettingsPayload {
  bookingWindowDaysAhead: number;
  cancellationWindowMinutes: number;
  tokenExpiryDays: number;
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<SettingsPayload>({
    bookingWindowDaysAhead: 7,
    cancellationWindowMinutes: 60,
    tokenExpiryDays: 60,
  });
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: adminQueryKeys.settings,
    queryFn: async (): Promise<SettingsPayload> => {
      const response = await apiRequest<SettingsPayload>('/api/admin/settings');
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load settings');
      }
      return response.data;
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setValues(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const validation = validateOrReject(
        adminSettingsClientSchema,
        values,
        'Please fix settings field errors.'
      );
      if (!validation.isValid) {
        setClientFieldErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid settings payload');
      }

      setClientFieldErrors({});
      setClientFormError(null);
      const response = await apiRequest('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(validation.data),
      });
      if (response.hasError) {
        throw new Error(response.message || 'Unable to update settings');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.settings });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-mono text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Booking window, cancellation policy, and token expiry settings.</p>
      </div>

      <section className="max-w-xl rounded-2xl border border-border bg-card p-6 space-y-4">
        {clientFormError ? <p className="text-sm text-destructive">{clientFormError}</p> : null}
        {settingsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : null}
        {settingsQuery.isError ? <p className="text-sm text-destructive">{(settingsQuery.error as Error).message}</p> : null}

        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Booking Window (days ahead)</span>
          <input
            className="w-full rounded-lg border border-input bg-background px-3 py-2"
            type="number"
            value={values.bookingWindowDaysAhead}
            onChange={(event) => setValues((prev) => ({ ...prev, bookingWindowDaysAhead: Number(event.target.value) }))}
          />
          {clientFieldErrors.bookingWindowDaysAhead ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.bookingWindowDaysAhead[0]}</p> : null}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Cancellation Window (minutes)</span>
          <input
            className="w-full rounded-lg border border-input bg-background px-3 py-2"
            type="number"
            value={values.cancellationWindowMinutes}
            onChange={(event) => setValues((prev) => ({ ...prev, cancellationWindowMinutes: Number(event.target.value) }))}
          />
          {clientFieldErrors.cancellationWindowMinutes ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.cancellationWindowMinutes[0]}</p> : null}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Token Expiry (days)</span>
          <input
            className="w-full rounded-lg border border-input bg-background px-3 py-2"
            type="number"
            value={values.tokenExpiryDays}
            onChange={(event) => setValues((prev) => ({ ...prev, tokenExpiryDays: Number(event.target.value) }))}
          />
          {clientFieldErrors.tokenExpiryDays ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.tokenExpiryDays[0]}</p> : null}
        </label>

        <Button onClick={() => void saveMutation.mutateAsync()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </section>
    </div>
  );
}
