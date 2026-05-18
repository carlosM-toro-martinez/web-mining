import { z } from "zod";

const decimalLikeSchema = z.union([z.string(), z.number()]).transform((value) => String(value));

const productoCategoriaSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().optional().nullable().transform((value) => value?.trim() || "(Sin nombre)"),
  codigo: z.string().optional().nullable(),
  parent: z
    .object({
      id: z.number().int().positive(),
      nombre: z.string().optional().nullable().transform((value) => value?.trim() || "(Sin nombre)")
    })
    .nullable()
    .optional()
});

const productoStockSchema = z.object({
  cantidad: decimalLikeSchema,
  cantidadReservada: decimalLikeSchema.optional(),
  cantidadDisponible: decimalLikeSchema.optional(),
  precioUnit: decimalLikeSchema,
  precioProm: decimalLikeSchema
});

const productoCuentaSchema = z.object({
  id: z.number().int().positive(),
  codigoCompleto: z.string().min(1),
  centroCosto: z
    .object({
      id: z.number().int().positive(),
      codigo: z.string().min(1),
      nombre: z.string().min(1)
    })
    .optional(),
  funcionGasto: z
    .object({
      id: z.number().int().positive(),
      codigo: z.string().min(1),
      nombre: z.string().min(1)
    })
    .optional(),
  sector: z
    .object({
      id: z.number().int().positive(),
      codigo: z.string().min(1),
      nombre: z.string().min(1)
    })
    .optional()
    .nullable()
    .optional()
});

export const productoSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  unidad: z.string().min(1),
  categoriaId: z.number().int().positive(),
  cuentaId: z.number().int().positive().nullable().optional(),
  esEpp: z.boolean().default(false),
  categoria: productoCategoriaSchema.nullable().optional(),
  cuenta: productoCuentaSchema.nullable().optional(),
  stock: productoStockSchema
});

const productosMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive()
});

export const productosListResponseSchema = z
  .object({
    success: z.boolean().optional().default(true),
    data: z.array(productoSchema),
    meta: productosMetaSchema
  })
  .or(
    z.object({
      success: z.boolean().optional(),
      productos: z.array(productoSchema),
      meta: productosMetaSchema
    }).transform((value) => ({
      success: value.success ?? true,
      data: value.productos,
      meta: value.meta
    }))
  )
  .or(
    z.object({
      success: z.boolean().optional(),
      data: z.object({
        productos: z.array(productoSchema).optional(),
        rows: z.array(productoSchema).optional()
      }),
      meta: productosMetaSchema
    }).transform((value) => ({
      success: value.success ?? true,
      data: value.data.productos ?? value.data.rows ?? [],
      meta: value.meta
    }))
  );

export const productoResponseSchema = z
  .object({
    success: z.boolean().optional().default(true),
    data: productoSchema
  })
  .or(
    productoSchema.transform((value) => ({
      success: true,
      data: value
    }))
  );

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
  centroCostoId: z.number().int().positive("Debes elegir un centro de costo."),
  funcionGastoId: z.number().int().positive("Debes elegir una funcion de gasto."),
  cuentaId: z.number().int().positive().nullable().optional(),
  esEpp: z.boolean().optional().default(false)
});

export const updateProductoPayloadSchema = z.object({
  codigo: z.string().trim().min(1).optional(),
  nombre: z.string().trim().min(1).optional(),
  unidad: z.string().trim().min(1).optional(),
  grupoId: z.number().int().positive().optional(),
  subgrupoId: z.number().int().positive().optional(),
  centroCostoId: z.number().int().positive().optional(),
  funcionGastoId: z.number().int().positive().optional(),
  cuentaId: z.number().int().positive().nullable().optional(),
  esEpp: z.boolean().optional()
});

export const productosQueryParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
  search: z.string().trim().optional(),
  grupoId: z.number().int().positive().optional(),
  subgrupoId: z.number().int().positive().optional(),
  cuentaId: z.number().int().positive().optional(),
  sinCuenta: z.boolean().optional()
});

export type Producto = z.infer<typeof productoSchema>;
export type ProductosListResponse = z.infer<typeof productosListResponseSchema>;
export type ProductoResponse = z.infer<typeof productoResponseSchema>;
export type ProductoDeleteResponse = z.infer<typeof productoDeleteResponseSchema>;
export type CreateProductoPayload = z.infer<typeof createProductoPayloadSchema>;
export type UpdateProductoPayload = z.infer<typeof updateProductoPayloadSchema>;
export type ProductosQueryParams = z.infer<typeof productosQueryParamsSchema>;
