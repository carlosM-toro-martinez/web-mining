import { z } from "zod";

const cajaRef = z.object({ id: z.number().int().positive(), nombre: z.string().min(1) });
const centroRef = z.object({ id: z.number().int().positive(), codigo: z.string().min(1), nombre: z.string().min(1) });
const funcionRef = z.object({ id: z.number().int().positive(), codigo: z.string().min(1), nombre: z.string().min(1) });
const cuentaRef = z.object({ id: z.number().int().positive(), codigo: z.string().min(1), nombre: z.string().min(1) });

const gastoReporteSchema = z.object({
  id: z.string().min(1),
  fecha: z.string(),
  proveedorNombre: z.string().min(1),
  glosa: z.string().min(1),
  montoTotal: z.union([z.string(), z.number()]),
  montoRetencionRcIva: z.union([z.string(), z.number()]),
  montoRetencionIueCompras: z.union([z.string(), z.number()]),
  montoRetencionIt: z.union([z.string(), z.number()]),
  caja: cajaRef.optional()
});

export const reporteRetencionesSchema = z.object({
  gastos: z.array(gastoReporteSchema),
  totales: z.object({ rcIva: z.number(), iueCompras: z.number(), it: z.number() })
});

export const reporteNoDeduciblesSchema = z.object({
  gastos: z.array(gastoReporteSchema),
  total: z.number()
});

export const reporteDesgloseSchema = z.object({
  porCentroCosto: z.array(z.object({ centro: centroRef.nullable(), total: z.number() })),
  porFuncionGasto: z.array(z.object({ funcion: funcionRef.nullable(), total: z.number() })),
  porCuentaContable: z.array(z.object({ cuenta: cuentaRef.nullable(), total: z.number() })),
  porCategoria: z.array(z.object({ categoria: z.string(), total: z.number() }))
});

const cajaChicaRefSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  monedaBase: z.enum(["BOB", "USD"]),
  encargadoNombre: z.string().nullable().optional()
});

const movimientoEstadoCuentaSchema = z.object({
  fecha: z.string(),
  tipo: z.enum(["FONDO", "GASTO"]),
  detalle: z.string(),
  referencia: z.string().nullable().optional(),
  ingreso: z.number(),
  egreso: z.number(),
  saldo: z.number()
});

export const reporteEstadoCuentaSchema = z.object({
  caja: cajaChicaRefSchema,
  saldoInicial: z.number(),
  fechaCorte: z.string().nullable().optional(),
  totalIngresos: z.number(),
  totalEgresos: z.number(),
  saldoActual: z.number(),
  movimientos: z.array(movimientoEstadoCuentaSchema)
});

export const reporteRetencionesResponseSchema = z.object({ success: z.boolean(), data: reporteRetencionesSchema });
export const reporteNoDeduciblesResponseSchema = z.object({ success: z.boolean(), data: reporteNoDeduciblesSchema });
export const reporteDesgloseResponseSchema = z.object({ success: z.boolean(), data: reporteDesgloseSchema });
export const reporteEstadoCuentaResponseSchema = z.object({ success: z.boolean(), data: reporteEstadoCuentaSchema });

const movimientoFondoRefSchema = z.object({
  id: z.string().min(1),
  tipo: z.string(),
  monto: z.union([z.string(), z.number()]),
  moneda: z.enum(["BOB", "USD"]),
  fecha: z.string(),
  referencia: z.string().nullable().optional()
});

const gastoRendicionSchema = z.object({
  id: z.string().min(1),
  fecha: z.string(),
  proveedorNombre: z.string().min(1),
  glosa: z.string().min(1),
  numeroRespaldo: z.string().nullable().optional(),
  montoTotal: z.union([z.string(), z.number()]),
  moneda: z.enum(["BOB", "USD"])
});

const grupoRendicionSchema = z.object({
  categoria: z.string(),
  label: z.string(),
  gastos: z.array(gastoRendicionSchema),
  subtotal: z.number()
});

export const reporteRendicionSchema = z.object({
  caja: cajaChicaRefSchema,
  numero: z.string().min(1),
  periodoDesde: z.string(),
  periodoHasta: z.string(),
  tipoCambio: z.number(),
  fondos: z.array(movimientoFondoRefSchema),
  totalFondos: z.number(),
  grupos: z.array(grupoRendicionSchema),
  totalGastos: z.number(),
  saldoAnterior: z.number(),
  saldoNuevo: z.number()
});
export const reporteRendicionResponseSchema = z.object({ success: z.boolean(), data: reporteRendicionSchema });

const lineaComprobanteSchema = z.object({
  codigo: z.string().min(1),
  cuentaNombre: z.string().min(1),
  detalle: z.string(),
  debeBs: z.number(),
  haberBs: z.number(),
  debeUsd: z.number(),
  haberUsd: z.number(),
  centroCodigo: z.string().optional(),
  centroNombre: z.string().optional(),
  funcionCodigo: z.string().optional(),
  funcionNombre: z.string().optional()
});

export const reporteComprobanteDiarioSchema = z.object({
  caja: cajaChicaRefSchema,
  numero: z.string().min(1),
  periodoDesde: z.string(),
  periodoHasta: z.string(),
  tipoCambio: z.number(),
  lineas: z.array(lineaComprobanteSchema),
  totales: z.object({ debeBs: z.number(), haberBs: z.number(), debeUsd: z.number(), haberUsd: z.number() })
});
export const reporteComprobanteDiarioResponseSchema = z.object({
  success: z.boolean(),
  data: reporteComprobanteDiarioSchema
});

export type ReporteRetenciones = z.infer<typeof reporteRetencionesSchema>;
export type ReporteNoDeducibles = z.infer<typeof reporteNoDeduciblesSchema>;
export type ReporteDesglose = z.infer<typeof reporteDesgloseSchema>;
export type ReporteEstadoCuenta = z.infer<typeof reporteEstadoCuentaSchema>;
export type ReporteRendicion = z.infer<typeof reporteRendicionSchema>;
export type ReporteComprobanteDiario = z.infer<typeof reporteComprobanteDiarioSchema>;
