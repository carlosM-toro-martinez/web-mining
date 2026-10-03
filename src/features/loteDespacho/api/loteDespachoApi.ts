import { getRequest, patchRequest, postRequest } from "@/shared/api/core/request";
import { httpClient } from "@/shared/api/core/httpClient";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  anularLotePayloadSchema,
  avanzarEstadoLotePayloadSchema,
  createLoteDespachoPayloadSchema,
  importarLotesHistoricoResponseSchema,
  loteDespachoListResponseSchema,
  loteDespachoResponseSchema,
  registrarCombustibleEntregadoPayloadSchema,
  registrarPesajePayloadSchema,
  transbordarLotePayloadSchema,
  updateLoteDespachoPayloadSchema,
  type AnularLotePayload,
  type AvanzarEstadoLotePayload,
  type CreateLoteDespachoPayload,
  type RegistrarCombustibleEntregadoPayload,
  type RegistrarPesajePayload,
  type TransbordarLotePayload,
  type UpdateLoteDespachoPayload
} from "@/features/loteDespacho/model/loteDespacho.schema";

export interface LotesDespachoQueryParams {
  estadoLote?: string;
  transportistaId?: number;
  vehiculoId?: number;
  fechaInicio?: string;
  fechaFin?: string;
  search?: string;
  conObservaciones?: boolean;
  page?: number;
  limit?: number;
}

export async function getLotesDespacho(params: LotesDespachoQueryParams = {}) {
  return getRequest({
    url: apiEndpoints.lotesDespacho.base,
    config: { params },
    schema: loteDespachoListResponseSchema
  });
}

export async function getLoteDespachoById(id: string) {
  return getRequest({ url: apiEndpoints.lotesDespacho.byId(id), schema: loteDespachoResponseSchema });
}

export async function createLoteDespacho(payload: CreateLoteDespachoPayload) {
  const body = createLoteDespachoPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.lotesDespacho.base, body, schema: loteDespachoResponseSchema });
}

export async function updateLoteDespacho(id: string, payload: UpdateLoteDespachoPayload) {
  const body = updateLoteDespachoPayloadSchema.parse(payload);
  return patchRequest({ url: apiEndpoints.lotesDespacho.byId(id), body, schema: loteDespachoResponseSchema });
}

export async function avanzarEstadoLote(id: string, payload: AvanzarEstadoLotePayload) {
  const body = avanzarEstadoLotePayloadSchema.parse(payload);
  return patchRequest({ url: apiEndpoints.lotesDespacho.estado(id), body, schema: loteDespachoResponseSchema });
}

export async function registrarPesajeLote(id: string, payload: RegistrarPesajePayload) {
  const body = registrarPesajePayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.lotesDespacho.pesaje(id), body, schema: loteDespachoResponseSchema });
}

export async function registrarCombustibleEntregadoLote(id: string, payload: RegistrarCombustibleEntregadoPayload) {
  const body = registrarCombustibleEntregadoPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.lotesDespacho.combustibleEntregado(id), body, schema: loteDespachoResponseSchema });
}

export async function anularLote(id: string, payload: AnularLotePayload) {
  const body = anularLotePayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.lotesDespacho.anular(id), body, schema: loteDespachoResponseSchema });
}

export async function transbordarLote(id: string, payload: TransbordarLotePayload) {
  const body = transbordarLotePayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.lotesDespacho.transbordo(id), body, schema: loteDespachoResponseSchema });
}

export async function importarLotesHistoricoExcel(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await httpClient.post(apiEndpoints.lotesDespacho.importarHistorico, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return importarLotesHistoricoResponseSchema.parse(response.data);
}
