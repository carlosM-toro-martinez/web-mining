import { deleteRequest, getRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  categoriaDeleteResponseSchema,
  categoriaResponseSchema,
  categoriasTreeResponseSchema,
  createCategoriaPayloadSchema,
  updateCategoriaPayloadSchema,
  type CreateCategoriaPayload,
  type UpdateCategoriaPayload
} from "@/features/categorias-inventario/model/categoria.schema";

export async function getCategoriasTree() {
  return getRequest({
    url: apiEndpoints.categoriasInventario.tree,
    schema: categoriasTreeResponseSchema
  });
}

export async function createCategoria(payload: CreateCategoriaPayload) {
  const body = createCategoriaPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.categoriasInventario.base,
    body,
    schema: categoriaResponseSchema
  });
}

export async function updateCategoria(id: number, payload: UpdateCategoriaPayload) {
  const body = updateCategoriaPayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.categoriasInventario.byId(id),
    body,
    schema: categoriaResponseSchema
  });
}

export async function deleteCategoria(id: number) {
  return deleteRequest({
    url: apiEndpoints.categoriasInventario.byId(id),
    schema: categoriaDeleteResponseSchema
  });
}
