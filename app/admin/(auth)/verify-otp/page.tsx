'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import AuthShell from '@/components/auth-shell';
import OtpInput from '@/components/otp-input';
import { Button } from '@/components/ui/button';
import { adminResendOtpClientSchema, adminVerifyOtpClientSchema } from '@/lib/frontend-validation/admin-auth.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';

interface VerifyOtpResponse {
  success: boolean;
  purpose: 'verify_email' | 'reset_password';
  verifyToken?: string;
}

interface ResendOtpResponse {
  success: boolean;
  verifyToken: string;
  purpose: 'verify_email' | 'reset_password';
}

export default function AdminVerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = searchParams.get('flow') === 'reset' ? 'reset' : 'login';
  const email = searchParams.get('email') ?? '';

  const [verifyToken, setVerifyToken] = useState(searchParams.get('verifyToken') ?? '');
  const [otpValue, setOtpValue] = useState('');
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({});

  const title = flow === 'reset' ? 'Verify admin reset' : 'Verify admin access';
  const subtitle =
    flow === 'reset'
      ? 'Enter the 4-digit OTP we sent to your work email.'
      : 'Enter the 4-digit OTP we sent to your work email to proceed.';

  const maskedEmail = useMemo(() => {
    if (!email) return 'a***@tripline.ng';
    const [name, domain] = email.split('@');
    if (!name || !domain) return 'a***@tripline.ng';
    return `${name.slice(0, 1)}***@${domain}`;
  }, [email]);

  const verifyMutation = useMutation({
    mutationFn: async (): Promise<VerifyOtpResponse> => {
      const validation = validateOrReject(
        adminVerifyOtpClientSchema,
        { verifyToken, otp: otpValue },
        'Enter a valid 4-digit OTP.'
      );
      if (!validation.isValid) {
        setClientFieldErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid OTP payload');
      }

      setClientFieldErrors({});
      setClientFormError(null);
      setServerFieldErrors({});

      const response = await apiRequest<VerifyOtpResponse>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ verifyToken, otp: otpValue }),
        skipAuth: true,
      });

      if (response.hasError || !response.data) {
        setServerFieldErrors(response.errors ?? {});
        throw new Error(response.message || 'OTP verification failed');
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (flow === 'reset') {
        const resetToken = data.verifyToken;
        if (!resetToken) {
          throw new Error('Missing reset verification token');
        }
        router.push(`/admin/reset-password?verifyToken=${encodeURIComponent(resetToken)}`);
        return;
      }

      router.push('/admin/success?flow=login');
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (): Promise<ResendOtpResponse> => {
      const validation = validateOrReject(
        adminResendOtpClientSchema,
        { verifyToken },
        'Verification token is required before resending OTP.'
      );
      if (!validation.isValid) {
        setClientFieldErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid resend payload');
      }

      setClientFieldErrors({});
      setClientFormError(null);

      const response = await apiRequest<ResendOtpResponse>('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ verifyToken }),
        skipAuth: true,
      });

      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to resend OTP');
      }

      return response.data;
    },
    onSuccess: (data) => {
      setVerifyToken(data.verifyToken);
      setOtpValue('');
      setClientFieldErrors({});
      setServerFieldErrors({});
    },
  });

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        <div className="flex items-center justify-between text-sm text-muted-foreground font-sans">
          <span>Didn&apos;t get a code?</span>
          <button
            className="text-primary font-semibold hover:underline disabled:opacity-60"
            onClick={() => void resendMutation.mutateAsync()}
            disabled={resendMutation.isPending || !verifyToken}
          >
            {resendMutation.isPending ? 'Resending...' : 'Resend code'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {clientFormError ? <p className="text-sm text-destructive">{clientFormError}</p> : null}
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Code sent to <span className="font-semibold text-foreground">{maskedEmail}</span>
        </div>
        <OtpInput
          onComplete={(value) => {
            setOtpValue(value);
          }}
        />
        {clientFieldErrors.otp ? <p className="text-xs text-destructive">{clientFieldErrors.otp[0]}</p> : null}
        {serverFieldErrors.otp ? <p className="text-xs text-destructive">{serverFieldErrors.otp[0]}</p> : null}
        {clientFieldErrors.verifyToken ? <p className="text-xs text-destructive">{clientFieldErrors.verifyToken[0]}</p> : null}
        {verifyMutation.isError ? (
          <p className="text-sm text-destructive">{(verifyMutation.error as Error).message}</p>
        ) : null}
      </div>

      <Button
        className="w-full py-6 text-base font-semibold"
        onClick={() => void verifyMutation.mutateAsync()}
        disabled={verifyMutation.isPending || otpValue.length !== 4 || !verifyToken}
      >
        {verifyMutation.isPending ? 'Verifying...' : 'Verify OTP'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/admin/forgot" className="hover:underline">
          Change email
        </Link>
      </p>
    </AuthShell>
  );
}
