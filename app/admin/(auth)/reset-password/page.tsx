'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { adminResetPasswordClientSchema } from '@/lib/frontend-validation/admin-auth.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';

interface ResetPasswordResponse {
  success: boolean;
}

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyToken = searchParams.get('verifyToken') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({});

  const resetMutation = useMutation({
    mutationFn: async (): Promise<ResetPasswordResponse> => {
      const validation = validateOrReject(
        adminResetPasswordClientSchema,
        { verifyToken, newPassword, confirmPassword },
        'Please fix the form errors before submitting.'
      );
      if (!validation.isValid) {
        setClientFieldErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid reset password payload');
      }

      setClientFieldErrors({});
      setClientFormError(null);
      setServerFieldErrors({});

      const response = await apiRequest<ResetPasswordResponse>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword, verifyToken }),
        skipAuth: true,
      });

      if (response.hasError || !response.data) {
        setServerFieldErrors(response.errors ?? {});
        throw new Error(response.message || 'Unable to reset password');
      }

      return response.data;
    },
    onSuccess: () => {
      router.push('/admin/success?flow=reset');
    },
  });

  return (
    <AuthShell
      title="Set new admin password"
      subtitle="Use a strong password with at least 8 characters."
      footer={
        <p className="text-sm text-muted-foreground font-sans">
          Back to{' '}
          <Link href="/admin/login" className="text-primary font-semibold hover:underline">
            admin login
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {clientFormError ? <p className="text-sm text-destructive">{clientFormError}</p> : null}
        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            New Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {clientFieldErrors.newPassword ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.newPassword[0]}</p> : null}
          {serverFieldErrors.newPassword ? <p className="mt-1 text-xs text-destructive">{serverFieldErrors.newPassword[0]}</p> : null}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-foreground mb-2 font-mono">
            Confirm Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {clientFieldErrors.confirmPassword ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.confirmPassword[0]}</p> : null}
          {serverFieldErrors.confirmPassword ? <p className="mt-1 text-xs text-destructive">{serverFieldErrors.confirmPassword[0]}</p> : null}
        </div>

        {resetMutation.isError ? (
          <p className="text-sm text-destructive">{(resetMutation.error as Error).message}</p>
        ) : null}
      </div>

      <Button
        className="w-full py-6 text-base font-semibold"
        onClick={() => void resetMutation.mutateAsync()}
        disabled={resetMutation.isPending || !verifyToken}
      >
        {resetMutation.isPending ? 'Updating...' : 'Reset Password'}
      </Button>
    </AuthShell>
  );
}
