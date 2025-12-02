import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useUIStore } from '@/stores/uiStore';
import type { Threat, ThreatFilters } from '@/types/api.types';
import { ThreatStatus } from '@/types/threat.types';

export function useThreats(filters?: ThreatFilters) {
  const queryClient = useQueryClient();
  const activeFilters = useUIStore((state) => state.activeFilters.threats) || filters;

  const {
    data: threats = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['threats', activeFilters],
    queryFn: () => api.threats.list(activeFilters),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every 60 seconds
  });

  const updateThreatMutation = useMutation({
    mutationFn: (data: { id: string; status?: ThreatStatus; notes?: string }) =>
      api.threats.update(data.id, { status: data.status } as Partial<Threat>),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['threats'] });
      const previousThreats = queryClient.getQueryData<Threat[]>(['threats', activeFilters]);

      queryClient.setQueryData<Threat[]>(
        ['threats', activeFilters],
        (old = []) =>
          old.map((threat) =>
            threat.id === variables.id && variables.status
              ? { ...threat, status: variables.status }
              : threat
          )
      );

      return { previousThreats };
    },
    onError: (err, variables, context) => {
      if (context?.previousThreats) {
        queryClient.setQueryData(['threats', activeFilters], context.previousThreats);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threats'] });
    },
  });

  return {
    threats,
    isLoading,
    error,
    refetch,
    updateThreat: updateThreatMutation.mutate,
    isUpdating: updateThreatMutation.isPending,
  };
}

export function useThreatDetail(id: string) {
  const {
    data: threat,
    isLoading: isLoadingThreat,
    error: threatError,
  } = useQuery({
    queryKey: ['threat', id],
    queryFn: () => api.threats.get(id),
    enabled: !!id,
  });

  const {
    data: timeline = [],
    isLoading: isLoadingTimeline,
    error: timelineError,
  } = useQuery({
    queryKey: ['threat-timeline', id],
    queryFn: () => api.threats.timeline(id),
    enabled: !!id,
  });

  return {
    threat,
    timeline,
    isLoading: isLoadingThreat || isLoadingTimeline,
    error: threatError || timelineError,
  };
}

export function useExportThreats() {
  return useMutation({
    mutationFn: (filters?: ThreatFilters) => api.threats.export(filters),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `threats-export-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}
