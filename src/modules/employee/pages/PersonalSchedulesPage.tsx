import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { httpClient } from "@/shared/api/core/httpClient";
import { mensajeDeError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { usePermisos } from "@/features/auth/hooks/usePermisos";
import { AsignacionesLote } from "@/modules/employee/components/AsignacionesLote";
import {
  DIAS_SEMANA,
  invalidarHorariosYAsignaciones,
  useEstadoAsignacionesQuery,
  useHorariosQuery,
  type DiaSemanaKey,
  type EmpleadoAsignacion,
  type Horario
} from "@/modules/employee/hooks/usePersonalHorarios";

interface ResultadoEliminar {
  eliminados: Array<{ id: number; nombre: string }>;
  bloqueados: Array<{ id: number; nombre: string; vigentes: number; historial: number; motivo: string }>;
  noEncontrados: number[];
  asignacionesHistorialEliminadas: number;
}

interface FormState {
  nombre: string;
  descripcion: string;
  horaEntrada: string;
  horaSalida: string;
  tolerancia: string;
  activo: boolean;
  dias: Record<DiaSemanaKey, boolean>;
}

const FORM_INICIAL: FormState = {
  nombre: "",
  descripcion: "",
  horaEntrada: "08:00",
  horaSalida: "17:00",
  tolerancia: "15",
  activo: true,
  dias: { lunes: true, martes: true, miercoles: true, jueves: true, viernes: true, sabado: false, domingo: false }
};

const SIN_HORARIOS: Horario[] = [];
const SIN_EMPLEADOS: EmpleadoAsignacion[] = [];

const inputClass =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";
const labelClass = "mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]";
const thClass = "px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]";

function StatCard({ label, value, hint, tone = "default" }: { label: string; value: number | string; hint?: string; tone?: "default" | "warn" }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${tone === "warn" ? "border-amber-500/40 bg-amber-500/10" : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]"}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone === "warn" ? "text-amber-600" : ""}`}>{value}</p>
      {hint ? <p className="text-[11px] text-[var(--color-on-surface-variant)]">{hint}</p> : null}
    </div>
  );
}

export function PersonalSchedulesPage() {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermisos();
  const puedeCrear = can("personal.horarios", "crear");
  const puedeEditar = can("personal.horarios", "editar");
  const puedeEliminar = can("personal.horarios", "eliminar");
  const puedeVerAsignaciones = can("personal.asignaciones", "ver");

  const horariosQuery = useHorariosQuery();
  const estadoQuery = useEstadoAsignacionesQuery(puedeVerAsignaciones);
  const horarios = horariosQuery.data ?? SIN_HORARIOS;
  const empleados = estadoQuery.data ?? SIN_EMPLEADOS;

  const [editing, setEditing] = useState<Horario | null>(null);
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [eliminarIds, setEliminarIds] = useState<number[] | null>(null);
  const [incluirHistorial, setIncluirHistorial] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEliminar | null>(null);
  const [filtroExterno, setFiltroExterno] = useState<{ horarioId: string; nonce: number } | null>(null);
  const formRef = useRef<HTMLElement | null>(null);

  const puedeFormulario = editing ? puedeEditar : puedeCrear;

  // Los horarios visibles según la búsqueda
  const visibles = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    if (!query) return horarios;
    return horarios.filter((h) => `${h.nombre} ${h.descripcion ?? ""}`.toLowerCase().includes(query));
  }, [horarios, busqueda]);

  // La selección nunca incluye horarios que ya no existen o quedaron ocultos por la búsqueda
  useEffect(() => {
    const ids = new Set(visibles.map((h) => h.id));
    setSeleccion((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibles]);

  const todosMarcados = visibles.length > 0 && visibles.every((h) => seleccion.has(h.id));
  const sinHorario = empleados.filter((e) => !e.horarioActual).length;

  function resetForm() {
    setEditing(null);
    setForm(FORM_INICIAL);
  }

  function startEdit(horario: Horario) {
    setEditing(horario);
    setForm({
      nombre: horario.nombre,
      descripcion: horario.descripcion ?? "",
      horaEntrada: horario.horaEntrada,
      horaSalida: horario.horaSalida,
      tolerancia: String(horario.tolerancia),
      activo: horario.activo,
      dias: {
        lunes: horario.lunes, martes: horario.martes, miercoles: horario.miercoles, jueves: horario.jueves,
        viernes: horario.viernes, sabado: horario.sabado, domingo: horario.domingo
      }
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        horaEntrada: form.horaEntrada,
        horaSalida: form.horaSalida,
        tolerancia: Number(form.tolerancia),
        ...form.dias,
        ...(editing ? { activo: form.activo } : {})
      };
      if (editing) {
        await httpClient.put(`/api/personal/horarios/${editing.id}`, payload);
      } else {
        await httpClient.post("/api/personal/horarios", payload);
      }
    },
    onSuccess: async () => {
      await invalidarHorariosYAsignaciones(queryClient);
      showSuccess(editing ? "Horario actualizado." : "Horario creado.");
      resetForm();
    },
    onError: (error) => showError(mensajeDeError(error, "No se pudo guardar el horario."))
  });

  const eliminarMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const response = await httpClient.post("/api/personal/horarios/bulk-delete", { ids, incluirHistorial });
      return (response.data as { data: ResultadoEliminar }).data;
    },
    onSuccess: async (res) => {
      await invalidarHorariosYAsignaciones(queryClient);
      setSeleccion(new Set());
      setEliminarIds(null);
      setIncluirHistorial(false);
      if (editing && res.eliminados.some((h) => h.id === editing.id)) resetForm();
      if (res.bloqueados.length > 0 || res.noEncontrados.length > 0) {
        setResultado(res);
      } else {
        showSuccess(`Se eliminaron ${res.eliminados.length} horario(s).`);
      }
    },
    onError: (error) => showError(mensajeDeError(error, "No se pudo eliminar."))
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (form.horaEntrada >= form.horaSalida) {
      showError("La hora de entrada debe ser anterior a la hora de salida.");
      return;
    }
    void saveMutation.mutateAsync();
  }

  function toggleHorario(id: number) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function pedirEliminar(ids: number[]) {
    setIncluirHistorial(false);
    setEliminarIds(ids);
  }

  // Estado de cada horario del diálogo de eliminación
  const filasEliminar = useMemo(
    () =>
      (eliminarIds ?? [])
        .map((id) => horarios.find((h) => h.id === id))
        .filter((h): h is Horario => Boolean(h))
        .map((h) => {
          const vigentes = h._count?.asignaciones ?? 0;
          const historial = Math.max(0, (h.totalAsignaciones ?? vigentes) - vigentes);
          const estado: "BLOQUEADO" | "HISTORIAL" | "LIBRE" = vigentes > 0 ? "BLOQUEADO" : historial > 0 ? "HISTORIAL" : "LIBRE";
          return { horario: h, vigentes, historial, estado };
        }),
    [eliminarIds, horarios]
  );
  const hayHistorial = filasEliminar.some((f) => f.estado === "HISTORIAL");
  const eliminables = filasEliminar.filter((f) => f.estado === "LIBRE" || (f.estado === "HISTORIAL" && incluirHistorial));
  const bloqueadosCount = filasEliminar.length - eliminables.length;

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4"><SubrouteBackButton to="/personal" label="Volver a Personal" /></div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/16 p-2.5 text-[var(--color-primary)]"><CalendarClock size={18} /></div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">Horarios</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--color-on-surface-variant)]">
              Define los turnos de trabajo y asígnalos al personal, de uno en uno o por lotes.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Horarios" value={horarios.length} hint={`${horarios.filter((h) => h.activo).length} activos`} />
        {puedeVerAsignaciones ? (
          <>
            <StatCard label="Trabajadores activos" value={empleados.length} />
            <StatCard label="Con horario" value={empleados.length - sinHorario} />
            <StatCard label="Sin horario" value={sinHorario} tone={sinHorario > 0 ? "warn" : "default"} hint={sinHorario > 0 ? "Asígnalos abajo" : "Todos asignados"} />
          </>
        ) : null}
      </div>

      <div className={`grid items-start gap-6 ${puedeFormulario ? "xl:grid-cols-[340px_minmax(0,1fr)]" : ""}`}>
        {/* ── Formulario ───────────────────────────────────────────────── */}
        {puedeFormulario ? (
          <article ref={formRef} className="scroll-mt-4 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              {editing ? <Pencil size={15} /> : <Plus size={15} />}
              {editing ? `Editar: ${editing.nombre}` : "Nuevo horario"}
            </h2>
            <form className="mt-4 space-y-3" onSubmit={onSubmit}>
              <label className="block">
                <span className={labelClass}>Nombre</span>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required className={inputClass} placeholder="Ej. Primer turno" />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className={labelClass}>Entrada</span>
                  <input type="time" value={form.horaEntrada} onChange={(e) => setForm({ ...form, horaEntrada: e.target.value })} required className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Salida</span>
                  <input type="time" value={form.horaSalida} onChange={(e) => setForm({ ...form, horaSalida: e.target.value })} required className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Tolerancia</span>
                  <input type="number" min={0} max={120} value={form.tolerancia} onChange={(e) => setForm({ ...form, tolerancia: e.target.value })} className={inputClass} placeholder="min" />
                </label>
              </div>
              <p className="-mt-1 text-[11px] text-[var(--color-on-surface-variant)]">
                La tolerancia son los minutos después de la entrada que no cuentan como retraso.
              </p>
              <label className="block">
                <span className={labelClass}>Descripción (opcional)</span>
                <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className={inputClass} />
              </label>
              <div>
                <span className={labelClass}>Días laborables</span>
                <div className="flex flex-wrap gap-1.5">
                  {DIAS_SEMANA.map((dia) => (
                    <button
                      key={dia.key}
                      type="button"
                      aria-pressed={form.dias[dia.key]}
                      title={dia.largo}
                      onClick={() => setForm({ ...form, dias: { ...form.dias, [dia.key]: !form.dias[dia.key] } })}
                      className={`h-9 w-9 rounded-lg border text-xs font-bold transition ${
                        form.dias[dia.key]
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                          : "border-[var(--color-border-soft)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]"
                      }`}
                    >
                      {dia.corto}
                    </button>
                  ))}
                </div>
              </div>
              {editing ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                  Horario activo
                  <span className="text-[11px] text-[var(--color-on-surface-variant)]">(los inactivos no se pueden asignar)</span>
                </label>
              ) : null}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saveMutation.isPending} className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
                  {saveMutation.isPending ? "Guardando..." : editing ? "Guardar cambios" : "Crear horario"}
                </button>
                {editing ? (
                  <button type="button" onClick={resetForm} className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)]">
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
          </article>
        ) : null}

        {/* ── Tabla de horarios ────────────────────────────────────────── */}
        <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border-soft)] px-5 py-3">
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar horario" className={`${inputClass} pl-9 text-xs`} />
            </div>
            {puedeEliminar && seleccion.size > 0 ? (
              <button
                type="button"
                onClick={() => pedirEliminar([...seleccion])}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10"
              >
                <Trash2 size={13} />
                Eliminar seleccionados ({seleccion.size})
              </button>
            ) : null}
          </div>

          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[var(--color-surface-container-high)]">
                <tr>
                  {puedeEliminar ? (
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={todosMarcados}
                        disabled={visibles.length === 0}
                        onChange={() => setSeleccion(todosMarcados ? new Set() : new Set(visibles.map((h) => h.id)))}
                        aria-label="Marcar todos los horarios"
                      />
                    </th>
                  ) : null}
                  <th className={thClass}>Horario</th>
                  <th className={thClass}>Turno</th>
                  <th className={thClass}>Días</th>
                  <th className={thClass}>Trabajadores</th>
                  <th className={`${thClass} text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {horariosQuery.isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">Cargando horarios...</td></tr>
                ) : null}
                {!horariosQuery.isLoading && visibles.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
                    {horarios.length === 0 ? "Todavía no hay horarios. Crea el primero." : "Ningún horario coincide con la búsqueda."}
                  </td></tr>
                ) : null}
                {visibles.map((h) => {
                  const asignados = h._count?.asignaciones ?? 0;
                  const marcado = seleccion.has(h.id);
                  return (
                    <tr key={h.id} className={`transition hover:bg-[var(--color-surface-container-high)]/60 ${marcado ? "bg-[var(--color-primary)]/8" : ""} ${editing?.id === h.id ? "outline outline-1 -outline-offset-1 outline-[var(--color-primary)]/60" : ""}`}>
                      {puedeEliminar ? (
                        <td className="px-3 py-2.5">
                          <input type="checkbox" checked={marcado} onChange={() => toggleHorario(h.id)} aria-label={`Marcar ${h.nombre}`} />
                        </td>
                      ) : null}
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-semibold">
                          {h.nombre}
                          {!h.activo ? <span className="ml-2 rounded-full bg-red-500/14 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600">inactivo</span> : null}
                        </p>
                        {h.descripcion ? <p className="text-[11px] text-[var(--color-on-surface-variant)]">{h.descripcion}</p> : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-mono text-sm">{h.horaEntrada} – {h.horaSalida}</p>
                        <p className="text-[11px] text-[var(--color-on-surface-variant)]">tolerancia {h.tolerancia} min</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          {DIAS_SEMANA.map((dia) => (
                            <span
                              key={dia.key}
                              title={dia.largo}
                              className={`rounded px-1 py-0.5 text-[10px] font-bold ${h[dia.key] ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]" : "text-[var(--color-on-surface-variant)]/40"}`}
                            >
                              {dia.corto}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {asignados > 0 ? (
                          puedeVerAsignaciones ? (
                            <button
                              type="button"
                              onClick={() => setFiltroExterno({ horarioId: String(h.id), nonce: Date.now() })}
                              className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
                              title="Ver estos trabajadores en el panel de abajo"
                            >
                              {asignados} trabajador(es)
                            </button>
                          ) : (
                            <span className="font-semibold">{asignados} trabajador(es)</span>
                          )
                        ) : (
                          <span className="text-[var(--color-on-surface-variant)]">Nadie</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          {puedeEditar ? (
                            <button type="button" onClick={() => startEdit(h)} title="Editar" className="rounded-md border border-[var(--color-border-soft)] p-1.5 text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                              <Pencil size={13} />
                            </button>
                          ) : null}
                          {puedeEliminar ? (
                            <button type="button" onClick={() => pedirEliminar([h.id])} title="Eliminar" className="rounded-md border border-red-500/40 p-1.5 text-red-600 hover:bg-red-500/10">
                              <Trash2 size={13} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {/* ── Trabajadores y horarios (filtros + lotes) ─────────────────── */}
      {puedeVerAsignaciones ? <AsignacionesLote horarios={horarios} filtroExterno={filtroExterno} /> : null}

      {/* Confirmar eliminación de horarios */}
      <ConfirmDialog
        open={eliminarIds !== null}
        title={`¿Eliminar ${filasEliminar.length} horario(s)?`}
        tone="danger"
        confirmLabel={`Sí, eliminar ${eliminables.length}`}
        confirmDisabled={eliminables.length === 0}
        isLoading={eliminarMutation.isPending}
        onCancel={() => { setEliminarIds(null); setIncluirHistorial(false); }}
        onConfirm={() => eliminarIds && void eliminarMutation.mutateAsync(eliminarIds)}
      >
        <ul className="space-y-2">
          {filasEliminar.map(({ horario, vigentes, historial, estado }) => {
            const cuenta = estado === "LIBRE" || (estado === "HISTORIAL" && incluirHistorial);
            return (
              <li key={horario.id} className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                <p className="text-sm font-semibold">
                  {horario.nombre} <span className="font-mono text-xs font-normal text-[var(--color-on-surface-variant)]">({horario.horaEntrada}-{horario.horaSalida})</span>
                </p>
                {estado === "BLOQUEADO" ? (
                  <p className="mt-0.5 text-xs text-red-600">
                    No se puede eliminar: {vigentes} trabajador(es) lo usan actualmente. Quítales o cámbiales el horario primero.{" "}
                    {puedeVerAsignaciones ? (
                      <button
                        type="button"
                        className="font-semibold underline"
                        onClick={() => { setEliminarIds(null); setFiltroExterno({ horarioId: String(horario.id), nonce: Date.now() }); }}
                      >
                        Ver trabajadores
                      </button>
                    ) : null}
                  </p>
                ) : estado === "HISTORIAL" ? (
                  <p className={`mt-0.5 text-xs ${cuenta ? "text-[var(--color-on-surface-variant)]" : "text-amber-700"}`}>
                    {cuenta
                      ? `Se eliminará junto con ${historial} asignación(es) antigua(s) del historial.`
                      : `Nadie lo usa hoy, pero tiene ${historial} asignación(es) antigua(s) en el historial. Marca la opción de abajo para eliminarlo.`}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-emerald-600">Sin asignaciones: se puede eliminar.</p>
                )}
              </li>
            );
          })}
        </ul>

        {hayHistorial ? (
          <label className="flex items-start gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-xs">
            <input type="checkbox" className="mt-0.5" checked={incluirHistorial} onChange={(e) => setIncluirHistorial(e.target.checked)} />
            <span>
              Eliminar también el <b>historial de asignaciones antiguas</b> de estos horarios. Los reportes de esos días
              pasados mostrarán «sin horario».
            </span>
          </label>
        ) : null}

        {bloqueadosCount > 0 && eliminables.length > 0 ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            {bloqueadosCount} horario(s) no se eliminarán por lo indicado arriba; se eliminarán solo los {eliminables.length} restantes.
          </div>
        ) : null}
        {eliminables.length === 0 ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700">
            Ninguno de los horarios seleccionados se puede eliminar en este momento.
          </div>
        ) : (
          <p className="text-xs text-[var(--color-on-surface-variant)]">Esta acción no se puede deshacer.</p>
        )}
      </ConfirmDialog>

      {/* Resultado cuando el servidor no pudo eliminar alguno */}
      <ConfirmDialog
        open={resultado !== null}
        title="Resultado de la eliminación"
        confirmLabel="Entendido"
        cancelLabel={null}
        onCancel={() => setResultado(null)}
        onConfirm={() => setResultado(null)}
      >
        {resultado ? (
          <>
            <p>
              Se eliminaron <b>{resultado.eliminados.length}</b> horario(s)
              {resultado.asignacionesHistorialEliminadas > 0 ? ` y ${resultado.asignacionesHistorialEliminadas} asignación(es) del historial` : ""}.
            </p>
            {resultado.bloqueados.length > 0 ? (
              <div>
                <p className="mb-1 font-semibold text-red-600">No se pudieron eliminar:</p>
                <ul className="list-disc space-y-1 pl-5 text-xs">
                  {resultado.bloqueados.map((b) => (
                    <li key={b.id}>
                      <b>{b.nombre}</b>: {b.motivo}.
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {resultado.noEncontrados.length > 0 ? (
              <p className="text-xs text-[var(--color-on-surface-variant)]">{resultado.noEncontrados.length} horario(s) ya no existían.</p>
            ) : null}
          </>
        ) : null}
      </ConfirmDialog>
    </section>
  );
}
