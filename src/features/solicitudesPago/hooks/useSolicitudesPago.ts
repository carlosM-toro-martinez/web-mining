import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  anularSolicitud,
  createSolicitud,
  firmarSolicitud,
  getBeneficiarios,
  getDefaultsSolicitud,
  getResumenSolicitudes,
  getSolicitud,
  getSolicitudes,
  pagarSolicitud,
  quitarFirmaSolicitud,
  registrarEntrega,
  registrarFactura,
  revertirPago,
  updateSolicitud
} from "@/features/solicitudesPago/api/solicitudesPagoApi";
import type {
  EntregaPayload,
  FacturaPayload,
  PagarPayload,
  SolicitudPayload,
  SolicitudesQuery
} from "@/features/solicitudesPago/model/solicitudesPago.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useSolicitudesQuery(params: SolicitudesQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.solicitudesPago.list(params),
    queryFn: () => getSolicitudes(params),
    enabled,
    refetchOnMount: "always"
  });
}

export function useSolicitudQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.solicitudesPago.detail(id ?? ""),
    queryFn: () => getSolicitud(id as string),
    enabled: Boolean(id)
  });
}

export function useResumenSolicitudesQuery(params: Pick<SolicitudesQuery, "anio" | "mes">) {
  return useQuery({
    queryKey: queryKeys.solicitudesPago.resumen(params),
    queryFn: () => getResumenSolicitudes(params),
    refetchOnMount: "always"
  });
}

export function useDefaultsSolicitudQuery(anio: number, mes: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.solicitudesPago.defaults(anio, mes),
    queryFn: () => getDefaultsSolicitud(anio, mes),
    enabled,
    refetchOnMount: "always"
  });
}

export function useBeneficiariosQuery(search: string) {
  return useQuery({
    queryKey: queryKeys.solicitudesPago.beneficiarios(search),
    queryFn: () => getBeneficiarios(search),
    staleTime: 30_000
  });
}

// Toda escritura refresca el listado, el tablero y el detalle abierto
function useEscritura<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.solicitudesPago.all });
    }
  });
}

export const useCreateSolicitudMutation = () =>
  useEscritura((payload: SolicitudPayload) => createSolicitud(payload));

export const useUpdateSolicitudMutation = () =>
  useEscritura(({ id, payload }: { id: string; payload: SolicitudPayload }) => updateSolicitud(id, payload));

export const useFacturaSolicitudMutation = () =>
  useEscritura(({ id, payload }: { id: string; payload: FacturaPayload }) => registrarFactura(id, payload));

export const useEntregaSolicitudMutation = () =>
  useEscritura(({ id, payload }: { id: string; payload: EntregaPayload }) => registrarEntrega(id, payload));

export const usePagarSolicitudMutation = () =>
  useEscritura(({ id, payload }: { id: string; payload: PagarPayload }) => pagarSolicitud(id, payload));

export const useRevertirPagoMutation = () => useEscritura((id: string) => revertirPago(id));

export const useAnularSolicitudMutation = () =>
  useEscritura(({ id, motivo }: { id: string; motivo: string }) => anularSolicitud(id, motivo));

export const useFirmarSolicitudMutation = () =>
  useEscritura(({ id, tipo }: { id: string; tipo: string }) => firmarSolicitud(id, tipo));

export const useQuitarFirmaMutation = () =>
  useEscritura(({ id, tipo }: { id: string; tipo: string }) => quitarFirmaSolicitud(id, tipo));
