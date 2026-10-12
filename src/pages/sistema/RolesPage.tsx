import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { usePermisos } from "@/features/auth/hooks/usePermisos";
import { httpClient } from "@/shared/api/core/httpClient";
import { queryKeys } from "@/shared/lib/queryKeys";
import { useToast } from "@/shared/ui/toast/ToastProvider";

interface AccionCatalogo { clave: string; nombre: string }
interface RecursoCatalogo { clave: string; nombre: string; descripcion?: string; acciones: AccionCatalogo[] }
interface ModuloCatalogo { clave: string; nombre: string; recursos: RecursoCatalogo[] }

interface RolItem {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  esSistema: boolean;
  activo: boolean;
  permisos: Array<{ recurso: string; accion: string }>;
  _count: { usuarios: number };
}

const ROL_SUPERADMIN = "ADMIN";

const inputClass =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm";

function errorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { message?: string; error?: unknown } } })?.response?.data;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  return error instanceof Error ? error.message : fallback;
}

export function RolesPage() {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermisos();
  const puedeCrear = can("sistema.roles", "crear");
  const puedeEditar = can("sistema.roles", "editar");
  const puedeEliminar = can("sistema.roles", "eliminar");

  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [nombreEdit, setNombreEdit] = useState("");
  const [descripcionEdit, setDescripcionEdit] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");

  const rolesQuery = useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: async () => {
      const response = await httpClient.get("/api/roles");
      return (response.data as { data: RolItem[] }).data;
    }
  });

  const catalogoQuery = useQuery({
    queryKey: queryKeys.roles.catalogo(),
    staleTime: Infinity,
    queryFn: async () => {
      const response = await httpClient.get("/api/roles/catalogo");
      return (response.data as { data: ModuloCatalogo[] }).data;
    }
  });

  const roles = rolesQuery.data ?? [];
  const seleccionado = useMemo(() => roles.find((r) => r.id === seleccionadoId) ?? null, [roles, seleccionadoId]);
  const esSuperAdmin = seleccionado?.codigo === ROL_SUPERADMIN;
  const soloLectura = !puedeEditar || esSuperAdmin;

  // Al cambiar de rol (o recargarse), cargar su estado en el formulario
  useEffect(() => {
    if (!seleccionado) return;
    setMarcados(new Set(seleccionado.permisos.map((p) => `${p.recurso}:${p.accion}`)));
    setNombreEdit(seleccionado.nombre);
    setDescripcionEdit(seleccionado.descripcion ?? "");
  }, [seleccionado]);

  useEffect(() => {
    if (seleccionadoId === null && roles.length > 0) setSeleccionadoId(roles[0]!.id);
  }, [roles, seleccionadoId]);

  const hayCambios = useMemo(() => {
    if (!seleccionado) return false;
    const original = new Set(seleccionado.permisos.map((p) => `${p.recurso}:${p.accion}`));
    if (original.size !== marcados.size) return true;
    for (const p of marcados) if (!original.has(p)) return true;
    return nombreEdit.trim() !== seleccionado.nombre || (descripcionEdit.trim() || null) !== seleccionado.descripcion;
  }, [seleccionado, marcados, nombreEdit, descripcionEdit]);

  async function invalidar() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
  }

  const crearMutation = useMutation({
    mutationFn: async () => {
      const response = await httpClient.post("/api/roles", {
        nombre: nuevoNombre.trim(),
        descripcion: nuevaDescripcion.trim() || null
      });
      return (response.data as { data: RolItem }).data;
    },
    onSuccess: async (rol) => {
      await invalidar();
      setSeleccionadoId(rol.id);
      setNuevoNombre("");
      setNuevaDescripcion("");
      showSuccess(`Rol "${rol.nombre}" creado (código ${rol.codigo}). Ahora asígnale permisos.`);
    },
    onError: (error) => showError(errorMessage(error, "No se pudo crear el rol."))
  });

  const guardarMutation = useMutation({
    mutationFn: async () => {
      if (!seleccionado) return;
      if (nombreEdit.trim() !== seleccionado.nombre || (descripcionEdit.trim() || null) !== seleccionado.descripcion) {
        await httpClient.put(`/api/roles/${seleccionado.id}`, {
          nombre: nombreEdit.trim(),
          descripcion: descripcionEdit.trim() || null
        });
      }
      if (!esSuperAdmin) {
        const permisos = [...marcados].map((p) => {
          const [recurso, accion] = p.split(":");
          return { recurso, accion };
        });
        await httpClient.put(`/api/roles/${seleccionado.id}/permisos`, { permisos });
      }
    },
    onSuccess: async () => {
      await invalidar();
      showSuccess("Rol actualizado. Los usuarios con este rol verán el cambio en menos de un minuto.");
    },
    onError: (error) => showError(errorMessage(error, "No se pudo guardar el rol."))
  });

  const toggleActivoMutation = useMutation({
    mutationFn: async (rol: RolItem) => {
      await httpClient.put(`/api/roles/${rol.id}`, { activo: !rol.activo });
    },
    onSuccess: async () => {
      await invalidar();
      showSuccess("Estado del rol actualizado.");
    },
    onError: (error) => showError(errorMessage(error, "No se pudo cambiar el estado del rol."))
  });

  const eliminarMutation = useMutation({
    mutationFn: async (rol: RolItem) => {
      await httpClient.delete(`/api/roles/${rol.id}`);
    },
    onSuccess: async () => {
      setSeleccionadoId(null);
      await invalidar();
      showSuccess("Rol eliminado.");
    },
    onError: (error) => showError(errorMessage(error, "No se pudo eliminar el rol."))
  });

  function onCrear(event: FormEvent) {
    event.preventDefault();
    if (!nuevoNombre.trim()) return;
    void crearMutation.mutateAsync();
  }

  function onEliminar(rol: RolItem) {
    if (!window.confirm(`¿Eliminar el rol "${rol.nombre}" (${rol.codigo})?\n\nEsta acción no se puede deshacer.`)) return;
    void eliminarMutation.mutateAsync(rol);
  }

  function onToggleActivo(rol: RolItem) {
    const accion = rol.activo ? "Desactivar" : "Activar";
    const aviso = rol.activo ? "\n\nLos usuarios con este rol perderán todos sus permisos mientras esté inactivo." : "";
    if (!window.confirm(`¿${accion} el rol "${rol.nombre}"?${aviso}`)) return;
    void toggleActivoMutation.mutateAsync(rol);
  }

  function toggle(recurso: string, accion: string) {
    if (soloLectura) return;
    setMarcados((prev) => {
      const next = new Set(prev);
      const key = `${recurso}:${accion}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleRecurso(recurso: RecursoCatalogo) {
    if (soloLectura) return;
    setMarcados((prev) => {
      const next = new Set(prev);
      const keys = recurso.acciones.map((a) => `${recurso.clave}:${a.clave}`);
      const todos = keys.every((k) => next.has(k));
      for (const k of keys) {
        if (todos) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  }

  function estaMarcado(recurso: string, accion: string) {
    return esSuperAdmin || marcados.has(`${recurso}:${accion}`);
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/16 p-2.5 text-[var(--color-primary)]"><ShieldCheck size={18} /></div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">Roles y permisos</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--color-on-surface-variant)]">
              Crea roles y define qué puede ver y hacer cada uno. Por ahora solo los módulos listados aquí
              usan permisos dinámicos; el resto de módulos sigue funcionando con los roles fijos de siempre.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Lista de roles ─────────────────────────────────────────── */}
        <aside className="space-y-4">
          {puedeCrear ? (
            <form onSubmit={onCrear} className="space-y-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Nuevo rol</h2>
              <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} required minLength={2} maxLength={60} placeholder="Nombre (ej. Jefe de RRHH)" className={inputClass} />
              <input value={nuevaDescripcion} onChange={(e) => setNuevaDescripcion(e.target.value)} maxLength={300} placeholder="Descripción (opcional)" className={inputClass} />
              <button type="submit" disabled={crearMutation.isPending || !nuevoNombre.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
                <Plus size={14} />{crearMutation.isPending ? "Creando..." : "Crear rol"}
              </button>
            </form>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
            <div className="border-b border-[var(--color-border-soft)] px-4 py-2 text-xs text-[var(--color-on-surface-variant)]">
              {rolesQuery.isLoading ? "Cargando roles..." : `${roles.length} roles`}
            </div>
            <ul className="max-h-[560px] divide-y divide-[var(--color-border-soft)] overflow-y-auto">
              {roles.map((rol) => (
                <li key={rol.id}>
                  <button
                    type="button"
                    onClick={() => setSeleccionadoId(rol.id)}
                    className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-[var(--color-surface-container-highest)] ${rol.id === seleccionadoId ? "bg-[var(--color-primary)]/10 font-semibold text-[var(--color-primary)]" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{rol.nombre}</span>
                      <span className="block font-mono text-[10px] text-[var(--color-on-surface-variant)]">{rol.codigo}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-[var(--color-on-surface-variant)]">
                      {!rol.activo ? <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-red-600">inactivo</span> : null}
                      {rol.esSistema ? <Lock size={11} aria-label="Rol de sistema" /> : null}
                      <span title="Usuarios con este rol">{rol._count.usuarios} usr</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ── Detalle / matriz de permisos ───────────────────────────── */}
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          {!seleccionado ? (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Selecciona un rol.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid min-w-[260px] flex-1 grid-cols-1 gap-2 md:grid-cols-2">
                  <label className="text-xs">
                    <span className="mb-1 block font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Nombre</span>
                    <input value={nombreEdit} onChange={(e) => setNombreEdit(e.target.value)} disabled={!puedeEditar} className={inputClass} />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Descripción</span>
                    <input value={descripcionEdit} onChange={(e) => setDescripcionEdit(e.target.value)} disabled={!puedeEditar} className={inputClass} />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {puedeEditar && !seleccionado.esSistema ? (
                    <button type="button" onClick={() => onToggleActivo(seleccionado)} className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold">
                      {seleccionado.activo ? "Desactivar" : "Activar"}
                    </button>
                  ) : null}
                  {puedeEliminar && !seleccionado.esSistema ? (
                    <button type="button" onClick={() => onEliminar(seleccionado)} className="inline-flex items-center gap-1 rounded-lg border border-red-500/45 px-3 py-2 text-xs font-semibold text-red-600">
                      <Trash2 size={12} />Eliminar
                    </button>
                  ) : null}
                  {puedeEditar ? (
                    <button type="button" onClick={() => void guardarMutation.mutateAsync()} disabled={!hayCambios || guardarMutation.isPending} className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-50">
                      <Save size={12} />{guardarMutation.isPending ? "Guardando..." : "Guardar cambios"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-[var(--color-on-surface-variant)]">
                <span className="rounded bg-[var(--color-surface-container-highest)] px-2 py-1 font-mono">{seleccionado.codigo}</span>
                <span className="rounded bg-[var(--color-surface-container-highest)] px-2 py-1">{seleccionado._count.usuarios} usuario(s)</span>
                {seleccionado.esSistema ? (
                  <span className="rounded bg-[var(--color-surface-container-highest)] px-2 py-1">Rol de sistema: no se puede eliminar ni desactivar</span>
                ) : null}
              </div>

              {esSuperAdmin ? (
                <div className="rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/8 px-4 py-3 text-sm">
                  ADMIN tiene acceso total a todo el sistema. Sus permisos no se pueden editar, para que nunca quede
                  el sistema sin un administrador.
                </div>
              ) : null}

              {catalogoQuery.isLoading ? <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando permisos...</p> : null}

              {catalogoQuery.data?.map((modulo) => (
                <section key={modulo.clave} className="overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
                  <h3 className="bg-[var(--color-surface-container-high)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{modulo.nombre}</h3>
                  <div className="divide-y divide-[var(--color-border-soft)]">
                    {modulo.recursos.map((recurso) => {
                      const todos = recurso.acciones.every((a) => estaMarcado(recurso.clave, a.clave));
                      return (
                        <div key={recurso.clave} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
                          <div className="min-w-[220px] flex-1">
                            <label className="inline-flex items-center gap-2 text-sm font-semibold">
                              <input type="checkbox" checked={todos} disabled={soloLectura} onChange={() => toggleRecurso(recurso)} />
                              {recurso.nombre}
                            </label>
                            {recurso.descripcion ? <p className="ml-6 mt-0.5 text-[11px] text-[var(--color-on-surface-variant)]">{recurso.descripcion}</p> : null}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {recurso.acciones.map((accion) => (
                              <label key={accion.clave} className="inline-flex items-center gap-1.5 text-xs">
                                <input type="checkbox" checked={estaMarcado(recurso.clave, accion.clave)} disabled={soloLectura} onChange={() => toggle(recurso.clave, accion.clave)} />
                                {accion.nombre}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
