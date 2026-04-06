import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/queryKeys";
import {
  getMuestrasOffline,
  saveMuestraOffline,
  updateMuestraOffline
} from "@/features/exploraciones/db/exploracionesDb";
import { syncPendingExploraciones } from "@/features/exploraciones/services/exploracionesSync.service";
import type { ExploracionMuestraPayload } from "@/features/exploraciones/model/muestra.schema";
import {
  getExploracionesElementos,
  getExploracionesLaboratorios,
  getExploracionesMuestrasTodas,
  updateExploracionMuestra
} from "@/features/exploraciones/api/exploracionesApi";

export function useExploracionesOfflineQuery() {
  return useQuery({
    queryKey: queryKeys.exploraciones.offline(),
    queryFn: getMuestrasOffline
  });
}

export function useExploracionesRemotasQuery() {
  return useQuery({
    queryKey: queryKeys.exploraciones.remotas(),
    queryFn: getExploracionesMuestrasTodas,
    refetchInterval: 45_000
  });
}

export function useExploracionesElementosQuery() {
  return useQuery({
    queryKey: queryKeys.exploraciones.elementos(),
    queryFn: getExploracionesElementos
  });
}

export function useExploracionesLaboratoriosQuery() {
  return useQuery({
    queryKey: queryKeys.exploraciones.laboratorios(),
    queryFn: getExploracionesLaboratorios
  });
}

export function useSaveMuestraOfflineMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ExploracionMuestraPayload) => saveMuestraOffline(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.offline() });
    }
  });
}

export function useUpdateMuestraOfflineMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ExploracionMuestraPayload }) =>
      updateMuestraOffline(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.offline() });
    }
  });
}

export function useUpdateMuestraRemotaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ExploracionMuestraPayload }) =>
      updateExploracionMuestra(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.remotas() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.offline() });
    }
  });
}

export function useSyncExploracionesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncPendingExploraciones,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.offline() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.remotas() });
    }
  });
}
