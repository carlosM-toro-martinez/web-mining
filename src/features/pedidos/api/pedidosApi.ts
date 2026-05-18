import { getRequest, patchRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  createPedidoPayloadSchema,
  pedidoResponseSchema,
  pedidosListParamsSchema,
  pedidosListResponseSchema,
  type CreatePedidoPayload,
  type PedidosListParams
} from "@/features/pedidos/model/pedidos.schema";

function cleanParams(params: PedidosListParams) {
  const parsed = pedidosListParamsSchema.parse(params);
  return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined && value !== ""));
}

export async function getPedidos(params: PedidosListParams) {
  return getRequest({
    url: apiEndpoints.pedidos.base,
    config: { params: cleanParams(params) },
    schema: pedidosListResponseSchema
  });
}

export async function getPedidoById(id: string) {
  return getRequest({
    url: apiEndpoints.pedidos.byId(id),
    schema: pedidoResponseSchema
  });
}

export async function createPedido(payload: CreatePedidoPayload) {
  return postRequest({
    url: apiEndpoints.pedidos.base,
    body: createPedidoPayloadSchema.parse(payload),
    schema: pedidoResponseSchema
  });
}

export async function cancelarPedido(id: string) {
  return patchRequest({
    url: apiEndpoints.pedidos.cancelar(id),
    body: {},
    schema: pedidoResponseSchema
  });
}
