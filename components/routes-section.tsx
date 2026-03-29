'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import PublicRouteCard from '@/components/public-route-card';
import PublicRouteCardSkeleton from '@/components/public-route-card-skeleton';
import PublicRouteDetailsDrawer from '@/components/public-route-details-drawer';
import { usePublicRoutes } from '@/lib/hooks/use-public-routes';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

export default function RoutesSection() {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const routesQuery = usePublicRoutes();
  const routes = routesQuery.data?.items ?? [];
  const availableRoutes = routes.filter((route) => route.status === 'available').slice(0, 3);
  const upcomingRoutes = routes.filter((route) => route.status === 'coming_soon').slice(0, 3);

  return (
    <section id="routes" className="px-4 bg-primary sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h2 className="text-4xl sm:text-2xl lg:text-4xl font-bold text-white mb-4 text-balance font-mono">
              Available & <span className='text-foreground'> Incoming Routes</span>
            </h2>
            <p className="text-sm text-white max-w-3xl font-sans">
              Explore live Tripline routes straight from the dashboard data. Available routes are ready for scheduling, while coming soon routes help riders discover what is launching next.
            </p>
          </div>
          <Link
            href="/routes"
            className="inline-flex gap-2 hover:gap-4 transition-all duration-500 items-center justify-center rounded-full bg-primary border border-white/40 px-6 py-3 text-xs font-semibold text-primary-foreground hover:scale-105"
          >
            <span>View all routes</span>
            <ArrowUpRight color='white' size={'20'} />
          </Link>
        </motion.div>

        {routesQuery.isLoading ? (
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <PublicRouteCardSkeleton key={index} />
            ))}
          </div>
        ) : null}

        {routesQuery.isError ? (
          <div className="mt-10 rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
            {(routesQuery.error as Error).message}
          </div>
        ) : null}

        {!routesQuery.isLoading && !routesQuery.isError && routes.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">
            No routes have been published yet.
          </div>
        ) : null}

        {availableRoutes.length > 0 ? (
          <motion.div
            className="mt-12"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <h3 className="text-2xl font-bold text-foreground mb-6 font-mono">Now Available</h3>
            <motion.div
              className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {availableRoutes.map((route) => (
                <motion.div key={route.id} variants={staggerItem}>
                  <PublicRouteCard route={route} onClick={setSelectedRouteId} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        ) : null}

        {upcomingRoutes.length > 0 ? (
          <motion.div
            className="mt-12"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <h3 className="text-2xl font-bold text-foreground mb-3 font-mono">Coming Soon</h3>
            <p className="mb-6 text-muted-foreground font-sans">
              These routes are already visible to riders, even while the operations team finishes rollout planning.
            </p>
            <motion.div
              className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {upcomingRoutes.map((route) => (
                <motion.div key={route.id} variants={staggerItem}>
                  <PublicRouteCard route={route} onClick={setSelectedRouteId} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        ) : null}
      </div>

      <PublicRouteDetailsDrawer
        routeId={selectedRouteId}
        open={Boolean(selectedRouteId)}
        onOpenChange={(open) => {
          if (!open) setSelectedRouteId(null);
        }}
      />
    </section>
  );
}
