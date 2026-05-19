import { deleteRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import { httpClient } from "@/shared/api/core/httpClient";
import {
  createProductoPayloadSchema,
  productoDeleteResponseSchema,
  productoSchema,
  productoResponseSchema,
  productosQueryParamsSchema,
  updateProductoPayloadSchema,
  type CreateProductoPayload,
  type ProductosListResponse,
  type ProductosQueryParams,
  type UpdateProductoPayload
} from "@/features/productos/model/producto.schema";

function cleanParams(params: ProductosQueryParams) {
  const parsed = productosQueryParamsSchema.parse(params);
  const cleaned = Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined && value !== "")
  );
  if (typeof parsed.search === "string" && parsed.search.trim().length > 0) {
    return {
      ...cleaned,
      q: parsed.search.trim()
    };
  }
  return cleaned;
}

export async function getProductos(params: ProductosQueryParams) {
  const response = await httpClient.get(apiEndpoints.productos.base, {
    params: cleanParams(params)
  });

  const root = response.data as
    | {
        success?: boolean;
        data?: unknown;
        meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
      }
    | undefined;

  const payload = root?.data as
    | unknown[]
    | {
        data?: unknown[];
        productos?: unknown[];
        rows?: unknown[];
        meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
      }
    | undefined;

  const rawRows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.productos)
        ? payload.productos
        : Array.isArray(payload?.rows)
          ? payload.rows
          : [];

  const parsedRows = rawRows
    .map((item) => {
      const parsed = productoSchema.safeParse(item);
      if (parsed.success) return parsed.data;

      const row = (item ?? {}) as Record<string, unknown>;
      const stock = (row.stock ?? {}) as Record<string, unknown>;
      const categoria = (row.categoria ?? {}) as Record<string, unknown>;
      const categoriaParent =
        categoria && typeof categoria === "object"
          ? ((categoria.parent ?? {}) as Record<string, unknown>)
          : {};

      const toNum = (value: unknown, fallback = 0) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
      };

      return {
        id: toNum(row.id),
        codigo: String(row.codigo ?? "-"),
        nombre: String(row.nombre ?? "(Sin nombre)"),
        unidad: String(row.unidad ?? "UND"),
        categoriaId: toNum(row.categoriaId, 1),
        cuentaId: row.cuentaId === null || row.cuentaId === undefined ? null : toNum(row.cuentaId),
        esEpp: Boolean(row.esEpp),
        categoria:
          categoria && Object.keys(categoria).length > 0
            ? {
                id: toNum(categoria.id, 1),
                nombre: String(categoria.nombre ?? "(Sin nombre)"),
                codigo: categoria.codigo ? String(categoria.codigo) : undefined,
                parent:
                  categoriaParent && Object.keys(categoriaParent).length > 0
                    ? {
                        id: toNum(categoriaParent.id, 1),
                        nombre: String(categoriaParent.nombre ?? "(Sin nombre)")
                      }
                    : null
              }
            : null,
        cuenta: null,
        stock: {
          cantidad: String(stock.cantidad ?? "0"),
          cantidadReservada: String(stock.cantidadReservada ?? "0"),
          cantidadDisponible: String(stock.cantidadDisponible ?? "0"),
          precioUnit: String(stock.precioUnit ?? "0"),
          precioProm: String(stock.precioProm ?? "0")
        }
      };
    })
    .filter((row) => row.id > 0);

  const page = (payload as { meta?: { page?: number } } | undefined)?.meta?.page ?? root?.meta?.page ?? 1;
  const limit =
    (payload as { meta?: { limit?: number } } | undefined)?.meta?.limit ??
    root?.meta?.limit ??
    Math.max(1, parsedRows.length || 10);
  const total =
    (payload as { meta?: { total?: number } } | undefined)?.meta?.total ??
    root?.meta?.total ??
    parsedRows.length;
  const totalPages =
    (payload as { meta?: { totalPages?: number } } | undefined)?.meta?.totalPages ??
    root?.meta?.totalPages ??
    Math.max(1, Math.ceil(total / limit));

  const normalized: ProductosListResponse = {
    success: root?.success ?? true,
    data: parsedRows,
    meta: {
      page,
      limit,
      total,
      totalPages
    }
  };

  return normalized;
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
