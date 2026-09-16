import { z } from "zod";

export const tipoDocumentoGastoSchema = z.enum(["FACTURA", "CONTRATO_RETENCION", "RECIBO_DIRECTO"]);
export const categoriaRetencionGastoSchema = z.enum(["SERVICIO", "COMPRA"]);
export const monedaCajaSchema = z.enum(["BOB", "USD"]);
export const estadoGastoCajaSchema = z.enum(["REGISTRADO", "RENDIDO", "ANULADO"]);
export const origenGastoCajaSchema = z.enum(["CAJA", "BANCO"]);
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
const cuentaBancariaRef = z.object({
  id: z.number().int().positive(),
  banco: z.string().min(1),
  nombreCuenta: z.string().min(1)
});

export const anulacionGastoCajaSchema = z.object({
  id: z.string().min(1),
  motivo: z.string().min(1),
  createdAt: z.string()
});

export const gastoCajaSchema = z.object({
  id: z.string().min(1),
  origen: origenGastoCajaSchema,
  cajaId: z.number().int().positive().nullable().optional(),
  cuentaBancariaCajaId: z.number().int().positive().nullable().optional(),
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
  centroCostoCajaId: z.number().int().positive().nullable().optional(),
  funcionGastoCajaId: z.number().int().positive().nullable().optional(),
  cuentaContableCajaId: z.number().int().positive().nullable().optional(),
  partidaPresupuestoId: z.number().int().positive().nullable().optional(),
  montoCreditoFiscalIva: z.union([z.string(), z.number()]),
  montoRetencionRcIva: z.union([z.string(), z.number()]),
  montoRetencionIueCompras: z.union([z.string(), z.number()]),
  montoRetencionIt: z.union([z.string(), z.number()]),
  esNoDeducible: z.boolean(),
  estado: estadoGastoCajaSchema,
  // Calculado por el backend (nunca guardado): true si falta centro de
  // costo, función de gasto, cuenta contable o partida de presupuesto.
  informacionIncompleta: z.boolean().optional(),
  createdAt: z.string(),
  caja: refConNombre.nullable().optional(),
  cuentaBancariaCaja: cuentaBancariaRef.nullable().optional(),
  centroCostoCaja: refConNombre.nullable().optional(),
  funcionGastoCaja: refConNombre.nullable().optional(),
  cuentaContableCaja: refConNombre.nullable().optional(),
  partidaPresupuesto: z.object({ id: z.number().int().positive(), descripcion: z.string().min(1) }).nullable().optional(),
  anulacion: anulacionGastoCajaSchema.nullable().optional()
});

export const createGastoCajaPayloadSchema = z
  .object({
    origen: origenGastoCajaSchema.default("CAJA"),
    cajaId: z.number().int().positive().optional(),
    cuentaBancariaCajaId: z.number().int().positive().optional(),
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
    // Ninguno de estos 4 es obligatorio: se puede completar después
    // editando el gasto — mientras falte alguno, se ve como "info incompleta".
    centroCostoCajaId: z.number().int().positive().optional(),
    funcionGastoCajaId: z.number().int().positive().optional(),
    cuentaContableCajaId: z.number().int().positive().optional(),
    partidaPresupuestoId: z.number().int().positive().optional()
  })
  .refine((data) => data.origen !== "CAJA" || Boolean(data.cajaId), {
    message: "Debes elegir una caja.",
    path: ["cajaId"]
  })
  .refine((data) => data.origen !== "BANCO" || Boolean(data.cuentaBancariaCajaId), {
    message: "Debes elegir la cuenta bancaria.",
    path: ["cuentaBancariaCajaId"]
  });

export const updateGastoCajaPayloadSchema = z.object({
  fecha: z.string().min(1).optional(),
  tipoDocumento: tipoDocumentoGastoSchema.optional(),
  categoriaRetencion: categoriaRetencionGastoSchema.nullable().optional(),
  categoriaRendicion: categoriaRendicionGastoSchema.optional(),
  proveedorNombre: z.string().trim().min(1, "El proveedor es obligatorio.").optional(),
  proveedorNitCi: z.string().trim().nullable().optional(),
  glosa: z.string().trim().min(1, "La glosa es obligatoria.").optional(),
  numeroRespaldo: z.string().trim().nullable().optional(),
  montoTotal: z.number().positive("El monto debe ser mayor a cero.").optional(),
  moneda: monedaCajaSchema.optional(),
  centroCostoCajaId: z.number().int().positive().nullable().optional(),
  funcionGastoCajaId: z.number().int().positive().nullable().optional(),
  cuentaContableCajaId: z.number().int().positive().nullable().optional(),
  partidaPresupuestoId: z.number().int().positive().nullable().optional()
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
export type OrigenGastoCaja = z.infer<typeof origenGastoCajaSchema>;
export type TipoMovimientoFondoCaja = z.infer<typeof tipoMovimientoFondoCajaSchema>;
export type GastoCaja = z.infer<typeof gastoCajaSchema>;
export type CreateGastoCajaPayload = z.infer<typeof createGastoCajaPayloadSchema>;
export type UpdateGastoCajaPayload = z.infer<typeof updateGastoCajaPayloadSchema>;
export type AnularGastoCajaPayload = z.infer<typeof anularGastoCajaPayloadSchema>;
export type MovimientoFondoCaja = z.infer<typeof movimientoFondoCajaSchema>;
export type CreateMovimientoFondoCajaPayload = z.infer<typeof createMovimientoFondoCajaPayloadSchema>;
