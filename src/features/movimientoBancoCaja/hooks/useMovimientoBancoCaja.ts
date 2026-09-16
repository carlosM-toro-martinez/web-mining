import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMovimientoBancoCaja,
  getMovimientosBancoCaja,
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

export function useCreateMovimientoBancoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMovimientoBancoCajaPayload) => createMovimientoBancoCaja(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.movimientoBancoCaja.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.reportesCajaChica.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.rendicionCaja.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cuentasBancarias() });
    }
  });
}
