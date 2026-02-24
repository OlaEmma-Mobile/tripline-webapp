'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';

interface RouteItem {
  id: string;
  from: string;
  to: string;
  status: 'Available' | 'Upcoming';
  type: 'Corporate' | 'School' | 'Inter-State';
  description: string;
  image: string;
}

interface ModalRoute extends RouteItem {
  stops: number;
  duration: string;
  price: string;
  features: string[];
  stopList: string[];
}

type SubscriptionPlan = 'week' | 'month' | 'custom' | null;

export default function RoutesSection() {
  const [selectedRoute, setSelectedRoute] = useState<ModalRoute | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(null);

  const routes: RouteItem[] = [
    {
      id: '1',
      from: 'Lekki',
      to: 'Victoria Island',
      status: 'Available',
      type: 'Corporate',
      description: 'Professional morning commute with premium comfort',
      image: 'bg-blue-100',
    },
    {
      id: '2',
      from: 'Ikoyi',
      to: 'Lekki Phase 1',
      status: 'Available',
      type: 'Corporate',
      description: 'Direct route during peak hours',
      image: 'bg-green-100',
    },
    {
      id: '3',
      from: 'Ajah',
      to: 'Ikeja',
      status: 'Available',
      type: 'Corporate',
      description: 'Cross-Lagos express route',
      image: 'bg-purple-100',
    },
    {
      id: '4',
      from: 'Yaba',
      to: 'VI',
      status: 'Upcoming',
      type: 'Corporate',
      description: 'Coming soon for tech professionals',
      image: 'bg-orange-100',
    },
    {
      id: '5',
      from: 'Surulere',
      to: 'Lekki',
      status: 'Upcoming',
      type: 'School',
      description: 'Student-focused safe transportation',
      image: 'bg-yellow-100',
    },
    {
      id: '6',
      from: 'Lagos',
      to: 'Ibadan',
      status: 'Upcoming',
      type: 'Inter-State',
      description: 'Inter-city express service',
      image: 'bg-red-100',
    },
  ];

  const getModalData = (route: RouteItem): ModalRoute => ({
    ...route,
    stops: Math.floor(Math.random() * 5) + 2,
    duration: `${Math.floor(Math.random() * 45) + 30} mins`,
    price: `₦${(Math.floor(Math.random() * 2) + 1) * 1000}`,
    features: [
      'Professional drivers',
      'GPS tracking',
      'Guaranteed seat',
      'AC comfort',
    ],
    stopList: ['Central Station', 'Business District', 'Tech Hub', 'Main Terminal'],
  });

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Corporate':
        return 'bg-primary/10 text-primary';
      case 'School':
        return 'bg-blue-100 text-blue-700';
      case 'Inter-State':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const availableRoutes = routes.filter((r) => r.status === 'Available');
  const upcomingRoutes = routes.filter((r) => r.status === 'Upcoming');

  const RouteCard = ({ route }: { route: RouteItem }) => (
    <motion.button
      onClick={() => {
        setSelectedRoute(getModalData(route));
        setSelectedPlan(null);
      }}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all text-left"
      whileHover={{ scale: 1.02 }}
    >
      <div className="p-6 space-y-4">
        {/* Route Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2 font-mono">
              {route.from} → {route.to}
            </h3>
            <p className="text-sm text-muted-foreground">
              {route.type} Route
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
              route.status === 'Available'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {route.status}
          </span>
        </div>

        {/* Route Details */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-foreground">
              {route.from} → {route.to}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-foreground">
              {route.description}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.9M15 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-sm text-foreground">
              {Math.floor(Math.random() * 5) + 2} stops • Limited seats
            </span>
          </div>

          {/* Capacity Bar */}
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full"
              style={{
                width: `${Math.floor(Math.random() * 40) + 40}%`,
              }}
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            setSelectedRoute(getModalData(route));
            setSelectedPlan(null);
          }}
          className={`w-full py-3 rounded-lg font-semibold transition-all ${
            route.status === 'Available'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          disabled={route.status !== 'Available'}
        >
          {route.status === 'Available' ? 'View Details' : 'Join Waitlist'}
        </button>
      </div>
    </motion.button>
  );

  const MapVisualization = ({ route }: { route: ModalRoute }) => {
    const positions = [
      { name: route.from, x: 20, y: 50, isStart: true },
      { name: route.stopList[0], x: 40, y: 30 },
      { name: route.stopList[1], x: 60, y: 70 },
      { name: route.stopList[2], x: 80, y: 40 },
      { name: route.to, x: 95, y: 60, isEnd: true },
    ];

    return (
      <div className="relative w-full h-96 bg-card border border-border rounded-xl overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Route line */}
          <path
            d={`M ${positions.map((p) => `${p.x},${p.y}`).join(' L ')}`}
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            className="text-primary/40"
          />

          {/* Stop points */}
          {positions.map((pos, idx) => (
            <g key={idx}>
              {/* Circle background */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="3.5"
                fill="currentColor"
                className={pos.isStart ? 'text-green-500' : pos.isEnd ? 'text-red-500' : 'text-primary'}
              />
              {/* Outer ring for start/end */}
              {(pos.isStart || pos.isEnd) && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="5.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className={pos.isStart ? 'text-green-500' : 'text-red-500'}
                  opacity="0.3"
                />
              )}
            </g>
          ))}
        </svg>

        {/* Labels */}
        <div className="absolute inset-0 pointer-events-none">
          {positions.map((pos, idx) => (
            <div
              key={idx}
              className="absolute transform -translate-x-1/2"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                marginTop: '30px',
              }}
            >
              <div className="text-xs font-semibold text-foreground bg-background px-2 py-1 rounded whitespace-nowrap border border-border">
                {pos.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section id="routes" className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 text-balance font-mono">
            Available & Incoming Routes
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl font-sans">
            Discover routes that work for you. Click on any route to see details and subscribe to our waitlist.
          </p>
        </motion.div>

        {/* Available Routes */}
        {availableRoutes.length > 0 && (
          <motion.div 
            className="mb-12"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <h3 className="text-2xl font-bold text-foreground mb-6 font-mono">
              Now Available
            </h3>
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {availableRoutes.map((route) => (
                <motion.div key={route.id} variants={staggerItem}>
                  <RouteCard route={route} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* Upcoming Routes */}
        {upcomingRoutes.length > 0 && (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <h3 className="text-2xl font-bold text-foreground mb-6 font-mono">
              Coming Soon - Join the Waitlist
            </h3>
            <p className="text-muted-foreground mb-6 font-sans">
              We're gathering interested users to launch these routes. Join the waitlist now and be among the first to book when available.
            </p>
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {upcomingRoutes.map((route) => (
                <motion.div key={route.id} variants={staggerItem}>
                  <RouteCard route={route} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {selectedRoute && (
          <motion.div 
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" 
            onClick={() => setSelectedRoute(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-background w-full sm:max-w-4xl sm:rounded-2xl max-h-[90vh] overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Header with close button */}
              <div className="sticky top-0 bg-background border-b border-border flex items-center justify-between p-6 z-10">
                <div>
                  <h2 className="text-3xl font-bold text-foreground font-mono">
                    {selectedRoute.from} → {selectedRoute.to}
                  </h2>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full inline-block mt-2 ${getTypeBadgeColor(selectedRoute.type)}`}>
                    {selectedRoute.type}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedRoute(null)}
                  className="text-muted-foreground hover:text-foreground text-3xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-8">
                  {/* Map Visualization */}
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-4 font-mono">Route Map</h3>
                    <MapVisualization route={selectedRoute} />
                    <div className="mt-4 flex items-center gap-8 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-foreground">Start Point</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="text-foreground">Stops</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-foreground">End Point</span>
                      </div>
                    </div>
                  </div>

                  {/* Route Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-card border border-border p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Duration</p>
                      <p className="text-lg font-bold text-foreground">{selectedRoute.duration}</p>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Stops</p>
                      <p className="text-lg font-bold text-foreground">{selectedRoute.stops}</p>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Price/Trip</p>
                      <p className="text-lg font-bold text-primary">{selectedRoute.price}</p>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="text-lg font-bold text-foreground capitalize">{selectedRoute.status}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-4 font-mono">Features</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedRoute.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-foreground font-sans">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subscription Plans */}
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-4 font-mono">Choose Your Plan</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <button
                        onClick={() => setSelectedPlan('week')}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedPlan === 'week'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <p className="font-bold text-foreground font-mono">1 Week</p>
                        <p className="text-sm text-muted-foreground">₦7,000</p>
                        <p className="text-xs text-muted-foreground mt-1">5 working days</p>
                      </button>
                      <button
                        onClick={() => setSelectedPlan('month')}
                        className={`p-4 rounded-lg border-2 transition-all text-left relative ${
                          selectedPlan === 'month'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                          Save 10%
                        </div>
                        <p className="font-bold text-foreground font-mono">1 Month</p>
                        <p className="text-sm text-muted-foreground">₦27,000</p>
                        <p className="text-xs text-muted-foreground mt-1">20 working days</p>
                      </button>
                      <button
                        onClick={() => setSelectedPlan('custom')}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedPlan === 'custom'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <p className="font-bold text-foreground font-mono">Custom Days</p>
                        <p className="text-sm text-muted-foreground">Flexible</p>
                        <p className="text-xs text-muted-foreground mt-1">Choose your days</p>
                      </button>
                    </div>

                    {/* Custom Days Selection */}
                    {selectedPlan === 'custom' && (
                      <div className="bg-card border border-border p-4 rounded-lg mb-6">
                        <p className="text-sm font-semibold text-foreground mb-3">Select your preferred days:</p>
                        <div className="grid grid-cols-7 gap-2">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                            <button
                              key={day}
                              className="py-2 px-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-sm font-semibold text-foreground transition-all"
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Waitlist Info */}
                  {selectedRoute.status === 'Upcoming' && (
                    <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Waitlist Status
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Join our waitlist by subscribing below. We're gathering users to launch this route soon!
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Sticky Footer */}
                <div className="sticky bottom-0 bg-background border-t border-border p-6 space-y-3">
                  {selectedRoute.status === 'Available' ? (
                    <>
                      <button
                        disabled={!selectedPlan}
                        className={`w-full py-3 px-4 rounded-full font-bold transition-colors ${
                          selectedPlan
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        Subscribe to {selectedPlan === 'week' ? '1 Week' : selectedPlan === 'month' ? '1 Month' : 'Custom Days'}
                      </button>
                      <button
                        onClick={() => setSelectedRoute(null)}
                        className="w-full py-3 px-4 rounded-full font-bold border-2 border-border text-foreground hover:bg-muted/50 transition-colors"
                      >
                        Close
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="w-full py-3 px-4 rounded-full font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                        Join Waitlist
                      </button>
                      <button
                        onClick={() => setSelectedRoute(null)}
                        className="w-full py-3 px-4 rounded-full font-bold border-2 border-border text-foreground hover:bg-muted/50 transition-colors"
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
