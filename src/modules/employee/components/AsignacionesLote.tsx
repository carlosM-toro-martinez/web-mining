import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Search, Trash2, UserCheck, X } from "lucide-react";
import { usePermisos } from "@/features/auth/hooks/usePermisos";
import { mensajeDeError } from "@/shared/api/core/apiError";
import { httpClient } from "@/shared/api/core/httpClient";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { getTipoPersonalLabel, tipoPersonalOptions } from "@/modules/employee/hooks/useEmployees";
import type { EmployeeTipoPersonal } from "@/modules/employee/db/employee.db";
import {
  invalidarHorariosYAsignaciones,
  useEstadoAsignacionesQuery,
  type EmpleadoAsignacion,
  type Horario
} from "@/modules/employee/hooks/usePersonalHorarios";
import { formatDateInputValue, formatFechaCorta } from "@/modules/employee/lib/asistenciaReport";

interface ResultadoAsignacion {
  horario: { id: number; nombre: string };
  asignados: number;
  omitidos: Array<{ employeeId: number; nombre: string | null; motivo: string }>;
}

interface ResultadoQuitar {
  asignacionesEliminadas: number;
  trabajadoresAfectados: number;
  trabajadoresSinAsignacion: number;
}

type Vista = "SIN_HORARIO" | "CON_HORARIO" | "TODOS";

interface AsignacionesLoteProps {
  horarios: Horario[];
  // Si se pasa, cada fila muestra un botón "Historial" (página de Asignaciones)
  onVerHistorial?: (empleado: EmpleadoAsignacion) => void;
  historialActivoId?: number | null;
  // Permite a la página filtrar el panel por un horario (nonce distinto = nueva orden)
  filtroExterno?: { horarioId: string; nonce: number } | null;
}

const SIN_EMPLEADOS: EmpleadoAsignacion[] = [];

const inputClass =
  "rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm outline-none transition focus:border-[var(--color-primary)]";
const labelClass = "mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]";
const thClass = "px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]";

function resumenNombres(lista: EmpleadoAsignacion[], max = 6) {
  const nombres = lista.slice(0, max).map((e) => e.nombre);
  const resto = lista.length - nombres.length;
  return resto > 0 ? `${nombres.join(", ")} y ${resto} más` : nombres.join(", ");
}

// Trabajadores con su horario vigente, filtrables por tipo, por si tienen o no
// horario y por horario concreto, con acciones en lote (asignar / quitar).
export function AsignacionesLote({ horarios, onVerHistorial, historialActivoId, filtroExterno }: AsignacionesLoteProps) {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermisos();
  const puedeAsignar = can("personal.asignaciones", "crear");
  const puedeQuitar = can("personal.asignaciones", "eliminar");

  const [vista, setVista] = useState<Vista>("SIN_HORARIO");
  const [tipoFiltro, setTipoFiltro] = useState<"" | EmployeeTipoPersonal>("");
  const [horarioFiltro, setHorarioFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [horarioId, setHorarioId] = useState("");
  const [desde, setDesde] = useState(() => formatDateInputValue(new Date()));
  const [dialogo, setDialogo] = useState<null | "asignar" | "quitar">(null);
  const [incluirHistorial, setIncluirHistorial] = useState(false);

  const panelRef = useRef<HTMLElement | null>(null);
  const vistaInicializada = useRef(false);

  const estadoQuery = useEstadoAsignacionesQuery();
  const empleados = estadoQuery.data ?? SIN_EMPLEADOS;
  const horariosActivos = useMemo(() => horarios.filter((h) => h.activo), [horarios]);

  // Al cargar por primera vez: si nadie está sin horario, mostrar a todos.
  useEffect(() => {
    if (vistaInicializada.current || !estadoQuery.data) return;
    vistaInicializada.current = true;
    if (estadoQuery.data.every((e) => e.horarioActual)) setVista("TODOS");
  }, [estadoQuery.data]);

  // La página puede pedir filtrar por un horario (ej. "ver trabajadores" desde la tabla de horarios)
  useEffect(() => {
    if (!filtroExterno) return;
    setHorarioFiltro(filtroExterno.horarioId);
    setVista("TODOS");
    setTipoFiltro("");
    setBusqueda("");
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [filtroExterno]);

  // Base: tipo de trabajador + búsqueda. Los contadores de las pestañas y del
  // selector de horario se calculan sobre esta base.
  const base = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    return empleados.filter((empleado) => {
      if (tipoFiltro && empleado.tipoPersonal !== tipoFiltro) return false;
      if (!query) return true;
      return `${empleado.nombre} ${empleado.documento ?? ""} ${empleado.cargo ?? ""}`.toLowerCase().includes(query);
    });
  }, [empleados, tipoFiltro, busqueda]);

  const conteos = useMemo(() => {
    const sin = base.filter((e) => !e.horarioActual).length;
    const porHorario = new Map<number, number>();
    for (const empleado of base) {
      if (empleado.horarioActual) {
        porHorario.set(empleado.horarioActual.horarioId, (porHorario.get(empleado.horarioActual.horarioId) ?? 0) + 1);
      }
    }
    return { todos: base.length, sin, con: base.length - sin, porHorario };
  }, [base]);

  const visibles = useMemo(
    () =>
      base.filter((empleado) => {
        if (vista === "SIN_HORARIO" && empleado.horarioActual) return false;
        if (vista === "CON_HORARIO" && !empleado.horarioActual) return false;
        if (horarioFiltro && String(empleado.horarioActual?.horarioId ?? "") !== horarioFiltro) return false;
        return true;
      }),
    [base, vista, horarioFiltro]
  );

  // Lo seleccionado siempre es lo que se ve: al cambiar un filtro, se
  // deselecciona lo que quedó oculto (así una acción en lote nunca toca a
  // alguien que no está en pantalla).
  useEffect(() => {
    const idsVisibles = new Set(visibles.map((e) => e.id));
    setSeleccion((prev) => {
      const next = new Set([...prev].filter((id) => idsVisibles.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibles]);

  const seleccionados = useMemo(() => visibles.filter((e) => seleccion.has(e.id)), [visibles, seleccion]);
  const conHorarioSel = seleccionados.filter((e) => e.horarioActual);
  const sinHorarioSel = seleccionados.length - conHorarioSel.length;
  // Seleccionados con asignaciones anteriores (historial) además de la vigente
  const conHistorialSel = seleccionados.filter((e) => e.totalAsignaciones > (e.horarioActual ? 1 : 0));
  const todosMarcados = visibles.length > 0 && visibles.every((e) => seleccion.has(e.id));
  const hayFiltros = vista !== "TODOS" || tipoFiltro !== "" || horarioFiltro !== "" || busqueda !== "";

  function toggleEmpleado(id: number) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisibles() {
    setSeleccion(todosMarcados ? new Set() : new Set(visibles.map((e) => e.id)));
  }

  function limpiarFiltros() {
    setVista("TODOS");
    setTipoFiltro("");
    setHorarioFiltro("");
    setBusqueda("");
  }

  function elegirVista(next: Vista) {
    setVista(next);
    // "Sin horario" y "filtrar por un horario" se excluyen entre sí
    if (next === "SIN_HORARIO") setHorarioFiltro("");
  }

  function elegirHorarioFiltro(value: string) {
    setHorarioFiltro(value);
    if (value && vista === "SIN_HORARIO") setVista("TODOS");
  }

  const asignarMutation = useMutation({
    mutationFn: async () => {
      const response = await httpClient.post("/api/personal/asignaciones/bulk", {
        employeeIds: seleccionados.map((e) => e.id),
        horarioId: Number(horarioId),
        desde
      });
      return (response.data as { data: ResultadoAsignacion }).data;
    },
    onSuccess: async (resultado) => {
      await invalidarHorariosYAsignaciones(queryClient);
      setSeleccion(new Set());
      setDialogo(null);
      const detalle = resultado.omitidos.map((o) => `${o.nombre ?? `#${o.employeeId}`} (${o.motivo})`).join("; ");
      if (resultado.asignados > 0) {
        showSuccess(
          `Horario "${resultado.horario.nombre}" asignado a ${resultado.asignados} trabajador(es)` +
            (resultado.omitidos.length > 0 ? `. ${resultado.omitidos.length} omitido(s): ${detalle}.` : ".")
        );
      } else {
        showError(`No se asignó a nadie. ${detalle}`);
      }
    },
    onError: (error) => showError(mensajeDeError(error, "No se pudo asignar el horario."))
  });

  const quitarMutation = useMutation({
    mutationFn: async () => {
      const response = await httpClient.post("/api/personal/asignaciones/bulk-delete", {
        employeeIds: seleccionados.map((e) => e.id),
        incluirHistorial
      });
      return (response.data as { data: ResultadoQuitar }).data;
    },
    onSuccess: async (resultado) => {
      await invalidarHorariosYAsignaciones(queryClient);
      setSeleccion(new Set());
      setDialogo(null);
      setIncluirHistorial(false);
      showSuccess(
        `Se eliminaron ${resultado.asignacionesEliminadas} asignación(es) de ${resultado.trabajadoresAfectados} trabajador(es)` +
          (resultado.trabajadoresSinAsignacion > 0 ? `; ${resultado.trabajadoresSinAsignacion} no tenían asignación.` : ".")
      );
    },
    onError: (error) => showError(mensajeDeError(error, "No se pudo quitar el horario."))
  });

  const horarioElegido = horariosActivos.find((h) => String(h.id) === horarioId);

  function cerrarDialogo() {
    setDialogo(null);
    setIncluirHistorial(false);
  }

  const tabs: Array<{ value: Vista; label: string; count: number }> = [
    { value: "SIN_HORARIO", label: "Sin horario", count: conteos.sin },
    { value: "CON_HORARIO", label: "Con horario", count: conteos.con },
    { value: "TODOS", label: "Todos", count: conteos.todos }
  ];

  const quitarSinEfecto = conHorarioSel.length === 0 && !(incluirHistorial && conHistorialSel.length > 0);

  return (
    <article ref={panelRef} className="scroll-mt-4 overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
      <div className="border-b border-[var(--color-border-soft)] px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2 text-[var(--color-primary)]">
            <UserCheck size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold">Trabajadores y horarios</h2>
            <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
              Filtra por tipo, por si tienen horario o por un horario concreto; marca las casillas y asigna o quita el
              horario a todos de una vez.
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => elegirVista(tab.value)}
                className={`px-3.5 py-2 text-xs font-semibold transition ${
                  vista === tab.value
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                    : "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
                }`}
              >
                {tab.label}{" "}
                <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${vista === tab.value ? "bg-white/20" : "bg-[var(--color-surface-container-highest)]"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as "" | EmployeeTipoPersonal)}
            className={`${inputClass} text-xs`}
            aria-label="Tipo de trabajador"
          >
            <option value="">Todo tipo de trabajador</option>
            {tipoPersonalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={horarioFiltro}
            onChange={(e) => elegirHorarioFiltro(e.target.value)}
            className={`${inputClass} max-w-[260px] text-xs`}
            aria-label="Filtrar por horario"
          >
            <option value="">Cualquier horario</option>
            {horarios.map((h) => (
              <option key={h.id} value={String(h.id)}>
                {h.nombre} ({h.horaEntrada}-{h.horaSalida}) · {conteos.porHorario.get(h.id) ?? 0}
              </option>
            ))}
          </select>

          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar nombre, documento o cargo"
              className={`${inputClass} w-full pl-9 text-xs`}
            />
          </div>

          {hayFiltros ? (
            <button type="button" onClick={limpiarFiltros} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10">
              <X size={13} /> Limpiar filtros
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabla */}
      <div className="max-h-[460px] overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[var(--color-surface-container-high)]">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={todosMarcados}
                  onChange={toggleVisibles}
                  disabled={visibles.length === 0}
                  aria-label="Marcar todos los visibles"
                />
              </th>
              <th className={thClass}>Trabajador</th>
              <th className={thClass}>Cargo</th>
              <th className={thClass}>Tipo</th>
              <th className={thClass}>Horario actual</th>
              {onVerHistorial ? <th className={`${thClass} text-right`}>Historial</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-soft)]">
            {estadoQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">Cargando trabajadores...</td>
              </tr>
            ) : null}
            {estadoQuery.isError ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-red-600">No se pudo cargar la lista de trabajadores.</td>
              </tr>
            ) : null}
            {!estadoQuery.isLoading && !estadoQuery.isError && visibles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
                  {vista === "SIN_HORARIO" && !busqueda && !tipoFiltro
                    ? "Todos los trabajadores activos tienen horario asignado."
                    : "Ningún trabajador coincide con los filtros."}
                </td>
              </tr>
            ) : null}
            {visibles.map((empleado) => {
              const marcado = seleccion.has(empleado.id);
              return (
                <tr
                  key={empleado.id}
                  onClick={() => toggleEmpleado(empleado.id)}
                  className={`cursor-pointer transition hover:bg-[var(--color-surface-container-high)]/60 ${marcado ? "bg-[var(--color-primary)]/8" : ""} ${historialActivoId === empleado.id ? "outline outline-1 -outline-offset-1 outline-[var(--color-primary)]/60" : ""}`}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={marcado} onChange={() => toggleEmpleado(empleado.id)} aria-label={`Marcar a ${empleado.nombre}`} />
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold">{empleado.nombre}</p>
                    {empleado.documento ? <p className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">{empleado.documento}</p> : null}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{empleado.cargo ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-[var(--color-tertiary)]/12 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-tertiary)]">
                      {getTipoPersonalLabel(empleado.tipoPersonal)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {empleado.horarioActual ? (
                      <div>
                        <p className="font-semibold">{empleado.horarioActual.nombre}</p>
                        <p className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">
                          {empleado.horarioActual.horaEntrada}-{empleado.horarioActual.horaSalida} · desde {formatFechaCorta(empleado.horarioActual.desde.slice(0, 10))}
                        </p>
                      </div>
                    ) : (
                      <span className="rounded-full bg-amber-500/14 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">Sin horario</span>
                    )}
                  </td>
                  {onVerHistorial ? (
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onVerHistorial(empleado)}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      >
                        <History size={12} />
                        {empleado.totalAsignaciones}
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]/55 px-5 py-2 text-xs text-[var(--color-on-surface-variant)]">
        <span>
          Mostrando {visibles.length} de {empleados.length} trabajadores activos
        </span>
        <span className="font-semibold text-[var(--color-on-surface)]">
          {seleccionados.length} seleccionado(s)
          {seleccionados.length > 0 ? (
            <button type="button" onClick={() => setSeleccion(new Set())} className="ml-2 font-normal text-[var(--color-primary)] underline">
              limpiar
            </button>
          ) : null}
        </span>
      </div>

      {/* Acciones en lote */}
      {puedeAsignar || puedeQuitar ? (
        <div className="flex flex-wrap items-end gap-3 border-t border-[var(--color-border-soft)] px-5 py-4">
          {puedeAsignar ? (
            <>
              <label className="min-w-[220px] flex-1 text-xs sm:flex-none">
                <span className={labelClass}>Asignar horario</span>
                <select value={horarioId} onChange={(e) => setHorarioId(e.target.value)} className={`${inputClass} w-full`}>
                  <option value="">Seleccionar horario</option>
                  {horariosActivos.map((h) => (
                    <option key={h.id} value={String(h.id)}>
                      {h.nombre} ({h.horaEntrada}-{h.horaSalida})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <span className={labelClass}>Desde</span>
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClass} />
              </label>
              <button
                type="button"
                onClick={() => setDialogo("asignar")}
                disabled={seleccionados.length === 0 || !horarioId || !desde}
                className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Asignar{seleccionados.length > 0 ? ` (${seleccionados.length})` : ""}
              </button>
            </>
          ) : null}
          {puedeQuitar ? (
            <button
              type="button"
              onClick={() => setDialogo("quitar")}
              disabled={seleccionados.length === 0}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-red-500/50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={14} />
              Quitar horario{seleccionados.length > 0 ? ` (${seleccionados.length})` : ""}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Confirmar: asignar */}
      <ConfirmDialog
        open={dialogo === "asignar"}
        title="Asignar horario"
        confirmLabel="Sí, asignar horario"
        isLoading={asignarMutation.isPending}
        onCancel={cerrarDialogo}
        onConfirm={() => void asignarMutation.mutateAsync()}
      >
        <p>
          Se asignará el horario <b>{horarioElegido?.nombre}</b> ({horarioElegido?.horaEntrada}-{horarioElegido?.horaSalida}) desde el{" "}
          <b>{formatFechaCorta(desde)}</b> a <b>{seleccionados.length}</b> trabajador(es).
        </p>
        <p className="text-xs text-[var(--color-on-surface-variant)]">{resumenNombres(seleccionados)}</p>
        {conHorarioSel.length > 0 ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            {conHorarioSel.length} de ellos ya tienen un horario: se cerrará el actual en esa fecha y empezará el nuevo.
          </div>
        ) : null}
      </ConfirmDialog>

      {/* Confirmar: quitar */}
      <ConfirmDialog
        open={dialogo === "quitar"}
        title="¿Quitar el horario?"
        tone="danger"
        confirmLabel="Sí, quitar horario"
        confirmDisabled={quitarSinEfecto}
        isLoading={quitarMutation.isPending}
        onCancel={cerrarDialogo}
        onConfirm={() => void quitarMutation.mutateAsync()}
      >
        <p>
          Seleccionaste <b>{seleccionados.length}</b> trabajador(es):
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            <b>{conHorarioSel.length}</b> tienen horario vigente: se eliminará esa asignación y quedarán sin horario.
          </li>
          {sinHorarioSel > 0 ? (
            <li>
              <b>{sinHorarioSel}</b> no tienen horario vigente: no se hace nada con ellos.
            </li>
          ) : null}
        </ul>
        <p className="text-xs text-[var(--color-on-surface-variant)]">{resumenNombres(seleccionados)}</p>

        {conHistorialSel.length > 0 ? (
          <label className="flex items-start gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-xs">
            <input type="checkbox" className="mt-0.5" checked={incluirHistorial} onChange={(e) => setIncluirHistorial(e.target.checked)} />
            <span>
              Eliminar <b>también el historial</b> de asignaciones anteriores ({conHistorialSel.length} de los seleccionados tienen).
              Sin esto, el historial se conserva.
            </span>
          </label>
        ) : null}

        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700">
          Los reportes de asistencia de los días cubiertos por las asignaciones eliminadas mostrarán «sin horario».
          Esta acción no se puede deshacer.
        </div>
        {quitarSinEfecto ? (
          <p className="text-xs font-semibold text-amber-700">Ninguno de los seleccionados tiene un horario vigente que quitar.</p>
        ) : null}
      </ConfirmDialog>
    </article>
  );
}
