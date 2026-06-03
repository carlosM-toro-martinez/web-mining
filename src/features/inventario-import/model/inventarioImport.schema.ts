import { z } from "zod";

const numberLikeSchema = z.coerce.number();

export const stockInicialItemSchema = z.object({
  productoCodigo: z.string().min(1),
  cantidad: numberLikeSchema.nonnegative(),
  precioUnit: numberLikeSchema.nonnegative()
});

export const saldoMensualItemSchema = z.object({
  productoCodigo: z.string().min(1),
  saldoInicial: numberLikeSchema.nonnegative(),
  ingresoQty: numberLikeSchema.nonnegative(),
  salidaQty: numberLikeSchema.nonnegative(),
  saldoFinal: numberLikeSchema.nonnegative(),
  precioUnit: numberLikeSchema.nonnegative()
});

export const stockInicialPayloadSchema = z.object({
  items: z.array(stockInicialItemSchema).min(1)
});

export const saldoMensualPayloadSchema = z.object({
  anio: numberLikeSchema.int().min(2000).max(2100),
  mes: numberLikeSchema.int().min(1).max(12),
  items: z.array(saldoMensualItemSchema).min(1)
});

export const reiniciarStockPayloadSchema = z.object({
  confirmacion: z.literal("REINICIAR")
});

export const sincronizarStockPayloadSchema = z
  .object({
    anio: numberLikeSchema.int().min(2000).max(2100).optional(),
    mes: numberLikeSchema.int().min(1).max(12).optional()
  })
  .optional();

export const recalcularStockPayloadSchema = z.object({
  productoId: numberLikeSchema.int().positive(),
  stockInicial: numberLikeSchema.nonnegative(),
  eliminarValeIds: z.array(z.string().min(1)).optional()
});

export const saldoMensualItemUpsertPayloadSchema = z
  .object({
    productoId: numberLikeSchema.int().positive().optional(),
    productoCodigo: z.string().min(1).optional(),
    anio: numberLikeSchema.int().min(2000).max(2100),
    mes: numberLikeSchema.int().min(1).max(12),
    saldoInicial: numberLikeSchema.nonnegative(),
    ingresoQty: numberLikeSchema.nonnegative(),
    salidaQty: numberLikeSchema.nonnegative(),
    saldoFinal: numberLikeSchema.nonnegative(),
    precioUnit: numberLikeSchema.nonnegative()
  })
  .refine((value) => Boolean(value.productoId || value.productoCodigo), {
    message: "Debes enviar productoId o productoCodigo."
  });

export const saldoMensualItemPatchPayloadSchema = z
  .object({
    saldoInicial: numberLikeSchema.nonnegative().optional(),
    ingresoQty: numberLikeSchema.nonnegative().optional(),
    salidaQty: numberLikeSchema.nonnegative().optional(),
    saldoFinal: numberLikeSchema.nonnegative().optional(),
    precioUnit: numberLikeSchema.nonnegative().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debes enviar al menos un campo para actualizar."
  });

export const saldoMensualQuerySchema = z.object({
  anio: numberLikeSchema.int().min(2000).max(2100),
  mes: numberLikeSchema.int().min(1).max(12)
});

export const cierreMesItemSchema = z.object({
  id: numberLikeSchema.int().positive(),
  anio: numberLikeSchema.int().min(2000).max(2100),
  mes: numberLikeSchema.int().min(1).max(12),
  usuarioId: numberLikeSchema.int().positive().optional(),
  creadoAt: z.string().optional().nullable()
});

export const cierreMesListResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(cierreMesItemSchema)
});

export const cierreMesPayloadSchema = z.object({
  anio: numberLikeSchema.int().min(2000).max(2100),
  mes: numberLikeSchema.int().min(1).max(12)
});

export const inicializarPeriodoPayloadSchema = cierreMesPayloadSchema;

export const cierreMesCreateResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    cierre: cierreMesItemSchema,
    saldosCreados: numberLikeSchema.int().nonnegative().optional(),
    saldosActualizados: numberLikeSchema.int().nonnegative().optional(),
    productosConMovimientos: numberLikeSchema.int().nonnegative().optional()
  })
});

export const importResultSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.record(z.string(), z.unknown())
});

export const saldoMensualItemResponseSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]),
  productoId: numberLikeSchema.int().positive().optional(),
  productoCodigo: z.string().min(1),
  productoNombre: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  grupo: z.string().optional().nullable(),
  subGrupo: z.string().optional().nullable(),
  anio: numberLikeSchema.int(),
  mes: numberLikeSchema.int(),
  saldoInicial: numberLikeSchema,
  ingresoQty: numberLikeSchema,
  salidaQty: numberLikeSchema,
  saldoFinal: numberLikeSchema,
  precioUnit: numberLikeSchema,
  totalBs: numberLikeSchema,
  accion: z.enum(["creado", "actualizado"]).optional()
});

export const saldoMensualListResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(saldoMensualItemResponseSchema)
});

export const saldoMensualSingleResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: saldoMensualItemResponseSchema
});

export const saldoMensualDeleteResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    id: z.union([z.string(), numberLikeSchema])
  })
});

export const recalcularStockResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    productoId: numberLikeSchema.int().positive(),
    stockInicial: numberLikeSchema.nonnegative(),
    stockFinal: numberLikeSchema.nonnegative(),
    movimientosRecalculados: numberLikeSchema.int().nonnegative(),
    valesEliminados: numberLikeSchema.int().nonnegative()
  })
});

export type StockInicialPayload = z.infer<typeof stockInicialPayloadSchema>;
export type SaldoMensualPayload = z.infer<typeof saldoMensualPayloadSchema>;
export type SaldoMensualQuery = z.infer<typeof saldoMensualQuerySchema>;
export type ReiniciarStockPayload = z.infer<typeof reiniciarStockPayloadSchema>;
export type SincronizarStockPayload = z.infer<typeof sincronizarStockPayloadSchema>;
export type RecalcularStockPayload = z.infer<typeof recalcularStockPayloadSchema>;
export type SaldoMensualItemUpsertPayload = z.infer<typeof saldoMensualItemUpsertPayloadSchema>;
export type SaldoMensualItemPatchPayload = z.infer<typeof saldoMensualItemPatchPayloadSchema>;
export const saldoMensualPreviewItemSchema = z.object({
  productoCodigo: z.string(),
  productoNombre: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  grupo: z.string().optional().nullable(),
  subGrupo: z.string().optional().nullable(),
  saldoInicial: numberLikeSchema,
  ingresoQty: numberLikeSchema,
  salidaQty: numberLikeSchema,
  saldoFinal: numberLikeSchema,
  precioUnit: numberLikeSchema,
  totalBs: numberLikeSchema
});

export const saldoMensualPreviewResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    anio: numberLikeSchema.int(),
    mes: numberLikeSchema.int(),
    esCerrado: z.boolean(),
    resumen: z.object({
      totalProductos: numberLikeSchema.int(),
      productosConMovimiento: numberLikeSchema.int(),
      totalUnidades: numberLikeSchema,
      totalBs: numberLikeSchema
    }),
    items: z.array(saldoMensualPreviewItemSchema)
  })
});

export type CierreMesItem = z.infer<typeof cierreMesItemSchema>;
export type CierreMesPayload = z.infer<typeof cierreMesPayloadSchema>;
export type InicializarPeriodoPayload = z.infer<typeof inicializarPeriodoPayloadSchema>;
export type SaldoMensualPreviewResponse = z.infer<typeof saldoMensualPreviewResponseSchema>;
