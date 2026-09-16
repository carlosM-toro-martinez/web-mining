import { getRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  reporteComprobanteDiarioResponseSchema,
  reporteDesgloseResponseSchema,
  reporteEstadoCuentaBancariaResponseSchema,
  reporteEstadoCuentaResponseSchema,
  reporteNoDeduciblesResponseSchema,
  reporteRendicionResponseSchema,
  reporteRetencionesResponseSchema
} from "@/features/reportesCajaChica/model/reportesCajaChica.schema";

export interface ReporteCajaChicaParams {
  cajaId?: number;
  fechaInicio?: string;
  fechaFin?: string;
}

export async function getReporteRetenciones(params: ReporteCajaChicaParams) {
  return getRequest({
    url: apiEndpoints.reportesCajaChica.retenciones,
    config: { params },
    schema: reporteRetencionesResponseSchema
  });
}

export async function getReporteNoDeducibles(params: ReporteCajaChicaParams) {
  return getRequest({
    url: apiEndpoints.reportesCajaChica.noDeducibles,
    config: { params },
    schema: reporteNoDeduciblesResponseSchema
  });
}

export async function getReporteDesglose(params: ReporteCajaChicaParams) {
  return getRequest({
    url: apiEndpoints.reportesCajaChica.desglose,
    config: { params },
    schema: reporteDesgloseResponseSchema
  });
}

export async function getEstadoCuentaCaja(cajaId: number) {
  return getRequest({
    url: apiEndpoints.reportesCajaChica.estadoCuenta,
    config: { params: { cajaId } },
    schema: reporteEstadoCuentaResponseSchema
  });
}

export async function getEstadoCuentaBancaria(cuentaBancariaId: number) {
  return getRequest({
    url: apiEndpoints.reportesCajaChica.estadoCuentaBancaria,
    config: { params: { cuentaBancariaId } },
    schema: reporteEstadoCuentaBancariaResponseSchema
  });
}

export async function getReporteRendicion(rendicionId: string) {
  return getRequest({
    url: apiEndpoints.reportesCajaChica.reporteRendicion(rendicionId),
    schema: reporteRendicionResponseSchema
  });
}

export async function getComprobanteDiario(rendicionId: string) {
  return getRequest({
    url: apiEndpoints.reportesCajaChica.comprobanteDiario(rendicionId),
    schema: reporteComprobanteDiarioResponseSchema
  });
}
