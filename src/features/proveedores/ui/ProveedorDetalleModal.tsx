import { useEffect } from "react";
import { Edit3, Trash2, X } from "lucide-react";
import {
  useDeleteProveedorMutation,
  useProveedorDetailQuery
} from "@/features/proveedores/hooks/useProveedores";
import type { Proveedor } from "@/features/proveedores/model/proveedores.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-BO", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatNumber(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface ProveedorDetalleModalProps {
  proveedorId: number | undefined;
  onClose: () => void;
  onEdit: (proveedor: Proveedor) => void;
  canEdit: boolean;
  canDelete: boolean;
}

// Datos del proveedor y las facturas (compras) asociadas, en una ventana aparte
export function ProveedorDetalleModal({ proveedorId, onClose, onEdit, canEdit, canDelete }: ProveedorDetalleModalProps) {
  const { showError, showSuccess } = useToast();
  const detailQuery = useProveedorDetailQuery(proveedorId);
  const deleteMutation = useDeleteProveedorMutation();
  const proveedor = detailQuery.data?.data ?? null;
  const compras = proveedor?.compras ?? [];

  useEffect(() => {
    if (!proveedorId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [proveedorId, onClose]);

  if (!proveedorId) return null;

  function handleDelete() {
    if (!proveedor || compras.length > 0) return;
    if (!window.confirm(`¿Eliminar proveedor "${proveedor.nombre}"?`)) return;
    deleteMutation.mutate(proveedor.id, {
      onSuccess: () => {
        showSuccess("Proveedor eliminado.");
        onClose();
      },
      onError: (error) =>
        showError(error instanceof ApiError ? error.message : "No se pudo eliminar el proveedor.")
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proveedor-detalle-titulo"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-[var(--color-surface-container-high)] p-6 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container-highest)] hover:text-[var(--color-on-surface)]"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        {detailQuery.isLoading ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando detalle del proveedor...</p>
        ) : proveedor ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
              <div>
                <h2 id="proveedor-detalle-titulo" className="text-xl font-bold">{proveedor.nombre}</h2>
                <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                  {proveedor.razonSocial ?? "Sin razón social"} · NIT {proveedor.nit ?? "-"} · {proveedor.lugar ?? "Sin lugar"}
                </p>
                {proveedor.contacto ? (
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Contacto: {proveedor.contacto}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onEdit(proveedor)} disabled={!canEdit} className={buttonSecondaryClassName}>
                  <Edit3 size={14} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!canDelete || compras.length > 0 || deleteMutation.isPending}
                  title={compras.length > 0 ? "No se puede eliminar un proveedor con compras asociadas" : undefined}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-error)]/45 px-3 py-2 text-xs font-semibold text-[var(--color-error)] disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              </div>
            </div>

            {compras.length > 0 ? (
              <div className="rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                Este proveedor tiene facturas asociadas. El sistema no permitirá eliminarlo.
              </div>
            ) : null}

            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Facturas asociadas ({compras.length})
              </h3>
              {compras.length === 0 ? (
                <p className="rounded-lg border border-[var(--color-border-soft)] px-3 py-3 text-sm text-[var(--color-on-surface-variant)]">
                  No tiene compras asociadas.
                </p>
              ) : (
                <div className="space-y-3">
                  {compras.map((compra) => (
                    <div key={compra.id} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-bold">Factura {compra.numeroFactura ?? "Sin número"}</div>
                        <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-1 text-[10px] font-bold text-[var(--color-primary)]">
                          {compra.estado ?? "SIN ESTADO"}
                        </span>
                      </div>
                      <div className="mt-1 grid grid-cols-1 gap-1 text-xs text-[var(--color-on-surface-variant)] sm:grid-cols-3">
                        <span>Fecha: {formatDate(compra.fechaOperacion ?? compra.createdAt)}</span>
                        <span>Recibido: {formatDate(compra.recibidoAt)}</span>
                        <span>Descuento: {formatNumber(compra.descuento)}</span>
                      </div>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                              <th className="py-1 pr-3">Producto</th>
                              <th className="py-1 pr-3">Unidad</th>
                              <th className="py-1 pr-3 text-right">Pedida</th>
                              <th className="py-1 pr-3 text-right">Recibida</th>
                              <th className="py-1 text-right">P. Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border-soft)]">
                            {compra.items.map((item) => (
                              <tr key={item.id}>
                                <td className="py-1 pr-3">{item.producto?.codigo ?? "-"} · {item.producto?.nombre ?? "Producto"}</td>
                                <td className="py-1 pr-3">{item.producto?.unidad ?? "-"}</td>
                                <td className="py-1 pr-3 text-right">{formatNumber(item.cantidadPedida)}</td>
                                <td className="py-1 pr-3 text-right">{formatNumber(item.cantidadRecibida)}</td>
                                <td className="py-1 text-right">{formatNumber(item.precioUnit)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-on-surface-variant)]">No se encontró el proveedor seleccionado.</p>
        )}
      </div>
    </div>
  );
}
