import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCompra,
  getCompraById,
  getCompras,
  recibirCompra
} from "@/features/compras/api/comprasApi";
import type {
  ComprasQueryParams,
  CreateCompraPayload,
  RecibirCompraPayload
} from "@/features/compras/model/compras.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useComprasQuery(params: ComprasQueryParams) {
  return useQuery({
    queryKey: queryKeys.compras.list(params),
    queryFn: () => getCompras(params)
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

export function useCreateCompraMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCompraPayload) => createCompra(payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.compras.all });
      await queryClient.setQueryData(queryKeys.compras.detail(response.data.id), response);
    }
  });
}

export function useRecibirCompraMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecibirCompraPayload }) =>
      recibirCompra(id, payload),
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
