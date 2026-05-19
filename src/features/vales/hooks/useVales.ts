import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/queryKeys";
import {
  aprobarVale,
  createVale,
  entregarVale,
  getProductosPorUsuario,
  getResumenSolicitantes,
  getValesBySolicitante,
  getValeById,
  getVales,
  rechazarVale
} from "@/features/vales/api/valesApi";
import type {
  AprobarValePayload,
  CreateValePayload,
  EntregarValePayload,
  ValesListParams
} from "@/features/vales/model/vales.schema";

export function useValeQuery(id: string) {
  const normalizedId = id.trim();
  return useQuery({
    queryKey: queryKeys.vales.detail(normalizedId),
    queryFn: () => getValeById(normalizedId),
    enabled: Boolean(normalizedId)
  });
}

export function useValesQuery(params?: ValesListParams) {
  return useQuery({
    queryKey: queryKeys.vales.list(params),
    queryFn: () => getVales(params)
  });
}

export function useHistorialSolicitanteQuery(userId: number | null, page = 1, limit = 10) {
  return useQuery({
    queryKey: userId ? queryKeys.vales.historialSolicitante(userId, page, limit) : queryKeys.vales.all,
    queryFn: () => getValesBySolicitante(userId as number, page, limit),
    enabled: typeof userId === "number" && userId > 0
  });
}

export function useResumenSolicitantesQuery(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.vales.all, "resumen-solicitantes"],
    queryFn: () => getResumenSolicitantes(),
    enabled
  });
}

export function useProductosPorUsuarioQuery(userId: number | null, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.vales.all, "productos-por-usuario", userId ?? "none"],
    queryFn: () => getProductosPorUsuario(userId as number),
    enabled: enabled && typeof userId === "number" && userId > 0
  });
}

export function useCreateValeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateValePayload) => createVale(payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.vales.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.vales.all });
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.vales.all });
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.vales.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
      await queryClient.setQueryData(queryKeys.vales.detail(response.data.vale.id), {
        success: true,
        data: response.data.vale
      });
    }
  });
}

export function useRechazarValeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, superintendenteId }: { id: string; superintendenteId: number }) =>
      rechazarVale(id, superintendenteId),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.vales.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
      await queryClient.setQueryData(queryKeys.vales.detail(response.data.id), response);
    }
  });
}
