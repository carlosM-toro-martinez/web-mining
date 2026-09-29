import { useMemo, useState } from "react";
import { FileBarChart2, FileSpreadsheet, FileText, Lock, Search } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useCerrarMesLogisticaMutation,
  useCierresLogisticaQuery,
  useCuadroMensualQuery
} from "@/features/logisticaReportes/hooks/useLogisticaReportes";
import {
  exportCuadroMensualExcel,
  exportCuadroMensualPdf,
  exportDetalleVolquetaExcel,
  exportDetalleVolquetaPdf,
  exportTablaReporteExcel,
  exportTablaReportePdf
} from "@/features/logisticaReportes/lib/logisticaExport";
import { useFormularios101Query } from "@/features/formulario101/hooks/useFormulario101";
import type { EstadoFormulario101 } from "@/features/formulario101/model/formulario101.schema";
import { useLotesDespachoQuery } from "@/features/loteDespacho/hooks/useLoteDespacho";
import { useLiquidacionesQuery } from "@/features/liquidacion/hooks/useLiquidacion";
import type { EstadoLiquidacion } from "@/features/liquidacion/model/liquidacion.schema";
import {
  useMunicipiosOrigenQuery,
  useTarifasLiquidacionQuery
} from "@/features/parametrosLogistica/hooks/useParametrosLogistica";
import type { TipoEntidadTransportista } from "@/features/transportista/model/transportista.schema";
import { useTransportistasQuery } from "@/features/transportista/hooks/useTransportistas";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const TIPO_ENTIDAD_LABEL: Record<TipoEntidadTransportista, string> = {
  EMPRESA: "Empresa",
  TRABAJADOR_PARTICULAR: "Trabajador particular"
};

const ESTADO_F101_LABEL: Record<EstadoFormulario101, string> = {
  DISPONIBLE: "Disponible",
  VINCULADO: "Vinculado",
  ANULADO: "Anulado"
};

const ESTADO_LIQUIDACION_LABEL: Record<EstadoLiquidacion, string> = {
  BORRADOR: "Borrador",
  CERRADO: "Cerrado",
  ANULADO: "Anulado"
};

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

// timeZone: "UTC" es a propósito: estas fechas son calendario (medianoche
// UTC guardada desde un <input type="date">), no un instante — sin esto,
// un navegador en Bolivia (UTC-4) las corre un día para atrás al mostrarlas.
function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO", { timeZone: "UTC" });
}

function formatNumero(value: number) {
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Año/mes/día LOCAL (Bolivia), nunca toISOString(): esa función convierte a
// UTC antes de recortar, así que entre las 20:00 y las 23:59 hora boliviana
// ya devolvía la fecha de MAÑANA.
function fechaLocalISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Rango por defecto de todos los reportes con filtro de fechas: los últimos
// 7 días (editable) — nunca vacío, para que el reporte ya muestre algo apenas
// se entra a la pantalla.
function ultimos7Dias() {
  const hoy = new Date();
  const hace7 = new Date(hoy.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { fechaInicio: fechaLocalISO(hace7), fechaFin: fechaLocalISO(hoy) };
}

type TipoReporte =
  | "cuadro-mensual"
  | "detalle-volqueta"
  | "resumen-mineral-ingenio"
  | "estado-f101"
  | "ranking-transportistas"
  | "resumen-liquidaciones"
  | "tarifas-vigentes";

const REPORT_GROUPS: Array<{
  title: string;
  reports: Array<{ type: TipoReporte; title: string; description: string }>;
}> = [
  {
    title: "Despachos y Formulario 101",
    reports: [
      {
        type: "cuadro-mensual",
        title: "Cuadro Mensual de Despachos",
        description: "Por municipio, para la declaración de F101 y Conocimientos ante el gobierno municipal."
      },
      {
        type: "detalle-volqueta",
        title: "Detalle por Volqueta",
        description: "Un bloque por vehículo del transportista, con sus viajes — igual al reporte semanal en papel."
      },
      {
        type: "resumen-mineral-ingenio",
        title: "Resumen por Mineral e Ingenio",
        description: "Cuánto se despachó de cada mineral hacia cada ingenio en un rango de fechas."
      },
      {
        type: "estado-f101",
        title: "Estado de Formularios 101",
        description: "Disponibles, vinculados y anulados — con aviso de los que ya vencieron sus 48 horas."
      }
    ]
  },
  {
    title: "Transportistas, Liquidaciones y Tarifas",
    reports: [
      {
        type: "ranking-transportistas",
        title: "Ranking de Transportistas",
        description: "Viajes y tonelaje transportado por cada transportista en un rango de fechas."
      },
      {
        type: "resumen-liquidaciones",
        title: "Resumen de Liquidaciones",
        description: "Liquidaciones por período con su estado y total neto — cuánto se pagó y a quién."
      },
      {
        type: "tarifas-vigentes",
        title: "Tarifas Vigentes",
        description: "Precio por tonelada configurado hoy para cada transportista o tipo de entidad."
      }
    ]
  }
];

const TIPOS_VALIDOS = new Set<string>(REPORT_GROUPS.flatMap((g) => g.reports.map((r) => r.type)));

function isTipoReporte(value: string | undefined): value is TipoReporte {
  return Boolean(value && TIPOS_VALIDOS.has(value));
}

// ============================================================================
// Cuadro Mensual de Despachos (sin cambios de lógica, solo reubicado dentro
// del hub de reportes).
// ============================================================================
function CuadroMensualReport() {
  const { user } = useAuth();
  const puedeCerrarMes = user?.role === "ADMIN" || user?.role === "SUPERINTENDENTE";
  const { showError, showSuccess } = useToast();

  const municipiosQuery = useMunicipiosOrigenQuery();
  const municipios = municipiosQuery.data?.data ?? [];

  const hoy = useMemo(() => new Date(), []);
  const [municipioId, setMunicipioId] = useState("");
  const [anio, setAnio] = useState(String(hoy.getFullYear()));
  const [mes, setMes] = useState(String(hoy.getMonth() + 1));
  const [consultado, setConsultado] = useState<{ municipioId: number; anio: number; mes: number } | undefined>();

  const cuadroQuery = useCuadroMensualQuery(consultado);
  const cierresQuery = useCierresLogisticaQuery(consultado?.municipioId);
  const cerrarMutation = useCerrarMesLogisticaMutation();

  const cuadro = cuadroQuery.data?.data;
  const cierres = cierresQuery.data?.data ?? [];

  function handleConsultar() {
    if (!municipioId) {
      showError("Elige un municipio.");
      return;
    }
    setConsultado({ municipioId: Number(municipioId), anio: Number(anio), mes: Number(mes) });
  }

  function handleCerrarMes() {
    if (!consultado) return;
    const confirmed = window.confirm(
      `¿Cerrar ${MESES[consultado.mes - 1]} ${consultado.anio} para este municipio? Ya no se podrá volver a cerrar.`
    );
    if (!confirmed) return;

    cerrarMutation.mutate(consultado, {
      onSuccess: () => showSuccess("Mes cerrado correctamente."),
      onError: (error) => showError(normalizeError(error, "No se pudo cerrar el mes."))
    });
  }

  return (
    <>
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select value={municipioId} onChange={(e) => setMunicipioId(e.target.value)} className={inputClassName}>
            <option value="">Municipio...</option>
            {municipios.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
          <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} className={inputClassName} placeholder="Año" />
          <select value={mes} onChange={(e) => setMes(e.target.value)} className={inputClassName}>
            {MESES.map((label, index) => (
              <option key={label} value={index + 1}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleConsultar}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            <Search size={14} /> Consultar
          </button>
        </div>
      </article>

      {cuadroQuery.isLoading ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 text-sm text-[var(--color-on-surface-variant)]">
          Cargando cuadro mensual...
        </article>
      ) : null}

      {cuadro ? (
        <>
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid grid-cols-3 gap-6 text-sm">
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">Lotes</span>{cuadro.resumen.totalLotes}</p>
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">Tonelaje neto</span>{cuadro.resumen.totalTonelajeNeto.toFixed(2)}</p>
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">F101 pendientes</span>{cuadro.resumen.pendientesF101}</p>
              </div>
              {cuadro.cerrado ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/18 px-3 py-1 text-xs font-bold uppercase text-[var(--color-success)]">
                  <Lock size={12} /> Mes cerrado
                </span>
              ) : puedeCerrarMes ? (
                <button
                  type="button"
                  onClick={handleCerrarMes}
                  disabled={cuadro.resumen.pendientesF101 > 0 || cerrarMutation.isPending}
                  title={cuadro.resumen.pendientesF101 > 0 ? "Regulariza los F101 pendientes antes de cerrar" : undefined}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-50"
                >
                  {cerrarMutation.isPending ? "Cerrando..." : "Cerrar mes"}
                </button>
              ) : null}
            </div>
          </article>

          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Lotes del período</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    exportCuadroMensualExcel(
                      cuadro,
                      municipios.find((m) => m.id === consultado?.municipioId)?.nombre ?? "",
                      consultado!.anio,
                      consultado!.mes
                    )
                  }
                  className={buttonSecondaryClassName}
                >
                  <FileSpreadsheet size={13} /> Exportar Excel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportCuadroMensualPdf(
                      cuadro,
                      municipios.find((m) => m.id === consultado?.municipioId)?.nombre ?? "",
                      consultado!.anio,
                      consultado!.mes
                    )
                  }
                  className={buttonSecondaryClassName}
                >
                  <FileText size={13} /> Exportar PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    <th className="py-1 pr-3">N° Lote / Conocimiento</th>
                    <th className="py-1 pr-3">Transportista</th>
                    <th className="py-1 pr-3">Placa</th>
                    <th className="py-1 pr-3">Mineral</th>
                    <th className="py-1 pr-3">Ingenio</th>
                    <th className="py-1 pr-3 text-right">Neto</th>
                    <th className="py-1 pr-3">F101</th>
                    <th className="py-1">Fecha fiscal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {cuadro.lotes.map((lote) => (
                    <tr key={lote.id}>
                      <td className="py-1 pr-3 font-mono">{lote.correlativo}</td>
                      <td className="py-1 pr-3">{lote.transportista?.nombreORazonSocial ?? "-"}</td>
                      <td className="py-1 pr-3">{lote.vehiculo?.placa ?? "-"}</td>
                      <td className="py-1 pr-3">{lote.tipoMineral?.nombre ?? "-"}</td>
                      <td className="py-1 pr-3">{lote.destinoIngenio?.nombre ?? "-"}</td>
                      <td className="py-1 pr-3 text-right">{lote.pesaje?.tonelajeNeto ?? "-"}</td>
                      <td className="py-1 pr-3">{lote.formulario101 ? lote.formulario101.codigo : "Pendiente"}</td>
                      <td className="py-1">{formatFecha(lote.fechaDocumentalFiscal)}</td>
                    </tr>
                  ))}
                  {cuadro.lotes.length === 0 ? (
                    <tr><td colSpan={8} className="py-3 text-center text-[var(--color-on-surface-variant)]">Sin lotes en este período.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : null}

      {consultado ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
            Meses cerrados de este municipio
          </h2>
          <div className="flex flex-wrap gap-2">
            {cierres.map((c) => (
              <span key={c.id} className="rounded-full bg-[var(--color-surface-container-high)] px-3 py-1 text-xs">
                {MESES[c.mes - 1]} {c.anio}
              </span>
            ))}
            {cierres.length === 0 ? (
              <p className="text-xs text-[var(--color-on-surface-variant)]">Aún no hay meses cerrados.</p>
            ) : null}
          </div>
        </article>
      ) : null}
    </>
  );
}

// ============================================================================
// Detalle de despachos por volqueta (sin cambios de lógica, solo reubicado).
// ============================================================================
function DetalleVolquetaReport() {
  const { showError } = useToast();
  const transportistasQuery = useTransportistasQuery();
  const transportistas = transportistasQuery.data?.data ?? [];
  const [volquetaTransportistaId, setVolquetaTransportistaId] = useState("");
  const [volquetaFechaInicio, setVolquetaFechaInicio] = useState(() => ultimos7Dias().fechaInicio);
  const [volquetaFechaFin, setVolquetaFechaFin] = useState(() => ultimos7Dias().fechaFin);
  const [volquetaConsultado, setVolquetaConsultado] = useState<
    { transportistaId: number; fechaInicio: string; fechaFin: string } | undefined
  >();

  const lotesVolquetaQuery = useLotesDespachoQuery(
    volquetaConsultado
      ? {
          transportistaId: volquetaConsultado.transportistaId,
          fechaInicio: volquetaConsultado.fechaInicio,
          fechaFin: volquetaConsultado.fechaFin,
          limit: 500
        }
      : { limit: 0 }
  );
  const lotesVolqueta = volquetaConsultado ? lotesVolquetaQuery.data?.data ?? [] : [];
  const transportistaVolqueta = transportistas.find((t) => t.id === volquetaConsultado?.transportistaId);

  function handleConsultarVolquetas() {
    if (!volquetaTransportistaId || !volquetaFechaInicio || !volquetaFechaFin) {
      showError("Elige el transportista y el rango de fechas.");
      return;
    }
    setVolquetaConsultado({
      transportistaId: Number(volquetaTransportistaId),
      fechaInicio: volquetaFechaInicio,
      fechaFin: volquetaFechaFin
    });
  }

  return (
    <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
      <p className="mb-4 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
        Un bloque por cada vehículo del transportista, con sus viajes (Nº viaje, fecha, Conocimiento) y su
        total — igual al reporte semanal en papel, con los datos bancarios del transportista al costado.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select
          value={volquetaTransportistaId}
          onChange={(e) => setVolquetaTransportistaId(e.target.value)}
          className={inputClassName}
        >
          <option value="">Transportista...</option>
          {transportistas.map((t) => (
            <option key={t.id} value={t.id}>{t.nombreORazonSocial}</option>
          ))}
        </select>
        <div>
          <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Desde</label>
          <input type="date" value={volquetaFechaInicio} onChange={(e) => setVolquetaFechaInicio(e.target.value)} className={inputClassName} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Hasta</label>
          <input type="date" value={volquetaFechaFin} onChange={(e) => setVolquetaFechaFin(e.target.value)} className={inputClassName} />
        </div>
        <button
          type="button"
          onClick={handleConsultarVolquetas}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
        >
          <Search size={14} /> Consultar
        </button>
      </div>

      {volquetaConsultado ? (
        lotesVolquetaQuery.isLoading ? (
          <p className="mt-4 text-sm text-[var(--color-on-surface-variant)]">Cargando despachos...</p>
        ) : lotesVolqueta.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-on-surface-variant)]">
            No hay lotes de este transportista en ese rango de fechas.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
            <p className="text-sm">
              <span className="font-bold">{lotesVolqueta.length}</span> lote{lotesVolqueta.length === 1 ? "" : "s"} de{" "}
              <span className="font-semibold">{transportistaVolqueta?.nombreORazonSocial}</span> entre{" "}
              {formatFecha(volquetaConsultado.fechaInicio)} y {formatFecha(volquetaConsultado.fechaFin)}.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  transportistaVolqueta &&
                  exportDetalleVolquetaExcel(
                    transportistaVolqueta,
                    lotesVolqueta,
                    volquetaConsultado.fechaInicio,
                    volquetaConsultado.fechaFin
                  )
                }
                className={buttonSecondaryClassName}
              >
                <FileSpreadsheet size={13} /> Excel
              </button>
              <button
                type="button"
                onClick={() =>
                  transportistaVolqueta &&
                  exportDetalleVolquetaPdf(
                    transportistaVolqueta,
                    lotesVolqueta,
                    volquetaConsultado.fechaInicio,
                    volquetaConsultado.fechaFin
                  )
                }
                className={buttonSecondaryClassName}
              >
                <FileText size={13} /> PDF
              </button>
            </div>
          </div>
        )
      ) : null}
    </article>
  );
}

// ============================================================================
// Resumen por Mineral e Ingenio (nuevo): cuánto se despachó de cada mineral
// hacia cada ingenio en un rango, sin importar transportista — agregado en
// el cliente a partir de los mismos lotes que ya se consultan en otras
// pantallas (no hace falta un endpoint nuevo).
// ============================================================================
function ResumenMineralIngenioReport() {
  const { showError } = useToast();
  const [fechaInicio, setFechaInicio] = useState(() => ultimos7Dias().fechaInicio);
  const [fechaFin, setFechaFin] = useState(() => ultimos7Dias().fechaFin);
  const [consultado, setConsultado] = useState<{ fechaInicio: string; fechaFin: string } | undefined>(ultimos7Dias);

  const lotesQuery = useLotesDespachoQuery(
    consultado ? { fechaInicio: consultado.fechaInicio, fechaFin: consultado.fechaFin, limit: 2000 } : { limit: 0 }
  );
  const lotes = consultado ? lotesQuery.data?.data ?? [] : [];

  const filas = useMemo(() => {
    const mapa = new Map<string, { mineral: string; ingenio: string; viajes: number; tonelaje: number }>();
    for (const lote of lotes) {
      if (lote.estadoLote === "ANULADO") continue;
      const mineral = lote.tipoMineral?.nombre ?? "-";
      const ingenio = lote.destinoIngenio?.nombre ?? "-";
      const key = `${mineral}|||${ingenio}`;
      const actual = mapa.get(key) ?? { mineral, ingenio, viajes: 0, tonelaje: 0 };
      actual.viajes += 1;
      actual.tonelaje += Number(lote.pesaje?.tonelajeNeto ?? 0);
      mapa.set(key, actual);
    }
    return Array.from(mapa.values()).sort((a, b) => b.tonelaje - a.tonelaje);
  }, [lotes]);

  const totales = useMemo(
    () => filas.reduce((acc, f) => ({ viajes: acc.viajes + f.viajes, tonelaje: acc.tonelaje + f.tonelaje }), { viajes: 0, tonelaje: 0 }),
    [filas]
  );

  function handleConsultar() {
    if (!fechaInicio || !fechaFin) {
      showError("Elige el rango de fechas.");
      return;
    }
    setConsultado({ fechaInicio, fechaFin });
  }

  function handleExportExcel() {
    if (!consultado) return;
    exportTablaReporteExcel({
      subtitulo: `RESUMEN POR MINERAL E INGENIO — ${formatFecha(consultado.fechaInicio)} al ${formatFecha(consultado.fechaFin)}`,
      columnas: ["Mineral", "Ingenio", "Viajes", "Tonelaje neto"],
      filas: filas.map((f) => [f.mineral, f.ingenio, f.viajes, Number(f.tonelaje.toFixed(2))]),
      filaTotales: ["Total", "", totales.viajes, Number(totales.tonelaje.toFixed(2))],
      nombreArchivo: "resumen-mineral-ingenio",
      colsNumericas: [2, 3],
      anchoColumnas: [22, 22, 12, 16]
    });
  }

  function handleExportPdf() {
    if (!consultado) return;
    exportTablaReportePdf({
      subtitulo: `RESUMEN POR MINERAL E INGENIO — ${formatFecha(consultado.fechaInicio)} al ${formatFecha(consultado.fechaFin)}`,
      columnas: ["Mineral", "Ingenio", "Viajes", "Tonelaje neto"],
      filas: filas.map((f) => [f.mineral, f.ingenio, f.viajes, formatNumero(f.tonelaje)]),
      filaTotales: ["Total", "", totales.viajes, formatNumero(totales.tonelaje)],
      nombreArchivo: "resumen-mineral-ingenio",
      colsNumericas: [2, 3]
    });
  }

  return (
    <>
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Desde</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Hasta</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className={inputClassName} />
          </div>
          <button
            type="button"
            onClick={handleConsultar}
            className="inline-flex items-center justify-center gap-2 self-end rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            <Search size={14} /> Consultar
          </button>
        </div>
      </article>

      {consultado ? (
        lotesQuery.isLoading ? (
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 text-sm text-[var(--color-on-surface-variant)]">
            Calculando...
          </article>
        ) : (
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                {formatFecha(consultado.fechaInicio)} — {formatFecha(consultado.fechaFin)}
              </h2>
              <div className="flex gap-2">
                <button type="button" onClick={handleExportExcel} className={buttonSecondaryClassName}>
                  <FileSpreadsheet size={13} /> Excel
                </button>
                <button type="button" onClick={handleExportPdf} className={buttonSecondaryClassName}>
                  <FileText size={13} /> PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    <th className="py-1 pr-3">Mineral</th>
                    <th className="py-1 pr-3">Ingenio</th>
                    <th className="py-1 pr-3 text-right">Viajes</th>
                    <th className="py-1 text-right">Tonelaje neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {filas.map((f) => (
                    <tr key={`${f.mineral}-${f.ingenio}`}>
                      <td className="py-1 pr-3">{f.mineral}</td>
                      <td className="py-1 pr-3">{f.ingenio}</td>
                      <td className="py-1 pr-3 text-right">{f.viajes}</td>
                      <td className="py-1 text-right">{formatNumero(f.tonelaje)}</td>
                    </tr>
                  ))}
                  {filas.length === 0 ? (
                    <tr><td colSpan={4} className="py-3 text-center text-[var(--color-on-surface-variant)]">Sin lotes en este rango.</td></tr>
                  ) : (
                    <tr className="font-bold">
                      <td className="py-1 pr-3" colSpan={2}>Total</td>
                      <td className="py-1 pr-3 text-right">{totales.viajes}</td>
                      <td className="py-1 text-right">{formatNumero(totales.tonelaje)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        )
      ) : null}
    </>
  );
}

// ============================================================================
// Estado de Formularios 101 (nuevo): disponibles/vinculados/anulados, con
// aviso de los que ya pasaron las 48h de validez (misma regla que bloquea
// vincular uno vencido en el backend — ver formulario101.service.ts).
// ============================================================================
function EstadoF101Report() {
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFormulario101 | "">("");
  const query = useFormularios101Query(estadoFiltro ? { estado: estadoFiltro } : {});
  const formularios = query.data?.data ?? [];

  const filas = useMemo(
    () =>
      formularios.map((f) => ({
        ...f,
        vencido: f.estado === "DISPONIBLE" && (Date.now() - new Date(f.fecha).getTime()) / (1000 * 60 * 60) > 48
      })),
    [formularios]
  );

  const resumen = useMemo(() => {
    const acc: Record<EstadoFormulario101, number> = { DISPONIBLE: 0, VINCULADO: 0, ANULADO: 0 };
    for (const f of formularios) acc[f.estado] += 1;
    return acc;
  }, [formularios]);

  function handleExportExcel() {
    exportTablaReporteExcel({
      subtitulo: `ESTADO DE FORMULARIOS 101${estadoFiltro ? ` — ${ESTADO_F101_LABEL[estadoFiltro]}` : ""}`,
      columnas: ["Código", "Fecha", "Estado", "N° Lote / Conocimiento", "Transportista", "Vencido"],
      filas: filas.map((f) => [
        f.codigo,
        formatFecha(f.fecha),
        ESTADO_F101_LABEL[f.estado],
        f.lote?.correlativo ?? "-",
        f.lote?.transportista?.nombreORazonSocial ?? "-",
        f.vencido ? "Sí" : "No"
      ]),
      nombreArchivo: "estado-formularios-101",
      anchoColumnas: [14, 12, 14, 18, 28, 10]
    });
  }

  function handleExportPdf() {
    exportTablaReportePdf({
      subtitulo: `ESTADO DE FORMULARIOS 101${estadoFiltro ? ` — ${ESTADO_F101_LABEL[estadoFiltro]}` : ""}`,
      columnas: ["Código", "Fecha", "Estado", "N° Lote / Conocimiento", "Transportista", "Vencido"],
      filas: filas.map((f) => [
        f.codigo,
        formatFecha(f.fecha),
        ESTADO_F101_LABEL[f.estado],
        f.lote?.correlativo ?? "-",
        f.lote?.transportista?.nombreORazonSocial ?? "-",
        f.vencido ? "Sí" : "No"
      ]),
      nombreArchivo: "estado-formularios-101"
    });
  }

  return (
    <>
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid grid-cols-3 gap-6 text-sm">
            <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">Disponibles</span>{resumen.DISPONIBLE}</p>
            <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">Vinculados</span>{resumen.VINCULADO}</p>
            <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">Anulados</span>{resumen.ANULADO}</p>
          </div>
          <div className="flex items-end gap-2">
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value as EstadoFormulario101 | "")} className={`${inputClassName} w-48`}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_F101_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button type="button" onClick={handleExportExcel} className={buttonSecondaryClassName}>
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button type="button" onClick={handleExportPdf} className={buttonSecondaryClassName}>
              <FileText size={13} /> PDF
            </button>
          </div>
        </div>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        {query.isLoading ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando formularios...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th className="py-1 pr-3">Código</th>
                  <th className="py-1 pr-3">Fecha</th>
                  <th className="py-1 pr-3">Estado</th>
                  <th className="py-1 pr-3">N° Lote / Conocimiento</th>
                  <th className="py-1 pr-3">Transportista</th>
                  <th className="py-1">Vencido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td className="py-1 pr-3 font-mono">{f.codigo}</td>
                    <td className="py-1 pr-3">{formatFecha(f.fecha)}</td>
                    <td className="py-1 pr-3">{ESTADO_F101_LABEL[f.estado]}</td>
                    <td className="py-1 pr-3 font-mono">{f.lote?.correlativo ?? "-"}</td>
                    <td className="py-1 pr-3">{f.lote?.transportista?.nombreORazonSocial ?? "-"}</td>
                    <td className="py-1">
                      {f.vencido ? (
                        <span className="rounded-full bg-[var(--color-error)]/18 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-error)]">Sí</span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {filas.length === 0 ? (
                  <tr><td colSpan={6} className="py-3 text-center text-[var(--color-on-surface-variant)]">Sin formularios registrados.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </>
  );
}

// ============================================================================
// Ranking de Transportistas (nuevo): viajes y tonelaje por transportista en
// un rango de fechas, ordenado de mayor a menor — mismo dato base que el
// Resumen por Mineral e Ingenio, agregado distinto.
// ============================================================================
function RankingTransportistasReport() {
  const { showError } = useToast();
  const [fechaInicio, setFechaInicio] = useState(() => ultimos7Dias().fechaInicio);
  const [fechaFin, setFechaFin] = useState(() => ultimos7Dias().fechaFin);
  const [consultado, setConsultado] = useState<{ fechaInicio: string; fechaFin: string } | undefined>(ultimos7Dias);

  const lotesQuery = useLotesDespachoQuery(
    consultado ? { fechaInicio: consultado.fechaInicio, fechaFin: consultado.fechaFin, limit: 2000 } : { limit: 0 }
  );
  const lotes = consultado ? lotesQuery.data?.data ?? [] : [];

  const filas = useMemo(() => {
    const mapa = new Map<string, { transportista: string; viajes: number; tonelaje: number }>();
    for (const lote of lotes) {
      if (lote.estadoLote === "ANULADO") continue;
      const nombre = lote.transportista?.nombreORazonSocial ?? "-";
      const actual = mapa.get(nombre) ?? { transportista: nombre, viajes: 0, tonelaje: 0 };
      actual.viajes += 1;
      actual.tonelaje += Number(lote.pesaje?.tonelajeNeto ?? 0);
      mapa.set(nombre, actual);
    }
    return Array.from(mapa.values()).sort((a, b) => b.tonelaje - a.tonelaje);
  }, [lotes]);

  const totales = useMemo(
    () => filas.reduce((acc, f) => ({ viajes: acc.viajes + f.viajes, tonelaje: acc.tonelaje + f.tonelaje }), { viajes: 0, tonelaje: 0 }),
    [filas]
  );

  function handleConsultar() {
    if (!fechaInicio || !fechaFin) {
      showError("Elige el rango de fechas.");
      return;
    }
    setConsultado({ fechaInicio, fechaFin });
  }

  function handleExportExcel() {
    if (!consultado) return;
    exportTablaReporteExcel({
      subtitulo: `RANKING DE TRANSPORTISTAS — ${formatFecha(consultado.fechaInicio)} al ${formatFecha(consultado.fechaFin)}`,
      columnas: ["#", "Transportista", "Viajes", "Tonelaje neto"],
      filas: filas.map((f, i) => [i + 1, f.transportista, f.viajes, Number(f.tonelaje.toFixed(2))]),
      filaTotales: ["", "Total", totales.viajes, Number(totales.tonelaje.toFixed(2))],
      nombreArchivo: "ranking-transportistas",
      colsNumericas: [0, 2, 3],
      anchoColumnas: [6, 30, 12, 16]
    });
  }

  function handleExportPdf() {
    if (!consultado) return;
    exportTablaReportePdf({
      subtitulo: `RANKING DE TRANSPORTISTAS — ${formatFecha(consultado.fechaInicio)} al ${formatFecha(consultado.fechaFin)}`,
      columnas: ["#", "Transportista", "Viajes", "Tonelaje neto"],
      filas: filas.map((f, i) => [i + 1, f.transportista, f.viajes, formatNumero(f.tonelaje)]),
      filaTotales: ["", "Total", totales.viajes, formatNumero(totales.tonelaje)],
      nombreArchivo: "ranking-transportistas",
      colsNumericas: [0, 2, 3]
    });
  }

  return (
    <>
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Desde</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Hasta</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className={inputClassName} />
          </div>
          <button
            type="button"
            onClick={handleConsultar}
            className="inline-flex items-center justify-center gap-2 self-end rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            <Search size={14} /> Consultar
          </button>
        </div>
      </article>

      {consultado ? (
        lotesQuery.isLoading ? (
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 text-sm text-[var(--color-on-surface-variant)]">
            Calculando...
          </article>
        ) : (
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                {formatFecha(consultado.fechaInicio)} — {formatFecha(consultado.fechaFin)}
              </h2>
              <div className="flex gap-2">
                <button type="button" onClick={handleExportExcel} className={buttonSecondaryClassName}>
                  <FileSpreadsheet size={13} /> Excel
                </button>
                <button type="button" onClick={handleExportPdf} className={buttonSecondaryClassName}>
                  <FileText size={13} /> PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    <th className="py-1 pr-3">#</th>
                    <th className="py-1 pr-3">Transportista</th>
                    <th className="py-1 pr-3 text-right">Viajes</th>
                    <th className="py-1 text-right">Tonelaje neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {filas.map((f, i) => (
                    <tr key={f.transportista}>
                      <td className="py-1 pr-3">{i + 1}</td>
                      <td className="py-1 pr-3 font-semibold">{f.transportista}</td>
                      <td className="py-1 pr-3 text-right">{f.viajes}</td>
                      <td className="py-1 text-right">{formatNumero(f.tonelaje)}</td>
                    </tr>
                  ))}
                  {filas.length === 0 ? (
                    <tr><td colSpan={4} className="py-3 text-center text-[var(--color-on-surface-variant)]">Sin lotes en este rango.</td></tr>
                  ) : (
                    <tr className="font-bold">
                      <td className="py-1 pr-3" colSpan={2}>Total</td>
                      <td className="py-1 pr-3 text-right">{totales.viajes}</td>
                      <td className="py-1 text-right">{formatNumero(totales.tonelaje)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        )
      ) : null}
    </>
  );
}

// ============================================================================
// Resumen de Liquidaciones (nuevo): liquidaciones cuyo período se cruza con
// el rango elegido — el endpoint no filtra por fecha, así que se trae todo
// lo que haga falta y se filtra acá (mismo volumen que ya lista la propia
// pantalla de Liquidaciones).
// ============================================================================
function ResumenLiquidacionesReport() {
  const { showError } = useToast();
  const [fechaInicio, setFechaInicio] = useState(() => ultimos7Dias().fechaInicio);
  const [fechaFin, setFechaFin] = useState(() => ultimos7Dias().fechaFin);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoLiquidacion | "">("CERRADO");
  const [consultado, setConsultado] = useState<{ fechaInicio: string; fechaFin: string; estado: EstadoLiquidacion | "" } | undefined>(
    () => ({ ...ultimos7Dias(), estado: "CERRADO" })
  );

  const query = useLiquidacionesQuery(
    consultado ? { estado: consultado.estado || undefined } : {},
    Boolean(consultado)
  );
  const liquidaciones = consultado ? query.data?.data ?? [] : [];

  const filas = useMemo(() => {
    if (!consultado) return [];
    const desde = new Date(consultado.fechaInicio);
    const hasta = new Date(consultado.fechaFin);
    return liquidaciones
      .filter((l) => new Date(l.fechaFin) >= desde && new Date(l.fechaInicio) <= hasta)
      .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
  }, [liquidaciones, consultado]);

  const totalNeto = filas.reduce((acc, l) => acc + Number(l.totalNeto), 0);

  function handleConsultar() {
    if (!fechaInicio || !fechaFin) {
      showError("Elige el rango de fechas.");
      return;
    }
    setConsultado({ fechaInicio, fechaFin, estado: estadoFiltro });
  }

  function handleExportExcel() {
    if (!consultado) return;
    exportTablaReporteExcel({
      subtitulo: `RESUMEN DE LIQUIDACIONES — ${formatFecha(consultado.fechaInicio)} al ${formatFecha(consultado.fechaFin)}`,
      columnas: ["Nº", "Transportista", "Desde", "Hasta", "Estado", "Total neto (Bs)"],
      filas: filas.map((l) => [
        l.numero ?? "-",
        l.transportista?.nombreORazonSocial ?? "-",
        formatFecha(l.fechaInicio),
        formatFecha(l.fechaFin),
        ESTADO_LIQUIDACION_LABEL[l.estado],
        Number(l.totalNeto)
      ]),
      filaTotales: ["", "", "", "", "Total", Number(totalNeto.toFixed(2))],
      nombreArchivo: "resumen-liquidaciones",
      colsNumericas: [5],
      anchoColumnas: [8, 28, 12, 12, 12, 16]
    });
  }

  function handleExportPdf() {
    if (!consultado) return;
    exportTablaReportePdf({
      subtitulo: `RESUMEN DE LIQUIDACIONES — ${formatFecha(consultado.fechaInicio)} al ${formatFecha(consultado.fechaFin)}`,
      columnas: ["Nº", "Transportista", "Desde", "Hasta", "Estado", "Total neto (Bs)"],
      filas: filas.map((l) => [
        l.numero ?? "-",
        l.transportista?.nombreORazonSocial ?? "-",
        formatFecha(l.fechaInicio),
        formatFecha(l.fechaFin),
        ESTADO_LIQUIDACION_LABEL[l.estado],
        formatNumero(Number(l.totalNeto))
      ]),
      filaTotales: ["", "", "", "", "Total", formatNumero(totalNeto)],
      nombreArchivo: "resumen-liquidaciones",
      colsNumericas: [5]
    });
  }

  return (
    <>
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Desde</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Hasta</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className={inputClassName} />
          </div>
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value as EstadoLiquidacion | "")} className={inputClassName}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_LIQUIDACION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleConsultar}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            <Search size={14} /> Consultar
          </button>
        </div>
      </article>

      {consultado ? (
        query.isLoading ? (
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 text-sm text-[var(--color-on-surface-variant)]">
            Cargando liquidaciones...
          </article>
        ) : (
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                {formatFecha(consultado.fechaInicio)} — {formatFecha(consultado.fechaFin)}
              </h2>
              <div className="flex gap-2">
                <button type="button" onClick={handleExportExcel} className={buttonSecondaryClassName}>
                  <FileSpreadsheet size={13} /> Excel
                </button>
                <button type="button" onClick={handleExportPdf} className={buttonSecondaryClassName}>
                  <FileText size={13} /> PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    <th className="py-1 pr-3">Nº</th>
                    <th className="py-1 pr-3">Transportista</th>
                    <th className="py-1 pr-3">Desde</th>
                    <th className="py-1 pr-3">Hasta</th>
                    <th className="py-1 pr-3">Estado</th>
                    <th className="py-1 text-right">Total neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {filas.map((l) => (
                    <tr key={l.id}>
                      <td className="py-1 pr-3 font-mono">{l.numero ?? "-"}</td>
                      <td className="py-1 pr-3">{l.transportista?.nombreORazonSocial ?? "-"}</td>
                      <td className="py-1 pr-3">{formatFecha(l.fechaInicio)}</td>
                      <td className="py-1 pr-3">{formatFecha(l.fechaFin)}</td>
                      <td className="py-1 pr-3">{ESTADO_LIQUIDACION_LABEL[l.estado]}</td>
                      <td className="py-1 text-right">Bs {formatNumero(Number(l.totalNeto))}</td>
                    </tr>
                  ))}
                  {filas.length === 0 ? (
                    <tr><td colSpan={6} className="py-3 text-center text-[var(--color-on-surface-variant)]">Sin liquidaciones en este rango.</td></tr>
                  ) : (
                    <tr className="font-bold">
                      <td className="py-1 pr-3" colSpan={5}>Total</td>
                      <td className="py-1 text-right">Bs {formatNumero(totalNeto)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        )
      ) : null}
    </>
  );
}

// ============================================================================
// Tarifas Vigentes (nuevo): foto de las tarifas activas hoy (o todas, con el
// toggle), reutilizando el mismo catálogo que ya administra Parámetros.
// ============================================================================
function TarifasVigentesReport() {
  const query = useTarifasLiquidacionQuery();
  const tarifas = query.data?.data ?? [];
  const [soloVigentes, setSoloVigentes] = useState(true);

  const filas = useMemo(() => {
    const hoy = new Date();
    return tarifas
      .filter((t) => {
        if (!soloVigentes) return true;
        const desde = new Date(t.vigenteDesde);
        const hasta = t.vigenteHasta ? new Date(t.vigenteHasta) : null;
        return desde <= hoy && (!hasta || hasta > hoy);
      })
      .sort((a, b) => a.tipoEntidad.localeCompare(b.tipoEntidad));
  }, [tarifas, soloVigentes]);

  function handleExportExcel() {
    exportTablaReporteExcel({
      subtitulo: `TARIFAS ${soloVigentes ? "VIGENTES" : "(HISTÓRICO COMPLETO)"}`,
      columnas: ["Tipo de entidad", "Transportista", "Mineral", "Precio/ton (Bs)", "Vigente desde", "Vigente hasta"],
      filas: filas.map((t) => [
        TIPO_ENTIDAD_LABEL[t.tipoEntidad],
        t.transportista?.nombreORazonSocial ?? "Genérico",
        t.tipoMineral?.nombre ?? "Todos",
        Number(t.precioPorTonelada),
        formatFecha(t.vigenteDesde),
        t.vigenteHasta ? formatFecha(t.vigenteHasta) : "Vigente"
      ]),
      nombreArchivo: "tarifas-vigentes",
      colsNumericas: [3],
      anchoColumnas: [18, 26, 16, 14, 14, 14]
    });
  }

  function handleExportPdf() {
    exportTablaReportePdf({
      subtitulo: `TARIFAS ${soloVigentes ? "VIGENTES" : "(HISTÓRICO COMPLETO)"}`,
      columnas: ["Tipo de entidad", "Transportista", "Mineral", "Precio/ton (Bs)", "Vigente desde", "Vigente hasta"],
      filas: filas.map((t) => [
        TIPO_ENTIDAD_LABEL[t.tipoEntidad],
        t.transportista?.nombreORazonSocial ?? "Genérico",
        t.tipoMineral?.nombre ?? "Todos",
        formatNumero(Number(t.precioPorTonelada)),
        formatFecha(t.vigenteDesde),
        t.vigenteHasta ? formatFecha(t.vigenteHasta) : "Vigente"
      ]),
      nombreArchivo: "tarifas-vigentes",
      colsNumericas: [3]
    });
  }

  return (
    <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={soloVigentes} onChange={(e) => setSoloVigentes(e.target.checked)} />
          Solo vigentes hoy
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={handleExportExcel} className={buttonSecondaryClassName}>
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button type="button" onClick={handleExportPdf} className={buttonSecondaryClassName}>
            <FileText size={13} /> PDF
          </button>
        </div>
      </div>
      {query.isLoading ? (
        <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando tarifas...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                <th className="py-1 pr-3">Tipo de entidad</th>
                <th className="py-1 pr-3">Transportista</th>
                <th className="py-1 pr-3">Mineral</th>
                <th className="py-1 pr-3 text-right">Precio/ton</th>
                <th className="py-1 pr-3">Vigente desde</th>
                <th className="py-1">Vigente hasta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {filas.map((t) => (
                <tr key={t.id}>
                  <td className="py-1 pr-3">{TIPO_ENTIDAD_LABEL[t.tipoEntidad]}</td>
                  <td className="py-1 pr-3">{t.transportista?.nombreORazonSocial ?? "Genérico"}</td>
                  <td className="py-1 pr-3">{t.tipoMineral?.nombre ?? "Todos"}</td>
                  <td className="py-1 pr-3 text-right">Bs {formatNumero(Number(t.precioPorTonelada))}</td>
                  <td className="py-1 pr-3">{formatFecha(t.vigenteDesde)}</td>
                  <td className="py-1">{t.vigenteHasta ? formatFecha(t.vigenteHasta) : "Vigente"}</td>
                </tr>
              ))}
              {filas.length === 0 ? (
                <tr><td colSpan={6} className="py-3 text-center text-[var(--color-on-surface-variant)]">Sin tarifas para mostrar.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export function LogisticaReportesPage() {
  const { tipo: tipoParam } = useParams();
  const navigate = useNavigate();

  if (!isTipoReporte(tipoParam)) {
    return <Navigate to="/logistica/reportes/cuadro-mensual" replace />;
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
            <h1 className="font-headline text-3xl font-extrabold">Reportes de Logística</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Todo lo que hace falta tener a mano del módulo: despachos, Formulario 101, transportistas,
              liquidaciones y tarifas. Cada reporte se descarga en Excel y PDF.
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
                    onClick={() => navigate(`/logistica/reportes/${report.type}`)}
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

      {tipo === "cuadro-mensual" ? <CuadroMensualReport /> : null}
      {tipo === "detalle-volqueta" ? <DetalleVolquetaReport /> : null}
      {tipo === "resumen-mineral-ingenio" ? <ResumenMineralIngenioReport /> : null}
      {tipo === "estado-f101" ? <EstadoF101Report /> : null}
      {tipo === "ranking-transportistas" ? <RankingTransportistasReport /> : null}
      {tipo === "resumen-liquidaciones" ? <ResumenLiquidacionesReport /> : null}
      {tipo === "tarifas-vigentes" ? <TarifasVigentesReport /> : null}
    </section>
  );
}
