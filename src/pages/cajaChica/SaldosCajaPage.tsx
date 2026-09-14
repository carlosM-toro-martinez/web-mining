import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText, Scale } from "lucide-react";
import { useEstadoCuentaCajaQuery } from "@/features/reportesCajaChica/hooks/useReportesCajaChica";
import { exportEstadoCuentaExcel, exportEstadoCuentaPdf } from "@/features/reportesCajaChica/lib/cajaChicaExport";
import { useCajasChicasQuery } from "@/features/parametrosCajaChica/hooks/useParametrosCajaChica";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

function formatMoneda(value: number) {
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO");
}

export function SaldosCajaPage() {
  const cajasQuery = useCajasChicasQuery();
  const cajas = cajasQuery.data?.data ?? [];

  const [cajaId, setCajaId] = useState("");
  useEffect(() => {
    if (!cajaId && cajas.length > 0) setCajaId(String(cajas[0].id));
  }, [cajas, cajaId]);

  const estadoCuentaQuery = useEstadoCuentaCajaQuery(cajaId ? Number(cajaId) : undefined);
  const estadoCuenta = estadoCuentaQuery.data?.data;

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <Scale size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Saldos y Movimientos</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Cuánto tienes disponible en cada caja en este momento, y todos los fondos recibidos y
              gastos que explican ese número. Esto se actualiza solo, sin necesidad de crear ni cerrar
              ninguna rendición — para eso está la sección "Rendiciones", que sirve para el cierre
              formal periódico, no para consultar el saldo del día a día.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <select value={cajaId} onChange={(e) => setCajaId(e.target.value)} className={`${inputClassName} w-64`}>
            {cajas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          {estadoCuenta ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => exportEstadoCuentaExcel(estadoCuenta)} className={buttonSecondaryClassName}>
                <FileSpreadsheet size={13} /> Exportar Excel
              </button>
              <button type="button" onClick={() => exportEstadoCuentaPdf(estadoCuenta)} className={buttonSecondaryClassName}>
                <FileText size={13} /> Exportar PDF
              </button>
            </div>
          ) : null}
        </div>

        {estadoCuentaQuery.isLoading ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">Calculando saldo...</p>
        ) : estadoCuenta ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4 text-sm sm:grid-cols-4">
              <p>
                <span className="block text-[11px] text-[var(--color-on-surface-variant)]">
                  Saldo inicial{estadoCuenta.fechaCorte ? ` (cierre del ${formatFecha(estadoCuenta.fechaCorte)})` : " (sin cierres previos)"}
                </span>
                {formatMoneda(estadoCuenta.saldoInicial)}
              </p>
              <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">+ Fondos recibidos</span>{formatMoneda(estadoCuenta.totalIngresos)}</p>
              <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">− Gastos</span>{formatMoneda(estadoCuenta.totalEgresos)}</p>
              <p className="font-bold text-[var(--color-primary)]">
                <span className="block text-[11px] font-normal text-[var(--color-on-surface-variant)]">= Saldo actual disponible</span>
                {estadoCuenta.caja.monedaBase} {formatMoneda(estadoCuenta.saldoActual)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    <th className="py-1 pr-3">Fecha</th>
                    <th className="py-1 pr-3">Detalle</th>
                    <th className="py-1 pr-3 text-right">Ingreso</th>
                    <th className="py-1 pr-3 text-right">Egreso</th>
                    <th className="py-1 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {estadoCuenta.movimientos.map((m, index) => (
                    <tr key={index}>
                      <td className="py-1 pr-3">{formatFecha(m.fecha)}</td>
                      <td className="py-1 pr-3">
                        <span className={`mr-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${m.tipo === "FONDO" ? "bg-[var(--color-success)]/18 text-[var(--color-success)]" : "bg-[var(--color-error)]/18 text-[var(--color-error)]"}`}>
                          {m.tipo === "FONDO" ? "Fondo" : "Gasto"}
                        </span>
                        {m.detalle}{m.referencia ? ` · ${m.referencia}` : ""}
                      </td>
                      <td className="py-1 pr-3 text-right text-[var(--color-success)]">{m.ingreso > 0 ? formatMoneda(m.ingreso) : ""}</td>
                      <td className="py-1 pr-3 text-right text-[var(--color-error)]">{m.egreso > 0 ? formatMoneda(m.egreso) : ""}</td>
                      <td className="py-1 text-right font-semibold">{formatMoneda(m.saldo)}</td>
                    </tr>
                  ))}
                  {estadoCuenta.movimientos.length === 0 ? (
                    <tr><td colSpan={5} className="py-3 text-center text-[var(--color-on-surface-variant)]">Sin movimientos desde el saldo inicial.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--color-on-surface-variant)]">Selecciona una caja para ver su saldo.</p>
        )}
      </article>
    </section>
  );
}
