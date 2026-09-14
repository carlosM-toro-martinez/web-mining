import { z } from "zod";

export const tipoDocumentoGastoSchema = z.enum(["FACTURA", "CONTRATO_RETENCION", "RECIBO_DIRECTO"]);
export const categoriaRetencionGastoSchema = z.enum(["SERVICIO", "COMPRA"]);
export const monedaCajaSchema = z.enum(["BOB", "USD"]);
export const estadoGastoCajaSchema = z.enum(["REGISTRADO", "RENDIDO", "ANULADO"]);
export const categoriaRendicionGastoSchema = z.enum([
  "MATERIALES_SUMINISTROS",
  "TRANSPORTES",
  "ACTIVOS_FIJOS",
  "MANTENIMIENTO_SERVICIOS",
  "OBLIGACIONES_SOCIALES",
  "OBRAS_CONSTRUCCION",
  "GASTOS_ADMINISTRATIVOS",
  "OTROS_GASTOS_ADMINISTRATIVOS",
  "OTROS",
  "MEDIO_AMBIENTE"
]);
export const CATEGORIA_RENDICION_LABEL: Record<z.infer<typeof categoriaRendicionGastoSchema>, string> = {
  MATERIALES_SUMINISTROS: "Materiales y Suministros",
  TRANSPORTES: "Transportes",
  ACTIVOS_FIJOS: "Activos Fijos",
  MANTENIMIENTO_SERVICIOS: "Mantenimiento y Otros Servicios",
  OBLIGACIONES_SOCIALES: "Obligaciones Sociales",
  OBRAS_CONSTRUCCION: "Obras en Construcción",
  GASTOS_ADMINISTRATIVOS: "Gastos Administrativos",
  OTROS_GASTOS_ADMINISTRATIVOS: "Otros Gastos Administrativos",
  OTROS: "Otros",
  MEDIO_AMBIENTE: "Medio Ambiente"
};
export const tipoMovimientoFondoCajaSchema = z.enum([
  "REMESA_PRESUPUESTO",
  "REMESA_SUELDOS",
  "REMESA_OTROS",
  "REPOSICION"
]);

const refConNombre = z.object({ id: z.number().int().positive(), codigo: z.string().min(1), nombre: z.string().min(1) });

export const anulacionGastoCajaSchema = z.object({
  id: z.string().min(1),
  motivo: z.string().min(1),
  createdAt: z.string()
});

export const gastoCajaSchema = z.object({
  id: z.string().min(1),
  cajaId: z.number().int().positive(),
  fecha: z.string(),
  tipoDocumento: tipoDocumentoGastoSchema,
  categoriaRetencion: categoriaRetencionGastoSchema.nullable().optional(),
  categoriaRendicion: categoriaRendicionGastoSchema,
  proveedorNombre: z.string().min(1),
  proveedorNitCi: z.string().nullable().optional(),
  glosa: z.string().min(1),
  numeroRespaldo: z.string().nullable().optional(),
  montoTotal: z.union([z.string(), z.number()]),
  moneda: monedaCajaSchema,
  centroCostoCajaId: z.number().int().positive(),
  funcionGastoCajaId: z.number().int().positive(),
  cuentaContableCajaId: z.number().int().positive().nullable().optional(),
  montoCreditoFiscalIva: z.union([z.string(), z.number()]),
  montoRetencionRcIva: z.union([z.string(), z.number()]),
  montoRetencionIueCompras: z.union([z.string(), z.number()]),
  montoRetencionIt: z.union([z.string(), z.number()]),
  esNoDeducible: z.boolean(),
  estado: estadoGastoCajaSchema,
  createdAt: z.string(),
  caja: refConNombre.optional(),
  centroCostoCaja: refConNombre.optional(),
  funcionGastoCaja: refConNombre.optional(),
  cuentaContableCaja: refConNombre.nullable().optional(),
  anulacion: anulacionGastoCajaSchema.nullable().optional()
});

export const createGastoCajaPayloadSchema = z.object({
  cajaId: z.number().int().positive("Debes elegir una caja."),
  fecha: z.string().min(1, "La fecha es obligatoria."),
  tipoDocumento: tipoDocumentoGastoSchema,
  categoriaRetencion: categoriaRetencionGastoSchema.optional(),
  categoriaRendicion: categoriaRendicionGastoSchema,
  proveedorNombre: z.string().trim().min(1, "El proveedor es obligatorio."),
  proveedorNitCi: z.string().trim().optional(),
  glosa: z.string().trim().min(1, "La glosa es obligatoria."),
  numeroRespaldo: z.string().trim().optional(),
  montoTotal: z.number().positive("El monto debe ser mayor a cero."),
  moneda: monedaCajaSchema,
  centroCostoCajaId: z.number().int().positive("Debes elegir un centro de costo."),
  funcionGastoCajaId: z.number().int().positive("Debes elegir una función de gasto.")
});

export const anularGastoCajaPayloadSchema = z.object({
  motivo: z.string().trim().min(1, "Debes indicar el motivo de la anulación.")
});

export const gastoCajaListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(gastoCajaSchema),
  meta: z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() }).optional()
});
export const gastoCajaResponseSchema = z.object({ success: z.boolean(), data: gastoCajaSchema });

// --- Movimiento de fondo ---
export const movimientoFondoCajaSchema = z.object({
  id: z.string().min(1),
  cajaId: z.number().int().positive(),
  tipo: tipoMovimientoFondoCajaSchema,
  monto: z.union([z.string(), z.number()]),
  moneda: monedaCajaSchema,
  fecha: z.string(),
  referencia: z.string().nullable().optional(),
  createdAt: z.string(),
  caja: refConNombre.optional()
});

export const createMovimientoFondoCajaPayloadSchema = z.object({
  cajaId: z.number().int().positive("Debes elegir una caja."),
  tipo: tipoMovimientoFondoCajaSchema,
  monto: z.number().positive("El monto debe ser mayor a cero."),
  moneda: monedaCajaSchema,
  fecha: z.string().min(1, "La fecha es obligatoria."),
  referencia: z.string().trim().optional()
});

export const movimientoFondoCajaListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(movimientoFondoCajaSchema)
});
export const movimientoFondoCajaResponseSchema = z.object({ success: z.boolean(), data: movimientoFondoCajaSchema });

export type TipoDocumentoGasto = z.infer<typeof tipoDocumentoGastoSchema>;
export type CategoriaRetencionGasto = z.infer<typeof categoriaRetencionGastoSchema>;
export type CategoriaRendicionGasto = z.infer<typeof categoriaRendicionGastoSchema>;
export type MonedaCaja = z.infer<typeof monedaCajaSchema>;
export type EstadoGastoCaja = z.infer<typeof estadoGastoCajaSchema>;
export type TipoMovimientoFondoCaja = z.infer<typeof tipoMovimientoFondoCajaSchema>;
export type GastoCaja = z.infer<typeof gastoCajaSchema>;
export type CreateGastoCajaPayload = z.infer<typeof createGastoCajaPayloadSchema>;
export type AnularGastoCajaPayload = z.infer<typeof anularGastoCajaPayloadSchema>;
export type MovimientoFondoCaja = z.infer<typeof movimientoFondoCajaSchema>;
export type CreateMovimientoFondoCajaPayload = z.infer<typeof createMovimientoFondoCajaPayloadSchema>;
