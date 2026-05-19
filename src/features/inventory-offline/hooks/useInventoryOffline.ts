import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryOfflineDb } from "@/features/inventory-offline/db/inventoryOffline.db";
import { syncPendingInventoryOperations } from "@/features/inventory-offline/lib/inventoryOfflineQueue";

export function useInventoryOfflinePendingCount() {
  return useQuery({
    queryKey: ["inventory-offline", "pending-count"],
    queryFn: async () => inventoryOfflineDb.operations.count(),
    refetchInterval: 4_000
  });
}

export function useSyncInventoryOfflineMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await syncPendingInventoryOperations();
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-offline"] });
    }
  });
}

export function useInventoryOfflineOperationsQuery() {
  return useQuery({
    queryKey: ["inventory-offline", "operations"],
    queryFn: async () => inventoryOfflineDb.operations.orderBy("id").reverse().toArray(),
    refetchInterval: 4_000
  });
}

export function useDeleteInventoryOfflineOperationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await inventoryOfflineDb.operations.delete(id);
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-offline"] });
    }
  });
}
