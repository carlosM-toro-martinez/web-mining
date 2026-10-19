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

export const saldoMensualAjusteTotalPayloadSchema = z
  .object({
    totalBsInicial: numberLikeSchema.nonnegative().optional(),
    precioUnit: numberLikeSchema.nonnegative().optional(),
    saldoInicial: numberLikeSchema.nonnegative().optional(),
    totalBs: numberLikeSchema.nonnegative().optional(),
    totalBsProm: numberLikeSchema.nonnegative().optional()
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Debes enviar al menos un campo de ajuste."
  });

export const ajusteProductoMesItemPayloadSchema = z
  .object({
    productoId: numberLikeSchema.int().positive().optional(),
    productoCodigo: z.string().trim().min(1).optional(),
    precioUnit: numberLikeSchema.nonnegative().optional(),
    saldoInicial: numberLikeSchema.nonnegative().optional(),
    ingresoQty: numberLikeSchema.nonnegative().optional(),
    salidaQty: numberLikeSchema.nonnegative().optional(),
    saldoFinal: numberLikeSchema.nonnegative().optional(),
    totalBsInicial: numberLikeSchema.nonnegative().optional(),
    totalBs: numberLikeSchema.nonnegative().optional()
  })
  .refine((value) => Boolean(value.productoId || value.productoCodigo), {
    message: "Debes enviar productoId o productoCodigo."
  })
  .refine(
    (value) =>
      [
        value.precioUnit,
        value.saldoInicial,
        value.ingresoQty,
        value.salidaQty,
        value.saldoFinal,
        value.totalBsInicial,
        value.totalBs
      ].some((field) => field !== undefined),
    { message: "Debes enviar al menos un campo de ajuste." }
  );

export const ajusteProductosMesPayloadSchema = z.object({
  anio: numberLikeSchema.int().min(2000).max(2100),
  mes: numberLikeSchema.int().min(1).max(12),
  productos: z.array(ajusteProductoMesItemPayloadSchema).min(1)
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
  mes: numberLikeSchema.int().min(1).max(12),
  force: z.boolean().optional(),
  soloRegistrarCierre: z.boolean().optional()
});

export const inicializarPeriodoPayloadSchema = cierreMesPayloadSchema;
export const ajustarPreciosSinIvaPayloadSchema = cierreMesPayloadSchema;
export const backfillCppPayloadSchema = cierreMesPayloadSchema;

export const cierreMesCreateResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    cierre: cierreMesItemSchema,
    saldosCreados: numberLikeSchema.int().nonnegative().optional(),
    saldosActualizados: numberLikeSchema.int().nonnegative().optional(),
    productosConMovimientos: numberLikeSchema.int().nonnegative().optional()
  })
});

export const cierreMesDeleteResponseSchema = z
  .object({
    success: z.boolean().optional().default(true),
    message: z.string().optional(),
    data: z.unknown().optional()
  })
  .passthrough();

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

export const saldoMensualAjusteTotalResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    id: z.union([z.string(), numberLikeSchema]),
    productoCodigo: z.string().min(1),
    productoNombre: z.string().optional().nullable(),
    anio: numberLikeSchema.int(),
    mes: numberLikeSchema.int(),
    camposActualizados: z.array(z.string()).optional().default([]),
    mesesCascadeados: numberLikeSchema.int().nonnegative().optional(),
    saldoFinal: numberLikeSchema.optional(),
    saldoInicial: numberLikeSchema.optional(),
    precioUnit: numberLikeSchema.optional(),
    totalBsAnterior: numberLikeSchema.optional(),
    totalBsNuevo: numberLikeSchema.optional(),
    totalBsInicialNuevo: numberLikeSchema.optional().nullable(),
    totalBsPromNuevo: numberLikeSchema.optional().nullable()
  })
});

export const saldoMensualAjusteInicialExcelResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    procesados: numberLikeSchema.int().nonnegative(),
    exitosos: numberLikeSchema.int().nonnegative(),
    fallidos: numberLikeSchema.int().nonnegative(),
    resultados: z
      .array(
        z.object({
          fila: numberLikeSchema.int().positive(),
          codigo: z.string().min(1),
          totalBsInicial: numberLikeSchema.nonnegative().optional(),
          precioUnit: numberLikeSchema.nonnegative().optional(),
          saldoInicial: numberLikeSchema.nonnegative().optional(),
          totalBs: numberLikeSchema.nonnegative().optional(),
          totalBsProm: numberLikeSchema.nonnegative().optional(),
          ok: z.boolean(),
          anterior: z.unknown().optional().nullable(),
          error: z.string().optional()
        })
      )
      .optional()
      .default([])
  })
});

export const ajusteProductosMesResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(
    z.object({
      productoId: numberLikeSchema.int().positive().optional(),
      productoCodigo: z.string().optional(),
      ok: z.boolean(),
      accion: z.string().optional(),
      error: z.string().optional(),
      saldoMensual: z.record(z.string(), z.unknown()).optional()
    })
  )
});

export const ajustarPreciosSinIvaResponseSchema = z
  .object({
    success: z.boolean().optional().default(true),
    message: z.string().optional(),
    data: z.unknown().optional()
  })
  .passthrough();

export const backfillCppResponseSchema = z
  .object({
    success: z.boolean().optional().default(true),
    message: z.string().optional(),
    data: z
      .object({
        anio: numberLikeSchema.int().optional(),
        mes: numberLikeSchema.int().optional(),
        productosProcessados: numberLikeSchema.int().nonnegative().optional(),
        productosProcesados: numberLikeSchema.int().nonnegative().optional(),
        movimientosActualizados: numberLikeSchema.int().nonnegative().optional(),
        saldosActualizados: numberLikeSchema.int().nonnegative().optional(),
        detalle: z.array(z.record(z.string(), z.unknown())).optional().default([]),
        errores: z.array(z.unknown()).optional().default([]),
        advertencia: z.string().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

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
export type SaldoMensualAjusteTotalPayload = z.infer<typeof saldoMensualAjusteTotalPayloadSchema>;
export type AjusteProductosMesPayload = z.infer<typeof ajusteProductosMesPayloadSchema>;
export type AjusteProductosMesResponse = z.infer<typeof ajusteProductosMesResponseSchema>;
export type AjustarPreciosSinIvaPayload = z.infer<typeof ajustarPreciosSinIvaPayloadSchema>;
export type AjustarPreciosSinIvaResponse = z.infer<typeof ajustarPreciosSinIvaResponseSchema>;
export type BackfillCppPayload = z.infer<typeof backfillCppPayloadSchema>;
export type BackfillCppResponse = z.infer<typeof backfillCppResponseSchema>;
export type SaldoMensualAjusteInicialExcelResponse = z.infer<
  typeof saldoMensualAjusteInicialExcelResponseSchema
>;
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

// ─── Diagnóstico de redondeo ingresosBs ──────────────────────────────────────

export const diagnosticoRedondeoResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    anio:        z.number(),
    mes:         z.number(),
    flatRnd:     z.number(),
    perGrupoRnd: z.number(),
    discrepancia: z.number(),
    ok:          z.boolean(),
    grupos: z.array(z.object({
      grupoId:     z.number(),
      grupoCodigo: z.string(),
      grupoNombre: z.string(),
      rawSum:      z.number(),
      rounded:     z.number(),
      subCentavo:  z.number(),
      productoAjuste: z.object({
        saldoMensualId:   z.string(),
        productoId:       z.number(),
        codigo:           z.string(),
        nombre:           z.string(),
        ingresosBsActual: z.number(),
        ingresosBsNuevo:  z.number(),
        epsilon:          z.number(),
      }).nullable(),
    }))
  })
});

export const fixRedondeoPayloadSchema = z.object({
  anio:            z.number().int().min(2000).max(2100),
  mes:             z.number().int().min(1).max(12),
  saldoMensualId:  z.string().min(1),
  ingresosBsNuevo: z.number(),
});

export const fixRedondeoResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    saldoMensualId: z.string(),
    anterior:       z.number(),
    nuevo:          z.number(),
    diferencia:     z.number(),
  })
});

export type DiagnosticoRedondeoResponse = z.infer<typeof diagnosticoRedondeoResponseSchema>;
export type FixRedondeoPayload = z.infer<typeof fixRedondeoPayloadSchema>;

export type CierreMesItem = z.infer<typeof cierreMesItemSchema>;
export type CierreMesPayload = z.infer<typeof cierreMesPayloadSchema>;
export type InicializarPeriodoPayload = z.infer<typeof inicializarPeriodoPayloadSchema>;
export type SaldoMensualPreviewResponse = z.infer<typeof saldoMensualPreviewResponseSchema>;

// ─── Limpiar mes ─────────────────────────────────────────────────────────────

// ─── Sincronizar Stock desde SaldoMensual ────────────────────────────────────

export const syncStockFromSaldoMensualResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    actualizados: z.number().int(),
    total: z.number().int(),
    omitidos: z.number().int(),
    errores: z.array(z.object({
      productoId: z.number().int(),
      error: z.string()
    })),
    detalle: z.array(z.object({
      productoId: z.number().int(),
      codigo: z.string(),
      cantidad: z.string(),
      precioUnit: z.string(),
      precioProm: z.string()
    }))
  })
});

export type SyncStockFromSaldoMensualResponse = z.infer<typeof syncStockFromSaldoMensualResponseSchema>;
