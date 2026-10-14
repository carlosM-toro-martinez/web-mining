import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import { httpClient } from "@/shared/api/core/httpClient";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { getTipoPersonalLabel, tipoPersonalOptions } from "@/modules/employee/hooks/useEmployees";
import type { EmployeeTipoPersonal } from "@/modules/employee/db/employee.db";
import { formatDateInputValue } from "@/modules/employee/lib/asistenciaReport";

interface EmpleadoAsignacion {
  id: number;
  nombre: string;
  documento?: string | null;
  cargo?: string | null;
  tipoPersonal?: EmployeeTipoPersonal | null;
  horarioActual: {
    asignacionId: number;
    horarioId: number;
    nombre: string;
    horaEntrada: string;
    horaSalida: string;
    desde: string;
  } | null;
}

interface HorarioOpcion {
  id: number;
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  activo: boolean;
}

interface ResultadoMasivo {
  horario: { id: number; nombre: string };
  asignados: number;
  omitidos: Array<{ employeeId: number; nombre: string | null; motivo: string }>;
}

type Vista = "SIN_HORARIO" | "CON_HORARIO" | "TODOS";

const ESTADO_KEY = ["personal-asignaciones-estado"] as const;

const inputClass =
  "rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm";

function errorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { message?: string; error?: unknown } } })?.response?.data;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  return error instanceof Error ? error.message : fallback;
}

// Asigna un horario a varios empleados a la vez: se filtra "sin horario", se
// marcan casillas y se asigna en un solo paso.
export function AsignacionMasivaHorarios({ horarios }: { horarios: HorarioOpcion[] }) {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const [vista, setVista] = useState<Vista>("SIN_HORARIO");
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"" | EmployeeTipoPersonal>("");
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [horarioId, setHorarioId] = useState("");
  const [desde, setDesde] = useState(() => formatDateInputValue(new Date()));

  const estadoQuery = useQuery({
    queryKey: ESTADO_KEY,
    queryFn: async () => {
      const response = await httpClient.get("/api/personal/asignaciones/estado");
      return (response.data as { data?: EmpleadoAsignacion[] }).data ?? [];
    }
  });

  const empleados = estadoQuery.data ?? [];
  const horariosActivos = useMemo(() => horarios.filter((h) => h.activo), [horarios]);
  const sinHorarioTotal = useMemo(() => empleados.filter((e) => !e.horarioActual).length, [empleados]);

  const visibles = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    return empleados.filter((empleado) => {
      if (vista === "SIN_HORARIO" && empleado.horarioActual) return false;
      if (vista === "CON_HORARIO" && !empleado.horarioActual) return false;
      if (tipoFiltro && empleado.tipoPersonal !== tipoFiltro) return false;
      if (!query) return true;
      return `${empleado.nombre} ${empleado.documento ?? ""} ${empleado.cargo ?? ""}`.toLowerCase().includes(query);
    });
  }, [empleados, vista, tipoFiltro, busqueda]);

  // Si la lista se recarga (o alguien deja de ser visible por un filtro), no
  // arrastrar a la selección empleados que ya no existen.
  useEffect(() => {
    const ids = new Set(empleados.map((e) => e.id));
    setSeleccion((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [empleados]);

  const seleccionados = useMemo(() => empleados.filter((e) => seleccion.has(e.id)), [empleados, seleccion]);
  const conHorarioSeleccionados = seleccionados.filter((e) => e.horarioActual).length;
  const todosVisiblesMarcados = visibles.length > 0 && visibles.every((e) => seleccion.has(e.id));

  function toggleEmpleado(id: number) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisibles() {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (todosVisiblesMarcados) {
        for (const empleado of visibles) next.delete(empleado.id);
      } else {
        for (const empleado of visibles) next.add(empleado.id);
      }
      return next;
    });
  }

  const asignarMutation = useMutation({
    mutationFn: async () => {
      const response = await httpClient.post("/api/personal/asignaciones/bulk", {
        employeeIds: [...seleccion],
        horarioId: Number(horarioId),
        desde
      });
      return (response.data as { data: ResultadoMasivo }).data;
    },
    onSuccess: async (resultado) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ESTADO_KEY }),
        queryClient.invalidateQueries({ queryKey: ["personal-horarios"] }),
        queryClient.invalidateQueries({ queryKey: ["personal-horario-detalle"] }),
        queryClient.invalidateQueries({ queryKey: ["personal-horarios-historial"] }),
        queryClient.invalidateQueries({ queryKey: ["personal-reporte"] })
      ]);
      setSeleccion(new Set());
      const omitidos = resultado.omitidos.length;
      if (resultado.asignados > 0) {
        showSuccess(
          `Horario "${resultado.horario.nombre}" asignado a ${resultado.asignados} trabajador(es)` +
            (omitidos > 0 ? `. ${omitidos} omitido(s): ${resultado.omitidos.map((o) => `${o.nombre ?? `#${o.employeeId}`} (${o.motivo})`).join("; ")}.` : ".")
        );
      } else {
        showError(
          `No se asignó a nadie. ${resultado.omitidos.map((o) => `${o.nombre ?? `#${o.employeeId}`}: ${o.motivo}`).join("; ")}`
        );
      }
    },
    onError: (error) => showError(errorMessage(error, "No se pudo asignar el horario."))
  });

  function handleAsignar() {
    const horario = horariosActivos.find((h) => String(h.id) === horarioId);
    if (!horario || seleccion.size === 0 || !desde) return;

    const aviso =
      conHorarioSeleccionados > 0
        ? `\n\n${conHorarioSeleccionados} de ellos ya tienen un horario: se cerrará el actual el ${desde} y empezará el nuevo.`
        : "";
    const confirmado = window.confirm(
      `¿Asignar el horario "${horario.nombre}" (${horario.horaEntrada}-${horario.horaSalida}) a ${seleccion.size} trabajador(es) desde el ${desde}?${aviso}`
    );
    if (!confirmado) return;
    void asignarMutation.mutateAsync();
  }

  const tabs: Array<{ value: Vista; label: string }> = [
    { value: "SIN_HORARIO", label: `Sin horario (${sinHorarioTotal})` },
    { value: "CON_HORARIO", label: `Con horario (${empleados.length - sinHorarioTotal})` },
    { value: "TODOS", label: `Todos (${empleados.length})` }
  ];

  return (
    <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-[var(--color-primary)]/14 p-2 text-[var(--color-primary)]">
          <UserCheck size={16} />
        </div>
        <div>
          <h2 className="text-lg font-bold">Asignar horario a varios trabajadores</h2>
          <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
            Filtra a quienes no tienen horario, márcalos con las casillas y asígnales uno en un solo paso. Si alguien
            ya tiene horario, el actual se cierra en la fecha elegida.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setVista(tab.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              vista === tab.value
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/14 text-[var(--color-primary)]"
                : "border-[var(--color-border-soft)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar nombre / documento / cargo"
          className={`${inputClass} ml-auto min-w-[220px] text-xs`}
        />
        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value as "" | EmployeeTipoPersonal)}
          className={`${inputClass} text-xs`}
        >
          <option value="">Todo tipo</option>
          {tipoPersonalOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 max-h-[420px] overflow-auto rounded-lg border border-[var(--color-border-soft)]">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-[var(--color-surface-container-high)]">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={todosVisiblesMarcados}
                  onChange={toggleVisibles}
                  disabled={visibles.length === 0}
                  aria-label="Marcar todos los visibles"
                />
              </th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Trabajador</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Cargo</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Tipo</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Horario actual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-soft)]">
            {estadoQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">Cargando trabajadores...</td>
              </tr>
            ) : null}
            {estadoQuery.isError ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-red-600">No se pudo cargar la lista de trabajadores.</td>
              </tr>
            ) : null}
            {!estadoQuery.isLoading && !estadoQuery.isError && visibles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                  {vista === "SIN_HORARIO" && !busqueda && !tipoFiltro
                    ? "Todos los trabajadores activos tienen horario asignado."
                    : "Ningún trabajador coincide con el filtro."}
                </td>
              </tr>
            ) : null}
            {visibles.map((empleado) => (
              <tr
                key={empleado.id}
                onClick={() => toggleEmpleado(empleado.id)}
                className={`cursor-pointer hover:bg-[var(--color-surface-container-high)]/60 ${seleccion.has(empleado.id) ? "bg-[var(--color-primary)]/8" : ""}`}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={seleccion.has(empleado.id)}
                    onChange={() => toggleEmpleado(empleado.id)}
                    aria-label={`Marcar a ${empleado.nombre}`}
                  />
                </td>
                <td className="px-3 py-2 text-sm font-semibold">{empleado.nombre}</td>
                <td className="px-3 py-2 text-xs">{empleado.cargo ?? "-"}</td>
                <td className="px-3 py-2 text-xs">{getTipoPersonalLabel(empleado.tipoPersonal)}</td>
                <td className="px-3 py-2 text-xs">
                  {empleado.horarioActual ? (
                    <span>
                      {empleado.horarioActual.nombre}{" "}
                      <span className="font-mono text-[var(--color-on-surface-variant)]">
                        ({empleado.horarioActual.horaEntrada}-{empleado.horarioActual.horaSalida})
                      </span>
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-600">Sin horario</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
        <p className="text-sm font-semibold">
          {seleccion.size} seleccionado(s)
          {seleccion.size > 0 ? (
            <button type="button" onClick={() => setSeleccion(new Set())} className="ml-2 text-xs font-normal text-[var(--color-primary)] underline">
              limpiar
            </button>
          ) : null}
        </p>
        <label className="text-xs">
          <span className="mb-1 block font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Horario</span>
          <select value={horarioId} onChange={(e) => setHorarioId(e.target.value)} className={`${inputClass} min-w-[220px]`}>
            <option value="">Seleccionar horario</option>
            {horariosActivos.map((h) => (
              <option key={h.id} value={String(h.id)}>
                {h.nombre} ({h.horaEntrada}-{h.horaSalida})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Desde</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClass} />
        </label>
        <button
          type="button"
          onClick={handleAsignar}
          disabled={seleccion.size === 0 || !horarioId || !desde || asignarMutation.isPending}
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {asignarMutation.isPending ? "Asignando..." : `Asignar horario${seleccion.size > 0 ? ` (${seleccion.size})` : ""}`}
        </button>
      </div>
    </article>
  );
}
