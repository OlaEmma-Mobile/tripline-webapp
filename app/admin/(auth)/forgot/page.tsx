import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';

export default function AdminForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset admin password"
      subtitle="Enter your work email to receive a 4-digit OTP."
      footer={
        <p className="text-sm text-muted-foreground font-sans">
          Remembered your password?{' '}
          <Link href="/admin/login" className="text-primary font-semibold hover:underline">
            Back to login
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Work Email
          </label>
          <input
            type="email"
            placeholder="admin@tripline.ng"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <Button asChild className="w-full py-6 text-base font-semibold">
        <Link href="/admin/verify-otp?flow=reset">Send OTP</Link>
      </Button>
    </AuthShell>
  );
}
