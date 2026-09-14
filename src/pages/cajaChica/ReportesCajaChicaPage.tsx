import { useState } from "react";
import { AlertTriangle, FileBarChart2, FileSpreadsheet, FileText, PieChart, Search } from "lucide-react";
import {
  useReporteDesgloseQuery,
  useReporteNoDeduciblesQuery,
  useReporteRetencionesQuery
} from "@/features/reportesCajaChica/hooks/useReportesCajaChica";
import { exportReporteRetencionesExcel, exportReporteRetencionesPdf } from "@/features/reportesCajaChica/lib/cajaChicaExport";
import { useCajasChicasQuery } from "@/features/parametrosCajaChica/hooks/useParametrosCajaChica";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

function formatMoneda(value: number) {
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO");
}

function inicioDeMesActual() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export function ReportesCajaChicaPage() {
  const cajasQuery = useCajasChicasQuery();
  const cajas = cajasQuery.data?.data ?? [];

  const [cajaId, setCajaId] = useState("");
  const [fechaInicio, setFechaInicio] = useState(inicioDeMesActual);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [consultado, setConsultado] = useState(true);

  const params = {
    cajaId: cajaId ? Number(cajaId) : undefined,
    fechaInicio: fechaInicio || undefined,
    fechaFin: fechaFin || undefined
  };

  const retencionesQuery = useReporteRetencionesQuery(consultado ? params : { cajaId: undefined });
  const noDeduciblesQuery = useReporteNoDeduciblesQuery(consultado ? params : { cajaId: undefined });
  const desgloseQuery = useReporteDesgloseQuery(consultado ? params : { cajaId: undefined });

  const retenciones = retencionesQuery.data?.data;
  const noDeducibles = noDeduciblesQuery.data?.data;
  const desglose = desgloseQuery.data?.data;

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
              cuánto tienes disponible en una caja ahora mismo? Eso está en "Saldos y Movimientos".
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select value={cajaId} onChange={(e) => setCajaId(e.target.value)} className={inputClassName}>
            <option value="">Todas las cajas</option>
            {cajas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputClassName} />
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className={inputClassName} />
          <button
            type="button"
            onClick={() => setConsultado(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            <Search size={14} /> Consultar
          </button>
        </div>
      </article>

      {consultado ? (
        <>
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Resumen de retenciones</h2>
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

          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <AlertTriangle size={16} className="text-[var(--color-warning)]" />
              Gastos no deducibles
            </h2>
            {noDeducibles ? (
              <>
                <p className="mb-3 text-sm">Total: <span className="font-bold">{formatMoneda(noDeducibles.total)}</span></p>
                <div className="space-y-2 text-sm">
                  {noDeducibles.gastos.map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
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

          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <PieChart size={16} className="text-[var(--color-primary)]" />
              Desglose por centro de costo, función de gasto y cuenta contable
            </h2>
            {desglose ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Por centro de costo</h3>
                  <div className="space-y-2 text-sm">
                    {desglose.porCentroCosto.map((item, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                        <span>{item.centro?.codigo} · {item.centro?.nombre}</span>
                        <span className="font-mono font-bold">{formatMoneda(item.total)}</span>
                      </div>
                    ))}
                    {desglose.porCentroCosto.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Sin datos en este período.</p> : null}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Por función de gasto</h3>
                  <div className="space-y-2 text-sm">
                    {desglose.porFuncionGasto.map((item, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                        <span>{item.funcion?.codigo} · {item.funcion?.nombre}</span>
                        <span className="font-mono font-bold">{formatMoneda(item.total)}</span>
                      </div>
                    ))}
                    {desglose.porFuncionGasto.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Sin datos en este período.</p> : null}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Por cuenta contable</h3>
                  <div className="space-y-2 text-sm">
                    {desglose.porCuentaContable.map((item, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                        <span>{item.cuenta?.codigo} · {item.cuenta?.nombre}</span>
                        <span className="font-mono font-bold">{formatMoneda(item.total)}</span>
                      </div>
                    ))}
                    {desglose.porCuentaContable.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Sin datos en este período.</p> : null}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Por categoría del reporte mensual</h3>
                  <div className="space-y-2 text-sm">
                    {desglose.porCategoria.map((item, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                        <span>{item.categoria}</span>
                        <span className="font-mono font-bold">{formatMoneda(item.total)}</span>
                      </div>
                    ))}
                    {desglose.porCategoria.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Sin datos en este período.</p> : null}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando...</p>
            )}
          </article>
        </>
      ) : null}
    </section>
  );
}
