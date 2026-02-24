'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';

export default function WhyTripline() {
  const features = [
    {
      icon: (
        <svg className="w-10 h-10 text-primary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-1.5-1.5M20 7l-1.5 1.5M8 17h12m0 0l-1.5-1.5M20 17l-1.5 1.5M6 11h2v2H6v-2zm8 0h2v2h-2v-2zm-8 6h2v2H6v-2zm8 0h2v2h-2v-2z" />
        </svg>
      ),
      title: '100+ Active Routes',
      description: 'Reliable shared routes across Lagos and expanding to major Nigerian cities.',
    },
    {
      icon: (
        <svg className="w-10 h-10 text-primary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Guaranteed Seats',
      description: 'Reserved seating on every trip ensures you always get your spot.',
    },
    {
      icon: (
        <svg className="w-10 h-10 text-primary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Predictable Schedule',
      description: 'Fixed departure times mean no waiting, just reliable punctuality.',
    },
  ];

  return (
    <section id="why" className="px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <div>
            <p className="text-sm font-bold text-primary uppercase tracking-wide mb-4 font-mono">
              Why Choose Us
            </p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance font-mono">
              Why most professionals choose{' '}
              <span className="text-primary">Tripline</span>
            </h2>
          </div>
          <div className="flex items-start">
            <p className="text-lg text-muted-foreground leading-relaxed font-sans">
              Tripline eliminates transportation chaos with structured, reliable shared mobility. We provide guaranteed seats, fixed schedules, and professional service that respects your time.
            </p>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              className="flex flex-col"
              variants={staggerItem}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300, damping: 10 }}
            >
              <motion.div
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {feature.icon}
              </motion.div>
              <h3 className="text-xl font-bold text-foreground mb-3 font-mono">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed font-sans">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
