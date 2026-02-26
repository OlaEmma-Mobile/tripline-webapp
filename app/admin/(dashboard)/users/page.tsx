'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminUserSelectionClientSchema, adminWalletAdjustmentClientSchema } from '@/lib/frontend-validation/admin-users.schemas';
import { validateOrReject } from '@/lib/frontend-validation/validation-utils';
import { apiRequest } from '@/lib/utils/client-api';
import { adminQueryKeys } from '@/lib/hooks/admin-query-keys';

interface UsersPayload {
  items: Array<any>;
  total: number;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string[]>>({});
  const [clientFormError, setClientFormError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: adminQueryKeys.users({ page: 1, limit: 100 }),
    queryFn: async (): Promise<UsersPayload> => {
      const response = await apiRequest<UsersPayload>('/api/admin/users?page=1&limit=100');
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load users');
      }
      return response.data;
    },
  });

  const userDetailQuery = useQuery({
    queryKey: selectedUserId ? adminQueryKeys.userDetail(selectedUserId) : ['admin', 'user-detail', 'none'],
    enabled: Boolean(selectedUserId),
    queryFn: async (): Promise<any> => {
      const validation = validateOrReject(
        adminUserSelectionClientSchema,
        { userId: selectedUserId },
        'Select a valid user first.'
      );
      if (!validation.isValid) {
        setClientFieldErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid user selection');
      }
      setClientFieldErrors({});
      setClientFormError(null);

      const response = await apiRequest<any>(`/api/admin/users/${selectedUserId}`);
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load user detail');
      }
      return response.data;
    },
  });

  const adjustWalletMutation = useMutation({
    mutationFn: async (amount: number): Promise<void> => {
      const validation = validateOrReject(
        adminWalletAdjustmentClientSchema,
        { userId: selectedUserId, amount, reason: 'Admin adjustment' },
        'Select a valid user and adjustment amount.'
      );
      if (!validation.isValid) {
        setClientFieldErrors(validation.fieldErrors);
        setClientFormError(validation.formMessage);
        throw new Error(validation.formMessage ?? 'Invalid wallet adjustment payload');
      }

      setClientFieldErrors({});
      setClientFormError(null);
      const response = await apiRequest(`/api/admin/users/${selectedUserId}/adjust-wallet`, {
        method: 'PATCH',
        body: JSON.stringify({ amount: validation.data?.amount, reason: validation.data?.reason }),
      });
      if (response.hasError) {
        throw new Error(response.message || 'Unable to adjust wallet');
      }
    },
    onSuccess: async () => {
      if (!selectedUserId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.userDetail(selectedUserId) }),
      ]);
    },
  });

  const items = usersQuery.data?.items ?? [];
  const detail = userDetailQuery.data;

  const summary = useMemo(() => {
    if (!detail) return null;
    return {
      walletEntries: detail.walletLedger?.length ?? 0,
      purchaseEntries: detail.tokenPurchases?.length ?? 0,
      activeBookings: detail.activeBookings?.length ?? 0,
    };
  }, [detail]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl font-bold font-mono text-foreground">Users</h2>
        <p className="text-sm text-muted-foreground">Wallet balances, token totals, and FCM state.</p>
        {clientFormError ? <p className="mt-3 text-sm text-destructive">{clientFormError}</p> : null}

        {usersQuery.isLoading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={`users-skeleton-${idx}`} className="h-10 w-full" />
            ))}
          </div>
        ) : null}
        {usersQuery.isError ? <p className="mt-4 text-sm text-destructive">{(usersQuery.error as Error).message}</p> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Wallet</th>
                <th className="px-3 py-2">Tokens Bought</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-3">{`${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()}</td>
                  <td className="px-3 py-3">{user.role}</td>
                  <td className="px-3 py-3">{user.walletBalance ?? 0}</td>
                  <td className="px-3 py-3">{user.totalTokensBought ?? 0}</td>
                  <td className="px-3 py-3">
                    <Button size="sm" variant="outline" onClick={() => setSelectedUserId(user.id)}>
                      View detail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-xl font-bold text-foreground font-mono">User Detail</h3>
        {!selectedUserId ? <p className="mt-4 text-sm text-muted-foreground">Select a user to inspect wallet and bookings.</p> : null}
        {clientFieldErrors.userId ? <p className="mt-2 text-xs text-destructive">{clientFieldErrors.userId[0]}</p> : null}
        {clientFieldErrors.amount ? <p className="mt-2 text-xs text-destructive">{clientFieldErrors.amount[0]}</p> : null}
        {userDetailQuery.isLoading ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : null}
        {userDetailQuery.isError ? <p className="mt-4 text-sm text-destructive">{(userDetailQuery.error as Error).message}</p> : null}

        {detail ? (
          <div className="mt-4 space-y-4 text-sm">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="font-semibold text-foreground">{`${detail.profile?.first_name ?? ''} ${detail.profile?.last_name ?? ''}`.trim()}</p>
              <p className="text-muted-foreground">{detail.profile?.email}</p>
              <p className="mt-2">Wallet: <span className="font-semibold">{detail.profile?.walletBalance ?? 0}</span></p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void adjustWalletMutation.mutateAsync(10)}>+10</Button>
                <Button size="sm" variant="outline" onClick={() => void adjustWalletMutation.mutateAsync(-10)}>-10</Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <p className="font-semibold text-foreground">Wallet Ledger</p>
              <p className="text-xs text-muted-foreground">{summary?.walletEntries ?? 0} entries</p>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <p className="font-semibold text-foreground">Token Purchases</p>
              <p className="text-xs text-muted-foreground">{summary?.purchaseEntries ?? 0} entries</p>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <p className="font-semibold text-foreground">Active Bookings</p>
              <p className="text-xs text-muted-foreground">{summary?.activeBookings ?? 0} entries</p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
