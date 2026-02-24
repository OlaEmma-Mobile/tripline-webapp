'use client';

import React from "react"

import { useState } from 'react';
import SearchForm from './search-form';

export default function RouteSuggestion() {
  const handleSubmit = (data: any) => {
    console.log('Route suggestion:', data);
    // Reset form or handle submission
  };

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-4xl sm:text-5xl font-bold text-foreground text-center mb-4 text-balance font-mono">
          Suggest a Route
        </h2>
        <p className="text-center text-muted-foreground mb-12 font-sans">
          Help us understand your mobility needs. Popular routes are launched first.
        </p>

        <SearchForm 
          title=""
          showTitle={false}
          onSubmit={handleSubmit}
        />

        <p className="text-center text-sm text-muted-foreground mt-6 font-sans">
          Popular routes are launched first.
        </p>
      </div>
    </section>
  );
}
