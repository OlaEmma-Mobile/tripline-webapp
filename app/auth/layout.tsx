import Image from 'next/image';
import AuthBenefitsCarousel from '@/components/auth-benefits-carousel';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto- flex min-h-screen max-w-7xl- items-stretch px-4- sm:px-6- lg:px-8-">
        <div className="grid w-full grid-cols-1 gap-10- py-16- lg:grid-cols-[1.1fr_0.9fr]">
          <section className="order-2 flex items-center h-screen lg:order-1">
            <div className="relative w-full h-screen overflow-hidden rounded-3xl- border border-border bg-foreground/90">
              <div className="absolute inset-0">
                <Image
                  src="/hero-bg.jpg"
                  alt="Tripline commuters"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-br from-foreground/80 via-foreground/70 to-foreground/60" />
              </div>
              <div className="relative z-10 flex h-full min-h-[420px] flex-col justify-between p-8 sm:p-10">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/70 font-mono">
                    Tripline Corporate
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white font-mono">
                    Reliable commutes for Lagos professionals
                  </h1>
                  <p className="text-sm text-white/70 font-sans">
                    Fixed routes, guaranteed seats, and predictable schedules built for modern teams.
                  </p>
                </div>
                <AuthBenefitsCarousel />
              </div>
            </div>
          </section>

          <section className="order-1 h-screen flex items-center lg:order-2">
            <div className="w-full h-full flex flex-col justify-center bg-card">{children}</div>
          </section>
        </div>
      </main>
    </div>
  );
}
