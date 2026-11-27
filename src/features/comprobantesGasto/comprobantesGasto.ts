import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { tipoDocumentoGastoSchema, type TipoDocumentoGasto } from "@/features/gastoCaja/model/gastoCaja.schema";
import { deleteRequest, getRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/lib/queryKeys";

// Opciones de "¿Qué comprobante te dieron?", editables en Parámetros. El
// nombre es libre; el tratamiento define qué impuestos calcula el sistema.
const comprobanteGastoSchema = z.object({
  id: z.number().int().nonnegative(),
  nombre: z.string(),
  ayuda: z.string().nullable().optional(),
  tratamiento: tipoDocumentoGastoSchema,
  activo: z.boolean(),
  orden: z.number()
});
export type ComprobanteGasto = z.infer<typeof comprobanteGastoSchema>;
export type ComprobanteGastoPayload = Partial<Pick<ComprobanteGasto, "nombre" | "ayuda" | "tratamiento" | "activo">>;

export const TRATAMIENTO_LABEL: Record<TipoDocumentoGasto, string> = {
  PLANILLA: "Sin impuestos (deducible)",
  RECIBO_DIRECTO: "Sin impuestos (no deducible)",
  RECIBO: "Recibo: pide número, sin impuestos",
  FACTURA: "Factura: pide número, crédito fiscal IVA",
  CONTRATO_RETENCION: "Con retención de impuestos"
};

// Se usan solo si la lista no se pudo cargar (por ejemplo, sin conexión).
export const COMPROBANTES_BASE: ComprobanteGasto[] = (
  [
    ["FACTURA", "Factura"],
    ["RECIBO", "Recibo (sin crédito fiscal)"],
    ["CONTRATO_RETENCION", "Sin factura, con retención"],
    ["RECIBO_DIRECTO", "Sin comprobante"],
    ["PLANILLA", "Por planilla"]
  ] as const
).map(([tratamiento, nombre], orden) => ({ id: 0, nombre, tratamiento, activo: true, orden }));

const listResponse = z.object({ success: z.boolean(), data: z.array(comprobanteGastoSchema) });
const itemResponse = z.object({ success: z.boolean(), data: comprobanteGastoSchema });
const deleteResponse = z.object({ success: z.boolean() });

export function useComprobantesGastoQuery() {
  return useQuery({
    queryKey: queryKeys.parametrosCajaChica.comprobantesGasto(),
    queryFn: () => getRequest({ url: apiEndpoints.cajaChica.comprobantesGasto, schema: listResponse })
  });
}

function useCambioComprobante<T>(mutationFn: (variables: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.comprobantesGasto() });
    }
  });
}

export function useCreateComprobanteGastoMutation() {
  return useCambioComprobante((body: ComprobanteGastoPayload) =>
    postRequest({ url: apiEndpoints.cajaChica.comprobantesGasto, body, schema: itemResponse })
  );
}
export function useUpdateComprobanteGastoMutation() {
  return useCambioComprobante(({ id, payload }: { id: number; payload: ComprobanteGastoPayload }) =>
    putRequest({ url: apiEndpoints.cajaChica.comprobanteGastoById(id), body: payload, schema: itemResponse })
  );
}
export function useDeleteComprobanteGastoMutation() {
  return useCambioComprobante((id: number) =>
    deleteRequest({ url: apiEndpoints.cajaChica.comprobanteGastoById(id), schema: deleteResponse })
  );
}
