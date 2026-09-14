import { z } from "zod";

// Los tres catálogos simples (municipio, tipo de mineral, ingenio)
// comparten exactamente la misma forma: codigo + nombre + activo.
export const catalogoSimpleSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  activo: z.boolean()
});

export const createCatalogoSimplePayloadSchema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  activo: z.boolean().optional()
});

export const updateCatalogoSimplePayloadSchema = createCatalogoSimplePayloadSchema.partial();

export const tipoConceptoLiquidacionSchema = z.enum(["ABONO", "DEDUCCION"]);
export const tipoEntidadRemitenteSchema = z.enum(["EMPRESA", "TRABAJADOR_PARTICULAR"]);

export const conceptoLiquidacionSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1),
  tipo: tipoConceptoLiquidacionSchema,
  activo: z.boolean()
});

export const createConceptoLiquidacionPayloadSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  tipo: tipoConceptoLiquidacionSchema,
  activo: z.boolean().optional()
});

export const updateConceptoLiquidacionPayloadSchema = createConceptoLiquidacionPayloadSchema.partial();

const catalogoRefSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1)
});

export const alicuotaRegaliaSchema = z.object({
  id: z.number().int().positive(),
  municipioOrigenId: z.number().int().positive(),
  tipoMineralId: z.number().int().positive(),
  porcentaje: z.union([z.string(), z.number()]),
  vigenteDesde: z.string(),
  vigenteHasta: z.string().nullable(),
  municipioOrigen: catalogoRefSchema,
  tipoMineral: catalogoRefSchema
});

export const createAlicuotaRegaliaPayloadSchema = z.object({
  municipioOrigenId: z.number().int().positive("Debes elegir un municipio de origen."),
  tipoMineralId: z.number().int().positive("Debes elegir un tipo de mineral."),
  porcentaje: z.number().positive("El porcentaje debe ser mayor a cero.").max(100),
  vigenteDesde: z.string().min(1, "La fecha de vigencia es obligatoria.")
});

export const tarifaLiquidacionSchema = z.object({
  id: z.number().int().positive(),
  tipoEntidad: tipoEntidadRemitenteSchema,
  tipoMineralId: z.number().int().positive().nullable(),
  precioPorTonelada: z.union([z.string(), z.number()]),
  vigenteDesde: z.string(),
  vigenteHasta: z.string().nullable(),
  tipoMineral: catalogoRefSchema.nullable()
});

export const createTarifaLiquidacionPayloadSchema = z.object({
  tipoEntidad: tipoEntidadRemitenteSchema,
  tipoMineralId: z.number().int().positive().nullable().optional(),
  precioPorTonelada: z.number().positive("El precio debe ser mayor a cero."),
  vigenteDesde: z.string().min(1, "La fecha de vigencia es obligatoria.")
});

export const catalogoSimpleListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(catalogoSimpleSchema)
});
export const catalogoSimpleResponseSchema = z.object({
  success: z.boolean(),
  data: catalogoSimpleSchema
});
export const conceptoLiquidacionListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(conceptoLiquidacionSchema)
});
export const conceptoLiquidacionResponseSchema = z.object({
  success: z.boolean(),
  data: conceptoLiquidacionSchema
});
export const alicuotaRegaliaListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(alicuotaRegaliaSchema)
});
export const alicuotaRegaliaResponseSchema = z.object({
  success: z.boolean(),
  data: alicuotaRegaliaSchema
});
export const tarifaLiquidacionListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(tarifaLiquidacionSchema)
});
export const tarifaLiquidacionResponseSchema = z.object({
  success: z.boolean(),
  data: tarifaLiquidacionSchema
});
export const parametroDeleteResponseSchema = z.object({
  success: z.boolean()
});

export type CatalogoSimple = z.infer<typeof catalogoSimpleSchema>;
export type CreateCatalogoSimplePayload = z.infer<typeof createCatalogoSimplePayloadSchema>;
export type UpdateCatalogoSimplePayload = z.infer<typeof updateCatalogoSimplePayloadSchema>;
export type ConceptoLiquidacion = z.infer<typeof conceptoLiquidacionSchema>;
export type CreateConceptoLiquidacionPayload = z.infer<typeof createConceptoLiquidacionPayloadSchema>;
export type UpdateConceptoLiquidacionPayload = z.infer<typeof updateConceptoLiquidacionPayloadSchema>;
export type AlicuotaRegalia = z.infer<typeof alicuotaRegaliaSchema>;
export type CreateAlicuotaRegaliaPayload = z.infer<typeof createAlicuotaRegaliaPayloadSchema>;
export type TarifaLiquidacion = z.infer<typeof tarifaLiquidacionSchema>;
export type CreateTarifaLiquidacionPayload = z.infer<typeof createTarifaLiquidacionPayloadSchema>;
export type TipoEntidadRemitente = z.infer<typeof tipoEntidadRemitenteSchema>;
export type TipoConceptoLiquidacion = z.infer<typeof tipoConceptoLiquidacionSchema>;
