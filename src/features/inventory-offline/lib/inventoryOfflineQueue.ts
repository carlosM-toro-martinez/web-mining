import { ApiError } from "@/shared/api/core/apiError";
import { queryClient } from "@/shared/lib/queryClient";
import { queryKeys } from "@/shared/lib/queryKeys";
import { createCompra, recibirCompra } from "@/features/compras/api/comprasApi";
import { createVale, entregarVale } from "@/features/vales/api/valesApi";
import {
  inventoryOfflineDb,
  type InventoryOfflineOperationType
} from "@/features/inventory-offline/db/inventoryOffline.db";

function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export function isOfflineLikeError(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (!isApiError(error)) return false;
  const msg = (error.message || "").toLowerCase();
  // NOTE: do NOT check `error.statusCode === undefined` here.
  // ZodError-derived ApiErrors also have statusCode=undefined (schema validation
  // failures on a successful HTTP response). Treating them as offline errors
  // causes the operation to be queued and retried endlessly even though the
  // server already processed it.
  return (
    msg.includes("no se pudo conectar") ||
    msg.includes("network") ||
    msg.includes("failed to fetch")
  );
}

export async function enqueueInventoryOperation<TPayload>(
  operationType: InventoryOfflineOperationType,
  payload: TPayload
) {
  await inventoryOfflineDb.operations.add({
    operationType,
    payloadJson: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
    attempts: 0
  });
}

let syncInFlight: Promise<void> | null = null;

export async function syncPendingInventoryOperations() {
  if (syncInFlight) return syncInFlight;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  syncInFlight = (async () => {
    const operations = await inventoryOfflineDb.operations.orderBy("id").toArray();
    for (const operation of operations) {
      try {
        const payload = JSON.parse(operation.payloadJson) as unknown;
        if (operation.operationType === "CREATE_COMPRA") {
          await createCompra(payload as Parameters<typeof createCompra>[0]);
        } else if (operation.operationType === "RECIBIR_COMPRA") {
          const parsed = payload as { id: string; payload: Parameters<typeof recibirCompra>[1] };
          await recibirCompra(parsed.id, parsed.payload);
        } else if (operation.operationType === "CREATE_VALE") {
          await createVale(payload as Parameters<typeof createVale>[0]);
        } else if (operation.operationType === "ENTREGAR_VALE") {
          const parsed = payload as { id: string; payload: Parameters<typeof entregarVale>[1] };
          await entregarVale(parsed.id, parsed.payload);
        } else if (operation.operationType === "CREATE_AND_ENTREGAR_VALE") {
          const parsed = payload as Parameters<typeof createVale>[0];
          const created = await createVale(parsed);
          const cantidadesEntregadas = Object.fromEntries(
            (created.data.items ?? []).map((item) => [item.id, Number(item.cantidadSolicitada)])
          );
          await entregarVale(created.data.id, { cantidadesEntregadas });
        }

        await inventoryOfflineDb.operations.delete(operation.id);
      } catch (error) {
        const attempts = operation.attempts + 1;
        await inventoryOfflineDb.operations.update(operation.id, {
          attempts,
          lastError: error instanceof Error ? error.message : "Error desconocido"
        });
        // If the error is a conflict (409) from the API, drop the operation
        // to avoid repeated failing retries (e.g. "La compra ya está completada").
        if (isApiError(error) && (error as any).statusCode === 409) {
          await inventoryOfflineDb.operations.delete(operation.id);
          continue;
        }

        if (isOfflineLikeError(error)) {
          break;
        }
      }
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.compras.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.vales.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

export function startInventoryOfflineSync() {
  const handleOnline = () => {
    void syncPendingInventoryOperations();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
  }

  const intervalId =
    typeof window !== "undefined"
      ? window.setInterval(() => {
          void syncPendingInventoryOperations();
        }, 30_000)
      : null;

  void syncPendingInventoryOperations();

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
    }
    if (intervalId !== null) {
      window.clearInterval(intervalId);
    }
  };
}
