import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cerrarMesLogistica,
  getCierresLogistica,
  getCuadroMensual,
  getIntegridadCorrelativo,
  type CerrarMesParams,
  type CuadroMensualParams
} from "@/features/logisticaReportes/api/logisticaReportesApi";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useCuadroMensualQuery(params: CuadroMensualParams | undefined) {
  return useQuery({
    queryKey: queryKeys.logisticaReportes.cuadroMensual(params ?? { anio: 0, mes: 0 }),
    queryFn: () => getCuadroMensual(params as CuadroMensualParams),
    enabled: Boolean(params)
  });
}

export function useIntegridadCorrelativoQuery(params: CuadroMensualParams | undefined) {
  return useQuery({
    queryKey: queryKeys.logisticaReportes.integridadCorrelativo(params ?? { anio: 0, mes: 0 }),
    queryFn: () => getIntegridadCorrelativo(params as CuadroMensualParams),
    enabled: Boolean(params)
  });
}

export function useCierresLogisticaQuery(municipioId?: number) {
  return useQuery({
    queryKey: queryKeys.logisticaReportes.cierres(municipioId),
    queryFn: () => getCierresLogistica(municipioId)
  });
}

export function useCerrarMesLogisticaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CerrarMesParams) => cerrarMesLogistica(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.logisticaReportes.all });
    }
  });
}
