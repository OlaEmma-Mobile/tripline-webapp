'use client';

import { useState } from 'react';
import Header from '@/components/header';
import Hero from '@/components/hero';
import TrustStrip from '@/components/trust-strip';
import ProblemSection from '@/components/problem-section';
import WhatIsTripline from '@/components/what-is-tripline';
import Services from '@/components/services';
import RoutesSection from '@/components/routes-section';
import RouteSuggestion from '@/components/route-suggestion';
import HowItWorks from '@/components/how-it-works';
import WhyTripline from '@/components/why-tripline';
import DriverWaitlist from '@/components/driver-waitlist';
import MainWaitlist from '@/components/main-waitlist';
import Footer from '@/components/footer';

export default function Home() {
  const [searchResults, setSearchResults] = useState<boolean>(false);

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Hero setSearchResults={setSearchResults} />
      <TrustStrip />
      <ProblemSection />
      <WhatIsTripline />
      <Services />
      <RoutesSection />
      <RouteSuggestion />
      <HowItWorks />
      <WhyTripline />
      <DriverWaitlist />
      <MainWaitlist />
      <Footer />
    </main>
  );
}
