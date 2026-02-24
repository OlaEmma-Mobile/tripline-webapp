import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';

export default function DriverRegisterPage() {
  return (
    <AuthShell
      title="Register as a driver"
      subtitle="Start earning with fixed routes and verified corporate riders."
      footer={
        <p className="text-sm text-muted-foreground font-sans">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">
            Login
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Full Name
          </label>
          <input
            type="text"
            placeholder="Driver full name"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Email Address
          </label>
          <input
            type="email"
            placeholder="driver@tripline.ng"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Phone Number
          </label>
          <input
            type="tel"
            placeholder="+234 800 000 0000"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
              Vehicle Type
            </label>
            <select className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Sedan</option>
              <option>SUV</option>
              <option>Van</option>
              <option>Minibus</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
              License Number
            </label>
            <input
              type="text"
              placeholder="Enter license ID"
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <Button asChild className="w-full py-6 text-base font-semibold">
        <Link href="/auth/driver/kyc">Continue to KYC</Link>
      </Button>
    </AuthShell>
  );
}
