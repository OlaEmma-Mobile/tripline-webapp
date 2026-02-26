'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { adminTokensFilterClientSchema } from '@/lib/frontend-validation/admin-tokens.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

interface TokensPayload {
  items: Array<any>;
  total: number;
}

export default function AdminPaymentsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);

  const filters = useMemo(() => ({ from, to, status }), [from, to, status]);

  const tokensQuery = useQuery({
    queryKey: adminQueryKeys.tokens(filters),
    queryFn: async (): Promise<TokensPayload> => {
      const validation = validateOrReject(
        adminTokensFilterClientSchema,
        { from, to, status },
        'Invalid payments filter values.'
      );
      if (!validation.isValid) {
        setClientFieldErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid payments filters');
      }

      setClientFieldErrors({});
      setClientFormError(null);
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (status) params.set('status', status);
      const response = await apiRequest<TokensPayload>(`/api/admin/tokens?${params.toString()}`);
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load token transactions');
      }
      return response.data;
    },
  });

  const items = tokensQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-mono text-foreground">Payments & Tokens</h2>
        <p className="text-sm text-muted-foreground">Token purchase transactions with filters.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-semibold">From</span>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2" />
          {clientFieldErrors.from ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.from[0]}</p> : null}
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">To</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2" />
          {clientFieldErrors.to ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.to[0]}</p> : null}
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2">
            <option value="">All</option>
            <option value="pending">pending</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
          </select>
          {clientFieldErrors.status ? <p className="mt-1 text-xs text-destructive">{clientFieldErrors.status[0]}</p> : null}
        </label>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        {clientFormError ? <p className="text-sm text-destructive">{clientFormError}</p> : null}
        {tokensQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={`tokens-skeleton-${idx}`} className="h-10 w-full" />
            ))}
          </div>
        ) : null}
        {tokensQuery.isError ? <p className="text-sm text-destructive">{(tokensQuery.error as Error).message}</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Amount (NGN)</th>
                <th className="px-3 py-2">Tokens</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-3">{row.id}</td>
                  <td className="px-3 py-3">{row.user_id}</td>
                  <td className="px-3 py-3">{row.amount_ngn}</td>
                  <td className="px-3 py-3">{row.tokens}</td>
                  <td className="px-3 py-3">{row.status}</td>
                  <td className="px-3 py-3">{row.reference}</td>
                  <td className="px-3 py-3">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
