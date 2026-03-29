'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import SearchForm from './search-form';
import { fadeInUp, fadeInDown, scaleIn } from '@/lib/animations';
import Image from 'next/image';
import Link from 'next/link';
import TypewriterText from '@/components/typewriter-text';

interface HeroProps {
  setSearchResults: (value: boolean) => void;
}

export default function Hero({ setSearchResults }: HeroProps) {
  const [showTyping, setShowTyping] = useState(true);

  const handleSearch = () => {
    setSearchResults(true);
  };

  return (
    <section
      className="relative -mt-32 overflow-hidden px-4 pb-0 pt-44 sm:px-6 sm:pb-0 sm:pt-52 lg:px-8"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(46, 171, 102, 0.08) 0%, rgba(46, 171, 102, 0.04) 100%), url(/hero-bg.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/60 via-background/70 to-background/75" />

      <div className="relative mx-auto mt-16 max-w-7xl">
        <div className="mb-12 grid grid-cols-1 items-center gap-8 lg:mb-16 lg:grid-cols-2 lg:gap-12">
          <motion.div className="space-y-8" variants={fadeInUp} initial="hidden" animate="visible">
            <div className="space-y-4">
              <motion.h1
                className="text-5xl font-bold leading-tight text-foreground text-balance sm:text-6xl lg:text-7xl font-mono"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
                onAnimationComplete={() => setShowTyping(false)}
              >
                {showTyping ? (
                  <>
                    <TypewriterText text="We make your ride to work stress-free" className="text-foreground" />
                  </>
                ) : (
                  <>
                    We make your ride to work <span className="text-primary">stress-free</span>
                  </>
                )}
              </motion.h1>
              <motion.p
                className="text-lg text-muted-foreground font-sans"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.35 }}
              >
                Your daily trips to work should be reliable, stress-free, safe and affordable. Join thousands of professionals who trust Tripline.
              </motion.p>
            </div>

            <motion.div
              className="flex flex-col gap-4 sm:flex-row"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.45 }}
            >
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                <Link href="/routes" className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:text-base font-mono">
                  View all available routes
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                <Link href="/#drivers" className="inline-flex rounded-full border-2 border-foreground bg-transparent px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5 sm:text-base font-mono">
                  Drive with Tripline
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div className="hidden lg:block" variants={fadeInDown} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            <motion.div
              className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-card"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02, rotate: -1 }}
            >
              <Image
                src="/images/danfo-rush.png"
                alt="Lagos commuters boarding buses"
                width={500}
                height={500}
                className="h-full w-full object-cover"
              />
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="w-full pb-12 sm:pb-16"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.55 }}
        >
          <SearchForm onSubmit={handleSearch} />
        </motion.div>
      </div>
    </section>
  );
}
