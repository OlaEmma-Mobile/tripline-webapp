'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fadeInUp } from '@/lib/animations';

const benefits = [
  {
    title: 'Guaranteed Seats',
    description: 'Reserve your place and avoid the morning rush.',
  },
  {
    title: 'Fixed Pricing',
    description: 'Know your commute costs upfront every month.',
  },
  {
    title: 'Verified Drivers',
    description: 'Professional drivers trained for corporate routes.',
  },
  {
    title: 'Time Savings',
    description: 'Optimized pickup points to cut commute time.',
  },
];

export default function AuthBenefitsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = benefits.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 5000);

    return () => clearInterval(timer);
  }, [total]);

  const activeBenefit = useMemo(() => benefits[activeIndex], [activeIndex]);

  const goPrev = () => setActiveIndex((prev) => (prev - 1 + total) % total);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % total);

  return (
    <div className="relative z-10 w-full text-left">
      <motion.div
        key={activeIndex}
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 font-mono">
          Tripline Benefits
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white font-mono">
          {activeBenefit.title}
        </h2>
        <p className="text-sm sm:text-base text-white/80 font-sans">
          {activeBenefit.description}
        </p>
      </motion.div>

      <div className="mt-8 flex items-center gap-3">
        {benefits.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              index === activeIndex
                ? 'bg-white'
                : 'bg-white/40 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <div className="mt-6 hidden lg:flex items-center gap-3">
        <button
          onClick={goPrev}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-white/80 hover:bg-white/10"
          aria-label="Previous benefit"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={goNext}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-white/80 hover:bg-white/10"
          aria-label="Next benefit"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
