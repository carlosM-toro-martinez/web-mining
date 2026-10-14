import { useMemo } from "react";
import { FileSpreadsheet } from "lucide-react";
import { getTipoPersonalLabel } from "@/modules/employee/hooks/useEmployees";
import { exportRowsToExcel } from "@/modules/employee/lib/exportExcel";
import { diasHastaHoy, formatFechaCorta, type ReportData } from "@/modules/employee/lib/asistenciaReport";
import { ReportEstado } from "@/modules/employee/reports/ReportEstado";
import { useToast } from "@/shared/ui/toast/ToastProvider";

interface Fila {
  id: number;
  nombre: string;
  cargo: string;
  tipo: string;
  faltas: string[];
  abandonos: string[];
}

const thClass = "px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]";
const tdClass = "px-3 py-2 text-xs";

// "2026-10-05" -> "05/10"
function diaMes(iso: string) {
  return formatFechaCorta(iso).slice(0, 5);
}

export function InasistenciasReport({ entries, isLoading, isError, desde, hasta }: ReportData) {
  const { showError, showSuccess } = useToast();

  const filas = useMemo<Fila[]>(
    () =>
      entries
        .map<Fila>((entry) => {
          const faltas: string[] = [];
          const abandonos: string[] = [];
          for (const day of diasHastaHoy(entry.dias)) {
            const estado = day.estado.trim().toUpperCase();
            if (estado === "AUSENTE") faltas.push(day.fecha);
            else if (estado === "ABANDONO") abandonos.push(day.fecha);
          }
          return {
            id: entry.empleado.id,
            nombre: entry.empleado.nombre,
            cargo: entry.empleado.cargo ?? "-",
            tipo: getTipoPersonalLabel(entry.empleado.tipoPersonal),
            faltas,
            abandonos
          };
        })
        .filter((fila) => fila.faltas.length + fila.abandonos.length > 0)
        .sort(
          (a, b) =>
            b.faltas.length + b.abandonos.length - (a.faltas.length + a.abandonos.length) ||
            a.nombre.localeCompare(b.nombre, "es")
        ),
    [entries]
  );

  const totalFaltas = filas.reduce((sum, fila) => sum + fila.faltas.length, 0);
  const totalAbandonos = filas.reduce((sum, fila) => sum + fila.abandonos.length, 0);

  function handleExport() {
    try {
      const rows = filas.map((fila, index) => ({
        "N°": index + 1,
        Trabajador: fila.nombre,
        Cargo: fila.cargo,
        "Tipo de personal": fila.tipo,
        Faltas: fila.faltas.length,
        Abandonos: fila.abandonos.length,
        Total: fila.faltas.length + fila.abandonos.length,
        "Fechas de falta": fila.faltas.map(formatFechaCorta).join(", "),
        "Fechas de abandono": fila.abandonos.map(formatFechaCorta).join(", ")
      }));
      exportRowsToExcel(rows, "Faltas y abandonos", `faltas-y-abandonos-${desde}-${hasta}.xlsx`);
      showSuccess(`Excel generado con ${rows.length} trabajadores.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo exportar el reporte.");
    }
  }

  const sinDatos = entries.length === 0;
  const hayEstado = isLoading || isError || sinDatos;

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            Faltas y abandonos
          </h2>
          <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
            Días laborables sin marcas (falta) y abandonos registrados, del {formatFechaCorta(desde)} al{" "}
            {formatFechaCorta(hasta)}. No se cuentan días futuros; un día con ausencia registrada (vacación, permiso,
            etc.) no es falta.
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
          <ReportEstado isLoading={isLoading} isError={isError} isEmpty={sinDatos} />
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
                <th className={`${thClass} text-right`}>Faltas</th>
                <th className={`${thClass} text-right`}>Abandonos</th>
                <th className={thClass}>Fechas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                    Nadie tuvo faltas ni abandonos en este rango.
                  </td>
                </tr>
              ) : null}
              {filas.map((fila, index) => (
                <tr key={fila.id} className="align-top hover:bg-[var(--color-surface-container-high)]/60">
                  <td className={`${tdClass} font-mono`}>{index + 1}</td>
                  <td className={`${tdClass} text-sm font-semibold`}>{fila.nombre}</td>
                  <td className={tdClass}>{fila.cargo}</td>
                  <td className={tdClass}>{fila.tipo}</td>
                  <td className={`${tdClass} text-right font-mono font-semibold text-rose-600`}>{fila.faltas.length}</td>
                  <td className={`${tdClass} text-right font-mono font-semibold text-red-600`}>{fila.abandonos.length}</td>
                  <td className={`${tdClass} font-mono`}>
                    {fila.faltas.length > 0 ? <span>Faltas: {fila.faltas.map(diaMes).join(", ")}</span> : null}
                    {fila.faltas.length > 0 && fila.abandonos.length > 0 ? <br /> : null}
                    {fila.abandonos.length > 0 ? <span>Abandonos: {fila.abandonos.map(diaMes).join(", ")}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
            {filas.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]">
                  <td className={`${tdClass} font-bold`} colSpan={4}>
                    TOTAL ({filas.length} trabajadores)
                  </td>
                  <td className={`${tdClass} text-right font-mono font-bold`}>{totalFaltas}</td>
                  <td className={`${tdClass} text-right font-mono font-bold`}>{totalAbandonos}</td>
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
