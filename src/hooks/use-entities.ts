import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Entity } from '@/types/api.types';

export function useEntities(params?: { type?: string; risk_threshold?: number }) {
  const {
    data: entities = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['entities', params],
    queryFn: () => api.entities.list(params),
    staleTime: 60_000, // 1 minute
  });

  return {
    entities,
    isLoading,
    error,
    refetch,
  };
}

export function useEntityDetail(id: string) {
  const {
    data: entity,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['entity', id],
    queryFn: () => api.entities.get(id),
    enabled: !!id,
  });

  const {
    data: baseline,
    isLoading: isLoadingBaseline,
  } = useQuery({
    queryKey: ['entity-baseline', id],
    queryFn: () => api.entities.baseline(id),
    enabled: !!id,
  });

  return {
    entity,
    baseline,
    isLoading: isLoading || isLoadingBaseline,
    error,
  };
}

export function useCreateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Entity, 'id'>) => api.entities.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    },
  });
}

export function useUpdateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Entity> }) =>
      api.entities.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      queryClient.invalidateQueries({ queryKey: ['entity', variables.id] });
    },
  });
}

export function useDeleteEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.entities.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    },
  });
}
