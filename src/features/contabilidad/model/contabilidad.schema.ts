import { z } from "zod";

const countSchema = z
  .object({
    cuentas: z.number().int().nonnegative().optional(),
    movimientos: z.number().int().nonnegative().optional()
  })
  .optional();

export const centroCostoSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  _count: countSchema
});

export const funcionGastoSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  _count: countSchema
});

export const sectorSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  _count: countSchema
});

export const cuentaSchema = z.object({
  id: z.number().int().positive(),
  codigoCompleto: z.string().min(1),
  centroCostoId: z.number().int().positive(),
  funcionGastoId: z.number().int().positive(),
  sectorId: z.number().int().positive().optional().nullable(),
  centroCosto: z.object({
    id: z.number().int().positive(),
    codigo: z.string().min(1),
    nombre: z.string().min(1)
  }),
  funcionGasto: z.object({
    id: z.number().int().positive(),
    codigo: z.string().min(1),
    nombre: z.string().min(1)
  }),
  sector: z
    .object({
      id: z.number().int().positive(),
      codigo: z.string().min(1),
      nombre: z.string().min(1)
    })
    .optional()
    .nullable(),
  _count: countSchema
});

const salidaCuentaSchema = z.object({
  id: z.number().int().positive(),
  codigoCompleto: z.string().min(1),
  centroCosto: z.object({
    id: z.number().int().positive(),
    codigo: z.string().min(1),
    nombre: z.string().min(1)
  }),
  funcionGasto: z.object({
    id: z.number().int().positive(),
    codigo: z.string().min(1),
    nombre: z.string().min(1)
  }),
  sector: z
    .object({
      id: z.number().int().positive(),
      codigo: z.string().min(1),
      nombre: z.string().min(1)
    })
    .optional()
    .nullable()
});

export const salidaMovimientoSchema = z.object({
  id: z.string().min(1),
  operationId: z.string().min(1),
  productoId: z.number().int().positive(),
  tipo: z.literal("SALIDA"),
  cantidad: z.string().min(1),
  precioUnit: z.string().min(1),
  entradaBs: z.string().min(1),
  salidaBs: z.string().min(1),
  saldoBs: z.string().min(1),
  stockAntes: z.string().min(1),
  stockDespues: z.string().min(1),
  usuarioId: z.number().int().positive(),
  cuentaId: z.number().int().positive(),
  referencia: z.string().min(1),
  referenciaId: z.string().min(1),
  producto: z.object({
    id: z.number().int().positive(),
    codigo: z.string().min(1),
    nombre: z.string().min(1)
  }),
  cuenta: salidaCuentaSchema
});

export const centrosCostoListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(centroCostoSchema)
});

export const centroCostoResponseSchema = z.object({
  success: z.boolean(),
  data: centroCostoSchema
});

export const funcionesGastoListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(funcionGastoSchema)
});

export const funcionGastoResponseSchema = z.object({
  success: z.boolean(),
  data: funcionGastoSchema
});

export const sectoresListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(sectorSchema)
});

export const sectorResponseSchema = z.object({
  success: z.boolean(),
  data: sectorSchema
});

export const cuentasListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(cuentaSchema)
});

export const cuentaResponseSchema = z.object({
  success: z.boolean(),
  data: cuentaSchema
});

export const salidaMovimientoResponseSchema = z.object({
  success: z.boolean(),
  data: salidaMovimientoSchema
});

export const createCentroCostoPayloadSchema = z.object({
  codigo: z.string().trim().min(1, "El codigo es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio.")
});

export const createFuncionGastoPayloadSchema = z.object({
  codigo: z.string().trim().min(1, "El codigo es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio.")
});

export const createSectorPayloadSchema = z.object({
  codigo: z.string().trim().min(1, "El codigo es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio.")
});

export const createCuentaPayloadSchema = z.object({
  codigoCompleto: z.string().trim().min(1, "El codigo completo es obligatorio."),
  centroCostoId: z.number().int().positive("Debes elegir un centro de costo."),
  funcionGastoId: z.number().int().positive("Debes elegir una funcion de gasto."),
  sectorId: z.number().int().positive("Sector invalido.").optional()
});

export const createSalidaPayloadSchema = z.object({
  productoId: z.number().int().positive("Debes elegir un producto."),
  cantidad: z.number().positive("La cantidad debe ser mayor a cero."),
  cuentaId: z.number().int().positive("Cuenta contable invalida.").optional(),
  referencia: z.string().trim().min(1, "La referencia es obligatoria."),
  referenciaId: z.string().trim().min(1, "El ID de referencia es obligatorio.")
});

export type CentroCosto = z.infer<typeof centroCostoSchema>;
export type FuncionGasto = z.infer<typeof funcionGastoSchema>;
export type Sector = z.infer<typeof sectorSchema>;
export type CuentaContable = z.infer<typeof cuentaSchema>;
export type SalidaMovimiento = z.infer<typeof salidaMovimientoSchema>;
export type CreateCentroCostoPayload = z.infer<typeof createCentroCostoPayloadSchema>;
export type CreateFuncionGastoPayload = z.infer<typeof createFuncionGastoPayloadSchema>;
export type CreateSectorPayload = z.infer<typeof createSectorPayloadSchema>;
export type CreateCuentaPayload = z.infer<typeof createCuentaPayloadSchema>;
export type CreateSalidaPayload = z.infer<typeof createSalidaPayloadSchema>;
