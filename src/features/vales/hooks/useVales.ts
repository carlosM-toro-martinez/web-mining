import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/queryKeys";
import {
  aprobarVale,
  createVale,
  entregarVale,
  getValeById,
  getVales
} from "@/features/vales/api/valesApi";
import type {
  AprobarValePayload,
  CreateValePayload,
  EntregarValePayload
} from "@/features/vales/model/vales.schema";

export function useValeQuery(id: string) {
  const normalizedId = id.trim();
  return useQuery({
    queryKey: queryKeys.vales.detail(normalizedId),
    queryFn: () => getValeById(normalizedId),
    enabled: Boolean(normalizedId)
  });
}

export function useValesQuery() {
  return useQuery({
    queryKey: queryKeys.vales.list(),
    queryFn: getVales
  });
}

export function useCreateValeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateValePayload) => createVale(payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.vales.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.vales.list() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
      await queryClient.setQueryData(queryKeys.vales.detail(response.data.id), response);
    }
  });
}

export function useAprobarValeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AprobarValePayload }) =>
      aprobarVale(id, payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.vales.list() });
      await queryClient.setQueryData(queryKeys.vales.detail(response.data.id), response);
    }
  });
}

export function useEntregarValeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EntregarValePayload }) =>
      entregarVale(id, payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.vales.list() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
      await queryClient.setQueryData(queryKeys.vales.detail(response.data.vale.id), {
        success: true,
        data: response.data.vale
      });
    }
  });
}
