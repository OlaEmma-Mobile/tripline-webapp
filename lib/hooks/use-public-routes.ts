'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils/client-api';
import type { PublicRouteCardItem } from '@/components/public-route-card';

interface PublicRoutesResponse {
  items: PublicRouteCardItem[];
  total: number;
}

export function usePublicRoutes() {
  return useQuery({
    queryKey: ['public-routes'],
    queryFn: async (): Promise<PublicRoutesResponse> => {
      const response = await apiRequest<PublicRoutesResponse>('/api/routes?page=1&limit=100', {
        skipAuth: true,
      });

      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load routes');
      }

      return response.data;
    },
  });
}
