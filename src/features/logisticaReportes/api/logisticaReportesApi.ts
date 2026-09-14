import { getRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  cierreMensualResponseSchema,
  cierresListResponseSchema,
  cuadroMensualResponseSchema
} from "@/features/logisticaReportes/model/logisticaReportes.schema";

export interface CuadroMensualParams {
  municipioId: number;
  anio: number;
  mes: number;
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

export async function cerrarMesLogistica(params: CuadroMensualParams) {
  return postRequest({
    url: apiEndpoints.logisticaReportes.cierreMensual,
    body: params,
    schema: cierreMensualResponseSchema
  });
}
