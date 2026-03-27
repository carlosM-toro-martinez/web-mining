import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProducto,
  deleteProducto,
  getProductos,
  updateProducto
} from "@/features/productos/api/productosApi";
import type {
  CreateProductoPayload,
  ProductosQueryParams,
  UpdateProductoPayload
} from "@/features/productos/model/producto.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useProductosQuery(params: ProductosQueryParams) {
  return useQuery({
    queryKey: queryKeys.productos.list(params),
    queryFn: () => getProductos(params)
  });
}

export function useCreateProductoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductoPayload) => createProducto(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
    }
  });
}

export function useUpdateProductoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateProductoPayload }) =>
      updateProducto(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
    }
  });
}

export function useDeleteProductoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteProducto(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
    }
  });
}
