import { getRequest, patchRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  actualizarCompraItemPrecioPayloadSchema,
  actualizarCompraItemPrecioResponseSchema,
  anulacionesHistorialResponseSchema,
  anularCompraPayloadSchema,
  anularCompraResponseSchema,
  compraResponseSchema,
  comprasListResponseSchema,
  comprasQueryParamsSchema,
  comprasResumenResponseSchema,
  createCompraPayloadSchema,
  recibirCompraPayloadSchema,
  recibirCompraResponseSchema,
  registrarDocumentoPayloadSchema,
  registrarDocumentoResponseSchema,
  type ActualizarCompraItemPrecioPayload,
  type AnularCompraPayload,
  type ComprasQueryParams,
  type CreateCompraPayload,
  type RecibirCompraPayload,
  type RegistrarDocumentoPayload
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
  return postRequest({
    url: apiEndpoints.compras.recibir(id),
    body,
    schema: recibirCompraResponseSchema
  });
}

export async function anularCompra(id: string, payload: AnularCompraPayload) {
  const body = anularCompraPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.compras.anular(id),
    body,
    schema: anularCompraResponseSchema
  });
}

export async function actualizarCompraItemPrecio(
  compraId: string,
  itemId: string,
  payload: ActualizarCompraItemPrecioPayload
) {
  const body = actualizarCompraItemPrecioPayloadSchema.parse(payload);
  return patchRequest({
    url: apiEndpoints.compras.itemPrecio(compraId, itemId),
    body,
    schema: actualizarCompraItemPrecioResponseSchema
  });
}

export async function getAnulacionesHistorial() {
  return getRequest({
    url: apiEndpoints.compras.anulacionesHistorial,
    schema: anulacionesHistorialResponseSchema
  });
}

export async function getComprasResumen(params: ComprasQueryParams) {
  // El resumen cuenta cada estado y cada documento: no lleva esos filtros ni paginación
  const { estado: _estado, documento: _documento, pendientes: _pendientes, page: _page, limit: _limit, ...filtros } = params;
  return getRequest({
    url: apiEndpoints.compras.resumen,
    config: { params: cleanParams(filtros as ComprasQueryParams) },
    schema: comprasResumenResponseSchema
  });
}

export async function registrarDocumentoCompra(id: string, payload: RegistrarDocumentoPayload) {
  const body = registrarDocumentoPayloadSchema.parse(payload);
  return patchRequest({
    url: apiEndpoints.compras.documento(id),
    body,
    schema: registrarDocumentoResponseSchema
  });
}
