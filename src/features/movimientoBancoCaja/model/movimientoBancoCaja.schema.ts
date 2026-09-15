import { z } from "zod";

export const formaPagoBancoSchema = z.enum(["DEPOSITO", "CHEQUE", "TRANSFERENCIA"]);
export const FORMA_PAGO_BANCO_LABEL: Record<z.infer<typeof formaPagoBancoSchema>, string> = {
  DEPOSITO: "Depósito",
  CHEQUE: "Cheque",
  TRANSFERENCIA: "Transferencia"
};
export const tipoMovimientoBancoSchema = z.enum(["INGRESO", "SALIDA_A_CAJA"]);
export const TIPO_MOVIMIENTO_BANCO_LABEL: Record<z.infer<typeof tipoMovimientoBancoSchema>, string> = {
  INGRESO: "Ingreso a la cuenta (presupuesto, sueldos, etc.)",
  SALIDA_A_CAJA: "Salida hacia una caja"
};
export const monedaCajaSchema = z.enum(["BOB", "USD"]);

const refConNombre = z.object({ id: z.number().int().positive(), nombre: z.string().min(1) });
const cuentaBancariaRef = z.object({
  id: z.number().int().positive(),
  banco: z.string().min(1),
  numeroCuenta: z.string().nullable().optional(),
  nombreCuenta: z.string().min(1)
});
export const movimientoBancoCajaSchema = z.object({
  id: z.string().min(1),
  cuentaBancariaId: z.number().int().positive(),
  tipo: tipoMovimientoBancoSchema,
  cajaId: z.number().int().positive().nullable().optional(),
  fecha: z.string(),
  formaPago: formaPagoBancoSchema,
  numeroCheque: z.string().nullable().optional(),
  monto: z.union([z.string(), z.number()]),
  moneda: monedaCajaSchema,
  depositanteNombre: z.string().nullable().optional(),
  descripcion: z.string().min(1),
  createdAt: z.string(),
  cuentaBancaria: cuentaBancariaRef.optional(),
  caja: refConNombre.nullable().optional()
});

export const createMovimientoBancoCajaPayloadSchema = z
  .object({
    cuentaBancariaId: z.number().int().positive("Debes elegir una cuenta bancaria."),
    tipo: tipoMovimientoBancoSchema,
    cajaId: z.number().int().positive().optional(),
    fecha: z.string().min(1, "La fecha es obligatoria."),
    formaPago: formaPagoBancoSchema,
    numeroCheque: z.string().trim().optional(),
    monto: z.number().positive("El monto debe ser mayor a cero."),
    moneda: monedaCajaSchema,
    depositanteNombre: z.string().trim().optional(),
    descripcion: z.string().trim().min(1, "La descripción es obligatoria.")
  })
  .refine((data) => data.formaPago !== "CHEQUE" || Boolean(data.numeroCheque), {
    message: "El número de cheque es obligatorio cuando la forma de pago es Cheque.",
    path: ["numeroCheque"]
  })
  .refine((data) => data.tipo !== "SALIDA_A_CAJA" || Boolean(data.cajaId), {
    message: "Debes elegir la caja destino.",
    path: ["cajaId"]
  });

export const movimientoBancoCajaListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(movimientoBancoCajaSchema)
});
export const movimientoBancoCajaResponseSchema = z.object({ success: z.boolean(), data: movimientoBancoCajaSchema });

export type FormaPagoBanco = z.infer<typeof formaPagoBancoSchema>;
export type TipoMovimientoBanco = z.infer<typeof tipoMovimientoBancoSchema>;
export type MovimientoBancoCaja = z.infer<typeof movimientoBancoCajaSchema>;
export type CreateMovimientoBancoCajaPayload = z.infer<typeof createMovimientoBancoCajaPayloadSchema>;
