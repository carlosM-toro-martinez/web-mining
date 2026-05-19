import { RefreshCw, Trash2, WifiOff } from "lucide-react";
import {
  useDeleteInventoryOfflineOperationMutation,
  useInventoryOfflineOperationsQuery,
  useInventoryOfflinePendingCount,
  useSyncInventoryOfflineMutation
} from "@/features/inventory-offline/hooks/useInventoryOffline";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

function operationLabel(type: string) {
  if (type === "CREATE_COMPRA") return "Crear compra";
  if (type === "RECIBIR_COMPRA") return "Recibir compra";
  if (type === "CREATE_VALE") return "Crear vale";
  if (type === "ENTREGAR_VALE") return "Entregar vale";
  return type;
}

export function InventoryOfflineMonitorPage() {
  const { showError, showSuccess } = useToast();
  const pendingCountQuery = useInventoryOfflinePendingCount();
  const operationsQuery = useInventoryOfflineOperationsQuery();
  const syncMutation = useSyncInventoryOfflineMutation();
  const deleteMutation = useDeleteInventoryOfflineOperationMutation();

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
              <WifiOff size={18} />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-extrabold">Monitoreo offline</h1>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Cola local de compras y vales pendientes por sincronizar.
              </p>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                Pendientes: <strong>{pendingCountQuery.data ?? 0}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              syncMutation.mutate(undefined, {
                onSuccess: () => showSuccess("Sincronización ejecutada."),
                onError: () => showError("No se pudo ejecutar la sincronización.")
              })
            }
            disabled={syncMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-50"
          >
            <RefreshCw size={15} className={syncMutation.isPending ? "animate-spin" : ""} />
            {syncMutation.isPending ? "Sincronizando..." : "Reintentar sync"}
          </button>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 text-lg font-bold">Operaciones pendientes</h2>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Tipo
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Fecha
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Intentos
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Último error
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {operationsQuery.isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-3 text-center text-sm text-[var(--color-on-surface-variant)]"
                  >
                    Cargando cola offline...
                  </td>
                </tr>
              ) : null}
              {!operationsQuery.isLoading && (operationsQuery.data?.length ?? 0) === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-3 text-center text-sm text-[var(--color-on-surface-variant)]"
                  >
                    No hay operaciones pendientes.
                  </td>
                </tr>
              ) : null}
              {(operationsQuery.data ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-xs">{operationLabel(item.operationType)}</td>
                  <td className="px-3 py-2 text-xs">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs">{item.attempts}</td>
                  <td className="px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                    {item.lastError || "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        deleteMutation.mutate(item.id, {
                          onSuccess: () => showSuccess("Operación eliminada de la cola."),
                          onError: () => showError("No se pudo eliminar la operación.")
                        })
                      }
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-error)]/55 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10 disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
