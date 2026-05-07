import { postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  createEntradaManualPayloadSchema,
  createSalidaManualPayloadSchema,
  movimientoResponseSchema,
  type CreateEntradaManualPayload,
  type CreateSalidaManualPayload
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
