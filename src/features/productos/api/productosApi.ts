import { deleteRequest, getRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  createProductoPayloadSchema,
  productoDeleteResponseSchema,
  productoResponseSchema,
  productosListResponseSchema,
  productosQueryParamsSchema,
  updateProductoPayloadSchema,
  type CreateProductoPayload,
  type ProductosQueryParams,
  type UpdateProductoPayload
} from "@/features/productos/model/producto.schema";

function cleanParams(params: ProductosQueryParams) {
  const parsed = productosQueryParamsSchema.parse(params);
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined && value !== "")
  );
}

export async function getProductos(params: ProductosQueryParams) {
  return getRequest({
    url: apiEndpoints.productos.base,
    config: {
      params: cleanParams(params)
    },
    schema: productosListResponseSchema
  });
}

export async function createProducto(payload: CreateProductoPayload) {
  const body = createProductoPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.productos.base,
    body,
    schema: productoResponseSchema
  });
}

export async function updateProducto(id: number, payload: UpdateProductoPayload) {
  const body = updateProductoPayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.productos.byId(id),
    body,
    schema: productoResponseSchema
  });
}

export async function deleteProducto(id: number) {
  return deleteRequest({
    url: apiEndpoints.productos.byId(id),
    schema: productoDeleteResponseSchema
  });
}
