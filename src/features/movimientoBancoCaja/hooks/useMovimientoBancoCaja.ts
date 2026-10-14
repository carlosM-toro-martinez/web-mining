import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMovimientoBancoCaja,
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

export function useVincularPresupuestoMovimientoBancoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, presupuestoId }: { id: string; presupuestoId: number | null }) =>
      vincularPresupuestoMovimientoBanco(id, presupuestoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.movimientoBancoCaja.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.presupuestoCaja.all });
    }
  });
}

export function useCreateMovimientoBancoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMovimientoBancoCajaPayload) => createMovimientoBancoCaja(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.movimientoBancoCaja.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.presupuestoCaja.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.reportesCajaChica.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.rendicionCaja.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cuentasBancarias() });
    }
  });
}
