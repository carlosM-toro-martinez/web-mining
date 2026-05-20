import { FormEvent, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, Boxes, PencilLine } from "lucide-react";
import { useImportStockInicialMutation } from "@/features/inventario-import/hooks/useInventarioImport";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import { ApiError } from "@/shared/api/core/apiError";
import { queryKeys } from "@/shared/lib/queryKeys";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

type SortMode = "stock-asc" | "stock-desc";

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function StockActualPage() {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("stock-asc");
  const importStockMutation = useImportStockInicialMutation();
  const [editing, setEditing] = useState<{
    id: number;
    codigo: string;
    nombre: string;
    cantidad: string;
    precioUnit: string;
  } | null>(null);

  const productosQuery = useProductosQuery({
    page: 1,
    limit: 5000,
    search: undefined
  });

  const productos = productosQuery.data?.data ?? [];
  const normalizedSearch = normalizeText(search);

  const productosFiltrados = useMemo(() => {
    if (!normalizedSearch) return productos;
    return productos.filter((producto) => {
      const searchable = [
        normalizeText(producto.codigo),
        normalizeText(producto.nombre),
        normalizeText(producto.unidad),
        normalizeText(producto.categoria?.parent?.nombre),
        normalizeText(producto.categoria?.nombre)
      ].join(" ");
      return searchable.includes(normalizedSearch);
    });
  }, [productos, normalizedSearch]);

  const productosOrdenados = useMemo(() => {
    const sorted = [...productosFiltrados].sort((a, b) => {
      const stockA = toNumber(a.stock.cantidad);
      const stockB = toNumber(b.stock.cantidad);
      return sortMode === "stock-asc" ? stockA - stockB : stockB - stockA;
    });
    return sorted;
  }, [productosFiltrados, sortMode]);

  function normalizeError(error: unknown, fallback: string) {
    return error instanceof ApiError ? error.message : fallback;
  }

  function canEditStockRow(cantidad: string, precioUnit: string) {
    return toNumber(cantidad) === 0 || toNumber(precioUnit) === 0;
  }

  function openEditModal(producto: (typeof productos)[number]) {
    setEditing({
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      cantidad: producto.stock.cantidad,
      precioUnit: producto.stock.precioUnit
    });
  }

  function closeEditModal() {
    setEditing(null);
  }

  async function handleSubmitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const cantidad = Number(editing.cantidad);
    const precioUnit = Number(editing.precioUnit);
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      showError("Cantidad inválida.");
      return;
    }
    if (!Number.isFinite(precioUnit) || precioUnit < 0) {
      showError("Precio unitario inválido.");
      return;
    }

    importStockMutation.mutate(
      {
        items: [{ productoCodigo: editing.codigo, cantidad, precioUnit }]
      },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });
          showSuccess(`Stock inicial actualizado para ${editing.codigo}.`);
          closeEditModal();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar el stock inicial."))
      }
    );
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <Boxes size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Stock Actual</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Vista consolidada del stock por producto, ordenable de menor a mayor.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClassName}
            placeholder="Buscar por codigo o nombre"
          />
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className={inputClassName}
          >
            <option value="stock-asc">Stock: menor a mayor</option>
            <option value="stock-desc">Stock: mayor a menor</option>
          </select>
          <div className="flex items-center justify-center rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 text-xs text-[var(--color-on-surface-variant)]">
            <ArrowDownUp size={14} className="mr-1.5" />
            {productosOrdenados.length} productos
          </div>
        </div>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Codigo
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Producto
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Unidad
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Stock
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  P. Unit (Bs.)
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  P. Prom (Bs.)
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {productosQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
                    Cargando stock...
                  </td>
                </tr>
              ) : null}
              {!productosQuery.isLoading && productosOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : null}
              {productosOrdenados.map((producto) => (
                <tr key={producto.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-3 py-2 font-mono text-xs">{producto.codigo}</td>
                  <td className="px-3 py-2 text-xs">{producto.nombre}</td>
                  <td className="px-3 py-2 text-xs">{producto.unidad}</td>
                  <td className="px-3 py-2 text-right text-xs font-semibold">{producto.stock.cantidad}</td>
                  <td className="px-3 py-2 text-right text-xs">{producto.stock.precioUnit}</td>
                  <td className="px-3 py-2 text-right text-xs">{producto.stock.precioProm}</td>
                  <td className="px-3 py-2 text-right text-xs">
                    {canEditStockRow(producto.stock.cantidad, producto.stock.precioUnit) ? (
                      <button
                        type="button"
                        onClick={() => openEditModal(producto)}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-primary)]/45 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
                      >
                        <PencilLine size={12} />
                        Editar
                      </button>
                    ) : (
                      <span className="text-[var(--color-on-surface-variant)]">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {editing ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <h2 className="text-lg font-bold">Editar stock inicial</h2>
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
              Producto: <strong>{editing.codigo}</strong> - {editing.nombre}
            </p>
            <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleSubmitEdit}>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editing.cantidad}
                  onChange={(event) =>
                    setEditing((current) =>
                      current ? { ...current, cantidad: event.target.value } : current
                    )
                  }
                  className={inputClassName}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  P. Unit (Bs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editing.precioUnit}
                  onChange={(event) =>
                    setEditing((current) =>
                      current ? { ...current, precioUnit: event.target.value } : current
                    )
                  }
                  className={inputClassName}
                  required
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importStockMutation.isPending}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                >
                  {importStockMutation.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
