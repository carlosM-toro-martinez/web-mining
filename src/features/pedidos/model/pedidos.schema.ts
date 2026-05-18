import { z } from "zod";

const numberLikeSchema = z.coerce.number();

const pedidoItemSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  productoId: numberLikeSchema.int().positive(),
  cantidadPedida: numberLikeSchema.nonnegative(),
  cantidadRecibida: numberLikeSchema.nonnegative().optional().default(0),
  producto: z.object({
    id: numberLikeSchema.int().positive(),
    nombre: z.string().optional().nullable(),
    codigo: z.string().optional().nullable(),
    unidad: z.string().optional().nullable()
  }).optional().nullable()
});

export const pedidoSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  estado: z.string(),
  observacion: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  proveedor: z.object({ id: numberLikeSchema, nombre: z.string().optional().nullable() }).optional().nullable(),
  items: z.array(pedidoItemSchema).optional().default([])
});

export const pedidosListParamsSchema = z.object({
  estado: z.string().trim().optional(),
  proveedorId: numberLikeSchema.int().positive().optional(),
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(10)
});

const pedidosMetaSchema = z.object({
  page: numberLikeSchema.int().positive(),
  limit: numberLikeSchema.int().positive(),
  total: numberLikeSchema.int().nonnegative(),
  totalPages: numberLikeSchema.int().positive()
});

export const pedidosListResponseSchema = z
  .object({
    success: z.boolean().optional().default(true),
    data: z.array(pedidoSchema),
    meta: pedidosMetaSchema
  })
  .or(
    z.object({
      pedidos: z.array(pedidoSchema),
      meta: pedidosMetaSchema
    }).transform((value) => ({
      success: true,
      data: value.pedidos,
      meta: value.meta
    }))
  );

export const pedidoResponseSchema = z
  .object({ success: z.boolean().optional().default(true), data: pedidoSchema })
  .or(
    pedidoSchema.transform((value) => ({
      success: true,
      data: value
    }))
  );

export const createPedidoPayloadSchema = z.object({
  proveedorId: numberLikeSchema.int().positive(),
  observacion: z.string().trim().optional(),
  items: z.array(z.object({
    productoId: numberLikeSchema.int().positive(),
    cantidadPedida: numberLikeSchema.positive()
  })).min(1)
});

export type Pedido = z.infer<typeof pedidoSchema>;
export type PedidosListParams = z.infer<typeof pedidosListParamsSchema>;
export type CreatePedidoPayload = z.infer<typeof createPedidoPayloadSchema>;
