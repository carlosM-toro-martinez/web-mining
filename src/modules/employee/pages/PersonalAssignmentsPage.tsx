import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Trash2, UserCog } from "lucide-react";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { httpClient } from "@/shared/api/core/httpClient";
import { mensajeDeError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { usePermisos } from "@/features/auth/hooks/usePermisos";
import { AsignacionesLote } from "@/modules/employee/components/AsignacionesLote";
import {
  invalidarHorariosYAsignaciones,
  useEstadoAsignacionesQuery,
  useHorariosQuery,
  type EmpleadoAsignacion,
  type Horario
} from "@/modules/employee/hooks/usePersonalHorarios";
import { formatFechaCorta } from "@/modules/employee/lib/asistenciaReport";

interface AsignacionHistorial {
  id: number;
  desde: string;
  hasta?: string | null;
  horario: { id: number; nombre: string; horaEntrada: string; horaSalida: string };
}

const SIN_HORARIOS: Horario[] = [];
const SIN_EMPLEADOS: EmpleadoAsignacion[] = [];

function StatCard({ label, value, hint, tone = "default" }: { label: string; value: number | string; hint?: string; tone?: "default" | "warn" }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${tone === "warn" ? "border-amber-500/40 bg-amber-500/10" : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]"}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone === "warn" ? "text-amber-600" : ""}`}>{value}</p>
      {hint ? <p className="text-[11px] text-[var(--color-on-surface-variant)]">{hint}</p> : null}
    </div>
  );
}

const fecha = (iso: string) => formatFechaCorta(iso.slice(0, 10));

export function PersonalAssignmentsPage() {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermisos();
  const puedeEliminar = can("personal.asignaciones", "eliminar");

  const horariosQuery = useHorariosQuery();
  const estadoQuery = useEstadoAsignacionesQuery();
  const horarios = horariosQuery.data ?? SIN_HORARIOS;
  const empleados = estadoQuery.data ?? SIN_EMPLEADOS;

  const [focoId, setFocoId] = useState<number | null>(null);
  const [aEliminar, setAEliminar] = useState<AsignacionHistorial | null>(null);

  const foco = useMemo(() => empleados.find((e) => e.id === focoId) ?? null, [empleados, focoId]);
  const sinHorario = empleados.filter((e) => !e.horarioActual).length;

  const historialQuery = useQuery({
    queryKey: ["personal-horarios-historial", focoId],
    enabled: focoId !== null,
    queryFn: async () => {
      const response = await httpClient.get(`/api/personal/empleados/${focoId}/horarios`);
      return (response.data as { data?: AsignacionHistorial[] }).data ?? [];
    }
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id: number) => {
      await httpClient.delete(`/api/personal/asignaciones/${id}`);
    },
    onSuccess: async () => {
      await invalidarHorariosYAsignaciones(queryClient);
      setAEliminar(null);
      showSuccess("Asignación eliminada.");
    },
    onError: (error) => showError(mensajeDeError(error, "No se pudo eliminar la asignación."))
  });

  function verHistorial(empleado: EmpleadoAsignacion) {
    setFocoId(empleado.id);
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4"><SubrouteBackButton to="/personal" label="Volver a Personal" /></div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/16 p-2.5 text-[var(--color-primary)]"><UserCog size={18} /></div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">Asignaciones de horario</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--color-on-surface-variant)]">
              Qué horario tiene cada trabajador. Filtra, marca con las casillas y asigna o quita horarios por lotes;
              con el botón de historial ves todas las asignaciones de un trabajador.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Trabajadores activos" value={empleados.length} />
        <StatCard label="Con horario" value={empleados.length - sinHorario} />
        <StatCard label="Sin horario" value={sinHorario} tone={sinHorario > 0 ? "warn" : "default"} hint={sinHorario > 0 ? "Pendientes de asignar" : "Todos asignados"} />
        <StatCard label="Horarios activos" value={horarios.filter((h) => h.activo).length} hint={`${horarios.length} en total`} />
      </div>

      {horariosQuery.isError ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-700">
          No se pudo cargar la lista de horarios (puede faltar el permiso «Horarios: ver»). Sin ella no se pueden elegir
          horarios para asignar.
        </div>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AsignacionesLote horarios={horarios} onVerHistorial={verHistorial} historialActivoId={focoId} />

        {/* ── Historial del trabajador elegido ───────────────────────── */}
        <aside className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] xl:sticky xl:top-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-border-soft)] px-5 py-4">
            <History size={15} className="text-[var(--color-primary)]" />
            <h2 className="text-base font-bold">Historial</h2>
          </div>
          {!foco ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
              Pulsa el botón <b>historial</b> de un trabajador para ver todas sus asignaciones y poder eliminar alguna.
            </p>
          ) : (
            <div className="px-5 py-4">
              <p className="text-sm font-bold">{foco.nombre}</p>
              <p className="mb-3 text-xs text-[var(--color-on-surface-variant)]">{foco.cargo ?? "Sin cargo"}</p>
              {historialQuery.isLoading ? <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando historial...</p> : null}
              {historialQuery.isError ? <p className="text-sm text-red-600">No se pudo cargar el historial.</p> : null}
              {!historialQuery.isLoading && !historialQuery.isError && (historialQuery.data?.length ?? 0) === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--color-border-soft)] px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                  Este trabajador nunca tuvo un horario asignado.
                </p>
              ) : null}
              <ol className="space-y-2">
                {historialQuery.data?.map((item) => {
                  const vigente = !item.hasta;
                  return (
                    <li key={item.id} className={`rounded-lg border px-3 py-2.5 ${vigente ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/8" : "border-[var(--color-border-soft)]"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">
                            {item.horario.nombre}
                            {vigente ? <span className="ml-2 rounded-full bg-emerald-500/14 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">vigente</span> : null}
                          </p>
                          <p className="font-mono text-[11px] text-[var(--color-on-surface-variant)]">
                            {item.horario.horaEntrada}-{item.horario.horaSalida}
                          </p>
                          <p className="mt-0.5 text-xs">
                            Desde {fecha(item.desde)}
                            {item.hasta ? ` hasta ${fecha(item.hasta)}` : ""}
                          </p>
                        </div>
                        {puedeEliminar ? (
                          <button
                            type="button"
                            onClick={() => setAEliminar(item)}
                            title="Eliminar esta asignación"
                            className="rounded-md border border-red-500/40 p-1.5 text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={aEliminar !== null}
        title="¿Eliminar esta asignación?"
        tone="danger"
        confirmLabel="Sí, eliminar"
        isLoading={eliminarMutation.isPending}
        onCancel={() => setAEliminar(null)}
        onConfirm={() => aEliminar && void eliminarMutation.mutateAsync(aEliminar.id)}
      >
        {aEliminar ? (
          <>
            <p>
              Horario <b>{aEliminar.horario.nombre}</b> ({aEliminar.horario.horaEntrada}-{aEliminar.horario.horaSalida}) de{" "}
              <b>{foco?.nombre}</b>, desde el {fecha(aEliminar.desde)}
              {aEliminar.hasta ? ` hasta el ${fecha(aEliminar.hasta)}` : " (vigente)"}.
            </p>
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700">
              {aEliminar.hasta
                ? "Es una asignación antigua: los reportes de esos días pasados mostrarán «sin horario»."
                : "Es la asignación vigente: el trabajador quedará sin horario y los reportes de esos días mostrarán «sin horario»."}{" "}
              Esta acción no se puede deshacer.
            </div>
          </>
        ) : null}
      </ConfirmDialog>
    </section>
  );
}
