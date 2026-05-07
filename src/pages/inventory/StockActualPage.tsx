import { useMemo, useState } from "react";
import { ArrowDownUp, Boxes } from "lucide-react";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

type SortMode = "stock-asc" | "stock-desc";

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function StockActualPage() {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("stock-asc");

  const productosQuery = useProductosQuery({
    page: 1,
    limit: 1000,
    search: search.trim() || undefined
  });

  const productos = productosQuery.data?.data ?? [];

  const productosOrdenados = useMemo(() => {
    const sorted = [...productos].sort((a, b) => {
      const stockA = toNumber(a.stock.cantidad);
      const stockB = toNumber(b.stock.cantidad);
      return sortMode === "stock-asc" ? stockA - stockB : stockB - stockA;
    });
    return sorted;
  }, [productos, sortMode]);

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
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {productosQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
                    Cargando stock...
                  </td>
                </tr>
              ) : null}
              {!productosQuery.isLoading && productosOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
