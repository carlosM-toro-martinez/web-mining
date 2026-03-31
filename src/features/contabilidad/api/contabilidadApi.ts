import { getRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  centroCostoResponseSchema,
  centrosCostoListResponseSchema,
  cuentaResponseSchema,
  cuentasListResponseSchema,
  createCentroCostoPayloadSchema,
  createCuentaPayloadSchema,
  createFuncionGastoPayloadSchema,
  createSalidaPayloadSchema,
  funcionGastoResponseSchema,
  funcionesGastoListResponseSchema,
  salidaMovimientoResponseSchema,
  type CreateCentroCostoPayload,
  type CreateCuentaPayload,
  type CreateFuncionGastoPayload,
  type CreateSalidaPayload
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

export async function createSalidaMovimiento(payload: CreateSalidaPayload) {
  const body = createSalidaPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.contabilidad.salidas,
    body,
    schema: salidaMovimientoResponseSchema
  });
}
