import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { getTipoPersonalLabel, useEmployees } from "@/modules/employee/hooks/useEmployees";
import type { EmployeeTipoPersonal } from "@/modules/employee/db/employee.db";
import { httpClient } from "@/shared/api/core/httpClient";
import { useToast } from "@/shared/ui/toast/ToastProvider";

interface AbsenceItem {
  id: number;
  tipo: string;
  desde: string;
  hasta: string;
  motivo?: string | null;
  aprobado: boolean;
  creadoPor?: string | null;
  employee?: { id: number; nombre: string; cargo?: string | null; tipoPersonal?: EmployeeTipoPersonal | null } | null;
}

const tipos = ["VACACION", "DESCANSO", "PERMISO", "ENFERMEDAD", "FERIADO", "ABANDONO", "OTRO"];

export function PersonalAbsencesPage() {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const employees = useEmployees();
  const [empleadoId, setEmpleadoId] = useState("");
  const [tipo, setTipo] = useState("VACACION");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [aprobado, setAprobado] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const absencesQuery = useQuery({
    queryKey: ["personal-ausencias", empleadoId, page, limit],
    queryFn: async () => {
      const response = await httpClient.get("/api/personal/ausencias", {
        params: { empleadoId: empleadoId || undefined, page, limit }
      });
      const payload = response.data as { data?: AbsenceItem[]; meta?: { total?: number; totalPages?: number } };
      return { data: payload.data ?? [], meta: payload.meta ?? { total: 0, totalPages: 1 } };
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await httpClient.post("/api/personal/ausencias", {
        employeeId: Number(empleadoId),
        tipo,
        desde,
        hasta,
        motivo: motivo || undefined,
        aprobado
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["personal-ausencias"] });
      showSuccess("Ausencia registrada.");
    },
    onError: (error) => showError(error instanceof Error ? error.message : "No se pudo registrar ausencia.")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await httpClient.delete(`/api/personal/ausencias/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["personal-ausencias"] });
      showSuccess("Ausencia eliminada.");
    },
    onError: (error) => showError(error instanceof Error ? error.message : "No se pudo eliminar ausencia.")
  });

  const employeeOptions = useMemo(
    () =>
      employees.getAll.data.map((employee) => ({
        id: String(employee.remoteId ?? employee.id),
        label: `${employee.nombre} - ${getTipoPersonalLabel(employee.tipoPersonal)}`,
        searchText: `${employee.documento ?? ""} ${employee.cargo ?? ""} ${employee.deviceUserId ?? ""} ${getTipoPersonalLabel(employee.tipoPersonal)}`
      })),
    [employees.getAll.data]
  );

  const totalPages = Math.max(1, absencesQuery.data?.meta.totalPages ?? 1);

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4"><SubrouteBackButton to="/personal" label="Volver a Personal" /></div>
        <h1 className="page-title font-headline text-3xl font-extrabold">Ausencias</h1>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <AutocompleteSelect value={empleadoId} onChange={setEmpleadoId} options={employeeOptions} placeholder="Buscar empleado" className="w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm">{tipos.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo" className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={aprobado} onChange={(e) => setAprobado(e.target.checked)} />Aprobado</label>
          <button type="button" onClick={() => void createMutation.mutateAsync()} disabled={!empleadoId || !desde || !hasta || createMutation.isPending} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">Registrar ausencia</button>
        </div>
      </article>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
        <div className="px-5 py-3 text-xs text-[var(--color-on-surface-variant)]">Registros totales: {absencesQuery.data?.meta.total ?? 0}</div>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr><th className="px-4 py-2 text-xs">Empleado</th><th className="px-4 py-2 text-xs">Tipo</th><th className="px-4 py-2 text-xs">Desde</th><th className="px-4 py-2 text-xs">Hasta</th><th className="px-4 py-2 text-xs">Aprobado</th><th className="px-4 py-2 text-right text-xs">Acción</th></tr></thead>
            <tbody>
              {absencesQuery.data?.data.map((item) => (
                <tr key={item.id} className="border-t border-[var(--color-border-soft)]">
                  <td className="px-4 py-2 text-sm">{item.employee ? `${item.employee.nombre} - ${getTipoPersonalLabel(item.employee.tipoPersonal)}` : "-"}</td>
                  <td className="px-4 py-2 text-sm">{item.tipo}</td>
                  <td className="px-4 py-2 text-sm font-mono">{item.desde}</td>
                  <td className="px-4 py-2 text-sm font-mono">{item.hasta}</td>
                  <td className="px-4 py-2 text-sm">{item.aprobado ? "Sí" : "No"}</td>
                  <td className="px-4 py-2 text-right"><button type="button" onClick={() => void deleteMutation.mutateAsync(item.id)} className="rounded border border-red-500/45 px-2 py-1 text-xs text-red-600">Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]/55 px-5 py-3">
          <span className="text-xs text-[var(--color-on-surface-variant)]">{`Pagina ${page} de ${totalPages}`}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((p) => (p > 1 ? p - 1 : p))} disabled={page <= 1} className="rounded-md bg-[var(--color-surface-container-highest)] px-2 py-1 text-xs disabled:opacity-40">Anterior</button>
            <button type="button" onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))} disabled={page >= totalPages} className="rounded-md bg-[var(--color-surface-container-highest)] px-2 py-1 text-xs disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </article>
    </section>
  );
}
