import { getRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  anularGastoCajaPayloadSchema,
  createGastoCajaPayloadSchema,
  createMovimientoFondoCajaPayloadSchema,
  gastoCajaListResponseSchema,
  gastoCajaResponseSchema,
  movimientoFondoCajaListResponseSchema,
  movimientoFondoCajaResponseSchema,
  type AnularGastoCajaPayload,
  type CreateGastoCajaPayload,
  type CreateMovimientoFondoCajaPayload
} from "@/features/gastoCaja/model/gastoCaja.schema";

export interface GastosCajaQueryParams {
  cajaId?: number;
  estado?: string;
  page?: number;
  limit?: number;
}

export async function getGastosCaja(params: GastosCajaQueryParams = {}) {
  return getRequest({
    url: apiEndpoints.gastoCaja.gastos,
    config: { params },
    schema: gastoCajaListResponseSchema
  });
}

export async function createGastoCaja(payload: CreateGastoCajaPayload) {
  const body = createGastoCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.gastoCaja.gastos, body, schema: gastoCajaResponseSchema });
}

export async function anularGastoCaja(id: string, payload: AnularGastoCajaPayload) {
  const body = anularGastoCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.gastoCaja.gastoAnular(id), body, schema: gastoCajaResponseSchema });
}

export async function getMovimientosFondoCaja(cajaId?: number) {
  return getRequest({
    url: apiEndpoints.gastoCaja.movimientosFondo,
    config: { params: cajaId ? { cajaId } : {} },
    schema: movimientoFondoCajaListResponseSchema
  });
}

export async function createMovimientoFondoCaja(payload: CreateMovimientoFondoCajaPayload) {
  const body = createMovimientoFondoCajaPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.gastoCaja.movimientosFondo,
    body,
    schema: movimientoFondoCajaResponseSchema
  });
}
