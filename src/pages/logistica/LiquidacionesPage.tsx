import { useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  History,
  ReceiptText,
  Search,
  Trash2,
  Truck
} from "lucide-react";
import {
  useAgregarItemConceptoMutation,
  useAnularLiquidacionMutation,
  useCerrarLiquidacionMutation,
  useCreateLiquidacionMutation,
  useLiquidacionDetailQuery,
  useLiquidacionPreviewQuery,
  useLiquidacionesQuery,
  useQuitarItemConceptoMutation
} from "@/features/liquidacion/hooks/useLiquidacion";
import type {
  EstadoLiquidacion,
  PreviewLoteLiquidacion,
  TipoPeriodoLiquidacion
} from "@/features/liquidacion/model/liquidacion.schema";
import {
  agruparPorPlaca,
  exportLiquidacionEmpresaExcel,
  exportLiquidacionEmpresaPdf,
  exportLiquidacionParticularExcel,
  exportLiquidacionParticularPdf
} from "@/features/logisticaReportes/lib/logisticaExport";
import { useConceptosLiquidacionQuery } from "@/features/parametrosLogistica/hooks/useParametrosLogistica";
import { useTransportistasQuery } from "@/features/transportista/hooks/useTransportistas";
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
  const [busqueda, setBusqueda] = useState("");
  const liquidacionesQuery = useLiquidacionesQuery({ estado: filtroEstado || undefined });
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const detalleQuery = useLiquidacionDetailQuery(selectedId);

  const transportistasQuery = useTransportistasQuery();
  const conceptosQuery = useConceptosLiquidacionQuery();

  const createMutation = useCreateLiquidacionMutation();
  const agregarItemMutation = useAgregarItemConceptoMutation();
  const quitarItemMutation = useQuitarItemConceptoMutation();
  const cerrarMutation = useCerrarLiquidacionMutation();
  const anularMutation = useAnularLiquidacionMutation();

  const liquidacionesSinFiltrar = liquidacionesQuery.data?.data ?? [];
  const liquidaciones = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return liquidacionesSinFiltrar;
    return liquidacionesSinFiltrar.filter((item) =>
      (item.transportista?.nombreORazonSocial ?? "").toLowerCase().includes(term)
    );
  }, [liquidacionesSinFiltrar, busqueda]);
  const liquidacion = detalleQuery.data?.data ?? null;
  const transportistas = transportistasQuery.data?.data ?? [];
  const conceptos = conceptosQuery.data?.data ?? [];

  // --- Buscar (preview) + cerrar: primero se elige transportista + rango y
  // se ve QUÉ hay antes de comprometerse a crear o cerrar nada. Solo se
  // dispara el preview cuando las 3 cosas están completas.
  const [transportistaId, setTransportistaId] = useState("");
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodoLiquidacion>("SEMANAL");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [mostrarDetallePreview, setMostrarDetallePreview] = useState(false);

  const previewParams = useMemo(() => {
    if (!transportistaId || !fechaInicio || !fechaFin) return null;
    return { transportistaId: Number(transportistaId), fechaInicio, fechaFin };
  }, [transportistaId, fechaInicio, fechaFin]);
  const previewQuery = useLiquidacionPreviewQuery(previewParams);
  const preview = previewQuery.data?.data ?? null;

  const previewPorPlaca = useMemo(() => {
    if (!preview) return [];
    const grupos = new Map<string, { placa: string; viajes: number; pesoTotal: number; subtotal: number }>();
    for (const lote of preview.lotes) {
      const actual = grupos.get(lote.vehiculoPlaca) ?? { placa: lote.vehiculoPlaca, viajes: 0, pesoTotal: 0, subtotal: 0 };
      actual.viajes += 1;
      actual.pesoTotal += lote.tonelajeNeto;
      actual.subtotal += lote.subtotal;
      grupos.set(lote.vehiculoPlaca, actual);
    }
    return Array.from(grupos.values());
  }, [preview]);

  // Historial de pagos ya cerrados de este transportista (independiente del
  // rango que se esté buscando) — así, apenas se elige el transportista, se
  // ve qué se le pagó antes sin tener que ir a buscarlo en la tabla de abajo.
  const historialTransportistaQuery = useLiquidacionesQuery(
    { transportistaId: Number(transportistaId) || undefined, estado: "CERRADO" },
    Boolean(transportistaId)
  );
  const historialTransportista = historialTransportistaQuery.data?.data ?? [];

  const [conceptoId, setConceptoId] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcionConcepto, setDescripcionConcepto] = useState("");
  const [mostrarDetallePorLote, setMostrarDetallePorLote] = useState(false);

  const filasPorPlaca = useMemo(() => (liquidacion ? agruparPorPlaca(liquidacion) : []), [liquidacion]);

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

  function resetBusqueda() {
    setTransportistaId("");
    setFechaInicio("");
    setFechaFin("");
    setMostrarDetallePreview(false);
  }

  // Acción principal: crea la liquidación con lo que muestra el preview y la
  // cierra de inmediato en el mismo paso — así los viajes de ese rango
  // quedan marcados como pagados sin pasar por un borrador intermedio.
  function handleCerrarDirecto() {
    if (!previewParams) return;
    createMutation.mutate(
      { transportistaId: previewParams.transportistaId, tipoPeriodo, fechaInicio: previewParams.fechaInicio, fechaFin: previewParams.fechaFin },
      {
        onSuccess: (response) => {
          const nuevaId = response.data.id;
          setSelectedId(nuevaId);
          cerrarMutation.mutate(nuevaId, {
            onSuccess: () => {
              showSuccess("Liquidación cerrada: los viajes de este rango ya están pagados.");
              resetBusqueda();
            },
            onError: (error) =>
              showError(
                normalizeError(error, "La liquidación se creó pero no se pudo cerrar. Ciérrala manualmente abajo, en el detalle.")
              )
          });
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la liquidación."))
      }
    );
  }

  // Ruta alternativa para cuando todavía hace falta agregar abonos o
  // deducciones antes de cerrar: deja la liquidación en BORRADOR y abre su
  // detalle, donde están esos controles.
  function handleCrearBorrador() {
    if (!previewParams) return;
    createMutation.mutate(
      { transportistaId: previewParams.transportistaId, tipoPeriodo, fechaInicio: previewParams.fechaInicio, fechaFin: previewParams.fechaFin },
      {
        onSuccess: (response) => {
          showSuccess("Liquidación creada en borrador. Agrega abonos/deducciones abajo y ciérrala cuando quieras.");
          setSelectedId(response.data.id);
          resetBusqueda();
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
              Elige un transportista (empresa o particular) y un rango de fechas para ver qué viajes
              acopiados tiene pendientes de pago en ese rango, y ciérralos ahí mismo: quedan marcados
              como pagados y ya no se pueden modificar.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Search size={16} className="text-[var(--color-primary)]" />
          Buscar viajes pendientes de pago
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <select value={transportistaId} onChange={(e) => setTransportistaId(e.target.value)} className={inputClassName}>
            <option value="">Transportista o empresa...</option>
            {transportistas.map((r) => (
              <option key={r.id} value={r.id}>{r.nombreORazonSocial}</option>
            ))}
          </select>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Desde</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Hasta</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className={inputClassName} />
          </div>
          <select value={tipoPeriodo} onChange={(e) => setTipoPeriodo(e.target.value as TipoPeriodoLiquidacion)} className={inputClassName}>
            <option value="SEMANAL">Período: Semanal</option>
            <option value="MENSUAL">Período: Mensual</option>
          </select>
        </div>

        {!previewParams ? (
          <p className="mt-4 text-xs text-[var(--color-on-surface-variant)]">
            Elige transportista, desde y hasta para ver los viajes pendientes de ese rango.
          </p>
        ) : previewQuery.isLoading ? (
          <p className="mt-4 text-sm text-[var(--color-on-surface-variant)]">Buscando viajes acopiados en ese rango...</p>
        ) : previewQuery.isError ? (
          <p className="mt-4 text-sm text-[var(--color-error)]">
            {normalizeError(previewQuery.error, "No se pudo calcular el pendiente de este transportista.")}
          </p>
        ) : preview && preview.totalLotes === 0 ? (
          <p className="mt-4 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-sm text-[var(--color-on-surface-variant)]">
            {preview.transportista.nombreORazonSocial} no tiene viajes acopiados (pesados, sin pagar) en ese rango.
          </p>
        ) : preview ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 px-3 py-2 text-xs text-[var(--color-warning)]">
              <span>
                {preview.totalLotes} viaje{preview.totalLotes === 1 ? "" : "s"} pendiente{preview.totalLotes === 1 ? "" : "s"} de{" "}
                {preview.transportista.nombreORazonSocial}, todavía sin pagar.
              </span>
              <span className="font-bold">Total: Bs {formatMoneda(preview.totalBruto)}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {previewPorPlaca.map((f) => (
                <div key={f.placa} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-md bg-[var(--color-primary)]/12 px-2 py-1 font-mono text-sm font-bold text-[var(--color-primary)]">
                      {f.placa}
                    </span>
                    <span className="rounded-full bg-[var(--color-surface-container-highest)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-on-surface-variant)]">
                      {f.viajes} viaje{f.viajes === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-on-surface-variant)]">{formatMoneda(f.pesoTotal)} TMB</p>
                  <p className="mt-1 text-lg font-bold">Bs {formatMoneda(f.subtotal)}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setMostrarDetallePreview((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:opacity-80"
            >
              {mostrarDetallePreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {mostrarDetallePreview ? "Ocultar detalle por viaje" : "Ver detalle por viaje (correlativo, fecha)"}
            </button>

            {mostrarDetallePreview ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      <th className="py-1 pr-3">Correlativo</th>
                      <th className="py-1 pr-3">Fecha</th>
                      <th className="py-1 pr-3">Placa</th>
                      <th className="py-1 pr-3">Mineral</th>
                      <th className="py-1 pr-3 text-right">Tonelaje neto</th>
                      <th className="py-1 pr-3 text-right">Precio/ton</th>
                      <th className="py-1 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-soft)]">
                    {preview.lotes.map((l: PreviewLoteLiquidacion) => (
                      <tr key={l.loteId}>
                        <td className="py-1 pr-3 font-mono">{l.correlativo}</td>
                        <td className="py-1 pr-3">{formatFecha(l.fechaDespachoReal)}</td>
                        <td className="py-1 pr-3 font-mono">{l.vehiculoPlaca}</td>
                        <td className="py-1 pr-3">{l.tipoMineral}</td>
                        <td className="py-1 pr-3 text-right">{formatMoneda(l.tonelajeNeto)}</td>
                        <td className="py-1 pr-3 text-right">{formatMoneda(l.precioAplicado)}</td>
                        <td className="py-1 text-right font-semibold">Bs {formatMoneda(l.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCerrarDirecto}
                disabled={createMutation.isPending || cerrarMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                {createMutation.isPending || cerrarMutation.isPending
                  ? "Cerrando..."
                  : `Cerrar y marcar como pagado (Bs ${formatMoneda(preview.totalBruto)})`}
              </button>
              <button
                type="button"
                onClick={handleCrearBorrador}
                disabled={createMutation.isPending}
                className={buttonSecondaryClassName}
                title="Para agregar abonos o deducciones antes de cerrar"
              >
                Crear como borrador (agregar abonos/deducciones antes)
              </button>
            </div>
          </div>
        ) : null}
      </article>

      {transportistaId ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
            <History size={14} className="text-[var(--color-primary)]" />
            Ya pagado a {transportistas.find((t) => String(t.id) === transportistaId)?.nombreORazonSocial ?? "este transportista"}
          </h2>
          {historialTransportistaQuery.isLoading ? (
            <p className="text-xs text-[var(--color-on-surface-variant)]">Cargando historial...</p>
          ) : historialTransportista.length === 0 ? (
            <p className="text-xs text-[var(--color-on-surface-variant)]">Todavía no tiene liquidaciones cerradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    <th className="py-1 pr-3">Nº</th>
                    <th className="py-1 pr-3">Desde</th>
                    <th className="py-1 pr-3">Hasta</th>
                    <th className="py-1 pr-3 text-right">Total pagado</th>
                    <th className="py-1"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {historialTransportista.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1 pr-3 font-mono">{item.numero ?? "-"}</td>
                      <td className="py-1 pr-3">{formatFecha(item.fechaInicio)}</td>
                      <td className="py-1 pr-3">{formatFecha(item.fechaFin)}</td>
                      <td className="py-1 pr-3 text-right font-semibold">Bs {formatMoneda(item.totalNeto)}</td>
                      <td className="py-1 text-right">
                        <button type="button" onClick={() => setSelectedId(item.id)} className={buttonSecondaryClassName}>
                          <Search size={12} /> Ver sus carreras
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      ) : null}

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Historial de liquidaciones (todos los transportistas)</h2>
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            {liquidaciones.length.toLocaleString("es-BO")} de {liquidacionesSinFiltrar.length.toLocaleString("es-BO")}
          </span>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
            />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`${inputClassName} pl-9`}
              placeholder="Buscar por transportista"
            />
          </div>
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
                {["Nº", "Transportista", "Período", "Desde", "Hasta", "Estado", "Total neto", "Acciones"].map((title) => (
                  <th key={title} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {liquidacionesQuery.isLoading ? (
                <tr><td colSpan={8} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">Cargando liquidaciones...</td></tr>
              ) : null}
              {!liquidacionesQuery.isLoading && liquidaciones.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">No se encontraron liquidaciones.</td></tr>
              ) : null}
              {liquidaciones.map((item) => (
                <tr key={item.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-3 py-2 font-mono text-xs">{item.numero ?? "-"}</td>
                  <td className="px-3 py-2 text-xs font-semibold">{item.transportista?.nombreORazonSocial ?? "-"}</td>
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
                  <h2 className="text-xl font-bold">
                    {liquidacion.numero ? `Nº ${liquidacion.numero} — ` : ""}
                    {liquidacion.transportista?.nombreORazonSocial}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                    {formatFecha(liquidacion.fechaInicio)} — {formatFecha(liquidacion.fechaFin)} ·{" "}
                    {liquidacion.tipoPeriodo === "SEMANAL" ? "Semanal" : "Mensual"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${ESTADO_CLASS[liquidacion.estado]}`}>
                    {ESTADO_LABEL[liquidacion.estado]}
                  </span>
                  {liquidacion.estado !== "ANULADO" ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          liquidacion.transportista?.tipoEntidad === "TRABAJADOR_PARTICULAR"
                            ? exportLiquidacionParticularExcel(liquidacion)
                            : exportLiquidacionEmpresaExcel(liquidacion)
                        }
                        className={buttonSecondaryClassName}
                        title={liquidacion.estado === "BORRADOR" ? "Vista previa (todavía sin número de folio)" : undefined}
                      >
                        <FileSpreadsheet size={13} /> Excel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          liquidacion.transportista?.tipoEntidad === "TRABAJADOR_PARTICULAR"
                            ? exportLiquidacionParticularPdf(liquidacion)
                            : exportLiquidacionEmpresaPdf(liquidacion)
                        }
                        className={buttonSecondaryClassName}
                        title={liquidacion.estado === "BORRADOR" ? "Vista previa (todavía sin número de folio)" : undefined}
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

              {liquidacion.estado === "BORRADOR" ? (
                <div className="rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 px-3 py-2 text-xs text-[var(--color-warning)]">
                  Vista previa: el Excel/PDF ya se puede descargar y se recalcula con lo que tengas ahora, pero
                  todavía no tiene número de folio (sale como "BORRADOR") — el número definitivo se asigna
                  recién al cerrar.
                </div>
              ) : null}

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
                  <Truck size={14} className="text-[var(--color-primary)]" />
                  Lotes incluidos — resumen por vehículo ({liquidacion.detalleLotes?.length ?? 0} lote
                  {(liquidacion.detalleLotes?.length ?? 0) === 1 ? "" : "s"})
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filasPorPlaca.map((f) => (
                    <div
                      key={f.placa}
                      className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="rounded-md bg-[var(--color-primary)]/12 px-2 py-1 font-mono text-sm font-bold text-[var(--color-primary)]">
                          {f.placa}
                        </span>
                        <span className="rounded-full bg-[var(--color-surface-container-highest)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-on-surface-variant)]">
                          {f.viajes} viaje{f.viajes === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                        {formatMoneda(f.pesoTotal)} TMB · Bs {formatMoneda(f.precioAplicado)}/ton
                      </p>
                      <p className="mt-1 text-lg font-bold">Bs {formatMoneda(f.subtotal)}</p>
                    </div>
                  ))}
                  {filasPorPlaca.length === 0 ? (
                    <p className="text-xs text-[var(--color-on-surface-variant)] sm:col-span-2 lg:col-span-3">
                      Sin lotes incluidos.
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarDetallePorLote((v) => !v)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:opacity-80"
                >
                  {mostrarDetallePorLote ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {mostrarDetallePorLote ? "Ocultar detalle por lote" : "Ver detalle por lote (correlativo, fecha)"}
                </button>

                {mostrarDetallePorLote ? (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                          <th className="py-1 pr-3">Correlativo</th>
                          <th className="py-1 pr-3">Placa</th>
                          <th className="py-1 pr-3 text-right">Tonelaje neto</th>
                          <th className="py-1 pr-3 text-right">Precio/ton</th>
                          <th className="py-1 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border-soft)]">
                        {(liquidacion.detalleLotes ?? []).map((d) => (
                          <tr key={d.id}>
                            <td className="py-1 pr-3 font-mono">{d.lote?.correlativo ?? d.loteId}</td>
                            <td className="py-1 pr-3 font-mono">{d.lote?.vehiculo?.placa ?? "-"}</td>
                            <td className="py-1 pr-3 text-right">{formatMoneda(d.tonelajeNeto)}</td>
                            <td className="py-1 pr-3 text-right">{formatMoneda(d.precioAplicado)}</td>
                            <td className="py-1 text-right font-semibold">Bs {formatMoneda(d.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
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
