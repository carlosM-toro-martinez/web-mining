import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  agregarItemConcepto,
  anularLiquidacion,
  cerrarLiquidacion,
  createLiquidacion,
  getLiquidacionById,
  getLiquidacionPreview,
  getLiquidaciones,
  quitarItemConcepto,
  type LiquidacionesQueryParams
} from "@/features/liquidacion/api/liquidacionApi";
import type {
  AgregarItemConceptoPayload,
  AnularLiquidacionPayload,
  CreateLiquidacionPayload,
  PreviewLiquidacionQuery
} from "@/features/liquidacion/model/liquidacion.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useLiquidacionesQuery(params: LiquidacionesQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.liquidaciones.list(params),
    queryFn: () => getLiquidaciones(params),
    enabled
  });
}

// Solo se dispara cuando ya se eligió transportista + ambas fechas
// (enabled) — así no se llama a la API con un rango a medio llenar.
export function useLiquidacionPreviewQuery(params: PreviewLiquidacionQuery | null) {
  return useQuery({
    queryKey: queryKeys.liquidaciones.preview(params ?? undefined),
    queryFn: () => getLiquidacionPreview(params as PreviewLiquidacionQuery),
    enabled: Boolean(params)
  });
}

export function useLiquidacionDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.liquidaciones.detail(id ?? ""),
    queryFn: () => getLiquidacionById(id as string),
    enabled: Boolean(id)
  });
}

function useInvalidateLiquidaciones() {
  const queryClient = useQueryClient();
  return async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.liquidaciones.all });
    if (id) await queryClient.invalidateQueries({ queryKey: queryKeys.liquidaciones.detail(id) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.lotesDespacho.all });
  };
}

export function useCreateLiquidacionMutation() {
  const invalidate = useInvalidateLiquidaciones();
  return useMutation({
    mutationFn: (payload: CreateLiquidacionPayload) => createLiquidacion(payload),
    onSuccess: () => invalidate()
  });
}

export function useAgregarItemConceptoMutation() {
  const invalidate = useInvalidateLiquidaciones();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AgregarItemConceptoPayload }) =>
      agregarItemConcepto(id, payload),
    onSuccess: (_data, variables) => invalidate(variables.id)
  });
}

export function useQuitarItemConceptoMutation() {
  const invalidate = useInvalidateLiquidaciones();
  return useMutation({
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) => quitarItemConcepto(id, itemId),
    onSuccess: (_data, variables) => invalidate(variables.id)
  });
}

export function useCerrarLiquidacionMutation() {
  const invalidate = useInvalidateLiquidaciones();
  return useMutation({
    mutationFn: (id: string) => cerrarLiquidacion(id),
    onSuccess: (_data, id) => invalidate(id)
  });
}

export function useAnularLiquidacionMutation() {
  const invalidate = useInvalidateLiquidaciones();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnularLiquidacionPayload }) =>
      anularLiquidacion(id, payload),
    onSuccess: (_data, variables) => invalidate(variables.id)
  });
}
