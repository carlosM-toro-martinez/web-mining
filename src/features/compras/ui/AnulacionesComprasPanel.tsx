import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useAnulacionesHistorialQuery } from "@/features/compras/hooks/useCompras";
import { avanceDeCompra, fechaDeCompra, formatBs, formatCantidad, formatFecha, tieneRecepcion } from "@/features/compras/lib/compraResumen";
import { DocumentoBadge } from "@/features/compras/ui/CompraBadges";

const PAGE_SIZE = 10;

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const thClassName =
  "px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]";

interface AnulacionesComprasPanelProps {
  // "pedido": pedidos anulados que todavía no habían llegado (no movieron stock).
  // "recepcion": compras ya recibidas que se anularon (se revirtió el stock).
  tipo: "pedido" | "recepcion";
}

// Historial de anulaciones: quién, cuándo, por qué y cuánto valían.
export function AnulacionesComprasPanel({ tipo }: AnulacionesComprasPanelProps) {
  const query = useAnulacionesHistorialQuery();
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [abierta, setAbierta] = useState<string | null>(null);

  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (query.data?.data ?? []).filter((anulacion) => {
      // Se separan por lo que pasó con la compra: ¿ya había llegado mercadería?
      const recibida = anulacion.compra ? tieneRecepcion(anulacion.compra) : false;
      if ((tipo === "recepcion") !== recibida) return false;
      if (!texto) return true;
      const compra = anulacion.compra;
      const productos = (compra?.items ?? []).map((item) => `${item.producto?.nombre ?? ""} ${item.producto?.codigo ?? ""}`).join(" ");
      return [
        compra?.proveedor?.nombre,
        compra?.numeroFactura,
        anulacion.motivo,
        anulacion.usuario?.nombre,
        productos
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });
  }, [query.data, busqueda, tipo]);

  const totalPaginas = Math.max(Math.ceil(filas.length / PAGE_SIZE), 1);
  const paginaActual = Math.min(page, totalPaginas);
  const visibles = filas.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  if (query.isLoading) {
    return <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando historial...</p>;
  }
  if (query.isError) {
    return <p className="text-sm text-[var(--color-error)]">No se pudo cargar el historial de anulaciones.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
          <input
            type="search"
            value={busqueda}
            onChange={(event) => {
              setBusqueda(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por proveedor, motivo, factura, producto o quién anuló"
            className={`${inputClassName} pl-9`}
          />
        </div>
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          <strong className="text-[var(--color-on-surface)]">{filas.length}</strong>{" "}
          {filas.length === 1 ? "anulación" : "anulaciones"}
        </p>
      </div>

      {filas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-border-soft)] p-6 text-center text-sm text-[var(--color-on-surface-variant)]">
          {busqueda
            ? "Ninguna anulación coincide con la búsqueda."
            : tipo === "pedido"
              ? "No hay pedidos anulados."
              : "No hay compras recibidas anuladas."}
        </p>
      ) : (
        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border-soft)]">
                <th className={thClassName}>Anulado el</th>
                <th className={thClassName}>Pedido</th>
                <th className={thClassName}>Documento</th>
                <th className={`${thClassName} text-right`}>Valor</th>
                <th className={thClassName}>Motivo</th>
                <th className={thClassName}>Anulado por</th>
                <th className={thClassName} aria-label="Detalle" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {visibles.map((anulacion) => {
                const compra = anulacion.compra;
                const avance = compra ? avanceDeCompra(compra) : null;
                const estaAbierta = abierta === anulacion.id;
                return (
                  <Fragment key={anulacion.id}>
                    <tr className="align-top transition hover:bg-[var(--color-surface-container-highest)]">
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-[var(--color-on-surface-variant)]">
                        {formatFecha(anulacion.createdAt, true)}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <p className="font-semibold text-[var(--color-on-surface)]">{compra?.proveedor?.nombre ?? "-"}</p>
                        <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                          Pedido del {formatFecha(compra ? fechaDeCompra(compra) : null)} · {compra?.items?.length ?? 0} ítems
                        </p>
                      </td>
                      <td className="px-3 py-3">{compra ? <DocumentoBadge compra={compra} /> : "-"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold">
                        {avance ? formatBs(avance.pedidoBs) : "-"}
                      </td>
                      <td className="max-w-[280px] px-3 py-3 text-xs text-[var(--color-on-surface)]">
                        <p className="whitespace-pre-wrap break-words">{anulacion.motivo ?? "-"}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--color-on-surface-variant)]">{anulacion.usuario?.nombre ?? "-"}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setAbierta(estaAbierta ? null : anulacion.id)}
                          aria-expanded={estaAbierta}
                          aria-label={estaAbierta ? "Ocultar ítems" : "Ver ítems"}
                          className="rounded-md border border-[var(--color-outline-variant)] p-1.5 text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                        >
                          <ChevronDown size={14} className={`transition ${estaAbierta ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    </tr>
                    {estaAbierta && compra ? (
                      <tr className="bg-[var(--color-surface-container-high)]">
                        <td colSpan={7} className="px-4 py-3">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                            {tipo === "pedido" ? "Ítems del pedido anulado (no llegó nada, no se movió el stock)" : "Ítems de la compra anulada (se revirtió lo recibido)"}
                          </p>
                          <ul className="space-y-1">
                            {(compra.items ?? []).map((item) => (
                              <li key={item.id} className="flex flex-wrap justify-between gap-2 text-xs">
                                <span className="text-[var(--color-on-surface)]">
                                  {item.producto?.codigo ? <span className="mr-1 font-mono text-[var(--color-on-surface-variant)]">{item.producto.codigo}</span> : null}
                                  {item.producto?.nombre ?? `Producto #${item.productoId}`}
                                </span>
                                <span className="text-[var(--color-on-surface-variant)]">
                                  {formatCantidad(item.cantidadPedida)} {item.producto?.unidad ?? ""} · recibido {formatCantidad(item.cantidadRecibida ?? 0)} ·{" "}
                                  {formatBs(Number(item.precioUnit) * item.cantidadPedida)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            Página {paginaActual} de {totalPaginas}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, paginaActual - 1))}
              disabled={paginaActual <= 1}
              aria-label="Página anterior"
              className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPaginas, paginaActual + 1))}
              disabled={paginaActual >= totalPaginas}
              aria-label="Página siguiente"
              className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
