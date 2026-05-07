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

export type BinCardItem = z.infer<typeof binCardItemSchema>;
export type BinCardValoradoItem = z.infer<typeof binCardValoradoItemSchema>;
export type BinCardResponse = z.infer<typeof binCardResponseSchema>;
export type BinCardValoradoResponse = z.infer<typeof binCardValoradoResponseSchema>;
export type ReportesQueryParams = z.infer<typeof reportesQueryParamsSchema>;
