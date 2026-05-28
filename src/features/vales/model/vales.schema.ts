import { z } from "zod";

const decimalSchema = z.union([z.number(), z.string()]).nullable().optional();
const numberLikeSchema = z.coerce.number();

export const valeEstadoSchema = z.string().min(1);

export const valeUsuarioSchema = z.object({
  id: numberLikeSchema.int().positive(),
  nombre: z.string().min(1).optional().nullable(),
  email: z.string().email().optional().nullable()
});

const valeProductoStockSchema = z
  .object({
    cantidad: decimalSchema,
    cantidadReservada: decimalSchema,
    cantidadDisponible: decimalSchema,
    precioUnit: decimalSchema
  })
  .optional();

const valeProductoSchema = z.object({
  id: numberLikeSchema.int().positive(),
  nombre: z.string().min(1).optional().nullable(),
  stock: valeProductoStockSchema.optional()
});

export const valeItemSchema = z.object({
  id: z.union([z.string().min(1), numberLikeSchema]).transform((value) => String(value)),
  productoId: numberLikeSchema.int().positive(),
  cantidadSolicitada: numberLikeSchema.nonnegative(),
  cantidadEntregada: numberLikeSchema.nonnegative().default(0),
  producto: valeProductoSchema.optional().nullable()
});

export const valeSchema = z.object({
  id: z.union([z.string().min(1), numberLikeSchema]).transform((value) => String(value)),
  solicitanteId: numberLikeSchema.int().positive().optional().nullable(),
  estado: valeEstadoSchema,
  fechaOperacion: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  aprobadoAt: z.string().optional().nullable(),
  entregadoAt: z.string().optional().nullable(),
  superintendenteId: numberLikeSchema.int().positive().optional().nullable(),
  solicitante: valeUsuarioSchema.optional().nullable(),
  superintendente: valeUsuarioSchema.optional().nullable(),
  almacenero: valeUsuarioSchema.optional().nullable(),
  items: z.array(valeItemSchema).optional().default([])
});

export const valeMovimientoSchema = z.object({
  id: z.union([z.string().min(1), numberLikeSchema]).transform((value) => String(value)),
  operationId: z.union([z.string().min(1), numberLikeSchema]).transform((value) => String(value)),
  productoId: numberLikeSchema.int().positive(),
  tipo: z.literal("SALIDA"),
  cantidad: decimalSchema,
  precioUnit: decimalSchema,
  entradaBs: decimalSchema,
  salidaBs: decimalSchema,
  saldoBs: decimalSchema,
  stockAntes: decimalSchema,
  stockDespues: decimalSchema,
  usuarioId: numberLikeSchema.int().positive(),
  usuarioRecibidoId: numberLikeSchema.int().positive().optional().nullable(),
  cuentaId: numberLikeSchema.int().positive(),
  referencia: z.string().min(1),
  referenciaId: z.union([z.string().min(1), numberLikeSchema]).transform((value) => String(value)),
  createdAt: z.string().optional().nullable()
});

const valeDataSchema = z
  .union([
    valeSchema,
    z.object({
      vale: valeSchema
    })
  ])
  .transform((value) => ("vale" in value ? value.vale : value));

export const valeResponseSchema = z
  .object({
    success: z.boolean().optional().default(true),
    data: valeDataSchema
  })
  .or(
    valeSchema.transform((value) => ({
      success: true,
      data: value
    }))
  );

const listMetaSchema = z.object({
  page: numberLikeSchema.int().positive(),
  limit: numberLikeSchema.int().positive(),
  total: numberLikeSchema.int().nonnegative(),
  totalPages: numberLikeSchema.int().positive()
});

export const valesListResponseSchema = z
  .object({
    success: z.boolean().optional().default(true),
    data: z
      .union([
        z.array(valeSchema),
        z.object({
          vales: z.array(valeSchema).optional(),
          rows: z.array(valeSchema).optional()
        })
      ])
      .transform((value) => {
        if (Array.isArray(value)) return value;
        return value.vales ?? value.rows ?? [];
      }),
    meta: listMetaSchema.optional()
  })
  .or(
    z.object({
      vales: z.array(valeSchema),
      meta: listMetaSchema.optional()
    }).transform((value) => ({
      success: true,
      data: value.vales,
      meta: value.meta
    }))
  );

export const entregarValeResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z
    .union([
      z.object({
        vale: valeSchema,
        movimientos: z.array(valeMovimientoSchema).optional().default([])
      }),
      valeSchema
    ])
    .transform((value) => {
      if ("vale" in value) return value;
      return {
        vale: value,
        movimientos: []
      };
    })
});

export const createValePayloadSchema = z.object({
  solicitanteId: numberLikeSchema.int().positive("Solicitante invalido.").optional(),
  fechaOperacion: z.string().datetime().optional(),
  items: z
    .array(
      z.object({
        productoId: z.number().int().positive("Debes elegir un producto."),
        cantidadSolicitada: z.number().positive("La cantidad solicitada debe ser mayor a cero.")
      })
    )
    .min(1, "Debes agregar al menos un item.")
});

export const aprobarValePayloadSchema = z.object({
  superintendenteId: numberLikeSchema.int().positive("Superintendente invalido.")
});

export const entregarValePayloadSchema = z.object({
  cantidadesEntregadas: z.record(z.string(), numberLikeSchema.min(0)),
  cuentaIds: z.record(z.string(), numberLikeSchema.int().positive()).optional()
});

export const anularValePayloadSchema = z.object({
  motivo: z.string().trim().min(5, "El motivo debe tener al menos 5 caracteres.")
});

export const valesListParamsSchema = z.object({
  estado: z.string().trim().optional(),
  solicitanteId: numberLikeSchema.int().positive().optional(),
  page: numberLikeSchema.int().positive().optional(),
  limit: numberLikeSchema.int().positive().optional()
});

export const historialSolicitanteResponseSchema = valesListResponseSchema;

export const resumenSolicitantesResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(
    z.object({
      usuario: z.object({
        id: numberLikeSchema.int().positive(),
        nombre: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        role: z.string().optional().nullable()
      }),
      totalVales: numberLikeSchema.int().nonnegative(),
      ultimaFecha: z.string().optional().nullable()
    })
  )
});

export const productosPorUsuarioResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    usuario: z.object({
      id: numberLikeSchema.int().positive(),
      nombre: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      role: z.string().optional().nullable()
    }),
    productos: z.array(
      z.object({
        productoId: numberLikeSchema.int().positive(),
        nombre: z.string().optional().nullable(),
        codigo: z.string().optional().nullable(),
        unidad: z.string().optional().nullable(),
        vecessolicitado: numberLikeSchema.int().nonnegative(),
        cantidadTotal: numberLikeSchema.nonnegative(),
        ultimaFecha: z.string().optional().nullable(),
        ultimoValeId: z.union([z.string(), numberLikeSchema]).optional().nullable().transform((v) => (v == null ? null : String(v))),
        ultimoEstado: z.string().optional().nullable()
      })
    )
  })
});

export const anularValeResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    vale: valeSchema,
    anulacion: z.object({
      id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
      motivo: z.string(),
      createdAt: z.string().optional().nullable(),
      usuario: valeUsuarioSchema.optional().nullable()
    }),
    contraAsientos: numberLikeSchema.int().nonnegative().optional().default(0)
  })
});

export const anulacionesListResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(
    z.object({
      id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
      motivo: z.string(),
      createdAt: z.string().optional().nullable(),
      usuario: valeUsuarioSchema.optional().nullable(),
      vale: z.object({
        id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
        createdAt: z.string().optional().nullable(),
        solicitante: valeUsuarioSchema.optional().nullable()
      })
    })
  )
});

export type ValeEstado = z.infer<typeof valeEstadoSchema>;
export type Vale = z.infer<typeof valeSchema>;
export type ValeItem = z.infer<typeof valeItemSchema>;
export type ValeMovimiento = z.infer<typeof valeMovimientoSchema>;
export type CreateValePayload = z.infer<typeof createValePayloadSchema>;
export type AprobarValePayload = z.infer<typeof aprobarValePayloadSchema>;
export type EntregarValePayload = z.infer<typeof entregarValePayloadSchema>;
export type AnularValePayload = z.infer<typeof anularValePayloadSchema>;
export type ValesListParams = z.infer<typeof valesListParamsSchema>;
