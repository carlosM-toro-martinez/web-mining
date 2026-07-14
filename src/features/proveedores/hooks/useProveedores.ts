import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProveedor,
  deleteProveedor,
  getProveedorById,
  getProveedores,
  updateProveedor
} from "@/features/proveedores/api/proveedoresApi";
import type {
  CreateProveedorPayload,
  ProveedoresQueryParams,
  UpdateProveedorPayload
} from "@/features/proveedores/model/proveedores.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useProveedoresQuery(params: ProveedoresQueryParams) {
  return useQuery({
    queryKey: queryKeys.proveedores.list(params),
    queryFn: () => getProveedores(params)
  });
}

export function useProveedorDetailQuery(id?: number) {
  return useQuery({
    queryKey: id ? queryKeys.proveedores.detail(id) : [...queryKeys.proveedores.all, "detail", "idle"],
    queryFn: () => getProveedorById(id as number),
    enabled: Boolean(id)
  });
}

export function useCreateProveedorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProveedorPayload) => createProveedor(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.proveedores.all });
    }
  });
}

export function useUpdateProveedorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateProveedorPayload }) =>
      updateProveedor(id, payload),
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.proveedores.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.proveedores.detail(variables.id) });
    }
  });
}

export function useDeleteProveedorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteProveedor(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.proveedores.all });
    }
  });
}
