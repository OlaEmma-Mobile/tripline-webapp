import { ArrowUpRight } from 'lucide-react';

const metrics = [
  { label: 'Active Routes', value: '12', delta: '+2 this week' },
  { label: 'Seat Utilization', value: '78%', delta: '+6% vs last week' },
  { label: 'On-time Trips', value: '94%', delta: '+1.5% today' },
  { label: 'Monthly Revenue', value: '₦4.2m', delta: '+12% MoM' },
];

const upcomingTrips = [
  {
    route: 'Ajah → Victoria Island',
    time: '6:30 AM',
    driver: 'Kelvin O.',
    seats: '12 / 14 seats',
  },
  {
    route: 'Lekki Phase 1 → Ikoyi',
    time: '7:00 AM',
    driver: 'Aisha M.',
    seats: '9 / 12 seats',
  },
  {
    route: 'Yaba → Victoria Island',
    time: '7:30 AM',
    driver: 'Tunde B.',
    seats: '11 / 15 seats',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground font-mono">
              {metric.label}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-3xl font-bold text-foreground font-mono">
                {metric.value}
              </p>
              <ArrowUpRight className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground font-sans">
              {metric.delta}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground font-mono">Today&apos;s trips</h3>
              <p className="text-sm text-muted-foreground font-sans">
                Keep an eye on departures and seat usage.
              </p>
            </div>
            <button className="text-sm font-semibold text-primary hover:underline">View all</button>
          </div>

          <div className="mt-6 space-y-4">
            {upcomingTrips.map((trip) => (
              <div
                key={trip.route}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{trip.route}</p>
                  <p className="text-xs text-muted-foreground">Driver: {trip.driver}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{trip.time}</span>
                  <span>{trip.seats}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-xl font-bold text-foreground font-mono">Quick actions</h3>
          <p className="text-sm text-muted-foreground font-sans">
            Common workflows for admin operators.
          </p>
          <div className="mt-6 space-y-3">
            {[
              'Create a new route',
              'Assign drivers to trips',
              'Review corporate billing',
              'Send rider notifications',
            ].map((action) => (
              <button
                key={action}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-semibold text-foreground hover:border-primary/60"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
