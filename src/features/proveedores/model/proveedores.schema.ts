import { z } from "zod";

const numberLikeSchema = z.coerce.number();

export const proveedorSchema = z.object({
  id: numberLikeSchema.int().positive(),
  nombre: z.string().trim().min(1),
  lugar: z.string().trim().optional().nullable(),
  contacto: z.string().trim().optional().nullable(),
  razonSocial: z.string().trim().optional().nullable(),
  nit: z.string().trim().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable()
});

const proveedorCompraItemSchema = z.object({
  id: z.string(),
  cantidadPedida: z.coerce.number().optional().nullable(),
  cantidadRecibida: z.coerce.number().optional().nullable(),
  precioUnit: z.coerce.number().optional().nullable(),
  producto: z
    .object({
      id: numberLikeSchema.int().positive(),
      codigo: z.string().optional().nullable(),
      nombre: z.string().optional().nullable(),
      unidad: z.string().optional().nullable()
    })
    .optional()
    .nullable()
});

const proveedorCompraSchema = z.object({
  id: z.string(),
  numeroFactura: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  observacion: z.string().optional().nullable(),
  descuento: z.coerce.number().optional().nullable(),
  fechaOperacion: z.string().optional().nullable(),
  recibidoAt: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  items: z.array(proveedorCompraItemSchema).optional().default([])
});

export const proveedorDetailSchema = proveedorSchema.extend({
  compras: z.array(proveedorCompraSchema).optional().default([])
});

export const proveedoresListResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(proveedorSchema),
  meta: z
    .object({
      page: numberLikeSchema.int().positive(),
      limit: numberLikeSchema.int().positive(),
      total: numberLikeSchema.int().nonnegative(),
      totalPages: numberLikeSchema.int().positive()
    })
    .optional()
});

export const proveedorResponseSchema = z
  .object({
    success: z.boolean().optional().default(true),
    data: proveedorSchema
  })
  .or(
    proveedorSchema.transform((data) => ({
      success: true,
      data
    }))
  );

export const proveedorDetailResponseSchema = z
  .object({
    success: z.boolean().optional().default(true),
    data: proveedorDetailSchema.nullable()
  })
  .or(
    proveedorDetailSchema.nullable().transform((data) => ({
      success: true,
      data
    }))
  );

export const createProveedorPayloadSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre del proveedor es obligatorio."),
  lugar: z.string().trim().min(1, "El lugar del proveedor es obligatorio."),
  contacto: z.string().trim().optional(),
  razonSocial: z.string().trim().optional(),
  nit: z.string().trim().optional()
});

export const updateProveedorPayloadSchema = createProveedorPayloadSchema.partial().refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  "Debes enviar al menos un campo para actualizar."
);

export const proveedoresQueryParamsSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(50),
  search: z.string().trim().optional()
});

export type Proveedor = z.infer<typeof proveedorSchema>;
export type ProveedorDetail = z.infer<typeof proveedorDetailSchema>;
export type CreateProveedorPayload = z.infer<typeof createProveedorPayloadSchema>;
export type UpdateProveedorPayload = z.infer<typeof updateProveedorPayloadSchema>;
export type ProveedoresQueryParams = z.infer<typeof proveedoresQueryParamsSchema>;
