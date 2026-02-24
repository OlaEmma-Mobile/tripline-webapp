'use client';

import React from "react"

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function MainWaitlist() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    preferredRoute: '',
    userType: 'Employee',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
    setSubmitted(true);
    setTimeout(() => {
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        preferredRoute: '',
        userType: 'Employee',
      });
      setSubmitted(false);
    }, 3000);
  };

  return (
    <section id="waitlist" className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24 overflow-hidden">
      {/* Background with green tint */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 pointer-events-none"></div>

      <div className="relative mx-auto max-w-2xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            Be the First to Ride Tripline
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            We're launching routes based on demand. Join the waitlist and help shape the future of transport.
          </p>
        </div>

        {submitted ? (
          <div className="bg-card border border-primary rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <svg className="h-12 w-12 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Welcome to Tripline!
            </h3>
            <p className="text-muted-foreground">
              Check your email for next steps. We'll notify you when your routes go live.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+234 XXX XXXX"
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Preferred Route
                </label>
                <input
                  type="text"
                  value={formData.preferredRoute}
                  onChange={(e) =>
                    setFormData({ ...formData, preferredRoute: e.target.value })
                  }
                  placeholder="e.g., Lekki to Victoria Island"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  I am a:
                </label>
                <select
                  value={formData.userType}
                  onChange={(e) =>
                    setFormData({ ...formData, userType: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Employee</option>
                  <option>Student</option>
                  <option>Business</option>
                  <option>Other</option>
                </select>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold text-base"
              >
                Join the Waitlist
              </Button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
