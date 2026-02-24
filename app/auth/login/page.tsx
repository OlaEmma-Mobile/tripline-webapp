import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to manage your routes, bookings, and team commuters."
      footer={
        <p className="text-sm text-muted-foreground font-sans">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-primary font-semibold hover:underline">
            Register
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
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
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <Link href="/auth/forgot" className="text-primary font-semibold hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      <Button className="w-full py-6 text-base font-semibold">Login</Button>
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
