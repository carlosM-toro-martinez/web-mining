import { getRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  cierreMensualResponseSchema,
  cierresListResponseSchema,
  cuadroMensualResponseSchema,
  integridadCorrelativoResponseSchema
} from "@/features/logisticaReportes/model/logisticaReportes.schema";

export interface CuadroMensualParams {
  // Sin municipioId, el cuadro consolida TODOS los municipios del mes.
  municipioId?: number;
  anio: number;
  mes: number;
  // "Nivel 40" / "Nivel 0" / "Nivel 80" / "La Moza" — sin esto, trae todos.
  nivel?: string;
}

export async function getCuadroMensual(params: CuadroMensualParams) {
  return getRequest({
    url: apiEndpoints.logisticaReportes.cuadroMensual,
    config: { params },
    schema: cuadroMensualResponseSchema
  });
}

export async function getCierresLogistica(municipioId?: number) {
  return getRequest({
    url: apiEndpoints.logisticaReportes.cierres,
    config: { params: municipioId ? { municipioId } : {} },
    schema: cierresListResponseSchema
  });
}

export async function getIntegridadCorrelativo(params: CuadroMensualParams) {
  return getRequest({
    url: apiEndpoints.logisticaReportes.integridadCorrelativo,
    config: { params },
    schema: integridadCorrelativoResponseSchema
  });
}

export interface CerrarMesParams {
  municipioId: number;
  anio: number;
  mes: number;
}

export async function cerrarMesLogistica(params: CerrarMesParams) {
  return postRequest({
    url: apiEndpoints.logisticaReportes.cierreMensual,
    body: params,
    schema: cierreMensualResponseSchema
  });
}
