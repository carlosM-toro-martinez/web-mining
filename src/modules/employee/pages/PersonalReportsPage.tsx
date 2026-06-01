import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileBarChart2, RefreshCw } from "lucide-react";
import { useEmployees } from "@/modules/employee/hooks/useEmployees";
import { httpClient } from "@/shared/api/core/httpClient";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

export function PersonalReportsPage() {
  const { showError, showSuccess } = useToast();
  const employees = useEmployees();
  const queryClient = useQueryClient();
  const [reportDesde, setReportDesde] = useState("");
  const [reportHasta, setReportHasta] = useState("");
  const [reportEmpleadoId, setReportEmpleadoId] = useState("");
  const [reportTipo, setReportTipo] = useState("");
  const [reportPage, setReportPage] = useState(1);
  const [reportLimit] = useState(150);

  const attendanceReportQuery = useQuery({
    queryKey: ["employee-attendance-report", reportDesde, reportHasta, reportEmpleadoId, reportTipo, reportPage, reportLimit],
    queryFn: async () => {
      const response = await httpClient.get("/api/biometric/attendance", {
        params: {
          page: reportPage,
          limit: reportLimit,
          desde: reportDesde || undefined,
          hasta: reportHasta || undefined,
          empleadoId: reportEmpleadoId || undefined,
          tipo: reportTipo || undefined
        }
      });
      const payload = response.data as {
        data?: Array<{ id: number | string; fecha: string; tipo: string; deviceUserId?: string; empleado?: { nombre: string } | null }>;
        meta?: { total?: number; page?: number; totalPages?: number };
      };
      return { data: payload.data ?? [], meta: payload.meta ?? { total: 0, page: 1, totalPages: 1 } };
    }
  });

  const totalPages = useMemo(() => Math.max(1, attendanceReportQuery.data?.meta.totalPages ?? 1), [attendanceReportQuery.data]);
  const totalRecords = useMemo(() => attendanceReportQuery.data?.meta.total ?? 0, [attendanceReportQuery.data]);
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
        </div>
      </header>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl">
        <div className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-2">
          <span className="text-xs text-[var(--color-on-surface-variant)]">Registros totales: {totalRecords}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
          <input type="date" value={reportDesde} onChange={(e) => { setReportDesde(e.target.value); setReportPage(1); }} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs" />
          <input type="date" value={reportHasta} onChange={(e) => { setReportHasta(e.target.value); setReportPage(1); }} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs" />
          <select value={reportEmpleadoId} onChange={(e) => { setReportEmpleadoId(e.target.value); setReportPage(1); }} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs">
            <option value="">Todos los empleados</option>
            {employees.getAll.data.map((employee) => <option key={employee.id} value={employee.id}>{employee.nombre}</option>)}
          </select>
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
            <thead><tr><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Fecha</th><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Tipo</th><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Empleado</th><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Device User ID</th></tr></thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {attendanceReportQuery.isLoading ? <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-[var(--color-on-surface-variant)]">Cargando reporte...</td></tr> : null}
              {!attendanceReportQuery.isLoading && attendanceReportQuery.data?.data.length === 0 ? <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-[var(--color-on-surface-variant)]">Sin registros para esos filtros.</td></tr> : null}
              {attendanceReportQuery.data?.data.map((item) => <tr key={String(item.id)}><td className="px-3 py-2 text-xs font-mono">{item.fecha}</td><td className="px-3 py-2 text-xs">{item.tipo}</td><td className="px-3 py-2 text-xs">{item.empleado?.nombre ?? "-"}</td><td className="px-3 py-2 text-xs font-mono">{item.deviceUserId ?? "-"}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]/55 px-5 py-3">
          <span className="text-xs text-[var(--color-on-surface-variant)]">{`Pagina ${reportPage} de ${totalPages}`}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setReportPage((current) => (current > 1 ? current - 1 : current))} disabled={reportPage <= 1} className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => setReportPage((current) => (current < totalPages ? current + 1 : current))} disabled={reportPage >= totalPages} className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        </div>
      </article>
    </section>
  );
}
