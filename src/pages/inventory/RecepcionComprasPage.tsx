import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ClipboardList, PackageCheck, Search } from "lucide-react";
import { usePermisos } from "@/features/auth/hooks/usePermisos";
import {
  useCompraByIdQuery,
  useComprasQuery,
  useComprasResumenQuery,
  useRecibirCompraMutation
} from "@/features/compras/hooks/useCompras";
import {
  avanceDeCompra,
  diasDesde,
  fechaDeCompra,
  formatBs,
  formatCantidad,
  formatFecha,
  llegadaDeEstado,
  pendienteDeItem
} from "@/features/compras/lib/compraResumen";
import type { Compra } from "@/features/compras/model/compras.schema";
import { BarraAvance, DocumentoBadge, LlegadaBadge } from "@/features/compras/ui/CompraBadges";
import { LineaTiempoCompra } from "@/features/compras/ui/LineaTiempoCompra";
import { useProveedoresQuery } from "@/features/proveedores/hooks/useProveedores";
import {
  useInventoryOfflinePendingCount,
  useSyncInventoryOfflineMutation
} from "@/features/inventory-offline/hooks/useInventoryOffline";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full min-w-0 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-60";

function useValorRetrasado<T>(valor: T, ms = 350): T {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const id = window.setTimeout(() => setRetrasado(valor), ms);
    return () => window.clearTimeout(id);
  }, [valor, ms]);
  return retrasado;
}

// ── Confirmar lo que llegó de un pedido ──────────────────────────────────────
function ConfirmarRecepcion({ compraId, canRecibir }: { compraId: string; canRecibir: boolean }) {
  const { showError, showSuccess } = useToast();
  const query = useCompraByIdQuery(compraId);
  const recibirMutation = useRecibirCompraMutation();
  const compra: Compra | undefined = query.data?.data;

  // Lo que el almacén cuenta que llegó ahora, por ítem. Empieza vacío a propósito:
  // la cantidad se escribe a partir del conteo real, no se acepta por defecto.
  const [llego, setLlego] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    setLlego({});
    setConfirmando(false);
  }, [compraId]);

  const calculo = useMemo(() => {
    if (!compra) return null;
    let unidadesAhora = 0;
    let valorAhora = 0;
    let itemsConLlegada = 0;
    let quedaPendiente = false;
    let hayError = false;
    for (const item of compra.items) {
      const falta = pendienteDeItem(item);
      const texto = llego[item.id] ?? "";
      const cantidad = texto === "" ? 0 : Number(texto);
      if (Number.isNaN(cantidad) || cantidad < 0 || cantidad > falta) hayError = true;
      const valida = Number.isNaN(cantidad) || cantidad < 0 ? 0 : Math.min(cantidad, falta);
      if (valida > 0) itemsConLlegada += 1;
      unidadesAhora += valida;
      valorAhora += valida * Number(item.precioUnit);
      if (falta - valida > 0) quedaPendiente = true;
    }
    return { unidadesAhora, valorAhora, itemsConLlegada, quedaPendiente, hayError };
  }, [compra, llego]);

  if (query.isLoading) return <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando pedido...</p>;
  if (query.isError || !compra || !calculo) {
    return <p className="text-sm text-[var(--color-error)]">No se pudo cargar el pedido.</p>;
  }

  const pedido = compra;
  const avance = avanceDeCompra(pedido);
  const llegada = llegadaDeEstado(pedido.estado);
  const cerrada = pedido.estado === "COMPLETADO" || pedido.estado === "ANULADA";
  const dias = diasDesde(fechaDeCompra(pedido));
  const puedeConfirmar = canRecibir && !cerrada && calculo.itemsConLlegada > 0 && !calculo.hayError && !recibirMutation.isPending;

  function cargarTodoPendiente() {
    const todo: Record<string, string> = {};
    pedido.items.forEach((item) => {
      const falta = pendienteDeItem(item);
      if (falta > 0) todo[item.id] = String(falta);
    });
    setLlego(todo);
    setConfirmando(false);
  }

  function confirmar() {
    const cantidades: Record<string, number> = {};
    for (const item of pedido.items) {
      const cantidad = Number(llego[item.id] ?? 0);
      cantidades[item.id] = Number.isNaN(cantidad) ? 0 : cantidad;
    }
    recibirMutation.mutate(
      {
        id: pedido.id,
        payload: { cantidadesRecibidas: cantidades },
        stockAdjustments: pedido.items
          .map((item) => ({ productoId: item.productoId, deltaCantidad: cantidades[item.id] ?? 0 }))
          .filter((item) => item.deltaCantidad > 0)
      },
      {
        onSuccess: (response) => {
          const estado = llegadaDeEstado(response.data.compra.estado).etiqueta;
          showSuccess(`Recepción registrada. El pedido quedó: ${estado}.`);
          setLlego({});
          setConfirmando(false);
        },
        onError: (error) => {
          setConfirmando(false);
          showError(error instanceof ApiError ? error.message : "No se pudo registrar la recepción.");
        }
      }
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <LlegadaBadge estado={pedido.estado} />
          <DocumentoBadge compra={pedido} />
        </div>
        <h3 className="text-lg font-bold leading-tight">{pedido.proveedor?.nombre ?? "Proveedor"}</h3>
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          {pedido.proveedor?.lugar ?? "Lugar no definido"} · pedido del {formatFecha(fechaDeCompra(pedido))}
          {dias !== null && dias > 0 ? ` (hace ${dias} ${dias === 1 ? "día" : "días"})` : ""}
        </p>
        {pedido.observacion ? (
          <p className="rounded-md bg-[var(--color-surface-container-high)] px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
            {pedido.observacion}
          </p>
        ) : null}
        <div>
          <BarraAvance porcentaje={avance.porcentaje} tono={llegada.tono} />
          <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">
            Ya recibido: {Math.round(avance.porcentaje)} % ({formatBs(avance.recibidoBs)} de {formatBs(avance.pedidoBs)})
          </p>
        </div>
      </div>

      {cerrada ? (
        <p className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-4 py-3 text-sm text-[var(--color-on-surface-variant)]">
          {pedido.estado === "COMPLETADO"
            ? "Este pedido ya se recibió completo. No hay nada más que confirmar."
            : "Este pedido está anulado: no se puede recibir."}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Escribe lo que realmente llegó</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cargarTodoPendiente}
                disabled={!canRecibir}
                className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-50"
              >
                Llegó todo lo pendiente
              </button>
              <button
                type="button"
                onClick={() => {
                  setLlego({});
                  setConfirmando(false);
                }}
                className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
              >
                Limpiar
              </button>
            </div>
          </div>

          <ul className="space-y-3">
            {pedido.items.map((item) => {
              const falta = pendienteDeItem(item);
              const texto = llego[item.id] ?? "";
              const cantidad = texto === "" ? 0 : Number(texto);
              const excede = !Number.isNaN(cantidad) && cantidad > falta;
              const completo = falta === 0;
              return (
                <li
                  key={item.id}
                  className={`space-y-2 rounded-lg border p-3 ${
                    completo
                      ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/6"
                      : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-on-surface)]">
                        {item.producto?.nombre ?? `Producto #${item.productoId}`}
                      </p>
                      <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                        {item.producto?.codigo ?? ""} · {item.producto?.unidad ?? "u"}
                      </p>
                    </div>
                    <dl className="flex gap-4 text-xs">
                      <div>
                        <dt className="text-[10px] uppercase text-[var(--color-on-surface-variant)]">Pedido</dt>
                        <dd className="font-semibold">{formatCantidad(item.cantidadPedida)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase text-[var(--color-on-surface-variant)]">Ya llegó</dt>
                        <dd className="font-semibold text-[var(--color-success)]">{formatCantidad(item.cantidadRecibida ?? 0)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase text-[var(--color-on-surface-variant)]">Falta</dt>
                        <dd className={`font-semibold ${falta > 0 ? "text-[var(--color-warning)]" : ""}`}>{formatCantidad(falta)}</dd>
                      </div>
                    </dl>
                  </div>
                  {completo ? (
                    <p className="text-xs font-semibold text-[var(--color-success)]">Completo</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs text-[var(--color-on-surface-variant)]" htmlFor={`llego-${item.id}`}>
                        Llegó ahora
                      </label>
                      <input
                        id={`llego-${item.id}`}
                        type="number"
                        min="0"
                        max={falta}
                        step="0.01"
                        inputMode="decimal"
                        value={texto}
                        onChange={(event) => {
                          setLlego((actual) => ({ ...actual, [item.id]: event.target.value }));
                          setConfirmando(false);
                        }}
                        placeholder="0"
                        disabled={!canRecibir}
                        aria-invalid={excede}
                        className={`${inputClassName} max-w-[140px] ${excede ? "!border-[var(--color-error)]" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLlego((actual) => ({ ...actual, [item.id]: String(falta) }));
                          setConfirmando(false);
                        }}
                        disabled={!canRecibir}
                        className="rounded-md border border-[var(--color-primary)]/45 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
                      >
                        Todo ({formatCantidad(falta)})
                      </button>
                      {excede ? (
                        <span className="text-xs font-semibold text-[var(--color-error)]">No puede pasar de lo que falta ({formatCantidad(falta)}).</span>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="space-y-3 rounded-lg bg-[var(--color-surface-container-high)] p-4">
            {calculo.itemsConLlegada === 0 ? (
              <p className="text-sm text-[var(--color-on-surface-variant)]">Aún no escribiste ninguna cantidad.</p>
            ) : (
              <p className="text-sm">
                Vas a recibir <strong>{formatCantidad(calculo.unidadesAhora)}</strong> unidades en{" "}
                <strong>{calculo.itemsConLlegada}</strong> {calculo.itemsConLlegada === 1 ? "ítem" : "ítems"} por{" "}
                <strong>{formatBs(calculo.valorAhora)}</strong>. El pedido quedará{" "}
                <strong>{calculo.quedaPendiente ? "Recibido parcial" : "Recibido completo"}</strong>
                {calculo.quedaPendiente ? ", y lo que falte seguirá por recibir." : "."}
              </p>
            )}

            {!confirmando ? (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                disabled={!puedeConfirmar}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PackageCheck size={16} />
                Revisar y confirmar recepción
              </button>
            ) : (
              <div className="space-y-2 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3">
                <p className="text-sm font-semibold text-[var(--color-warning)]">
                  ¿Confirmas? Estas cantidades entran al stock del almacén ahora.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmar}
                    disabled={recibirMutation.isPending}
                    className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                  >
                    {recibirMutation.isPending ? "Registrando..." : "Sí, registrar recepción"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    disabled={recibirMutation.isPending}
                    className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)]"
                  >
                    Volver
                  </button>
                </div>
              </div>
            )}
            {!canRecibir ? (
              <p className="text-xs text-[var(--color-on-surface-variant)]">No tienes permiso para confirmar recepciones.</p>
            ) : null}
          </div>
        </>
      )}

      <section className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Historial del pedido</h4>
        <LineaTiempoCompra compra={pedido} />
      </section>
    </div>
  );
}

// ── Pantalla ─────────────────────────────────────────────────────────────────
export function RecepcionComprasPage() {
  const { can } = usePermisos();
  const canRecibir = can("inventario.recepcion", "recibir");
  const canVerPedidos = can("inventario.compras", "ver");
  const { showError, showSuccess } = useToast();
  const pendingOfflineQuery = useInventoryOfflinePendingCount();
  const syncOfflineMutation = useSyncInventoryOfflineMutation();

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("pedido") ?? "";
  const [proveedorId, setProveedorId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const busquedaRetrasada = useValorRetrasado(busqueda.trim());

  const proveedoresQuery = useProveedoresQuery({ page: 1, limit: 500, search: undefined });
  const proveedorOptions = useMemo(
    () =>
      [...(proveedoresQuery.data?.data ?? [])]
        .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }))
        .map((proveedor) => ({
          id: String(proveedor.id),
          label: (proveedor.nombre ?? "") + (proveedor.lugar ? ` — ${proveedor.lugar}` : ""),
          searchText: `${proveedor.nombre ?? ""} ${proveedor.lugar ?? ""} ${proveedor.nit ?? ""}`
        })),
    [proveedoresQuery.data]
  );

  const comprasQuery = useComprasQuery(
    {
      page,
      limit: 10,
      pendientes: true,
      proveedorId: proveedorId ? Number(proveedorId) : undefined,
      busqueda: busquedaRetrasada || undefined
    },
    true,
    { refetchInterval: 60_000 }
  );
  const resumenQuery = useComprasResumenQuery({ page: 1, limit: 10 });
  const resumen = resumenQuery.data?.data;
  const compras = comprasQuery.data?.data ?? [];
  const meta = comprasQuery.data?.meta;

  function seleccionar(id: string) {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("pedido", id);
    else next.delete("pedido");
    setSearchParams(next, { replace: true });
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
              <PackageCheck size={18} />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-extrabold">Recepción de compras</h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
                Confirma con las cantidades reales lo que llegó de cada pedido. Al confirmar, lo recibido entra al stock
                del almacén. Si llega solo una parte, el pedido queda parcial y el resto sigue por recibir.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                syncOfflineMutation.mutate(undefined, {
                  onSuccess: () => showSuccess("Sincronización offline ejecutada."),
                  onError: () => showError("No se pudo ejecutar la sincronización offline.")
                })
              }
              disabled={syncOfflineMutation.isPending}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              Reintentar sync ({pendingOfflineQuery.data ?? 0})
            </button>
            {canVerPedidos ? (
              <Link
                to="/inventario/compras"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-primary)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
              >
                <ClipboardList size={16} />
                Ir a Pedidos de compra
              </Link>
            ) : null}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-lg bg-[var(--color-surface-container-high)] px-4 py-3">
            <dt className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">Por recibir</dt>
            <dd className="font-headline text-2xl font-extrabold">{resumen ? resumen.estados.PENDIENTE : "–"}</dd>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-container-high)] px-4 py-3">
            <dt className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">Recibidos parcialmente</dt>
            <dd className="font-headline text-2xl font-extrabold">{resumen ? resumen.estados.PARCIAL : "–"}</dd>
          </div>
        </dl>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <article className="min-w-0 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-1 text-lg font-bold">Pedidos por recibir</h2>
          <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
            Solo se muestran los que todavía tienen algo pendiente de llegar.
          </p>

          <div className="mb-4 grid grid-cols-1 gap-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
              <input
                type="search"
                value={busqueda}
                onChange={(event) => {
                  setBusqueda(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por proveedor, producto o documento"
                className={`${inputClassName} pl-9`}
              />
            </div>
            <AutocompleteSelect
              value={proveedorId}
              onChange={(valor) => {
                setProveedorId(valor);
                setPage(1);
              }}
              options={proveedorOptions}
              placeholder="Todos los proveedores"
              className={inputClassName}
            />
          </div>

          <ul className="space-y-2">
            {comprasQuery.isLoading ? (
              <li className="px-3 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">Cargando pedidos...</li>
            ) : null}
            {!comprasQuery.isLoading && compras.length === 0 ? (
              <li className="rounded-lg border border-dashed border-[var(--color-border-soft)] px-3 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
                {busqueda || proveedorId ? "Ningún pedido pendiente coincide con el filtro." : "No hay pedidos por recibir."}
              </li>
            ) : null}
            {compras.map((compra) => {
              const avance = avanceDeCompra(compra);
              const llegada = llegadaDeEstado(compra.estado);
              const activa = compra.id === selectedId;
              const dias = diasDesde(fechaDeCompra(compra));
              return (
                <li key={compra.id}>
                  <button
                    type="button"
                    onClick={() => seleccionar(compra.id)}
                    aria-pressed={activa}
                    className={`w-full space-y-2 rounded-lg border p-3 text-left transition ${
                      activa
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] hover:border-[var(--color-primary)]/60"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--color-on-surface)]">{compra.proveedor?.nombre ?? "-"}</p>
                        <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                          {formatFecha(fechaDeCompra(compra))}
                          {dias !== null && dias > 0 ? ` · hace ${dias} ${dias === 1 ? "día" : "días"}` : ""} · {compra.items.length}{" "}
                          {compra.items.length === 1 ? "ítem" : "ítems"}
                        </p>
                      </div>
                      <LlegadaBadge estado={compra.estado} />
                    </div>
                    <BarraAvance porcentaje={avance.porcentaje} tono={llegada.tono} />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--color-on-surface-variant)]">
                      <span>
                        Falta recibir <strong className="text-[var(--color-warning)]">{formatBs(avance.pendienteBs)}</strong>
                      </span>
                      <DocumentoBadge compra={compra} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-[var(--color-on-surface-variant)]">
              {meta ? `Página ${meta.page} de ${meta.totalPages} · ${meta.total} pedidos` : "-"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((actual) => Math.max(1, actual - 1))}
                disabled={!meta || page <= 1}
                aria-label="Página anterior"
                className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPage((actual) => (meta && actual < meta.totalPages ? actual + 1 : actual))}
                disabled={!meta || page >= meta.totalPages}
                aria-label="Página siguiente"
                className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </article>

        <article className="min-w-0 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 xl:sticky xl:top-4 xl:self-start">
          <h2 className="mb-4 text-lg font-bold">Confirmar recepción</h2>
          {selectedId ? (
            <ConfirmarRecepcion compraId={selectedId} canRecibir={canRecibir} />
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              Elige un pedido de la lista para escribir lo que llegó.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
