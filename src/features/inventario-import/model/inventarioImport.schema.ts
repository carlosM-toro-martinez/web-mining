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

export const saldoMensualQuerySchema = z.object({
  anio: numberLikeSchema.int().min(2000).max(2100),
  mes: numberLikeSchema.int().min(1).max(12)
});

export const importResultSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.record(z.string(), z.unknown())
});

export const saldoMensualListResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(
    z.object({
      id: numberLikeSchema.optional(),
      productoCodigo: z.string(),
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
      totalBs: numberLikeSchema
    })
  )
});

export type StockInicialPayload = z.infer<typeof stockInicialPayloadSchema>;
export type SaldoMensualPayload = z.infer<typeof saldoMensualPayloadSchema>;
export type SaldoMensualQuery = z.infer<typeof saldoMensualQuerySchema>;
