import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Building2, Edit3, Eye, Search, Upload, UserPlus } from "lucide-react";
import { usePermisos } from "@/features/auth/hooks/usePermisos";
import {
  useCreateProveedorMutation,
  useProveedoresQuery
} from "@/features/proveedores/hooks/useProveedores";
import type { Proveedor } from "@/features/proveedores/model/proveedores.schema";
import { ProveedorDetalleModal } from "@/features/proveedores/ui/ProveedorDetalleModal";
import { ProveedorFormModal } from "@/features/proveedores/ui/ProveedorFormModal";
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

export function ProveedoresPage() {
  const { can } = usePermisos();
  const canCreate = can("inventario.proveedores", "crear");
  const canEdit = can("inventario.proveedores", "editar");
  const canDelete = can("inventario.proveedores", "eliminar");
  const { showError, showSuccess } = useToast();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  // Ventanas: ver el detalle, y crear/editar (con proveedor = editar, sin proveedor = nuevo)
  const [detalleId, setDetalleId] = useState<number | undefined>();
  const [formModal, setFormModal] = useState<{ open: boolean; proveedor: Proveedor | null }>({
    open: false,
    proveedor: null
  });

  const proveedoresQuery = useProveedoresQuery({
    page,
    limit,
    search: search.trim() || undefined
  });
  const createProveedorMutation = useCreateProveedorMutation();

  const proveedores = proveedoresQuery.data?.data ?? [];
  const meta = proveedoresQuery.data?.meta;
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

  function openCreate() {
    setFormModal({ open: true, proveedor: null });
  }

  function openEdit(proveedor: Proveedor) {
    setDetalleId(undefined);
    setFormModal({ open: true, proveedor });
  }

  function openImportDialog() {
    importInputRef.current?.click();
  }

  async function handleImportProveedores(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!canCreate) {
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

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
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
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={openImportDialog} disabled={!canCreate || isImporting} className={buttonSecondaryClassName}>
              <Upload size={14} />
              {isImporting ? "Importando..." : "Importar CSV/Excel"}
            </button>
            <button
              type="button"
              onClick={openCreate}
              disabled={!canCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:opacity-60"
            >
              <UserPlus size={15} />
              Nuevo proveedor
            </button>
          </div>
        </div>
        <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImportProveedores} className="hidden" />
      </header>

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
                      <button type="button" onClick={() => setDetalleId(proveedor.id)} className={buttonSecondaryClassName}>
                        <Eye size={13} />
                        Ver
                      </button>
                      <button type="button" onClick={() => openEdit(proveedor)} disabled={!canEdit} className={buttonSecondaryClassName}>
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

      <ProveedorDetalleModal
        proveedorId={detalleId}
        onClose={() => setDetalleId(undefined)}
        onEdit={openEdit}
        canEdit={canEdit}
        canDelete={canDelete}
      />
      <ProveedorFormModal
        isOpen={formModal.open}
        proveedor={formModal.proveedor}
        onClose={() => setFormModal({ open: false, proveedor: null })}
      />
    </section>
  );
}
