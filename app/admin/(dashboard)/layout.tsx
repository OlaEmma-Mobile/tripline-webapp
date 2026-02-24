'use client';

import Link from 'next/link';
import { Bell, ChevronDown, LayoutGrid, Route, Users, Truck, CreditCard, LineChart } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp, slideInLeft } from '@/lib/animations';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <motion.aside
          className="hidden w-64 flex-col border-r border-border bg-card px-6 py-8 lg:flex"
          initial="hidden"
          animate="visible"
          variants={slideInLeft}
        >
          <motion.div
            className="space-y-6"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.1 }}
          >
            <motion.div variants={fadeInUp}>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground font-mono">
                Tripline Admin
              </p>
              <h2 className="text-2xl font-bold text-foreground font-mono">Operations</h2>
            </motion.div>

            <motion.nav className="space-y-2" variants={fadeInUp}>
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary"
              >
                <LayoutGrid className="h-4 w-4" />
                Overview
              </Link>
              <Link
                href="/admin/routes"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                <Route className="h-4 w-4" />
                Routes
              </Link>
              <Link
                href="/admin/riders"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                <Users className="h-4 w-4" />
                Riders
              </Link>
              <Link
                href="/admin/drivers"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                <Truck className="h-4 w-4" />
                Drivers
              </Link>
              <Link
                href="/admin/payments"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                <CreditCard className="h-4 w-4" />
                Payments
              </Link>
              <Link
                href="/admin/reports"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                <LineChart className="h-4 w-4" />
                Reports
              </Link>
            </motion.nav>
          </motion.div>
        </motion.aside>

        <div className="flex flex-1 flex-col">
          <motion.header
            className="flex items-center justify-between border-b border-border bg-background px-6 py-5"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h1 className="text-2xl font-bold text-foreground font-mono">Dashboard</h1>
              <p className="text-sm text-muted-foreground font-sans">
                Monitor your routes, riders, and daily performance.
              </p>
            </motion.div>
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <motion.button
                className="relative rounded-full border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
              </motion.button>
              <motion.button
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Admin User
                <ChevronDown className="h-4 w-4" />
              </motion.button>
            </motion.div>
          </motion.header>

          <motion.main
            className="flex-1 space-y-6 px-6 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
