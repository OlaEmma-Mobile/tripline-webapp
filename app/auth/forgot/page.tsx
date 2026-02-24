import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we will send a 4-digit OTP to reset your account."
      footer={
        <p className="text-sm text-muted-foreground font-sans">
          Remembered your password?{' '}
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">
            Back to login
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
      </div>

      <Button asChild className="w-full py-6 text-base font-semibold">
        <Link href="/auth/verify-otp?flow=reset">Send OTP</Link>
      </Button>
    </AuthShell>
  );
}
