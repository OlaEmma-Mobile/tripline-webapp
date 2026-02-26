'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { adminDashboardDateClientSchema } from '@/lib/frontend-validation/admin-tokens.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

interface DashboardPayload {
  totalRides: number;
  activeRides: number;
  completedRides: number;
  totalBookings: number;
  totalTokensSold: number;
  totalWalletBalance: number;
  upcomingRides: Array<Record<string, unknown>>;
  alerts: {
    cancelledToday: number;
    lowSeatRides: Array<Record<string, unknown>>;
  };
}

export default function AdminDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [clientFormError, setClientFormError] = useState<string | null>(null);

  const dashboardQuery = useQuery({
    queryKey: adminQueryKeys.dashboard({ from: selectedDate, to: selectedDate }),
    enabled: Boolean(selectedDate),
    queryFn: async (): Promise<DashboardPayload> => {
      const validation = validateOrReject(
        adminDashboardDateClientSchema,
        { selectedDate },
        'Select a valid date.'
      );
      if (!validation.isValid) {
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid date');
      }

      setClientFormError(null);
      const response = await apiRequest<DashboardPayload>(
        `/api/admin/dashboard?from=${selectedDate}&to=${selectedDate}`
      );
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load dashboard');
      }
      return response.data;
    },
  });

  const metrics = useMemo(() => {
    if (!dashboardQuery.data) return [];
    return [
      { label: 'Total Rides', value: dashboardQuery.data.totalRides },
      { label: 'Active Rides', value: dashboardQuery.data.activeRides },
      { label: 'Completed Rides', value: dashboardQuery.data.completedRides },
      { label: 'Total Bookings', value: dashboardQuery.data.totalBookings },
      { label: 'Total Tokens Sold', value: dashboardQuery.data.totalTokensSold },
      { label: 'Total Wallet Balance', value: dashboardQuery.data.totalWalletBalance },
    ];
  }, [dashboardQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-foreground">Operations Dashboard</h2>
          <p className="text-sm text-muted-foreground">Core metrics and ride alerts for the selected date.</p>
        </div>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2"
          />
        </label>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clientFormError ? <p className="text-sm text-destructive">{clientFormError}</p> : null}
        {dashboardQuery.isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={`metric-skeleton-${index}`} className="rounded-2xl border border-border bg-card p-6">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-4 h-8 w-20" />
              </div>
            ))
          : null}
        {dashboardQuery.isError ? (
          <p className="text-sm text-destructive">{(dashboardQuery.error as Error).message}</p>
        ) : null}

        {!dashboardQuery.isLoading && !dashboardQuery.isError && metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground font-mono">
              {metric.label}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-3xl font-bold text-foreground font-mono">{metric.value}</p>
              <ArrowUpRight className="h-5 w-5 text-primary" />
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground font-mono">Upcoming rides</h3>
              <p className="text-sm text-muted-foreground font-sans">Departures and availability snapshot.</p>
            </div>
            <Link href="/admin/rides" className="text-sm font-semibold text-primary hover:underline">View all</Link>
          </div>

          <div className="mt-6 space-y-4">
            {dashboardQuery.isLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div key={`upcoming-skeleton-${index}`} className="rounded-xl border border-border bg-background p-4">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="mt-2 h-3 w-36" />
                  </div>
                ))
              : null}
            {(dashboardQuery.data?.upcomingRides ?? []).slice(0, 8).map((ride, index) => (
              <div key={String(ride.ride_instance_id ?? index)} className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">{String((ride.route as any)?.name ?? 'Unknown route')}</p>
                <p className="text-xs text-muted-foreground">
                  {String(ride.ride_date ?? '')} {String(ride.departure_time ?? '')}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-xl font-bold text-foreground font-mono">Alerts</h3>
          <p className="text-sm text-muted-foreground font-sans">Cancellation and low-seat alerts.</p>
          <div className="mt-6 space-y-3 text-sm">
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              Cancelled rides today: <span className="font-semibold">{dashboardQuery.data?.alerts?.cancelledToday ?? 0}</span>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              Low-seat rides: <span className="font-semibold">{dashboardQuery.data?.alerts?.lowSeatRides?.length ?? 0}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
