import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, FileBarChart2, FileSpreadsheet, FileText, Landmark, PieChart, Scale, Search, Wallet } from "lucide-react";
import {
  useReporteDesgloseQuery,
  useReporteNoDeduciblesQuery,
  useReporteRetencionesQuery
} from "@/features/reportesCajaChica/hooks/useReportesCajaChica";
import {
  exportReporteRetencionesExcel,
  exportReporteRetencionesPdf
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

  useEffect(() => {
    if (!cajaId && cajas.length > 0) setCajaId(String(encontrarCajaLipena(cajas)?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajas]);

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

  const porOrigenOrdenado = useMemo(
    () => [...(desglose?.porOrigen ?? [])].sort((a, b) => b.total - a.total),
    [desglose]
  );
  const totalCaja = porOrigenOrdenado.filter((o) => o.origen === "CAJA");
  const totalBanco = porOrigenOrdenado.filter((o) => o.origen === "BANCO");

  const porCentroOrdenado = useMemo(() => [...(desglose?.porCentroCosto ?? [])].sort((a, b) => b.total - a.total), [desglose]);
  const porFuncionOrdenado = useMemo(() => [...(desglose?.porFuncionGasto ?? [])].sort((a, b) => b.total - a.total), [desglose]);
  const porCuentaOrdenado = useMemo(() => [...(desglose?.porCuentaContable ?? [])].sort((a, b) => b.total - a.total), [desglose]);
  const porCategoriaOrdenado = useMemo(() => [...(desglose?.porCategoria ?? [])].sort((a, b) => b.total - a.total), [desglose]);

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

      <article className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-secondary)]/16 text-[var(--color-secondary)]">
            <Search size={14} />
          </span>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface)]">Período a consultar</h2>
        </div>
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
          <article className="rounded-xl border-2 border-[var(--color-primary)]/40 bg-[var(--color-primary)]/[0.06] p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                <Scale size={14} />
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-primary)]">
                Cuánto se gastó: caja vs. banco
              </h2>
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

          <article className="rounded-xl border-2 border-[var(--color-warning)]/40 bg-[var(--color-warning)]/[0.06] p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-warning)]/20 text-[var(--color-warning)]">
                <AlertTriangle size={14} />
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-warning)]">Gastos no deducibles</h2>
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

          <article className="rounded-xl border-2 border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                <PieChart size={14} />
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface)]">
                Desglose por centro de costo, función de gasto y cuenta contable
              </h2>
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
        </>
      ) : null}
    </section>
  );
}
