import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useEmployees } from "@/modules/employee/hooks/useEmployees";
import { httpClient } from "@/shared/api/core/httpClient";

interface ReportDay {
  fecha: string;
  estado: string;
  minutosRetraso: number;
  real?: { entrada?: string; salida?: string } | null;
}

interface ReportEmployee {
  empleado: { id: number; nombre: string; cargo?: string | null };
  horarioActual?: { nombre: string; entrada: string; salida: string } | null;
  dias: ReportDay[];
  resumen: Record<string, number>;
}

export function PersonalReportPage() {
  const employees = useEmployees();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [empleadoId, setEmpleadoId] = useState("");

  const reportQuery = useQuery({
    queryKey: ["personal-reporte", desde, hasta, empleadoId],
    enabled: Boolean(desde && hasta),
    queryFn: async () => {
      const response = await httpClient.get("/api/personal/reporte", {
        params: { desde, hasta, empleadoId: empleadoId || undefined }
      });
      const payload = response.data as { data?: { empleados?: ReportEmployee[] } };
      return payload.data?.empleados ?? [];
    }
  });

  const employeeOptions = useMemo(
    () =>
      employees.getAll.data.map((employee) => ({
        id: String(employee.id),
        label: employee.nombre,
        searchText: `${employee.documento ?? ""} ${employee.cargo ?? ""} ${employee.deviceUserId ?? ""}`
      })),
    [employees.getAll.data]
  );

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4"><SubrouteBackButton to="/personal" label="Volver a Personal" /></div>
        <h1 className="page-title font-headline text-3xl font-extrabold">Reporte de Asistencia</h1>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <AutocompleteSelect value={empleadoId} onChange={setEmpleadoId} options={employeeOptions} placeholder="Empleado (opcional)" className="w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
        </div>
      </article>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
        <div className="px-5 py-3 text-xs text-[var(--color-on-surface-variant)]">Registros: {reportQuery.data?.length ?? 0}</div>
        <div className="space-y-4 p-4">
          {reportQuery.data?.map((entry) => (
            <div key={entry.empleado.id} className="rounded-lg border border-[var(--color-border-soft)] p-3">
              <p className="text-sm font-semibold">{entry.empleado.nombre} ({entry.empleado.cargo ?? "-"})</p>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Horario: {entry.horarioActual?.nombre ?? "Sin horario"} {entry.horarioActual ? `(${entry.horarioActual.entrada}-${entry.horarioActual.salida})` : ""}
              </p>
              <div className="mt-2 table-scroll overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr><th className="px-2 py-1 text-[10px]">Fecha</th><th className="px-2 py-1 text-[10px]">Estado</th><th className="px-2 py-1 text-[10px]">Entrada</th><th className="px-2 py-1 text-[10px]">Salida</th><th className="px-2 py-1 text-[10px]">Retraso</th></tr></thead>
                  <tbody>
                    {entry.dias.map((day) => (
                      <tr key={`${entry.empleado.id}-${day.fecha}`} className="border-t border-[var(--color-border-soft)]">
                        <td className="px-2 py-1 text-xs font-mono">{day.fecha}</td>
                        <td className="px-2 py-1 text-xs">{day.estado}</td>
                        <td className="px-2 py-1 text-xs font-mono">{day.real?.entrada ?? "-"}</td>
                        <td className="px-2 py-1 text-xs font-mono">{day.real?.salida ?? "-"}</td>
                        <td className="px-2 py-1 text-xs">{day.minutosRetraso}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
