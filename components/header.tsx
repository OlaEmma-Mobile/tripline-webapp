'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const navLinks = [
  { label: 'Routes', href: '/routes', sectionId: 'routes' },
  { label: 'How It Works', href: '/#how-it-works', sectionId: 'how-it-works' },
  { label: 'Why Tripline', href: '/#why', sectionId: 'why' },
  { label: 'Drive With Us', href: '/#drivers', sectionId: 'drivers' },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const scrollToSection = (id: string) => {
    if (pathname !== '/') {
      window.location.href = `/#${id}`;
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMenuOpen(false);
  };

  const handleNavClick = (href: string, sectionId?: string) => {
    if (sectionId) {
      scrollToSection(sectionId);
      return;
    }
    setIsMenuOpen(false);
    window.location.href = href;
  };

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-x-0 top-4 z-50 px-4 sm:px-4"
    >
      <div className={`mx-auto max-w-7xl- container ${isMenuOpen ? 'rounded-2xl' : 'rounded-4xl'} border border-border/70 bg-background/80 shadow-lg shadow-black/5 backdrop-blur-xl`}>
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/TRIPLINE%201-T0uXpNlWuBnWJ9udnApnnZXJoNoUEk.png"
              alt="Tripline"
              className="h-9 md:w-25 w-20 object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href, link.sectionId)}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Button variant="ghost" asChild className="rounded-full px-4 text-sm">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild className="rounded-full px-5 text-sm">
              <Link href="/auth/register">Get Started</Link>
            </Button>
          </div>

          <button
            className="inline-flex rounded-full border border-border/70 p-2 text-foreground transition-colors hover:bg-muted lg:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {isMenuOpen ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden border-t border-border/70 lg:hidden"
            >
              <div className="space-y-2 px-4 py-4 sm:px-6">
                {navLinks.map((link, index) => (
                  <motion.button
                    key={link.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => handleNavClick(link.href, link.sectionId)}
                    className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
                  >
                    {link.label}
                  </motion.button>
                ))}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="ghost" asChild className="rounded-full">
                    <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                      Login
                    </Link>
                  </Button>
                  <Button asChild className="rounded-full">
                    <Link href="/auth/register" onClick={() => setIsMenuOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
