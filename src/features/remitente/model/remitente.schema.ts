import { z } from "zod";

export const tipoEntidadRemitenteSchema = z.enum(["EMPRESA", "TRABAJADOR_PARTICULAR"]);

const municipioRefSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1)
});

export const remitenteSchema = z.object({
  id: z.number().int().positive(),
  tipoEntidad: tipoEntidadRemitenteSchema,
  nombreORazonSocial: z.string().min(1),
  nitOCi: z.string().min(1),
  municipioId: z.number().int().positive().nullable(),
  cuentaContableId: z.number().int().positive().nullable(),
  activo: z.boolean(),
  municipio: municipioRefSchema.nullable().optional()
});

export const createRemitentePayloadSchema = z.object({
  tipoEntidad: tipoEntidadRemitenteSchema,
  nombreORazonSocial: z.string().trim().min(1, "El nombre o razón social es obligatorio."),
  nitOCi: z.string().trim().min(1, "El NIT o CI es obligatorio."),
  municipioId: z.number().int().positive().nullable().optional(),
  activo: z.boolean().optional()
});

export const updateRemitentePayloadSchema = createRemitentePayloadSchema.partial();

export const remitenteListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(remitenteSchema)
});
export const remitenteResponseSchema = z.object({
  success: z.boolean(),
  data: remitenteSchema
});
export const remitenteDeleteResponseSchema = z.object({ success: z.boolean() });

export type TipoEntidadRemitente = z.infer<typeof tipoEntidadRemitenteSchema>;
export type Remitente = z.infer<typeof remitenteSchema>;
export type CreateRemitentePayload = z.infer<typeof createRemitentePayloadSchema>;
export type UpdateRemitentePayload = z.infer<typeof updateRemitentePayloadSchema>;
