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

// Un gasto (de caja o directo del banco) cambia el saldo disponible, así
// que además de refrescar la lista de gastos hay que invalidar el estado de
// cuenta (Saldos y Movimientos) y el saldo de cuentas bancarias.
async function invalidarSaldos(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.gastoCaja.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reportesCajaChica.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cuentasBancarias() })
  ]);
}

export function useCreateGastoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGastoCajaPayload) => createGastoCaja(payload),
    onSuccess: () => invalidarSaldos(queryClient)
  });
}

export function useAnularGastoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnularGastoCajaPayload }) => anularGastoCaja(id, payload),
    onSuccess: () => invalidarSaldos(queryClient)
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
    onSuccess: () => invalidarSaldos(queryClient)
  });
}
