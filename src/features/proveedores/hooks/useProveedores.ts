import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProveedor,
  getProveedores
} from "@/features/proveedores/api/proveedoresApi";
import type {
  CreateProveedorPayload,
  ProveedoresQueryParams
} from "@/features/proveedores/model/proveedores.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useProveedoresQuery(params: ProveedoresQueryParams) {
  return useQuery({
    queryKey: queryKeys.proveedores.list(params),
    queryFn: () => getProveedores(params)
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
