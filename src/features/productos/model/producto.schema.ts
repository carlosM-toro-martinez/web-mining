import { z } from "zod";

const productoCategoriaSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1),
  parent: z
    .object({
      id: z.number().int().positive(),
      nombre: z.string().min(1)
    })
    .nullable()
    .optional()
});

const productoStockSchema = z.object({
  cantidad: z.string(),
  precioUnit: z.string(),
  precioProm: z.string()
});

export const productoSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  unidad: z.string().min(1),
  categoriaId: z.number().int().positive(),
  esEpp: z.boolean().default(false),
  categoria: productoCategoriaSchema,
  stock: productoStockSchema
});

export const productosListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(productoSchema),
  meta: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().positive()
  })
});

export const productoResponseSchema = z.object({
  success: z.boolean(),
  data: productoSchema
});

export const productoDeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional()
});

export const createProductoPayloadSchema = z.object({
  codigo: z.string().trim().min(1, "El codigo es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  unidad: z.string().trim().min(1, "La unidad es obligatoria."),
  grupoId: z.number().int().positive("Debes elegir un grupo."),
  subgrupoId: z.number().int().positive("Debes elegir un subgrupo."),
  esEpp: z.boolean().optional().default(false)
});

export const updateProductoPayloadSchema = z.object({
  codigo: z.string().trim().min(1).optional(),
  nombre: z.string().trim().min(1).optional(),
  unidad: z.string().trim().min(1).optional(),
  grupoId: z.number().int().positive().optional(),
  subgrupoId: z.number().int().positive().optional(),
  esEpp: z.boolean().optional()
});

export const productosQueryParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
  search: z.string().trim().optional(),
  grupoId: z.number().int().positive().optional(),
  subgrupoId: z.number().int().positive().optional()
});

export type Producto = z.infer<typeof productoSchema>;
export type ProductosListResponse = z.infer<typeof productosListResponseSchema>;
export type ProductoResponse = z.infer<typeof productoResponseSchema>;
export type ProductoDeleteResponse = z.infer<typeof productoDeleteResponseSchema>;
export type CreateProductoPayload = z.infer<typeof createProductoPayloadSchema>;
export type UpdateProductoPayload = z.infer<typeof updateProductoPayloadSchema>;
export type ProductosQueryParams = z.infer<typeof productosQueryParamsSchema>;
