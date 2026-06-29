import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileBarChart2, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { getTipoPersonalLabel, useEmployees } from "@/modules/employee/hooks/useEmployees";
import type { EmployeeTipoPersonal } from "@/modules/employee/db/employee.db";
import { httpClient } from "@/shared/api/core/httpClient";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    desde: formatDateInputValue(firstDay),
    hasta: formatDateInputValue(today)
  };
}

interface AttendanceReportRow {
  id: number | string;
  fecha: string;
  tipo: string;
  deviceUserId?: string;
  empleado?: { nombre: string; tipoPersonal?: EmployeeTipoPersonal | null } | null;
}

export function PersonalReportsPage() {
  const { showError, showSuccess } = useToast();
  const employees = useEmployees();
  const queryClient = useQueryClient();
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [reportDesde, setReportDesde] = useState(defaultRange.desde);
  const [reportHasta, setReportHasta] = useState(defaultRange.hasta);
  const [employeeLocalSearch, setEmployeeLocalSearch] = useState("");
  const [reportTipo, setReportTipo] = useState("");
  const [reportPage, setReportPage] = useState(1);
  const [reportLimit] = useState(150);
  const isEmployeeSearchActive = employeeLocalSearch.trim().length > 0;

  const attendanceReportQuery = useQuery({
    queryKey: ["employee-attendance-report", reportDesde, reportHasta, reportTipo, reportPage, reportLimit, isEmployeeSearchActive],
    queryFn: async () => {
      if (isEmployeeSearchActive) {
        const allRows: AttendanceReportRow[] = [];
        let page = 1;
        let totalPagesFromApi = 1;

        do {
          const response = await httpClient.get("/api/biometric/attendance", {
            params: {
              page,
              limit: reportLimit,
              desde: reportDesde || undefined,
              hasta: reportHasta || undefined,
              tipo: reportTipo || undefined
            }
          });
          const payload = response.data as {
            data?: AttendanceReportRow[];
            meta?: { total?: number; page?: number; totalPages?: number };
          };
          allRows.push(...(payload.data ?? []));
          totalPagesFromApi = Math.max(1, payload.meta?.totalPages ?? 1);
          page += 1;
        } while (page <= totalPagesFromApi);

        return { data: allRows, meta: { total: allRows.length, page: 1, totalPages: 1 } };
      }

      const response = await httpClient.get("/api/biometric/attendance", {
        params: {
          page: reportPage,
          limit: reportLimit,
          desde: reportDesde || undefined,
          hasta: reportHasta || undefined,
          tipo: reportTipo || undefined
        }
      });
      const payload = response.data as {
        data?: AttendanceReportRow[];
        meta?: { total?: number; page?: number; totalPages?: number };
      };
      return { data: payload.data ?? [], meta: payload.meta ?? { total: 0, page: 1, totalPages: 1 } };
    }
  });

  const locallyFilteredRows = useMemo(() => {
    const rows = attendanceReportQuery.data?.data ?? [];
    const query = employeeLocalSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      `${row.empleado?.nombre ?? ""} ${row.deviceUserId ?? ""} ${getTipoPersonalLabel(row.empleado?.tipoPersonal)}`.toLowerCase().includes(query)
    );
  }, [attendanceReportQuery.data?.data, employeeLocalSearch]);
  const totalPages = useMemo(
    () => (isEmployeeSearchActive ? 1 : Math.max(1, attendanceReportQuery.data?.meta.totalPages ?? 1)),
    [attendanceReportQuery.data?.meta.totalPages, isEmployeeSearchActive]
  );
  const totalRecords = useMemo(
    () => (isEmployeeSearchActive ? locallyFilteredRows.length : attendanceReportQuery.data?.meta.total ?? 0),
    [attendanceReportQuery.data?.meta.total, isEmployeeSearchActive, locallyFilteredRows.length]
  );
  const syncAttendanceMutation = useMutation({
    mutationFn: async () => {
      await httpClient.post("/api/biometric/sync-attendance");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employee-attendance-report"] });
      await employees.refreshAttendance();
      showSuccess("Sincronización de marcaciones ejecutada.");
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : "No se pudo sincronizar marcaciones.");
    }
  });

  function splitRawDateTime(value: string) {
    if (!value.includes("T")) {
      return { fecha: value, hora: "-" };
    }
    const [fechaPart, timePartRaw] = value.split("T");
    const horaPart = (timePartRaw ?? "").split(".")[0]?.replace("Z", "") ?? "-";
    return {
      fecha: fechaPart || value,
      hora: horaPart || "-"
    };
  }

  async function handleExportExcel() {
    try {
      const allRows: AttendanceReportRow[] = [];
      let page = 1;
      let totalPagesFromApi = 1;

      do {
        const response = await httpClient.get("/api/biometric/attendance", {
          params: {
            page,
            limit: reportLimit,
            desde: reportDesde || undefined,
            hasta: reportHasta || undefined,
            tipo: reportTipo || undefined
          }
        });
        const payload = response.data as {
          data?: AttendanceReportRow[];
          meta?: { totalPages?: number };
        };
        allRows.push(...(payload.data ?? []));
        totalPagesFromApi = Math.max(1, payload.meta?.totalPages ?? 1);
        page += 1;
      } while (page <= totalPagesFromApi);

      const query = employeeLocalSearch.trim().toLowerCase();
      const locallyFiltered = !query
        ? allRows
        : allRows.filter((row) =>
            `${row.empleado?.nombre ?? ""} ${row.deviceUserId ?? ""}`.toLowerCase().includes(query)
          );

      const rows = locallyFiltered.map((item) => {
        const { fecha, hora } = splitRawDateTime(item.fecha);
        return {
          Fecha: fecha,
          Hora: hora,
          Tipo: item.tipo,
          Empleado: item.empleado?.nombre ?? "-",
          "Tipo personal": getTipoPersonalLabel(item.empleado?.tipoPersonal),
          "Device User ID": item.deviceUserId ?? "-"
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "asistencia");
      XLSX.writeFile(wb, `asistencia-personal-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showSuccess(`Excel generado con ${rows.length} registros.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo exportar asistencia.");
    }
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton to="/personal" label="Volver a Personal" />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/16 p-2.5 text-[var(--color-primary)]"><FileBarChart2 size={18} /></div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">Reportes de Personal</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Asistencia con filtros y paginación.</p>
          </div>
          <button
            type="button"
            onClick={() => syncAttendanceMutation.mutate()}
            disabled={syncAttendanceMutation.isPending}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)]/14 px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] disabled:opacity-60"
          >
            <RefreshCw size={16} />
            {syncAttendanceMutation.isPending ? "Sincronizando..." : "Traer marcaciones biométrico"}
          </button>
          <button
            type="button"
            onClick={() => void handleExportExcel()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)]"
          >
            Exportar Excel
          </button>
        </div>
      </header>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl">
        <div className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-2">
          <span className="rounded-full bg-[var(--color-primary)]/12 px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)]">Registros totales: {totalRecords}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
          <input type="date" value={reportDesde} onChange={(e) => { setReportDesde(e.target.value); setReportPage(1); }} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs" />
          <input type="date" value={reportHasta} onChange={(e) => { setReportHasta(e.target.value); setReportPage(1); }} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs" />
          <input
            value={employeeLocalSearch}
            onChange={(e) => {
              setEmployeeLocalSearch(e.target.value);
              setReportPage(1);
            }}
            placeholder="Buscar empleado o tipo (filtro local)"
            className="w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs"
          />
          <select value={reportTipo} onChange={(e) => { setReportTipo(e.target.value); setReportPage(1); }} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs">
            <option value="">Todos los tipos</option>
            <option value="ENTRADA">ENTRADA</option>
            <option value="SALIDA">SALIDA</option>
            <option value="DESCANSO_OUT">DESCANSO_OUT</option>
            <option value="DESCANSO_IN">DESCANSO_IN</option>
            <option value="EXTRA_IN">EXTRA_IN</option>
            <option value="EXTRA_OUT">EXTRA_OUT</option>
          </select>
        </div>
        <div className="table-scroll max-h-[420px] overflow-auto px-4 pb-4">
          <table className="w-full border-collapse text-left">
            <thead><tr><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Fecha</th><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Hora</th><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Tipo</th><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Empleado</th><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Tipo personal</th><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Device User ID</th></tr></thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {attendanceReportQuery.isLoading ? <tr><td colSpan={6} className="px-3 py-4 text-center text-xs text-[var(--color-on-surface-variant)]">Cargando reporte...</td></tr> : null}
              {!attendanceReportQuery.isLoading && locallyFilteredRows.length === 0 ? <tr><td colSpan={6} className="px-3 py-4 text-center text-xs text-[var(--color-on-surface-variant)]">Sin registros para esos filtros.</td></tr> : null}
              {locallyFilteredRows.map((item) => {
                const { fecha, hora } = splitRawDateTime(item.fecha);
                return <tr key={String(item.id)} className="hover:bg-[var(--color-surface-container-high)]/60"><td className="px-3 py-2 text-xs font-mono">{fecha}</td><td className="px-3 py-2 text-xs font-mono">{hora}</td><td className="px-3 py-2 text-xs"><span className="rounded-full bg-[var(--color-tertiary)]/12 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-tertiary)]">{item.tipo}</span></td><td className="px-3 py-2 text-xs">{item.empleado?.nombre ?? "-"}</td><td className="px-3 py-2 text-xs">{getTipoPersonalLabel(item.empleado?.tipoPersonal)}</td><td className="px-3 py-2 text-xs font-mono">{item.deviceUserId ?? "-"}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]/55 px-5 py-3">
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            {isEmployeeSearchActive
              ? `Busqueda por empleado: ${locallyFilteredRows.length} registros del rango`
              : `Pagina ${reportPage} de ${totalPages} | Mostrando: ${locallyFilteredRows.length}`}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setReportPage((current) => (current > 1 ? current - 1 : current))} disabled={reportPage <= 1} className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => setReportPage((current) => (current < totalPages ? current + 1 : current))} disabled={reportPage >= totalPages} className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        </div>
      </article>
    </section>
  );
}
