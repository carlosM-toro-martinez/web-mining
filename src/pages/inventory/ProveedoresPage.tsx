import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Building2, Edit3, Eye, Save, Search, Trash2, Upload, UserPlus, X } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useCreateProveedorMutation,
  useDeleteProveedorMutation,
  useProveedorDetailQuery,
  useProveedoresQuery,
  useUpdateProveedorMutation
} from "@/features/proveedores/hooks/useProveedores";
import type { Proveedor } from "@/features/proveedores/model/proveedores.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { normalizeSpreadsheetRow, readSpreadsheetSheets } from "@/shared/lib/spreadsheetImport";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-BO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function formatNumber(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ProveedoresPage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "ALMACENERO";
  const { showError, showSuccess } = useToast();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [selectedProveedorId, setSelectedProveedorId] = useState<number | undefined>();
  const [isEditing, setIsEditing] = useState(false);

  const [nombre, setNombre] = useState("");
  const [lugar, setLugar] = useState("");
  const [contacto, setContacto] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nit, setNit] = useState("");

  const proveedoresQuery = useProveedoresQuery({
    page,
    limit,
    search: search.trim() || undefined
  });
  const proveedorDetailQuery = useProveedorDetailQuery(selectedProveedorId);
  const createProveedorMutation = useCreateProveedorMutation();
  const updateProveedorMutation = useUpdateProveedorMutation();
  const deleteProveedorMutation = useDeleteProveedorMutation();

  const proveedores = proveedoresQuery.data?.data ?? [];
  const meta = proveedoresQuery.data?.meta;
  const selectedProveedor = proveedorDetailQuery.data?.data ?? null;
  const selectedCompras = selectedProveedor?.compras ?? [];
  const hasServerPagination = Boolean(meta);

  const proveedoresOrdenados = useMemo(
    () =>
      [...proveedores].sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })
      ),
    [proveedores]
  );
  const proveedoresVisibles = hasServerPagination
    ? proveedoresOrdenados
    : proveedoresOrdenados.slice((page - 1) * limit, page * limit);
  const totalItems = meta?.total ?? proveedoresOrdenados.length;
  const totalPages = Math.max(1, meta?.totalPages ?? Math.ceil(totalItems / limit));

  useEffect(() => {
    if (!selectedProveedor || !isEditing) return;
    setNombre(selectedProveedor.nombre ?? "");
    setLugar(selectedProveedor.lugar ?? "");
    setContacto(selectedProveedor.contacto ?? "");
    setRazonSocial(selectedProveedor.razonSocial ?? "");
    setNit(selectedProveedor.nit ?? "");
  }, [isEditing, selectedProveedor]);

  function resetForm() {
    setNombre("");
    setLugar("");
    setContacto("");
    setRazonSocial("");
    setNit("");
    setIsEditing(false);
  }

  function startCreate() {
    setSelectedProveedorId(undefined);
    resetForm();
  }

  function startEdit(proveedor: Proveedor) {
    setSelectedProveedorId(proveedor.id);
    setIsEditing(true);
    setNombre(proveedor.nombre ?? "");
    setLugar(proveedor.lugar ?? "");
    setContacto(proveedor.contacto ?? "");
    setRazonSocial(proveedor.razonSocial ?? "");
    setNit(proveedor.nit ?? "");
  }

  function handleSubmitProveedor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      showError("No tienes permisos para administrar proveedores.");
      return;
    }

    if (isEditing && selectedProveedor) {
      const payload: Record<string, string> = {};
      const next = {
        nombre: nombre.trim(),
        lugar: lugar.trim(),
        contacto: contacto.trim(),
        razonSocial: razonSocial.trim(),
        nit: nit.trim()
      };
      if (next.nombre && next.nombre !== (selectedProveedor.nombre ?? "")) payload.nombre = next.nombre;
      if (next.lugar && next.lugar !== (selectedProveedor.lugar ?? "")) payload.lugar = next.lugar;
      if (next.contacto !== (selectedProveedor.contacto ?? "")) payload.contacto = next.contacto;
      if (next.razonSocial !== (selectedProveedor.razonSocial ?? "")) payload.razonSocial = next.razonSocial;
      if (next.nit !== (selectedProveedor.nit ?? "")) payload.nit = next.nit;

      if (Object.keys(payload).length === 0) {
        showError("No hay cambios para guardar.");
        return;
      }

      updateProveedorMutation.mutate(
        { id: selectedProveedor.id, payload },
        {
          onSuccess: (response) => {
            showSuccess(`Proveedor actualizado: ${response.data.nombre}`);
            setIsEditing(false);
          },
          onError: (error) => showError(normalizeError(error, "No se pudo actualizar el proveedor."))
        }
      );
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      lugar: lugar.trim(),
      contacto: contacto.trim() || undefined,
      razonSocial: razonSocial.trim() || undefined,
      nit: nit.trim() || undefined
    };

    if (!payload.nombre || !payload.lugar) {
      showError("Debes ingresar nombre y lugar del proveedor.");
      return;
    }

    createProveedorMutation.mutate(payload, {
      onSuccess: (response) => {
        showSuccess(`Proveedor creado: ${response.data.nombre}`);
        resetForm();
      },
      onError: (error) => showError(normalizeError(error, "No se pudo crear el proveedor."))
    });
  }

  function openImportDialog() {
    importInputRef.current?.click();
  }

  async function handleImportProveedores(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!canManage) {
      showError("No tienes permisos para importar proveedores.");
      return;
    }

    try {
      setIsImporting(true);
      const sheets = await readSpreadsheetSheets(file);
      const rows = sheets.flatMap((sheet) => sheet.rows).map((row) => normalizeSpreadsheetRow(row));
      if (!rows.length) {
        showError("El archivo no tiene filas para importar.");
        return;
      }

      const existingByName = new Set(proveedores.map((item) => item.nombre.trim().toUpperCase()));
      let created = 0;
      let skipped = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const [index, row] of rows.entries()) {
        const rowLabel = `Fila ${index + 2}`;
        const nombreRow = (row.nombre || row.proveedor || row.proveedornombre || "").trim();
        const lugarRow = (row.lugar || row.ciudad || row.ubicacion || row.direccion || "").trim();
        const contactoRow = (row.contacto || row.telefono || row.celular || row.personacontacto || "").trim();
        const razonSocialRow = (row.razonsocial || row.razon || "").trim();
        const nitRow = (row.nit || row.nitci || "").trim();

        if (!nombreRow || !lugarRow) {
          skipped += 1;
          continue;
        }

        const normalizedName = nombreRow.toUpperCase();
        if (existingByName.has(normalizedName)) {
          skipped += 1;
          continue;
        }

        try {
          await createProveedorMutation.mutateAsync({
            nombre: nombreRow,
            lugar: lugarRow,
            contacto: contactoRow || undefined,
            razonSocial: razonSocialRow || undefined,
            nit: nitRow || undefined
          });
          existingByName.add(normalizedName);
          created += 1;
        } catch (error) {
          failed += 1;
          errors.push(normalizeError(error, `${rowLabel}: no se pudo crear proveedor.`));
        }
      }

      showSuccess(`Importación completada. Creados: ${created}, Omitidos: ${skipped}, Errores: ${failed}.`);
      if (errors.length) showError(errors.slice(0, 3).join(" | "));
    } catch (error) {
      showError(normalizeError(error, "No se pudo procesar el archivo de proveedores."));
    } finally {
      setIsImporting(false);
    }
  }

  function handleDeleteSelected() {
    if (!selectedProveedor || selectedCompras.length > 0) return;
    const confirmed = window.confirm(`¿Eliminar proveedor "${selectedProveedor.nombre}"?`);
    if (!confirmed) return;

    deleteProveedorMutation.mutate(selectedProveedor.id, {
      onSuccess: () => {
        showSuccess("Proveedor eliminado.");
        startCreate();
      },
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar el proveedor."))
    });
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Proveedores</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Registra, consulta facturas asociadas y administra datos de proveedores.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            {isEditing ? <Edit3 size={16} className="text-[var(--color-primary)]" /> : <UserPlus size={16} className="text-[var(--color-primary)]" />}
            {isEditing ? "Editar proveedor" : "Nuevo proveedor"}
          </h2>
          {isEditing ? (
            <button type="button" onClick={startCreate} className={buttonSecondaryClassName}>
              <X size={14} />
              Cancelar edición
            </button>
          ) : null}
        </div>

        <form className="grid grid-cols-1 gap-3 lg:grid-cols-5" onSubmit={handleSubmitProveedor}>
          <input required={!isEditing} value={nombre} onChange={(event) => setNombre(event.target.value)} className={inputClassName} placeholder="Nombre del proveedor" disabled={!canManage} />
          <input required={!isEditing} value={lugar} onChange={(event) => setLugar(event.target.value)} className={inputClassName} placeholder="Lugar" disabled={!canManage} />
          <input value={contacto} onChange={(event) => setContacto(event.target.value)} className={inputClassName} placeholder="Contacto" disabled={!canManage} />
          <input value={razonSocial} onChange={(event) => setRazonSocial(event.target.value)} className={inputClassName} placeholder="Razón social" disabled={!canManage} />
          <input value={nit} onChange={(event) => setNit(event.target.value)} className={inputClassName} placeholder="NIT" disabled={!canManage} />
          <div className="flex flex-wrap gap-2 lg:col-span-5">
            <button
              type="submit"
              disabled={!canManage || createProveedorMutation.isPending || updateProveedorMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              <Save size={14} />
              {isEditing
                ? updateProveedorMutation.isPending ? "Guardando..." : "Guardar cambios"
                : createProveedorMutation.isPending ? "Guardando..." : "Crear proveedor"}
            </button>
            <button type="button" onClick={openImportDialog} disabled={!canManage || isImporting} className={buttonSecondaryClassName}>
              <Upload size={14} />
              {isImporting ? "Importando..." : "Importar proveedores CSV/Excel"}
            </button>
          </div>
        </form>
        <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImportProveedores} className="hidden" />
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Listado de proveedores</h2>
          <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
            <span>{totalItems.toLocaleString("es-BO")} registros</span>
            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-md border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-2 py-1"
            >
              {[10, 15, 25, 50].map((value) => (
                <option key={value} value={value}>{value} por página</option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className={`${inputClassName} pl-9`}
            placeholder="Buscar por nombre, NIT o razón social"
          />
        </div>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {["Nombre", "Razón social", "Contacto", "Lugar", "NIT", "Acciones"].map((title) => (
                  <th key={title} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {proveedoresQuery.isLoading ? (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">Cargando proveedores...</td></tr>
              ) : null}
              {!proveedoresQuery.isLoading && proveedoresVisibles.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">No se encontraron proveedores.</td></tr>
              ) : null}
              {proveedoresVisibles.map((proveedor) => (
                <tr key={proveedor.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-3 py-2 text-xs font-semibold">{proveedor.nombre}</td>
                  <td className="px-3 py-2 text-xs">{proveedor.razonSocial ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{proveedor.contacto ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{proveedor.lugar ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{proveedor.nit ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedProveedorId(proveedor.id)} className={buttonSecondaryClassName}>
                        <Eye size={13} />
                        Ver
                      </button>
                      <button type="button" onClick={() => startEdit(proveedor)} disabled={!canManage} className={buttonSecondaryClassName}>
                        <Edit3 size={13} />
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-on-surface-variant)]">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className={buttonSecondaryClassName}>Anterior</button>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className={buttonSecondaryClassName}>Siguiente</button>
          </div>
        </div>
      </article>

      {selectedProveedorId ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          {proveedorDetailQuery.isLoading ? (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando detalle del proveedor...</p>
          ) : selectedProveedor ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{selectedProveedor.nombre}</h2>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                    {selectedProveedor.razonSocial ?? "Sin razón social"} · NIT {selectedProveedor.nit ?? "-"} · {selectedProveedor.lugar ?? "Sin lugar"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => startEdit(selectedProveedor)} disabled={!canManage} className={buttonSecondaryClassName}>
                    <Edit3 size={14} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={!canManage || selectedCompras.length > 0 || deleteProveedorMutation.isPending}
                    title={selectedCompras.length > 0 ? "No se puede eliminar un proveedor con compras asociadas" : undefined}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-error)]/45 px-3 py-2 text-xs font-semibold text-[var(--color-error)] disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </div>

              {selectedCompras.length > 0 ? (
                <div className="rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                  Este proveedor tiene facturas asociadas. El sistema no permitirá eliminarlo.
                </div>
              ) : null}

              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Facturas asociadas ({selectedCompras.length})
                </h3>
                {selectedCompras.length === 0 ? (
                  <p className="rounded-lg border border-[var(--color-border-soft)] px-3 py-3 text-sm text-[var(--color-on-surface-variant)]">
                    No tiene compras asociadas.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedCompras.map((compra) => (
                      <div key={compra.id} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-bold">Factura {compra.numeroFactura ?? "Sin número"}</div>
                          <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-1 text-[10px] font-bold text-[var(--color-primary)]">
                            {compra.estado ?? "SIN ESTADO"}
                          </span>
                        </div>
                        <div className="mt-1 grid grid-cols-1 gap-1 text-xs text-[var(--color-on-surface-variant)] sm:grid-cols-3">
                          <span>Fecha: {formatDate(compra.fechaOperacion ?? compra.createdAt)}</span>
                          <span>Recibido: {formatDate(compra.recibidoAt)}</span>
                          <span>Descuento: {formatNumber(compra.descuento)}</span>
                        </div>
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                                <th className="py-1 pr-3">Producto</th>
                                <th className="py-1 pr-3">Unidad</th>
                                <th className="py-1 pr-3 text-right">Pedida</th>
                                <th className="py-1 pr-3 text-right">Recibida</th>
                                <th className="py-1 text-right">P. Unit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border-soft)]">
                              {compra.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="py-1 pr-3">{item.producto?.codigo ?? "-"} · {item.producto?.nombre ?? "Producto"}</td>
                                  <td className="py-1 pr-3">{item.producto?.unidad ?? "-"}</td>
                                  <td className="py-1 pr-3 text-right">{formatNumber(item.cantidadPedida)}</td>
                                  <td className="py-1 pr-3 text-right">{formatNumber(item.cantidadRecibida)}</td>
                                  <td className="py-1 text-right">{formatNumber(item.precioUnit)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">No se encontró el proveedor seleccionado.</p>
          )}
        </article>
      ) : null}
    </section>
  );
}
