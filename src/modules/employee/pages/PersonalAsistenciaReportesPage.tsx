import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileBarChart2 } from "lucide-react";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { httpClient } from "@/shared/api/core/httpClient";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import {
  getTipoPersonalLabel,
  tipoPersonalOptions,
  useEmployees
} from "@/modules/employee/hooks/useEmployees";
import type { EmployeeTipoPersonal } from "@/modules/employee/db/employee.db";
import { getCurrentMonthRange, type ReportEmployee } from "@/modules/employee/lib/asistenciaReport";
import { DetalleAsistenciaReport } from "@/modules/employee/reports/DetalleAsistenciaReport";
import { InasistenciasReport } from "@/modules/employee/reports/InasistenciasReport";
import { MinutosAtrasadosReport } from "@/modules/employee/reports/MinutosAtrasadosReport";
import { RayadorMitasReport } from "@/modules/employee/reports/RayadorMitasReport";
import { ResumenAsistenciaReport } from "@/modules/employee/reports/ResumenAsistenciaReport";

type ReportType = "detalle-diario" | "rayador-de-mitas" | "resumen-asistencia" | "inasistencias" | "minutos-atrasados";

const REPORTS: Array<{ type: ReportType; title: string; description: string }> = [
  {
    type: "detalle-diario",
    title: "Detalle de asistencia",
    description: "Día por día de cada trabajador, Libro de Asistencia y exportes Rayador / Planilla."
  },
  {
    type: "rayador-de-mitas",
    title: "Rayador de mitas",
    description: "Libro mensual: una marca por día de cada trabajador (1, R, F, VAC, LIC, D) y totales."
  },
  {
    type: "resumen-asistencia",
    title: "Resumen por trabajador",
    description: "Días puntual, tarde, ausente, vacación, permiso, etc. y % de asistencia."
  },
  {
    type: "inasistencias",
    title: "Faltas y abandonos",
    description: "Quién faltó o abandonó y en qué fechas."
  },
  {
    type: "minutos-atrasados",
    title: "Minutos atrasados acumulados",
    description: "Minutos de retraso acumulados por trabajador, con el detalle de cada día."
  }
];

const REPORT_GROUPS: Array<{ title: string; types: ReportType[] }> = [
  { title: "Asistencia", types: ["detalle-diario", "rayador-de-mitas", "resumen-asistencia", "inasistencias"] },
  { title: "Puntualidad", types: ["minutos-atrasados"] }
];

function isReportType(value: string | undefined): value is ReportType {
  return REPORTS.some((report) => report.type === value);
}

const inputClass =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm";

export function PersonalAsistenciaReportesPage() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const { showError } = useToast();
  const employees = useEmployees();

  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [desde, setDesde] = useState(defaultRange.desde);
  const [hasta, setHasta] = useState(defaultRange.hasta);
  const [empleadoId, setEmpleadoId] = useState("");
  const [tipoPersonal, setTipoPersonal] = useState<"" | EmployeeTipoPersonal>("");
  const [applied, setApplied] = useState({ desde: defaultRange.desde, hasta: defaultRange.hasta, empleadoId: "" });

  // Misma consulta para todos los reportes: se carga una vez y cambiar de
  // reporte no vuelve a pedir datos.
  const reportQuery = useQuery({
    queryKey: ["personal-reporte", applied.desde, applied.hasta, applied.empleadoId],
    enabled: Boolean(applied.desde && applied.hasta),
    queryFn: async () => {
      const response = await httpClient.get("/api/personal/reporte", {
        params: {
          desde: applied.desde,
          hasta: applied.hasta,
          empleadoId: applied.empleadoId || undefined
        }
      });
      const payload = response.data as { data?: { empleados?: ReportEmployee[] } };
      return payload.data?.empleados ?? [];
    }
  });

  const entries = useMemo(
    () =>
      (reportQuery.data ?? []).filter((entry) => !tipoPersonal || entry.empleado.tipoPersonal === tipoPersonal),
    [reportQuery.data, tipoPersonal]
  );

  const employeeOptions = useMemo(
    () =>
      employees.getAll.data.map((employee) => ({
        id: String(employee.remoteId ?? employee.id),
        label: `${employee.nombre} - ${getTipoPersonalLabel(employee.tipoPersonal)}`,
        searchText: `${employee.documento ?? ""} ${employee.cargo ?? ""} ${employee.deviceUserId ?? ""} ${getTipoPersonalLabel(employee.tipoPersonal)}`
      })),
    [employees.getAll.data]
  );

  if (!isReportType(tipo)) {
    return <Navigate to="/personal/reporte/detalle-diario" replace />;
  }

  function handleLoadReport() {
    if (!desde || !hasta) {
      showError("Selecciona fecha desde y hasta para cargar el reporte.");
      return;
    }
    if (desde > hasta) {
      showError("La fecha 'desde' debe ser anterior o igual a 'hasta'.");
      return;
    }
    setApplied({ desde, hasta, empleadoId });
  }

  const reportData = {
    entries,
    isLoading: reportQuery.isLoading,
    isFetching: reportQuery.isFetching,
    isError: reportQuery.isError,
    desde: applied.desde,
    hasta: applied.hasta
  };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton to="/personal" label="Volver a Personal" />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <FileBarChart2 size={18} />
          </div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">Reportes de asistencia</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Asistencia, puntualidad y faltas del personal comparando las marcas del biométrico contra el horario
              asignado.
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
                {REPORTS.filter((report) => group.types.includes(report.type)).map((report) => (
                  <button
                    key={report.type}
                    type="button"
                    onClick={() => navigate(`/personal/reporte/${report.type}`)}
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

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Desde</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClass} />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Hasta</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputClass} />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Tipo de personal</span>
            <select
              value={tipoPersonal}
              onChange={(e) => setTipoPersonal(e.target.value as "" | EmployeeTipoPersonal)}
              className={inputClass}
            >
              <option value="">Todos</option>
              {tipoPersonalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Empleado</span>
            <AutocompleteSelect
              value={empleadoId}
              onChange={setEmpleadoId}
              options={employeeOptions}
              placeholder="Todos (opcional)"
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleLoadReport}
              disabled={reportQuery.isFetching}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reportQuery.isFetching ? "Cargando..." : "Cargar reporte"}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">
          Rango cargado: {applied.desde} a {applied.hasta}
          {applied.empleadoId ? " · un empleado" : " · todos los empleados activos"}. El tipo de personal filtra al
          instante; fechas y empleado se aplican con "Cargar reporte".
        </p>
      </article>

      {tipo === "detalle-diario" ? <DetalleAsistenciaReport {...reportData} /> : null}
      {tipo === "rayador-de-mitas" ? <RayadorMitasReport {...reportData} /> : null}
      {tipo === "resumen-asistencia" ? <ResumenAsistenciaReport {...reportData} /> : null}
      {tipo === "inasistencias" ? <InasistenciasReport {...reportData} /> : null}
      {tipo === "minutos-atrasados" ? <MinutosAtrasadosReport {...reportData} /> : null}
    </section>
  );
}
