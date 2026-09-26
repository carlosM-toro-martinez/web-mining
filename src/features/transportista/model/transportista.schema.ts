import { z } from "zod";

export const tipoEntidadTransportistaSchema = z.enum(["EMPRESA", "TRABAJADOR_PARTICULAR"]);

export const transportistaSchema = z.object({
  id: z.number().int().positive(),
  tipoEntidad: tipoEntidadTransportistaSchema,
  nombreORazonSocial: z.string().min(1),
  nitOCi: z.string().min(1),
  banco: z.string().nullable().optional(),
  numeroCuenta: z.string().nullable().optional(),
  cuentaContableId: z.number().int().positive().nullable(),
  activo: z.boolean()
});

export const createTransportistaPayloadSchema = z.object({
  tipoEntidad: tipoEntidadTransportistaSchema,
  nombreORazonSocial: z.string().trim().min(1, "El nombre o razón social es obligatorio."),
  nitOCi: z.string().trim().min(1, "El NIT o CI es obligatorio."),
  banco: z.string().trim().min(1).nullable().optional(),
  numeroCuenta: z.string().trim().min(1).nullable().optional(),
  activo: z.boolean().optional()
});

export const updateTransportistaPayloadSchema = createTransportistaPayloadSchema.partial();

export const transportistaListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(transportistaSchema)
});
export const transportistaResponseSchema = z.object({
  success: z.boolean(),
  data: transportistaSchema
});
export const transportistaDeleteResponseSchema = z.object({ success: z.boolean() });

export type TipoEntidadTransportista = z.infer<typeof tipoEntidadTransportistaSchema>;
export type Transportista = z.infer<typeof transportistaSchema>;
export type CreateTransportistaPayload = z.infer<typeof createTransportistaPayloadSchema>;
export type UpdateTransportistaPayload = z.infer<typeof updateTransportistaPayloadSchema>;
