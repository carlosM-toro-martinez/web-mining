import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  anularMovimientoBanco,
  createMovimientoBancoCaja,
  crearRemesaMovimientoBanco,
  getMovimientosBancoCaja,
  vincularPresupuestoMovimientoBanco,
  type MovimientoBancoCajaQueryParams
} from "@/features/movimientoBancoCaja/api/movimientoBancoCajaApi";
import type { CreateMovimientoBancoCajaPayload } from "@/features/movimientoBancoCaja/model/movimientoBancoCaja.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useMovimientosBancoCajaQuery(params: MovimientoBancoCajaQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.movimientoBancoCaja.list(params),
    queryFn: () => getMovimientosBancoCaja(params)
  });
}

// Un ingreso vinculado a una remesa es dinero de la caja: cualquier cambio
// mueve el banco, las remesas, los fondos de la caja, sus saldos y reportes.
function useInvalidarMovimientosBanco() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.movimientoBancoCaja.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.presupuestoCaja.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.gastoCaja.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reportesCajaChica.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.rendicionCaja.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cuentasBancarias() })
    ]);
  };
}

export function useVincularPresupuestoMovimientoBancoMutation() {
  const invalidar = useInvalidarMovimientosBanco();
  return useMutation({
    mutationFn: ({ id, presupuestoId }: { id: string; presupuestoId: number | null }) =>
      vincularPresupuestoMovimientoBanco(id, presupuestoId),
    onSuccess: () => invalidar()
  });
}

export function useCrearRemesaMovimientoBancoMutation() {
  const invalidar = useInvalidarMovimientosBanco();
  return useMutation({
    mutationFn: ({ id, cajaId }: { id: string; cajaId?: number }) => crearRemesaMovimientoBanco(id, cajaId),
    onSuccess: () => invalidar()
  });
}

export function useAnularMovimientoBancoMutation() {
  const invalidar = useInvalidarMovimientosBanco();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => anularMovimientoBanco(id, motivo),
    onSuccess: () => invalidar()
  });
}

export function useCreateMovimientoBancoCajaMutation() {
  const invalidar = useInvalidarMovimientosBanco();
  return useMutation({
    mutationFn: (payload: CreateMovimientoBancoCajaPayload) => createMovimientoBancoCaja(payload),
    onSuccess: () => invalidar()
  });
}
