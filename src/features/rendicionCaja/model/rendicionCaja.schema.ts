import { z } from "zod";

export const estadoRendicionCajaSchema = z.enum(["BORRADOR", "CERRADO", "ANULADO"]);

const cajaRef = z.object({ id: z.number().int().positive(), nombre: z.string().min(1), monedaBase: z.enum(["BOB", "USD"]) });
const gastoRef = z.object({
  id: z.string().min(1),
  proveedorNombre: z.string().min(1),
  glosa: z.string().min(1),
  montoTotal: z.union([z.string(), z.number()]),
  moneda: z.enum(["BOB", "USD"])
});

export const rendicionDetalleGastoSchema = z.object({
  id: z.string().min(1),
  gastoId: z.string().min(1),
  montoIncluido: z.union([z.string(), z.number()]),
  gasto: gastoRef.optional()
});

export const anulacionRendicionCajaSchema = z.object({
  id: z.string().min(1),
  motivo: z.string().min(1),
  createdAt: z.string()
});

export const rendicionCajaSchema = z.object({
  id: z.string().min(1),
  cajaId: z.number().int().positive(),
  periodoDesde: z.string(),
  periodoHasta: z.string(),
  numero: z.string().min(1),
  tipoCambio: z.union([z.string(), z.number()]),
  estado: estadoRendicionCajaSchema,
  totalFondos: z.union([z.string(), z.number()]),
  totalGastos: z.union([z.string(), z.number()]),
  totalRetenciones: z.union([z.string(), z.number()]),
  totalCreditoFiscal: z.union([z.string(), z.number()]),
  saldoAnterior: z.union([z.string(), z.number()]),
  saldoNuevo: z.union([z.string(), z.number()]),
  createdAt: z.string(),
  caja: cajaRef.optional(),
  detalleGastos: z.array(rendicionDetalleGastoSchema).optional(),
  anulacion: anulacionRendicionCajaSchema.nullable().optional()
});

export const createRendicionCajaPayloadSchema = z.object({
  cajaId: z.number().int().positive("Debes elegir una caja."),
  periodoDesde: z.string().min(1, "La fecha de inicio es obligatoria."),
  periodoHasta: z.string().min(1, "La fecha de fin es obligatoria."),
  tipoCambio: z.number().positive("El tipo de cambio debe ser mayor a cero.")
});

export const anularRendicionCajaPayloadSchema = z.object({
  motivo: z.string().trim().min(1, "Debes indicar el motivo de la anulación.")
});

// Vista previa de lo que incluiría una rendición para un rango de fechas,
// sin haberla creado todavía (sin folio, sin id).
export const previewRendicionCajaSchema = z.object({
  caja: cajaRef,
  gastos: z.array(gastoRef.extend({ fecha: z.string() })),
  totalFondos: z.number(),
  totalGastos: z.number(),
  totalRetenciones: z.number(),
  totalCreditoFiscal: z.number(),
  saldoAnterior: z.number(),
  saldoNuevo: z.number()
});

export const rendicionCajaListResponseSchema = z.object({ success: z.boolean(), data: z.array(rendicionCajaSchema) });
export const rendicionCajaResponseSchema = z.object({ success: z.boolean(), data: rendicionCajaSchema });
export const previewRendicionCajaResponseSchema = z.object({ success: z.boolean(), data: previewRendicionCajaSchema });

export type EstadoRendicionCaja = z.infer<typeof estadoRendicionCajaSchema>;
export type RendicionCaja = z.infer<typeof rendicionCajaSchema>;
export type CreateRendicionCajaPayload = z.infer<typeof createRendicionCajaPayloadSchema>;
export type AnularRendicionCajaPayload = z.infer<typeof anularRendicionCajaPayloadSchema>;
export type PreviewRendicionCaja = z.infer<typeof previewRendicionCajaSchema>;
