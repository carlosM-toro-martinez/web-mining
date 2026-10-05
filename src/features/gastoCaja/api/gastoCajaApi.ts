import { z } from "zod";
import { getRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { httpClient } from "@/shared/api/core/httpClient";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  anularGastoCajaPayloadSchema,
  createGastoCajaPayloadSchema,
  createMovimientoFondoCajaPayloadSchema,
  gastoCajaListResponseSchema,
  gastoCajaResponseSchema,
  importarGastosCajaResponseSchema,
  movimientoFondoCajaListResponseSchema,
  movimientoFondoCajaResponseSchema,
  updateGastoCajaPayloadSchema,
  type AnularGastoCajaPayload,
  type CreateGastoCajaPayload,
  type CreateMovimientoFondoCajaPayload,
  type UpdateGastoCajaPayload
} from "@/features/gastoCaja/model/gastoCaja.schema";

export interface GastosCajaQueryParams {
  cajaId?: number;
  cuentaBancariaCajaId?: number;
  origen?: string;
  estado?: string;
  fechaInicio?: string;
  fechaFin?: string;
  search?: string;
  categoriaRendicion?: string;
  tipoDocumento?: string;
  montoMin?: number;
  montoMax?: number;
  informacionIncompleta?: "true" | "false";
  orden?: "fecha_desc" | "fecha_asc" | "monto_desc" | "monto_asc";
  page?: number;
  limit?: number;
}

export async function getGastosCaja(params: GastosCajaQueryParams = {}) {
  return getRequest({
    url: apiEndpoints.gastoCaja.gastos,
    config: { params },
    schema: gastoCajaListResponseSchema
  });
}

export async function createGastoCaja(payload: CreateGastoCajaPayload) {
  const body = createGastoCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.gastoCaja.gastos, body, schema: gastoCajaResponseSchema });
}

export async function updateGastoCaja(id: string, payload: UpdateGastoCajaPayload) {
  const body = updateGastoCajaPayloadSchema.parse(payload);
  return putRequest({ url: apiEndpoints.gastoCaja.gastoById(id), body, schema: gastoCajaResponseSchema });
}

export async function anularGastoCaja(id: string, payload: AnularGastoCajaPayload) {
  const body = anularGastoCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.gastoCaja.gastoAnular(id), body, schema: gastoCajaResponseSchema });
}

export interface ClasificarGastosCajaPayload {
  ids: string[];
  cuentaContableCajaId?: number | null;
  centroCostoCajaId?: number | null;
  funcionGastoCajaId?: number | null;
  partidaPresupuestoId?: number | null;
  categoriaRendicion?: string;
}

const clasificarGastosCajaResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({ actualizados: z.number(), omitidos: z.number() })
});

export async function clasificarGastosCaja(payload: ClasificarGastosCajaPayload) {
  return postRequest({ url: apiEndpoints.gastoCaja.clasificar, body: payload, schema: clasificarGastosCajaResponseSchema });
}

export async function importarGastosCajaExcel(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await httpClient.post(apiEndpoints.gastoCaja.importarExcel, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return importarGastosCajaResponseSchema.parse(response.data);
}

export async function getMovimientosFondoCaja(cajaId?: number) {
  return getRequest({
    url: apiEndpoints.gastoCaja.movimientosFondo,
    config: { params: cajaId ? { cajaId } : {} },
    schema: movimientoFondoCajaListResponseSchema
  });
}

export async function createMovimientoFondoCaja(payload: CreateMovimientoFondoCajaPayload) {
  const body = createMovimientoFondoCajaPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.gastoCaja.movimientosFondo,
    body,
    schema: movimientoFondoCajaResponseSchema
  });
}
