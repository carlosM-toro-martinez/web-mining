import { z } from "zod";

const numberLikeSchema = z.coerce.number();
const decimalSchema = z.union([z.number(), z.string(), z.null()]).optional();

const movimientoUsuarioSchema = z.object({
  id: numberLikeSchema.int().positive(),
  nombre: z.string().optional().nullable(),
  email: z.string().optional().nullable()
});

const movimientoCuentaSchema = z
  .object({
    id: numberLikeSchema.int().positive(),
    codigoCompleto: z.string().min(1),
    centroCosto: z
      .object({
        id: numberLikeSchema.int().positive(),
        codigo: z.string().optional().nullable(),
        nombre: z.string().optional().nullable()
      })
      .optional()
      .nullable(),
    funcionGasto: z
      .object({
        id: numberLikeSchema.int().positive(),
        codigo: z.string().optional().nullable(),
        nombre: z.string().optional().nullable()
      })
      .optional()
      .nullable(),
    sector: z
      .object({
        id: numberLikeSchema.int().positive(),
        codigo: z.string().optional().nullable(),
        nombre: z.string().optional().nullable()
      })
      .optional()
      .nullable()
  })
  .optional()
  .nullable();

export const movimientoSchema = z.object({
  id: z.union([z.string().min(1), numberLikeSchema]).transform((value) => String(value)),
  operationId: z.union([z.string().min(1), numberLikeSchema]).transform((value) => String(value)),
  productoId: numberLikeSchema.int().positive(),
  tipo: z.string().min(1),
  cantidad: decimalSchema,
  precioUnit: decimalSchema,
  entradaBs: decimalSchema,
  salidaBs: decimalSchema,
  saldoBs: decimalSchema,
  stockAntes: decimalSchema,
  stockDespues: decimalSchema,
  usuarioId: numberLikeSchema.int().positive().optional(),
  usuarioEntregaId: numberLikeSchema.int().positive().optional().nullable(),
  usuarioRecibidoId: numberLikeSchema.int().positive().optional().nullable(),
  cuentaId: numberLikeSchema.int().positive().optional(),
  referencia: z.string().optional().nullable(),
  referenciaId: z.union([z.string(), numberLikeSchema]).optional().nullable(),
  producto: z.any().optional().nullable(),
  usuario: movimientoUsuarioSchema.optional().nullable(),
  usuarioEntrega: movimientoUsuarioSchema.optional().nullable(),
  usuarioRecibido: movimientoUsuarioSchema.optional().nullable(),
  cuenta: movimientoCuentaSchema,
  createdAt: z.string().optional().nullable()
});

export const movimientoResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: movimientoSchema
});

export const createSalidaManualPayloadSchema = z.object({
  productoId: numberLikeSchema.int().positive("Debes elegir un producto."),
  cantidad: numberLikeSchema.positive("La cantidad debe ser mayor a cero."),
  cuentaId: numberLikeSchema.int().positive("Debes elegir una cuenta contable.").optional(),
  usuarioEntregaId: numberLikeSchema.int().positive("Debes elegir quien entrega."),
  usuarioRecibidoId: numberLikeSchema.int().positive("Debes elegir quien recibe."),
  referencia: z.string().trim().optional(),
  referenciaId: z.string().trim().optional()
});

export const createEntradaManualPayloadSchema = z.object({
  productoId: numberLikeSchema.int().positive("Debes elegir un producto."),
  cantidad: numberLikeSchema.positive("La cantidad debe ser mayor a cero."),
  precioUnit: numberLikeSchema.positive("El precio unitario debe ser mayor a cero."),
  cuentaId: numberLikeSchema.int().positive("Debes elegir una cuenta contable.").optional(),
  usuarioEntregaId: numberLikeSchema.int().positive("Debes elegir quien entrega."),
  usuarioRecibidoId: numberLikeSchema.int().positive("Debes elegir quien recibe."),
  referencia: z.string().trim().optional(),
  referenciaId: z.string().trim().optional()
});

export type Movimiento = z.infer<typeof movimientoSchema>;
export type CreateSalidaManualPayload = z.infer<typeof createSalidaManualPayloadSchema>;
export type CreateEntradaManualPayload = z.infer<typeof createEntradaManualPayloadSchema>;
