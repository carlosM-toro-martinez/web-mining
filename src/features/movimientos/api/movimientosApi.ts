import { postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  createEntradaManualPayloadSchema,
  createSalidaManualPayloadSchema,
  movimientoResponseSchema,
  reordenarMovimientosPayloadSchema,
  reordenarMovimientosResponseSchema,
  type CreateEntradaManualPayload,
  type CreateSalidaManualPayload,
  type ReordenarMovimientosPayload
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

export async function reordenarMovimientos(payload: ReordenarMovimientosPayload) {
  const body = reordenarMovimientosPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.movimientos.reordenar,
    body,
    schema: reordenarMovimientosResponseSchema
  });
}
