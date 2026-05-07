import { getRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  createProveedorPayloadSchema,
  proveedorResponseSchema,
  proveedoresListResponseSchema,
  proveedoresQueryParamsSchema,
  type CreateProveedorPayload,
  type ProveedoresQueryParams
} from "@/features/proveedores/model/proveedores.schema";

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

export async function createProveedor(payload: CreateProveedorPayload) {
  const body = createProveedorPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.proveedores.base,
    body,
    schema: proveedorResponseSchema
  });
}
