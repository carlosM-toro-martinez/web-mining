import { useMemo, useState } from "react";
import { PencilLine, RefreshCw, UsersRound } from "lucide-react";
import { EmployeeForm } from "@/modules/employee/components/EmployeeForm";
import { useEmployees } from "@/modules/employee/hooks/useEmployees";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

interface EditingEmployee {
  id: number;
  nombre: string;
  deviceUserId: string;
}

export function EmployeePage() {
  const { showError, showSuccess } = useToast();
  const employees = useEmployees();
  const [editing, setEditing] = useState<EditingEmployee | null>(null);

  const pendingCount = useMemo(
    () => employees.getAll.data.filter((employee) => employee.syncStatus === "PENDING").length,
    [employees.getAll.data]
  );

  async function handleCreate(values: { nombre: string; deviceUserId: string }) {
    try {
      await employees.create(values);
      showSuccess("Empleado guardado.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo guardar el empleado.");
    }
  }

  async function handleUpdate(values: { nombre: string; deviceUserId: string }) {
    if (!editing) return;
    try {
      await employees.update({
        id: editing.id,
        ...values
      });
      setEditing(null);
      showSuccess("Empleado actualizado.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo actualizar el empleado.");
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

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/16 p-2.5 text-[var(--color-primary)]">
              <UsersRound size={18} />
            </div>
            <div>
              <h1 className="page-title font-headline text-3xl font-extrabold">Control de Personal</h1>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Módulo offline-first para registrar empleados y sincronizarlos con la API.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRetrySync}
            disabled={employees.isRetrying}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)]/14 px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/22 disabled:opacity-60"
          >
            <RefreshCw size={16} />
            {employees.isRetrying ? "Reintentando..." : "Reintentar sincronización"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            {editing ? "Editar empleado" : "Nuevo empleado"}
          </h2>
          <EmployeeForm
            mode={editing ? "edit" : "create"}
            initialValues={editing ?? undefined}
            isSubmitting={employees.isSaving}
            onSubmit={editing ? handleUpdate : handleCreate}
            onCancelEdit={() => setEditing(null)}
          />
        </article>

        <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Lista de empleados
            </h2>
            <span className="text-xs text-[var(--color-on-surface-variant)]">
              Pendientes de sync: {pendingCount}
            </span>
          </div>

          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Device User ID
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Sync
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {employees.getAll.isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Cargando empleados...
                    </td>
                  </tr>
                ) : null}

                {!employees.getAll.isLoading && employees.getAll.data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      No hay empleados registrados.
                    </td>
                  </tr>
                ) : null}

                {employees.getAll.data.map((employee) => (
                  <tr key={employee.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                    <td className="px-4 py-3 text-sm">{employee.nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs">{employee.deviceUserId}</td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          employee.syncStatus === "SYNCED"
                            ? "bg-emerald-500/12 text-emerald-600"
                            : "bg-amber-500/14 text-amber-600"
                        }`}
                      >
                        {employee.syncStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {employee.id ? (
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              id: employee.id!,
                              nombre: employee.nombre,
                              deviceUserId: employee.deviceUserId
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-tertiary)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-tertiary)] transition hover:bg-[var(--color-tertiary)]/12"
                        >
                          <PencilLine size={12} />
                          Editar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
