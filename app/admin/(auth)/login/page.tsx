import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';

export default function AdminLoginPage() {
  return (
    <AuthShell
      title="Admin login"
      subtitle="Sign in to manage routes, drivers, and corporate accounts."
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
          <Link href="/admin/forgot" className="text-primary font-semibold hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      <Button className="w-full py-6 text-base font-semibold">Login</Button>
    </AuthShell>
  );
}
