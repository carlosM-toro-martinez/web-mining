import { deleteRequest, getRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  cajaChicaDeleteResponseSchema,
  cajaChicaListResponseSchema,
  cajaChicaResponseSchema,
  centroCostoCajaListResponseSchema,
  centroCostoCajaResponseSchema,
  conceptoRetencionCajaListResponseSchema,
  conceptoRetencionCajaResponseSchema,
  createCajaChicaPayloadSchema,
  createCentroCostoCajaPayloadSchema,
  createConceptoRetencionCajaPayloadSchema,
  createCuentaContableCajaPayloadSchema,
  createFuncionGastoCajaPayloadSchema,
  cuentaContableCajaListResponseSchema,
  cuentaContableCajaResponseSchema,
  funcionGastoCajaListResponseSchema,
  funcionGastoCajaResponseSchema,
  updateCajaChicaPayloadSchema,
  updateCentroCostoCajaPayloadSchema,
  updateConceptoRetencionCajaPayloadSchema,
  updateCuentaContableCajaPayloadSchema,
  updateFuncionGastoCajaPayloadSchema,
  type CreateCajaChicaPayload,
  type CreateCentroCostoCajaPayload,
  type CreateConceptoRetencionCajaPayload,
  type CreateCuentaContableCajaPayload,
  type CreateFuncionGastoCajaPayload,
  type UpdateCajaChicaPayload,
  type UpdateCentroCostoCajaPayload,
  type UpdateConceptoRetencionCajaPayload,
  type UpdateCuentaContableCajaPayload,
  type UpdateFuncionGastoCajaPayload
} from "@/features/parametrosCajaChica/model/parametrosCajaChica.schema";

// --- Cajas chicas ---
export async function getCajasChicas() {
  return getRequest({ url: apiEndpoints.cajaChica.cajas, schema: cajaChicaListResponseSchema });
}
export async function createCajaChica(payload: CreateCajaChicaPayload) {
  const body = createCajaChicaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.cajaChica.cajas, body, schema: cajaChicaResponseSchema });
}
export async function updateCajaChica(id: number, payload: UpdateCajaChicaPayload) {
  const body = updateCajaChicaPayloadSchema.parse(payload);
  return putRequest({ url: apiEndpoints.cajaChica.cajaById(id), body, schema: cajaChicaResponseSchema });
}
export async function deleteCajaChica(id: number) {
  return deleteRequest({ url: apiEndpoints.cajaChica.cajaById(id), schema: cajaChicaDeleteResponseSchema });
}

// --- Centros de costo ---
export async function getCentrosCostoCaja() {
  return getRequest({ url: apiEndpoints.cajaChica.centrosCosto, schema: centroCostoCajaListResponseSchema });
}
export async function createCentroCostoCaja(payload: CreateCentroCostoCajaPayload) {
  const body = createCentroCostoCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.cajaChica.centrosCosto, body, schema: centroCostoCajaResponseSchema });
}
export async function updateCentroCostoCaja(id: number, payload: UpdateCentroCostoCajaPayload) {
  const body = updateCentroCostoCajaPayloadSchema.parse(payload);
  return putRequest({ url: apiEndpoints.cajaChica.centroCostoById(id), body, schema: centroCostoCajaResponseSchema });
}
export async function deleteCentroCostoCaja(id: number) {
  return deleteRequest({ url: apiEndpoints.cajaChica.centroCostoById(id), schema: cajaChicaDeleteResponseSchema });
}

// --- Funciones de gasto ---
export async function getFuncionesGastoCaja() {
  return getRequest({ url: apiEndpoints.cajaChica.funcionesGasto, schema: funcionGastoCajaListResponseSchema });
}
export async function createFuncionGastoCaja(payload: CreateFuncionGastoCajaPayload) {
  const body = createFuncionGastoCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.cajaChica.funcionesGasto, body, schema: funcionGastoCajaResponseSchema });
}
export async function updateFuncionGastoCaja(id: number, payload: UpdateFuncionGastoCajaPayload) {
  const body = updateFuncionGastoCajaPayloadSchema.parse(payload);
  return putRequest({ url: apiEndpoints.cajaChica.funcionGastoById(id), body, schema: funcionGastoCajaResponseSchema });
}
export async function deleteFuncionGastoCaja(id: number) {
  return deleteRequest({ url: apiEndpoints.cajaChica.funcionGastoById(id), schema: cajaChicaDeleteResponseSchema });
}

// --- Cuentas contables ---
export async function getCuentasContablesCaja() {
  return getRequest({ url: apiEndpoints.cajaChica.cuentasContables, schema: cuentaContableCajaListResponseSchema });
}
export async function createCuentaContableCaja(payload: CreateCuentaContableCajaPayload) {
  const body = createCuentaContableCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.cajaChica.cuentasContables, body, schema: cuentaContableCajaResponseSchema });
}
export async function updateCuentaContableCaja(id: number, payload: UpdateCuentaContableCajaPayload) {
  const body = updateCuentaContableCajaPayloadSchema.parse(payload);
  return putRequest({ url: apiEndpoints.cajaChica.cuentaContableById(id), body, schema: cuentaContableCajaResponseSchema });
}
export async function deleteCuentaContableCaja(id: number) {
  return deleteRequest({ url: apiEndpoints.cajaChica.cuentaContableById(id), schema: cajaChicaDeleteResponseSchema });
}

// --- Conceptos de retención ---
export async function getConceptosRetencionCaja() {
  return getRequest({ url: apiEndpoints.cajaChica.conceptosRetencion, schema: conceptoRetencionCajaListResponseSchema });
}
export async function createConceptoRetencionCaja(payload: CreateConceptoRetencionCajaPayload) {
  const body = createConceptoRetencionCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.cajaChica.conceptosRetencion, body, schema: conceptoRetencionCajaResponseSchema });
}
export async function updateConceptoRetencionCaja(id: number, payload: UpdateConceptoRetencionCajaPayload) {
  const body = updateConceptoRetencionCajaPayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.cajaChica.conceptoRetencionById(id),
    body,
    schema: conceptoRetencionCajaResponseSchema
  });
}
