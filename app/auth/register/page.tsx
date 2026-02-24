import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Get access to corporate routes, fixed pricing, and verified drivers."
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
            placeholder="Your full name"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Email Address
          </label>
          <input
            type="email"
            placeholder="you@company.com"
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
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Password
          </label>
          <input
            type="password"
            placeholder="Create a password"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <Button asChild className="w-full py-6 text-base font-semibold">
        <Link href="/auth/verify-otp?flow=register">Create account</Link>
      </Button>
      <div className="space-y-2 text-sm text-muted-foreground font-sans">
        <p>
          Want to drive with Tripline?{' '}
          <Link href="/auth/driver/register" className="text-primary font-semibold hover:underline">
            Register as a driver
          </Link>
        </p>
        <p>
          Need corporate commuting for your team?{' '}
          <Link href="/auth/company/register" className="text-primary font-semibold hover:underline">
            Register your company
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
