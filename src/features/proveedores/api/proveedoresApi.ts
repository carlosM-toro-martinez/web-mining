import { deleteRequest, getRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  createProveedorPayloadSchema,
  proveedorDetailResponseSchema,
  proveedorResponseSchema,
  proveedoresListResponseSchema,
  proveedoresQueryParamsSchema,
  updateProveedorPayloadSchema,
  type CreateProveedorPayload,
  type ProveedoresQueryParams,
  type UpdateProveedorPayload
} from "@/features/proveedores/model/proveedores.schema";
import { z } from "zod";

function cleanParams(params: ProveedoresQueryParams) {
  const parsed = proveedoresQueryParamsSchema.parse(params);
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined && value !== "")
  );
}

export async function getProveedores(params: ProveedoresQueryParams) {
  return getRequest({
    url: apiEndpoints.proveedores.base,
    config: {
      params: cleanParams(params)
    },
    schema: proveedoresListResponseSchema
  });
}

export async function getProveedorById(id: number) {
  return getRequest({
    url: apiEndpoints.proveedores.byId(id),
    schema: proveedorDetailResponseSchema
  });
}

export async function createProveedor(payload: CreateProveedorPayload) {
  const body = createProveedorPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.proveedores.base,
    body,
    schema: proveedorResponseSchema
  });
}

export async function updateProveedor(id: number, payload: UpdateProveedorPayload) {
  const body = updateProveedorPayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.proveedores.byId(id),
    body,
    schema: proveedorResponseSchema
  });
}

export async function deleteProveedor(id: number) {
  return deleteRequest({
    url: apiEndpoints.proveedores.byId(id),
    schema: z
      .object({ success: z.boolean().optional().default(true) })
      .or(z.unknown().transform(() => ({ success: true })))
  });
}
