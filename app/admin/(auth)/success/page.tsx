import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';

interface SuccessPageProps {
  searchParams?: { flow?: string };
}

export default function AdminSuccessPage({ searchParams }: SuccessPageProps) {
  const flow = searchParams?.flow === 'reset' ? 'reset' : 'login';
  const title = flow === 'reset' ? 'Admin access verified' : 'Admin access verified';
  const subtitle =
    flow === 'reset'
      ? 'Your admin account has been verified. You can sign in now.'
      : 'Your admin account has been verified. You can sign in now.';

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
          Return to login to access the admin dashboard.
        </p>
      </div>

      <Button asChild className="w-full py-6 text-base font-semibold">
        <Link href="/admin/login">Back to Admin Login</Link>
      </Button>
    </AuthShell>
  );
}
