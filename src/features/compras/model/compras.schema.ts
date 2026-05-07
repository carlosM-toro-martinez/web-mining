import { z } from "zod";
import { movimientoSchema } from "@/features/movimientos/model/movimientos.schema";

const numberLikeSchema = z.coerce.number();

export const compraEstadoSchema = z.enum(["PENDIENTE", "PARCIAL", "COMPLETADO"]).or(z.string().min(1));

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

export const compraItemSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  productoId: numberLikeSchema.int().positive(),
  cantidadPedida: numberLikeSchema.nonnegative(),
  cantidadRecibida: numberLikeSchema.nonnegative().default(0),
  precioUnit: numberLikeSchema.nonnegative(),
  producto: compraProductoSchema.optional().nullable()
});

export const compraSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  proveedorId: numberLikeSchema.int().positive().optional().nullable(),
  usuarioRegistroId: numberLikeSchema.int().positive().optional().nullable(),
  usuarioRecibeId: numberLikeSchema.int().positive().optional().nullable(),
  estado: compraEstadoSchema,
  observacion: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  recibidoAt: z.string().optional().nullable(),
  proveedor: proveedorSchema.optional().nullable(),
  usuarioRegistro: compraUsuarioSchema.optional().nullable(),
  usuarioRecibe: compraUsuarioSchema.optional().nullable(),
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

export const comprasListResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(compraSchema),
  meta: comprasMetaSchema.optional()
});

export const recibirCompraResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    compra: compraSchema,
    movimientos: z.array(movimientoSchema).optional().default([])
  })
});

export const createCompraPayloadSchema = z.object({
  proveedorId: numberLikeSchema.int().positive("Proveedor invalido."),
  observacion: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        productoId: numberLikeSchema.int().positive("Producto invalido."),
        cantidadPedida: numberLikeSchema.positive("Cantidad pedida invalida."),
        precioUnit: numberLikeSchema.positive("Precio unitario invalido.")
      })
    )
    .min(1, "Debes agregar al menos un item.")
});

export const comprasQueryParamsSchema = z.object({
  estado: z.string().trim().optional(),
  proveedorId: numberLikeSchema.int().positive().optional(),
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(10)
});

export const recibirCompraPayloadSchema = z.object({
  cantidadesRecibidas: z.record(z.string(), numberLikeSchema.min(0))
});

export type Compra = z.infer<typeof compraSchema>;
export type CompraItem = z.infer<typeof compraItemSchema>;
export type CreateCompraPayload = z.infer<typeof createCompraPayloadSchema>;
export type ComprasQueryParams = z.infer<typeof comprasQueryParamsSchema>;
export type RecibirCompraPayload = z.infer<typeof recibirCompraPayloadSchema>;
