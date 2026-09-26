import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTransportista,
  deleteTransportista,
  getTransportistas,
  updateTransportista
} from "@/features/transportista/api/transportistaApi";
import type {
  CreateTransportistaPayload,
  UpdateTransportistaPayload
} from "@/features/transportista/model/transportista.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useTransportistasQuery() {
  return useQuery({
    queryKey: queryKeys.transportistas.all,
    queryFn: getTransportistas
  });
}

export function useCreateTransportistaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransportistaPayload) => createTransportista(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.transportistas.all });
    }
  });
}

export function useUpdateTransportistaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTransportistaPayload }) =>
      updateTransportista(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.transportistas.all });
    }
  });
}

export function useDeleteTransportistaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTransportista(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.transportistas.all });
    }
  });
}
