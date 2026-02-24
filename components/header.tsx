'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-4 left-4 right-4 z-50 w-auto mx-auto max-w-7xl border border-border bg-background/80 backdrop-blur-md rounded-full">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/TRIPLINE%201-T0uXpNlWuBnWJ9udnApnnZXJoNoUEk.png"
              alt="Tripline - Reliable Shared Mobility"
              className="h-9 w-[100px] object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/routes"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Explore Routes
            </Link>
            <button
              onClick={() => scrollToSection('routes')}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Featured Routes
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('why')}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Why Tripline
            </button>
            <button
              onClick={() => scrollToSection('drivers')}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Drive with Us
            </button>
          </nav>

          {/* Auth + CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild className="text-sm">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild className="rounded-full px-5 text-sm">
              <Link href="/auth/register">Register</Link>
            </Button>
            <Button
              onClick={() => scrollToSection('waitlist')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 text-sm"
            >
              Join Waitlist
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pt-4 border-t border-border mt-4">
            <button
              onClick={() => scrollToSection('routes')}
              className="block w-full text-left py-2 text-sm font-medium text-foreground hover:text-primary"
            >
              Routes
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left py-2 text-sm font-medium text-foreground hover:text-primary"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('why')}
              className="block w-full text-left py-2 text-sm font-medium text-foreground hover:text-primary"
            >
              Why Tripline
            </button>
            <div className="mt-4 space-y-2">
              <Button asChild variant="ghost" className="w-full text-sm">
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild className="w-full text-sm">
                <Link href="/auth/register">Register</Link>
              </Button>
              <Button
                onClick={() => scrollToSection('waitlist')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm"
              >
                Join Waitlist
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
