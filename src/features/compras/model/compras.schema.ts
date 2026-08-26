import { z } from "zod";
import { movimientoSchema } from "@/features/movimientos/model/movimientos.schema";

const numberLikeSchema = z.coerce.number();

export const compraEstadoSchema = z
  .enum(["PENDIENTE", "PARCIAL", "COMPLETADO", "ANULADA"])
  .or(z.string().min(1));

const compraUsuarioSchema = z.object({
  id: numberLikeSchema.int().positive(),
  nombre: z.string().optional().nullable(),
  email: z.string().optional().nullable()
});

const proveedorSchema = z.object({
  id: numberLikeSchema.int().positive(),
  nombre: z.string().optional().nullable(),
  lugar: z.string().optional().nullable(),
  razonSocial: z.string().optional().nullable(),
  nit: z.string().optional().nullable()
});

const compraProductoSchema = z.object({
  id: numberLikeSchema.int().positive(),
  nombre: z.string().optional().nullable(),
  codigo: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  stock: z.any().optional().nullable(),
  cuenta: z.any().optional().nullable()
});

export const compraItemSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const item = value as Record<string, unknown>;
    const producto = item.producto as { id?: unknown } | undefined;
    return {
      ...item,
      productoId: item.productoId ?? producto?.id
    };
  },
  z.object({
    id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
    productoId: numberLikeSchema.int().positive(),
    cantidadPedida: numberLikeSchema.nonnegative(),
    cantidadRecibida: numberLikeSchema.nonnegative().default(0),
    precioUnit: numberLikeSchema.nonnegative(),
    totalBs: numberLikeSchema.nonnegative().optional().nullable(),
    producto: compraProductoSchema.optional().nullable()
  })
);

export const compraSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  proveedorId: numberLikeSchema.int().positive().optional().nullable(),
  usuarioRegistroId: numberLikeSchema.int().positive().optional().nullable(),
  usuarioRecibeId: numberLikeSchema.int().positive().optional().nullable(),
  estado: compraEstadoSchema,
  numeroFactura: z.string().optional().nullable(),
  observacion: z.string().optional().nullable(),
  fechaOperacion: z.string().optional().nullable(),
  esGasEspecial: z.boolean().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  recibidoAt: z.string().optional().nullable(),
  proveedor: proveedorSchema.optional().nullable(),
  usuarioRegistro: compraUsuarioSchema.optional().nullable(),
  usuarioRecibe: compraUsuarioSchema.optional().nullable(),
  anulacion: z.any().optional().nullable(),
  items: z.array(compraItemSchema).optional().default([])
});

export const compraResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: compraSchema
});

const comprasMetaSchema = z.object({
  page: numberLikeSchema.int().positive(),
  limit: numberLikeSchema.int().positive(),
  total: numberLikeSchema.int().nonnegative(),
  totalPages: numberLikeSchema.int().positive()
});

const comprasMetaSinPaginarSchema = z.object({
  total: numberLikeSchema.int().nonnegative()
});

export const comprasListResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(compraSchema),
  meta: z
    .union([comprasMetaSchema, comprasMetaSinPaginarSchema])
    .transform((value) =>
      "page" in value
        ? value
        : { page: 1, limit: value.total, total: value.total, totalPages: 1 }
    )
    .optional()
});

export const recibirCompraResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    compra: compraSchema,
    movimientos: z.array(movimientoSchema).optional().default([])
  })
});

const anulacionUsuarioSchema = z.object({
  id: numberLikeSchema.int().positive(),
  nombre: z.string().optional().nullable(),
  email: z.string().optional().nullable()
});

export const anulacionCompraSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((v) => String(v)),
  compraId: z.union([z.string(), numberLikeSchema]).transform((v) => String(v)).optional().nullable(),
  motivo: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  usuario: anulacionUsuarioSchema.optional().nullable(),
  compra: compraSchema.optional().nullable()
});

export const anularCompraPayloadSchema = z.object({
  motivo: z.string().trim().min(1, "El motivo es obligatorio.")
});

export const actualizarCompraItemPrecioPayloadSchema = z.object({
  precioUnit: numberLikeSchema.positive("Precio unitario invalido.").optional(),
  totalBs: numberLikeSchema.positive("Total invalido.").optional(),
});

export const actualizarCompraItemPrecioResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    itemId: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
    productoId: numberLikeSchema.int().positive(),
    precioAnterior: numberLikeSchema.nonnegative(),
    nuevoPrecioUnit: numberLikeSchema.nonnegative(),
    cantidadRecibida: numberLikeSchema.nonnegative(),
    subtotalAnterior: numberLikeSchema.nonnegative(),
    subtotalNuevo: numberLikeSchema.nonnegative(),
    movimientosActualizados: numberLikeSchema.int().nonnegative()
  })
});

export const anularCompraResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    compra: compraSchema,
    anulacion: anulacionCompraSchema,
    contraAsientos: numberLikeSchema.int().nonnegative()
  })
});

export const anulacionesHistorialResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(anulacionCompraSchema)
});

export const createCompraPayloadSchema = z.object({
  proveedorId: numberLikeSchema.int().positive("Proveedor invalido."),
  numeroFactura: z.string().trim().min(1).optional(),
  observacion: z.string().trim().optional(),
  fechaOperacion: z.string().datetime().optional(),
  tieneIva: z.boolean().optional(),
  esGasEspecial: z.boolean().optional().nullable(),
  items: z
    .array(
      z.object({
        productoId: numberLikeSchema.int().positive("Producto invalido."),
        cantidadPedida: numberLikeSchema.positive("Cantidad pedida invalida."),
        precioUnit: numberLikeSchema.positive("Precio unitario invalido."),
        totalBs: numberLikeSchema.positive().optional()
      })
    )
    .min(1, "Debes agregar al menos un item.")
});

export const comprasQueryParamsSchema = z.object({
  estado: z.string().trim().optional(),
  proveedorId: numberLikeSchema.int().positive().optional(),
  anio: numberLikeSchema.int().min(2000).max(2100).optional(),
  mes: numberLikeSchema.int().min(1).max(12).optional(),
  fechaInicio: z.string().trim().optional(),
  fechaFin: z.string().trim().optional(),
  sinPaginar: z.boolean().optional(),
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(10)
});

export const recibirCompraPayloadSchema = z.object({
  cantidadesRecibidas: z.record(z.string(), numberLikeSchema.min(0))
});

export type AnulacionCompra = z.infer<typeof anulacionCompraSchema>;
export type ActualizarCompraItemPrecioPayload = z.infer<
  typeof actualizarCompraItemPrecioPayloadSchema
>;
export type AnularCompraPayload = z.infer<typeof anularCompraPayloadSchema>;
export type Compra = z.infer<typeof compraSchema>;
export type CompraItem = z.infer<typeof compraItemSchema>;
export type CreateCompraPayload = z.infer<typeof createCompraPayloadSchema>;
export type ComprasQueryParams = z.infer<typeof comprasQueryParamsSchema>;
export type RecibirCompraPayload = z.infer<typeof recibirCompraPayloadSchema>;
