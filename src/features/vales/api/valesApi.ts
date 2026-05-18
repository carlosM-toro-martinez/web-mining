import { getRequest, patchRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  aprobarValePayloadSchema,
  createValePayloadSchema,
  entregarValePayloadSchema,
  entregarValeResponseSchema,
  historialSolicitanteResponseSchema,
  valesListParamsSchema,
  valesListResponseSchema,
  valeResponseSchema,
  type AprobarValePayload,
  type CreateValePayload,
  type EntregarValePayload,
  type ValesListParams
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

function cleanParams(params?: ValesListParams) {
  if (!params) return undefined;
  const parsed = valesListParamsSchema.parse(params);
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined && value !== "")
  );
}

export async function getVales(params?: ValesListParams) {
  return getRequest({
    url: apiEndpoints.vales.base,
    config: { params: cleanParams(params) },
    schema: valesListResponseSchema
  });
}

export async function getValesBySolicitante(userId: number, page = 1, limit = 10) {
  return getRequest({
    url: apiEndpoints.vales.historialSolicitante(userId),
    config: { params: { page, limit } },
    schema: historialSolicitanteResponseSchema
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

export async function rechazarVale(id: string, superintendenteId?: number) {
  return patchRequest({
    url: apiEndpoints.vales.rechazar(id),
    body: superintendenteId ? { superintendenteId } : {},
    schema: valeResponseSchema
  });
}
