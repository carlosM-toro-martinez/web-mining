import { deleteRequest, getRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  asignarBancoPresupuestoCajaPayloadSchema,
  createPresupuestoCajaPayloadSchema,
  duplicarPresupuestoCajaPayloadSchema,
  presupuestoCajaDeleteResponseSchema,
  presupuestoCajaListResponseSchema,
  presupuestoCajaResponseSchema,
  updatePresupuestoCajaPayloadSchema,
  type AsignarBancoPresupuestoCajaPayload,
  type CreatePresupuestoCajaPayload,
  type DuplicarPresupuestoCajaPayload,
  type UpdatePresupuestoCajaPayload
} from "@/features/presupuestoCaja/model/presupuestoCaja.schema";

export interface PresupuestosCajaQueryParams {
  cajaId?: number;
  anio?: number;
  mes?: number;
  soloActivas?: boolean;
}

export async function getPresupuestosCaja(params: PresupuestosCajaQueryParams = {}) {
  return getRequest({
    url: apiEndpoints.cajaChica.presupuestos,
    config: { params },
    schema: presupuestoCajaListResponseSchema
  });
}

export async function getPresupuestoCajaById(id: number) {
  return getRequest({ url: apiEndpoints.cajaChica.presupuestoById(id), schema: presupuestoCajaResponseSchema });
}

export async function createPresupuestoCaja(payload: CreatePresupuestoCajaPayload) {
  const body = createPresupuestoCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.cajaChica.presupuestos, body, schema: presupuestoCajaResponseSchema });
}

export async function updatePresupuestoCaja(id: number, payload: UpdatePresupuestoCajaPayload) {
  const body = updatePresupuestoCajaPayloadSchema.parse(payload);
  return putRequest({ url: apiEndpoints.cajaChica.presupuestoById(id), body, schema: presupuestoCajaResponseSchema });
}

export async function deletePresupuestoCaja(id: number) {
  return deleteRequest({ url: apiEndpoints.cajaChica.presupuestoById(id), schema: presupuestoCajaDeleteResponseSchema });
}

export async function asignarBancoPresupuestoCaja(id: number, payload: AsignarBancoPresupuestoCajaPayload) {
  const body = asignarBancoPresupuestoCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.cajaChica.presupuestoAsignarBanco(id), body, schema: presupuestoCajaResponseSchema });
}

export async function duplicarPresupuestoCaja(id: number, payload: DuplicarPresupuestoCajaPayload) {
  const body = duplicarPresupuestoCajaPayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.cajaChica.presupuestoDuplicar(id), body, schema: presupuestoCajaResponseSchema });
}
