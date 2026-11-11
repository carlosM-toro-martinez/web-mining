import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardList, PackageCheck, Search } from "lucide-react";
import { usePermisos } from "@/features/auth/hooks/usePermisos";
import {
  useAnularCompraMutation,
  useCompraByIdQuery,
  useComprasQuery,
  useComprasResumenQuery
} from "@/features/compras/hooks/useCompras";
import {
  avanceDeCompra,
  documentoDeCompra,
  fechaDeCompra,
  formatBs,
  formatCantidad,
  formatFecha,
  llegadaDeEstado,
  pendienteDeItem,
  tieneRecepcion
} from "@/features/compras/lib/compraResumen";
import type { Compra, ComprasQueryParams } from "@/features/compras/model/compras.schema";
import { BarraAvance, DocumentoBadge, LlegadaBadge } from "@/features/compras/ui/CompraBadges";
import { AnulacionesComprasPanel } from "@/features/compras/ui/AnulacionesComprasPanel";
import { DocumentoCompraForm } from "@/features/compras/ui/DocumentoCompraForm";
import { LineaTiempoCompra } from "@/features/compras/ui/LineaTiempoCompra";
import { NuevoPedidoCompraForm } from "@/features/compras/ui/NuevoPedidoCompraForm";
import { useProveedoresQuery } from "@/features/proveedores/hooks/useProveedores";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full min-w-0 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const thClassName =
  "px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]";

type Pestana = "seguimiento" | "nuevo" | "anulaciones";
type FiltroEstado = "" | "PENDIENTE" | "PARCIAL" | "COMPLETADO" | "ANULADA";
type FiltroDocumento = "" | "FACTURA" | "RECIBO" | "SIN_DOCUMENTO" | "PENDIENTE";

function toDateInput(date: Date) {
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mes}-${dia}`;
}

function rangoPeriodo(tipo: "mes" | "90dias" | "todo") {
  const hoy = new Date();
  if (tipo === "todo") return { inicio: "", fin: "" };
  if (tipo === "90dias") {
    const desde = new Date(hoy);
    desde.setDate(desde.getDate() - 90);
    return { inicio: toDateInput(desde), fin: toDateInput(hoy) };
  }
  return { inicio: toDateInput(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fin: toDateInput(hoy) };
}

function useValorRetrasado<T>(valor: T, ms = 350): T {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const id = window.setTimeout(() => setRetrasado(valor), ms);
    return () => window.clearTimeout(id);
  }, [valor, ms]);
  return retrasado;
}

// ── Tarjeta del tablero: un contador que además filtra el listado ──────────
function Contador({
  etiqueta,
  valor,
  activo,
  onClick,
  cargando
}: {
  etiqueta: string;
  valor: number | undefined;
  activo: boolean;
  onClick: () => void;
  cargando: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-lg border px-3 py-2.5 text-left transition ${
        activo
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/12"
          : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] hover:border-[var(--color-primary)]/60"
      }`}
    >
      <span className="block font-headline text-2xl font-extrabold leading-none text-[var(--color-on-surface)]">
        {cargando || valor === undefined ? "–" : valor}
      </span>
      <span className="mt-1 block text-[11px] font-semibold text-[var(--color-on-surface-variant)]">{etiqueta}</span>
    </button>
  );
}

// ── Detalle de un pedido ─────────────────────────────────────────────────────
function DetallePedido({
  compraId,
  canDocumento,
  canAnular,
  canRecibir,
  canAnularRecibida
}: {
  compraId: string;
  canDocumento: boolean;
  canAnular: boolean;
  canRecibir: boolean;
  canAnularRecibida: boolean;
}) {
  const { showError, showSuccess } = useToast();
  const query = useCompraByIdQuery(compraId);
  const anularMutation = useAnularCompraMutation();
  const [mostrarAnular, setMostrarAnular] = useState(false);
  const [motivo, setMotivo] = useState("");
  const compra: Compra | undefined = query.data?.data;

  useEffect(() => {
    setMostrarAnular(false);
    setMotivo("");
  }, [compraId]);

  if (query.isLoading) return <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando detalle...</p>;
  if (query.isError || !compra) {
    return <p className="text-sm text-[var(--color-error)]">No se pudo cargar el detalle del pedido.</p>;
  }

  const llegada = llegadaDeEstado(compra.estado);
  const avance = avanceDeCompra(compra);
  const anulada = compra.estado === "ANULADA";
  const porRecibir = compra.estado === "PENDIENTE" || compra.estado === "PARCIAL";
  // Un pedido se anula solo si todavía no llegó nada. Con mercadería recibida, anular
  // revierte el stock y se hace desde Recepción.
  const yaRecibio = tieneRecepcion(compra);

  async function confirmarAnulacion() {
    if (!compra) return;
    try {
      const result = await anularMutation.mutateAsync({ id: compra.id, payload: { motivo: motivo.trim() } });
      showSuccess(`Pedido anulado. Contra-asientos generados: ${result.data.contraAsientos}.`);
      setMotivo("");
      setMostrarAnular(false);
    } catch (error) {
      showError(error instanceof ApiError ? error.message : "No se pudo anular el pedido.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <LlegadaBadge estado={compra.estado} />
          <DocumentoBadge compra={compra} />
        </div>
        <h3 className="text-lg font-bold leading-tight">{compra.proveedor?.nombre ?? "Proveedor"}</h3>
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          {compra.proveedor?.lugar ?? "Lugar no definido"} · pedido del {formatFecha(fechaDeCompra(compra))}
          {compra.usuarioRegistro?.nombre ? ` · registró ${compra.usuarioRegistro.nombre}` : ""}
        </p>
        {compra.observacion ? (
          <p className="rounded-md bg-[var(--color-surface-container-high)] px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
            {compra.observacion}
          </p>
        ) : null}
      </div>

      <section className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Llegada</h4>
        <div className="rounded-lg bg-[var(--color-surface-container-high)] p-3">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">
              {anulada ? "Anulado" : `${Math.round(avance.porcentaje)} % recibido`}
              <span className="ml-2 text-xs font-normal text-[var(--color-on-surface-variant)]">{llegada.detalle}</span>
            </p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              {formatBs(avance.recibidoBs)} de {formatBs(avance.pedidoBs)}
            </p>
          </div>
          <BarraAvance porcentaje={avance.porcentaje} tono={llegada.tono} />
          <p className="mt-2 text-[11px] text-[var(--color-on-surface-variant)]">
            {avance.itemsCompletos} completos · {avance.itemsParciales} parciales · {avance.itemsSinRecibir} sin recibir
            {avance.pendienteBs > 0 && !anulada ? ` · falta ${formatBs(avance.pendienteBs)}` : ""}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border-soft)]">
                <th className={thClassName}>Producto</th>
                <th className={`${thClassName} text-right`}>Pedido</th>
                <th className={`${thClassName} text-right`}>Llegó</th>
                <th className={`${thClassName} text-right`}>Falta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {compra.items.map((item) => {
                const falta = pendienteDeItem(item);
                return (
                  <tr key={item.id} className="text-xs">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-[var(--color-on-surface)]">{item.producto?.nombre ?? `Producto #${item.productoId}`}</p>
                      <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                        {item.producto?.codigo ?? ""} · Bs {Number(item.precioUnit).toLocaleString("es-BO", { maximumFractionDigits: 4 })} / {item.producto?.unidad ?? "u"}
                      </p>
                      <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                        Subtotal {formatBs(Number(item.precioUnit) * item.cantidadPedida)}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right">{formatCantidad(item.cantidadPedida)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-[var(--color-success)]">{formatCantidad(item.cantidadRecibida ?? 0)}</td>
                    <td className={`px-3 py-2 text-right ${falta > 0 && !anulada ? "font-semibold text-[var(--color-warning)]" : "text-[var(--color-on-surface-variant)]"}`}>
                      {formatCantidad(falta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {porRecibir && canRecibir ? (
          <Link
            to={`/inventario/recepcion?pedido=${compra.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-primary)]/55 px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
          >
            <PackageCheck size={14} />
            Confirmar lo que llegó en Recepción
          </Link>
        ) : null}
      </section>

      <section className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Documento</h4>
        {anulada ? (
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            {documentoDeCompra(compra).etiqueta}
            {compra.numeroFactura ? ` Nº ${compra.numeroFactura}` : ""} — no se puede cambiar en un pedido anulado.
          </p>
        ) : (
          <DocumentoCompraForm compra={compra} canEdit={canDocumento} />
        )}
        {!compra.tipoDocumento && porRecibir === false && !anulada ? (
          <p className="flex items-center gap-2 text-xs text-[var(--color-warning)]">
            <AlertTriangle size={13} /> La mercadería ya llegó y falta registrar su factura o recibo.
          </p>
        ) : null}
      </section>

      {compra.solicitudesPago.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Solicitudes de pago</h4>
          {compra.solicitudesPago.map((sp) => (
            <Link
              key={sp.id}
              to={`/pagos/solicitudes?anio=${sp.anio}&mes=${sp.mes}&abrir=${sp.id}`}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-xs transition hover:border-[var(--color-primary)]"
            >
              <span className="font-semibold">Solicitud Nº {sp.numero} · {String(sp.mes).padStart(2, "0")}/{sp.anio}</span>
              <span className="text-[var(--color-on-surface-variant)]">
                {sp.estado === "PAGADA" ? "Pagada" : sp.estado === "SOLICITADA" ? "Pedida · falta pago" : "Por pedir"} · Bs {Number(sp.total).toFixed(2)}
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Historial del pedido</h4>
        <LineaTiempoCompra compra={compra} />
      </section>

      {!anulada && yaRecibio ? (
        <section className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4 text-xs text-[var(--color-on-surface-variant)]">
          Este pedido ya tiene mercadería recibida, así que no se anula desde aquí: anularlo revierte el stock.
          {canAnularRecibida ? (
            <>
              {" "}
              <Link to={`/inventario/recepcion?pedido=${compra.id}&vista=recibidas`} className="font-semibold text-[var(--color-primary)] hover:underline">
                Anular desde Recepción
              </Link>
              .
            </>
          ) : null}
        </section>
      ) : null}

      {canAnular && !anulada && !yaRecibio ? (
        <section className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4">
          {!mostrarAnular ? (
            <button
              type="button"
              onClick={() => setMostrarAnular(true)}
              className="text-xs font-semibold text-[var(--color-error)] hover:underline"
            >
              Anular este pedido
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold text-[var(--color-error)]">Anular pedido — acción irreversible</p>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Como todavía no llegó nada, el pedido solo quedará marcado como anulado: no se mueve el stock.
              </p>
              <textarea
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                rows={2}
                placeholder="Motivo de la anulación (obligatorio)"
                className={`${inputClassName} text-xs`}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!motivo.trim() || anularMutation.isPending}
                  onClick={confirmarAnulacion}
                  className="rounded-lg bg-[var(--color-error)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {anularMutation.isPending ? "Anulando..." : "Confirmar anulación"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarAnular(false);
                    setMotivo("");
                  }}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

// ── Pantalla ─────────────────────────────────────────────────────────────────
export function PedidosCompraPage() {
  const { can } = usePermisos();
  const canCreate = can("inventario.compras", "crear");
  const canDocumento = can("inventario.compras", "documento");
  const canAnular = can("inventario.compras", "anular");
  const canVerAnulaciones = can("inventario.compras", "ver_anulaciones");
  const canVerRecepcion = can("inventario.recepcion", "ver");
  const canRecibir = can("inventario.recepcion", "recibir");
  const canAnularRecibida = can("inventario.recepcion", "anular");

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("pedido") ?? "";
  const [pestana, setPestana] = useState<Pestana>("seguimiento");

  const periodoInicial = useMemo(() => rangoPeriodo("mes"), []);
  const [estado, setEstado] = useState<FiltroEstado>("");
  const [documento, setDocumento] = useState<FiltroDocumento>("");
  const [proveedorId, setProveedorId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [fechaInicio, setFechaInicio] = useState(periodoInicial.inicio);
  const [fechaFin, setFechaFin] = useState(periodoInicial.fin);
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

  const filtrosComunes: Partial<ComprasQueryParams> = {
    proveedorId: proveedorId ? Number(proveedorId) : undefined,
    fechaInicio: fechaInicio || undefined,
    fechaFin: fechaFin || undefined,
    busqueda: busquedaRetrasada || undefined
  };

  const comprasQuery = useComprasQuery({
    page,
    limit: 10,
    estado: estado || undefined,
    documento: documento || undefined,
    ...filtrosComunes
  });
  const resumenQuery = useComprasResumenQuery({ page: 1, limit: 10, ...filtrosComunes });
  const resumen = resumenQuery.data?.data;
  const compras = comprasQuery.data?.data ?? [];
  const meta = comprasQuery.data?.meta;

  function seleccionar(id: string) {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("pedido", id);
    else next.delete("pedido");
    setSearchParams(next, { replace: true });
  }

  function alternarEstado(valor: FiltroEstado) {
    setEstado((actual) => (actual === valor ? "" : valor));
    setPage(1);
  }

  function alternarDocumento(valor: FiltroDocumento) {
    setDocumento((actual) => (actual === valor ? "" : valor));
    setPage(1);
  }

  function aplicarPeriodo(tipo: "mes" | "90dias" | "todo") {
    const rango = rangoPeriodo(tipo);
    setFechaInicio(rango.inicio);
    setFechaFin(rango.fin);
    setPage(1);
  }

  const hayFiltros = Boolean(estado || documento || proveedorId || busqueda);
  const cargandoResumen = resumenQuery.isLoading;

  const pestanas: Array<{ clave: Pestana; etiqueta: string; visible: boolean }> = [
    { clave: "seguimiento", etiqueta: "Seguimiento", visible: true },
    { clave: "nuevo", etiqueta: "Nuevo pedido", visible: canCreate },
    { clave: "anulaciones", etiqueta: "Pedidos anulados", visible: canVerAnulaciones }
  ];

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
              <ClipboardList size={18} />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-extrabold">Pedidos de compra</h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
                Crea los pedidos a proveedores y sigue cada uno: si ya llegó, qué falta y si tiene factura o recibo.
                Lo que llega a almacén se confirma en Recepción.
              </p>
            </div>
          </div>
          {canVerRecepcion ? (
            <Link
              to="/inventario/recepcion"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-primary)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
            >
              <PackageCheck size={16} />
              Ir a Recepción
            </Link>
          ) : null}
        </div>

        <nav className="mt-6 flex flex-wrap gap-1 border-b border-[var(--color-border-soft)]" aria-label="Secciones">
          {pestanas
            .filter((item) => item.visible)
            .map((item) => (
              <button
                key={item.clave}
                type="button"
                onClick={() => setPestana(item.clave)}
                aria-current={pestana === item.clave ? "page" : undefined}
                className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                  pestana === item.clave
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
                }`}
              >
                {item.etiqueta}
              </button>
            ))}
        </nav>
      </header>

      {pestana === "nuevo" ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 text-lg font-bold">Nuevo pedido de compra</h2>
          <NuevoPedidoCompraForm
            canCreate={canCreate}
            onCreated={(id) => {
              seleccionar(id);
              setPestana("seguimiento");
            }}
          />
        </article>
      ) : null}

      {pestana === "anulaciones" && canVerAnulaciones ? (
        <article className="rounded-xl border border-[var(--color-error)]/25 bg-[var(--color-surface-container-low)] p-5">
          <h2 className="text-lg font-bold">Pedidos anulados</h2>
          <p className="mb-4 mt-1 text-sm text-[var(--color-on-surface-variant)]">
            Pedidos que se cancelaron antes de que llegara mercadería: no movieron el stock. Las compras ya recibidas que
            se anularon están en Recepción.
          </p>
          <AnulacionesComprasPanel tipo="pedido" />
        </article>
      ) : null}

      {pestana === "seguimiento" ? (
        <>
          <article className="space-y-4 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Tablero de seguimiento</h2>
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  Cuenta los pedidos del período y proveedor elegidos. Toca un número para filtrar el listado.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { clave: "mes" as const, etiqueta: "Este mes" },
                  { clave: "90dias" as const, etiqueta: "Últimos 90 días" },
                  { clave: "todo" as const, etiqueta: "Todo" }
                ].map((preset) => (
                  <button
                    key={preset.clave}
                    type="button"
                    onClick={() => aplicarPeriodo(preset.clave)}
                    className="rounded-full border border-[var(--color-outline-variant)] px-3 py-1 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    {preset.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {resumen && resumen.recibidosSinDocumento > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setEstado("");
                  setDocumento("PENDIENTE");
                  setPage(1);
                }}
                className="flex w-full items-center gap-2 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-4 py-2.5 text-left text-sm text-[var(--color-warning)] transition hover:bg-[var(--color-warning)]/16"
              >
                <AlertTriangle size={16} className="shrink-0" />
                <span>
                  <strong>{resumen.recibidosSinDocumento}</strong>{" "}
                  {resumen.recibidosSinDocumento === 1 ? "pedido ya llegó" : "pedidos ya llegaron"} y todavía no{" "}
                  {resumen.recibidosSinDocumento === 1 ? "tiene" : "tienen"} factura ni recibo registrado. Toca para verlos.
                </span>
              </button>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">¿Ya llegó?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Contador etiqueta="Por recibir" valor={resumen?.estados.PENDIENTE} activo={estado === "PENDIENTE"} onClick={() => alternarEstado("PENDIENTE")} cargando={cargandoResumen} />
                  <Contador etiqueta="Recibido parcial" valor={resumen?.estados.PARCIAL} activo={estado === "PARCIAL"} onClick={() => alternarEstado("PARCIAL")} cargando={cargandoResumen} />
                  <Contador etiqueta="Recibido completo" valor={resumen?.estados.COMPLETADO} activo={estado === "COMPLETADO"} onClick={() => alternarEstado("COMPLETADO")} cargando={cargandoResumen} />
                  <Contador etiqueta="Anulados" valor={resumen?.estados.ANULADA} activo={estado === "ANULADA"} onClick={() => alternarEstado("ANULADA")} cargando={cargandoResumen} />
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">¿Tiene documento?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Contador etiqueta="Falta documento" valor={resumen?.documentos.PENDIENTE} activo={documento === "PENDIENTE"} onClick={() => alternarDocumento("PENDIENTE")} cargando={cargandoResumen} />
                  <Contador etiqueta="Con factura" valor={resumen?.documentos.FACTURA} activo={documento === "FACTURA"} onClick={() => alternarDocumento("FACTURA")} cargando={cargandoResumen} />
                  <Contador etiqueta="Con recibo" valor={resumen?.documentos.RECIBO} activo={documento === "RECIBO"} onClick={() => alternarDocumento("RECIBO")} cargando={cargandoResumen} />
                  <Contador etiqueta="Sin documento" valor={resumen?.documentos.SIN_DOCUMENTO} activo={documento === "SIN_DOCUMENTO"} onClick={() => alternarDocumento("SIN_DOCUMENTO")} cargando={cargandoResumen} />
                </div>
              </div>
            </div>
          </article>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)]">
            <article className="min-w-0 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
              <h2 className="mb-4 text-lg font-bold">Pedidos</h2>

              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="relative sm:col-span-2">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(event) => {
                      setBusqueda(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Buscar por proveedor, número de documento, producto u observación"
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
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(event) => {
                      setFechaInicio(event.target.value);
                      setPage(1);
                    }}
                    className={inputClassName}
                    aria-label="Desde"
                  />
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(event) => {
                      setFechaFin(event.target.value);
                      setPage(1);
                    }}
                    className={inputClassName}
                    aria-label="Hasta"
                  />
                </div>
                {hayFiltros ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEstado("");
                      setDocumento("");
                      setProveedorId("");
                      setBusqueda("");
                      setPage(1);
                    }}
                    className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] sm:col-span-2"
                  >
                    Quitar filtros
                  </button>
                ) : null}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--color-border-soft)]">
                      <th className={thClassName}>Pedido</th>
                      <th className={thClassName}>Llegada</th>
                      <th className={thClassName}>Documento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-soft)]">
                    {comprasQuery.isLoading ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                          Cargando pedidos...
                        </td>
                      </tr>
                    ) : null}
                    {!comprasQuery.isLoading && compras.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                          No se encontraron pedidos con estos filtros.
                        </td>
                      </tr>
                    ) : null}
                    {compras.map((compra) => {
                      const avance = avanceDeCompra(compra);
                      const llegada = llegadaDeEstado(compra.estado);
                      const activa = compra.id === selectedId;
                      return (
                        <tr
                          key={compra.id}
                          onClick={() => seleccionar(compra.id)}
                          aria-selected={activa}
                          className={`cursor-pointer align-top transition ${
                            activa
                              ? "bg-[var(--color-primary)]/10"
                              : "hover:bg-[var(--color-surface-container-highest)]"
                          }`}
                        >
                          <td className="px-3 py-3 text-xs">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                seleccionar(compra.id);
                              }}
                              className="text-left"
                            >
                              <span className="block font-semibold text-[var(--color-on-surface)]">{compra.proveedor?.nombre ?? "-"}</span>
                              <span className="block text-[11px] text-[var(--color-on-surface-variant)]">
                                {formatFecha(fechaDeCompra(compra))} · {compra.items.length} {compra.items.length === 1 ? "ítem" : "ítems"}
                              </span>
                              <span className="block text-[11px] font-semibold text-[var(--color-on-surface)]">{formatBs(avance.pedidoBs)}</span>
                            </button>
                          </td>
                          <td className="min-w-[130px] px-3 py-3">
                            <LlegadaBadge estado={compra.estado} />
                            {compra.estado !== "ANULADA" ? (
                              <div className="mt-2 space-y-1">
                                <BarraAvance porcentaje={avance.porcentaje} tono={llegada.tono} />
                                <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                                  {Math.round(avance.porcentaje)} % · {avance.itemsCompletos}/{avance.itemsTotal} ítems
                                </p>
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">
                            <DocumentoBadge compra={compra} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

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
              <h2 className="mb-4 text-lg font-bold">Detalle del pedido</h2>
              {selectedId ? (
                <DetallePedido
                  compraId={selectedId}
                  canDocumento={canDocumento}
                  canAnular={canAnular}
                  canRecibir={canRecibir}
                  canAnularRecibida={canAnularRecibida}
                />
              ) : (
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  Elige un pedido de la lista para ver qué llegó, su documento y su historial.
                </p>
              )}
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}
