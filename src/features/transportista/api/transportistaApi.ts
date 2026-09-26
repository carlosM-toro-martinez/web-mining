import { deleteRequest, getRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  createTransportistaPayloadSchema,
  transportistaDeleteResponseSchema,
  transportistaListResponseSchema,
  transportistaResponseSchema,
  updateTransportistaPayloadSchema,
  type CreateTransportistaPayload,
  type UpdateTransportistaPayload
} from "@/features/transportista/model/transportista.schema";

export async function getTransportistas() {
  return getRequest({ url: apiEndpoints.transportistas.base, schema: transportistaListResponseSchema });
}

export async function createTransportista(payload: CreateTransportistaPayload) {
  const body = createTransportistaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.transportistas.base, body, schema: transportistaResponseSchema });
}

export async function updateTransportista(id: number, payload: UpdateTransportistaPayload) {
  const body = updateTransportistaPayloadSchema.parse(payload);
  return putRequest({ url: apiEndpoints.transportistas.byId(id), body, schema: transportistaResponseSchema });
}

export async function deleteTransportista(id: number) {
  return deleteRequest({ url: apiEndpoints.transportistas.byId(id), schema: transportistaDeleteResponseSchema });
}
