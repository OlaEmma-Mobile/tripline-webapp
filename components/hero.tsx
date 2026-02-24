'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import SearchForm from './search-form';
import { fadeInUp, fadeInDown, scaleIn } from '@/lib/animations';
import Image from 'next/image';

interface HeroProps {
  setSearchResults: (value: boolean) => void;
}

export default function Hero({ setSearchResults }: HeroProps) {
  const handleSearch = () => {
    setSearchResults(true);
  };

  return (
    <section 
      className="relative px-4 sm:px-6 lg:px-8 pt-44 sm:pt-52 pb-0 overflow-hidden -mt-32"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(46, 171, 102, 0.08) 0%, rgba(46, 171, 102, 0.04) 100%), url(/hero-bg.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay for better text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background/75 pointer-events-none" />
      
      <div className="relative mx-auto mt-16 max-w-7xl">
        {/* Top Section: Text + Image Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-12 sm:mb-16">
          {/* Left: Text Content */}
          <motion.div 
            className="space-y-8"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
          >
            <div className="space-y-4">
              <motion.h1 
                className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground text-balance leading-tight font-mono"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
              >
                We make your ride to work <span className="text-primary">stress-free</span>
              </motion.h1>
              <motion.p 
                className="text-lg text-muted-foreground font-sans"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
              >
                Your daily trips to work should be reliable, stress-free, safe and affordable. Join thousands of professionals who trust Tripline.
              </motion.p>
            </div>
            
            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
            >
              <motion.button 
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full transition-colors text-sm sm:text-base font-mono"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                View all available routes
              </motion.button>
              <motion.button 
                className="px-6 py-3 bg-transparent border-2 border-foreground hover:bg-foreground/5 text-foreground font-semibold rounded-full transition-colors text-sm sm:text-base font-mono"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Join Waitlist
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right: Hero Image Placeholder */}
          <motion.div 
            className="hidden lg:block"
            variants={fadeInDown}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
          >
            <motion.div 
              className="relative aspect-square bg-card border border-border rounded-3xl overflow-hidden flex items-center justify-center"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
            >
              <Image 
                src="/images/danfo-rush.png" 
                alt="Lagos commuters boarding buses" 
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Section: Search Form */}
        <motion.div 
          className="w-full pb-12 sm:pb-16"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
        >
          <SearchForm onSubmit={handleSearch} />
        </motion.div>
      </div>
    </section>
  );
}
