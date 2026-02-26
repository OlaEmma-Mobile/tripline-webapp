'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import AuthShell from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { adminForgotPasswordClientSchema } from '@/lib/frontend-validation/admin-auth.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';

interface ForgotPasswordResponse {
  success: boolean;
  verifyToken: string;
}

export default function AdminForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({});

  const forgotMutation = useMutation({
    mutationFn: async (): Promise<ForgotPasswordResponse> => {
      const validation = validateOrReject(adminForgotPasswordClientSchema, { email }, 'Please enter a valid email.');
      if (!validation.isValid) {
        setClientFieldErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid input');
      }

      setClientFieldErrors({});
      setClientFormError(null);
      setServerFieldErrors({});

      const response = await apiRequest<ForgotPasswordResponse>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true,
      });

      if (response.hasError || !response.data) {
        setServerFieldErrors(response.errors ?? {});
        throw new Error(response.message || 'Unable to send OTP');
      }

      return response.data;
    },
    onSuccess: (data) => {
      const params = new URLSearchParams({
        flow: 'reset',
        verifyToken: data.verifyToken,
        email,
      });
      router.push(`/admin/verify-otp?${params.toString()}`);
    },
  });

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
          {serverFieldErrors.email ? <p className="mt-1 text-xs text-destructive">{serverFieldErrors.email[0]}</p> : null}
        </div>

        {forgotMutation.isError ? (
          <p className="text-sm text-destructive">{(forgotMutation.error as Error).message}</p>
        ) : null}
      </div>

      <Button
        className="w-full py-6 text-base font-semibold"
        onClick={() => void forgotMutation.mutateAsync()}
        disabled={forgotMutation.isPending}
      >
        {forgotMutation.isPending ? 'Sending OTP...' : 'Send OTP'}
      </Button>
    </AuthShell>
  );
}
