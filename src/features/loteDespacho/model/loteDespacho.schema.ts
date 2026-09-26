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

export const estadoFormulario101Schema = z.enum(["DISPONIBLE", "VINCULADO", "ANULADO"]);

const refConNombre = z.object({ id: z.number().int().positive(), nombre: z.string().min(1) });
const transportistaRef = z.object({ id: z.number().int().positive(), nombreORazonSocial: z.string().min(1) });
const vehiculoRef = z.object({ id: z.number().int().positive(), placa: z.string().min(1), tipo: z.string().min(1) });
const choferRef = z.object({ id: z.number().int().positive(), nombre: z.string().min(1) });

export const conocimientoCargaSchema = z.object({
  id: z.string().min(1),
  fecha: z.string(),
  detalleCarga: z.string().min(1),
  descripcion: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
  copiasEmitidas: z.record(z.string(), z.boolean()).or(z.unknown()),
  createdAt: z.string()
});

export const formulario101RefSchema = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1),
  fecha: z.string(),
  estado: estadoFormulario101Schema,
  loteId: z.string().nullable().optional(),
  createdAt: z.string(),
  anulacion: z
    .object({ id: z.string().min(1), motivo: z.string().min(1), peticionEnviada: z.boolean(), createdAt: z.string() })
    .nullable()
    .optional()
});

export const pesajeIngenioSchema = z.object({
  id: z.string().min(1),
  tonelajeBruto: z.union([z.string(), z.number()]),
  tonelajeTara: z.union([z.string(), z.number()]),
  tonelajeNeto: z.union([z.string(), z.number()]),
  fechaPesaje: z.string(),
  observaciones: z.string().nullable().optional()
});

export const anulacionLoteSchema = z.object({
  id: z.string().min(1),
  motivo: z.string().min(1),
  createdAt: z.string()
});

export const transbordoLoteSchema = z.object({
  id: z.string().min(1),
  vehiculoOriginal: vehiculoRef.optional(),
  vehiculoNuevo: vehiculoRef.optional(),
  choferNuevo: choferRef.nullable().optional(),
  motivo: z.string().min(1),
  createdAt: z.string()
});

export const loteDespachoSchema = z.object({
  id: z.string().min(1),
  correlativo: z.string().min(1),
  municipioOrigenId: z.number().int().positive(),
  transportistaId: z.number().int().positive(),
  vehiculoId: z.number().int().positive(),
  choferId: z.number().int().positive(),
  tipoMineralId: z.number().int().positive(),
  destinoIngenioId: z.number().int().positive(),
  nivel: z.string().nullable().optional(),
  fechaDespachoReal: z.string(),
  fechaDocumentalFiscal: z.string(),
  estadoLote: estadoLoteDespachoSchema,
  createdAt: z.string(),
  municipioOrigen: refConNombre.optional(),
  transportista: transportistaRef.optional(),
  vehiculo: vehiculoRef.optional(),
  chofer: choferRef.optional(),
  tipoMineral: refConNombre.optional(),
  destinoIngenio: refConNombre.optional(),
  conocimientoCarga: conocimientoCargaSchema.nullable().optional(),
  formulario101: formulario101RefSchema.nullable().optional(),
  pesaje: pesajeIngenioSchema.nullable().optional(),
  anulacion: anulacionLoteSchema.nullable().optional(),
  transbordos: z.array(transbordoLoteSchema).optional()
});

export const createLoteDespachoPayloadSchema = z.object({
  municipioOrigenId: z.number().int().positive("Debes elegir un municipio de origen."),
  transportistaId: z.number().int().positive("Debes elegir un transportista."),
  vehiculoId: z.number().int().positive("Debes elegir un vehículo disponible."),
  choferId: z.number().int().positive("Debes elegir un chofer."),
  tipoMineralId: z.number().int().positive("Debes elegir un tipo de mineral."),
  destinoIngenioId: z.number().int().positive("Debes elegir un ingenio destino."),
  nivel: z.string().trim().optional(),
  fechaDespachoReal: z.string().min(1, "La fecha de despacho real es obligatoria."),
  fechaDocumentalFiscal: z.string().trim().optional(),
  conocimientoFecha: z.string().trim().optional(),
  detalleCarga: z.string().trim().optional(),
  descripcion: z.string().trim().optional(),
  observaciones: z.string().trim().optional()
});

export const avanzarEstadoLotePayloadSchema = z.object({
  estado: z.enum(["EN_TRANSITO", "EN_BALANZA"])
});

export const registrarPesajePayloadSchema = z.object({
  tonelajeBruto: z.number().positive("El tonelaje bruto debe ser mayor a cero."),
  tonelajeTara: z.number().nonnegative("El tara no puede ser negativo."),
  observaciones: z.string().trim().optional()
});

export const anularLotePayloadSchema = z.object({
  motivo: z.string().trim().min(1, "Debes indicar el motivo de la anulación.")
});

export const transbordarLotePayloadSchema = z.object({
  vehiculoNuevoId: z.number().int().positive("Debes elegir el vehículo que completa el traslado."),
  choferNuevoId: z.number().int().positive().optional(),
  motivo: z.string().trim().min(1, "Debes indicar el motivo del transbordo.")
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
export type AvanzarEstadoLotePayload = z.infer<typeof avanzarEstadoLotePayloadSchema>;
export type RegistrarPesajePayload = z.infer<typeof registrarPesajePayloadSchema>;
export type AnularLotePayload = z.infer<typeof anularLotePayloadSchema>;
export type TransbordarLotePayload = z.infer<typeof transbordarLotePayloadSchema>;
