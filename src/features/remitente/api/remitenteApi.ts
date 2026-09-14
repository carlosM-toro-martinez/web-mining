import { deleteRequest, getRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  createRemitentePayloadSchema,
  remitenteDeleteResponseSchema,
  remitenteListResponseSchema,
  remitenteResponseSchema,
  updateRemitentePayloadSchema,
  type CreateRemitentePayload,
  type UpdateRemitentePayload
} from "@/features/remitente/model/remitente.schema";

export async function getRemitentes() {
  return getRequest({ url: apiEndpoints.remitentes.base, schema: remitenteListResponseSchema });
}

export async function createRemitente(payload: CreateRemitentePayload) {
  const body = createRemitentePayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.remitentes.base, body, schema: remitenteResponseSchema });
}

export async function updateRemitente(id: number, payload: UpdateRemitentePayload) {
  const body = updateRemitentePayloadSchema.parse(payload);
  return putRequest({ url: apiEndpoints.remitentes.byId(id), body, schema: remitenteResponseSchema });
}

export async function deleteRemitente(id: number) {
  return deleteRequest({ url: apiEndpoints.remitentes.byId(id), schema: remitenteDeleteResponseSchema });
}
