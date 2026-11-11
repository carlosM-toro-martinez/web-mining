import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Plus, Search, Wallet } from "lucide-react";
import { usePermisos } from "@/features/auth/hooks/usePermisos";
import { useResumenSolicitudesQuery, useSolicitudesQuery } from "@/features/solicitudesPago/hooks/useSolicitudesPago";
import { exportarSolicitudesExcel, exportarSolicitudesPdf } from "@/features/solicitudesPago/lib/exportFormulario";
import { exportarPlanillaExcel, exportarPlanillaPdf } from "@/features/solicitudesPago/lib/exportPlanilla";
import { MESES, fechaCorta, firmaDe, formatBs, TIPOS_FIRMA } from "@/features/solicitudesPago/lib/etiquetas";
import type { EstadoSolicitud, SolicitudPago } from "@/features/solicitudesPago/model/solicitudesPago.schema";
import { InsigniaDocumento, InsigniaEntrega, InsigniaPago } from "@/features/solicitudesPago/ui/Insignias";
import { SolicitudDetalleModal } from "@/features/solicitudesPago/ui/SolicitudDetalleModal";
import { SolicitudFormModal } from "@/features/solicitudesPago/ui/SolicitudFormModal";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";

const inputClassName =
  "rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]";
const botonSecundario =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-50";

type Atajo = "TODAS" | EstadoSolicitud | "SIN_FACTURA" | "POR_ENTREGAR";

export function SolicitudesPagoPage() {
  const { can } = usePermisos();
  const ahora = new Date();
  // Desde un pedido de compra se llega con ?anio=&mes=&abrir=<id>
  const [params, setParams] = useSearchParams();
  const [anio, setAnio] = useState(Number(params.get("anio")) || ahora.getFullYear());
  const [mes, setMes] = useState(Number(params.get("mes")) || ahora.getMonth() + 1);
  const [atajo, setAtajo] = useState<Atajo>("TODAS");
  const [busqueda, setBusqueda] = useState("");
  const [detalleId, setDetalleId] = useState<string | null>(params.get("abrir"));
  useEffect(() => {
    if (!params.has("abrir")) return;
    const limpio = new URLSearchParams(params);
    limpio.delete("abrir");
    setParams(limpio, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [formulario, setFormulario] = useState<{ abierto: boolean; solicitud: SolicitudPago | null }>({ abierto: false, solicitud: null });

  // El listado del mes se trae completo; los atajos y la búsqueda filtran en pantalla
  const lista = useSolicitudesQuery({ anio, mes, sinPaginar: true });
  const resumen = useResumenSolicitudesQuery({ anio, mes });
  const todas = lista.data?.data ?? [];

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return todas.filter((s) => {
      if (atajo === "SIN_FACTURA" && !(s.estado === "PAGADA" && !s.tipoDocumento)) return false;
      if (atajo === "POR_ENTREGAR" && !(s.estado === "PAGADA" && s.estadoEntrega !== "COMPLETADO")) return false;
      if (atajo !== "TODAS" && atajo !== "SIN_FACTURA" && atajo !== "POR_ENTREGAR" && s.estado !== atajo) return false;
      if (!texto) return true;
      return (
        s.beneficiarioNombre.toLowerCase().includes(texto) ||
        String(s.numero) === texto ||
        (s.numeroFactura ?? "").toLowerCase().includes(texto) ||
        s.items.some((item) => item.descripcion.toLowerCase().includes(texto))
      );
    });
  }, [todas, atajo, busqueda]);

  const r = resumen.data?.data;
  const tarjetas: Array<{ clave: Atajo; titulo: string; valor: number; detalle?: string; alerta?: boolean }> = [
    { clave: "TODAS", titulo: "Todas", valor: r?.total ?? 0 },
    { clave: "BORRADOR", titulo: "Por pedir", valor: r?.estados.BORRADOR ?? 0, detalle: formatBs(r?.montos.BORRADOR ?? 0) },
    { clave: "SOLICITADA", titulo: "Pedidas · falta pago", valor: r?.estados.SOLICITADA ?? 0, detalle: formatBs(r?.montos.SOLICITADA ?? 0) },
    { clave: "PAGADA", titulo: "Pagadas", valor: r?.estados.PAGADA ?? 0, detalle: formatBs(r?.montos.PAGADA ?? 0) },
    { clave: "SIN_FACTURA", titulo: "Pagadas sin factura", valor: r?.pagadasSinDocumento ?? 0, alerta: (r?.pagadasSinDocumento ?? 0) > 0 },
    { clave: "POR_ENTREGAR", titulo: "Pagadas por entregar", valor: r?.pagadasPorEntregar ?? 0, alerta: (r?.pagadasPorEntregar ?? 0) > 0 }
  ];

  const anios = Array.from({ length: 5 }, (_, i) => ahora.getFullYear() - 3 + i);

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
              <Wallet size={18} />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-extrabold">Solicitudes de pago</h1>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Pagos de montos altos: lo que se pide, lo que ya se pagó, las firmas y las facturas que faltan.
              </p>
            </div>
          </div>
          {can("pagos.solicitudes", "crear") ? (
            <button
              type="button"
              onClick={() => setFormulario({ abierto: true, solicitud: null })}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] hover:opacity-90"
            >
              <Plus size={15} /> Nueva solicitud
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={inputClassName} aria-label="Mes">
          {MESES.map((nombre, i) => (
            <option key={nombre} value={i + 1}>{nombre.charAt(0).toUpperCase() + nombre.slice(1)}</option>
          ))}
        </select>
        <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={inputClassName} aria-label="Año">
          {anios.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar beneficiario, Nº, factura o detalle" className={`${inputClassName} w-full pl-9`} />
        </div>
        <button type="button" disabled={!todas.length} className={botonSecundario} onClick={() => exportarPlanillaPdf(todas, anio, mes)}>
          <Download size={14} /> Planilla PDF
        </button>
        <button type="button" disabled={!todas.length} className={botonSecundario} onClick={() => exportarPlanillaExcel(todas, anio, mes)}>
          <Download size={14} /> Planilla Excel
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tarjetas.map((tarjeta) => (
          <button
            key={tarjeta.clave}
            type="button"
            onClick={() => setAtajo(tarjeta.clave)}
            className={`rounded-xl border p-3 text-left transition ${
              atajo === tarjeta.clave
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-primary)]"
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{tarjeta.titulo}</p>
            <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tarjeta.alerta ? "text-red-500" : ""}`}>{tarjeta.valor}</p>
            {tarjeta.detalle ? <p className="text-xs text-[var(--color-on-surface-variant)]">{tarjeta.detalle}</p> : null}
          </button>
        ))}
      </div>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        {lista.isLoading ? (
          <p className="py-8 text-center text-sm text-[var(--color-on-surface-variant)]">Cargando...</p>
        ) : lista.isError ? (
          <p className="py-8 text-center text-sm text-red-500">No se pudieron cargar las solicitudes.</p>
        ) : visibles.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
            {todas.length === 0 ? "No hay solicitudes en este mes." : "Ninguna solicitud coincide con el filtro."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th className="pb-2 pr-3">Nº</th>
                  <th className="pb-2 pr-3">Fecha</th>
                  <th className="pb-2 pr-3">Beneficiario y detalle</th>
                  <th className="pb-2 pr-3 text-right">Total</th>
                  <th className="pb-2 pr-3">Firmas</th>
                  <th className="pb-2 pr-3">Pago</th>
                  <th className="pb-2 pr-3">Factura</th>
                  <th className="pb-2 pr-3">Entrega</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {visibles.map((s) => {
                  const firmadas = TIPOS_FIRMA.filter((tipo) => firmaDe(s, tipo)?.firmadoAt).length;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setDetalleId(s.id)}
                      className={`cursor-pointer border-t border-[var(--color-border-soft)] hover:bg-[var(--color-surface-container)] ${s.estado === "ANULADA" ? "opacity-60" : ""}`}
                    >
                      <td className="py-2.5 pr-3 font-bold tabular-nums">{s.numero}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">{fechaCorta(s.fecha)}</td>
                      <td className="max-w-[320px] py-2.5 pr-3">
                        <p className="truncate font-semibold">{s.beneficiarioNombre}</p>
                        <p className="truncate text-xs text-[var(--color-on-surface-variant)]">{s.items.map((item) => item.descripcion).join(" · ")}</p>
                      </td>
                      <td className={`py-2.5 pr-3 text-right tabular-nums ${s.estado === "ANULADA" ? "line-through" : ""}`}>{formatBs(s.total)}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-xs" title={TIPOS_FIRMA.map((t) => `${t}: ${firmaDe(s, t)?.firmadoAt ? "firmada" : "falta"}`).join("\n")}>
                        {s.estado === "ANULADA" ? "—" : `${firmadas} de 4`}
                      </td>
                      <td className="py-2.5 pr-3"><InsigniaPago estado={s.estado} /></td>
                      <td className="py-2.5 pr-3"><InsigniaDocumento solicitud={s} /></td>
                      <td className="py-2.5 pr-3"><InsigniaEntrega solicitud={s} /></td>
                      <td className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className={botonSecundario} onClick={() => exportarSolicitudesPdf([s])} title="Formulario PDF">
                          <Download size={13} /> PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {todas.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-soft)] pt-3 text-xs text-[var(--color-on-surface-variant)]">
            <span>
              {visibles.length} de {todas.length} solicitudes · las anuladas no suman al total
            </span>
            <button type="button" className={botonSecundario} onClick={() => exportarSolicitudesPdf(visibles.filter((s) => s.estado !== "ANULADA"))} disabled={!visibles.some((s) => s.estado !== "ANULADA")}>
              <Download size={13} /> Formularios mostrados (PDF)
            </button>
            <button type="button" className={botonSecundario} onClick={() => exportarSolicitudesExcel(visibles.filter((s) => s.estado !== "ANULADA"))} disabled={!visibles.some((s) => s.estado !== "ANULADA")}>
              <Download size={13} /> Formularios mostrados (Excel)
            </button>
          </div>
        ) : null}
      </article>

      <SolicitudDetalleModal
        id={detalleId}
        onClose={() => setDetalleId(null)}
        onEditar={(solicitud) => {
          setDetalleId(null);
          setFormulario({ abierto: true, solicitud });
        }}
      />
      <SolicitudFormModal
        isOpen={formulario.abierto}
        solicitud={formulario.solicitud}
        anio={anio}
        mes={mes}
        onClose={() => setFormulario({ abierto: false, solicitud: null })}
      />
    </section>
  );
}
