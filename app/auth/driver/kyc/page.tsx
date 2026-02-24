import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';

export default function DriverKycPage() {
  return (
    <AuthShell
      title="Driver KYC verification"
      subtitle="Submit your documents to get approved for Tripline routes."
      footer={
        <p className="text-sm text-muted-foreground font-sans">
          Need help?{' '}
          <Link href="/" className="text-primary font-semibold hover:underline">
            Contact support
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Driver License Upload
          </label>
          <input
            type="file"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Vehicle Registration
          </label>
          <input
            type="file"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Proof of Address
          </label>
          <input
            type="file"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Guarantor Contact
          </label>
          <input
            type="text"
            placeholder="Guarantor phone number"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <Button asChild className="w-full py-6 text-base font-semibold">
        <Link href="/auth/success?flow=register">Submit for review</Link>
      </Button>
    </AuthShell>
  );
}
