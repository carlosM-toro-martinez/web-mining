import { z } from "zod";

const refConNombre = z.object({ id: z.number().int().positive(), nombre: z.string().min(1) });
const remitenteRef = z.object({ id: z.number().int().positive(), nombreORazonSocial: z.string().min(1) });

export const loteCuadroMensualSchema = z.object({
  id: z.string().min(1),
  correlativo: z.string().min(1),
  fechaDespachoReal: z.string(),
  fechaDocumentalFiscal: z.string(),
  codigoFormulario101: z.string().nullable(),
  estadoFormulario101: z.enum(["PENDIENTE", "REGULARIZADO"]),
  remitente: remitenteRef.optional(),
  tipoMineral: refConNombre.optional(),
  destinoIngenio: refConNombre.optional(),
  pesaje: z
    .object({ tonelajeBruto: z.union([z.string(), z.number()]), tonelajeNeto: z.union([z.string(), z.number()]) })
    .nullable()
    .optional()
});

export const cierreLogisticaMensualSchema = z.object({
  id: z.number().int().positive(),
  municipioId: z.number().int().positive(),
  anio: z.number().int().positive(),
  mes: z.number().int().min(1).max(12),
  createdAt: z.string()
});

export const cuadroMensualSchema = z.object({
  lotes: z.array(loteCuadroMensualSchema),
  resumen: z.object({
    totalLotes: z.number(),
    totalTonelajeNeto: z.number(),
    pendientesF101: z.number()
  }),
  cerrado: z.boolean(),
  cierre: cierreLogisticaMensualSchema.nullable()
});

export const cuadroMensualResponseSchema = z.object({ success: z.boolean(), data: cuadroMensualSchema });
export const cierresListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(cierreLogisticaMensualSchema)
});
export const cierreMensualResponseSchema = z.object({ success: z.boolean(), data: cierreLogisticaMensualSchema });

export type LoteCuadroMensual = z.infer<typeof loteCuadroMensualSchema>;
export type CuadroMensual = z.infer<typeof cuadroMensualSchema>;
export type CierreLogisticaMensual = z.infer<typeof cierreLogisticaMensualSchema>;
