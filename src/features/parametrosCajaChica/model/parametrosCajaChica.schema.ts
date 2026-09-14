import { z } from "zod";

export const monedaCajaSchema = z.enum(["BOB", "USD"]);
export const claseCuentaCajaSchema = z.enum(["BAL", "IND", "MAY"]);
export const tipoRetencionCajaSchema = z.enum(["RC_IVA", "IUE_COMPRAS", "IT"]);

// --- Caja chica ---
export const cajaChicaSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  monedaBase: monedaCajaSchema,
  encargadoNombre: z.string().nullable().optional(),
  activo: z.boolean()
});
export const createCajaChicaPayloadSchema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  monedaBase: monedaCajaSchema.optional(),
  encargadoNombre: z.string().trim().optional()
});
export const updateCajaChicaPayloadSchema = createCajaChicaPayloadSchema.partial();

// --- Centro de costo / Función de gasto (árbol de 2 niveles, sin campo tipo en centro de costo) ---
const refConNombre = z.object({ id: z.number().int().positive(), codigo: z.string().min(1), nombre: z.string().min(1) });

export const centroCostoCajaSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  parentId: z.number().int().positive().nullable(),
  activo: z.boolean(),
  parent: refConNombre.nullable().optional()
});
export const createCentroCostoCajaPayloadSchema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  parentId: z.number().int().positive().nullable().optional()
});
export const updateCentroCostoCajaPayloadSchema = createCentroCostoCajaPayloadSchema.partial();

export const tipoCosteoCajaSchema = z.enum(["DISTRIBUIBLE", "NO_DISTRIBUIBLE"]);

export const funcionGastoCajaSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  tipo: tipoCosteoCajaSchema,
  parentId: z.number().int().positive().nullable(),
  activo: z.boolean(),
  parent: refConNombre.nullable().optional()
});
export const createFuncionGastoCajaPayloadSchema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  tipo: tipoCosteoCajaSchema,
  parentId: z.number().int().positive().nullable().optional()
});
export const updateFuncionGastoCajaPayloadSchema = createFuncionGastoCajaPayloadSchema.partial();

// --- Cuenta contable de caja ---
export const cuentaContableCajaSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  clase: claseCuentaCajaSchema,
  nivel: z.number().int(),
  monedaCodigo: z.string().min(1),
  requiereCentroCosto: z.boolean(),
  requiereFuncionGasto: z.boolean(),
  activo: z.boolean()
});
export const createCuentaContableCajaPayloadSchema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  clase: claseCuentaCajaSchema,
  nivel: z.number().int().positive(),
  monedaCodigo: z.string().trim().length(1, "Usa un solo carácter (A/B)."),
  requiereCentroCosto: z.boolean().optional(),
  requiereFuncionGasto: z.boolean().optional()
});
export const updateCuentaContableCajaPayloadSchema = createCuentaContableCajaPayloadSchema.partial();

// --- Concepto de retención ---
export const conceptoRetencionCajaSchema = z.object({
  id: z.number().int().positive(),
  codigo: tipoRetencionCajaSchema,
  nombre: z.string().min(1),
  porcentaje: z.union([z.string(), z.number()]),
  cuentaContableCajaId: z.number().int().positive(),
  activo: z.boolean(),
  cuentaContableCaja: cuentaContableCajaSchema.optional()
});
export const createConceptoRetencionCajaPayloadSchema = z.object({
  codigo: tipoRetencionCajaSchema,
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  porcentaje: z.number().positive("El porcentaje debe ser mayor a cero.").max(100),
  cuentaContableCajaId: z.number().int().positive("Debes elegir una cuenta contable.")
});
export const updateConceptoRetencionCajaPayloadSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  porcentaje: z.number().positive().max(100).optional(),
  cuentaContableCajaId: z.number().int().positive().optional()
});

// --- Envelopes de respuesta ---
export const cajaChicaListResponseSchema = z.object({ success: z.boolean(), data: z.array(cajaChicaSchema) });
export const cajaChicaResponseSchema = z.object({ success: z.boolean(), data: cajaChicaSchema });
export const centroCostoCajaListResponseSchema = z.object({ success: z.boolean(), data: z.array(centroCostoCajaSchema) });
export const centroCostoCajaResponseSchema = z.object({ success: z.boolean(), data: centroCostoCajaSchema });
export const funcionGastoCajaListResponseSchema = z.object({ success: z.boolean(), data: z.array(funcionGastoCajaSchema) });
export const funcionGastoCajaResponseSchema = z.object({ success: z.boolean(), data: funcionGastoCajaSchema });
export const cuentaContableCajaListResponseSchema = z.object({ success: z.boolean(), data: z.array(cuentaContableCajaSchema) });
export const cuentaContableCajaResponseSchema = z.object({ success: z.boolean(), data: cuentaContableCajaSchema });
export const conceptoRetencionCajaListResponseSchema = z.object({ success: z.boolean(), data: z.array(conceptoRetencionCajaSchema) });
export const conceptoRetencionCajaResponseSchema = z.object({ success: z.boolean(), data: conceptoRetencionCajaSchema });
export const cajaChicaDeleteResponseSchema = z.object({ success: z.boolean() });

export type MonedaCaja = z.infer<typeof monedaCajaSchema>;
export type CajaChica = z.infer<typeof cajaChicaSchema>;
export type CreateCajaChicaPayload = z.infer<typeof createCajaChicaPayloadSchema>;
export type UpdateCajaChicaPayload = z.infer<typeof updateCajaChicaPayloadSchema>;
export type CentroCostoCaja = z.infer<typeof centroCostoCajaSchema>;
export type CreateCentroCostoCajaPayload = z.infer<typeof createCentroCostoCajaPayloadSchema>;
export type UpdateCentroCostoCajaPayload = z.infer<typeof updateCentroCostoCajaPayloadSchema>;
export type TipoCosteoCaja = z.infer<typeof tipoCosteoCajaSchema>;
export type FuncionGastoCaja = z.infer<typeof funcionGastoCajaSchema>;
export type CreateFuncionGastoCajaPayload = z.infer<typeof createFuncionGastoCajaPayloadSchema>;
export type UpdateFuncionGastoCajaPayload = z.infer<typeof updateFuncionGastoCajaPayloadSchema>;
export type ClaseCuentaCaja = z.infer<typeof claseCuentaCajaSchema>;
export type CuentaContableCaja = z.infer<typeof cuentaContableCajaSchema>;
export type CreateCuentaContableCajaPayload = z.infer<typeof createCuentaContableCajaPayloadSchema>;
export type UpdateCuentaContableCajaPayload = z.infer<typeof updateCuentaContableCajaPayloadSchema>;
export type TipoRetencionCaja = z.infer<typeof tipoRetencionCajaSchema>;
export type ConceptoRetencionCaja = z.infer<typeof conceptoRetencionCajaSchema>;
export type CreateConceptoRetencionCajaPayload = z.infer<typeof createConceptoRetencionCajaPayloadSchema>;
export type UpdateConceptoRetencionCajaPayload = z.infer<typeof updateConceptoRetencionCajaPayloadSchema>;
