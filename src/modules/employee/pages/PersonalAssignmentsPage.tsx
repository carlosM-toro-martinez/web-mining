import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { getTipoPersonalLabel, useEmployees } from "@/modules/employee/hooks/useEmployees";
import { httpClient } from "@/shared/api/core/httpClient";
import { useToast } from "@/shared/ui/toast/ToastProvider";

interface HorarioOption {
  id: number;
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
}

interface AssignmentItem {
  id: number;
  desde: string;
  hasta?: string | null;
  horario: HorarioOption;
}

export function PersonalAssignmentsPage() {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const employees = useEmployees();
  const [employeeId, setEmployeeId] = useState("");
  const [horarioId, setHorarioId] = useState("");
  const [desde, setDesde] = useState("");

  const horariosQuery = useQuery({
    queryKey: ["personal-horarios-options"],
    queryFn: async () => {
      const response = await httpClient.get("/api/personal/horarios");
      const payload = response.data as { data?: HorarioOption[] };
      return payload.data ?? [];
    }
  });

  const historialQuery = useQuery({
    queryKey: ["personal-horarios-historial", employeeId],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      const response = await httpClient.get(`/api/personal/empleados/${employeeId}/horarios`);
      const payload = response.data as { data?: AssignmentItem[] };
      return payload.data ?? [];
    }
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      await httpClient.post("/api/personal/asignaciones", {
        employeeId: Number(employeeId),
        horarioId: Number(horarioId),
        desde
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["personal-horarios-historial", employeeId] });
      showSuccess("Horario asignado.");
    },
    onError: (error) => showError(error instanceof Error ? error.message : "No se pudo asignar horario.")
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      await httpClient.delete(`/api/personal/asignaciones/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["personal-horarios-historial", employeeId] });
      showSuccess("Asignación eliminada.");
    },
    onError: (error) => showError(error instanceof Error ? error.message : "No se pudo eliminar la asignación.")
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

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4"><SubrouteBackButton to="/personal" label="Volver a Personal" /></div>
        <h1 className="page-title font-headline text-3xl font-extrabold">Asignaciones</h1>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <AutocompleteSelect
            value={employeeId}
            onChange={setEmployeeId}
            options={employeeOptions}
            placeholder="Buscar empleado"
            className="w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm"
          />
          <select value={horarioId} onChange={(e) => setHorarioId(e.target.value)} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm">
            <option value="">Seleccionar horario</option>
            {horariosQuery.data?.map((h) => <option key={h.id} value={h.id}>{h.nombre} ({h.horaEntrada}-{h.horaSalida})</option>)}
          </select>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <button type="button" onClick={() => void assignMutation.mutateAsync()} disabled={!employeeId || !horarioId || !desde || assignMutation.isPending} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">Asignar</button>
        </div>
      </article>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
        <div className="px-5 py-3 text-xs text-[var(--color-on-surface-variant)]">Registros: {historialQuery.data?.length ?? 0}</div>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr><th className="px-4 py-2 text-xs">Horario</th><th className="px-4 py-2 text-xs">Desde</th><th className="px-4 py-2 text-xs">Hasta</th><th className="px-4 py-2 text-right text-xs">Acción</th></tr></thead>
            <tbody>
              {historialQuery.data?.map((item) => (
                <tr key={item.id} className="border-t border-[var(--color-border-soft)]">
                  <td className="px-4 py-2 text-sm">{item.horario.nombre}</td>
                  <td className="px-4 py-2 text-sm font-mono">{item.desde}</td>
                  <td className="px-4 py-2 text-sm font-mono">{item.hasta ?? "-"}</td>
                  <td className="px-4 py-2 text-right"><button type="button" onClick={() => void removeMutation.mutateAsync(item.id)} className="rounded border border-red-500/45 px-2 py-1 text-xs text-red-600">Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
