import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategoria,
  deleteCategoria,
  getCategoriasTree,
  updateCategoria
} from "@/features/categorias-inventario/api/categoriasInventarioApi";
import type {
  CreateCategoriaPayload,
  UpdateCategoriaPayload
} from "@/features/categorias-inventario/model/categoria.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useCategoriasTreeQuery() {
  return useQuery({
    queryKey: queryKeys.categoriasInventario.tree(),
    queryFn: getCategoriasTree
  });
}

export function useCreateCategoriaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCategoriaPayload) => createCategoria(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categoriasInventario.all });
    }
  });
}

export function useUpdateCategoriaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCategoriaPayload }) =>
      updateCategoria(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categoriasInventario.all });
    }
  });
}

export function useDeleteCategoriaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCategoria(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categoriasInventario.all });
    }
  });
}
