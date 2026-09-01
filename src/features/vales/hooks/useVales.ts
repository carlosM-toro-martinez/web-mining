import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/queryKeys";
import {
  enqueueInventoryOperation,
  isOfflineLikeError
} from "@/features/inventory-offline/lib/inventoryOfflineQueue";
import {
  applyOptimisticStockAdjustments,
  rollbackOptimisticStockAdjustments
} from "@/features/inventory-offline/lib/stockOptimistic";
import {
  anularVale,
  aprobarVale,
  createVale,
  eliminarVale,
  entregarVale,
  getAnulacionesVales,
  getProductosPorUsuario,
  getResumenSolicitantes,
  getValesBySolicitante,
  getValeById,
  getVales,
  rechazarVale
} from "@/features/vales/api/valesApi";
import type {
  AnularValePayload,
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

export function useValesQuery(
  params?: ValesListParams,
  enabled = true,
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: queryKeys.vales.list(params),
    queryFn: () => getVales(params),
    enabled,
    ...options
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

export function useAnulacionesValesQuery(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.vales.all, "anulaciones"],
    queryFn: () => getAnulacionesVales(),
    enabled
  });
}

export function useCreateValeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateValePayload) => {
      try {
        return await createVale(payload);
      } catch (error) {
        if (!isOfflineLikeError(error)) {
          throw error;
        }
        await enqueueInventoryOperation("CREATE_VALE", payload);
        const tempId = `offline-vale-${Date.now()}`;
        return {
          success: true as const,
          data: {
            id: tempId,
            solicitanteId: payload.solicitanteId ?? null,
            estado: "PENDIENTE",
            createdAt: new Date().toISOString(),
            items: payload.items.map((item, index) => ({
              id: `${tempId}-item-${index + 1}`,
              productoId: item.productoId,
              cantidadSolicitada: item.cantidadSolicitada,
              cantidadEntregada: 0,
              producto: null
            })),
            solicitante: null,
            superintendente: null,
            almacenero: null,
            superintendenteId: null,
            aprobadoAt: null,
            entregadoAt: null
          }
        };
      }
    },
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
    mutationFn: async ({
      id,
      payload
    }: {
      id: string;
      payload: EntregarValePayload;
      stockAdjustments?: Array<{ productoId: number; deltaCantidad: number }>;
    }) => {
      try {
        return await entregarVale(id, payload);
      } catch (error) {
        if (!isOfflineLikeError(error)) {
          throw error;
        }
        await enqueueInventoryOperation("ENTREGAR_VALE", { id, payload });
        return {
          success: true as const,
          data: {
            vale: {
              id,
              estado: "PARCIAL",
              items: [],
              solicitanteId: null,
              solicitante: null,
              superintendente: null,
              almacenero: null,
              superintendenteId: null,
              createdAt: null,
              aprobadoAt: null,
              entregadoAt: null
            },
            movimientos: []
          }
        };
      }
    },
    onMutate: async (variables) => {
      if (!variables.stockAdjustments?.length) return { snapshots: [] as Array<[readonly unknown[], unknown]> };
      const snapshots = applyOptimisticStockAdjustments(variables.stockAdjustments);
      return { snapshots };
    },
    onError: async (_error, _variables, context) => {
      if (context?.snapshots?.length) {
        rollbackOptimisticStockAdjustments(context.snapshots);
      }
    },
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

export function useAnularValeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnularValePayload }) =>
      anularVale(id, payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.vales.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
      await queryClient.setQueryData(queryKeys.vales.detail(response.data.vale.id), {
        success: true,
        data: response.data.vale
      });
    }
  });
}

export function useEliminarValeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eliminarVale(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.vales.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
    }
  });
}
