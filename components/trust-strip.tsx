'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Clock, Zap } from 'lucide-react';

export default function TrustStrip() {
  const items = [
    { icon: <CheckCircle className="w-5 h-5 text-primary" />, text: 'Built for Lagos professionals' },
    { icon: <Clock className="w-5 h-5 text-primary" />, text: 'Designed for structured mobility' },
    { icon: <Zap className="w-5 h-5 text-primary" />, text: 'Starting with corporate routes' },
  ];

  return (
    <section className="bg-secondary px-4 sm:px-6 lg:px-8 py-8 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <motion.div 
          className="flex items-center gap-12"
          initial={{ x: 0 }}
          animate={{ x: -1000 }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          {[...items, ...items, ...items].map((item, index) => (
            <div key={index} className="flex items-center gap-3 whitespace-nowrap">
              {item.icon}
              <span className="text-sm font-semibold text-secondary-foreground">
                {item.text}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
