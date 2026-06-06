import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  anularCompra,
  createCompra,
  getAnulacionesHistorial,
  getCompraById,
  getCompras,
  recibirCompra
} from "@/features/compras/api/comprasApi";
import {
  enqueueInventoryOperation,
  isOfflineLikeError
} from "@/features/inventory-offline/lib/inventoryOfflineQueue";
import {
  applyOptimisticStockAdjustments,
  rollbackOptimisticStockAdjustments
} from "@/features/inventory-offline/lib/stockOptimistic";
import type {
  AnularCompraPayload,
  Compra,
  ComprasQueryParams,
  CreateCompraPayload,
  RecibirCompraPayload
} from "@/features/compras/model/compras.schema";
import { queryKeys } from "@/shared/lib/queryKeys";
import { useToast } from "@/shared/ui/toast/ToastProvider";

export function useComprasQuery(params: ComprasQueryParams) {
  return useQuery({
    queryKey: queryKeys.compras.list(params),
    queryFn: () => getCompras(params),
    refetchOnMount: "always"
  });
}

export function useCompraByIdQuery(id: string) {
  const normalizedId = id.trim();
  return useQuery({
    queryKey: queryKeys.compras.detail(normalizedId),
    queryFn: () => getCompraById(normalizedId),
    enabled: Boolean(normalizedId)
  });
}

export function useAnulacionesHistorialQuery() {
  return useQuery({
    queryKey: [...queryKeys.compras.all, "anulaciones-historial"],
    queryFn: getAnulacionesHistorial,
    refetchOnMount: "always"
  });
}

export function useAnularCompraMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnularCompraPayload }) =>
      anularCompra(id, payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.compras.all });
      await queryClient.setQueryData(queryKeys.compras.detail(response.data.compra.id), {
        success: true,
        data: response.data.compra
      });
    }
  });
}

export function useCreateCompraMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCompraPayload) => {
      try {
        return await createCompra(payload);
      } catch (error) {
        if (!isOfflineLikeError(error)) {
          throw error;
        }
        await enqueueInventoryOperation("CREATE_COMPRA", payload);
        const nowIso = new Date().toISOString();
        const tempId = `offline-compra-${Date.now()}`;
        const offlineCompra: Compra = {
          id: tempId,
          proveedorId: payload.proveedorId,
          estado: "PENDIENTE",
          observacion: payload.observacion ?? "Registro offline pendiente de sincronización",
          createdAt: nowIso,
          recibidoAt: null,
          items: payload.items.map((item, index) => ({
            id: `${tempId}-item-${index + 1}`,
            productoId: item.productoId,
            cantidadPedida: item.cantidadPedida,
            cantidadRecibida: 0,
            precioUnit: item.precioUnit,
            producto: null
          })),
          proveedor: null,
          usuarioRegistroId: null,
          usuarioRecibeId: null,
          usuarioRegistro: null,
          usuarioRecibe: null
        };
        return { success: true as const, data: offlineCompra };
      }
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.compras.all });
      await queryClient.setQueryData(queryKeys.compras.detail(response.data.id), response);
    }
  });
}

export function useRecibirCompraMutation() {
  const queryClient = useQueryClient();
  // Toasts are useful for surfacing server-side states like 409 (already completed)
  const { showError, showSuccess } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      payload
    }: {
      id: string;
      payload: RecibirCompraPayload;
      stockAdjustments?: Array<{ productoId: number; deltaCantidad: number }>;
    }) => {
      try {
        return await recibirCompra(id, payload);
      } catch (error) {
        if (!isOfflineLikeError(error)) {
          throw error;
        }
        await enqueueInventoryOperation("RECIBIR_COMPRA", { id, payload });
        return {
          success: true as const,
          data: {
            compra: {
              id,
              estado: "PARCIAL",
              items: [],
              proveedor: null,
              observacion: "Recepción offline pendiente de sincronización"
            },
            movimientos: []
          }
        };
      }
    },
    onMutate: async (variables) => {
      if (!variables.stockAdjustments?.length)
        return { snapshots: [] as Array<[readonly unknown[], unknown]> };
      const snapshots = applyOptimisticStockAdjustments(variables.stockAdjustments);
      return { snapshots };
    },
    onError: async (error, variables, context) => {
      if (context?.snapshots?.length) {
        rollbackOptimisticStockAdjustments(context.snapshots);
      }

      // Handle conflict: compra already completed (409) gracefully
      try {
        if (error && (error as any).statusCode === 409) {
          showError((error as any).message || "La compra ya está completada.");
          if (variables && variables.id) {
            await queryClient.invalidateQueries({
              queryKey: queryKeys.compras.detail(String(variables.id))
            });
          }
          await queryClient.invalidateQueries({ queryKey: queryKeys.compras.all });
          return;
        }
      } catch (_e) {
        // ignore
      }
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.compras.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
      await queryClient.setQueryData(queryKeys.compras.detail(response.data.compra.id), {
        success: true,
        data: response.data.compra
      });
    }
  });
}
