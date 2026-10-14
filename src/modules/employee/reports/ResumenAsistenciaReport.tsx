import { useMemo } from "react";
import { FileSpreadsheet } from "lucide-react";
import { getTipoPersonalLabel } from "@/modules/employee/hooks/useEmployees";
import { exportRowsToExcel } from "@/modules/employee/lib/exportExcel";
import { diasHastaHoy, formatFechaCorta, type ReportData } from "@/modules/employee/lib/asistenciaReport";
import { ReportEstado } from "@/modules/employee/reports/ReportEstado";
import { useToast } from "@/shared/ui/toast/ToastProvider";

// Estados que se cuentan como columna, en el orden en que se muestran.
const COLUMNAS = [
  { estado: "PUNTUAL", label: "Puntual" },
  { estado: "TARDE", label: "Tarde" },
  { estado: "AUSENTE", label: "Ausente" },
  { estado: "ABANDONO", label: "Abandono" },
  { estado: "VACACION", label: "Vacación" },
  { estado: "DESCANSO", label: "Descanso" },
  { estado: "PERMISO", label: "Permiso" },
  { estado: "ENFERMEDAD", label: "Enfermedad" },
  { estado: "FERIADO", label: "Feriado" },
  { estado: "OTRO", label: "Otro" },
  { estado: "SIN_HORARIO", label: "Sin horario" }
] as const;

type Conteo = Record<(typeof COLUMNAS)[number]["estado"], number>;

interface Fila {
  id: number;
  nombre: string;
  cargo: string;
  tipo: string;
  horario: string;
  conteo: Conteo;
  // asistidos / (asistidos + ausente + abandono); null si no tenía días exigibles
  porcentaje: number | null;
}

const thClass = "px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]";
const tdClass = "px-3 py-2 text-xs";

function conteoVacio(): Conteo {
  return Object.fromEntries(COLUMNAS.map((c) => [c.estado, 0])) as Conteo;
}

function calcularPorcentaje(conteo: Conteo): number | null {
  const asistidos = conteo.PUNTUAL + conteo.TARDE;
  const exigibles = asistidos + conteo.AUSENTE + conteo.ABANDONO;
  return exigibles > 0 ? (asistidos / exigibles) * 100 : null;
}

function formatPorcentaje(value: number | null) {
  return value === null ? "-" : `${value.toFixed(1)}%`;
}

export function ResumenAsistenciaReport({ entries, isLoading, isError, desde, hasta }: ReportData) {
  const { showError, showSuccess } = useToast();

  const filas = useMemo<Fila[]>(
    () =>
      entries
        .map<Fila>((entry) => {
          const conteo = conteoVacio();
          for (const day of diasHastaHoy(entry.dias)) {
            const estado = day.estado.trim().toUpperCase();
            if (estado in conteo) conteo[estado as keyof Conteo] += 1;
          }
          return {
            id: entry.empleado.id,
            nombre: entry.empleado.nombre,
            cargo: entry.empleado.cargo ?? "-",
            tipo: getTipoPersonalLabel(entry.empleado.tipoPersonal),
            horario: entry.horarioActual
              ? `${entry.horarioActual.nombre} (${entry.horarioActual.entrada}-${entry.horarioActual.salida})`
              : "Sin horario",
            conteo,
            porcentaje: calcularPorcentaje(conteo)
          };
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [entries]
  );

  const totales = useMemo(() => {
    const conteo = conteoVacio();
    for (const fila of filas) {
      for (const columna of COLUMNAS) conteo[columna.estado] += fila.conteo[columna.estado];
    }
    return { conteo, porcentaje: calcularPorcentaje(conteo) };
  }, [filas]);

  function handleExport() {
    try {
      const rows = filas.map((fila, index) => {
        const base: Record<string, string | number> = {
          "N°": index + 1,
          Trabajador: fila.nombre,
          Cargo: fila.cargo,
          "Tipo de personal": fila.tipo,
          Horario: fila.horario
        };
        for (const columna of COLUMNAS) base[columna.label] = fila.conteo[columna.estado];
        base["% asistencia"] = fila.porcentaje === null ? "" : Math.round(fila.porcentaje * 10) / 10;
        return base;
      });
      exportRowsToExcel(rows, "Resumen asistencia", `resumen-asistencia-${desde}-${hasta}.xlsx`);
      showSuccess(`Excel generado con ${rows.length} trabajadores.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo exportar el reporte.");
    }
  }

  const hayEstado = isLoading || isError || entries.length === 0;

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            Resumen de asistencia por trabajador
          </h2>
          <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
            Días por estado del {formatFechaCorta(desde)} al {formatFechaCorta(hasta)}. No se cuentan días futuros. El %
            de asistencia = (puntual + tarde) / (puntual + tarde + ausente + abandono): los días de vacación, permiso,
            descanso y no laborales no cuentan como exigibles.
          </p>
        </div>
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

      {hayEstado ? (
        <div className="p-4">
          <ReportEstado isLoading={isLoading} isError={isError} isEmpty={entries.length === 0} />
        </div>
      ) : (
        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className={thClass}>N°</th>
                <th className={thClass}>Trabajador</th>
                <th className={thClass}>Cargo</th>
                <th className={thClass}>Tipo</th>
                <th className={thClass}>Horario</th>
                {COLUMNAS.map((columna) => (
                  <th key={columna.estado} className={`${thClass} text-right`}>
                    {columna.label}
                  </th>
                ))}
                <th className={`${thClass} text-right`}>% asist.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {filas.map((fila, index) => (
                <tr key={fila.id} className="hover:bg-[var(--color-surface-container-high)]/60">
                  <td className={`${tdClass} font-mono`}>{index + 1}</td>
                  <td className={`${tdClass} text-sm font-semibold`}>{fila.nombre}</td>
                  <td className={tdClass}>{fila.cargo}</td>
                  <td className={tdClass}>{fila.tipo}</td>
                  <td className={`${tdClass} ${fila.horario === "Sin horario" ? "text-amber-600" : ""}`}>{fila.horario}</td>
                  {COLUMNAS.map((columna) => {
                    const value = fila.conteo[columna.estado];
                    const alerta = value > 0 && (columna.estado === "AUSENTE" || columna.estado === "ABANDONO");
                    return (
                      <td key={columna.estado} className={`${tdClass} text-right font-mono ${alerta ? "font-semibold text-rose-600" : ""} ${value === 0 ? "text-[var(--color-on-surface-variant)]/50" : ""}`}>
                        {value}
                      </td>
                    );
                  })}
                  <td className={`${tdClass} text-right font-mono font-semibold`}>{formatPorcentaje(fila.porcentaje)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]">
                <td className={`${tdClass} font-bold`} colSpan={5}>
                  TOTAL ({filas.length} trabajadores)
                </td>
                {COLUMNAS.map((columna) => (
                  <td key={columna.estado} className={`${tdClass} text-right font-mono font-bold`}>
                    {totales.conteo[columna.estado]}
                  </td>
                ))}
                <td className={`${tdClass} text-right font-mono font-bold`}>{formatPorcentaje(totales.porcentaje)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </article>
  );
}
