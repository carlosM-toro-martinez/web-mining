import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cerrarMesLogistica,
  getCierresLogistica,
  getCombustibleReport,
  getCuadroMensual,
  getIntegridadCorrelativo,
  type CerrarMesParams,
  type CombustibleParams,
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

export function useCombustibleReportQuery(params: CombustibleParams | undefined) {
  return useQuery({
    queryKey: queryKeys.logisticaReportes.combustible(params ?? { fechaInicio: "", fechaFin: "" }),
    queryFn: () => getCombustibleReport(params as CombustibleParams),
    enabled: Boolean(params?.fechaInicio && params?.fechaFin)
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
