import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPresupuestoCaja,
  deletePresupuestoCaja,
  duplicarPresupuestoCaja,
  getPresupuestoCajaById,
  getPresupuestosCaja,
  updatePresupuestoCaja,
  type PresupuestosCajaQueryParams
} from "@/features/presupuestoCaja/api/presupuestoCajaApi";
import type {
  CreatePresupuestoCajaPayload,
  DuplicarPresupuestoCajaPayload,
  UpdatePresupuestoCajaPayload
} from "@/features/presupuestoCaja/model/presupuestoCaja.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function usePresupuestosCajaQuery(params: PresupuestosCajaQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.presupuestoCaja.list(params),
    queryFn: () => getPresupuestosCaja(params)
  });
}

export function usePresupuestoCajaDetailQuery(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.presupuestoCaja.detail(id ?? -1),
    queryFn: () => getPresupuestoCajaById(id as number),
    enabled: Boolean(id)
  });
}

function useInvalidatePresupuestos() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.presupuestoCaja.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.all });
  };
}

export function useCreatePresupuestoCajaMutation() {
  const invalidate = useInvalidatePresupuestos();
  return useMutation({
    mutationFn: (payload: CreatePresupuestoCajaPayload) => createPresupuestoCaja(payload),
    onSuccess: () => invalidate()
  });
}

export function useUpdatePresupuestoCajaMutation() {
  const invalidate = useInvalidatePresupuestos();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdatePresupuestoCajaPayload }) =>
      updatePresupuestoCaja(id, payload),
    onSuccess: () => invalidate()
  });
}

export function useDeletePresupuestoCajaMutation() {
  const invalidate = useInvalidatePresupuestos();
  return useMutation({
    mutationFn: (id: number) => deletePresupuestoCaja(id),
    onSuccess: () => invalidate()
  });
}

export function useDuplicarPresupuestoCajaMutation() {
  const invalidate = useInvalidatePresupuestos();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DuplicarPresupuestoCajaPayload }) =>
      duplicarPresupuestoCaja(id, payload),
    onSuccess: () => invalidate()
  });
}
