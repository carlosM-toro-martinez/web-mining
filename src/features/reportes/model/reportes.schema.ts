import { z } from "zod";

const numberLikeSchema = z.coerce.number();

const reporteMetaSchema = z.object({
  page: numberLikeSchema.int().positive(),
  limit: numberLikeSchema.int().positive(),
  total: numberLikeSchema.int().nonnegative(),
  totalPages: numberLikeSchema.int().positive()
});

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
  productoNombre: z.string().optional().nullable()
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
  meta: reporteMetaSchema
});

export const binCardValoradoResponseSchema = z.object({
  items: z.array(binCardValoradoItemSchema),
  meta: reporteMetaSchema
});

export const reportesQueryParamsSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(50),
  productoId: numberLikeSchema.int().positive().optional(),
  fechaInicio: z.string().trim().optional(),
  fechaFin: z.string().trim().optional(),
  fecha: z.string().trim().optional()
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
  createdAt: z.string().optional().nullable(),
  recibidoAt: z.string().optional().nullable(),
  proveedor: z.object({ id: numberLikeSchema, nombre: z.string().optional().nullable() }).optional().nullable(),
  items: z.array(z.object({
    cantidadPedida: numberLikeSchema.optional().nullable(),
    cantidadRecibida: numberLikeSchema.optional().nullable(),
    precioUnit: numberLikeSchema.optional().nullable(),
    producto: z.object({ id: numberLikeSchema.optional(), nombre: z.string().optional().nullable(), codigo: z.string().optional().nullable() }).optional().nullable()
  })).optional().default([])
});

export const stockReportResponseSchema = z.object({ success: z.boolean().optional(), data: z.array(stockItemSchema), meta: reporteMetaSchema });
export const valesReportResponseSchema = z.object({ success: z.boolean().optional(), data: z.array(reporteValeItemSchema), meta: reporteMetaSchema });
export const comprasReportResponseSchema = z.object({ success: z.boolean().optional(), data: z.array(reporteCompraItemSchema), meta: reporteMetaSchema });

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
  fechaFin: z.string().trim().optional()
});
export const comprasReportQueryParamsSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(20),
  estado: z.string().trim().optional(),
  proveedorId: numberLikeSchema.int().positive().optional(),
  fechaInicio: z.string().trim().optional(),
  fechaFin: z.string().trim().optional()
});

export type BinCardItem = z.infer<typeof binCardItemSchema>;
export type BinCardValoradoItem = z.infer<typeof binCardValoradoItemSchema>;
export type BinCardResponse = z.infer<typeof binCardResponseSchema>;
export type BinCardValoradoResponse = z.infer<typeof binCardValoradoResponseSchema>;
export type ReportesQueryParams = z.infer<typeof reportesQueryParamsSchema>;
export type StockReportQueryParams = z.infer<typeof stockReportQueryParamsSchema>;
export type ValesReportQueryParams = z.infer<typeof valesReportQueryParamsSchema>;
export type ComprasReportQueryParams = z.infer<typeof comprasReportQueryParamsSchema>;
