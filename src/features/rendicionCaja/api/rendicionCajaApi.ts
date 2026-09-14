import { getRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  anularRendicionCajaPayloadSchema,
  createRendicionCajaPayloadSchema,
  rendicionCajaListResponseSchema,
  rendicionCajaResponseSchema,
  type AnularRendicionCajaPayload,
  type CreateRendicionCajaPayload
} from "@/features/rendicionCaja/model/rendicionCaja.schema";

export interface RendicionesCajaQueryParams {
  cajaId?: number;
  estado?: string;
}

export async function getRendicionesCaja(params: RendicionesCajaQueryParams = {}) {
  return getRequest({
    url: apiEndpoints.rendicionCaja.base,
    config: { params },
    schema: rendicionCajaListResponseSchema
  });
}

export async function getRendicionCajaById(id: string) {
  return getRequest({ url: apiEndpoints.rendicionCaja.byId(id), schema: rendicionCajaResponseSchema });
}

export async function createRendicionCaja(payload: CreateRendicionCajaPayload) {
  const body = createRendicionCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.rendicionCaja.base, body, schema: rendicionCajaResponseSchema });
}

export async function cerrarRendicionCaja(id: string) {
  return postRequest({ url: apiEndpoints.rendicionCaja.cerrar(id), body: {}, schema: rendicionCajaResponseSchema });
}

export async function anularRendicionCaja(id: string, payload: AnularRendicionCajaPayload) {
  const body = anularRendicionCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.rendicionCaja.anular(id), body, schema: rendicionCajaResponseSchema });
}
