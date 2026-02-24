'use client';

import React from "react"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, CheckCircle, ArrowRight } from 'lucide-react';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';

export default function DriverWaitlist() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    vehicleType: '',
    experience: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would send the data to your backend
    setSubmitted(true);
    setTimeout(() => {
      setFormData({ fullName: '', email: '', phone: '', vehicleType: '', experience: '' });
      setSubmitted(false);
    }, 3000);
  };

  const benefits = [
    {
      icon: <Truck className="w-8 h-8 text-primary" />,
      title: 'Flexible Schedule',
      description: 'Drive when you want with full control over your schedule',
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-primary" />,
      title: 'Guaranteed Income',
      description: 'Predictable earnings with fixed route incentives',
    },
    {
      icon: <ArrowRight className="w-8 h-8 text-primary" />,
      title: 'Professional Community',
      description: 'Join a network of verified and professional drivers',
    },
  ];

  return (
    <section id="drivers" className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-gradient-to-b from-background to-primary/5">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <p className="text-sm font-bold text-primary uppercase tracking-wide mb-4 font-mono">
            Join Our Platform
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance mb-6 font-mono">
            Become a <span className="text-primary">Tripline Driver</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-sans">
            Earn reliable income by providing safe, professional transportation. Join thousands of drivers delivering excellence in Lagos.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Benefits Section */}
          <motion.div
            className="space-y-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-8 font-mono">Why Drive with Tripline?</h3>
            </div>

            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="flex gap-4 p-6 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors"
                variants={staggerItem}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex-shrink-0 pt-1">{benefit.icon}</div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-foreground mb-2 font-mono">
                    {benefit.title}
                  </h4>
                  <p className="text-muted-foreground font-sans">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Form Section */}
          <motion.div
            className="bg-card border border-border rounded-2xl p-8 sticky top-24"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {!submitted ? (
              <>
                <h3 className="text-2xl font-bold text-foreground mb-6 font-mono">
                  Join Our Waitlist
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="text-xs font-bold text-foreground uppercase mb-2 block font-mono">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      required
                      className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs font-bold text-foreground uppercase mb-2 block font-mono">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      required
                      className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-xs font-bold text-foreground uppercase mb-2 block font-mono">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+234 XXX XXX XXXX"
                      required
                      className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Vehicle Type */}
                  <div>
                    <label className="text-xs font-bold text-foreground uppercase mb-2 block font-mono">
                      Vehicle Type
                    </label>
                    <select
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground outline-none focus:border-primary transition-colors"
                    >
                      <option value="">Select vehicle type</option>
                      <option value="sedan">Sedan (4-5 passengers)</option>
                      <option value="suv">SUV (6-8 passengers)</option>
                      <option value="van">Van (10-15 passengers)</option>
                      <option value="bus">Minibus (15-25 passengers)</option>
                    </select>
                  </div>

                  {/* Experience */}
                  <div>
                    <label className="text-xs font-bold text-foreground uppercase mb-2 block font-mono">
                      Driving Experience
                    </label>
                    <select
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground outline-none focus:border-primary transition-colors"
                    >
                      <option value="">Select experience level</option>
                      <option value="1-3">1-3 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="5-10">5-10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    className="w-full mt-6 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Join Waitlist
                  </motion.button>

                  <p className="text-xs text-muted-foreground text-center">
                    We'll be in touch within 24 hours with next steps.
                  </p>
                </form>
              </>
            ) : (
              <motion.div
                className="space-y-4 text-center py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                </motion.div>
                <h4 className="text-xl font-bold text-foreground font-mono">
                  You're on the waitlist!
                </h4>
                <p className="text-muted-foreground">
                  Thank you for your interest. We'll contact you soon with more information.
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
