import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PencilLine, RefreshCw, Trash2, UsersRound } from "lucide-react";
import { EmployeeForm } from "@/modules/employee/components/EmployeeForm";
import { useEmployees } from "@/modules/employee/hooks/useEmployees";
import { env } from "@/shared/config/env";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

interface EditingEmployee {
  id: number;
  nombre: string;
  documento?: string;
  cargo?: string;
  activo: boolean;
}

export function EmployeePage() {
  const { showError, showSuccess } = useToast();
  const employees = useEmployees();
  const { refreshAttendance } = employees;
  const [editing, setEditing] = useState<EditingEmployee | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const pendingCount = useMemo(
    () => employees.getAll.data.filter((employee) => employee.syncStatus === "PENDING").length,
    [employees.getAll.data]
  );

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.getAll.data.filter((employee) => {
      const matchesSearch =
        !query ||
        employee.nombre.toLowerCase().includes(query) ||
        (employee.documento ?? "").toLowerCase().includes(query) ||
        (employee.cargo ?? "").toLowerCase().includes(query) ||
        (employee.deviceUserId ?? "").toLowerCase().includes(query);
      return matchesSearch && (!onlyActive || employee.activo);
    });
  }, [employees.getAll.data, search, onlyActive]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / limit));
  const currentPage = Math.min(page, totalPages);
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredEmployees.slice(start, start + limit);
  }, [filteredEmployees, currentPage, limit]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, onlyActive]);

  async function handleCreate(values: { nombre: string; documento?: string; cargo?: string; activo?: boolean }) {
    try {
      await employees.create(values);
      setIsFormOpen(false);
      showSuccess("Empleado guardado.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo guardar el empleado.");
    }
  }

  async function handleUpdate(values: { nombre: string; documento?: string; cargo?: string; activo?: boolean }) {
    if (!editing) return;
    try {
      await employees.update({ id: editing.id, ...values });
      setEditing(null);
      setIsFormOpen(false);
      showSuccess("Empleado actualizado.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo actualizar el empleado.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await employees.remove(id);
      showSuccess("Empleado eliminado.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo eliminar el empleado.");
    }
  }

  async function handleRetrySync() {
    try {
      await employees.retrySync();
      showSuccess("Reintento de sincronización ejecutado.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo reintentar la sincronización.");
    }
  }

  useEffect(() => {
    let disposed = false;
    let socket: { on: (event: string, cb: (payload: unknown) => void) => void; disconnect: () => void } | null = null;
    let script: HTMLScriptElement | null = null;
    async function setupRealtime() {
      try {
        const scriptUrl = `${env.VITE_API_BASE_URL.replace(/\/+$/, "")}/socket.io/socket.io.js`;
        script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        await new Promise<void>((resolve, reject) => {
          if (!script) return reject(new Error("script not created"));
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("No se pudo cargar socket.io client"));
          document.head.appendChild(script);
        });
        if (disposed) return;
        const ioFactory = (window as unknown as { io?: (url: string) => { on: (event: string, cb: (payload: unknown) => void) => void; disconnect: () => void } }).io;
        if (!ioFactory) return;
        socket = ioFactory(env.VITE_API_BASE_URL);
        socket.on("attendance:new", () => void refreshAttendance().catch(() => undefined));
      } catch {
        // fallback polling
      }
    }
    void setupRealtime();
    return () => {
      disposed = true;
      socket?.disconnect();
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, [refreshAttendance]);

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton to="/personal" label="Volver a Personal" />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/16 p-2.5 text-[var(--color-primary)]"><UsersRound size={18} /></div>
            <div>
              <h1 className="page-title font-headline text-3xl font-extrabold">Personal</h1>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Gestión de empleados.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleRetrySync} disabled={employees.isRetrying} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)]/14 px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] disabled:opacity-60"><RefreshCw size={16} />{employees.isRetrying ? "Reintentando..." : "Reencolar pendientes"}</button>
            <button type="button" onClick={() => { setEditing(null); setIsFormOpen(true); }} className="inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]">Nuevo empleado</button>
          </div>
        </div>
      </header>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Lista de empleados</h2>
            <span className="text-xs text-[var(--color-on-surface-variant)]">Pendientes de sync: {pendingCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs" placeholder="Buscar nombre/documento/cargo/userId" />
            <label className="text-xs"><input type="checkbox" checked={onlyActive} onChange={(event) => setOnlyActive(event.target.checked)} className="mr-1 h-3.5 w-3.5" />Solo activos</label>
          </div>
        </div>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead><tr><th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Nombre</th><th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Documento</th><th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Cargo</th><th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Device User ID</th><th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Sync</th><th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Activo</th><th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Acción</th></tr></thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {employees.getAll.isLoading ? <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">Cargando empleados...</td></tr> : null}
              {!employees.getAll.isLoading && filteredEmployees.length === 0 ? <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">No hay empleados registrados.</td></tr> : null}
              {paginatedEmployees.map((employee) => (
                <tr key={employee.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-4 py-3 text-sm">{employee.nombre}</td>
                  <td className="px-4 py-3 text-xs">{employee.documento ?? "-"}</td>
                  <td className="px-4 py-3 text-xs">{employee.cargo ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{employee.deviceUserId ?? "-"}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{employee.syncStatus}</td>
                  <td className="px-4 py-3 text-xs">{employee.activo ? "Sí" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setEditing({ id: employee.id!, nombre: employee.nombre, documento: employee.documento, cargo: employee.cargo, activo: employee.activo }); setIsFormOpen(true); }} className="inline-flex items-center gap-1 rounded-md border border-[var(--color-tertiary)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-tertiary)]"><PencilLine size={12} />Editar</button>
                      <button type="button" onClick={() => handleDelete(employee.id!)} className="inline-flex items-center gap-1 rounded-md border border-red-500/45 px-3 py-1.5 text-xs font-semibold text-red-600"><Trash2 size={12} />Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]/55 px-5 py-3">
          <span className="text-xs text-[var(--color-on-surface-variant)]">{`Pagina ${currentPage} de ${totalPages}`}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((current) => (current > 1 ? current - 1 : current))} disabled={currentPage <= 1} className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => setPage((current) => (current < totalPages ? current + 1 : current))} disabled={currentPage >= totalPages} className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        </div>
      </article>

      {isFormOpen ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{editing ? "Editar empleado" : "Nuevo empleado"}</h2>
            <EmployeeForm mode={editing ? "edit" : "create"} initialValues={editing ?? undefined} isSubmitting={employees.isSaving} onSubmit={editing ? handleUpdate : handleCreate} onCancelEdit={() => { setEditing(null); setIsFormOpen(false); }} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
