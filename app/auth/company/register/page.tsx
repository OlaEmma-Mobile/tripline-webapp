import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';

export default function CompanyRegisterPage() {
  return (
    <AuthShell
      title="Register your company"
      subtitle="Set up corporate commuting for your team with fixed routes and monthly billing."
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
            Company Name
          </label>
          <input
            type="text"
            placeholder="Your company"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Work Email
          </label>
          <input
            type="email"
            placeholder="admin@company.com"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Company Size
          </label>
          <select className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option>1-20 employees</option>
            <option>21-50 employees</option>
            <option>51-200 employees</option>
            <option>200+ employees</option>
          </select>
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
      </div>

      <Button asChild className="w-full py-6 text-base font-semibold">
        <Link href="/auth/verify-otp?flow=register">Create company account</Link>
      </Button>
    </AuthShell>
  );
}
