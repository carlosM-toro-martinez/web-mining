import { z } from "zod";

export const estadoVehiculoSchema = z.enum([
  "DISPONIBLE",
  "EN_TRANSITO",
  "EN_BALANZA",
  "CON_FALLA_MECANICA",
  "EN_MANTENIMIENTO"
]);

const transportistaRefSchema = z.object({
  id: z.number().int().positive(),
  nombreORazonSocial: z.string().min(1)
});

export const vehiculoSchema = z.object({
  id: z.number().int().positive(),
  placa: z.string().min(1),
  tipo: z.string().min(1),
  capacidadTon: z.union([z.string(), z.number()]),
  propietarioId: z.number().int().positive().nullable(),
  estadoActual: estadoVehiculoSchema,
  activo: z.boolean(),
  propietario: transportistaRefSchema.nullable().optional()
});

export const createVehiculoPayloadSchema = z.object({
  placa: z.string().trim().min(1, "La placa es obligatoria."),
  tipo: z.string().trim().min(1, "El tipo de vehículo es obligatorio."),
  capacidadTon: z.number().positive("La capacidad debe ser mayor a cero."),
  propietarioId: z.number().int().positive().nullable().optional(),
  activo: z.boolean().optional()
});

export const updateVehiculoPayloadSchema = createVehiculoPayloadSchema.partial();

export const cambiarEstadoVehiculoPayloadSchema = z.object({
  estado: estadoVehiculoSchema,
  motivo: z.string().trim().min(1).optional()
});

export const estadoFlotaHistoricoSchema = z.object({
  id: z.string().min(1),
  vehiculoId: z.number().int().positive(),
  estado: estadoVehiculoSchema,
  motivo: z.string().nullable(),
  origenCambio: z.enum(["MANUAL", "API_GPS"]),
  usuarioId: z.number().int().positive(),
  createdAt: z.string()
});

export const choferSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1),
  ci: z.string().min(1),
  licencia: z.string().nullable(),
  activo: z.boolean()
});

export const createChoferPayloadSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  ci: z.string().trim().min(1, "El CI es obligatorio."),
  licencia: z.string().trim().optional(),
  activo: z.boolean().optional()
});

export const updateChoferPayloadSchema = createChoferPayloadSchema.partial();

export const vehiculoListResponseSchema = z.object({ success: z.boolean(), data: z.array(vehiculoSchema) });
export const vehiculoResponseSchema = z.object({ success: z.boolean(), data: vehiculoSchema });
export const estadoFlotaHistoricoListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(estadoFlotaHistoricoSchema)
});
export const choferListResponseSchema = z.object({ success: z.boolean(), data: z.array(choferSchema) });
export const choferResponseSchema = z.object({ success: z.boolean(), data: choferSchema });

export type EstadoVehiculo = z.infer<typeof estadoVehiculoSchema>;
export type Vehiculo = z.infer<typeof vehiculoSchema>;
export type VehiculoListResponse = z.infer<typeof vehiculoListResponseSchema>;
export type CreateVehiculoPayload = z.infer<typeof createVehiculoPayloadSchema>;
export type UpdateVehiculoPayload = z.infer<typeof updateVehiculoPayloadSchema>;
export type CambiarEstadoVehiculoPayload = z.infer<typeof cambiarEstadoVehiculoPayloadSchema>;
export type EstadoFlotaHistorico = z.infer<typeof estadoFlotaHistoricoSchema>;
export type Chofer = z.infer<typeof choferSchema>;
export type CreateChoferPayload = z.infer<typeof createChoferPayloadSchema>;
export type UpdateChoferPayload = z.infer<typeof updateChoferPayloadSchema>;
