import { getRequest, patchRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  compraResponseSchema,
  comprasListResponseSchema,
  comprasQueryParamsSchema,
  createCompraPayloadSchema,
  recibirCompraPayloadSchema,
  recibirCompraResponseSchema,
  type ComprasQueryParams,
  type CreateCompraPayload,
  type RecibirCompraPayload
} from "@/features/compras/model/compras.schema";

function cleanParams(params: ComprasQueryParams) {
  const parsed = comprasQueryParamsSchema.parse(params);
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined && value !== "")
  );
}

export async function createCompra(payload: CreateCompraPayload) {
  const body = createCompraPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.compras.base,
    body,
    schema: compraResponseSchema
  });
}

export async function getCompras(params: ComprasQueryParams) {
  return getRequest({
    url: apiEndpoints.compras.base,
    config: { params: cleanParams(params) },
    schema: comprasListResponseSchema
  });
}

export async function getCompraById(id: string) {
  return getRequest({
    url: apiEndpoints.compras.byId(id),
    schema: compraResponseSchema
  });
}

export async function recibirCompra(id: string, payload: RecibirCompraPayload) {
  const body = recibirCompraPayloadSchema.parse(payload);
  return patchRequest({
    url: apiEndpoints.compras.recibir(id),
    body,
    schema: recibirCompraResponseSchema
  });
}
