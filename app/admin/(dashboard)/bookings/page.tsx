'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  adminBookingProblemActionClientSchema,
  adminBookingRefundActionClientSchema,
  adminBookingsFilterClientSchema,
} from '@/lib/frontend-validation/admin-bookings.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

interface BookingsPayload {
  items: Array<any>;
  total: number;
}

export default function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [pendingBookingAction, setPendingBookingAction] = useState<{ bookingId: string; action: 'problem' | 'refund' } | null>(null);

  const filters = useMemo(() => ({ status, date }), [status, date]);

  const bookingsQuery = useQuery({
    queryKey: adminQueryKeys.bookings(filters),
    queryFn: async (): Promise<BookingsPayload> => {
      const filterValidation = validateOrReject(
        adminBookingsFilterClientSchema,
        { status, date },
        'Invalid bookings filters.'
      );
      if (!filterValidation.isValid) {
        setClientFieldErrors(filterValidation.fieldErrors);
        setClientFormError(filterValidation.formMessage);
        throw new Error(filterValidation.formMessage ?? 'Invalid bookings filters');
      }

      setClientFieldErrors({});
      setClientFormError(null);
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (status) params.set('status', status);
      if (date) params.set('date', date);

      const response = await apiRequest<BookingsPayload>(`/api/admin/bookings?${params.toString()}`);
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load bookings');
      }
      return response.data;
    },
  });

  const markProblemMutation = useMutation({
    mutationFn: async (bookingId: string): Promise<void> => {
      const validation = validateOrReject(
        adminBookingProblemActionClientSchema,
        { bookingId, flagged: true, note: 'Manual admin review required' },
        'Invalid problem action payload.'
      );
      if (!validation.isValid) {
        setClientFieldErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid problem action');
      }

      setClientFieldErrors({});
      setClientFormError(null);
      const response = await apiRequest(`/api/admin/bookings/${bookingId}/problem`, {
        method: 'PATCH',
        body: JSON.stringify({ flagged: validation.data?.flagged, note: validation.data?.note }),
      });
      if (response.hasError) {
        throw new Error(response.message || 'Unable to mark problem');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.bookings(filters) });
    },
  });

  const refundMutation = useMutation({
    mutationFn: async ({ bookingId, tokenCost }: { bookingId: string; tokenCost: number }): Promise<void> => {
      const validation = validateOrReject(
        adminBookingRefundActionClientSchema,
        { bookingId, amount: tokenCost, reason: 'Manual refund' },
        'Invalid refund payload.'
      );
      if (!validation.isValid) {
        setClientFieldErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid refund payload');
      }

      setClientFieldErrors({});
      setClientFormError(null);
      const response = await apiRequest(`/api/admin/bookings/${bookingId}/refund`, {
        method: 'PATCH',
        body: JSON.stringify({ amount: validation.data?.amount, reason: validation.data?.reason }),
      });
      if (response.hasError) {
        throw new Error(response.message || 'Unable to process refund');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.bookings(filters) });
    },
  });

  const items = bookingsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-foreground">Bookings</h2>
          <p className="text-sm text-muted-foreground">Filter bookings, mark problems, and issue manual refunds.</p>
        </div>

        <div className="flex items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2" />
            {clientFieldErrors.date ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.date[0]}</p> : null}
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2">
              <option value="">All</option>
              <option value="booked">booked</option>
              <option value="boarded">boarded</option>
              <option value="cancelled">cancelled</option>
              <option value="no_show">no_show</option>
            </select>
            {clientFieldErrors.status ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.status[0]}</p> : null}
          </label>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        {clientFormError ? <p className="text-sm text-destructive">{clientFormError}</p> : null}
        {bookingsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={`booking-skeleton-${idx}`} className="h-10 w-full" />
            ))}
          </div>
        ) : null}
        {bookingsQuery.isError ? <p className="text-sm text-destructive">{(bookingsQuery.error as Error).message}</p> : null}
        {!bookingsQuery.isLoading && !bookingsQuery.isError && items.length === 0 ? <p className="text-sm text-muted-foreground">No bookings found.</p> : null}

        {!bookingsQuery.isLoading && !bookingsQuery.isError && items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2">Booking</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Route</th>
                  <th className="px-3 py-2">Pickup</th>
                  <th className="px-3 py-2">Token Cost</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((row) => (
                  <tr key={row.id}>
                    {(() => {
                      const rowBusy = pendingBookingAction?.bookingId === row.id;
                      return (
                        <>
                    <td className="px-3 py-3">{row.id}</td>
                    <td className="px-3 py-3">{`${row.rider?.first_name ?? ''} ${row.rider?.last_name ?? ''}`.trim()}</td>
                    <td className="px-3 py-3">{row.ride_instance?.route?.name ?? '-'}</td>
                    <td className="px-3 py-3">{row.pickup_point?.name ?? '-'}</td>
                    <td className="px-3 py-3">{row.token_cost ?? 0}</td>
                    <td className="px-3 py-3">{row.status}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void (async () => {
                              setPendingBookingAction({ bookingId: row.id, action: 'problem' });
                              try {
                                await markProblemMutation.mutateAsync(row.id);
                              } finally {
                                setPendingBookingAction((current) =>
                                  current?.bookingId === row.id ? null : current
                                );
                              }
                            })()
                          }
                          disabled={rowBusy}
                        >
                          {rowBusy && pendingBookingAction?.action === 'problem' ? 'Updating...' : 'Mark problem'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            void (async () => {
                              setPendingBookingAction({ bookingId: row.id, action: 'refund' });
                              try {
                                await refundMutation.mutateAsync({
                                  bookingId: row.id,
                                  tokenCost: Number(row.token_cost ?? 0),
                                });
                              } finally {
                                setPendingBookingAction((current) =>
                                  current?.bookingId === row.id ? null : current
                                );
                              }
                            })()
                          }
                          disabled={rowBusy}
                        >
                          {rowBusy && pendingBookingAction?.action === 'refund' ? 'Refunding...' : 'Refund'}
                        </Button>
                      </div>
                    </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
