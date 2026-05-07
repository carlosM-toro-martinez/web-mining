import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import {
  Boxes,
  Download,
  FileSpreadsheet,
  FolderTree,
  PencilLine,
  Plus,
  Trash2,
  Upload
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useCategoriasTreeQuery,
  useCreateCategoriaMutation,
  useDeleteCategoriaMutation,
  useUpdateCategoriaMutation
} from "@/features/categorias-inventario/hooks/useCategoriasInventario";
import type { CategoriaTreeNode } from "@/features/categorias-inventario/model/categoria.schema";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import {
  downloadCategoriasCsvTemplate,
  downloadCategoriasExcelTemplate
} from "@/shared/lib/importTemplates";
import { normalizeSpreadsheetRow, readSpreadsheetSheets } from "@/shared/lib/spreadsheetImport";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

interface FlatCategory {
  id: number;
  codigo: string;
  nombre: string;
  parentId: number | null;
  parentNombre: string;
  nivel: "grupo" | "subgrupo";
}

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

export function CategoriesPage() {
  const { user } = useAuth();
  const canManage =
    user?.role === "ADMIN" || user?.role === "ALMACENERO" || user?.role === "RECEPCIONISTA";
  const canDelete = user?.role === "ADMIN";

  const { showError, showSuccess } = useToast();
  const categoriasQuery = useCategoriasTreeQuery();
  const createCategoriaMutation = useCreateCategoriaMutation();
  const updateCategoriaMutation = useUpdateCategoriaMutation();
  const deleteCategoriaMutation = useDeleteCategoriaMutation();

  const [tipoCreacion, setTipoCreacion] = useState<"grupo" | "subgrupo">("grupo");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [parentId, setParentId] = useState<string>("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCodigo, setEditCodigo] = useState("");
  const [editNombre, setEditNombre] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const grupos = categoriasQuery.data?.data ?? [];

  const flatRows = useMemo<FlatCategory[]>(() => {
    return grupos.flatMap((grupo) => {
      const baseRow: FlatCategory = {
        id: grupo.id,
        codigo: grupo.codigo,
        nombre: grupo.nombre,
        parentId: null,
        parentNombre: "-",
        nivel: "grupo"
      };

      const subRows: FlatCategory[] = grupo.children.map((subgrupo) => ({
        id: subgrupo.id,
        codigo: subgrupo.codigo,
        nombre: subgrupo.nombre,
        parentId: grupo.id,
        parentNombre: grupo.nombre,
        nivel: "subgrupo"
      }));

      return [baseRow, ...subRows];
    });
  }, [grupos]);

  function resetCreateForm() {
    setCodigo("");
    setNombre("");
    setParentId("");
    setTipoCreacion("grupo");
  }

  function startEditing(row: FlatCategory) {
    setEditingId(row.id);
    setEditCodigo(row.codigo);
    setEditNombre(row.nombre);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditCodigo("");
    setEditNombre("");
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      showError("No tienes permisos para crear categorias.");
      return;
    }

    const parsedParent = tipoCreacion === "subgrupo" ? Number(parentId) : undefined;
    if (tipoCreacion === "subgrupo" && (!parsedParent || Number.isNaN(parsedParent))) {
      showError("Debes elegir un grupo para crear el subgrupo.");
      return;
    }

    createCategoriaMutation.mutate(
      {
        codigo,
        nombre,
        parentId: parsedParent
      },
      {
        onSuccess: () => {
          showSuccess("Categoria creada correctamente.");
          resetCreateForm();
        },
        onError: (error) => {
          showError(normalizeError(error, "No se pudo crear la categoria."));
        }
      }
    );
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !editingId) {
      showError("No puedes editar esta categoria.");
      return;
    }

    updateCategoriaMutation.mutate(
      { id: editingId, payload: { codigo: editCodigo, nombre: editNombre } },
      {
        onSuccess: () => {
          showSuccess("Categoria actualizada correctamente.");
          cancelEditing();
        },
        onError: (error) => {
          showError(normalizeError(error, "No se pudo actualizar la categoria."));
        }
      }
    );
  }

  function handleDelete(categoriaId: number) {
    if (!canDelete) {
      showError("Solo ADMIN puede eliminar categorias.");
      return;
    }

    deleteCategoriaMutation.mutate(categoriaId, {
      onSuccess: () => showSuccess("Categoria eliminada correctamente."),
      onError: (error) => {
        showError(normalizeError(error, "No se pudo eliminar la categoria."));
      }
    });
  }

  function openImportDialog() {
    importInputRef.current?.click();
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!canManage) {
      showError("No tienes permisos para importar categorias.");
      return;
    }

    try {
      setIsImporting(true);
      const sheets = await readSpreadsheetSheets(file);
      const sourceRows = sheets[0]?.rows ?? [];
      if (!sourceRows.length) {
        showError("El archivo no tiene filas para importar.");
        return;
      }

      const rows = sourceRows.map((row) => normalizeSpreadsheetRow(row));
      const groupCodeToId = new Map<string, number>();
      const subgroupKeySet = new Set<string>();

      for (const group of grupos) {
        const groupCode = group.codigo.trim().toUpperCase();
        groupCodeToId.set(groupCode, group.id);
        for (const sub of group.children) {
          subgroupKeySet.add(`${groupCode}::${sub.codigo.trim().toUpperCase()}`);
        }
      }

      const groupRows: typeof rows = [];
      const subgroupRows: typeof rows = [];
      for (const row of rows) {
        const tipo = (row.tipo || row.nivel || "").trim().toLowerCase();
        if (tipo === "grupo") groupRows.push(row);
        else if (tipo === "subgrupo") subgroupRows.push(row);
      }

      let created = 0;
      let skipped = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const [index, row] of groupRows.entries()) {
        const codigo = (row.codigo || "").trim().toUpperCase();
        const nombre = (row.nombre || "").trim();
        const rowLabel = `Grupo fila ${index + 2}`;

        if (!codigo || !nombre) {
          failed += 1;
          errors.push(`${rowLabel}: codigo y nombre son obligatorios.`);
          continue;
        }
        if (groupCodeToId.has(codigo)) {
          skipped += 1;
          continue;
        }

        try {
          const response = await createCategoriaMutation.mutateAsync({ codigo, nombre });
          groupCodeToId.set(codigo, response.data.id);
          created += 1;
        } catch (error) {
          failed += 1;
          errors.push(`${rowLabel}: ${normalizeError(error, "No se pudo crear el grupo.")}`);
        }
      }

      for (const [index, row] of subgroupRows.entries()) {
        const codigo = (row.codigo || "").trim().toUpperCase();
        const nombre = (row.nombre || "").trim();
        const parentCode = (row.codigogrupopadre || row.grupopadre || "").trim().toUpperCase();
        const rowLabel = `Subgrupo fila ${index + 2}`;

        if (!codigo || !nombre || !parentCode) {
          failed += 1;
          errors.push(`${rowLabel}: codigo, nombre y codigo_grupo_padre son obligatorios.`);
          continue;
        }

        const parentId = groupCodeToId.get(parentCode);
        if (!parentId) {
          failed += 1;
          errors.push(`${rowLabel}: no existe el grupo padre ${parentCode}.`);
          continue;
        }

        const subgroupKey = `${parentCode}::${codigo}`;
        if (subgroupKeySet.has(subgroupKey)) {
          skipped += 1;
          continue;
        }

        try {
          await createCategoriaMutation.mutateAsync({ codigo, nombre, parentId });
          subgroupKeySet.add(subgroupKey);
          created += 1;
        } catch (error) {
          failed += 1;
          errors.push(`${rowLabel}: ${normalizeError(error, "No se pudo crear el subgrupo.")}`);
        }
      }

      showSuccess(
        `Importacion completada. Creados: ${created}, omitidos: ${skipped}, errores: ${failed}.`
      );
      if (errors.length) {
        showError(errors.slice(0, 3).join(" | "));
      }
    } catch (error) {
      showError(normalizeError(error, "No se pudo procesar el archivo de importacion."));
    } finally {
      setIsImporting(false);
    }
  }

  if (categoriasQuery.isLoading) {
    return (
      <section className="rounded-xl bg-[var(--color-surface-container-low)] p-6 text-[var(--color-on-surface)]">
        <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando categorias...</p>
      </section>
    );
  }

  if (categoriasQuery.isError) {
    return (
      <section className="rounded-xl border border-[var(--color-error)]/50 bg-[var(--color-surface-container-low)] p-6 text-[var(--color-on-surface)]">
        <p className="text-sm text-[var(--color-error)]">
          No se pudo cargar el arbol de categorias.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-tertiary)]/16 p-2.5 text-[var(--color-tertiary)]">
              <FolderTree size={18} />
            </div>
            <div>
              <h1 className="page-title font-headline text-3xl font-extrabold">
                Categorias de Inventario
              </h1>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Crea primero el grupo y luego sus subgrupos para poder registrar productos.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full bg-[var(--color-tertiary)]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-tertiary)]">
              Jerarquia 2 niveles
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openImportDialog}
                disabled={isImporting || !canManage}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-50"
              >
                <Upload size={13} />
                {isImporting ? "Importando..." : "Importar CSV/Excel"}
              </button>
              <button
                type="button"
                onClick={downloadCategoriasCsvTemplate}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
              >
                <Download size={13} />
                Plantilla CSV
              </button>
              <button
                type="button"
                onClick={downloadCategoriasExcelTemplate}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)] transition hover:opacity-90"
              >
                <FileSpreadsheet size={13} />
                Plantilla Excel
              </button>
            </div>
          </div>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleImportFile}
          className="hidden"
        />
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Plus size={16} className="text-[var(--color-primary)]" />
            Crear categoria
          </h2>

          <form className="space-y-4" onSubmit={handleCreate}>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Tipo
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--color-surface-container-high)] p-1.5">
                <button
                  type="button"
                  onClick={() => setTipoCreacion("grupo")}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    tipoCreacion === "grupo"
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
                  }`}
                >
                  Grupo
                </button>
                <button
                  type="button"
                  onClick={() => setTipoCreacion("subgrupo")}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    tipoCreacion === "subgrupo"
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
                  }`}
                >
                  Subgrupo
                </button>
              </div>
            </div>

            {tipoCreacion === "subgrupo" ? (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Grupo padre
                </label>
                <select
                  required
                  value={parentId}
                  onChange={(event) => setParentId(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona un grupo</option>
                  {grupos.map((grupo: CategoriaTreeNode) => (
                    <option key={grupo.id} value={grupo.id}>
                      {grupo.codigo} - {grupo.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Codigo
              </label>
              <input
                required
                value={codigo}
                onChange={(event) => setCodigo(event.target.value.toUpperCase())}
                className={`${inputClassName} font-mono uppercase tracking-wide`}
                placeholder="Ej: FILT"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Nombre
              </label>
              <input
                required
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className={inputClassName}
                placeholder="Ej: Filtros"
              />
            </div>

            <button
              type="submit"
              disabled={!canManage || createCategoriaMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createCategoriaMutation.isPending ? "Guardando..." : "Guardar categoria"}
            </button>
          </form>
        </article>

        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <PencilLine size={16} className="text-[var(--color-primary)]" />
            Editar categoria
          </h2>

          {editingId ? (
            <form className="space-y-4" onSubmit={handleUpdate}>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Codigo
                </label>
                <input
                  required
                  value={editCodigo}
                  onChange={(event) => setEditCodigo(event.target.value.toUpperCase())}
                  className={`${inputClassName} font-mono uppercase tracking-wide`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Nombre
                </label>
                <input
                  required
                  value={editNombre}
                  onChange={(event) => setEditNombre(event.target.value)}
                  className={inputClassName}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={!canManage || updateCategoriaMutation.isPending}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateCategoriaMutation.isPending ? "Actualizando..." : "Actualizar"}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <p className="rounded-lg bg-[var(--color-surface-container-high)] p-4 text-sm text-[var(--color-on-surface-variant)]">
              Selecciona una fila en la tabla para editar su codigo o nombre.
            </p>
          )}

          <p className="mt-4 text-xs text-[var(--color-on-surface-variant)]">
            Permisos: crear/editar (ADMIN, ALMACENERO) | eliminar (solo ADMIN).
          </p>
        </article>
      </div>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            <Boxes size={14} />
            Arbol grupo y subgrupos
          </h3>
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            {flatRows.length} categorias
          </span>
        </div>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Nivel
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Codigo
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Nombre
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Padre
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {flatRows.map((row) => (
                <tr
                  key={row.id}
                  className="transition hover:bg-[var(--color-surface-container-highest)]"
                >
                  <td className="px-4 py-3 text-xs font-semibold uppercase text-[var(--color-on-surface)]">
                    {row.nivel}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs uppercase tracking-wide text-[var(--color-on-surface)]">
                    {row.codigo}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-[var(--color-on-surface)]">
                    {row.nivel === "subgrupo" ? <span className="mr-2">└</span> : null}
                    {row.nombre}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-[var(--color-on-surface-variant)]">
                    {row.parentNombre}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(row)}
                        className="rounded-md border border-[var(--color-tertiary)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-tertiary)] transition hover:bg-[var(--color-tertiary)]/12"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={!canDelete || deleteCategoriaMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-error)]/50 px-3 py-1.5 text-xs font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={12} />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {flatRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                  >
                    No hay categorias registradas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
