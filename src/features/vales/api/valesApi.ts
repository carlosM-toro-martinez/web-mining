import { getRequest, patchRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  aprobarValePayloadSchema,
  createValePayloadSchema,
  entregarValePayloadSchema,
  entregarValeResponseSchema,
  valesListResponseSchema,
  valeResponseSchema,
  type AprobarValePayload,
  type CreateValePayload,
  type EntregarValePayload
} from "@/features/vales/model/vales.schema";

export async function createVale(payload: CreateValePayload) {
  const body = createValePayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.vales.base,
    body,
    schema: valeResponseSchema
  });
}

export async function getValeById(id: string) {
  return getRequest({
    url: apiEndpoints.vales.byId(id),
    schema: valeResponseSchema
  });
}

export async function getVales() {
  return getRequest({
    url: apiEndpoints.vales.base,
    schema: valesListResponseSchema
  });
}

export async function aprobarVale(id: string, payload: AprobarValePayload) {
  const body = aprobarValePayloadSchema.parse(payload);
  return patchRequest({
    url: apiEndpoints.vales.aprobar(id),
    body,
    schema: valeResponseSchema
  });
}

export async function entregarVale(id: string, payload: EntregarValePayload) {
  const body = entregarValePayloadSchema.parse(payload);
  return patchRequest({
    url: apiEndpoints.vales.entregar(id),
    body,
    schema: entregarValeResponseSchema
  });
}
