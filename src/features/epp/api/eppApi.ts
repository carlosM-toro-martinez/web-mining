import { apiEndpoints } from "@/shared/api/endpoints";
import { deleteRequest, getRequest, patchRequest, postRequest } from "@/shared/api/core/request";
import {
  eppAsignacionResponseSchema,
  eppAsignacionesQuerySchema,
  eppAsignacionesResponseSchema,
  eppCreateAsignacionSchema,
  eppDeleteAsignacionResponseSchema,
  eppProductoHistorialResponseSchema,
  eppProductosQuerySchema,
  eppProductosResponseSchema,
  eppTrabajadorReporteResponseSchema,
  eppTrabajadoresQuerySchema,
  eppTrabajadoresResponseSchema,
  eppUpdateAsignacionSchema,
  type EppAsignacionesQuery,
  type EppCreateAsignacionPayload,
  type EppProductosQuery,
  type EppTrabajadoresQuery,
  type EppUpdateAsignacionPayload
} from "@/features/epp/model/epp.schema";

function cleanParams<T extends object>(params: T, parse: (payload: T) => T) {
  const parsed = parse(params);
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined && value !== "")
  );
}

export async function getEppProductos(params: EppProductosQuery) {
  return getRequest({
    url: apiEndpoints.epp.productos,
    config: { params: cleanParams(params, eppProductosQuerySchema.parse) },
    schema: eppProductosResponseSchema
  });
}

export async function getEppProductoHistorial(productoId: number | string) {
  return getRequest({
    url: apiEndpoints.epp.productoHistorial(productoId),
    schema: eppProductoHistorialResponseSchema
  });
}

export async function getEppTrabajadores(params: EppTrabajadoresQuery) {
  return getRequest({
    url: apiEndpoints.epp.trabajadores,
    config: { params: cleanParams(params, eppTrabajadoresQuerySchema.parse) },
    schema: eppTrabajadoresResponseSchema
  });
}

export async function getEppTrabajadorReporte(usuarioId: number | string) {
  return getRequest({
    url: apiEndpoints.epp.trabajadorReporte(usuarioId),
    schema: eppTrabajadorReporteResponseSchema
  });
}

export async function getEppAsignaciones(params: EppAsignacionesQuery) {
  return getRequest({
    url: apiEndpoints.epp.asignaciones,
    config: { params: cleanParams(params, eppAsignacionesQuerySchema.parse) },
    schema: eppAsignacionesResponseSchema
  });
}

export async function createEppAsignacion(payload: EppCreateAsignacionPayload) {
  return postRequest({
    url: apiEndpoints.epp.asignaciones,
    body: eppCreateAsignacionSchema.parse(payload),
    schema: eppAsignacionResponseSchema
  });
}

export async function updateEppAsignacion(id: string, payload: EppUpdateAsignacionPayload) {
  return patchRequest({
    url: apiEndpoints.epp.asignacionById(id),
    body: eppUpdateAsignacionSchema.parse(payload),
    schema: eppAsignacionResponseSchema
  });
}

export async function deleteEppAsignacion(id: string) {
  return deleteRequest({
    url: apiEndpoints.epp.asignacionById(id),
    schema: eppDeleteAsignacionResponseSchema
  });
}
