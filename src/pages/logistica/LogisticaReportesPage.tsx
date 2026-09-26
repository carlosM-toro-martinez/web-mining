import { useMemo, useState } from "react";
import { FileBarChart2, FileSpreadsheet, FileText, Lock, Search, Truck } from "lucide-react";
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
  exportDetalleVolquetaPdf
} from "@/features/logisticaReportes/lib/logisticaExport";
import { useLotesDespachoQuery } from "@/features/loteDespacho/hooks/useLoteDespacho";
import { useMunicipiosOrigenQuery } from "@/features/parametrosLogistica/hooks/useParametrosLogistica";
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

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO");
}

export function LogisticaReportesPage() {
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

  // --- Detalle de despachos por volqueta (un bloque por vehículo/chofer) ---
  const transportistasQuery = useTransportistasQuery();
  const transportistas = transportistasQuery.data?.data ?? [];
  const [volquetaTransportistaId, setVolquetaTransportistaId] = useState("");
  const [volquetaFechaInicio, setVolquetaFechaInicio] = useState("");
  const [volquetaFechaFin, setVolquetaFechaFin] = useState("");
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
              Cuadro mensual por municipio para la declaración de Formulario 101 y Conocimientos de
              Carga ante el gobierno municipal.
            </p>
          </div>
        </div>
      </header>

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
                    <th className="py-1 pr-3">Correlativo</th>
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

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <Truck size={16} className="text-[var(--color-primary)]" />
          Detalle de despachos por volqueta
        </h2>
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
    </section>
  );
}
