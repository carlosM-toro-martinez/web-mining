import { getRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  createMovimientoBancoCajaPayloadSchema,
  movimientoBancoCajaListResponseSchema,
  movimientoBancoCajaResponseSchema,
  type CreateMovimientoBancoCajaPayload,
  type TipoMovimientoBanco
} from "@/features/movimientoBancoCaja/model/movimientoBancoCaja.schema";

export interface MovimientoBancoCajaQueryParams {
  cuentaBancariaId?: number;
  cajaId?: number;
  tipo?: TipoMovimientoBanco;
}

export async function getMovimientosBancoCaja(params: MovimientoBancoCajaQueryParams = {}) {
  return getRequest({
    url: apiEndpoints.cajaChica.movimientosBanco,
    config: { params },
    schema: movimientoBancoCajaListResponseSchema
  });
}

export async function createMovimientoBancoCaja(payload: CreateMovimientoBancoCajaPayload) {
  const body = createMovimientoBancoCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.cajaChica.movimientosBanco, body, schema: movimientoBancoCajaResponseSchema });
}
