import { deleteRequest, getRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  centroCostoResponseSchema,
  centrosCostoListResponseSchema,
  cuentaMovimientosResponseSchema,
  cuentaResponseSchema,
  cuentasListResponseSchema,
  createCentroCostoPayloadSchema,
  createCuentaPayloadSchema,
  createFuncionGastoPayloadSchema,
  createSectorPayloadSchema,
  createSalidaPayloadSchema,
  deleteResponseSchema,
  funcionGastoResponseSchema,
  funcionesGastoListResponseSchema,
  sectorResponseSchema,
  sectoresListResponseSchema,
  salidaMovimientoResponseSchema,
  updateCentroCostoPayloadSchema,
  updateFuncionGastoPayloadSchema,
  updateSectorPayloadSchema,
  updateCuentaPayloadSchema,
  type CreateCentroCostoPayload,
  type CreateCuentaPayload,
  type CreateFuncionGastoPayload,
  type CreateSectorPayload,
  type CreateSalidaPayload,
  type UpdateCentroCostoPayload,
  type UpdateFuncionGastoPayload,
  type UpdateSectorPayload,
  type UpdateCuentaPayload
} from "@/features/contabilidad/model/contabilidad.schema";

export async function getCentrosCosto() {
  return getRequest({
    url: apiEndpoints.contabilidad.centrosCosto,
    schema: centrosCostoListResponseSchema
  });
}

export async function createCentroCosto(payload: CreateCentroCostoPayload) {
  const body = createCentroCostoPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.contabilidad.centrosCosto,
    body,
    schema: centroCostoResponseSchema
  });
}

export async function updateCentroCosto(id: number, payload: UpdateCentroCostoPayload) {
  const body = updateCentroCostoPayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.contabilidad.centroCostoById(id),
    body,
    schema: centroCostoResponseSchema
  });
}

export async function deleteCentroCosto(id: number) {
  return deleteRequest({
    url: apiEndpoints.contabilidad.centroCostoById(id),
    schema: deleteResponseSchema
  });
}

export async function getFuncionesGasto() {
  return getRequest({
    url: apiEndpoints.contabilidad.funcionesGasto,
    schema: funcionesGastoListResponseSchema
  });
}

export async function createFuncionGasto(payload: CreateFuncionGastoPayload) {
  const body = createFuncionGastoPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.contabilidad.funcionesGasto,
    body,
    schema: funcionGastoResponseSchema
  });
}

export async function updateFuncionGasto(id: number, payload: UpdateFuncionGastoPayload) {
  const body = updateFuncionGastoPayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.contabilidad.funcionGastoById(id),
    body,
    schema: funcionGastoResponseSchema
  });
}

export async function deleteFuncionGasto(id: number) {
  return deleteRequest({
    url: apiEndpoints.contabilidad.funcionGastoById(id),
    schema: deleteResponseSchema
  });
}

export async function getSectores() {
  return getRequest({
    url: apiEndpoints.contabilidad.sectores,
    schema: sectoresListResponseSchema
  });
}

export async function createSector(payload: CreateSectorPayload) {
  const body = createSectorPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.contabilidad.sectores,
    body,
    schema: sectorResponseSchema
  });
}

export async function updateSector(id: number, payload: UpdateSectorPayload) {
  const body = updateSectorPayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.contabilidad.sectorById(id),
    body,
    schema: sectorResponseSchema
  });
}

export async function deleteSector(id: number) {
  return deleteRequest({
    url: apiEndpoints.contabilidad.sectorById(id),
    schema: deleteResponseSchema
  });
}

export async function getCuentas() {
  return getRequest({
    url: apiEndpoints.contabilidad.cuentas,
    schema: cuentasListResponseSchema
  });
}

export async function createCuenta(payload: CreateCuentaPayload) {
  const body = createCuentaPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.contabilidad.cuentas,
    body,
    schema: cuentaResponseSchema
  });
}

export async function updateCuenta(id: number, payload: UpdateCuentaPayload) {
  const body = updateCuentaPayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.contabilidad.cuentaById(id),
    body,
    schema: cuentaResponseSchema
  });
}

export async function deleteCuenta(id: number) {
  return deleteRequest({
    url: apiEndpoints.contabilidad.cuentaById(id),
    schema: deleteResponseSchema
  });
}

export async function createSalidaMovimiento(payload: CreateSalidaPayload) {
  const body = createSalidaPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.contabilidad.salidas,
    body,
    schema: salidaMovimientoResponseSchema
  });
}

export async function getCuentaMovimientos(id: number) {
  const result = await getRequest({
    url: apiEndpoints.contabilidad.cuentaMovimientos(id),
    schema: cuentaMovimientosResponseSchema
  });
  return result.data;
}
