import { z } from "zod";

const numberLikeSchema = z.coerce.number();

const reporteMetaSchema = z.object({
  page: numberLikeSchema.int().positive(),
  limit: numberLikeSchema.int().positive(),
  total: numberLikeSchema.int().nonnegative(),
  totalPages: numberLikeSchema.int().positive()
});

const reporteMetaSinPaginarSchema = z.object({
  total: numberLikeSchema.int().nonnegative()
});

const reporteMetaFlexibleSchema = z.union([reporteMetaSchema, reporteMetaSinPaginarSchema]);

const binCardItemBaseSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  operationId: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  fecha: z.string().min(1),
  tipo: z.string().min(1),
  cantidad: numberLikeSchema,
  stockAntes: numberLikeSchema,
  stockDespues: numberLikeSchema,
  usuarioNombre: z.string().optional().nullable(),
  referencia: z.string().optional().nullable(),
  referenciaId: z.union([z.string(), numberLikeSchema]).optional().nullable(),
  productoNombre: z.string().optional().nullable(),
  esRetroactivo: z.boolean().optional().nullable(),
  periodoAnio: numberLikeSchema.int().optional().nullable(),
  periodoMes: numberLikeSchema.int().min(1).max(12).optional().nullable()
});

export const binCardItemSchema = binCardItemBaseSchema;

export const binCardValoradoItemSchema = binCardItemBaseSchema.extend({
  precioUnit: numberLikeSchema.optional().nullable(),
  entradaBs: numberLikeSchema.optional().nullable(),
  salidaBs: numberLikeSchema.optional().nullable(),
  saldoBs: numberLikeSchema.optional().nullable()
});

export const binCardResponseSchema = z.object({
  items: z.array(binCardItemSchema),
  meta: reporteMetaFlexibleSchema
});

export const binCardValoradoResponseSchema = z.object({
  items: z.array(binCardValoradoItemSchema),
  meta: reporteMetaFlexibleSchema
});

export const reportesQueryParamsSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(50),
  productoId: numberLikeSchema.int().positive().optional(),
  fechaInicio: z.string().trim().optional(),
  fechaFin: z.string().trim().optional(),
  fecha: z.string().trim().optional(),
  sinPaginar: z.boolean().optional()
});

const stockItemSchema = z.object({
  productoId: numberLikeSchema,
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  cantidad: numberLikeSchema,
  cantidadReservada: numberLikeSchema,
  cantidadDisponible: numberLikeSchema,
  precioUnit: numberLikeSchema.optional().nullable(),
  precioProm: numberLikeSchema.optional().nullable(),
  valorTotal: numberLikeSchema
});

const reporteValeItemSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  estado: z.string(),
  createdAt: z.string().optional().nullable(),
  aprobadoAt: z.string().optional().nullable(),
  entregadoAt: z.string().optional().nullable(),
  solicitante: z.object({ id: numberLikeSchema, nombre: z.string().optional().nullable() }).optional().nullable(),
  superintendente: z.object({ id: numberLikeSchema, nombre: z.string().optional().nullable() }).optional().nullable(),
  almacenero: z.object({ id: numberLikeSchema, nombre: z.string().optional().nullable() }).optional().nullable(),
  items: z.array(z.object({
    cantidadSolicitada: numberLikeSchema.optional().nullable(),
    cantidadEntregada: numberLikeSchema.optional().nullable(),
    producto: z.object({ id: numberLikeSchema.optional(), nombre: z.string().optional().nullable(), codigo: z.string().optional().nullable() }).optional().nullable()
  })).optional().default([])
});

const reporteCompraItemSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  estado: z.string(),
  numeroFactura: z.string().optional().nullable(),
  observacion: z.string().optional().nullable(),
  descuento: numberLikeSchema,
  createdAt: z.string().optional().nullable(),
  recibidoAt: z.string().optional().nullable(),
  fechaOperacion: z.string().optional().nullable(),
  proveedor: z
    .object({
      id: numberLikeSchema.int().positive(),
      nombre: z.string().optional().nullable(),
      razonSocial: z.string().optional().nullable(),
      nit: z.string().optional().nullable(),
      contacto: z.string().optional().nullable(),
      lugar: z.string().optional().nullable()
    })
    .optional()
    .nullable(),
  usuarioRegistro: z
    .object({ id: numberLikeSchema.int().positive(), nombre: z.string().optional().nullable() })
    .optional()
    .nullable(),
  usuarioRecibe: z
    .object({ id: numberLikeSchema.int().positive(), nombre: z.string().optional().nullable() })
    .optional()
    .nullable(),
  anulacion: z
    .object({
      motivo: z.string(),
      creadoAt: z.string().optional().nullable(),
      usuario: z
        .object({ id: numberLikeSchema.int().positive(), nombre: z.string().optional().nullable() })
        .optional()
        .nullable()
    })
    .optional()
    .nullable(),
  items: z
    .array(
      z.object({
        productoId: numberLikeSchema.int().positive(),
        codigo: z.string().optional().nullable(),
        nombre: z.string().optional().nullable(),
        unidad: z.string().optional().nullable(),
        cantidadPedida: numberLikeSchema,
        cantidadRecibida: numberLikeSchema,
        precioUnit: numberLikeSchema,
        subtotalBs: numberLikeSchema
      })
    )
    .default([]),
  subtotalBs: numberLikeSchema,
  descuentoBs: numberLikeSchema,
  totalBs: numberLikeSchema
});

export const stockReportResponseSchema = z.object({ success: z.boolean().optional(), data: z.array(stockItemSchema), meta: reporteMetaSchema });
export const valesReportResponseSchema = z.object({ success: z.boolean().optional(), data: z.array(reporteValeItemSchema), meta: reporteMetaFlexibleSchema });
export const comprasReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(reporteCompraItemSchema),
  meta: reporteMetaFlexibleSchema,
  totalGeneral: numberLikeSchema
});

export const stockReportQueryParamsSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(50),
  categoriaId: numberLikeSchema.int().positive().optional()
});
export const valesReportQueryParamsSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(20),
  estado: z.string().trim().optional(),
  solicitanteId: numberLikeSchema.int().positive().optional(),
  fechaInicio: z.string().trim().optional(),
  fechaFin: z.string().trim().optional(),
  sinPaginar: z.boolean().optional()
});
export const comprasReportQueryParamsSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(20),
  estado: z.string().trim().optional(),
  proveedorId: numberLikeSchema.int().positive().optional(),
  fechaInicio: z.string().trim().optional(),
  fechaFin: z.string().trim().optional(),
  sinPaginar: z.boolean().optional()
});

export const monthlyRangeReportQueryParamsSchema = z.object({
  anioInicio: numberLikeSchema.int().min(2000).max(2100),
  mesInicio: numberLikeSchema.int().min(1).max(12),
  anioFin: numberLikeSchema.int().min(2000).max(2100),
  mesFin: numberLikeSchema.int().min(1).max(12)
});

const balanceMensualGrupoSchema = z.object({
  grupoCodigo: z.string().optional().nullable(),
  grupoNombre: z.string().optional().nullable(),
  saldoInicial: numberLikeSchema,
  ingresoMateriales: numberLikeSchema,
  salidaMateriales: numberLikeSchema,
  saldoFinal: numberLikeSchema
});

const balanceMensualTotalesSchema = z.object({
  saldoInicial: numberLikeSchema,
  ingresoMateriales: numberLikeSchema,
  salidaMateriales: numberLikeSchema,
  saldoFinal: numberLikeSchema
});

export const balanceMensualReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    anioInicio: numberLikeSchema.int(),
    mesInicio: numberLikeSchema.int(),
    anioFin: numberLikeSchema.int(),
    mesFin: numberLikeSchema.int(),
    meses: z.array(
      z.object({
        anio: numberLikeSchema.int(),
        mes: numberLikeSchema.int().min(1).max(12),
        esCerrado: z.boolean(),
        grupos: z.array(balanceMensualGrupoSchema),
        totales: balanceMensualTotalesSchema
      })
    )
  })
});

const inventarioAlmacenProductoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  saldoInicial: numberLikeSchema,
  ingresoQty: numberLikeSchema,
  salidaQty: numberLikeSchema,
  saldoFinal: numberLikeSchema,
  precioUnit: numberLikeSchema,
  totalBs: numberLikeSchema
});

const inventarioAlmacenSubGrupoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  productos: z.array(inventarioAlmacenProductoSchema)
});

const inventarioAlmacenGrupoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  totalBs: numberLikeSchema,
  subGrupos: z.array(inventarioAlmacenSubGrupoSchema)
});

export const inventarioAlmacenReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    anioInicio: numberLikeSchema.int(),
    mesInicio: numberLikeSchema.int(),
    anioFin: numberLikeSchema.int(),
    mesFin: numberLikeSchema.int(),
    meses: z.array(
      z.object({
        anio: numberLikeSchema.int(),
        mes: numberLikeSchema.int().min(1).max(12),
        esCerrado: z.boolean(),
        totalGeneral: numberLikeSchema,
        grupos: z.array(inventarioAlmacenGrupoSchema)
      })
    )
  })
});

const movimientoAlmacenProductoBaseSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  precioUnit: numberLikeSchema
});

const entradaAlmacenProductoSchema = movimientoAlmacenProductoBaseSchema.extend({
  ingresoQty: numberLikeSchema,
  totalBsEntrada: numberLikeSchema
});

const salidaAlmacenProductoSchema = movimientoAlmacenProductoBaseSchema.extend({
  salidaQty: numberLikeSchema,
  totalBsSalida: numberLikeSchema
});

const entradaAlmacenSubGrupoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  productos: z.array(entradaAlmacenProductoSchema)
});

const salidaAlmacenSubGrupoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  productos: z.array(salidaAlmacenProductoSchema)
});

export const entradasAlmacenReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    anioInicio: numberLikeSchema.int(),
    mesInicio: numberLikeSchema.int(),
    anioFin: numberLikeSchema.int(),
    mesFin: numberLikeSchema.int(),
    meses: z.array(
      z.object({
        anio: numberLikeSchema.int(),
        mes: numberLikeSchema.int().min(1).max(12),
        esCerrado: z.boolean(),
        grupos: z.array(
          z.object({
            codigo: z.string().optional().nullable(),
            nombre: z.string().optional().nullable(),
            totalBsEntrada: numberLikeSchema,
            subGrupos: z.array(entradaAlmacenSubGrupoSchema)
          })
        ),
        totalGeneral: numberLikeSchema
      })
    )
  })
});

export const salidasAlmacenReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    anioInicio: numberLikeSchema.int(),
    mesInicio: numberLikeSchema.int(),
    anioFin: numberLikeSchema.int(),
    mesFin: numberLikeSchema.int(),
    meses: z.array(
      z.object({
        anio: numberLikeSchema.int(),
        mes: numberLikeSchema.int().min(1).max(12),
        esCerrado: z.boolean(),
        grupos: z.array(
          z.object({
            codigo: z.string().optional().nullable(),
            nombre: z.string().optional().nullable(),
            totalBsSalida: numberLikeSchema,
            subGrupos: z.array(salidaAlmacenSubGrupoSchema)
          })
        ),
        totalGeneral: numberLikeSchema
      })
    )
  })
});

export type BinCardItem = z.infer<typeof binCardItemSchema>;
export type BinCardValoradoItem = z.infer<typeof binCardValoradoItemSchema>;
export type BinCardResponse = z.infer<typeof binCardResponseSchema>;
export type BinCardValoradoResponse = z.infer<typeof binCardValoradoResponseSchema>;
export type ReportesQueryParams = z.infer<typeof reportesQueryParamsSchema>;
export type StockReportQueryParams = z.infer<typeof stockReportQueryParamsSchema>;
export type ValesReportQueryParams = z.infer<typeof valesReportQueryParamsSchema>;
export type ComprasReportQueryParams = z.infer<typeof comprasReportQueryParamsSchema>;
export type MonthlyRangeReportQueryParams = z.infer<typeof monthlyRangeReportQueryParamsSchema>;
export type BalanceMensualReportResponse = z.infer<typeof balanceMensualReportResponseSchema>;
export type InventarioAlmacenReportResponse = z.infer<typeof inventarioAlmacenReportResponseSchema>;
export type EntradasAlmacenReportResponse = z.infer<typeof entradasAlmacenReportResponseSchema>;
export type SalidasAlmacenReportResponse = z.infer<typeof salidasAlmacenReportResponseSchema>;
