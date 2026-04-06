import { z } from "zod";

export const muestraResultadoSchema = z.object({
  elemento: z.string().trim().min(1, "El elemento es obligatorio."),
  valor: z.number({ message: "El valor del resultado debe ser numerico." })
});

export const exploracionMuestraPayloadSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  numero: z.number().int().optional(),
  tipoMuestra: z.string().optional(),
  sector: z.string().optional(),
  laboratorio1: z.string().optional(),
  laboratorio2: z.string().optional(),
  laboratorio3: z.string().optional(),
  fechaMuestreo: z.string().datetime().optional(),
  fechaEntrega: z.string().datetime().optional(),
  descripcion: z.string().optional(),
  ubicacion: z.object({
    nivel: z.string().min(1, "El nivel es obligatorio."),
    este: z.number().optional(),
    norte: z.number().optional(),
    elevacion: z.number().optional(),
    referenciaLugar: z.string().optional()
  }),
  resultados: z
    .array(
      z.object({
        elemento: z.string().min(1),
        valor: z.number()
      })
    )
    .optional()
});

export const elementoCatalogSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(1),
  unidad: z.string().nullable().optional()
});

const muestraUbicacionResponseSchema = z.object({
  id: z.string().optional(),
  nivel: z.string(),
  este: z.number().nullable().optional(),
  norte: z.number().nullable().optional(),
  elevacion: z.number().nullable().optional(),
  referenciaLugar: z.string().nullable().optional(),
  createdAt: z.string().optional()
});

const muestraResultadoResponseSchema = z.object({
  id: z.string().optional(),
  muestraId: z.string().optional(),
  elementoId: z.string().optional(),
  valor: z.number(),
  createdAt: z.string().optional(),
  elemento: elementoCatalogSchema
});

const muestraUsuarioResponseSchema = z
  .object({
    id: z.number().optional(),
    nombre: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    role: z.string().nullable().optional()
  })
  .passthrough();

export const exploracionMuestraResponseSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  numero: z.number().int().nullable().optional(),
  tipoMuestra: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  laboratorio1: z.string().nullable().optional(),
  laboratorio2: z.string().nullable().optional(),
  laboratorio3: z.string().nullable().optional(),
  fechaMuestreo: z.string().nullable().optional(),
  fechaEntrega: z.string().nullable().optional(),
  descripcion: z.string().nullable().optional(),
  usuarioId: z.number().optional(),
  ubicacionId: z.string().optional(),
  createdAt: z.string().optional(),
  ubicacion: muestraUbicacionResponseSchema,
  resultados: z.array(muestraResultadoResponseSchema).optional().default([]),
  usuario: muestraUsuarioResponseSchema.nullable().optional()
});

export const exploracionMuestraWriteResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
  data: exploracionMuestraResponseSchema.optional()
});

export const exploracionMuestrasTodasResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(exploracionMuestraResponseSchema).default([])
});

export const exploracionElementosResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(elementoCatalogSchema).default([])
});

export const exploracionLaboratoriosResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(z.string()).default([])
});

export type MuestraResultado = z.infer<typeof muestraResultadoSchema>;
export type ExploracionMuestraPayload = z.infer<typeof exploracionMuestraPayloadSchema>;
export type ExploracionMuestraResponse = z.infer<typeof exploracionMuestraResponseSchema>;
export type ExploracionMuestraWriteResponse = z.infer<typeof exploracionMuestraWriteResponseSchema>;
export type ExploracionMuestrasTodasResponse = z.infer<
  typeof exploracionMuestrasTodasResponseSchema
>;
export type ExploracionElementosResponse = z.infer<typeof exploracionElementosResponseSchema>;
export type ExploracionLaboratoriosResponse = z.infer<
  typeof exploracionLaboratoriosResponseSchema
>;
