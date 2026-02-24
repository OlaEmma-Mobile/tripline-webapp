'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Users, Search, MailCheck as MapPinCheck, CheckCircle } from 'lucide-react';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function RoutesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [filterType, setFilterType] = useState('all');

  const routes = [
    {
      id: 1,
      name: 'Lekki - VI Express',
      departure: 'Lekki Phase 1',
      arrival: 'Victoria Island',
      departureTime: '6:30 AM',
      arrivalTime: '7:15 AM',
      duration: '45 mins',
      stops: 3,
      capacity: 15,
      occupied: 12,
      fare: '₦500',
      type: 'available',
      frequency: 'Daily',
    },
    {
      id: 2,
      name: 'Ajah - Ikeja Route',
      departure: 'Ajah',
      arrival: 'Ikeja',
      departureTime: '7:00 AM',
      arrivalTime: '8:30 AM',
      duration: '90 mins',
      stops: 5,
      capacity: 20,
      occupied: 18,
      fare: '₦800',
      type: 'available',
      frequency: 'Daily',
    },
    {
      id: 3,
      name: 'Festac - Lekki',
      departure: 'Festac',
      arrival: 'Lekki Phase 2',
      departureTime: '6:00 AM',
      arrivalTime: '7:45 AM',
      duration: '105 mins',
      stops: 6,
      capacity: 25,
      occupied: 14,
      fare: '₦600',
      type: 'available',
      frequency: 'Mon-Fri',
    },
    {
      id: 4,
      name: 'Yaba - Victoria Island',
      departure: 'Yaba',
      arrival: 'Victoria Island',
      departureTime: '7:30 AM',
      arrivalTime: '8:15 AM',
      duration: '45 mins',
      stops: 4,
      capacity: 18,
      occupied: 15,
      fare: '₦450',
      type: 'available',
      frequency: 'Daily',
    },
    {
      id: 5,
      name: 'Surulere - Ikoyi',
      departure: 'Surulere',
      arrival: 'Ikoyi',
      departureTime: '6:45 AM',
      arrivalTime: '7:30 AM',
      duration: '45 mins',
      stops: 3,
      capacity: 16,
      occupied: 12,
      fare: '₦400',
      type: 'coming-soon',
      frequency: 'Coming Soon',
    },
    {
      id: 6,
      name: 'Badagry - Lekki',
      departure: 'Badagry',
      arrival: 'Lekki',
      departureTime: '6:00 AM',
      arrivalTime: '9:00 AM',
      duration: '180 mins',
      stops: 8,
      capacity: 30,
      occupied: 20,
      fare: '₦1,200',
      type: 'coming-soon',
      frequency: 'Coming Soon',
    },
  ];

  const filteredRoutes = routes.filter((route) => {
    const matchesSearch =
      route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.departure.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.arrival.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterType === 'all' || route.type === filterType;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-7xl">
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground text-balance mb-6 font-mono">
                Explore Our <span className="text-primary">Available Routes</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl font-sans">
                Find the perfect route for your daily commute. Filter by availability and search by location.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Search and Filter Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="space-y-6">
              {/* Search Bar */}
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
              >
                <div className="relative">
                  <div className="flex items-center gap-4 px-6 py-4 bg-card border border-border rounded-full">
                    <Search className="w-5 h-5 text-primary" />
                    <input
                      type="text"
                      placeholder="Search by route name, location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Filter Tabs */}
              <motion.div
                className="flex gap-3 flex-wrap"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
              >
                {[
                  { value: 'all', label: 'All Routes' },
                  { value: 'available', label: 'Available Now' },
                  { value: 'coming-soon', label: 'Coming Soon' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setFilterType(filter.value)}
                    className={`px-6 py-2 rounded-full font-semibold transition-all ${
                      filterType === filter.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border text-foreground hover:border-primary'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Routes Grid */}
        <section className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="mx-auto max-w-7xl">
            {filteredRoutes.length > 0 ? (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {filteredRoutes.map((route) => (
                  <motion.div
                    key={route.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all"
                    variants={staggerItem}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="p-6 space-y-4">
                      {/* Route Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-foreground mb-2 font-mono">
                            {route.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {route.frequency}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            route.type === 'available'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {route.type === 'available' ? 'Available' : 'Coming Soon'}
                        </span>
                      </div>

                      {/* Route Details */}
                      <div className="space-y-3 pt-4 border-t border-border">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-foreground">
                            {route.departure} → {route.arrival}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-foreground">
                            {route.departureTime} - {route.arrivalTime} ({route.duration})
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-foreground">
                            {route.occupied} / {route.capacity} seats available
                          </span>
                        </div>

                        {/* Capacity Bar */}
                        <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full"
                            style={{
                              width: `${(route.occupied / route.capacity) * 100}%`,
                            }}
                          />
                        </div>

                        {/* Fare */}
                        <div className="text-lg font-bold text-primary pt-2">
                          {route.fare}
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => setSelectedRoute(route.id)}
                        className={`w-full py-3 rounded-lg font-semibold transition-all ${
                          route.type === 'available'
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                        disabled={route.type !== 'available'}
                      >
                        {route.type === 'available' ? 'Book Now' : 'Join Waitlist'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                className="text-center py-16"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
              >
                <p className="text-lg text-muted-foreground">
                  No routes found matching your criteria. Try a different search.
                </p>
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-primary/5">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 font-mono">
                Route Not Found?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join our waitlist to be notified when your desired route becomes available.
              </p>
              <button className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition-colors">
                Join Waitlist
              </button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
