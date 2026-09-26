import { z } from "zod";

export const tipoPeriodoLiquidacionSchema = z.enum(["SEMANAL", "MENSUAL"]);
export const estadoLiquidacionSchema = z.enum(["BORRADOR", "CERRADO", "ANULADO"]);
export const tipoConceptoLiquidacionSchema = z.enum(["ABONO", "DEDUCCION"]);

export const tipoEntidadTransportistaSchema = z.enum(["EMPRESA", "TRABAJADOR_PARTICULAR"]);
const transportistaRef = z.object({
  id: z.number().int().positive(),
  nombreORazonSocial: z.string().min(1),
  tipoEntidad: tipoEntidadTransportistaSchema.optional(),
  nitOCi: z.string().optional(),
  banco: z.string().nullable().optional(),
  numeroCuenta: z.string().nullable().optional()
});
const loteRef = z.object({
  id: z.string().min(1),
  correlativo: z.string().min(1),
  fechaDespachoReal: z.string().optional(),
  vehiculo: z.object({ id: z.number().int().positive(), placa: z.string().min(1) }).optional(),
  tipoMineral: z.object({ id: z.number().int().positive(), nombre: z.string().min(1) }).optional(),
  municipioOrigen: z.object({ id: z.number().int().positive(), nombre: z.string().min(1) }).optional(),
  destinoIngenio: z.object({ id: z.number().int().positive(), nombre: z.string().min(1) }).optional()
});
const conceptoRef = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1),
  tipo: tipoConceptoLiquidacionSchema
});

export const liquidacionDetalleLoteSchema = z.object({
  id: z.string().min(1),
  loteId: z.string().min(1),
  tonelajeNeto: z.union([z.string(), z.number()]),
  precioAplicado: z.union([z.string(), z.number()]),
  subtotal: z.union([z.string(), z.number()]),
  lote: loteRef.optional()
});

export const liquidacionItemConceptoSchema = z.object({
  id: z.string().min(1),
  liquidacionId: z.string().min(1),
  conceptoId: z.number().int().positive(),
  descripcion: z.string().nullable().optional(),
  monto: z.union([z.string(), z.number()]),
  concepto: conceptoRef.optional()
});

export const anulacionLiquidacionSchema = z.object({
  id: z.string().min(1),
  motivo: z.string().min(1),
  createdAt: z.string()
});

export const liquidacionSchema = z.object({
  id: z.string().min(1),
  numero: z.number().int().positive().nullable().optional(),
  transportistaId: z.number().int().positive(),
  tipoPeriodo: tipoPeriodoLiquidacionSchema,
  fechaInicio: z.string(),
  fechaFin: z.string(),
  estado: estadoLiquidacionSchema,
  totalBruto: z.union([z.string(), z.number()]),
  totalAbonos: z.union([z.string(), z.number()]),
  totalDeducciones: z.union([z.string(), z.number()]),
  totalNeto: z.union([z.string(), z.number()]),
  createdAt: z.string(),
  transportista: transportistaRef.optional(),
  detalleLotes: z.array(liquidacionDetalleLoteSchema).optional(),
  itemsConcepto: z.array(liquidacionItemConceptoSchema).optional(),
  anulacion: anulacionLiquidacionSchema.nullable().optional()
});

export const createLiquidacionPayloadSchema = z.object({
  transportistaId: z.number().int().positive("Debes elegir un transportista."),
  tipoPeriodo: tipoPeriodoLiquidacionSchema,
  fechaInicio: z.string().min(1, "La fecha de inicio es obligatoria."),
  fechaFin: z.string().min(1, "La fecha de fin es obligatoria.")
});

export const agregarItemConceptoPayloadSchema = z.object({
  conceptoId: z.number().int().positive("Debes elegir un concepto."),
  monto: z.number().positive("El monto debe ser mayor a cero."),
  descripcion: z.string().trim().optional()
});

export const anularLiquidacionPayloadSchema = z.object({
  motivo: z.string().trim().min(1, "Debes indicar el motivo de la anulación.")
});

// Vista previa (preview): mismos lotes y tarifas que create() calcularía,
// pero sin persistir nada — para que el usuario vea qué se le va a pagar a
// un transportista en un rango ANTES de comprometerse a crear/cerrar nada.
export const previewLoteLiquidacionSchema = z.object({
  loteId: z.string().min(1),
  correlativo: z.string().min(1),
  fechaDespachoReal: z.string(),
  vehiculoPlaca: z.string().min(1),
  tipoMineral: z.string().min(1),
  tonelajeNeto: z.number(),
  precioAplicado: z.number(),
  subtotal: z.number()
});

export const previewLiquidacionSchema = z.object({
  transportista: transportistaRef,
  lotes: z.array(previewLoteLiquidacionSchema),
  totalLotes: z.number(),
  totalBruto: z.number()
});

export const previewLiquidacionQuerySchema = z.object({
  transportistaId: z.number().int().positive(),
  fechaInicio: z.string().min(1),
  fechaFin: z.string().min(1)
});

export const liquidacionListResponseSchema = z.object({ success: z.boolean(), data: z.array(liquidacionSchema) });
export const liquidacionResponseSchema = z.object({ success: z.boolean(), data: liquidacionSchema });
export const liquidacionItemResponseSchema = z.object({ success: z.boolean(), data: liquidacionItemConceptoSchema });
export const previewLiquidacionResponseSchema = z.object({ success: z.boolean(), data: previewLiquidacionSchema });

export type TipoPeriodoLiquidacion = z.infer<typeof tipoPeriodoLiquidacionSchema>;
export type EstadoLiquidacion = z.infer<typeof estadoLiquidacionSchema>;
export type Liquidacion = z.infer<typeof liquidacionSchema>;
export type CreateLiquidacionPayload = z.infer<typeof createLiquidacionPayloadSchema>;
export type AgregarItemConceptoPayload = z.infer<typeof agregarItemConceptoPayloadSchema>;
export type AnularLiquidacionPayload = z.infer<typeof anularLiquidacionPayloadSchema>;
export type PreviewLiquidacionQuery = z.infer<typeof previewLiquidacionQuerySchema>;
export type PreviewLiquidacion = z.infer<typeof previewLiquidacionSchema>;
export type PreviewLoteLiquidacion = z.infer<typeof previewLoteLiquidacionSchema>;
