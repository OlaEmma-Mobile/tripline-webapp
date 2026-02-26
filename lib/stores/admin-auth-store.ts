'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AdminRole = 'admin' | 'sub_admin';

interface AdminAuthSession {
  accessToken: string;
  refreshToken: string;
  role: AdminRole;
}

interface AdminAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  role: AdminRole | null;
  hydrated: boolean;
  setSession: (session: AdminAuthSession) => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
}

function syncLegacyStorage(accessToken: string | null, refreshToken: string | null): void {
  if (typeof window === 'undefined') return;

  if (accessToken) {
    window.localStorage.setItem('accessToken', accessToken);
  } else {
    window.localStorage.removeItem('accessToken');
  }

  if (refreshToken) {
    window.localStorage.setItem('adminRefreshToken', refreshToken);
  } else {
    window.localStorage.removeItem('adminRefreshToken');
  }
}

/**
 * Admin auth session store with persistence for API token usage.
 */
export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      role: null,
      hydrated: false,
      setSession: (session) => {
        syncLegacyStorage(session.accessToken, session.refreshToken);
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          role: session.role,
        });
      },
      clearSession: () => {
        syncLegacyStorage(null, null);
        set({ accessToken: null, refreshToken: null, role: null });
      },
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'tripline-admin-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        role: state.role,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        syncLegacyStorage(state?.accessToken ?? null, state?.refreshToken ?? null);
      },
    }
  )
);

export type { AdminAuthState };
