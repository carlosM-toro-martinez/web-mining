import { deleteRequest, getRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  agregarItemConceptoPayloadSchema,
  anularLiquidacionPayloadSchema,
  createLiquidacionPayloadSchema,
  liquidacionItemResponseSchema,
  liquidacionListResponseSchema,
  liquidacionResponseSchema,
  previewLiquidacionResponseSchema,
  type AgregarItemConceptoPayload,
  type AnularLiquidacionPayload,
  type CreateLiquidacionPayload,
  type PreviewLiquidacionQuery
} from "@/features/liquidacion/model/liquidacion.schema";

export interface LiquidacionesQueryParams {
  transportistaId?: number;
  estado?: string;
}

export async function getLiquidaciones(params: LiquidacionesQueryParams = {}) {
  return getRequest({
    url: apiEndpoints.liquidaciones.base,
    config: { params },
    schema: liquidacionListResponseSchema
  });
}

export async function getLiquidacionPreview(params: PreviewLiquidacionQuery) {
  return getRequest({
    url: apiEndpoints.liquidaciones.preview,
    config: { params },
    schema: previewLiquidacionResponseSchema
  });
}

export async function getLiquidacionById(id: string) {
  return getRequest({ url: apiEndpoints.liquidaciones.byId(id), schema: liquidacionResponseSchema });
}

export async function createLiquidacion(payload: CreateLiquidacionPayload) {
  const body = createLiquidacionPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.liquidaciones.base, body, schema: liquidacionResponseSchema });
}

export async function agregarItemConcepto(id: string, payload: AgregarItemConceptoPayload) {
  const body = agregarItemConceptoPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.liquidaciones.itemsConcepto(id),
    body,
    schema: liquidacionItemResponseSchema
  });
}

export async function quitarItemConcepto(id: string, itemId: string) {
  return deleteRequest({
    url: apiEndpoints.liquidaciones.itemConceptoById(id, itemId),
    schema: liquidacionItemResponseSchema.partial()
  });
}

export async function cerrarLiquidacion(id: string) {
  return postRequest({
    url: apiEndpoints.liquidaciones.cerrar(id),
    body: {},
    schema: liquidacionResponseSchema
  });
}

export async function anularLiquidacion(id: string, payload: AnularLiquidacionPayload) {
  const body = anularLiquidacionPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.liquidaciones.anular(id), body, schema: liquidacionResponseSchema });
}
