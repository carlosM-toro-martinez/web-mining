import { FormEvent, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  PencilLine,
  Plus,
  Table2,
  Tags
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useCategoriasTreeQuery,
  useCreateCategoriaMutation
} from "@/features/categorias-inventario/hooks/useCategoriasInventario";
import { useCuentasQuery } from "@/features/contabilidad/hooks/useContabilidad";
import {
  useCreateProductoMutation,
  useProductosQuery,
  useUpdateProductoMutation
} from "@/features/productos/hooks/useProductos";
import type { Producto } from "@/features/productos/model/producto.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

export function ProductsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "ALMACENERO";
  const { showError, showSuccess } = useToast();

  const categoriasQuery = useCategoriasTreeQuery();
  const cuentasQuery = useCuentasQuery();
  const createCategoriaMutation = useCreateCategoriaMutation();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [searchDraft, setSearchDraft] = useState("");
  const [grupoDraft, setGrupoDraft] = useState("");
  const [subgrupoDraft, setSubgrupoDraft] = useState("");
  const [cuentaDraft, setCuentaDraft] = useState("");
  const [sinCuentaDraft, setSinCuentaDraft] = useState(false);

  const [searchApplied, setSearchApplied] = useState("");
  const [grupoApplied, setGrupoApplied] = useState<number | undefined>(undefined);
  const [subgrupoApplied, setSubgrupoApplied] = useState<number | undefined>(undefined);
  const [cuentaApplied, setCuentaApplied] = useState<number | undefined>(undefined);
  const [sinCuentaApplied, setSinCuentaApplied] = useState(false);

  const productosQuery = useProductosQuery({
    page,
    limit,
    search: searchApplied || undefined,
    grupoId: grupoApplied,
    subgrupoId: subgrupoApplied,
    cuentaId: cuentaApplied,
    sinCuenta: sinCuentaApplied || undefined
  });

  const createProductoMutation = useCreateProductoMutation();
  const updateProductoMutation = useUpdateProductoMutation();

  const grupos = categoriasQuery.data?.data ?? [];
  const subgruposPorGrupo = useMemo(
    () =>
      new Map(
        grupos.map((grupo) => [
          grupo.id,
          grupo.children.map((subgrupo) => ({
            id: subgrupo.id,
            nombre: subgrupo.nombre,
            codigo: subgrupo.codigo
          }))
        ])
      ),
    [grupos]
  );

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("UND");
  const [grupoId, setGrupoId] = useState("");
  const [subgrupoId, setSubgrupoId] = useState("");
  const [esEpp, setEsEpp] = useState(false);
  const [cuentaIdForm, setCuentaIdForm] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [rowCuentaSelection, setRowCuentaSelection] = useState<Record<number, string>>({});

  const availableSubgrupos = grupoId ? (subgruposPorGrupo.get(Number(grupoId)) ?? []) : [];
  const filterSubgrupos = grupoDraft ? (subgruposPorGrupo.get(Number(grupoDraft)) ?? []) : [];

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [modalTipo, setModalTipo] = useState<"grupo" | "subgrupo">("grupo");
  const [modalCodigo, setModalCodigo] = useState("");
  const [modalNombre, setModalNombre] = useState("");
  const [modalParentId, setModalParentId] = useState("");
  const cuentas = cuentasQuery.data?.data ?? [];

  const products = productosQuery.data?.data ?? [];
  const meta = productosQuery.data?.meta;

  function resetProductForm() {
    setCodigo("");
    setNombre("");
    setUnidad("UND");
    setGrupoId("");
    setSubgrupoId("");
    setEsEpp(false);
    setCuentaIdForm("");
    setEditingProductId(null);
  }

  function selectProduct(product: Producto) {
    setIsProductFormOpen(true);
    setEditingProductId(product.id);
    setCodigo(product.codigo);
    setNombre(product.nombre);
    setUnidad(product.unidad);
    setEsEpp(product.esEpp);

    const selectedGrupoId = product.categoria.parent?.id;
    setGrupoId(selectedGrupoId ? String(selectedGrupoId) : "");
    setSubgrupoId(String(product.categoria.id));
    setCuentaIdForm(product.cuentaId ? String(product.cuentaId) : "");
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearchApplied(searchDraft.trim());
    setGrupoApplied(grupoDraft ? Number(grupoDraft) : undefined);
    setSubgrupoApplied(subgrupoDraft ? Number(subgrupoDraft) : undefined);
    setCuentaApplied(cuentaDraft ? Number(cuentaDraft) : undefined);
    setSinCuentaApplied(sinCuentaDraft);
  }

  function handleClearFilters() {
    setSearchDraft("");
    setGrupoDraft("");
    setSubgrupoDraft("");
    setCuentaDraft("");
    setSinCuentaDraft(false);
    setSearchApplied("");
    setGrupoApplied(undefined);
    setSubgrupoApplied(undefined);
    setCuentaApplied(undefined);
    setSinCuentaApplied(false);
    setPage(1);
  }

  function handleGroupChange(value: string) {
    setGrupoId(value);
    setSubgrupoId("");
  }

  function handleFilterGroupChange(value: string) {
    setGrupoDraft(value);
    setSubgrupoDraft("");
  }

  function onSubmitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      showError("No tienes permisos para crear o editar productos.");
      return;
    }

    const parsedGrupoId = Number(grupoId);
    const parsedSubgrupoId = Number(subgrupoId);

    if (!parsedGrupoId || !parsedSubgrupoId) {
      showError("Debes seleccionar grupo y subgrupo.");
      return;
    }
    const parsedCuentaId = cuentaIdForm ? Number(cuentaIdForm) : undefined;

    if (editingProductId) {
      updateProductoMutation.mutate(
        {
          id: editingProductId,
          payload: {
            codigo,
            nombre,
            unidad,
            grupoId: parsedGrupoId,
            subgrupoId: parsedSubgrupoId,
            cuentaId: parsedCuentaId ?? null,
            esEpp
          }
        },
        {
          onSuccess: () => {
            showSuccess("Producto actualizado correctamente.");
            resetProductForm();
          },
          onError: (error) => {
            showError(normalizeError(error, "No se pudo actualizar el producto."));
          }
        }
      );
      return;
    }

    createProductoMutation.mutate(
      {
        codigo,
        nombre,
        unidad,
        grupoId: parsedGrupoId,
        subgrupoId: parsedSubgrupoId,
        cuentaId: parsedCuentaId ?? null,
        esEpp
      },
      {
        onSuccess: () => {
          showSuccess("Producto creado correctamente.");
          resetProductForm();
          setIsProductFormOpen(false);
        },
        onError: (error) => {
          showError(normalizeError(error, "No se pudo crear el producto."));
        }
      }
    );
  }

  function onSubmitModalCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      showError("No tienes permisos para crear categorias.");
      return;
    }

    const payload = {
      codigo: modalCodigo,
      nombre: modalNombre,
      parentId: modalTipo === "subgrupo" ? Number(modalParentId) : undefined
    };

    if (modalTipo === "subgrupo" && !payload.parentId) {
      showError("Debes seleccionar el grupo padre.");
      return;
    }

    createCategoriaMutation.mutate(payload, {
      onSuccess: () => {
        showSuccess("Categoria creada correctamente.");
        setModalCodigo("");
        setModalNombre("");
        setModalParentId("");
        setModalTipo("grupo");
        setShowCategoryModal(false);
      },
      onError: (error) => showError(normalizeError(error, "No se pudo crear la categoria."))
    });
  }

  function handleAssignCuenta(productId: number) {
    const selected = rowCuentaSelection[productId];
    const parsedCuentaId = selected ? Number(selected) : null;
    updateProductoMutation.mutate(
      {
        id: productId,
        payload: { cuentaId: parsedCuentaId }
      },
      {
        onSuccess: () => showSuccess("Cuenta contable asignada correctamente."),
        onError: (error) =>
          showError(normalizeError(error, "No se pudo asignar la cuenta al producto."))
      }
    );
  }
  console.log(products);

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-tertiary)]/16 p-2.5 text-[var(--color-tertiary)]">
              <Tags size={18} />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-extrabold">Productos</h1>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Registra productos por grupo y subgrupo. Si falta categoria, creala en la ventana
                emergente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => showSuccess("Exportar PDF estara disponible en la siguiente fase.")}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-tertiary)]/14 px-4 py-2.5 text-sm font-semibold text-[var(--color-tertiary)] transition hover:bg-[var(--color-tertiary)]/22"
            >
              <FileText size={16} />
              Descargar PDF
            </button>
            <button
              type="button"
              onClick={() => showSuccess("Exportar Excel estara disponible en la siguiente fase.")}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90"
            >
              <Table2 size={16} />
              Exportar Excel
            </button>
          </div>
        </div>

        <form className="grid grid-cols-1 gap-3 md:grid-cols-7" onSubmit={applyFilters}>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Buscar
            </label>
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className={inputClassName}
              placeholder="Codigo o nombre"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Grupo
            </label>
            <select
              value={grupoDraft}
              onChange={(event) => handleFilterGroupChange(event.target.value)}
              className={inputClassName}
            >
              <option value="">Todos</option>
              {grupos.map((grupo) => (
                <option key={grupo.id} value={grupo.id}>
                  {grupo.codigo} - {grupo.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Subgrupo
            </label>
            <select
              value={subgrupoDraft}
              onChange={(event) => setSubgrupoDraft(event.target.value)}
              className={inputClassName}
              disabled={!grupoDraft}
            >
              <option value="">Todos</option>
              {filterSubgrupos.map((subgrupo) => (
                <option key={subgrupo.id} value={subgrupo.id}>
                  {subgrupo.codigo} - {subgrupo.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Cuenta contable
            </label>
            <select
              value={cuentaDraft}
              onChange={(event) => setCuentaDraft(event.target.value)}
              className={inputClassName}
              disabled={sinCuentaDraft}
            >
              <option value="">Todas</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.codigoCompleto}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <input
                type="checkbox"
                checked={sinCuentaDraft}
                onChange={(event) => {
                  setSinCuentaDraft(event.target.checked);
                  if (event.target.checked) setCuentaDraft("");
                }}
                className="h-4 w-4 rounded border-[var(--color-outline-variant)] bg-[var(--color-surface-container-highest)]"
              />
              Solo sin cuenta
            </label>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-surface-container-high)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-surface-container-highest)]"
            >
              <Filter size={15} />
              Aplicar
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              Limpiar
            </button>
          </div>
        </form>
      </header>

      <div
        className={`grid grid-cols-1 gap-6 transition-all duration-300 ${
          isProductFormOpen ? "xl:grid-cols-[380px_minmax(0,1fr)]" : "xl:grid-cols-[minmax(0,1fr)]"
        }`}
      >
        {isProductFormOpen ? (
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 transition-all duration-300">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingProductId ? "Editar producto" : "Crear producto"}
              </h2>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-tertiary)]/50 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-tertiary)] transition hover:bg-[var(--color-tertiary)]/12"
              >
                <Plus size={13} />
                Nueva categoria
              </button>
            </div>

            <form className="space-y-3" onSubmit={onSubmitProduct}>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Codigo
                </label>
                <input
                  required
                  value={codigo}
                  onChange={(event) => setCodigo(event.target.value.toUpperCase())}
                  className={`${inputClassName} font-mono uppercase tracking-wide`}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Nombre
                </label>
                <input
                  required
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Unidad
                </label>
                <input
                  required
                  value={unidad}
                  onChange={(event) => setUnidad(event.target.value.toUpperCase())}
                  className={`${inputClassName} font-mono uppercase tracking-wide`}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Grupo
                </label>
                <select
                  required
                  value={grupoId}
                  onChange={(event) => handleGroupChange(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona grupo</option>
                  {grupos.map((grupo) => (
                    <option key={grupo.id} value={grupo.id}>
                      {grupo.codigo} - {grupo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Subgrupo
                </label>
                <select
                  required
                  value={subgrupoId}
                  onChange={(event) => setSubgrupoId(event.target.value)}
                  className={inputClassName}
                  disabled={!grupoId}
                >
                  <option value="">Selecciona subgrupo</option>
                  {availableSubgrupos.map((subgrupo) => (
                    <option key={subgrupo.id} value={subgrupo.id}>
                      {subgrupo.codigo} - {subgrupo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Cuenta contable
                </label>
                <select
                  value={cuentaIdForm}
                  onChange={(event) => setCuentaIdForm(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Sin cuenta asignada</option>
                  {cuentas.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.codigoCompleto} - {cuenta.centroCosto.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-[var(--color-on-surface)]">
                <input
                  type="checkbox"
                  checked={esEpp}
                  onChange={(event) => setEsEpp(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-outline-variant)] bg-[var(--color-surface-container-highest)]"
                />
                Es EPP
              </label>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={
                    !canManage ||
                    createProductoMutation.isPending ||
                    updateProductoMutation.isPending
                  }
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editingProductId
                    ? updateProductoMutation.isPending
                      ? "Actualizando..."
                      : "Actualizar"
                    : createProductoMutation.isPending
                      ? "Guardando..."
                      : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </article>
        ) : null}

        <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Lista de productos
              </h2>
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                {meta ? `${meta.total} registros` : "Sin datos"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isProductFormOpen) {
                  resetProductForm();
                  setIsProductFormOpen(false);
                  return;
                }
                resetProductForm();
                setIsProductFormOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)] transition hover:opacity-90"
            >
              <Plus size={12} />
              {isProductFormOpen ? "Ocultar formulario" : "Crear nuevo producto"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Codigo
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Grupo
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Subgrupo
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Unidad
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Accion
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {productosQuery.isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Cargando productos...
                    </td>
                  </tr>
                ) : null}

                {!productosQuery.isLoading && products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      No se encontraron productos con los filtros actuales.
                    </td>
                  </tr>
                ) : null}

                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="transition hover:bg-[var(--color-surface-container-highest)]"
                  >
                    <td className="px-4 py-3 font-mono text-xs uppercase tracking-wide">
                      {product.codigo}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{product.nombre}</td>
                    <td className="px-4 py-3 text-xs capitalize text-[var(--color-on-surface-variant)]">
                      {product.categoria.parent?.nombre ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-[var(--color-on-surface-variant)]">
                      {product.categoria.nombre}
                    </td>
                    <td className="px-4 py-3 text-xs uppercase">{product.unidad}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={
                            rowCuentaSelection[product.id] ??
                            (product.cuentaId ? String(product.cuentaId) : "")
                          }
                          onChange={(event) =>
                            setRowCuentaSelection((current) => ({
                              ...current,
                              [product.id]: event.target.value
                            }))
                          }
                          className="min-w-[180px] rounded-md border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-2 py-1.5 text-xs text-[var(--color-on-surface)]"
                        >
                          <option value="">Sin cuenta</option>
                          {cuentas.map((cuenta) => (
                            <option key={cuenta.id} value={cuenta.id}>
                              {cuenta.codigoCompleto}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAssignCuenta(product.id)}
                          className="rounded-md border border-[var(--color-primary)]/45 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
                        >
                          Asignar
                        </button>
                        <button
                          type="button"
                          onClick={() => selectProduct(product)}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-tertiary)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-tertiary)] transition hover:bg-[var(--color-tertiary)]/12"
                        >
                          <PencilLine size={12} />
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]/55 px-5 py-3">
            <span className="text-xs text-[var(--color-on-surface-variant)]">
              {meta ? `Pagina ${meta.page} de ${meta.totalPages}` : "-"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!meta || page <= 1}
                className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] transition hover:text-[var(--color-on-surface)] disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => (meta && current < meta.totalPages ? current + 1 : current))
                }
                disabled={!meta || page >= meta.totalPages}
                className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] transition hover:text-[var(--color-on-surface)] disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </article>
      </div>

      {showCategoryModal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Crear categoria rapida</h3>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="rounded-md border border-[var(--color-outline-variant)] px-2.5 py-1 text-xs text-[var(--color-on-surface-variant)]"
              >
                Cerrar
              </button>
            </div>

            <form className="space-y-3" onSubmit={onSubmitModalCategory}>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--color-surface-container-high)] p-1.5">
                <button
                  type="button"
                  onClick={() => setModalTipo("grupo")}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    modalTipo === "grupo"
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-on-surface-variant)]"
                  }`}
                >
                  Grupo
                </button>
                <button
                  type="button"
                  onClick={() => setModalTipo("subgrupo")}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    modalTipo === "subgrupo"
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-on-surface-variant)]"
                  }`}
                >
                  Subgrupo
                </button>
              </div>

              {modalTipo === "subgrupo" ? (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Grupo padre
                  </label>
                  <select
                    required
                    value={modalParentId}
                    onChange={(event) => setModalParentId(event.target.value)}
                    className={inputClassName}
                  >
                    <option value="">Selecciona grupo</option>
                    {grupos.map((grupo) => (
                      <option key={grupo.id} value={grupo.id}>
                        {grupo.codigo} - {grupo.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Codigo
                </label>
                <input
                  required
                  value={modalCodigo}
                  onChange={(event) => setModalCodigo(event.target.value.toUpperCase())}
                  className={`${inputClassName} font-mono uppercase tracking-wide`}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Nombre
                </label>
                <input
                  required
                  value={modalNombre}
                  onChange={(event) => setModalNombre(event.target.value)}
                  className={inputClassName}
                />
              </div>

              <button
                type="submit"
                disabled={createCategoriaMutation.isPending}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
              >
                {createCategoriaMutation.isPending ? "Guardando..." : "Guardar categoria"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
