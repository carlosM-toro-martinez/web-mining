import { useQuery } from "@tanstack/react-query";
import {
  getEstadoCuentaBancaria,
  getEstadoCuentaCaja,
  getReporteDesglose,
  getReporteImpuestos,
  getReporteNoDeducibles,
  getReporteRetenciones,
  type ReporteCajaChicaParams
} from "@/features/reportesCajaChica/api/reportesCajaChicaApi";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useReporteRetencionesQuery(params: ReporteCajaChicaParams) {
  return useQuery({
    queryKey: queryKeys.reportesCajaChica.retenciones(params),
    queryFn: () => getReporteRetenciones(params)
  });
}

export function useReporteImpuestosQuery(params: ReporteCajaChicaParams) {
  return useQuery({
    queryKey: queryKeys.reportesCajaChica.impuestos(params),
    queryFn: () => getReporteImpuestos(params)
  });
}

export function useReporteNoDeduciblesQuery(params: ReporteCajaChicaParams) {
  return useQuery({
    queryKey: queryKeys.reportesCajaChica.noDeducibles(params),
    queryFn: () => getReporteNoDeducibles(params)
  });
}

export function useReporteDesgloseQuery(params: ReporteCajaChicaParams) {
  return useQuery({
    queryKey: queryKeys.reportesCajaChica.desglose(params),
    queryFn: () => getReporteDesglose(params)
  });
}

export function useEstadoCuentaCajaQuery(cajaId: number | undefined, fechaInicio?: string, fechaFin?: string) {
  return useQuery({
    queryKey: queryKeys.reportesCajaChica.estadoCuenta(cajaId, fechaInicio, fechaFin),
    queryFn: () => getEstadoCuentaCaja(cajaId as number, fechaInicio, fechaFin),
    enabled: typeof cajaId === "number"
  });
}

export function useEstadoCuentaBancariaQuery(
  cuentaBancariaId: number | undefined,
  fechaInicio?: string,
  fechaFin?: string
) {
  return useQuery({
    queryKey: queryKeys.reportesCajaChica.estadoCuentaBancaria(cuentaBancariaId, fechaInicio, fechaFin),
    queryFn: () => getEstadoCuentaBancaria(cuentaBancariaId as number, fechaInicio, fechaFin),
    enabled: typeof cuentaBancariaId === "number"
  });
}
