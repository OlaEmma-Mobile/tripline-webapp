'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { adminLoginClientSchema } from '@/lib/frontend-validation/admin-auth.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { useAdminLoginMutation } from '@/lib/hooks/use-admin-auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const loginMutation = useAdminLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    const validation = validateOrReject(
      adminLoginClientSchema,
      { email, password },
      'Please enter a valid email and password.'
    );
    if (!validation.isValid) {
      setClientFieldErrors(validation.fieldErrors);
      setClientFormError(validation.formMessage);
      return;
    }

    setClientFieldErrors({});
    setClientFormError(null);

    try {
      await loginMutation.mutateAsync({ email, password });
      router.replace('/admin');
    } catch {
      // error is rendered below from mutation state.
    }
  }

  return (
    <AuthShell
      title="Admin login"
      subtitle="Sign in to manage routes, drivers, and corporate accounts."
    >
      <div className="space-y-4">
        {clientFormError ? <p className="text-sm text-destructive">{clientFormError}</p> : null}
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Work Email
          </label>
          <input
            type="email"
            placeholder="admin@tripline.ng"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {clientFieldErrors.email ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.email[0]}</p> : null}
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {clientFieldErrors.password ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.password[0]}</p> : null}
        </div>
        <div className="flex items-center justify-between text-sm">
          <Link href="/admin/forgot" className="text-primary font-semibold hover:underline">
            Forgot password?
          </Link>
        </div>
        {loginMutation.isError ? (
          <p className="text-sm text-destructive">
            {(loginMutation.error as Error)?.message ?? 'Login failed'}
          </p>
        ) : null}
      </div>

      <Button
        className="w-full py-6 text-base font-semibold"
        onClick={() => void submit()}
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? 'Signing in...' : 'Login'}
      </Button>
    </AuthShell>
  );
}
