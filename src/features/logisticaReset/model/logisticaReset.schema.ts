import { z } from "zod";

export const resumenResetLogisticaSchema = z.object({
  lotes: z.number(),
  liquidaciones: z.number(),
  vehiculos: z.number(),
  choferes: z.number(),
  transportistas: z.number(),
  municipios: z.number(),
  tiposMineral: z.number(),
  ingenios: z.number()
});

export const resetLogisticaResponseSchema = z.object({
  success: z.boolean(),
  data: resumenResetLogisticaSchema
});

export type ResumenResetLogistica = z.infer<typeof resumenResetLogisticaSchema>;
