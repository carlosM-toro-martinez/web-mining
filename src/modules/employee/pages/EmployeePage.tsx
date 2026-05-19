import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, PencilLine, RefreshCw, Trash2, Upload, UsersRound } from "lucide-react";
import * as XLSX from "xlsx";
import { EmployeeForm } from "@/modules/employee/components/EmployeeForm";
import { useEmployees } from "@/modules/employee/hooks/useEmployees";
import { env } from "@/shared/config/env";
import { normalizeSpreadsheetRow, readSpreadsheetSheets } from "@/shared/lib/spreadsheetImport";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

interface EditingEmployee {
  id: number;
  nombre: string;
  documento?: string;
  cargo?: string;
  deviceUserId?: string;
  activo: boolean;
}

export function EmployeePage() {
  const { showError, showSuccess } = useToast();
  const employees = useEmployees();
  const { refreshAttendance } = employees;
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState<EditingEmployee | null>(null);
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
        (employee.cargo ?? "").toLowerCase().includes(query);
      const matchesActive = !onlyActive || employee.activo;
      return matchesSearch && matchesActive;
    });
  }, [employees.getAll.data, search, onlyActive]);

  async function handleCreate(values: {
    nombre: string;
    documento?: string;
    cargo?: string;
    deviceUserId?: string;
    activo?: boolean;
  }) {
    try {
      await employees.create(values);
      showSuccess("Empleado guardado.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo guardar el empleado.");
    }
  }

  async function handleUpdate(values: {
    nombre: string;
    documento?: string;
    cargo?: string;
    deviceUserId?: string;
    activo?: boolean;
  }) {
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

  async function handleDelete(id: number) {
    try {
      await employees.remove(id);
      if (editing?.id === id) setEditing(null);
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

  async function handleClearLocalCache() {
    try {
      await employees.clearLocalCache();
      showSuccess("Caché local limpiada.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo limpiar la caché local.");
    }
  }

  function downloadEmployeesTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      { nombre: "", documento: "", cargo: "", deviceUserId: "", activo: "true" }
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "empleados");
    XLSX.writeFile(wb, "plantilla-empleados.xlsx");
  }

  function downloadEmployeesExport() {
    const wb = XLSX.utils.book_new();
    const rows = employees.getAll.data.map((item) => ({
      nombre: item.nombre,
      documento: item.documento ?? "",
      cargo: item.cargo ?? "",
      deviceUserId: item.deviceUserId ?? "",
      activo: item.activo ? "true" : "false",
      syncStatus: item.syncStatus
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "empleados");
    XLSX.writeFile(wb, `empleados-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function openImportDialog() {
    importInputRef.current?.click();
  }

  async function handleImportEmployees(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setIsImporting(true);
      const sheets = await readSpreadsheetSheets(file);
      const sourceRows = sheets[0]?.rows ?? [];
      if (!sourceRows.length) {
        showError("El archivo no tiene filas para importar.");
        return;
      }

      let created = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const [index, raw] of sourceRows.entries()) {
        const row = normalizeSpreadsheetRow(raw);
        const nombre = (row.nombre || "").trim();
        const documento = (row.documento || "").trim();
        const cargo = (row.cargo || "").trim();
        const deviceUserId = (row.deviceuserid || row.device_user_id || row.pin || "").trim();
        const activoRaw = (row.activo || "true").trim().toLowerCase();
        const activo = !["false", "0", "no", "inactivo"].includes(activoRaw);

        if (!nombre) {
          failed += 1;
          errors.push(`Fila ${index + 2}: nombre vacío.`);
          continue;
        }

        try {
          await employees.create({
            nombre,
            documento: documento || undefined,
            cargo: cargo || undefined,
            deviceUserId: deviceUserId || undefined,
            activo
          });
          created += 1;
        } catch (error) {
          failed += 1;
          errors.push(
            `Fila ${index + 2}: ${error instanceof Error ? error.message : "No se pudo crear"}`
          );
        }
      }

      showSuccess(`Importación finalizada. Creados: ${created}. Errores: ${failed}.`);
      if (errors.length > 0) {
        showError(errors.slice(0, 3).join(" | "));
      }
    } finally {
      setIsImporting(false);
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
        socket.on("attendance:new", () => {
          void refreshAttendance().catch(() => undefined);
        });
      } catch {
        // fallback to polling queries already configured in hooks
      }
    }

    void setupRealtime();
    return () => {
      disposed = true;
      socket?.disconnect();
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [refreshAttendance]);

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
                Gestión de trabajadores, sincronización biométrica y asistencia.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                employees.biometricStatus?.conectado
                  ? "bg-emerald-500/12 text-emerald-600"
                  : "bg-amber-500/14 text-amber-600"
              }`}
            >
              Dispositivo: {employees.biometricStatus?.conectado ? "Conectado" : "Sin conexión"}
            </span>
            <button
              type="button"
              onClick={handleRetrySync}
              disabled={employees.isRetrying}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)]/14 px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/22 disabled:opacity-60"
            >
              <RefreshCw size={16} />
              {employees.isRetrying ? "Reintentando..." : "Reencolar pendientes"}
            </button>
            <button
              type="button"
              onClick={openImportDialog}
              disabled={isImporting}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60"
            >
              <Upload size={16} />
              {isImporting ? "Importando..." : "Importar Excel"}
            </button>
            <button
              type="button"
              onClick={downloadEmployeesTemplate}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              <Download size={16} />
              Plantilla Excel
            </button>
            <button
              type="button"
              onClick={downloadEmployeesExport}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)]/14 px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/22"
            >
              <Download size={16} />
              Exportar empleados
            </button>
            <button
              type="button"
              onClick={handleClearLocalCache}
              disabled={employees.isClearingCache}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/45 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-500/12 disabled:opacity-60"
            >
              {employees.isClearingCache ? "Limpiando..." : "Limpiar caché local"}
            </button>
          </div>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleImportEmployees}
          className="hidden"
        />
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
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
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Lista de empleados
              </h2>
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                Pendientes de sync: {pendingCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs"
                placeholder="Buscar nombre/documento/cargo"
              />
              <label className="text-xs">
                <input
                  type="checkbox"
                  checked={onlyActive}
                  onChange={(event) => setOnlyActive(event.target.checked)}
                  className="mr-1 h-3.5 w-3.5"
                />
                Solo activos
              </label>
            </div>
          </div>

          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Documento
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Cargo
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Device User ID
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Sync
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Activo
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
                      colSpan={7}
                      className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Cargando empleados...
                    </td>
                  </tr>
                ) : null}

                {!employees.getAll.isLoading && filteredEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      No hay empleados registrados.
                    </td>
                  </tr>
                ) : null}

                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                    <td className="px-4 py-3 text-sm">{employee.nombre}</td>
                    <td className="px-4 py-3 text-xs">{employee.documento ?? "-"}</td>
                    <td className="px-4 py-3 text-xs">{employee.cargo ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{employee.deviceUserId ?? "-"}</td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          employee.syncStatus === "SYNCED"
                            ? "bg-emerald-500/12 text-emerald-600"
                            : employee.syncStatus === "ERROR"
                              ? "bg-red-500/14 text-red-600"
                              : "bg-amber-500/14 text-amber-600"
                        }`}
                      >
                        {employee.syncStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{employee.activo ? "Sí" : "No"}</td>
                    <td className="px-4 py-3 text-right">
                      {employee.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditing({
                                id: employee.id!,
                                nombre: employee.nombre,
                                documento: employee.documento,
                                cargo: employee.cargo,
                                deviceUserId: employee.deviceUserId,
                                activo: employee.activo
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-tertiary)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-tertiary)] transition hover:bg-[var(--color-tertiary)]/12"
                          >
                            <PencilLine size={12} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(employee.id!)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-500/45 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-500/12"
                          >
                            <Trash2 size={12} />
                            Eliminar
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl">
          <div className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Asistencia reciente
            </h3>
          </div>
          <div className="table-scroll max-h-[360px] overflow-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Fecha</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Tipo</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Empleado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {employees.isLoadingAttendance ? (
                  <tr><td colSpan={3} className="px-3 py-4 text-center text-xs text-[var(--color-on-surface-variant)]">Cargando asistencia...</td></tr>
                ) : null}
                {!employees.isLoadingAttendance && employees.attendance.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-4 text-center text-xs text-[var(--color-on-surface-variant)]">Sin marcas recientes.</td></tr>
                ) : null}
                {employees.attendance.map((item) => (
                  <tr key={String(item.id)}>
                    <td className="px-3 py-2 text-xs">{new Date(item.fecha).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs">{item.tipo}</td>
                    <td className="px-3 py-2 text-xs">{item.empleado?.nombre ?? `PIN ${item.deviceUserId ?? "-"}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl">
          <div className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Comandos pendientes / usuarios en dispositivo
            </h3>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Comandos pendientes
              </p>
              <div className="max-h-28 overflow-auto rounded border border-[var(--color-border-soft)] p-2 text-xs">
                {employees.pendingCommands.length === 0 ? "Sin comandos pendientes." : employees.pendingCommands.map((item) => (
                  <p key={item.id}>#{item.id} {item.action} - {item.status}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Usuarios sincronizados en dispositivo
              </p>
              <div className="max-h-28 overflow-auto rounded border border-[var(--color-border-soft)] p-2 text-xs">
                {employees.deviceUsers.length === 0 ? "Sin usuarios sincronizados." : employees.deviceUsers.map((item) => (
                  <p key={`${item.employeeId}-${item.deviceUserId}`}>{item.nombre} ({item.deviceUserId})</p>
                ))}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
