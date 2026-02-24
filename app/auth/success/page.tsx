import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';

interface SuccessPageProps {
  searchParams?: { flow?: string };
}

export default function SuccessPage({ searchParams }: SuccessPageProps) {
  const flow = searchParams?.flow === 'reset' ? 'reset' : 'register';
  const title = flow === 'reset' ? 'Password reset verified' : 'Account verified';
  const subtitle =
    flow === 'reset'
      ? 'You can now log in with your new password.'
      : 'Your account has been verified successfully. Welcome to Tripline.';

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        <p className="text-sm text-muted-foreground font-sans">
          Need help?{' '}
          <Link href="/" className="text-primary font-semibold hover:underline">
            Contact support
          </Link>
        </p>
      }
    >
      <div className="rounded-2xl border border-primary/30 bg-primary/5 px-6 py-5 text-sm text-foreground">
        <p className="font-semibold text-foreground">Success!</p>
        <p className="text-muted-foreground">
          We&apos;re ready when you are. Continue to login to access your dashboard.
        </p>
      </div>

      <Button asChild className="w-full py-6 text-base font-semibold">
        <Link href="/auth/login">Back to Login</Link>
      </Button>
    </AuthShell>
  );
}
