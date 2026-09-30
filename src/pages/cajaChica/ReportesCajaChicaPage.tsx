import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, FileBarChart2, FileSpreadsheet, FileText, Landmark, PieChart, Receipt, Scale, Search, Wallet } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  useReporteDesgloseQuery,
  useReporteImpuestosQuery,
  useReporteNoDeduciblesQuery,
  useReporteRetencionesQuery
} from "@/features/reportesCajaChica/hooks/useReportesCajaChica";
import {
  exportReporteRetencionesExcel,
  exportReporteRetencionesPdf,
  exportTablaReporteCajaChicaExcel,
  exportTablaReporteCajaChicaPdf
} from "@/features/reportesCajaChica/lib/cajaChicaExport";
import { useCajasChicasQuery } from "@/features/parametrosCajaChica/hooks/useParametrosCajaChica";
import { encontrarCajaLipena } from "@/features/parametrosCajaChica/lib/defaultCaja";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] invalid:border-[var(--color-error)] invalid:ring-1 invalid:ring-[var(--color-error)]/30";

function formatMoneda(value: number) {
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// timeZone: "UTC" es a propósito: estas fechas son calendario (medianoche
// UTC guardada desde un <input type="date">), no un instante — sin esto,
// un navegador en Bolivia (UTC-4) las corre un día para atrás al mostrarlas.
function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO", { timeZone: "UTC" });
}

function inicioDeMesActual() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

// Año/mes/día LOCAL (Bolivia), nunca toISOString() sobre el instante
// actual: esa conversión corre a UTC antes de recortar, así que entre las
// 20:00 y las 23:59 hora boliviana ya devolvía la fecha de MAÑANA.
function hoy() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type TipoReporte = "resumen-caja-banco" | "impuestos" | "retenciones" | "no-deducibles" | "desglose";

const TIPO_DOCUMENTO_LABEL: Record<string, string> = {
  FACTURA: "Factura",
  CONTRATO_RETENCION: "Contrato / Retención",
  RECIBO: "Recibo",
  RECIBO_DIRECTO: "Recibo directo"
};

const REPORT_GROUPS: Array<{
  title: string;
  reports: Array<{ type: TipoReporte; title: string; description: string }>;
}> = [
  {
    title: "Resumen del período",
    reports: [
      {
        type: "resumen-caja-banco",
        title: "Caja vs. Banco",
        description: "Cuánto se gastó pagado desde caja y cuánto directo del banco, por moneda."
      },
      {
        type: "desglose",
        title: "Desglose de costos",
        description: "Por centro de costo, función de gasto, cuenta contable y categoría del reporte mensual."
      }
    ]
  },
  {
    title: "Para declarar y auditar",
    reports: [
      {
        type: "impuestos",
        title: "Impuestos por Documento",
        description: "Todos los gastos con Factura, Contrato/Retención, Recibo y Recibo Directo — cuánto crédito fiscal y cuánto hay que retener/declarar."
      },
      {
        type: "retenciones",
        title: "Resumen de Retenciones (SIAT)",
        description: "RC-IVA, IUE Compras e IT retenidos — el reporte formal para declarar."
      },
      {
        type: "no-deducibles",
        title: "Gastos No Deducibles",
        description: "Recibos directos sin respaldo suficiente, para control y auditoría interna."
      }
    ]
  }
];

const TIPOS_VALIDOS = new Set<string>(REPORT_GROUPS.flatMap((g) => g.reports.map((r) => r.type)));

function isTipoReporte(value: string | undefined): value is TipoReporte {
  return Boolean(value && TIPOS_VALIDOS.has(value));
}

// Filtro compartido (caja + rango de fechas) que usan los 4 reportes — cada
// uno mantiene su propio estado (no hay nada global), pero la UI es idéntica
// en los 4 para que se sienta como una sola pantalla.
function useFiltroPeriodo() {
  const cajasQuery = useCajasChicasQuery();
  const cajas = cajasQuery.data?.data ?? [];

  const [cajaId, setCajaId] = useState("");
  const [fechaInicio, setFechaInicio] = useState(inicioDeMesActual);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [consultado, setConsultado] = useState(true);

  useEffect(() => {
    if (!cajaId && cajas.length > 0) setCajaId(String(encontrarCajaLipena(cajas)?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajas]);

  const params = useMemo(
    () => ({
      cajaId: cajaId ? Number(cajaId) : undefined,
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined
    }),
    [cajaId, fechaInicio, fechaFin]
  );

  return { cajas, cajaId, setCajaId, fechaInicio, setFechaInicio, fechaFin, setFechaFin, consultado, setConsultado, params };
}

function FiltroPeriodo({ filtro }: { filtro: ReturnType<typeof useFiltroPeriodo> }) {
  return (
    <article className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-secondary)]/16 text-[var(--color-secondary)]">
          <Search size={14} />
        </span>
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface)]">Período a consultar</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select value={filtro.cajaId} onChange={(e) => filtro.setCajaId(e.target.value)} className={inputClassName}>
          <option value="">Todas las cajas</option>
          {filtro.cajas.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <input type="date" value={filtro.fechaInicio} onChange={(e) => filtro.setFechaInicio(e.target.value)} className={inputClassName} />
        <input type="date" value={filtro.fechaFin} onChange={(e) => filtro.setFechaFin(e.target.value)} className={inputClassName} />
        <button
          type="button"
          onClick={() => filtro.setConsultado(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
        >
          <Search size={14} /> Consultar
        </button>
      </div>
    </article>
  );
}

// ============================================================================
// Caja vs. Banco
// ============================================================================
function ResumenCajaBancoReport() {
  const filtro = useFiltroPeriodo();
  const desgloseQuery = useReporteDesgloseQuery(filtro.consultado ? filtro.params : { cajaId: undefined });
  const desglose = desgloseQuery.data?.data;

  const porOrigenOrdenado = useMemo(() => [...(desglose?.porOrigen ?? [])].sort((a, b) => b.total - a.total), [desglose]);
  const totalCaja = porOrigenOrdenado.filter((o) => o.origen === "CAJA");
  const totalBanco = porOrigenOrdenado.filter((o) => o.origen === "BANCO");

  function handleExportExcel() {
    exportTablaReporteCajaChicaExcel({
      subtitulo: `CAJA VS. BANCO — ${formatFecha(filtro.fechaInicio)} al ${formatFecha(filtro.fechaFin)}`,
      columnas: ["Origen", "Moneda", "Gastos", "Total"],
      filas: porOrigenOrdenado.map((o) => [o.origen === "CAJA" ? "Desde caja" : "Directo del banco", o.moneda, o.cantidad, o.total]),
      nombreArchivo: "resumen-caja-banco",
      colsNumericas: [2, 3],
      anchoColumnas: [18, 12, 12, 16]
    });
  }
  function handleExportPdf() {
    exportTablaReporteCajaChicaPdf({
      subtitulo: `CAJA VS. BANCO — ${formatFecha(filtro.fechaInicio)} al ${formatFecha(filtro.fechaFin)}`,
      columnas: ["Origen", "Moneda", "Gastos", "Total"],
      filas: porOrigenOrdenado.map((o) => [o.origen === "CAJA" ? "Desde caja" : "Directo del banco", o.moneda, o.cantidad, formatMoneda(o.total)]),
      nombreArchivo: "resumen-caja-banco",
      colsNumericas: [2, 3]
    });
  }

  return (
    <>
      <FiltroPeriodo filtro={filtro} />
      {filtro.consultado ? (
        <article className="rounded-xl border-2 border-[var(--color-primary)]/40 bg-[var(--color-primary)]/[0.06] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                <Scale size={14} />
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-primary)]">
                Cuánto se gastó: caja vs. banco
              </h2>
            </div>
            {desglose ? (
              <div className="flex gap-2">
                <button type="button" onClick={handleExportExcel} className={buttonSecondaryClassName}>
                  <FileSpreadsheet size={13} /> Excel
                </button>
                <button type="button" onClick={handleExportPdf} className={buttonSecondaryClassName}>
                  <FileText size={13} /> PDF
                </button>
              </div>
            ) : null}
          </div>
          {desglose ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
                  <Wallet size={13} className="text-[var(--color-success)]" /> Desde caja
                </p>
                {totalCaja.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Sin gastos de caja en este período.</p>
                ) : (
                  <div className="mt-2 space-y-1">
                    {totalCaja.map((o) => (
                      <p key={`${o.origen}-${o.moneda}`} className="flex items-baseline justify-between">
                        <span className="text-xs text-[var(--color-on-surface-variant)]">{o.cantidad} gasto(s) en {o.moneda}</span>
                        <span className="font-mono text-xl font-extrabold text-[var(--color-success)]">{o.moneda} {formatMoneda(o.total)}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
                  <Landmark size={13} className="text-[var(--color-tertiary)]" /> Directo del banco
                </p>
                {totalBanco.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Sin gastos directos de banco en este período.</p>
                ) : (
                  <div className="mt-2 space-y-1">
                    {totalBanco.map((o) => (
                      <p key={`${o.origen}-${o.moneda}`} className="flex items-baseline justify-between">
                        <span className="text-xs text-[var(--color-on-surface-variant)]">{o.cantidad} gasto(s) en {o.moneda}</span>
                        <span className="font-mono text-xl font-extrabold text-[var(--color-tertiary)]">{o.moneda} {formatMoneda(o.total)}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando...</p>
          )}
        </article>
      ) : null}
    </>
  );
}

// ============================================================================
// Impuestos por Documento — TODOS los gastos (no solo los sujetos a
// retención), agrupados por tipo de documento, para saber de un vistazo
// cuánto crédito fiscal IVA queda a favor (Factura) y cuánto hay que ir
// retenido/reservado para declarar al SIN (Contrato/Retención).
// ============================================================================
function ImpuestosReport() {
  const filtro = useFiltroPeriodo();
  const impuestosQuery = useReporteImpuestosQuery(filtro.consultado ? filtro.params : { cajaId: undefined });
  const impuestos = impuestosQuery.data?.data;

  function handleExportExcel() {
    if (!impuestos) return;
    exportTablaReporteCajaChicaExcel({
      subtitulo: `IMPUESTOS POR DOCUMENTO — ${formatFecha(filtro.fechaInicio)} al ${formatFecha(filtro.fechaFin)}`,
      columnas: ["Fecha", "Tipo Documento", "Proveedor", "Glosa", "Monto Total", "Créd. Fiscal IVA", "RC-IVA", "IUE Compras", "IT"],
      filas: impuestos.gastos.map((g) => [
        formatFecha(g.fecha),
        TIPO_DOCUMENTO_LABEL[g.tipoDocumento ?? ""] ?? g.tipoDocumento ?? "-",
        g.proveedorNombre,
        g.glosa,
        Number(g.montoTotal),
        Number(g.montoCreditoFiscalIva ?? 0),
        Number(g.montoRetencionRcIva),
        Number(g.montoRetencionIueCompras),
        Number(g.montoRetencionIt)
      ]),
      filaTotales: [
        "",
        "",
        "",
        "Total",
        Number(impuestos.gastos.reduce((acc, g) => acc + Number(g.montoTotal), 0).toFixed(2)),
        Number(impuestos.totales.creditoFiscalIva.toFixed(2)),
        Number(impuestos.totales.rcIva.toFixed(2)),
        Number(impuestos.totales.iueCompras.toFixed(2)),
        Number(impuestos.totales.it.toFixed(2))
      ],
      nombreArchivo: "impuestos-por-documento",
      colsNumericas: [4, 5, 6, 7, 8],
      anchoColumnas: [12, 18, 24, 28, 14, 14, 12, 14, 12]
    });
  }
  function handleExportPdf() {
    if (!impuestos) return;
    exportTablaReporteCajaChicaPdf({
      subtitulo: `IMPUESTOS POR DOCUMENTO — ${formatFecha(filtro.fechaInicio)} al ${formatFecha(filtro.fechaFin)}`,
      columnas: ["Fecha", "Tipo Doc.", "Proveedor", "Glosa", "Monto Total", "Créd. Fiscal IVA", "RC-IVA", "IUE Compras", "IT"],
      filas: impuestos.gastos.map((g) => [
        formatFecha(g.fecha),
        TIPO_DOCUMENTO_LABEL[g.tipoDocumento ?? ""] ?? g.tipoDocumento ?? "-",
        g.proveedorNombre,
        g.glosa,
        formatMoneda(Number(g.montoTotal)),
        formatMoneda(Number(g.montoCreditoFiscalIva ?? 0)),
        formatMoneda(Number(g.montoRetencionRcIva)),
        formatMoneda(Number(g.montoRetencionIueCompras)),
        formatMoneda(Number(g.montoRetencionIt))
      ]),
      filaTotales: [
        "",
        "",
        "",
        "Total",
        formatMoneda(impuestos.gastos.reduce((acc, g) => acc + Number(g.montoTotal), 0)),
        formatMoneda(impuestos.totales.creditoFiscalIva),
        formatMoneda(impuestos.totales.rcIva),
        formatMoneda(impuestos.totales.iueCompras),
        formatMoneda(impuestos.totales.it)
      ],
      nombreArchivo: "impuestos-por-documento",
      colsNumericas: [4, 5, 6, 7, 8]
    });
  }

  return (
    <>
      <FiltroPeriodo filtro={filtro} />
      {filtro.consultado ? (
        <article className="rounded-xl border-2 border-[var(--color-primary)]/40 bg-[var(--color-primary)]/[0.06] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                <Receipt size={14} />
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-primary)]">Impuestos por documento</h2>
            </div>
            {impuestos ? (
              <div className="flex gap-2">
                <button type="button" onClick={handleExportExcel} className={buttonSecondaryClassName}>
                  <FileSpreadsheet size={13} /> Excel
                </button>
                <button type="button" onClick={handleExportPdf} className={buttonSecondaryClassName}>
                  <FileText size={13} /> PDF
                </button>
              </div>
            ) : null}
          </div>
          {impuestos ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Créd. Fiscal IVA (a favor)</p>
                  <p className="mt-1 font-mono text-lg font-extrabold text-[var(--color-success)]">{formatMoneda(impuestos.totales.creditoFiscalIva)}</p>
                </div>
                <div className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">RC-IVA retenido</p>
                  <p className="mt-1 font-mono text-lg font-extrabold">{formatMoneda(impuestos.totales.rcIva)}</p>
                </div>
                <div className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">IUE Compras retenido</p>
                  <p className="mt-1 font-mono text-lg font-extrabold">{formatMoneda(impuestos.totales.iueCompras)}</p>
                </div>
                <div className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">IT retenido</p>
                  <p className="mt-1 font-mono text-lg font-extrabold">{formatMoneda(impuestos.totales.it)}</p>
                </div>
              </div>
              <p className="mb-4 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/[0.06] px-3 py-2 text-xs">
                Total a reservar/declarar por retenciones (RC-IVA + IUE Compras + IT):{" "}
                <span className="font-bold text-[var(--color-warning)]">{formatMoneda(impuestos.totales.totalRetenciones)}</span>
              </p>

              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {impuestos.porTipoDocumento.map((item) => (
                  <div key={item.tipoDocumento} className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2">
                    <p className="text-xs font-bold">{TIPO_DOCUMENTO_LABEL[item.tipoDocumento] ?? item.tipoDocumento}</p>
                    <p className="text-[11px] text-[var(--color-on-surface-variant)]">{item.cantidad} gasto(s) · {formatMoneda(item.montoTotal)}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      <th className="py-1 pr-3">Fecha</th>
                      <th className="py-1 pr-3">Tipo Doc.</th>
                      <th className="py-1 pr-3">Proveedor</th>
                      <th className="py-1 pr-3 text-right">Monto</th>
                      <th className="py-1 pr-3 text-right">Créd. Fiscal IVA</th>
                      <th className="py-1 pr-3 text-right">RC-IVA</th>
                      <th className="py-1 pr-3 text-right">IUE Compras</th>
                      <th className="py-1 text-right">IT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-soft)]">
                    {impuestos.gastos.map((g) => (
                      <tr key={g.id}>
                        <td className="py-1 pr-3">{formatFecha(g.fecha)}</td>
                        <td className="py-1 pr-3">{TIPO_DOCUMENTO_LABEL[g.tipoDocumento ?? ""] ?? g.tipoDocumento}</td>
                        <td className="py-1 pr-3">{g.proveedorNombre}</td>
                        <td className="py-1 pr-3 text-right">{formatMoneda(Number(g.montoTotal))}</td>
                        <td className="py-1 pr-3 text-right">{formatMoneda(Number(g.montoCreditoFiscalIva ?? 0))}</td>
                        <td className="py-1 pr-3 text-right">{formatMoneda(Number(g.montoRetencionRcIva))}</td>
                        <td className="py-1 pr-3 text-right">{formatMoneda(Number(g.montoRetencionIueCompras))}</td>
                        <td className="py-1 text-right">{formatMoneda(Number(g.montoRetencionIt))}</td>
                      </tr>
                    ))}
                    {impuestos.gastos.length === 0 ? (
                      <tr><td colSpan={8} className="py-3 text-center text-[var(--color-on-surface-variant)]">Sin gastos en este período.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando...</p>
          )}
        </article>
      ) : null}
    </>
  );
}

// ============================================================================
// Resumen de Retenciones (SIAT) — ya tenía export, sin cambios de lógica.
// ============================================================================
function RetencionesReport() {
  const filtro = useFiltroPeriodo();
  const retencionesQuery = useReporteRetencionesQuery(filtro.consultado ? filtro.params : { cajaId: undefined });
  const retenciones = retencionesQuery.data?.data;

  return (
    <>
      <FiltroPeriodo filtro={filtro} />
      {filtro.consultado ? (
        <article className="rounded-xl border-2 border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Banknote size={16} className="text-[var(--color-on-surface-variant)]" />
              Resumen de retenciones
            </h2>
            {retenciones ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => exportReporteRetencionesExcel(retenciones)} className={buttonSecondaryClassName}>
                  <FileSpreadsheet size={13} /> Exportar Excel
                </button>
                <button type="button" onClick={() => exportReporteRetencionesPdf(retenciones)} className={buttonSecondaryClassName}>
                  <FileText size={13} /> Exportar PDF
                </button>
              </div>
            ) : null}
          </div>
          <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
            Este es el reporte formal para declarar en el SIAT — es lo que respalda la cifra
            "Retenciones" que ves como resumen rápido en el detalle de cada Rendición.
          </p>
          {retenciones ? (
            <>
              <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">RC-IVA</span>{formatMoneda(retenciones.totales.rcIva)}</p>
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">IUE Compras</span>{formatMoneda(retenciones.totales.iueCompras)}</p>
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">IT</span>{formatMoneda(retenciones.totales.it)}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      <th className="py-1 pr-3">Fecha</th>
                      <th className="py-1 pr-3">Proveedor</th>
                      <th className="py-1 pr-3 text-right">RC-IVA</th>
                      <th className="py-1 pr-3 text-right">IUE Compras</th>
                      <th className="py-1 text-right">IT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-soft)]">
                    {retenciones.gastos.map((g) => (
                      <tr key={g.id}>
                        <td className="py-1 pr-3">{formatFecha(g.fecha)}</td>
                        <td className="py-1 pr-3">{g.proveedorNombre}</td>
                        <td className="py-1 pr-3 text-right">{formatMoneda(Number(g.montoRetencionRcIva))}</td>
                        <td className="py-1 pr-3 text-right">{formatMoneda(Number(g.montoRetencionIueCompras))}</td>
                        <td className="py-1 text-right">{formatMoneda(Number(g.montoRetencionIt))}</td>
                      </tr>
                    ))}
                    {retenciones.gastos.length === 0 ? (
                      <tr><td colSpan={5} className="py-3 text-center text-[var(--color-on-surface-variant)]">Sin retenciones en este período.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando...</p>
          )}
        </article>
      ) : null}
    </>
  );
}

// ============================================================================
// Gastos No Deducibles
// ============================================================================
function NoDeduciblesReport() {
  const filtro = useFiltroPeriodo();
  const noDeduciblesQuery = useReporteNoDeduciblesQuery(filtro.consultado ? filtro.params : { cajaId: undefined });
  const noDeducibles = noDeduciblesQuery.data?.data;

  function handleExportExcel() {
    if (!noDeducibles) return;
    exportTablaReporteCajaChicaExcel({
      subtitulo: `GASTOS NO DEDUCIBLES — ${formatFecha(filtro.fechaInicio)} al ${formatFecha(filtro.fechaFin)}`,
      columnas: ["Fecha", "Proveedor", "Glosa", "Monto"],
      filas: noDeducibles.gastos.map((g) => [formatFecha(g.fecha), g.proveedorNombre, g.glosa, Number(g.montoTotal)]),
      filaTotales: ["", "", "Total", Number(noDeducibles.total.toFixed(2))],
      nombreArchivo: "gastos-no-deducibles",
      colsNumericas: [3],
      anchoColumnas: [12, 26, 34, 14]
    });
  }
  function handleExportPdf() {
    if (!noDeducibles) return;
    exportTablaReporteCajaChicaPdf({
      subtitulo: `GASTOS NO DEDUCIBLES — ${formatFecha(filtro.fechaInicio)} al ${formatFecha(filtro.fechaFin)}`,
      columnas: ["Fecha", "Proveedor", "Glosa", "Monto"],
      filas: noDeducibles.gastos.map((g) => [formatFecha(g.fecha), g.proveedorNombre, g.glosa, formatMoneda(Number(g.montoTotal))]),
      filaTotales: ["", "", "Total", formatMoneda(noDeducibles.total)],
      nombreArchivo: "gastos-no-deducibles",
      colsNumericas: [3]
    });
  }

  return (
    <>
      <FiltroPeriodo filtro={filtro} />
      {filtro.consultado ? (
        <article className="rounded-xl border-2 border-[var(--color-warning)]/40 bg-[var(--color-warning)]/[0.06] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-warning)]/20 text-[var(--color-warning)]">
                <AlertTriangle size={14} />
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-warning)]">Gastos no deducibles</h2>
            </div>
            {noDeducibles ? (
              <div className="flex gap-2">
                <button type="button" onClick={handleExportExcel} className={buttonSecondaryClassName}>
                  <FileSpreadsheet size={13} /> Excel
                </button>
                <button type="button" onClick={handleExportPdf} className={buttonSecondaryClassName}>
                  <FileText size={13} /> PDF
                </button>
              </div>
            ) : null}
          </div>
          {noDeducibles ? (
            <>
              <p className="mb-3 text-sm">Total: <span className="font-bold text-[var(--color-warning)]">{formatMoneda(noDeducibles.total)}</span></p>
              <div className="space-y-2 text-sm">
                {noDeducibles.gastos.map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3 py-2">
                    <div>
                      <p className="font-semibold">{g.proveedorNombre}</p>
                      <p className="text-xs text-[var(--color-on-surface-variant)]">{g.glosa} · {formatFecha(g.fecha)}</p>
                    </div>
                    <span className="font-mono text-sm font-bold">{formatMoneda(Number(g.montoTotal))}</span>
                  </div>
                ))}
                {noDeducibles.gastos.length === 0 ? (
                  <p className="text-xs text-[var(--color-on-surface-variant)]">Sin gastos no deducibles en este período.</p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando...</p>
          )}
        </article>
      ) : null}
    </>
  );
}

// ============================================================================
// Desglose por centro de costo, función de gasto, cuenta contable y categoría
// ============================================================================
function DesgloseReport() {
  const filtro = useFiltroPeriodo();
  const desgloseQuery = useReporteDesgloseQuery(filtro.consultado ? filtro.params : { cajaId: undefined });
  const desglose = desgloseQuery.data?.data;

  const porCentroOrdenado = useMemo(() => [...(desglose?.porCentroCosto ?? [])].sort((a, b) => b.total - a.total), [desglose]);
  const porFuncionOrdenado = useMemo(() => [...(desglose?.porFuncionGasto ?? [])].sort((a, b) => b.total - a.total), [desglose]);
  const porCuentaOrdenado = useMemo(() => [...(desglose?.porCuentaContable ?? [])].sort((a, b) => b.total - a.total), [desglose]);
  const porCategoriaOrdenado = useMemo(() => [...(desglose?.porCategoria ?? [])].sort((a, b) => b.total - a.total), [desglose]);

  function filasCombinadas(): Array<Array<string | number>> {
    const filas: Array<Array<string | number>> = [];
    for (const item of porCentroOrdenado) filas.push(["Centro de costo", item.centro?.codigo ?? "-", item.centro?.nombre ?? "-", Number(item.total.toFixed(2))]);
    for (const item of porFuncionOrdenado) filas.push(["Función de gasto", item.funcion?.codigo ?? "-", item.funcion?.nombre ?? "-", Number(item.total.toFixed(2))]);
    for (const item of porCuentaOrdenado) filas.push(["Cuenta contable", item.cuenta?.codigo ?? "-", item.cuenta?.nombre ?? "-", Number(item.total.toFixed(2))]);
    for (const item of porCategoriaOrdenado) filas.push(["Categoría", "-", item.categoria, Number(item.total.toFixed(2))]);
    return filas;
  }

  function handleExportExcel() {
    exportTablaReporteCajaChicaExcel({
      subtitulo: `DESGLOSE DE COSTOS — ${formatFecha(filtro.fechaInicio)} al ${formatFecha(filtro.fechaFin)}`,
      columnas: ["Grupo", "Código", "Nombre", "Total"],
      filas: filasCombinadas(),
      nombreArchivo: "desglose-costos",
      colsNumericas: [3],
      anchoColumnas: [18, 14, 32, 14]
    });
  }
  function handleExportPdf() {
    exportTablaReporteCajaChicaPdf({
      subtitulo: `DESGLOSE DE COSTOS — ${formatFecha(filtro.fechaInicio)} al ${formatFecha(filtro.fechaFin)}`,
      columnas: ["Grupo", "Código", "Nombre", "Total"],
      filas: filasCombinadas().map((f) => [f[0], f[1], f[2], formatMoneda(Number(f[3]))]),
      nombreArchivo: "desglose-costos",
      colsNumericas: [3]
    });
  }

  return (
    <>
      <FiltroPeriodo filtro={filtro} />
      {filtro.consultado ? (
        <article className="rounded-xl border-2 border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                <PieChart size={14} />
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface)]">
                Desglose por centro de costo, función de gasto y cuenta contable
              </h2>
            </div>
            {desglose ? (
              <div className="flex gap-2">
                <button type="button" onClick={handleExportExcel} className={buttonSecondaryClassName}>
                  <FileSpreadsheet size={13} /> Excel
                </button>
                <button type="button" onClick={handleExportPdf} className={buttonSecondaryClassName}>
                  <FileText size={13} /> PDF
                </button>
              </div>
            ) : null}
          </div>
          {desglose ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 border-l-2 border-[var(--color-primary)] pl-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Por centro de costo</h3>
                <div className="space-y-2 text-sm">
                  {porCentroOrdenado.map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-[var(--color-outline-variant)] px-3 py-2">
                      <span>{item.centro?.codigo} · {item.centro?.nombre}</span>
                      <span className="font-mono font-bold">{formatMoneda(item.total)}</span>
                    </div>
                  ))}
                  {porCentroOrdenado.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Sin datos en este período.</p> : null}
                </div>
              </div>
              <div>
                <h3 className="mb-2 border-l-2 border-[var(--color-primary)] pl-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Por función de gasto</h3>
                <div className="space-y-2 text-sm">
                  {porFuncionOrdenado.map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-[var(--color-outline-variant)] px-3 py-2">
                      <span>{item.funcion?.codigo} · {item.funcion?.nombre}</span>
                      <span className="font-mono font-bold">{formatMoneda(item.total)}</span>
                    </div>
                  ))}
                  {porFuncionOrdenado.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Sin datos en este período.</p> : null}
                </div>
              </div>
              <div>
                <h3 className="mb-2 border-l-2 border-[var(--color-primary)] pl-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Por cuenta contable</h3>
                <div className="space-y-2 text-sm">
                  {porCuentaOrdenado.map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-[var(--color-outline-variant)] px-3 py-2">
                      <span>{item.cuenta?.codigo} · {item.cuenta?.nombre}</span>
                      <span className="font-mono font-bold">{formatMoneda(item.total)}</span>
                    </div>
                  ))}
                  {porCuentaOrdenado.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Sin datos en este período.</p> : null}
                </div>
              </div>
              <div>
                <h3 className="mb-2 border-l-2 border-[var(--color-primary)] pl-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Por categoría del reporte mensual</h3>
                <div className="space-y-2 text-sm">
                  {porCategoriaOrdenado.map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-[var(--color-outline-variant)] px-3 py-2">
                      <span>{item.categoria}</span>
                      <span className="font-mono font-bold">{formatMoneda(item.total)}</span>
                    </div>
                  ))}
                  {porCategoriaOrdenado.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Sin datos en este período.</p> : null}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando...</p>
          )}
        </article>
      ) : null}
    </>
  );
}

export function ReportesCajaChicaPage() {
  const { tipo: tipoParam } = useParams();
  const navigate = useNavigate();

  if (!isTipoReporte(tipoParam)) {
    return <Navigate to="/caja-chica/reportes/resumen-caja-banco" replace />;
  }
  const tipo = tipoParam;

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <FileBarChart2 size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Reportes de Caja Chica</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Retenciones tributarias para el SIAT, gastos no deducibles y desglose de costos por
              centro de costo, función de gasto y cuenta contable, para el período que elijas. ¿Buscas
              cuánto tienes disponible en una caja ahora mismo? Eso está en "Saldos y Movimientos". ¿Buscas
              el presupuesto y el saldo a favor por partida? Eso está en "Presupuesto".
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Tipo de reporte
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {REPORT_GROUPS.map((group) => (
            <section
              key={group.title}
              className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3"
            >
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                {group.title}
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.reports.map((report) => (
                  <button
                    key={report.type}
                    type="button"
                    onClick={() => navigate(`/caja-chica/reportes/${report.type}`)}
                    className={`rounded-lg border px-3 py-3 text-left transition ${
                      report.type === tipo
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/14 shadow-sm"
                        : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    <p className="text-sm font-bold">{report.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{report.description}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>

      {tipo === "resumen-caja-banco" ? <ResumenCajaBancoReport /> : null}
      {tipo === "impuestos" ? <ImpuestosReport /> : null}
      {tipo === "retenciones" ? <RetencionesReport /> : null}
      {tipo === "no-deducibles" ? <NoDeduciblesReport /> : null}
      {tipo === "desglose" ? <DesgloseReport /> : null}
    </section>
  );
}
