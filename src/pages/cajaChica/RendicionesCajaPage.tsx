import { FormEvent, useEffect, useState } from "react";
import {
  Ban,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Plus,
  ReceiptText,
  Search
} from "lucide-react";
import {
  useAnularRendicionCajaMutation,
  useCerrarRendicionCajaMutation,
  useCreateRendicionCajaMutation,
  usePreviewRendicionCajaQuery,
  useRendicionCajaDetailQuery,
  useRendicionesCajaQuery
} from "@/features/rendicionCaja/hooks/useRendicionCaja";
import type { EstadoRendicionCaja } from "@/features/rendicionCaja/model/rendicionCaja.schema";
import { useCajasChicasQuery } from "@/features/parametrosCajaChica/hooks/useParametrosCajaChica";
import { encontrarCajaLipena } from "@/features/parametrosCajaChica/lib/defaultCaja";
import {
  getComprobanteDiario,
  getReporteRendicion
} from "@/features/reportesCajaChica/api/reportesCajaChicaApi";
import {
  exportComprobanteDiarioExcel,
  exportComprobanteDiarioPdf,
  exportReporteRendicionExcel,
  exportReporteRendicionPdf
} from "@/features/reportesCajaChica/lib/cajaChicaExport";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] invalid:border-[var(--color-error)] invalid:ring-1 invalid:ring-[var(--color-error)]/30";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

const ESTADO_LABEL: Record<EstadoRendicionCaja, string> = {
  BORRADOR: "Borrador",
  CERRADO: "Cerrado",
  ANULADO: "Anulado"
};
const ESTADO_CLASS: Record<EstadoRendicionCaja, string> = {
  BORRADOR: "bg-[var(--color-warning)]/20 text-[var(--color-warning)]",
  CERRADO: "bg-[var(--color-success)]/18 text-[var(--color-success)]",
  ANULADO: "bg-[var(--color-error)]/18 text-[var(--color-error)]"
};

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function formatMoneda(value: string | number) {
  return Number(value).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO");
}

export function RendicionesCajaPage() {
  const { showError, showSuccess } = useToast();

  const cajasQuery = useCajasChicasQuery();
  const cajas = cajasQuery.data?.data ?? [];

  const [filtroCaja, setFiltroCaja] = useState("");
  const rendicionesQuery = useRendicionesCajaQuery({
    cajaId: filtroCaja ? Number(filtroCaja) : undefined
  });
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const detalleQuery = useRendicionCajaDetailQuery(selectedId);

  const createMutation = useCreateRendicionCajaMutation();
  const cerrarMutation = useCerrarRendicionCajaMutation();
  const anularMutation = useAnularRendicionCajaMutation();
  const [exportando, setExportando] = useState<
    "caja-excel" | "caja-pdf" | "diario-excel" | "diario-pdf" | null
  >(null);

  const rendiciones = rendicionesQuery.data?.data ?? [];
  const rendicion = detalleQuery.data?.data ?? null;

  const [cajaId, setCajaId] = useState("");
  const [periodoDesde, setPeriodoDesde] = useState("");
  const [periodoHasta, setPeriodoHasta] = useState("");
  const [tipoCambio, setTipoCambio] = useState("12.43");

  const previewQuery = usePreviewRendicionCajaQuery({
    cajaId: cajaId ? Number(cajaId) : undefined,
    periodoDesde: periodoDesde || undefined,
    periodoHasta: periodoHasta || undefined
  });
  const preview = previewQuery.data?.data;

  // Caja Bolivianos Lipeña es la única que se usa a diario: se preselecciona
  // sola en cuanto carga la lista, en ambos formularios de esta página.
  useEffect(() => {
    if (cajas.length === 0) return;
    const lipena = String(encontrarCajaLipena(cajas)?.id ?? "");
    if (!cajaId) setCajaId(lipena);
    if (!filtroCaja) setFiltroCaja(lipena);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajas]);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(
      { cajaId: Number(cajaId), periodoDesde, periodoHasta, tipoCambio: Number(tipoCambio) },
      {
        onSuccess: (response) => {
          showSuccess(`Rendición ${response.data.numero} creada en borrador.`);
          setSelectedId(response.data.id);
          setPeriodoDesde("");
          setPeriodoHasta("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la rendición."))
      }
    );
  }

  function handleCerrar(id: string) {
    const confirmed = window.confirm(
      "¿Cerrar esta rendición? Los gastos incluidos pasarán a RENDIDO."
    );
    if (!confirmed) return;

    cerrarMutation.mutate(id, {
      onSuccess: () => showSuccess("Rendición cerrada."),
      onError: (error) => showError(normalizeError(error, "No se pudo cerrar la rendición."))
    });
  }

  async function handleExportCaja(id: string, formato: "excel" | "pdf") {
    setExportando(formato === "excel" ? "caja-excel" : "caja-pdf");
    try {
      const response = await getReporteRendicion(id);
      if (formato === "excel") exportReporteRendicionExcel(response.data);
      else exportReporteRendicionPdf(response.data);
    } catch (error) {
      showError(normalizeError(error, "No se pudo generar el reporte de la caja."));
    } finally {
      setExportando(null);
    }
  }

  async function handleExportComprobante(id: string, formato: "excel" | "pdf") {
    setExportando(formato === "excel" ? "diario-excel" : "diario-pdf");
    try {
      const response = await getComprobanteDiario(id);
      if (formato === "excel") exportComprobanteDiarioExcel(response.data);
      else exportComprobanteDiarioPdf(response.data);
    } catch (error) {
      showError(normalizeError(error, "No se pudo generar el comprobante de diario."));
    } finally {
      setExportando(null);
    }
  }

  function handleAnular(id: string) {
    const motivo = window.prompt("Motivo de la anulación de la rendición:");
    if (!motivo || !motivo.trim()) return;

    anularMutation.mutate(
      { id, payload: { motivo: motivo.trim() } },
      {
        onSuccess: () =>
          showSuccess("Rendición anulada. Los gastos vuelven a estar disponibles para rendir."),
        onError: (error) => showError(normalizeError(error, "No se pudo anular la rendición."))
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
            <h1 className="font-headline text-3xl font-extrabold">Rendiciones de Caja</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Una rendición es el cierre formal periódico (semanal o mensual) de una caja: toma
              todos los gastos ya registrados en un rango de fechas, calcula el total gastado y el
              saldo deudor/acreedor, y genera el documento oficial (Excel/PDF) que se envía a
              contabilidad — el mismo formato del reporte impreso mensual.{" "}
              <strong>
                No necesitas crear una rendición para ver cuánto tienes disponible hoy
              </strong>{" "}
              (eso está en "Saldos y Movimientos"); esta sección es solo para cerrar el período
              formalmente.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <Plus size={16} className="text-[var(--color-primary)]" />
          Nueva rendición
        </h2>
        <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
          Elige la caja y el rango de fechas a cerrar (ej. del lunes al viernes, o todo el mes). Se
          arma en <strong>Borrador</strong> con los gastos "Registrado" de ese rango — todavía
          puedes anularla sin efecto. Al <strong>Cerrar</strong>, esos gastos pasan a "Rendido" (ya
          no se pueden anular sueltos) y quedan fijados en el documento oficial que puedes exportar
          abajo.
        </p>
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-5" onSubmit={handleCreate}>
          <select
            required
            value={cajaId}
            onChange={(e) => setCajaId(e.target.value)}
            className={inputClassName}
          >
            <option value="">Caja...</option>
            {cajas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
              Desde
            </label>
            <input
              required
              type="date"
              value={periodoDesde}
              onChange={(e) => setPeriodoDesde(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
              Hasta
            </label>
            <input
              required
              type="date"
              value={periodoHasta}
              onChange={(e) => setPeriodoHasta(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
              Tipo de cambio
            </label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={tipoCambio}
              onChange={(e) => setTipoCambio(e.target.value)}
              className={inputClassName}
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="self-end rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            {createMutation.isPending ? "Creando..." : "Crear rendición"}
          </button>
        </form>
      </article>

      {periodoDesde && periodoHasta && cajaId ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
            <Search size={16} className="text-[var(--color-primary)]" />
            Vista previa del período
          </h2>
          <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
            Esto es lo que incluiría la rendición si la creas ahora — todavía no se guarda nada ni
            se gasta un folio. Cambia las fechas de arriba para ver otro rango.
          </p>
          {previewQuery.isLoading ? (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Calculando...</p>
          ) : preview ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4 text-sm sm:grid-cols-4">
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">Gastos incluidos</span>{preview.gastos.length}</p>
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">Fondos recibidos</span>{formatMoneda(preview.totalFondos)}</p>
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">Total gastos</span>{formatMoneda(preview.totalGastos)}</p>
                <p className="font-bold">
                  <span className="block text-[11px] font-normal text-[var(--color-on-surface-variant)]">Saldo nuevo</span>
                  {formatMoneda(preview.saldoNuevo)}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      <th className="py-1 pr-3">Fecha</th>
                      <th className="py-1 pr-3">Proveedor</th>
                      <th className="py-1 pr-3">Glosa</th>
                      <th className="py-1 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-soft)]">
                    {preview.gastos.map((g) => (
                      <tr key={g.id}>
                        <td className="py-1 pr-3">{formatFecha(g.fecha)}</td>
                        <td className="py-1 pr-3">{g.proveedorNombre}</td>
                        <td className="py-1 pr-3">{g.glosa}</td>
                        <td className="py-1 text-right font-semibold">{g.moneda} {formatMoneda(g.montoTotal)}</td>
                      </tr>
                    ))}
                    {preview.gastos.length === 0 ? (
                      <tr><td colSpan={4} className="py-3 text-center text-[var(--color-on-surface-variant)]">Sin gastos registrados en este rango todavía.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </article>
      ) : null}

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Rendiciones registradas</h2>
          <select
            value={filtroCaja}
            onChange={(e) => setFiltroCaja(e.target.value)}
            className={`${inputClassName} w-56`}
          >
            <option value="">Todas las cajas</option>
            {cajas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {["N°", "Caja", "Desde", "Hasta", "Estado", "Saldo nuevo", "Acciones"].map(
                  (title) => (
                    <th
                      key={title}
                      className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]"
                    >
                      {title}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {rendicionesQuery.isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]"
                  >
                    Cargando rendiciones...
                  </td>
                </tr>
              ) : null}
              {!rendicionesQuery.isLoading && rendiciones.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]"
                  >
                    No se encontraron rendiciones.
                  </td>
                </tr>
              ) : null}
              {rendiciones.map((item) => (
                <tr
                  key={item.id}
                  className="transition hover:bg-[var(--color-surface-container-highest)]"
                >
                  <td className="px-3 py-2 font-mono text-xs">{item.numero}</td>
                  <td className="px-3 py-2 text-xs">{item.caja?.nombre ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{formatFecha(item.periodoDesde)}</td>
                  <td className="px-3 py-2 text-xs">{formatFecha(item.periodoHasta)}</td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ESTADO_CLASS[item.estado]}`}
                    >
                      {ESTADO_LABEL[item.estado]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{formatMoneda(item.saldoNuevo)}</td>
                  <td className="px-3 py-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={buttonSecondaryClassName}
                    >
                      <Search size={13} /> Ver
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
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              Cargando detalle de la rendición...
            </p>
          ) : rendicion ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-mono text-xl font-bold">{rendicion.numero}</h2>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                    {rendicion.caja?.nombre} · {formatFecha(rendicion.periodoDesde)} —{" "}
                    {formatFecha(rendicion.periodoHasta)} · T/C {rendicion.tipoCambio}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${ESTADO_CLASS[rendicion.estado]}`}
                >
                  {ESTADO_LABEL[rendicion.estado]}
                </span>
              </div>

              {rendicion.anulacion ? (
                <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/8 px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                  <span className="font-bold text-[var(--color-error)]">Anulada.</span> Motivo:{" "}
                  {rendicion.anulacion.motivo}
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
                  Gastos incluidos ({rendicion.detalleGastos?.length ?? 0})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                        <th className="py-1 pr-3">Proveedor</th>
                        <th className="py-1 pr-3">Glosa</th>
                        <th className="py-1 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-soft)]">
                      {(rendicion.detalleGastos ?? []).map((d) => (
                        <tr key={d.id}>
                          <td className="py-1 pr-3">{d.gasto?.proveedorNombre ?? "-"}</td>
                          <td className="py-1 pr-3">{d.gasto?.glosa ?? "-"}</td>
                          <td className="py-1 text-right font-semibold">
                            {d.gasto?.moneda} {formatMoneda(d.montoIncluido)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4 text-sm sm:grid-cols-3">
                <p>
                  <span className="block text-[11px] text-[var(--color-on-surface-variant)]">
                    Fondos recibidos
                  </span>
                  {formatMoneda(rendicion.totalFondos)}
                </p>
                <p>
                  <span className="block text-[11px] text-[var(--color-on-surface-variant)]">
                    Total gastos
                  </span>
                  {formatMoneda(rendicion.totalGastos)}
                </p>
                <p>
                  <span className="block text-[11px] text-[var(--color-on-surface-variant)]">
                    Retenciones
                  </span>
                  {formatMoneda(rendicion.totalRetenciones)}
                </p>
                <p>
                  <span className="block text-[11px] text-[var(--color-on-surface-variant)]">
                    Crédito fiscal
                  </span>
                  {formatMoneda(rendicion.totalCreditoFiscal)}
                </p>
                <p>
                  <span className="block text-[11px] text-[var(--color-on-surface-variant)]">
                    Saldo anterior
                  </span>
                  {formatMoneda(rendicion.saldoAnterior)}
                </p>
                <p className="font-bold">
                  <span className="block text-[11px] font-normal text-[var(--color-on-surface-variant)]">
                    Saldo nuevo
                  </span>
                  {formatMoneda(rendicion.saldoNuevo)}
                </p>
              </div>
              <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                "Retenciones" y "Crédito fiscal" son solo el resumen rápido de esta rendición. El
                detalle completo (para el SIAT) está en Reportes → Resumen de retenciones, y también
                aparecen línea por línea en el Comprobante de Diario de abajo.
              </p>

              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
                    Reporte mensual "Caja {rendicion.caja?.nombre}" (fondos y detalle de gastos)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportCaja(rendicion.id, "excel")}
                      disabled={exportando !== null}
                      className={buttonSecondaryClassName}
                    >
                      <FileSpreadsheet size={13} />{" "}
                      {exportando === "caja-excel" ? "Generando..." : "Exportar Excel"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportCaja(rendicion.id, "pdf")}
                      disabled={exportando !== null}
                      className={buttonSecondaryClassName}
                    >
                      <FileText size={13} />{" "}
                      {exportando === "caja-pdf" ? "Generando..." : "Exportar PDF"}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
                    Comprobante de Diario (asiento contable Bs./$us.)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportComprobante(rendicion.id, "excel")}
                      disabled={exportando !== null}
                      className={buttonSecondaryClassName}
                    >
                      <FileSpreadsheet size={13} />{" "}
                      {exportando === "diario-excel" ? "Generando..." : "Exportar Excel"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportComprobante(rendicion.id, "pdf")}
                      disabled={exportando !== null}
                      className={buttonSecondaryClassName}
                    >
                      <FileText size={13} />{" "}
                      {exportando === "diario-pdf" ? "Generando..." : "Exportar PDF"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {rendicion.estado === "BORRADOR" ? (
                    <button
                      type="button"
                      onClick={() => handleCerrar(rendicion.id)}
                      disabled={cerrarMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                    >
                      <CheckCircle2 size={14} /> Cerrar rendición
                    </button>
                  ) : null}
                  {rendicion.estado !== "ANULADO" ? (
                    <button
                      type="button"
                      onClick={() => handleAnular(rendicion.id)}
                      disabled={anularMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-error)]/45 px-4 py-2 text-sm font-semibold text-[var(--color-error)] disabled:opacity-50"
                    >
                      <Ban size={14} /> Anular rendición
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              No se encontró la rendición seleccionada.
            </p>
          )}
        </article>
      ) : null}
    </section>
  );
}
