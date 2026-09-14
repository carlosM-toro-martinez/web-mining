import { getRequest, patchRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  cambiarEstadoVehiculoPayloadSchema,
  choferListResponseSchema,
  choferResponseSchema,
  createChoferPayloadSchema,
  createVehiculoPayloadSchema,
  estadoFlotaHistoricoListResponseSchema,
  updateChoferPayloadSchema,
  updateVehiculoPayloadSchema,
  vehiculoListResponseSchema,
  vehiculoResponseSchema,
  type CambiarEstadoVehiculoPayload,
  type CreateChoferPayload,
  type CreateVehiculoPayload,
  type UpdateChoferPayload,
  type UpdateVehiculoPayload
} from "@/features/flota/model/flota.schema";

// --- Vehículos ---
export async function getVehiculos() {
  return getRequest({ url: apiEndpoints.flota.vehiculos, schema: vehiculoListResponseSchema });
}

export async function createVehiculo(payload: CreateVehiculoPayload) {
  const body = createVehiculoPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.flota.vehiculos, body, schema: vehiculoResponseSchema });
}

export async function updateVehiculo(id: number, payload: UpdateVehiculoPayload) {
  const body = updateVehiculoPayloadSchema.parse(payload);
  return putRequest({ url: apiEndpoints.flota.vehiculoById(id), body, schema: vehiculoResponseSchema });
}

export async function cambiarEstadoVehiculo(id: number, payload: CambiarEstadoVehiculoPayload) {
  const body = cambiarEstadoVehiculoPayloadSchema.parse(payload);
  return patchRequest({ url: apiEndpoints.flota.vehiculoEstado(id), body, schema: vehiculoResponseSchema });
}

export async function getVehiculoHistorial(id: number) {
  return getRequest({
    url: apiEndpoints.flota.vehiculoHistorial(id),
    schema: estadoFlotaHistoricoListResponseSchema
  });
}

// --- Choferes ---
export async function getChoferes() {
  return getRequest({ url: apiEndpoints.flota.choferes, schema: choferListResponseSchema });
}

export async function createChofer(payload: CreateChoferPayload) {
  const body = createChoferPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.flota.choferes, body, schema: choferResponseSchema });
}

export async function updateChofer(id: number, payload: UpdateChoferPayload) {
  const body = updateChoferPayloadSchema.parse(payload);
  return putRequest({ url: apiEndpoints.flota.choferById(id), body, schema: choferResponseSchema });
}
