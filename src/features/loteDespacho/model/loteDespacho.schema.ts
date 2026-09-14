import { z } from "zod";

export const estadoLoteDespachoSchema = z.enum([
  "REGISTRADO",
  "EN_TRANSITO",
  "EN_BALANZA",
  "PESADO",
  "ACOPIADO",
  "LIQUIDADO",
  "ANULADO"
]);

export const estadoFormulario101Schema = z.enum(["PENDIENTE", "REGULARIZADO"]);

const refConNombre = z.object({ id: z.number().int().positive(), nombre: z.string().min(1) });
const remitenteRef = z.object({ id: z.number().int().positive(), nombreORazonSocial: z.string().min(1) });
const vehiculoRef = z.object({ id: z.number().int().positive(), placa: z.string().min(1), tipo: z.string().min(1) });
const choferRef = z.object({ id: z.number().int().positive(), nombre: z.string().min(1) });

export const conocimientoCargaSchema = z.object({
  id: z.string().min(1),
  copiasEmitidas: z.record(z.string(), z.boolean()).or(z.unknown()),
  createdAt: z.string()
});

export const pesajeIngenioSchema = z.object({
  id: z.string().min(1),
  tonelajeBruto: z.union([z.string(), z.number()]),
  tonelajeTara: z.union([z.string(), z.number()]),
  tonelajeNeto: z.union([z.string(), z.number()]),
  fechaPesaje: z.string()
});

export const anulacionLoteSchema = z.object({
  id: z.string().min(1),
  motivo: z.string().min(1),
  createdAt: z.string()
});

export const loteDespachoSchema = z.object({
  id: z.string().min(1),
  correlativo: z.string().min(1),
  municipioOrigenId: z.number().int().positive(),
  remitenteId: z.number().int().positive(),
  vehiculoId: z.number().int().positive(),
  choferId: z.number().int().positive(),
  tipoMineralId: z.number().int().positive(),
  destinoIngenioId: z.number().int().positive(),
  nivel: z.string().nullable().optional(),
  fechaDespachoReal: z.string(),
  fechaDocumentalFiscal: z.string(),
  codigoFormulario101: z.string().nullable(),
  estadoFormulario101: estadoFormulario101Schema,
  estadoLote: estadoLoteDespachoSchema,
  createdAt: z.string(),
  municipioOrigen: refConNombre.optional(),
  remitente: remitenteRef.optional(),
  vehiculo: vehiculoRef.optional(),
  chofer: choferRef.optional(),
  tipoMineral: refConNombre.optional(),
  destinoIngenio: refConNombre.optional(),
  conocimientoCarga: conocimientoCargaSchema.nullable().optional(),
  pesaje: pesajeIngenioSchema.nullable().optional(),
  anulacion: anulacionLoteSchema.nullable().optional()
});

export const createLoteDespachoPayloadSchema = z.object({
  municipioOrigenId: z.number().int().positive("Debes elegir un municipio de origen."),
  remitenteId: z.number().int().positive("Debes elegir un remitente."),
  vehiculoId: z.number().int().positive("Debes elegir un vehículo disponible."),
  choferId: z.number().int().positive("Debes elegir un chofer."),
  tipoMineralId: z.number().int().positive("Debes elegir un tipo de mineral."),
  destinoIngenioId: z.number().int().positive("Debes elegir un ingenio destino."),
  nivel: z.string().trim().optional(),
  fechaDespachoReal: z.string().min(1, "La fecha de despacho real es obligatoria."),
  fechaDocumentalFiscal: z.string().trim().optional(),
  codigoFormulario101: z.string().trim().optional()
});

export const regularizarF101PayloadSchema = z.object({
  codigoFormulario101: z.string().trim().min(1, "El código del Formulario 101 es obligatorio.")
});

export const avanzarEstadoLotePayloadSchema = z.object({
  estado: z.enum(["EN_TRANSITO", "EN_BALANZA"])
});

export const registrarPesajePayloadSchema = z.object({
  tonelajeBruto: z.number().positive("El tonelaje bruto debe ser mayor a cero."),
  tonelajeTara: z.number().nonnegative("El tara no puede ser negativo.")
});

export const anularLotePayloadSchema = z.object({
  motivo: z.string().trim().min(1, "Debes indicar el motivo de la anulación.")
});

export const loteDespachoListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(loteDespachoSchema),
  meta: z
    .object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() })
    .optional()
});
export const loteDespachoResponseSchema = z.object({ success: z.boolean(), data: loteDespachoSchema });

export type EstadoLoteDespacho = z.infer<typeof estadoLoteDespachoSchema>;
export type EstadoFormulario101 = z.infer<typeof estadoFormulario101Schema>;
export type LoteDespacho = z.infer<typeof loteDespachoSchema>;
export type CreateLoteDespachoPayload = z.infer<typeof createLoteDespachoPayloadSchema>;
export type RegularizarF101Payload = z.infer<typeof regularizarF101PayloadSchema>;
export type AvanzarEstadoLotePayload = z.infer<typeof avanzarEstadoLotePayloadSchema>;
export type RegistrarPesajePayload = z.infer<typeof registrarPesajePayloadSchema>;
export type AnularLotePayload = z.infer<typeof anularLotePayloadSchema>;
