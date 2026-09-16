import { useQuery } from "@tanstack/react-query";
import {
  getEstadoCuentaBancaria,
  getEstadoCuentaCaja,
  getReporteDesglose,
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

export function useEstadoCuentaCajaQuery(cajaId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.reportesCajaChica.estadoCuenta(cajaId),
    queryFn: () => getEstadoCuentaCaja(cajaId as number),
    enabled: typeof cajaId === "number"
  });
}

export function useEstadoCuentaBancariaQuery(cuentaBancariaId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.reportesCajaChica.estadoCuentaBancaria(cuentaBancariaId),
    queryFn: () => getEstadoCuentaBancaria(cuentaBancariaId as number),
    enabled: typeof cuentaBancariaId === "number"
  });
}
