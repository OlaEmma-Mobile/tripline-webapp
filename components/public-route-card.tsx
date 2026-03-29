'use client';

import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Route as RouteIcon, Ticket } from 'lucide-react';

export interface PublicRouteCardItem {
  id: string;
  name: string;
  fromName: string;
  toName: string;
  baseTokenCost: number;
  status: 'available' | 'coming_soon';
  pickupPointsCount?: number;
}

interface PublicRouteCardProps {
  route: PublicRouteCardItem;
  onClick?: (routeId: string) => void;
}

function formatCurrency(amount: number): string {
  return `NGN ${amount.toLocaleString()}`;
}

export default function PublicRouteCard({ route, onClick }: PublicRouteCardProps) {
  const isAvailable = route.status === 'available';

  return (
    <motion.button
      type="button"
      onClick={() => onClick?.(route.id)}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="group h-full w-full rounded-3xl border border-border bg-card p-6 text-left transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
            Fixed Route
          </p>
          <h3 className="mt-2 text-lg font-bold text-foreground font-mono">{route.name}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
        >
          {isAvailable ? 'Available' : 'Coming Soon'}
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-border/70 bg-background/80 p-4">
        <div className="flex items-start gap-3 text-sm text-foreground">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <div className="grid grid-cols-9 gap-2 space-x-2">
            <div className='col-span-4'>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
              <p className="font-medium truncate">{route.fromName}</p>
            </div>
            <div className="flex justify-center text-center w-min-0 items-center gap-2 text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className='col-span-4'>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">To</p>
              <p className="font-medium truncate">{route.toName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-primary">
            <RouteIcon className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Stops</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {route.pickupPointsCount ?? 0} pickup {route.pickupPointsCount === 1 ? 'stop' : 'stops'}
          </p>
        </div>
        <div className="rounded-2xl bg-secondary/40 p-4">
          <div className="flex items-center gap-2 text-primary">
            <Ticket className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Base Fare</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(route.baseTokenCost)}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        {isAvailable
          ? 'This route is open for scheduling and rider demand.'
          : 'This route is on the roadmap. Join early interest and watch for launch updates.'}
      </div>
    </motion.button>
  );
}
