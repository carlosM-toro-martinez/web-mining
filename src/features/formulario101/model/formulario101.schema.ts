import { z } from "zod";

export const estadoFormulario101Schema = z.enum(["DISPONIBLE", "VINCULADO", "ANULADO"]);

const loteRef = z.object({
  id: z.string().min(1),
  correlativo: z.string().min(1),
  estadoLote: z.string().min(1),
  transportista: z.object({ id: z.number().int().positive(), nombreORazonSocial: z.string().min(1) }).optional(),
  vehiculo: z.object({ id: z.number().int().positive(), placa: z.string().min(1) }).optional()
});

export const anulacionFormulario101Schema = z.object({
  id: z.string().min(1),
  motivo: z.string().min(1),
  peticionEnviada: z.boolean(),
  createdAt: z.string()
});

export const formulario101Schema = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1),
  fecha: z.string(),
  estado: estadoFormulario101Schema,
  loteId: z.string().nullable().optional(),
  createdAt: z.string(),
  lote: loteRef.nullable().optional(),
  anulacion: anulacionFormulario101Schema.nullable().optional()
});

export const vincularFormulario101PayloadSchema = z.object({
  codigo: z.string().trim().min(1, "El código del Formulario 101 es obligatorio."),
  fecha: z.string().min(1, "La fecha del Formulario 101 es obligatoria.")
});

export const reutilizarFormulario101PayloadSchema = z.object({
  loteId: z.string().uuid("Debes elegir el lote destino.")
});

export const anularFormulario101PayloadSchema = z.object({
  motivo: z.string().trim().min(1, "Debes indicar el motivo de la anulación.")
});

export const formulario101ListResponseSchema = z.object({ success: z.boolean(), data: z.array(formulario101Schema) });
export const formulario101ResponseSchema = z.object({ success: z.boolean(), data: formulario101Schema });
export const anulacionFormulario101ResponseSchema = z.object({ success: z.boolean(), data: anulacionFormulario101Schema });

export type EstadoFormulario101 = z.infer<typeof estadoFormulario101Schema>;
export type Formulario101 = z.infer<typeof formulario101Schema>;
export type VincularFormulario101Payload = z.infer<typeof vincularFormulario101PayloadSchema>;
export type ReutilizarFormulario101Payload = z.infer<typeof reutilizarFormulario101PayloadSchema>;
export type AnularFormulario101Payload = z.infer<typeof anularFormulario101PayloadSchema>;
