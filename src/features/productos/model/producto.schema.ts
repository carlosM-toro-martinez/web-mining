import { z } from "zod";

const decimalLikeSchema = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") return "0";
    return String(value);
  });

const productoCategoriaSchema = z.object({
  id: z.coerce.number().int().positive(),
  nombre: z.string().optional().nullable().transform((value) => value?.trim() || "(Sin nombre)"),
  codigo: z.string().optional().nullable(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  parent: z
    .object({
      id: z.number().int().positive(),
      codigo: z.string().optional().nullable(),
      nombre: z.string().optional().nullable().transform((value) => value?.trim() || "(Sin nombre)")
      ,
      parentId: z.coerce.number().int().positive().nullable().optional()
    })
    .nullable()
    .optional()
});

const productoStockSchema = z
  .object({
    cantidad: decimalLikeSchema.optional(),
    cantidadReservada: decimalLikeSchema.optional(),
    cantidadDisponible: decimalLikeSchema.optional(),
    precioUnit: decimalLikeSchema.optional(),
    precioProm: decimalLikeSchema.optional()
  })
  .transform((value) => ({
    cantidad: value.cantidad ?? "0",
    cantidadReservada: value.cantidadReservada ?? "0",
    cantidadDisponible: value.cantidadDisponible ?? "0",
    precioUnit: value.precioUnit ?? "0",
    precioProm: value.precioProm ?? "0"
  }));

const productoCuentaSchema = z.object({
  id: z.coerce.number().int().positive(),
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
  id: z.coerce.number().int().positive(),
  codigo: z.string().optional().nullable().transform((value) => value?.trim() || "-"),
  nombre: z.string().optional().nullable().transform((value) => value?.trim() || "(Sin nombre)"),
  unidad: z.string().optional().nullable().transform((value) => value?.trim() || "UND"),
  categoriaId: z.coerce.number().int().positive().optional().default(1),
  cuentaId: z.coerce.number().int().positive().nullable().optional(),
  esEpp: z.coerce.boolean().optional().default(false),
  categoria: productoCategoriaSchema.nullable().optional(),
  cuenta: productoCuentaSchema.nullable().optional(),
  cuentaContable: z.unknown().nullable().optional(),
  stock: productoStockSchema
    .nullable()
    .optional()
    .transform((value) =>
      value ?? {
        cantidad: "0",
        cantidadReservada: "0",
        cantidadDisponible: "0",
        precioUnit: "0",
        precioProm: "0"
      }
    )
});

const productosMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive()
});

const productosListBaseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(productoSchema),
  meta: productosMetaSchema.optional()
});

const productosListAltSchema = z
  .object({
    success: z.boolean().optional(),
    productos: z.array(productoSchema),
    meta: productosMetaSchema.optional()
  })
  .transform((value) => ({
    success: value.success ?? true,
    data: value.productos,
    meta: value.meta
  }));

const productosListWrappedSchema = z
  .object({
    success: z.boolean().optional(),
    data: z.object({
      productos: z.array(productoSchema).optional(),
      rows: z.array(productoSchema).optional()
    }),
    meta: productosMetaSchema.optional()
  })
  .transform((value) => ({
    success: value.success ?? true,
    data: value.data.productos ?? value.data.rows ?? [],
    meta: value.meta
  }));

const productosListNestedDataSchema = z
  .object({
    data: z.object({
      success: z.boolean().optional(),
      data: z.array(productoSchema),
      meta: productosMetaSchema.optional()
    })
  })
  .transform((value) => ({
    success: value.data.success ?? true,
    data: value.data.data,
    meta: value.data.meta
  }));

export const productosListResponseSchema = z
  .union([
    productosListBaseSchema,
    productosListAltSchema,
    productosListWrappedSchema,
    productosListNestedDataSchema
  ])
  .transform((value) => {
    const total = value.data.length;
    const page = value.meta?.page ?? 1;
    const limit = value.meta?.limit ?? Math.max(1, total || 10);
    const totalPages = value.meta?.totalPages ?? Math.max(1, Math.ceil(total / limit));

    return {
      success: value.success ?? true,
      data: value.data,
      meta: {
        page,
        limit,
        total: value.meta?.total ?? total,
        totalPages
      }
    };
  });

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
