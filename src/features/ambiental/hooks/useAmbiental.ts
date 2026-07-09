import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAmbientalHidrico,
  createAmbientalManifiesto,
  createAmbientalPozo,
  createAmbientalPunto,
  createAmbientalResiduo,
  createAmbientalRuido,
  createAmbientalSuelo,
  deleteAmbientalPunto,
  getAmbientalDashboard,
  getAmbientalHidrico,
  getAmbientalManifiestos,
  getAmbientalMapa,
  getAmbientalPozos,
  getAmbientalPuntos,
  getAmbientalResiduos,
  getAmbientalRuido,
  getAmbientalSuelo
} from "@/features/ambiental/api/ambientalApi";
import type {
  CreateHidricoPayload,
  CreateManifiestoPayload,
  CreatePozoPayload,
  CreatePuntoAmbientalPayload,
  CreateResiduoPayload,
  CreateRuidoPayload,
  CreateSueloPayload,
  PuntoAmbientalTipo,
  TipoResiduo
} from "@/features/ambiental/model/ambiental.schema";

const ambientalKeys = {
  all: ["ambiental"] as const,
  dashboard: () => [...ambientalKeys.all, "dashboard"] as const,
  mapa: () => [...ambientalKeys.all, "mapa"] as const,
  puntos: (params: { tipo?: PuntoAmbientalTipo; activo?: string }) =>
    [...ambientalKeys.all, "puntos", params] as const,
  hidrico: (params: Record<string, unknown>) => [...ambientalKeys.all, "hidrico", params] as const,
  residuos: (params: Record<string, unknown>) => [...ambientalKeys.all, "residuos", params] as const,
  ruido: (params: Record<string, unknown>) => [...ambientalKeys.all, "ruido", params] as const,
  suelo: (params: Record<string, unknown>) => [...ambientalKeys.all, "suelo", params] as const,
  pozos: (params: { activo?: string }) => [...ambientalKeys.all, "pozos", params] as const,
  manifiestos: (params: { anio?: number | string }) =>
    [...ambientalKeys.all, "manifiestos", params] as const
};

function useInvalidateAmbiental() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ambientalKeys.all });
}

export function useAmbientalDashboardQuery() {
  return useQuery({ queryKey: ambientalKeys.dashboard(), queryFn: getAmbientalDashboard });
}

export function useAmbientalMapaQuery() {
  return useQuery({ queryKey: ambientalKeys.mapa(), queryFn: getAmbientalMapa });
}

export function useAmbientalPuntosQuery(params: { tipo?: PuntoAmbientalTipo; activo?: string } = {}) {
  return useQuery({ queryKey: ambientalKeys.puntos(params), queryFn: () => getAmbientalPuntos(params) });
}

export function useAmbientalHidricoQuery(params: Record<string, unknown> = {}, enabled = true) {
  return useQuery({
    queryKey: ambientalKeys.hidrico(params),
    queryFn: () => getAmbientalHidrico(params),
    enabled
  });
}

export function useAmbientalResiduosQuery(
  params: { puntoId?: number; tipoResiduo?: TipoResiduo; desde?: string; hasta?: string; page?: number; limit?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ambientalKeys.residuos(params),
    queryFn: () => getAmbientalResiduos(params),
    enabled
  });
}

export function useAmbientalRuidoQuery(params: Record<string, unknown> = {}, enabled = true) {
  return useQuery({
    queryKey: ambientalKeys.ruido(params),
    queryFn: () => getAmbientalRuido(params),
    enabled
  });
}

export function useAmbientalSueloQuery(params: Record<string, unknown> = {}, enabled = true) {
  return useQuery({
    queryKey: ambientalKeys.suelo(params),
    queryFn: () => getAmbientalSuelo(params),
    enabled
  });
}

export function useAmbientalPozosQuery(params: { activo?: string } = {}) {
  return useQuery({ queryKey: ambientalKeys.pozos(params), queryFn: () => getAmbientalPozos(params) });
}

export function useAmbientalManifiestosQuery(params: { anio?: number | string } = {}) {
  return useQuery({ queryKey: ambientalKeys.manifiestos(params), queryFn: () => getAmbientalManifiestos(params) });
}

export function useCreateAmbientalPuntoMutation() {
  const invalidate = useInvalidateAmbiental();
  return useMutation({ mutationFn: (payload: CreatePuntoAmbientalPayload) => createAmbientalPunto(payload), onSuccess: invalidate });
}

export function useDeleteAmbientalPuntoMutation() {
  const invalidate = useInvalidateAmbiental();
  return useMutation({ mutationFn: (id: number | string) => deleteAmbientalPunto(id), onSuccess: invalidate });
}

export function useCreateAmbientalHidricoMutation() {
  const invalidate = useInvalidateAmbiental();
  return useMutation({ mutationFn: (payload: CreateHidricoPayload) => createAmbientalHidrico(payload), onSuccess: invalidate });
}

export function useCreateAmbientalResiduoMutation() {
  const invalidate = useInvalidateAmbiental();
  return useMutation({ mutationFn: (payload: CreateResiduoPayload) => createAmbientalResiduo(payload), onSuccess: invalidate });
}

export function useCreateAmbientalRuidoMutation() {
  const invalidate = useInvalidateAmbiental();
  return useMutation({ mutationFn: (payload: CreateRuidoPayload) => createAmbientalRuido(payload), onSuccess: invalidate });
}

export function useCreateAmbientalSueloMutation() {
  const invalidate = useInvalidateAmbiental();
  return useMutation({ mutationFn: (payload: CreateSueloPayload) => createAmbientalSuelo(payload), onSuccess: invalidate });
}

export function useCreateAmbientalPozoMutation() {
  const invalidate = useInvalidateAmbiental();
  return useMutation({ mutationFn: (payload: CreatePozoPayload) => createAmbientalPozo(payload), onSuccess: invalidate });
}

export function useCreateAmbientalManifiestoMutation() {
  const invalidate = useInvalidateAmbiental();
  return useMutation({ mutationFn: (payload: CreateManifiestoPayload) => createAmbientalManifiesto(payload), onSuccess: invalidate });
}
