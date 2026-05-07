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

export const proveedorResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: proveedorSchema
});

export const createProveedorPayloadSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre del proveedor es obligatorio."),
  lugar: z.string().trim().min(1, "El lugar del proveedor es obligatorio."),
  contacto: z.string().trim().optional(),
  razonSocial: z.string().trim().optional(),
  nit: z.string().trim().optional()
});

export const proveedoresQueryParamsSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(50),
  search: z.string().trim().optional()
});

export type Proveedor = z.infer<typeof proveedorSchema>;
export type CreateProveedorPayload = z.infer<typeof createProveedorPayloadSchema>;
export type ProveedoresQueryParams = z.infer<typeof proveedoresQueryParamsSchema>;
