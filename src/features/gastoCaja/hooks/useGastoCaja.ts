import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  anularGastoCaja,
  createGastoCaja,
  createMovimientoFondoCaja,
  getGastosCaja,
  getMovimientosFondoCaja,
  type GastosCajaQueryParams
} from "@/features/gastoCaja/api/gastoCajaApi";
import type {
  AnularGastoCajaPayload,
  CreateGastoCajaPayload,
  CreateMovimientoFondoCajaPayload
} from "@/features/gastoCaja/model/gastoCaja.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useGastosCajaQuery(params: GastosCajaQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.gastoCaja.list(params),
    queryFn: () => getGastosCaja(params)
  });
}

export function useCreateGastoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGastoCajaPayload) => createGastoCaja(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.gastoCaja.all });
    }
  });
}

export function useAnularGastoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnularGastoCajaPayload }) => anularGastoCaja(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.gastoCaja.all });
    }
  });
}

export function useMovimientosFondoCajaQuery(cajaId?: number) {
  return useQuery({
    queryKey: queryKeys.gastoCaja.movimientosFondo(cajaId),
    queryFn: () => getMovimientosFondoCaja(cajaId)
  });
}

export function useCreateMovimientoFondoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMovimientoFondoCajaPayload) => createMovimientoFondoCaja(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.gastoCaja.all });
    }
  });
}
