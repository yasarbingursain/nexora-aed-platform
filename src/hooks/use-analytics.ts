import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { subDays } from 'date-fns';

export function useAnalytics(params?: { from?: Date; to?: Date }) {
  const from = params?.from || subDays(new Date(), 7);
  const to = params?.to || new Date();

  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['analytics-metrics', from, to],
    queryFn: () => api.analytics.metrics({ from, to }),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every 60 seconds
  });

  return {
    metrics,
    isLoading,
    error,
    refetch,
  };
}

export function useDashboardAnalytics() {
  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => api.analytics.dashboard(),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every 60 seconds
  });

  return {
    dashboard,
    isLoading,
    error,
    refetch,
  };
}
