import { FormEvent, useMemo, useState } from "react";
import { Ban, CheckCircle2, FileSpreadsheet, FileText, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import {
  useAgregarItemConceptoMutation,
  useAnularLiquidacionMutation,
  useCerrarLiquidacionMutation,
  useCreateLiquidacionMutation,
  useLiquidacionDetailQuery,
  useLiquidacionesQuery,
  useQuitarItemConceptoMutation
} from "@/features/liquidacion/hooks/useLiquidacion";
import type { EstadoLiquidacion, TipoPeriodoLiquidacion } from "@/features/liquidacion/model/liquidacion.schema";
import {
  exportLiquidacionEmpresaExcel,
  exportLiquidacionEmpresaPdf,
  exportLiquidacionParticularExcel,
  exportLiquidacionParticularPdf
} from "@/features/logisticaReportes/lib/logisticaExport";
import { useConceptosLiquidacionQuery } from "@/features/parametrosLogistica/hooks/useParametrosLogistica";
import { useRemitentesQuery } from "@/features/remitente/hooks/useRemitentes";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

const ESTADO_LABEL: Record<EstadoLiquidacion, string> = {
  BORRADOR: "Borrador",
  CERRADO: "Cerrado",
  ANULADO: "Anulado"
};

const ESTADO_CLASS: Record<EstadoLiquidacion, string> = {
  BORRADOR: "bg-[var(--color-warning)]/20 text-[var(--color-warning)]",
  CERRADO: "bg-[var(--color-success)]/18 text-[var(--color-success)]",
  ANULADO: "bg-[var(--color-error)]/18 text-[var(--color-error)]"
};

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function formatMoneda(value: string | number) {
  return Number(value).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO");
}

export function LiquidacionesPage() {
  const { showError, showSuccess } = useToast();

  const [filtroEstado, setFiltroEstado] = useState("");
  const liquidacionesQuery = useLiquidacionesQuery({ estado: filtroEstado || undefined });
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const detalleQuery = useLiquidacionDetailQuery(selectedId);

  const remitentesQuery = useRemitentesQuery();
  const conceptosQuery = useConceptosLiquidacionQuery();

  const createMutation = useCreateLiquidacionMutation();
  const agregarItemMutation = useAgregarItemConceptoMutation();
  const quitarItemMutation = useQuitarItemConceptoMutation();
  const cerrarMutation = useCerrarLiquidacionMutation();
  const anularMutation = useAnularLiquidacionMutation();

  const liquidaciones = liquidacionesQuery.data?.data ?? [];
  const liquidacion = detalleQuery.data?.data ?? null;
  const remitentes = remitentesQuery.data?.data ?? [];
  const conceptos = conceptosQuery.data?.data ?? [];

  const [remitenteId, setRemitenteId] = useState("");
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodoLiquidacion>("SEMANAL");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [conceptoId, setConceptoId] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcionConcepto, setDescripcionConcepto] = useState("");

  const totales = useMemo(() => {
    if (!liquidacion) return null;
    const bruto = (liquidacion.detalleLotes ?? []).reduce((acc, d) => acc + Number(d.subtotal), 0);
    const abonos = (liquidacion.itemsConcepto ?? [])
      .filter((i) => i.concepto?.tipo === "ABONO")
      .reduce((acc, i) => acc + Number(i.monto), 0);
    const deducciones = (liquidacion.itemsConcepto ?? [])
      .filter((i) => i.concepto?.tipo === "DEDUCCION")
      .reduce((acc, i) => acc + Number(i.monto), 0);
    return { bruto, abonos, deducciones, neto: bruto + abonos - deducciones };
  }, [liquidacion]);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(
      { remitenteId: Number(remitenteId), tipoPeriodo, fechaInicio, fechaFin },
      {
        onSuccess: (response) => {
          showSuccess("Liquidación creada en borrador con los lotes acopiados del período.");
          setSelectedId(response.data.id);
          setRemitenteId("");
          setFechaInicio("");
          setFechaFin("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la liquidación."))
      }
    );
  }

  function handleAgregarItem(id: string) {
    if (!conceptoId || !monto) {
      showError("Elige un concepto e ingresa el monto.");
      return;
    }
    agregarItemMutation.mutate(
      { id, payload: { conceptoId: Number(conceptoId), monto: Number(monto), descripcion: descripcionConcepto.trim() || undefined } },
      {
        onSuccess: () => {
          showSuccess("Concepto agregado.");
          setConceptoId("");
          setMonto("");
          setDescripcionConcepto("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo agregar el concepto."))
      }
    );
  }

  function handleQuitarItem(id: string, itemId: string) {
    quitarItemMutation.mutate(
      { id, itemId },
      {
        onSuccess: () => showSuccess("Concepto quitado."),
        onError: (error) => showError(normalizeError(error, "No se pudo quitar el concepto."))
      }
    );
  }

  function handleCerrar(id: string) {
    const confirmed = window.confirm(
      "¿Cerrar esta liquidación? Los lotes incluidos pasarán a LIQUIDADO y ya no se podrán modificar los conceptos."
    );
    if (!confirmed) return;

    cerrarMutation.mutate(id, {
      onSuccess: () => showSuccess("Liquidación cerrada."),
      onError: (error) => showError(normalizeError(error, "No se pudo cerrar la liquidación."))
    });
  }

  function handleAnular(id: string) {
    const motivo = window.prompt("Motivo de la anulación de la liquidación:");
    if (!motivo || !motivo.trim()) return;

    anularMutation.mutate(
      { id, payload: { motivo: motivo.trim() } },
      {
        onSuccess: () => showSuccess("Liquidación anulada. Los lotes cerrados vuelven a estar disponibles para liquidar."),
        onError: (error) => showError(normalizeError(error, "No se pudo anular la liquidación."))
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
            <ReceiptText size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Liquidaciones</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Liquidaciones semanales o mensuales a remitentes, calculadas sobre sus lotes acopiados y
              con conceptos de abono/deducción configurables.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Plus size={16} className="text-[var(--color-primary)]" />
          Nueva liquidación
        </h2>
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-5" onSubmit={handleCreate}>
          <select required value={remitenteId} onChange={(e) => setRemitenteId(e.target.value)} className={inputClassName}>
            <option value="">Remitente...</option>
            {remitentes.map((r) => (
              <option key={r.id} value={r.id}>{r.nombreORazonSocial}</option>
            ))}
          </select>
          <select value={tipoPeriodo} onChange={(e) => setTipoPeriodo(e.target.value as TipoPeriodoLiquidacion)} className={inputClassName}>
            <option value="SEMANAL">Semanal (sábado a viernes)</option>
            <option value="MENSUAL">Mensual</option>
          </select>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Desde</label>
            <input required type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Hasta</label>
            <input required type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className={inputClassName} />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            {createMutation.isPending ? "Creando..." : "Crear liquidación"}
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Liquidaciones registradas</h2>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={`${inputClassName} w-48`}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {["Remitente", "Período", "Desde", "Hasta", "Estado", "Total neto", "Acciones"].map((title) => (
                  <th key={title} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {liquidacionesQuery.isLoading ? (
                <tr><td colSpan={7} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">Cargando liquidaciones...</td></tr>
              ) : null}
              {!liquidacionesQuery.isLoading && liquidaciones.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">No se encontraron liquidaciones.</td></tr>
              ) : null}
              {liquidaciones.map((item) => (
                <tr key={item.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-3 py-2 text-xs font-semibold">{item.remitente?.nombreORazonSocial ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{item.tipoPeriodo === "SEMANAL" ? "Semanal" : "Mensual"}</td>
                  <td className="px-3 py-2 text-xs">{formatFecha(item.fechaInicio)}</td>
                  <td className="px-3 py-2 text-xs">{formatFecha(item.fechaFin)}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ESTADO_CLASS[item.estado]}`}>
                      {ESTADO_LABEL[item.estado]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">Bs {formatMoneda(item.totalNeto)}</td>
                  <td className="px-3 py-2 text-xs">
                    <button type="button" onClick={() => setSelectedId(item.id)} className={buttonSecondaryClassName}>
                      <Search size={13} />
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {selectedId ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          {detalleQuery.isLoading ? (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando detalle de la liquidación...</p>
          ) : liquidacion && totales ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{liquidacion.remitente?.nombreORazonSocial}</h2>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                    {formatFecha(liquidacion.fechaInicio)} — {formatFecha(liquidacion.fechaFin)} ·{" "}
                    {liquidacion.tipoPeriodo === "SEMANAL" ? "Semanal" : "Mensual"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${ESTADO_CLASS[liquidacion.estado]}`}>
                    {ESTADO_LABEL[liquidacion.estado]}
                  </span>
                  {liquidacion.estado === "CERRADO" ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          liquidacion.remitente?.tipoEntidad === "TRABAJADOR_PARTICULAR"
                            ? exportLiquidacionParticularExcel(liquidacion)
                            : exportLiquidacionEmpresaExcel(liquidacion)
                        }
                        className={buttonSecondaryClassName}
                      >
                        <FileSpreadsheet size={13} /> Excel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          liquidacion.remitente?.tipoEntidad === "TRABAJADOR_PARTICULAR"
                            ? exportLiquidacionParticularPdf(liquidacion)
                            : exportLiquidacionEmpresaPdf(liquidacion)
                        }
                        className={buttonSecondaryClassName}
                      >
                        <FileText size={13} /> PDF
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {liquidacion.anulacion ? (
                <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/8 px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                  <span className="font-bold text-[var(--color-error)]">Anulada.</span> Motivo: {liquidacion.anulacion.motivo}
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
                  Lotes incluidos ({liquidacion.detalleLotes?.length ?? 0})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                        <th className="py-1 pr-3">Correlativo</th>
                        <th className="py-1 pr-3 text-right">Tonelaje neto</th>
                        <th className="py-1 pr-3 text-right">Precio/ton</th>
                        <th className="py-1 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-soft)]">
                      {(liquidacion.detalleLotes ?? []).map((d) => (
                        <tr key={d.id}>
                          <td className="py-1 pr-3 font-mono">{d.lote?.correlativo ?? d.loteId}</td>
                          <td className="py-1 pr-3 text-right">{formatMoneda(d.tonelajeNeto)}</td>
                          <td className="py-1 pr-3 text-right">{formatMoneda(d.precioAplicado)}</td>
                          <td className="py-1 text-right font-semibold">Bs {formatMoneda(d.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
                  Conceptos de abono / deducción
                </h3>
                <div className="space-y-2">
                  {(liquidacion.itemsConcepto ?? []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            item.concepto?.tipo === "ABONO"
                              ? "bg-[var(--color-success)]/18 text-[var(--color-success)]"
                              : "bg-[var(--color-error)]/18 text-[var(--color-error)]"
                          }`}
                        >
                          {item.concepto?.tipo === "ABONO" ? "Abono" : "Deducción"}
                        </span>
                        <span>{item.concepto?.nombre}{item.descripcion ? ` — ${item.descripcion}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">Bs {formatMoneda(item.monto)}</span>
                        {liquidacion.estado === "BORRADOR" ? (
                          <button
                            type="button"
                            onClick={() => handleQuitarItem(liquidacion.id, item.id)}
                            className="text-[var(--color-error)] hover:opacity-70"
                            title="Quitar concepto"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {(liquidacion.itemsConcepto ?? []).length === 0 ? (
                    <p className="text-xs text-[var(--color-on-surface-variant)]">Sin conceptos agregados.</p>
                  ) : null}
                </div>

                {liquidacion.estado === "BORRADOR" ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border-soft)] p-3">
                    <select value={conceptoId} onChange={(e) => setConceptoId(e.target.value)} className={`${inputClassName} w-56`}>
                      <option value="">Concepto...</option>
                      {conceptos.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre} ({c.tipo === "ABONO" ? "Abono" : "Deducción"})</option>
                      ))}
                    </select>
                    <input type="number" min="0.01" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={`${inputClassName} w-32`} placeholder="Monto" />
                    <input value={descripcionConcepto} onChange={(e) => setDescripcionConcepto(e.target.value)} className={`${inputClassName} w-56`} placeholder="Descripción (opcional)" />
                    <button
                      type="button"
                      onClick={() => handleAgregarItem(liquidacion.id)}
                      disabled={agregarItemMutation.isPending}
                      className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                    >
                      Agregar
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4 text-sm sm:grid-cols-4">
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">Bruto</span>Bs {formatMoneda(totales.bruto)}</p>
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">Abonos</span>Bs {formatMoneda(totales.abonos)}</p>
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">Deducciones</span>Bs {formatMoneda(totales.deducciones)}</p>
                <p className="font-bold"><span className="block text-[11px] font-normal text-[var(--color-on-surface-variant)]">Neto</span>Bs {formatMoneda(totales.neto)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {liquidacion.estado === "BORRADOR" ? (
                  <button
                    type="button"
                    onClick={() => handleCerrar(liquidacion.id)}
                    disabled={cerrarMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                  >
                    <CheckCircle2 size={14} /> Cerrar liquidación
                  </button>
                ) : null}
                {liquidacion.estado !== "ANULADO" ? (
                  <button
                    type="button"
                    onClick={() => handleAnular(liquidacion.id)}
                    disabled={anularMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-error)]/45 px-4 py-2 text-sm font-semibold text-[var(--color-error)] disabled:opacity-50"
                  >
                    <Ban size={14} /> Anular liquidación
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">No se encontró la liquidación seleccionada.</p>
          )}
        </article>
      ) : null}
    </section>
  );
}
