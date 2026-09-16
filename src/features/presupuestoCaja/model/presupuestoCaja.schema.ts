import { z } from "zod";

const cajaRef = z.object({ id: z.number().int().positive(), nombre: z.string().min(1) });
const cuentaBancariaRef = z.object({ id: z.number().int().positive(), banco: z.string().min(1), nombreCuenta: z.string().min(1) });
const movimientoAsignadoRef = z.object({
  id: z.string().min(1),
  monto: z.union([z.string(), z.number()]),
  moneda: z.enum(["BOB", "USD"]),
  fecha: z.string(),
  cuentaBancaria: cuentaBancariaRef.optional()
});

const partidaDeRemesaSchema = z.object({
  id: z.number().int().positive(),
  presupuestoId: z.number().int().positive(),
  descripcion: z.string().min(1),
  montoPresupuestado: z.union([z.string(), z.number()]),
  activo: z.boolean()
});

export const presupuestoCajaSchema = z.object({
  id: z.number().int().positive(),
  cajaId: z.number().int().positive(),
  anio: z.number().int(),
  mes: z.number().int(),
  nombre: z.string().min(1),
  activo: z.boolean(),
  createdAt: z.string(),
  asignadoMovimientoBancoId: z.string().nullable().optional(),
  asignadoEn: z.string().nullable().optional(),
  caja: cajaRef.optional(),
  partidas: z.array(partidaDeRemesaSchema).optional(),
  asignadoMovimientoBanco: movimientoAsignadoRef.nullable().optional(),
  totalPresupuestado: z.number().optional(),
  totalGastado: z.number().optional(),
  saldoAFavor: z.number().optional(),
  porcentajeEjecucion: z.number().optional()
});

export const createPresupuestoCajaPayloadSchema = z.object({
  cajaId: z.number().int().positive("Debes elegir una caja."),
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
  nombre: z.string().trim().min(1, "El nombre es obligatorio.")
});

export const updatePresupuestoCajaPayloadSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  activo: z.boolean().optional()
});

export const asignarBancoPresupuestoCajaPayloadSchema = z.object({
  cuentaBancariaId: z.number().int().positive("Debes elegir una cuenta bancaria.")
});

export const duplicarPresupuestoCajaPayloadSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
  nombre: z.string().trim().min(1).optional(),
  cajaId: z.number().int().positive().optional()
});

export const presupuestoCajaListResponseSchema = z.object({ success: z.boolean(), data: z.array(presupuestoCajaSchema) });
export const presupuestoCajaResponseSchema = z.object({ success: z.boolean(), data: presupuestoCajaSchema });
export const presupuestoCajaDeleteResponseSchema = z.object({ success: z.boolean() });

export type PresupuestoCaja = z.infer<typeof presupuestoCajaSchema>;
export type CreatePresupuestoCajaPayload = z.infer<typeof createPresupuestoCajaPayloadSchema>;
export type UpdatePresupuestoCajaPayload = z.infer<typeof updatePresupuestoCajaPayloadSchema>;
export type AsignarBancoPresupuestoCajaPayload = z.infer<typeof asignarBancoPresupuestoCajaPayloadSchema>;
export type DuplicarPresupuestoCajaPayload = z.infer<typeof duplicarPresupuestoCajaPayloadSchema>;
