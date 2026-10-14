import { z } from "zod";
import { getRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";

const numero = z.union([z.string(), z.number()]).transform(Number);

const cuadreSaldoSchema = z.object({
  id: z.string(),
  fechaCorte: z.string(),
  saldoSistema: numero,
  saldoReal: numero,
  diferencia: numero,
  motivo: z.string(),
  createdAt: z.string(),
  caja: z.object({ id: z.number(), nombre: z.string(), monedaBase: z.string() }).nullable().optional(),
  cuentaBancaria: z
    .object({ id: z.number(), banco: z.string(), nombreCuenta: z.string(), monedaBase: z.string() })
    .nullable()
    .optional(),
  usuario: z.object({ id: z.number(), nombre: z.string() }).nullable().optional()
});
export type CuadreSaldo = z.infer<typeof cuadreSaldoSchema>;

const previsualizacionSchema = z.object({
  success: z.boolean(),
  data: z.object({ saldoSistema: z.number(), moneda: z.string(), nombre: z.string() })
});

export interface DestinoCuadre {
  cajaId?: number;
  cuentaBancariaId?: number;
}

export async function getCuadresSaldo() {
  return getRequest({
    url: apiEndpoints.cajaChica.cuadresSaldo,
    schema: z.object({ success: z.boolean(), data: z.array(cuadreSaldoSchema) })
  });
}

export async function previsualizarCuadre(params: DestinoCuadre & { fechaCorte: string }) {
  return getRequest({ url: apiEndpoints.cajaChica.cuadresSaldoPrevisualizar, config: { params }, schema: previsualizacionSchema });
}

export async function crearCuadreSaldo(body: DestinoCuadre & { fechaCorte: string; saldoReal: number; motivo: string }) {
  return postRequest({
    url: apiEndpoints.cajaChica.cuadresSaldo,
    body,
    schema: z.object({ success: z.boolean(), data: z.object({ id: z.string() }) })
  });
}
