'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import PublicRouteCard from '@/components/public-route-card';
import PublicRouteCardSkeleton from '@/components/public-route-card-skeleton';
import PublicRouteDetailsDrawer from '@/components/public-route-details-drawer';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import { usePublicRoutes } from '@/lib/hooks/use-public-routes';
import TypewriterText from '@/components/typewriter-text';

export default function RoutesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'available' | 'coming_soon'>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const routesQuery = usePublicRoutes();

  const filteredRoutes = useMemo(() => {
    const routes = routesQuery.data?.items ?? [];
    return routes.filter((route) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        route.name.toLowerCase().includes(query) ||
        route.fromName.toLowerCase().includes(query) ||
        route.toName.toLowerCase().includes(query);
      const matchesFilter = filterType === 'all' || route.status === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [filterType, routesQuery.data?.items, searchQuery]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/5 to-background px-4 pb-8 pt-32 sm:px-6 sm:pb-8 sm:pt-62 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div variants={fadeInUp} initial="hidden" animate="visible">
              <h1 className="mb-4 text-4xl font-bold text-foreground text-balance sm:text-6xl lg:text-5xl font-mono">
                <TypewriterText text="Explore Our Routes" className="text-foreground" />
              </h1>
              <p className="max-w-4xl text-sm text-muted-foreground font-sans">
                Browse live route templates straight from Tripline operations. Filter what is available now and what is launching soon.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="px-4 py-12 pt-0 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="space-y-6">
              <motion.div variants={fadeInUp} initial="hidden" animate="visible">
                <div className="relative">
                  <div className="flex items-center gap-4 rounded-full border border-border bg-card px-6 py-3">
                    <Search className="h-5 w-5 text-primary" />
                    <input
                      type="text"
                      placeholder="Search by route name or location..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="flex-1 text-xs bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div className="flex flex-wrap gap-3" variants={fadeInUp} initial="hidden" animate="visible">
                {[
                  { value: 'all', label: 'All Routes' },
                  { value: 'available', label: 'Available' },
                  { value: 'coming_soon', label: 'Coming Soon' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setFilterType(filter.value as 'all' | 'available' | 'coming_soon')}
                    className={`rounded-full px-6 text-xs py-2 font-semibold transition-all ${filterType === filter.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-foreground border border-border hover:border-primary'
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {routesQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <PublicRouteCardSkeleton key={index} />
                ))}
              </div>
            ) : null}

            {routesQuery.isError ? (
              <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
                {(routesQuery.error as Error).message}
              </div>
            ) : null}

            {!routesQuery.isLoading && !routesQuery.isError && filteredRoutes.length > 0 ? (
              <motion.div
                className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {filteredRoutes.map((route) => (
                  <motion.div key={route.id} variants={staggerItem}>
                    <PublicRouteCard route={route} onClick={setSelectedRouteId} />
                  </motion.div>
                ))}
              </motion.div>
            ) : null}

            {!routesQuery.isLoading && !routesQuery.isError && filteredRoutes.length === 0 ? (
              <motion.div className="py-16 text-center" variants={fadeInUp} initial="hidden" animate="visible">
                <p className="text-lg text-muted-foreground">
                  No routes match that search yet. Try another location or switch the status filter.
                </p>
              </motion.div>
            ) : null}
          </div>
        </section>
      </main>

      <PublicRouteDetailsDrawer
        routeId={selectedRouteId}
        open={Boolean(selectedRouteId)}
        onOpenChange={(open) => {
          if (!open) setSelectedRouteId(null);
        }}
      />

      <Footer />
    </div>
  );
}
