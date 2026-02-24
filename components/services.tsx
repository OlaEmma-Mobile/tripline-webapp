'use client';

import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeInUp } from '@/lib/animations';

export default function Services() {
  const services = [
    {
      badge: 'Corporate Routes',
      title: 'Professional Daily Commute',
      items: [
        'Fixed departure and arrival times',
        'Professional drivers with background checks',
        'Comfortable seating with guaranteed spots',
        'On-time guarantee or money-back',
      ],
      whyItMatters: 'Ensures professionals reach meetings and offices on time, every day.',
    },
    {
      badge: 'School Routes',
      title: 'Student Transportation',
      items: [
        'School-to-home safe passage',
        'Student-focused timing and routes',
        'Parental tracking and notifications',
        'Verified and trained drivers',
      ],
      whyItMatters: 'Gives parents peace of mind and students reliable transportation.',
    },
    {
      badge: 'Inter-State Routes',
      title: 'Long-Distance Travel',
      items: [
        'Major Nigerian city connections',
        'Premium comfort for long journeys',
        'Rest stops and safety protocols',
        'Real-time tracking and support',
      ],
      whyItMatters: 'Makes inter-city travel predictable, safe, and affordable.',
    },
    {
      badge: 'Express Routes',
      title: 'Quick Urban Transit',
      items: [
        'Limited stops for faster commutes',
        'Peak hour optimization',
        'Premium seating available',
        'Direct route guarantee',
      ],
      whyItMatters: 'Reduces commute time for professionals with time-sensitive schedules.',
    },
    {
      badge: 'Weekend Routes',
      title: 'Leisure & Social Travel',
      items: [
        'Recreation and entertainment destinations',
        'Family-friendly vehicle options',
        'Flexible scheduling',
        'Social community building',
      ],
      whyItMatters: 'Makes weekend outings accessible and stress-free for everyone.',
    },
    {
      badge: 'Premium Plus',
      title: 'VIP Shuttle Service',
      items: [
        'First-class comfortable seating',
        'Complimentary refreshments',
        'Priority boarding',
        'Dedicated customer support',
      ],
      whyItMatters: 'Delivers luxury travel experience with white-glove service.',
    },
  ];

  return (
    <section id="services" className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div 
          className="mb-12"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <p className="text-sm font-bold text-primary uppercase tracking-wide mb-4 font-mono">
            Our Services
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance font-mono">
            Why professionals choose <span className="text-primary">Tripline</span>
          </h2>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {services.map((service, index) => (
            <motion.div
              key={index}
              className="rounded-2xl bg-card border border-border p-8 flex flex-col"
              variants={staggerItem}
              whileHover={{ scale: 1.02, borderColor: 'hsl(var(--primary))' }}
              transition={{ type: 'spring', stiffness: 300, damping: 10 }}
            >
              {/* Badge */}
              <div className="mb-4">
                <span className="inline-block bg-foreground text-background text-xs font-bold px-4 py-2 rounded-full">
                  {service.badge}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-foreground mb-4 font-mono">
                {service.title}
              </h3>

              {/* Checklist Items */}
              <div className="space-y-3 mb-6 flex-1">
                {service.items.map((item, itemIndex) => (
                  <motion.div 
                    key={itemIndex} 
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: itemIndex * 0.05 }}
                  >
                    <svg
                      className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm text-foreground font-sans">{item}</span>
                  </motion.div>
                ))}
              </div>

              {/* Why It Matters */}
              <motion.div 
                className="pt-4 border-t border-border"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-sm font-sans">
                  <span className="font-semibold text-foreground">Why it matters: </span>
                  <span className="text-muted-foreground italic">{service.whyItMatters}</span>
                </p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
