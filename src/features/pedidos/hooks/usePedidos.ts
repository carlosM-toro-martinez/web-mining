import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelarPedido, createPedido, getPedidoById, getPedidos } from "@/features/pedidos/api/pedidosApi";
import type { CreatePedidoPayload, PedidosListParams } from "@/features/pedidos/model/pedidos.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function usePedidosQuery(params: PedidosListParams) {
  return useQuery({
    queryKey: queryKeys.pedidos.list(params),
    queryFn: () => getPedidos(params)
  });
}

export function usePedidoByIdQuery(id: string) {
  const normalizedId = id.trim();
  return useQuery({
    queryKey: queryKeys.pedidos.detail(normalizedId),
    queryFn: () => getPedidoById(normalizedId),
    enabled: Boolean(normalizedId)
  });
}

export function useCreatePedidoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePedidoPayload) => createPedido(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.pedidos.all });
    }
  });
}

export function useCancelarPedidoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelarPedido(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.pedidos.all });
    }
  });
}
