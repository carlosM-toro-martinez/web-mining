import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRemitente,
  deleteRemitente,
  getRemitentes,
  updateRemitente
} from "@/features/remitente/api/remitenteApi";
import type {
  CreateRemitentePayload,
  UpdateRemitentePayload
} from "@/features/remitente/model/remitente.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useRemitentesQuery() {
  return useQuery({
    queryKey: queryKeys.remitentes.all,
    queryFn: getRemitentes
  });
}

export function useCreateRemitenteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRemitentePayload) => createRemitente(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.remitentes.all });
    }
  });
}

export function useUpdateRemitenteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRemitentePayload }) =>
      updateRemitente(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.remitentes.all });
    }
  });
}

export function useDeleteRemitenteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteRemitente(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.remitentes.all });
    }
  });
}
