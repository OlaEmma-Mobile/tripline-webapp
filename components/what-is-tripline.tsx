'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem, scaleIn } from '@/lib/animations';

export default function WhatIsTripline() {
  const testimonials = [
    {
      label: 'The Problem',
      title: 'Unreliable Transportation',
      quote:
        'Commuters faced hours at garages, unpredictable schedules, uncertainty about availability, and inconsistent pricing. Long waits and no guarantees made daily trips stressful.',
    },
    {
      label: 'The Tripline Solution',
      title: 'Stress-Free, Reliable Commutes',
      quote:
        'Fixed routes with scheduled departure times, guaranteed seats, verified drivers, transparent pricing, and real-time tracking. Commuters now plan their day with confidence and reliability.',
    },
  ];

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {/* Label */}
          <motion.p 
            className="text-sm font-bold text-primary uppercase tracking-widest mb-4 font-mono"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            What is Tripline?
          </motion.p>

          {/* Main Headline */}
          <motion.h2 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance mb-6 font-mono"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Transform your commute from <span className="text-primary">chaos to certainty</span>
          </motion.h2>

          <motion.p 
            className="text-lg text-muted-foreground max-w-2xl mx-auto font-sans"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            Tripline is a shared mobility platform delivering reliable, fixed-route transportation with guaranteed seats, verified drivers, and predictable schedules.
          </motion.p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div 
              key={index} 
              className="flex flex-col"
              variants={staggerItem}
            >
              {/* Label */}
              <div className="mb-4">
                <span className="inline-block bg-foreground text-background text-xs font-bold px-3 py-1 rounded-full font-mono">
                  {testimonial.label}
                </span>
              </div>

              {/* Card */}
              <motion.div 
                className="flex-1 bg-card border border-border p-8 rounded-xl"
                whileHover={{ scale: 1.02, borderColor: 'hsl(var(--primary))' }}
                transition={{ type: 'spring', stiffness: 300, damping: 10 }}
              >
                <h3 className="text-xl font-bold text-foreground mb-4 font-mono">
                  {testimonial.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed font-sans">
                  "{testimonial.quote}"
                </p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Key Features */}
        <motion.div 
          className="bg-card border border-border p-8 sm:p-12 rounded-2xl"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h3 className="text-2xl font-bold text-foreground mb-8 text-center font-mono">
            Why Choose Tripline?
          </h3>
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div 
              className="text-center"
              variants={staggerItem}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="mb-3"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <svg className="w-8 h-8 text-primary mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4m0 0L3 5m0 0v8m0-8l8 8" />
                </svg>
              </motion.div>
              <p className="font-semibold text-foreground text-sm">Fixed Routes</p>
              <p className="text-xs text-muted-foreground mt-1">Predictable pathways</p>
            </motion.div>

            <motion.div 
              className="text-center"
              variants={staggerItem}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="mb-3"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.2 }}
              >
                <svg className="w-8 h-8 text-primary mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>
              <p className="font-semibold text-foreground text-sm">Schedules</p>
              <p className="text-xs text-muted-foreground mt-1">Always on time</p>
            </motion.div>

            <motion.div 
              className="text-center"
              variants={staggerItem}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="mb-3"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.4 }}
              >
                <svg className="w-8 h-8 text-primary mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </motion.div>
              <p className="font-semibold text-foreground text-sm">Verified</p>
              <p className="text-xs text-muted-foreground mt-1">Trusted drivers</p>
            </motion.div>

            <motion.div 
              className="text-center"
              variants={staggerItem}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="mb-3"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.6 }}
              >
                <svg className="w-8 h-8 text-primary mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </motion.div>
              <p className="font-semibold text-foreground text-sm">Guaranteed Seats</p>
              <p className="text-xs text-muted-foreground mt-1">Your spot reserved</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
