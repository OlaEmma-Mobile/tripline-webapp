import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import OtpInput from '@/components/otp-input';
import { Button } from '@/components/ui/button';

interface VerifyOtpPageProps {
  searchParams?: { flow?: string };
}

export default function VerifyOtpPage({ searchParams }: VerifyOtpPageProps) {
  const flow = searchParams?.flow === 'reset' ? 'reset' : 'register';
  const title = flow === 'reset' ? 'Verify password reset' : 'Verify your account';
  const subtitle =
    flow === 'reset'
      ? 'Enter the 4-digit OTP we sent to your email to reset your password.'
      : 'Enter the 4-digit OTP we sent to your email to activate your account.';

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        <div className="flex items-center justify-between text-sm text-muted-foreground font-sans">
          <span>Didn&apos;t get a code?</span>
          <button className="text-primary font-semibold opacity-60 cursor-not-allowed">
            Resend in 00:45
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Code sent to <span className="font-semibold text-foreground">j***@company.com</span>
        </div>
        <OtpInput />
      </div>

      <Button asChild className="w-full py-6 text-base font-semibold">
        <Link href={`/auth/success?flow=${flow}`}>Verify OTP</Link>
      </Button>
    </AuthShell>
  );
}
