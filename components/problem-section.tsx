'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, AlertCircle, Frown, ArrowRight } from 'lucide-react';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import Image from 'next/image';

export default function ProblemSection() {
  const problems = [
    {
      icon: <Clock className="w-6 h-6 text-primary" />,
      title: 'Long waiting times',
      description: 'Hours at garages negotiating fares and waiting for buses to fill up',
    },
    {
      icon: <MapPin className="w-6 h-6 text-primary" />,
      title: 'Unreliable schedules',
      description: 'No guaranteed departure times or predictable routes',
    },
    {
      icon: <AlertCircle className="w-6 h-6 text-primary" />,
      title: 'No guaranteed seating',
      description: 'Overbooked trips and standing-room-only discomfort',
    },
    {
      icon: <Frown className="w-6 h-6 text-primary" />,
      title: 'Stressful commute',
      description: 'Uncertainty about arrival times affects your entire day',
    },
  ];

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Column */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <p className="text-sm font-bold text-primary uppercase tracking-wide mb-4 font-mono">
              The Problem
            </p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance mb-6 font-mono">
              Transport in Lagos is <span className="text-primary">Broken</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 font-sans">
              Daily commuters face unpredictable schedules, long waits, and zero guarantees. Traditional transport systems lack structure and reliability.
            </p>

            {/* Problems List */}
            <motion.div 
              className="space-y-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {problems.map((problem, index) => (
                <motion.div 
                  key={index} 
                  className="flex gap-4 p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors"
                  variants={staggerItem}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex-shrink-0 pt-1">
                    {problem.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-foreground mb-1 font-mono">
                      {problem.title}
                    </h3>
                    <p className="text-sm text-muted-foreground font-sans">
                      {problem.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Arrow and Right Column - Visual Section */}
          <div className="hidden lg:flex flex-col items-center justify-center relative">
            {/* Arrow connecting problem to solution */}
            <motion.div
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12"
              animate={{ x: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ArrowRight className="w-8 h-8 text-primary/40 rotate-180" />
            </motion.div>

            <motion.div 
              className="relative w-full aspect-square rounded-3xl overflow-hidden"
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Image
                src="/images/lagos-traffic.png" 
                alt="Lagos transportation chaos showing overcrowded buses and frustrated commuters" 
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
