import { deleteRequest, getRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  alicuotaRegaliaListResponseSchema,
  alicuotaRegaliaResponseSchema,
  catalogoSimpleListResponseSchema,
  catalogoSimpleResponseSchema,
  conceptoLiquidacionListResponseSchema,
  conceptoLiquidacionResponseSchema,
  createAlicuotaRegaliaPayloadSchema,
  createCatalogoSimplePayloadSchema,
  createConceptoLiquidacionPayloadSchema,
  createTarifaLiquidacionPayloadSchema,
  parametroDeleteResponseSchema,
  tarifaLiquidacionListResponseSchema,
  tarifaLiquidacionResponseSchema,
  updateCatalogoSimplePayloadSchema,
  updateConceptoLiquidacionPayloadSchema,
  type CreateAlicuotaRegaliaPayload,
  type CreateCatalogoSimplePayload,
  type CreateConceptoLiquidacionPayload,
  type CreateTarifaLiquidacionPayload,
  type UpdateCatalogoSimplePayload,
  type UpdateConceptoLiquidacionPayload
} from "@/features/parametrosLogistica/model/parametrosLogistica.schema";

// --- Municipios de origen ---
export async function getMunicipiosOrigen() {
  return getRequest({
    url: apiEndpoints.parametrosLogistica.municipiosOrigen,
    schema: catalogoSimpleListResponseSchema
  });
}
export async function createMunicipioOrigen(payload: CreateCatalogoSimplePayload) {
  const body = createCatalogoSimplePayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.parametrosLogistica.municipiosOrigen,
    body,
    schema: catalogoSimpleResponseSchema
  });
}
export async function updateMunicipioOrigen(id: number, payload: UpdateCatalogoSimplePayload) {
  const body = updateCatalogoSimplePayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.parametrosLogistica.municipioOrigenById(id),
    body,
    schema: catalogoSimpleResponseSchema
  });
}
export async function deleteMunicipioOrigen(id: number) {
  return deleteRequest({
    url: apiEndpoints.parametrosLogistica.municipioOrigenById(id),
    schema: parametroDeleteResponseSchema
  });
}

// --- Tipos de mineral ---
export async function getTiposMineral() {
  return getRequest({
    url: apiEndpoints.parametrosLogistica.tiposMineral,
    schema: catalogoSimpleListResponseSchema
  });
}
export async function createTipoMineral(payload: CreateCatalogoSimplePayload) {
  const body = createCatalogoSimplePayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.parametrosLogistica.tiposMineral,
    body,
    schema: catalogoSimpleResponseSchema
  });
}
export async function updateTipoMineral(id: number, payload: UpdateCatalogoSimplePayload) {
  const body = updateCatalogoSimplePayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.parametrosLogistica.tipoMineralById(id),
    body,
    schema: catalogoSimpleResponseSchema
  });
}
export async function deleteTipoMineral(id: number) {
  return deleteRequest({
    url: apiEndpoints.parametrosLogistica.tipoMineralById(id),
    schema: parametroDeleteResponseSchema
  });
}

// --- Ingenios ---
export async function getIngenios() {
  return getRequest({
    url: apiEndpoints.parametrosLogistica.ingenios,
    schema: catalogoSimpleListResponseSchema
  });
}
export async function createIngenio(payload: CreateCatalogoSimplePayload) {
  const body = createCatalogoSimplePayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.parametrosLogistica.ingenios,
    body,
    schema: catalogoSimpleResponseSchema
  });
}
export async function updateIngenio(id: number, payload: UpdateCatalogoSimplePayload) {
  const body = updateCatalogoSimplePayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.parametrosLogistica.ingenioById(id),
    body,
    schema: catalogoSimpleResponseSchema
  });
}
export async function deleteIngenio(id: number) {
  return deleteRequest({
    url: apiEndpoints.parametrosLogistica.ingenioById(id),
    schema: parametroDeleteResponseSchema
  });
}

// --- Conceptos de liquidación ---
export async function getConceptosLiquidacion() {
  return getRequest({
    url: apiEndpoints.parametrosLogistica.conceptosLiquidacion,
    schema: conceptoLiquidacionListResponseSchema
  });
}
export async function createConceptoLiquidacion(payload: CreateConceptoLiquidacionPayload) {
  const body = createConceptoLiquidacionPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.parametrosLogistica.conceptosLiquidacion,
    body,
    schema: conceptoLiquidacionResponseSchema
  });
}
export async function updateConceptoLiquidacion(id: number, payload: UpdateConceptoLiquidacionPayload) {
  const body = updateConceptoLiquidacionPayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.parametrosLogistica.conceptoLiquidacionById(id),
    body,
    schema: conceptoLiquidacionResponseSchema
  });
}
export async function deleteConceptoLiquidacion(id: number) {
  return deleteRequest({
    url: apiEndpoints.parametrosLogistica.conceptoLiquidacionById(id),
    schema: parametroDeleteResponseSchema
  });
}

// --- Alícuotas de regalía (solo lectura + creación; nunca se editan) ---
export async function getAlicuotasRegalia() {
  return getRequest({
    url: apiEndpoints.parametrosLogistica.alicuotasRegalia,
    schema: alicuotaRegaliaListResponseSchema
  });
}
export async function createAlicuotaRegalia(payload: CreateAlicuotaRegaliaPayload) {
  const body = createAlicuotaRegaliaPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.parametrosLogistica.alicuotasRegalia,
    body,
    schema: alicuotaRegaliaResponseSchema
  });
}

// --- Tarifas de liquidación (solo lectura + creación; nunca se editan) ---
export async function getTarifasLiquidacion() {
  return getRequest({
    url: apiEndpoints.parametrosLogistica.tarifasLiquidacion,
    schema: tarifaLiquidacionListResponseSchema
  });
}
export async function createTarifaLiquidacion(payload: CreateTarifaLiquidacionPayload) {
  const body = createTarifaLiquidacionPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.parametrosLogistica.tarifasLiquidacion,
    body,
    schema: tarifaLiquidacionResponseSchema
  });
}
