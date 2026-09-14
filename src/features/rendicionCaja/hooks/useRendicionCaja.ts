import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  anularRendicionCaja,
  cerrarRendicionCaja,
  createRendicionCaja,
  getRendicionCajaById,
  getRendicionesCaja,
  type RendicionesCajaQueryParams
} from "@/features/rendicionCaja/api/rendicionCajaApi";
import type {
  AnularRendicionCajaPayload,
  CreateRendicionCajaPayload
} from "@/features/rendicionCaja/model/rendicionCaja.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useRendicionesCajaQuery(params: RendicionesCajaQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.rendicionCaja.list(params),
    queryFn: () => getRendicionesCaja(params)
  });
}

export function useRendicionCajaDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.rendicionCaja.detail(id ?? ""),
    queryFn: () => getRendicionCajaById(id as string),
    enabled: Boolean(id)
  });
}

function useInvalidateRendiciones() {
  const queryClient = useQueryClient();
  return async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.rendicionCaja.all });
    if (id) await queryClient.invalidateQueries({ queryKey: queryKeys.rendicionCaja.detail(id) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.gastoCaja.all });
  };
}

export function useCreateRendicionCajaMutation() {
  const invalidate = useInvalidateRendiciones();
  return useMutation({
    mutationFn: (payload: CreateRendicionCajaPayload) => createRendicionCaja(payload),
    onSuccess: () => invalidate()
  });
}

export function useCerrarRendicionCajaMutation() {
  const invalidate = useInvalidateRendiciones();
  return useMutation({
    mutationFn: (id: string) => cerrarRendicionCaja(id),
    onSuccess: (_data, id) => invalidate(id)
  });
}

export function useAnularRendicionCajaMutation() {
  const invalidate = useInvalidateRendiciones();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnularRendicionCajaPayload }) =>
      anularRendicionCaja(id, payload),
    onSuccess: (_data, variables) => invalidate(variables.id)
  });
}
