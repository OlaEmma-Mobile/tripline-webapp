import React from "react"

export default function HowItWorks() {
  const features = [
    {
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      title: 'Find Routes',
      description: 'Browse available shared mobility routes across Nigeria or suggest a route that matches your commute needs.',
    },
    {
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Reserve Your Seat',
      description: 'Join the waitlist for your preferred route and secure your spot before it fills up.',
    },
  ];

  return (
    <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left Section */}
          <div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance mb-6 font-mono">
              Your all-in-one<br />
              <span className="text-primary">mobility solution</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 font-sans max-w-md">
              From your daily commute to inter-state travel, we connect you with reliable shared rides and handle the logistics so you can focus on what matters.
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full transition-colors text-sm font-mono">
              Get Started
              <span>→</span>
            </button>
          </div>

          {/* Right Section - Feature Cards */}
          <div className="flex flex-col gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    {feature.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-2 font-mono">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed font-sans text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
