import { postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  createEntradaManualPayloadSchema,
  createSalidaManualPayloadSchema,
  movimientoResponseSchema,
  reconstruirCadenaPayloadSchema,
  reconstruirCadenaResponseSchema,
  type CreateEntradaManualPayload,
  type CreateSalidaManualPayload,
  type ReconstruirCadenaPayload,
} from "@/features/movimientos/model/movimientos.schema";

export async function createSalidaManual(payload: CreateSalidaManualPayload) {
  const body = createSalidaManualPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.movimientos.salidas,
    body,
    schema: movimientoResponseSchema
  });
}

export async function createEntradaManual(payload: CreateEntradaManualPayload) {
  const body = createEntradaManualPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.movimientos.entradas,
    body,
    schema: movimientoResponseSchema
  });
}

export async function reconstruirCadena(payload: ReconstruirCadenaPayload) {
  const body = reconstruirCadenaPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.movimientos.reconstruirCadena,
    body,
    schema: reconstruirCadenaResponseSchema
  });
}

