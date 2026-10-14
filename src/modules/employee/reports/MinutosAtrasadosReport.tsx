import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileSpreadsheet } from "lucide-react";
import { getTipoPersonalLabel } from "@/modules/employee/hooks/useEmployees";
import { exportRowsToExcel } from "@/modules/employee/lib/exportExcel";
import {
  formatFechaCorta,
  formatMinutos,
  isDiaAsistido,
  minutosDesdeEntrada,
  type ReportData
} from "@/modules/employee/lib/asistenciaReport";
import { ReportEstado } from "@/modules/employee/reports/ReportEstado";
import { useToast } from "@/shared/ui/toast/ToastProvider";

interface DiaAtraso {
  fecha: string;
  programada: string;
  real: string;
  minutos: number;
  minutosDesdeEntrada: number;
}

interface Fila {
  id: number;
  nombre: string;
  cargo: string;
  tipo: string;
  horario: string;
  diasAsistidos: number;
  diasConAtraso: number;
  minutos: number;
  minutosDesdeEntrada: number;
  mayor: number;
  promedio: number;
  detalle: DiaAtraso[];
}

const thClass = "px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]";
const tdClass = "px-3 py-2 text-xs";

export function MinutosAtrasadosReport({ entries, isLoading, isError, desde, hasta }: ReportData) {
  const { showError, showSuccess } = useToast();
  const [orden, setOrden] = useState<"atraso" | "nombre">("atraso");
  const [soloConAtraso, setSoloConAtraso] = useState(false);
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());

  const filas = useMemo<Fila[]>(() => {
    const resultado = entries.map<Fila>((entry) => {
      let diasAsistidos = 0;
      let diasConAtraso = 0;
      let minutos = 0;
      let minutosEntrada = 0;
      let mayor = 0;
      const detalle: DiaAtraso[] = [];

      for (const day of entry.dias) {
        if (!isDiaAsistido(day)) continue;
        diasAsistidos += 1;
        minutosEntrada += minutosDesdeEntrada(day);
        if (day.minutosRetraso > 0) {
          diasConAtraso += 1;
          minutos += day.minutosRetraso;
          mayor = Math.max(mayor, day.minutosRetraso);
          detalle.push({
            fecha: day.fecha,
            programada: day.programado?.entrada ?? "-",
            real: day.real?.entrada ?? "-",
            minutos: day.minutosRetraso,
            minutosDesdeEntrada: minutosDesdeEntrada(day)
          });
        }
      }

      return {
        id: entry.empleado.id,
        nombre: entry.empleado.nombre,
        cargo: entry.empleado.cargo ?? "-",
        tipo: getTipoPersonalLabel(entry.empleado.tipoPersonal),
        horario: entry.horarioActual
          ? `${entry.horarioActual.nombre} (${entry.horarioActual.entrada}-${entry.horarioActual.salida})`
          : "Sin horario",
        diasAsistidos,
        diasConAtraso,
        minutos,
        minutosDesdeEntrada: minutosEntrada,
        mayor,
        promedio: diasConAtraso > 0 ? minutos / diasConAtraso : 0,
        detalle
      };
    });

    const visibles = soloConAtraso ? resultado.filter((fila) => fila.minutos > 0) : resultado;
    return [...visibles].sort((a, b) =>
      orden === "atraso"
        ? b.minutos - a.minutos || a.nombre.localeCompare(b.nombre, "es")
        : a.nombre.localeCompare(b.nombre, "es")
    );
  }, [entries, orden, soloConAtraso]);

  const totales = useMemo(
    () => ({
      diasAsistidos: filas.reduce((sum, fila) => sum + fila.diasAsistidos, 0),
      diasConAtraso: filas.reduce((sum, fila) => sum + fila.diasConAtraso, 0),
      minutos: filas.reduce((sum, fila) => sum + fila.minutos, 0),
      minutosDesdeEntrada: filas.reduce((sum, fila) => sum + fila.minutosDesdeEntrada, 0)
    }),
    [filas]
  );

  function toggle(id: number) {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExport() {
    try {
      const rows = filas.map((fila, index) => ({
        "N°": index + 1,
        Trabajador: fila.nombre,
        Cargo: fila.cargo,
        "Tipo de personal": fila.tipo,
        Horario: fila.horario,
        "Días asistidos": fila.diasAsistidos,
        "Días con atraso": fila.diasConAtraso,
        "Minutos de retraso (tras tolerancia)": fila.minutos,
        "Retraso acumulado": formatMinutos(fila.minutos),
        "Minutos desde la hora de entrada": fila.minutosDesdeEntrada,
        "Mayor retraso (min)": fila.mayor,
        "Promedio por día con atraso (min)": Math.round(fila.promedio * 10) / 10
      }));
      exportRowsToExcel(rows, "Minutos atrasados", `minutos-atrasados-${desde}-${hasta}.xlsx`);
      showSuccess(`Excel generado con ${rows.length} trabajadores.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo exportar el reporte.");
    }
  }

  const estado = <ReportEstado isLoading={isLoading} isError={isError} isEmpty={entries.length === 0} />;
  const hayEstado = isLoading || isError || entries.length === 0;

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            Minutos atrasados acumulados por trabajador
          </h2>
          <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
            Del {formatFechaCorta(desde)} al {formatFechaCorta(hasta)}. "Minutos de retraso" descuenta la tolerancia de
            cada horario (es lo que el sistema marca como TARDE); "Desde la hora de entrada" no la descuenta.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs">
            <input type="checkbox" checked={soloConAtraso} onChange={(e) => setSoloConAtraso(e.target.checked)} />
            Solo con atrasos
          </label>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as "atraso" | "nombre")}
            className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs"
          >
            <option value="atraso">Más atrasados primero</option>
            <option value="nombre">Por nombre</option>
          </select>
          <button
            type="button"
            onClick={handleExport}
            disabled={hayEstado || filas.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)]/14 px-4 py-2 text-xs font-semibold text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileSpreadsheet size={14} />
            Exportar Excel
          </button>
        </div>
      </div>

      {hayEstado ? (
        <div className="p-4">{estado}</div>
      ) : (
        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className={thClass} />
                <th className={thClass}>N°</th>
                <th className={thClass}>Trabajador</th>
                <th className={thClass}>Cargo</th>
                <th className={thClass}>Tipo</th>
                <th className={thClass}>Horario</th>
                <th className={`${thClass} text-right`}>Días asistidos</th>
                <th className={`${thClass} text-right`}>Días con atraso</th>
                <th className={`${thClass} text-right`}>Min. de retraso</th>
                <th className={`${thClass} text-right`}>Min. desde la entrada</th>
                <th className={`${thClass} text-right`}>Mayor (min)</th>
                <th className={`${thClass} text-right`}>Prom. por día</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                    Ningún trabajador tuvo atrasos en este rango.
                  </td>
                </tr>
              ) : null}
              {filas.map((fila, index) => {
                const abierto = abiertos.has(fila.id);
                return (
                  <Fragment key={fila.id}>
                    <tr className="hover:bg-[var(--color-surface-container-high)]/60">
                      <td className="px-3 py-2">
                        {fila.detalle.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggle(fila.id)}
                            aria-label={abierto ? "Ocultar días" : "Ver días con atraso"}
                            className="text-[var(--color-on-surface-variant)]"
                          >
                            {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        ) : null}
                      </td>
                      <td className={`${tdClass} font-mono`}>{index + 1}</td>
                      <td className={`${tdClass} text-sm font-semibold`}>{fila.nombre}</td>
                      <td className={tdClass}>{fila.cargo}</td>
                      <td className={tdClass}>{fila.tipo}</td>
                      <td className={`${tdClass} ${fila.horario === "Sin horario" ? "text-amber-600" : ""}`}>{fila.horario}</td>
                      <td className={`${tdClass} text-right font-mono`}>{fila.diasAsistidos}</td>
                      <td className={`${tdClass} text-right font-mono`}>{fila.diasConAtraso}</td>
                      <td
                        className={`${tdClass} text-right font-mono font-semibold ${fila.minutos > 0 ? "text-amber-600" : ""}`}
                        title={`${fila.minutos} min`}
                      >
                        {formatMinutos(fila.minutos)}
                      </td>
                      <td className={`${tdClass} text-right font-mono`} title={`${fila.minutosDesdeEntrada} min`}>
                        {formatMinutos(fila.minutosDesdeEntrada)}
                      </td>
                      <td className={`${tdClass} text-right font-mono`}>{fila.mayor}</td>
                      <td className={`${tdClass} text-right font-mono`}>{fila.promedio > 0 ? fila.promedio.toFixed(1) : "-"}</td>
                    </tr>
                    {abierto ? (
                      <tr>
                        <td />
                        <td colSpan={11} className="bg-[var(--color-surface-container-high)]/50 px-3 py-3">
                          <table className="w-full max-w-xl text-left">
                            <thead>
                              <tr>
                                <th className={thClass}>Fecha</th>
                                <th className={thClass}>Entrada programada</th>
                                <th className={thClass}>Entrada real</th>
                                <th className={`${thClass} text-right`}>Min. de retraso</th>
                                <th className={`${thClass} text-right`}>Min. desde la entrada</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fila.detalle.map((dia) => (
                                <tr key={dia.fecha} className="border-t border-[var(--color-border-soft)]">
                                  <td className="px-3 py-1 font-mono text-xs">{formatFechaCorta(dia.fecha)}</td>
                                  <td className="px-3 py-1 font-mono text-xs">{dia.programada}</td>
                                  <td className="px-3 py-1 font-mono text-xs">{dia.real}</td>
                                  <td className="px-3 py-1 text-right font-mono text-xs">{dia.minutos}</td>
                                  <td className="px-3 py-1 text-right font-mono text-xs">{dia.minutosDesdeEntrada}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
            {filas.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]">
                  <td />
                  <td className={`${tdClass} font-bold`} colSpan={5}>
                    TOTAL ({filas.length} trabajadores)
                  </td>
                  <td className={`${tdClass} text-right font-mono font-bold`}>{totales.diasAsistidos}</td>
                  <td className={`${tdClass} text-right font-mono font-bold`}>{totales.diasConAtraso}</td>
                  <td className={`${tdClass} text-right font-mono font-bold`}>{formatMinutos(totales.minutos)}</td>
                  <td className={`${tdClass} text-right font-mono font-bold`}>{formatMinutos(totales.minutosDesdeEntrada)}</td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
    </article>
  );
}
