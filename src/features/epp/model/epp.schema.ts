import { z } from "zod";

const numberLikeSchema = z.coerce.number();
const idLikeSchema = z.union([z.string(), numberLikeSchema]).transform((value) => String(value));

export const condicionEppSchema = z.enum([
  "NUEVO",
  "EN_USO",
  "DEVUELTO_BUENO",
  "DEVUELTO_USADO",
  "BAJA"
]);

const eppUsuarioSchema = z
  .object({
    id: numberLikeSchema.int().positive(),
    nombre: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    role: z.string().optional().nullable()
  })
  .passthrough();

const eppCategoriaSchema = z
  .object({
    id: numberLikeSchema.optional().nullable(),
    codigo: z.string().optional().nullable(),
    nombre: z.string().optional().nullable()
  })
  .passthrough()
  .optional()
  .nullable();

export const eppProductoBaseSchema = z
  .object({
    id: numberLikeSchema.int().positive(),
    codigo: z.string().optional().nullable(),
    nombre: z.string().optional().nullable(),
    unidad: z.string().optional().nullable(),
    grupo: eppCategoriaSchema,
    subGrupo: eppCategoriaSchema
  })
  .passthrough();

export const eppAsignacionSchema = z
  .object({
    id: idLikeSchema,
    condicion: condicionEppSchema,
    observacion: z.string().optional().nullable(),
    fechaEntrega: z.string().optional().nullable(),
    fechaDevolucion: z.string().optional().nullable(),
    activa: z.boolean().optional().default(false),
    producto: eppProductoBaseSchema.optional().nullable(),
    usuario: eppUsuarioSchema.optional().nullable()
  })
  .passthrough();

export const eppProductoSchema = eppProductoBaseSchema
  .extend({
    stock: z
      .object({
        cantidad: numberLikeSchema.default(0),
        precioUnit: numberLikeSchema.optional().nullable()
      })
      .optional()
      .nullable(),
    asignacionesActivas: z
      .array(
        z
          .object({
            asignacionId: idLikeSchema,
            condicion: condicionEppSchema,
            usuario: eppUsuarioSchema.optional().nullable()
          })
          .passthrough()
      )
      .default([]),
    totalAsignacionesActivas: numberLikeSchema.int().nonnegative().default(0)
  })
  .passthrough();

const eppMetaSchema = z.object({
  page: numberLikeSchema.int().positive(),
  limit: numberLikeSchema.int().positive(),
  total: numberLikeSchema.int().nonnegative(),
  totalPages: numberLikeSchema.int().positive()
});

export const eppProductosResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    total: numberLikeSchema.int().nonnegative(),
    productos: z.array(eppProductoSchema).default([])
  })
});

export const eppProductoHistorialResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    producto: eppProductoBaseSchema,
    propietarioActual: eppAsignacionSchema.optional().nullable(),
    asignaciones: z.array(eppAsignacionSchema).default([]),
    entregasVale: z
      .array(
        z
          .object({
            valeId: idLikeSchema,
            cantidadEntregada: numberLikeSchema,
            fecha: z.string().optional().nullable(),
            solicitante: eppUsuarioSchema.optional().nullable(),
            almacenero: eppUsuarioSchema.optional().nullable()
          })
          .passthrough()
      )
      .default([])
  })
});

export const eppTrabajadoresResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    meta: eppMetaSchema,
    trabajadores: z
      .array(
        z
          .object({
            usuario: eppUsuarioSchema,
            asignacionesActivas: numberLikeSchema.int().nonnegative(),
            totalAsignaciones: numberLikeSchema.int().nonnegative(),
            ultimaEntrega: z
              .object({
                fecha: z.string().optional().nullable(),
                producto: z.string().optional().nullable()
              })
              .optional()
              .nullable()
          })
          .passthrough()
      )
      .default([])
  })
});

export const eppTrabajadorReporteResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    usuario: eppUsuarioSchema,
    asignacionesActivas: z.array(eppAsignacionSchema).default([]),
    asignacionesDevueltas: z.array(eppAsignacionSchema).default([]),
    historialVales: z
      .array(
        z
          .object({
            valeId: idLikeSchema,
            fecha: z.string().optional().nullable(),
            almacenero: eppUsuarioSchema.optional().nullable(),
            producto: eppProductoBaseSchema.optional().nullable(),
            cantidadEntregada: numberLikeSchema
          })
          .passthrough()
      )
      .default([])
  })
});

export const eppAsignacionesResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.union([
    z.object({
      meta: eppMetaSchema,
      asignaciones: z.array(eppAsignacionSchema).default([])
    }),
    z.object({
      total: numberLikeSchema.int().nonnegative(),
      asignaciones: z.array(eppAsignacionSchema).default([])
    })
  ])
});

export const eppAsignacionResponseSchema = z.object({
  success: z.boolean().optional(),
  data: eppAsignacionSchema
});

export const eppDeleteAsignacionResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional()
});

export const eppProductosQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoriaId: numberLikeSchema.int().positive().optional(),
  soloConStock: z.boolean().optional()
});

export const eppTrabajadoresQuerySchema = z.object({
  search: z.string().trim().optional(),
  soloActivos: z.boolean().optional(),
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().max(100).default(20)
});

export const eppAsignacionesQuerySchema = z.object({
  productoId: numberLikeSchema.int().positive().optional(),
  usuarioId: numberLikeSchema.int().positive().optional(),
  condicion: condicionEppSchema.optional(),
  activa: z.boolean().optional(),
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().max(200).default(20),
  sinPaginar: z.boolean().optional()
});

export const eppCreateAsignacionSchema = z.object({
  productoId: numberLikeSchema.int().positive(),
  usuarioId: numberLikeSchema.int().positive(),
  condicion: condicionEppSchema.optional(),
  fechaEntrega: z.string().optional(),
  observacion: z.string().trim().max(500).optional()
});

export const eppUpdateAsignacionSchema = z
  .object({
    condicion: condicionEppSchema.optional(),
    fechaDevolucion: z.string().optional().nullable(),
    observacion: z.string().trim().max(500).optional().nullable()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Debes enviar al menos un campo."
  });

export type CondicionEpp = z.infer<typeof condicionEppSchema>;
export type EppProducto = z.infer<typeof eppProductoSchema>;
export type EppAsignacion = z.infer<typeof eppAsignacionSchema>;
export type EppProductosQuery = z.infer<typeof eppProductosQuerySchema>;
export type EppTrabajadoresQuery = z.infer<typeof eppTrabajadoresQuerySchema>;
export type EppAsignacionesQuery = z.infer<typeof eppAsignacionesQuerySchema>;
export type EppCreateAsignacionPayload = z.infer<typeof eppCreateAsignacionSchema>;
export type EppUpdateAsignacionPayload = z.infer<typeof eppUpdateAsignacionSchema>;
