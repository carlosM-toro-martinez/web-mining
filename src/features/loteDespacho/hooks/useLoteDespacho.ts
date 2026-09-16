import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  anularLote,
  avanzarEstadoLote,
  createLoteDespacho,
  getLoteDespachoById,
  getLotesDespacho,
  registrarPesajeLote,
  transbordarLote,
  type LotesDespachoQueryParams
} from "@/features/loteDespacho/api/loteDespachoApi";
import type {
  AnularLotePayload,
  AvanzarEstadoLotePayload,
  CreateLoteDespachoPayload,
  RegistrarPesajePayload,
  TransbordarLotePayload
} from "@/features/loteDespacho/model/loteDespacho.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useLotesDespachoQuery(params: LotesDespachoQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.lotesDespacho.list(params),
    queryFn: () => getLotesDespacho(params)
  });
}

export function useLoteDespachoDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lotesDespacho.detail(id ?? ""),
    queryFn: () => getLoteDespachoById(id as string),
    enabled: Boolean(id)
  });
}

function useInvalidateLotes() {
  const queryClient = useQueryClient();
  return async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.lotesDespacho.all });
    if (id) await queryClient.invalidateQueries({ queryKey: queryKeys.lotesDespacho.detail(id) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.flota.vehiculos() });
  };
}

export function useCreateLoteDespachoMutation() {
  const invalidate = useInvalidateLotes();
  return useMutation({
    mutationFn: (payload: CreateLoteDespachoPayload) => createLoteDespacho(payload),
    onSuccess: () => invalidate()
  });
}

export function useAvanzarEstadoLoteMutation() {
  const invalidate = useInvalidateLotes();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AvanzarEstadoLotePayload }) =>
      avanzarEstadoLote(id, payload),
    onSuccess: (_data, variables) => invalidate(variables.id)
  });
}

export function useRegistrarPesajeMutation() {
  const invalidate = useInvalidateLotes();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RegistrarPesajePayload }) =>
      registrarPesajeLote(id, payload),
    onSuccess: (_data, variables) => invalidate(variables.id)
  });
}

export function useAnularLoteMutation() {
  const invalidate = useInvalidateLotes();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnularLotePayload }) => anularLote(id, payload),
    onSuccess: (_data, variables) => invalidate(variables.id)
  });
}

export function useTransbordarLoteMutation() {
  const invalidate = useInvalidateLotes();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TransbordarLotePayload }) => transbordarLote(id, payload),
    onSuccess: (_data, variables) => invalidate(variables.id)
  });
}
