import { z } from "zod";

const numberLikeSchema = z.coerce.number();
const optionalNumberSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  numberLikeSchema.optional()
);

export const puntoAmbientalTipoSchema = z.enum([
  "HIDRICO",
  "SUELO",
  "RUIDO",
  "RESIDUOS",
  "POZO_SEPTICO",
  "GENERAL"
]);

export const calidadAguaSchema = z.enum(["EXCELENTE", "BUENA", "REGULAR", "MALA", "CRITICA"]);
export const estadoPozoSchema = z.enum(["BUENO", "REGULAR", "MALO", "CRITICO"]);
export const tipoResiduoSchema = z.enum([
  "SOLIDO_PELIGROSO",
  "SOLIDO_NO_PELIGROSO",
  "LIQUIDO_PELIGROSO",
  "LIQUIDO_NO_PELIGROSO"
]);

const usuarioSchema = z.object({ id: numberLikeSchema.optional(), nombre: z.string().optional().nullable() }).optional().nullable();

export const puntoAmbientalSchema = z.object({
  id: numberLikeSchema,
  nombre: z.string(),
  descripcion: z.string().optional().nullable(),
  tipo: puntoAmbientalTipoSchema.default("GENERAL"),
  latitud: numberLikeSchema,
  longitud: numberLikeSchema,
  activo: z.boolean().optional().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

const puntoResumenSchema = puntoAmbientalSchema.pick({
  id: true,
  nombre: true,
  tipo: true,
  latitud: true,
  longitud: true
});

export const registroHidricoSchema = z.object({
  id: numberLikeSchema,
  puntoId: numberLikeSchema.optional(),
  fecha: z.string(),
  ph: numberLikeSchema.optional().nullable(),
  turbidez: numberLikeSchema.optional().nullable(),
  conductividad: numberLikeSchema.optional().nullable(),
  oxigenoDisuelto: numberLikeSchema.optional().nullable(),
  temperatura: numberLikeSchema.optional().nullable(),
  coliformesFecales: numberLikeSchema.optional().nullable(),
  calidadAgua: calidadAguaSchema.optional().nullable(),
  observaciones: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  punto: puntoResumenSchema.optional().nullable(),
  usuario: usuarioSchema
});

export const registroRuidoSchema = z.object({
  id: numberLikeSchema,
  puntoId: numberLikeSchema.optional(),
  fecha: z.string(),
  nivelRuido: numberLikeSchema.optional().nullable(),
  limitePermitido: numberLikeSchema.optional().nullable(),
  particulasPm10: numberLikeSchema.optional().nullable(),
  particulasPm25: numberLikeSchema.optional().nullable(),
  observaciones: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  punto: puntoResumenSchema.optional().nullable(),
  usuario: usuarioSchema
});

export const registroSueloSchema = z.object({
  id: numberLikeSchema,
  puntoId: numberLikeSchema.optional(),
  fecha: z.string(),
  ph: numberLikeSchema.optional().nullable(),
  conductividad: numberLikeSchema.optional().nullable(),
  materiaOrganica: numberLikeSchema.optional().nullable(),
  especiesRegistradas: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  punto: puntoResumenSchema.optional().nullable(),
  usuario: usuarioSchema
});

export const residuoSchema = z.object({
  id: numberLikeSchema,
  puntoId: numberLikeSchema.optional().nullable(),
  fecha: z.string(),
  tipoResiduo: tipoResiduoSchema,
  cantidad: numberLikeSchema,
  unidad: z.string(),
  disposicion: z.string(),
  empresa: z.string().optional().nullable(),
  manifiestoNum: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  punto: puntoResumenSchema.optional().nullable(),
  usuario: usuarioSchema
});

export const pozoSepticoSchema = z.object({
  id: numberLikeSchema,
  nombre: z.string(),
  descripcion: z.string().optional().nullable(),
  latitud: numberLikeSchema,
  longitud: numberLikeSchema,
  capacidadM3: numberLikeSchema.optional().nullable(),
  estado: estadoPozoSchema.optional().default("BUENO"),
  ultimaLimpieza: z.string().optional().nullable(),
  proximaLimpieza: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  activo: z.boolean().optional().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const manifiestoAmbientalSchema = z.object({
  id: numberLikeSchema,
  anio: numberLikeSchema.int(),
  titulo: z.string(),
  descripcion: z.string().optional().nullable(),
  objetivos: z.string().optional().nullable(),
  compromisos: z.string().optional().nullable(),
  responsable: z.string().optional().nullable(),
  aprobadoAt: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  usuario: usuarioSchema
});

export const dashboardAmbientalResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    resumen: z.object({
      puntosActivos: numberLikeSchema.default(0),
      totalPuntos: numberLikeSchema.default(0),
      pozosCriticos: numberLikeSchema.default(0),
      totalPozos: numberLikeSchema.default(0),
      totalRegistrosHidricos: numberLikeSchema.default(0),
      residuosUltimos30Dias: numberLikeSchema.default(0)
    }),
    ultimosRegistrosHidricos: z.array(registroHidricoSchema).default([])
  })
});

export const mapaAmbientalResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    puntos: z.array(
      puntoAmbientalSchema.extend({
        ultimoHidrico: registroHidricoSchema.pick({ fecha: true, calidadAgua: true, ph: true, temperatura: true, turbidez: true }).partial().nullable().optional(),
        ultimoRuido: registroRuidoSchema.pick({ fecha: true, nivelRuido: true, limitePermitido: true }).partial().nullable().optional(),
        ultimoSuelo: registroSueloSchema.pick({ fecha: true, ph: true, conductividad: true }).partial().nullable().optional()
      })
    ).default([]),
    pozos: z.array(pozoSepticoSchema).default([])
  })
});

const metaSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(20),
  total: numberLikeSchema.int().nonnegative().default(0),
  totalPages: numberLikeSchema.int().nonnegative().default(0)
});

export const puntosAmbientalesResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({ total: numberLikeSchema.default(0), puntos: z.array(puntoAmbientalSchema).default([]) })
});
export const puntoAmbientalResponseSchema = z.object({ success: z.boolean().optional(), data: puntoAmbientalSchema });
export const hidricoResponseSchema = z.object({ success: z.boolean().optional(), data: z.object({ meta: metaSchema, registros: z.array(registroHidricoSchema).default([]) }) });
export const hidricoItemResponseSchema = z.object({ success: z.boolean().optional(), data: registroHidricoSchema });
export const residuosResponseSchema = z.object({ success: z.boolean().optional(), data: z.object({ meta: metaSchema, registros: z.array(residuoSchema).default([]) }) });
export const residuoItemResponseSchema = z.object({ success: z.boolean().optional(), data: residuoSchema });
export const ruidoResponseSchema = z.object({ success: z.boolean().optional(), data: z.object({ meta: metaSchema, registros: z.array(registroRuidoSchema).default([]) }) });
export const ruidoItemResponseSchema = z.object({ success: z.boolean().optional(), data: registroRuidoSchema });
export const sueloResponseSchema = z.object({ success: z.boolean().optional(), data: z.object({ meta: metaSchema, registros: z.array(registroSueloSchema).default([]) }) });
export const sueloItemResponseSchema = z.object({ success: z.boolean().optional(), data: registroSueloSchema });
export const pozosResponseSchema = z.object({ success: z.boolean().optional(), data: z.object({ total: numberLikeSchema.default(0), pozos: z.array(pozoSepticoSchema).default([]) }) });
export const pozoItemResponseSchema = z.object({ success: z.boolean().optional(), data: pozoSepticoSchema });
export const manifiestosResponseSchema = z.object({ success: z.boolean().optional(), data: z.object({ total: numberLikeSchema.default(0), manifiestos: z.array(manifiestoAmbientalSchema).default([]) }) });
export const manifiestoItemResponseSchema = z.object({ success: z.boolean().optional(), data: manifiestoAmbientalSchema });
export const ambientalDeleteResponseSchema = z.object({ success: z.boolean().optional(), message: z.string().optional() });

export const puntosQuerySchema = z.object({ tipo: puntoAmbientalTipoSchema.optional(), activo: z.string().optional() });
export const pagedAmbientalQuerySchema = z.object({
  puntoId: optionalNumberSchema,
  desde: z.string().optional(),
  hasta: z.string().optional(),
  page: optionalNumberSchema.default(1),
  limit: optionalNumberSchema.default(20)
});

export const createPuntoAmbientalSchema = z.object({
  nombre: z.string().trim().min(1),
  descripcion: z.string().trim().optional(),
  latitud: numberLikeSchema,
  longitud: numberLikeSchema,
  tipo: puntoAmbientalTipoSchema.default("GENERAL")
});

export const createHidricoSchema = z.object({
  puntoId: numberLikeSchema.int().positive(),
  fecha: z.string().min(1),
  ph: optionalNumberSchema,
  turbidez: optionalNumberSchema,
  conductividad: optionalNumberSchema,
  oxigenoDisuelto: optionalNumberSchema,
  temperatura: optionalNumberSchema,
  coliformesFecales: optionalNumberSchema,
  calidadAgua: calidadAguaSchema.optional(),
  observaciones: z.string().trim().optional()
});

export const createPozoSchema = z.object({
  nombre: z.string().trim().min(1),
  descripcion: z.string().trim().optional(),
  latitud: numberLikeSchema,
  longitud: numberLikeSchema,
  capacidadM3: optionalNumberSchema,
  estado: estadoPozoSchema.default("BUENO"),
  ultimaLimpieza: z.string().optional(),
  proximaLimpieza: z.string().optional(),
  observaciones: z.string().trim().optional()
});

export const createManifiestoSchema = z.object({
  anio: numberLikeSchema.int(),
  titulo: z.string().trim().min(1),
  descripcion: z.string().trim().optional(),
  objetivos: z.string().trim().optional(),
  compromisos: z.string().trim().optional(),
  responsable: z.string().trim().optional(),
  aprobadoAt: z.string().optional()
});

export const createResiduoSchema = z.object({
  puntoId: optionalNumberSchema,
  fecha: z.string().min(1),
  tipoResiduo: tipoResiduoSchema,
  cantidad: numberLikeSchema,
  unidad: z.string().trim().min(1),
  disposicion: z.string().trim().min(1),
  empresa: z.string().trim().optional(),
  manifiestoNum: z.string().trim().optional(),
  observaciones: z.string().trim().optional()
});

export const createRuidoSchema = z.object({
  puntoId: numberLikeSchema.int().positive(),
  fecha: z.string().min(1),
  nivelRuido: numberLikeSchema,
  limitePermitido: optionalNumberSchema,
  particulasPm10: optionalNumberSchema,
  particulasPm25: optionalNumberSchema,
  observaciones: z.string().trim().optional()
});

export const createSueloSchema = z.object({
  puntoId: numberLikeSchema.int().positive(),
  fecha: z.string().min(1),
  ph: optionalNumberSchema,
  conductividad: optionalNumberSchema,
  materiaOrganica: optionalNumberSchema,
  especiesRegistradas: z.string().trim().optional(),
  observaciones: z.string().trim().optional()
});

export type PuntoAmbientalTipo = z.infer<typeof puntoAmbientalTipoSchema>;
export type CalidadAgua = z.infer<typeof calidadAguaSchema>;
export type EstadoPozo = z.infer<typeof estadoPozoSchema>;
export type TipoResiduo = z.infer<typeof tipoResiduoSchema>;
export type PuntoAmbiental = z.infer<typeof puntoAmbientalSchema>;
export type RegistroHidrico = z.infer<typeof registroHidricoSchema>;
export type RegistroRuido = z.infer<typeof registroRuidoSchema>;
export type RegistroSuelo = z.infer<typeof registroSueloSchema>;
export type ResiduoAmbiental = z.infer<typeof residuoSchema>;
export type PozoSeptico = z.infer<typeof pozoSepticoSchema>;
export type ManifiestoAmbiental = z.infer<typeof manifiestoAmbientalSchema>;
export type CreatePuntoAmbientalPayload = z.infer<typeof createPuntoAmbientalSchema>;
export type CreateHidricoPayload = z.infer<typeof createHidricoSchema>;
export type CreatePozoPayload = z.infer<typeof createPozoSchema>;
export type CreateManifiestoPayload = z.infer<typeof createManifiestoSchema>;
export type CreateResiduoPayload = z.infer<typeof createResiduoSchema>;
export type CreateRuidoPayload = z.infer<typeof createRuidoSchema>;
export type CreateSueloPayload = z.infer<typeof createSueloSchema>;
