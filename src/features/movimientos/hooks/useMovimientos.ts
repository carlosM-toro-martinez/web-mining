import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEntradaManual, createSalidaManual } from "@/features/movimientos/api/movimientosApi";
import type {
  CreateEntradaManualPayload,
  CreateSalidaManualPayload
} from "@/features/movimientos/model/movimientos.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useCreateSalidaManualMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalidaManualPayload) => createSalidaManual(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.movimientos.all });
    }
  });
}

export function useCreateEntradaManualMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEntradaManualPayload) => createEntradaManual(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.movimientos.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.compras.all });
    }
  });
}
