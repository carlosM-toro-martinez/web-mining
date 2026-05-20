import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FileSpreadsheet,
  PencilLine,
  Plus,
  Table2,
  Tags,
  Upload
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useCategoriasTreeQuery,
  useCreateCategoriaMutation
} from "@/features/categorias-inventario/hooks/useCategoriasInventario";
import {
  useCentrosCostoQuery,
  useCuentasQuery,
  useFuncionesGastoQuery
} from "@/features/contabilidad/hooks/useContabilidad";
import {
  useCreateProductoMutation,
  useProductosQuery,
  useUpdateProductoMutation
} from "@/features/productos/hooks/useProductos";
import { useRecalcularStockMutation } from "@/features/inventario-import/hooks/useInventarioImport";
import type { Producto } from "@/features/productos/model/producto.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import {
  downloadProductosCsvTemplate,
  downloadProductosExcelTemplate
} from "@/shared/lib/importTemplates";
import { normalizeSpreadsheetRow, readSpreadsheetSheets } from "@/shared/lib/spreadsheetImport";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

export function ProductsPage() {
  const { user } = useAuth();
  const canManage =
    user?.role === "ADMIN" || user?.role === "ALMACENERO" || user?.role === "RECEPCIONISTA";
  const { showError, showSuccess } = useToast();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const categoriasQuery = useCategoriasTreeQuery();
  const centrosCostoQuery = useCentrosCostoQuery();
  const funcionesGastoQuery = useFuncionesGastoQuery();
  const cuentasQuery = useCuentasQuery();
  const createCategoriaMutation = useCreateCategoriaMutation();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [searchDraft, setSearchDraft] = useState("");
  const [grupoDraft, setGrupoDraft] = useState("");
  const [subgrupoDraft, setSubgrupoDraft] = useState("");
  const [cuentaDraft, setCuentaDraft] = useState("");
  const [sinCuentaDraft, setSinCuentaDraft] = useState(false);

  const productosQuery = useProductosQuery({
    page: 1,
    limit: 5000,
    search: undefined,
    grupoId: undefined,
    subgrupoId: undefined,
    cuentaId: undefined,
    sinCuenta: undefined
  });

  const createProductoMutation = useCreateProductoMutation();
  const updateProductoMutation = useUpdateProductoMutation();
  const recalcularStockMutation = useRecalcularStockMutation();

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
  const [centroCostoIdForm, setCentroCostoIdForm] = useState("");
  const [funcionGastoIdForm, setFuncionGastoIdForm] = useState("");
  const [cuentaAutocomplete, setCuentaAutocomplete] = useState("");
  const [cuentaIdForm, setCuentaIdForm] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [rowCuentaSelection, setRowCuentaSelection] = useState<Record<number, string>>({});
  const [isRecalcularModalOpen, setIsRecalcularModalOpen] = useState(false);
  const [recalcularProductoId, setRecalcularProductoId] = useState("");
  const [recalcularStockInicial, setRecalcularStockInicial] = useState("");
  const [recalcularEliminarValeIds, setRecalcularEliminarValeIds] = useState("");

  const availableSubgrupos = grupoId ? (subgruposPorGrupo.get(Number(grupoId)) ?? []) : [];
  const filterSubgrupos = grupoDraft ? (subgruposPorGrupo.get(Number(grupoDraft)) ?? []) : [];

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [modalTipo, setModalTipo] = useState<"grupo" | "subgrupo">("grupo");
  const [modalCodigo, setModalCodigo] = useState("");
  const [modalNombre, setModalNombre] = useState("");
  const [modalParentId, setModalParentId] = useState("");
  const centrosCosto = centrosCostoQuery.data?.data ?? [];
  const funcionesGasto = funcionesGastoQuery.data?.data ?? [];
  const cuentas = cuentasQuery.data?.data ?? [];

  const products = productosQuery.data?.data ?? [];

  const filteredProducts = useMemo(() => {
    const query = searchDraft.trim().toLowerCase();
    const grupoIdNumber = grupoDraft ? Number(grupoDraft) : undefined;
    const subgrupoIdNumber = subgrupoDraft ? Number(subgrupoDraft) : undefined;
    const cuentaIdNumber = cuentaDraft ? Number(cuentaDraft) : undefined;

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.codigo.toLowerCase().includes(query) ||
        product.nombre.toLowerCase().includes(query);
      const matchesGrupo = !grupoIdNumber || product.categoria?.parent?.id === grupoIdNumber;
      const matchesSubgrupo = !subgrupoIdNumber || product.categoria?.id === subgrupoIdNumber;
      const matchesSinCuenta = !sinCuentaDraft || !product.cuentaId;
      const matchesCuenta = !cuentaIdNumber || product.cuentaId === cuentaIdNumber;
      return matchesSearch && matchesGrupo && matchesSubgrupo && matchesSinCuenta && matchesCuenta;
    });
  }, [products, searchDraft, grupoDraft, subgrupoDraft, cuentaDraft, sinCuentaDraft]);

  const total = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredProducts.slice(start, start + limit);
  }, [filteredProducts, currentPage, limit]);

  useEffect(() => {
    setPage(1);
  }, [searchDraft, grupoDraft, subgrupoDraft, cuentaDraft, sinCuentaDraft]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function resetProductForm() {
    setCodigo("");
    setNombre("");
    setUnidad("UND");
    setGrupoId("");
    setSubgrupoId("");
    setEsEpp(false);
    setCentroCostoIdForm("");
    setFuncionGastoIdForm("");
    setCuentaAutocomplete("");
    setCuentaIdForm("");
    setEditingProductId(null);
  }

  function findCuentaByCodigoCompleto(value: string) {
    return cuentas.find(
      (cuenta) => cuenta.codigoCompleto.toLowerCase() === value.trim().toLowerCase()
    );
  }

  function syncCuentaAutocomplete(nextCentroCostoId: string, nextFuncionGastoId: string) {
    const centroId = Number(nextCentroCostoId);
    const funcionId = Number(nextFuncionGastoId);

    if (!centroId || !funcionId) {
      setCuentaAutocomplete("");
      return;
    }

    const matchedCuenta = cuentas.find(
      (cuenta) => cuenta.centroCostoId === centroId && cuenta.funcionGastoId === funcionId
    );
    setCuentaAutocomplete(matchedCuenta?.codigoCompleto ?? "");
  }

  function handleCuentaAutocompleteChange(value: string) {
    setCuentaAutocomplete(value);
    const matchedCuenta = findCuentaByCodigoCompleto(value);
    if (!matchedCuenta) return;
    setCentroCostoIdForm(String(matchedCuenta.centroCostoId));
    setFuncionGastoIdForm(String(matchedCuenta.funcionGastoId));
  }

  function handleCentroCostoChange(value: string) {
    setCentroCostoIdForm(value);
    syncCuentaAutocomplete(value, funcionGastoIdForm);
  }

  function handleFuncionGastoChange(value: string) {
    setFuncionGastoIdForm(value);
    syncCuentaAutocomplete(centroCostoIdForm, value);
  }

  function selectProduct(product: Producto) {
    setIsProductFormOpen(true);
    setEditingProductId(product.id);
    setCodigo(product.codigo);
    setNombre(product.nombre);
    setUnidad(product.unidad);
    setEsEpp(product.esEpp);

    const selectedGrupoId = product.categoria?.parent?.id;
    setGrupoId(selectedGrupoId ? String(selectedGrupoId) : "");
    setSubgrupoId(product.categoria?.id ? String(product.categoria.id) : "");
    setCentroCostoIdForm(product.cuenta?.centroCosto ? String(product.cuenta.centroCosto.id) : "");
    setFuncionGastoIdForm(
      product.cuenta?.funcionGasto ? String(product.cuenta.funcionGasto.id) : ""
    );
    setCuentaAutocomplete(product.cuenta?.codigoCompleto ?? "");
    setCuentaIdForm(product.cuentaId ? String(product.cuentaId) : "");
  }

  function handleClearFilters() {
    setSearchDraft("");
    setGrupoDraft("");
    setSubgrupoDraft("");
    setCuentaDraft("");
    setSinCuentaDraft(false);
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
    const parsedCentroCostoId = Number(centroCostoIdForm);
    const parsedFuncionGastoId = Number(funcionGastoIdForm);

    if (!parsedGrupoId || !parsedSubgrupoId || !parsedCentroCostoId || !parsedFuncionGastoId) {
      showError("Debes seleccionar grupo, subgrupo, centro de costo y funcion de gasto.");
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
            centroCostoId: parsedCentroCostoId,
            funcionGastoId: parsedFuncionGastoId,
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
        centroCostoId: parsedCentroCostoId,
        funcionGastoId: parsedFuncionGastoId,
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

  function openImportDialog() {
    importInputRef.current?.click();
  }

  async function handleImportProducts(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!canManage) {
      showError("No tienes permisos para importar productos.");
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
      const subgroupByKeyToId = new Map<string, number>();
      for (const group of grupos) {
        const groupCode = group.codigo.trim().toUpperCase();
        groupCodeToId.set(groupCode, group.id);
        for (const sub of group.children) {
          const subCode = sub.codigo.trim().toUpperCase();
          subgroupByKeyToId.set(`${groupCode}::${subCode}`, sub.id);
        }
      }

      const centroCodeToId = new Map(
        centrosCosto.map((centro) => [centro.codigo.trim().toUpperCase(), centro.id])
      );
      const funcionCodeToId = new Map(
        funcionesGasto.map((funcion) => [funcion.codigo.trim().toUpperCase(), funcion.id])
      );

      let created = 0;
      let skipped = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const [index, row] of rows.entries()) {
        const codigo = (row.codigo || "").trim().toUpperCase();
        const nombre = (row.nombre || "").trim();
        const unidad = (row.unidad || "UND").trim().toUpperCase();
        const codigoGrupo = (row.codigogrupo || "").trim().toUpperCase();
        const codigoSubgrupo = (row.codigosubgrupo || "").trim().toUpperCase();
        const codigoCentro = (row.codigocentrocosto || "").trim().toUpperCase();
        const codigoFuncion = (row.codigofunciongasto || "").trim().toUpperCase();
        const eppRaw = (row.esepp || "").trim().toLowerCase();
        const esEpp = ["1", "si", "sí", "true", "x"].includes(eppRaw);
        const rowLabel = `Fila ${index + 2}`;

        if (
          !codigo ||
          !nombre ||
          !codigoGrupo ||
          !codigoSubgrupo ||
          !codigoCentro ||
          !codigoFuncion
        ) {
          failed += 1;
          errors.push(`${rowLabel}: faltan campos obligatorios.`);
          continue;
        }

        const grupoIdValue = groupCodeToId.get(codigoGrupo);
        if (!grupoIdValue) {
          failed += 1;
          errors.push(`${rowLabel}: no existe el grupo ${codigoGrupo}.`);
          continue;
        }

        const subgrupoIdValue = subgroupByKeyToId.get(`${codigoGrupo}::${codigoSubgrupo}`);
        if (!subgrupoIdValue) {
          failed += 1;
          errors.push(
            `${rowLabel}: no existe el subgrupo ${codigoSubgrupo} para el grupo ${codigoGrupo}.`
          );
          continue;
        }

        const centroCostoIdValue = centroCodeToId.get(codigoCentro);
        const funcionGastoIdValue = funcionCodeToId.get(codigoFuncion);
        if (!centroCostoIdValue || !funcionGastoIdValue) {
          failed += 1;
          errors.push(`${rowLabel}: centro o funcion de gasto no existen.`);
          continue;
        }

        try {
          await createProductoMutation.mutateAsync({
            codigo,
            nombre,
            unidad,
            grupoId: grupoIdValue,
            subgrupoId: subgrupoIdValue,
            centroCostoId: centroCostoIdValue,
            funcionGastoId: funcionGastoIdValue,
            esEpp
          });
          created += 1;
        } catch (error) {
          const message = normalizeError(error, "No se pudo crear el producto.");
          if (message.toLowerCase().includes("ya existe")) {
            skipped += 1;
          } else {
            failed += 1;
            errors.push(`${rowLabel}: ${message}`);
          }
        }
      }

      showSuccess(
        `Importacion completada. Creados: ${created}, omitidos: ${skipped}, errores: ${failed}.`
      );
      if (errors.length) {
        showError(errors.slice(0, 3).join(" | "));
      }
    } catch (error) {
      showError(normalizeError(error, "No se pudo procesar el archivo de productos."));
    } finally {
      setIsImporting(false);
    }
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

  function openRecalcularModal() {
    setIsRecalcularModalOpen(true);
    setRecalcularProductoId("");
    setRecalcularStockInicial("");
    setRecalcularEliminarValeIds("");
  }

  function handleRecalcularStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (user?.role !== "ADMIN") {
      showError("Solo ADMIN puede usar esta correccion.");
      return;
    }
    const productoId = Number(recalcularProductoId);
    const stockInicial = Number(recalcularStockInicial);
    if (!productoId || Number.isNaN(stockInicial) || stockInicial < 0) {
      showError("Selecciona producto y stock inicial valido.");
      return;
    }
    const eliminarValeIds = recalcularEliminarValeIds
      .split(/[\s,;\n]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    recalcularStockMutation.mutate(
      {
        productoId,
        stockInicial,
        eliminarValeIds: eliminarValeIds.length ? eliminarValeIds : undefined
      },
      {
        onSuccess: (response) => {
          showSuccess(
            `Recalculo aplicado. Stock final: ${response.data.stockFinal}. Movimientos recalculados: ${response.data.movimientosRecalculados}.`
          );
          setIsRecalcularModalOpen(false);
        },
        onError: (error) =>
          showError(normalizeError(error, "No se pudo recalcular el stock del producto."))
      }
    );
  }
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
              <h1 className="page-title font-headline text-3xl font-extrabold">Productos</h1>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Registra productos por grupo y subgrupo con su centro de costo y funcion de gasto
                para generar su cuenta contable automaticamente.
              </p>
            </div>
          </div>

          <div className="page-toolbar flex items-center gap-3">
            {user?.role === "ADMIN" ? (
              <button
                type="button"
                onClick={openRecalcularModal}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-error)]/55 px-4 py-2.5 text-sm font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10"
              >
                Correccion historica
              </button>
            ) : null}
            <button
              type="button"
              onClick={openImportDialog}
              disabled={isImporting || !canManage}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-50"
            >
              <Upload size={16} />
              {isImporting ? "Importando..." : "Importar CSV/Excel"}
            </button>
            <button
              type="button"
              onClick={downloadProductosCsvTemplate}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              <Download size={16} />
              Plantilla CSV
            </button>
            <button
              type="button"
              onClick={downloadProductosExcelTemplate}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)]/14 px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/22"
            >
              <FileSpreadsheet size={16} />
              Plantilla Excel
            </button>
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
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleImportProducts}
          className="hidden"
        />

        <form className="grid grid-cols-1 gap-3 md:grid-cols-7" onSubmit={(event) => event.preventDefault()}>
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
                  Buscar cuenta contable existente
                </label>
                <input
                  list="cuentas-contables-list"
                  value={cuentaAutocomplete}
                  onChange={(event) => handleCuentaAutocompleteChange(event.target.value)}
                  className={inputClassName}
                  placeholder="Ej: CC001-FG001"
                />
                <datalist id="cuentas-contables-list">
                  {cuentas.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.codigoCompleto} />
                  ))}
                </datalist>
                <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                  Si eliges una cuenta existente, se completan automaticamente centro y funcion.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Centro de costo
                </label>
                <select
                  required
                  value={centroCostoIdForm}
                  onChange={(event) => handleCentroCostoChange(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona centro de costo</option>
                  {centrosCosto.map((centro) => (
                    <option key={centro.id} value={centro.id}>
                      {centro.codigo} - {centro.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Funcion de gasto
                </label>
                <select
                  required
                  value={funcionGastoIdForm}
                  onChange={(event) => handleFuncionGastoChange(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona funcion de gasto</option>
                  {funcionesGasto.map((funcion) => (
                    <option key={funcion.id} value={funcion.id}>
                      {funcion.codigo} - {funcion.nombre}
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
                {`${total} registros`}
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

          <div className="table-scroll overflow-x-auto">
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
                    Stock actual
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    P. Unit (Bs.)
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    P. Prom (Bs.)
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
                      colSpan={9}
                      className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Cargando productos...
                    </td>
                  </tr>
                ) : null}

                {!productosQuery.isLoading && productosQuery.isError ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-sm text-[var(--color-error)]"
                    >
                      No se pudo cargar productos. Revisa la respuesta del API/formato.
                    </td>
                  </tr>
                ) : null}

                {!productosQuery.isLoading && !productosQuery.isError && paginatedProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      No se encontraron productos con los filtros actuales.
                    </td>
                  </tr>
                ) : null}

                {paginatedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="transition hover:bg-[var(--color-surface-container-highest)]"
                  >
                    <td className="px-4 py-3 font-mono text-xs uppercase tracking-wide">
                      {product.codigo}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{product.nombre}</td>
                    <td className="px-4 py-3 text-xs capitalize text-[var(--color-on-surface-variant)]">
                      {product.categoria?.parent?.nombre ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-[var(--color-on-surface-variant)]">
                      {product.categoria?.nombre ?? "(Sin categoría)"}
                    </td>
                    <td className="px-4 py-3 text-xs uppercase">{product.unidad}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold">
                      {product.stock.cantidad}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">{product.stock.precioUnit}</td>
                    <td className="px-4 py-3 text-right text-xs">{product.stock.precioProm}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
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
              {`Pagina ${currentPage} de ${totalPages}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1}
                className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] transition hover:text-[var(--color-on-surface)] disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => (current < totalPages ? current + 1 : current))}
                disabled={currentPage >= totalPages}
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

      {isRecalcularModalOpen && user?.role === "ADMIN" ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <h3 className="text-lg font-bold">Recalcular stock historico</h3>
            <p className="mt-1 text-xs text-[var(--color-error)]">
              Esta accion modifica el historial de movimientos. Usar solo para correcciones.
            </p>
            <form className="mt-4 space-y-3" onSubmit={handleRecalcularStock}>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Producto
                </label>
                <select
                  required
                  value={recalcularProductoId}
                  onChange={(event) => setRecalcularProductoId(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona producto</option>
                  {products.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.codigo} - {producto.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Stock inicial corregido
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={recalcularStockInicial}
                  onChange={(event) => setRecalcularStockInicial(event.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  IDs de vales a eliminar (opcional)
                </label>
                <textarea
                  value={recalcularEliminarValeIds}
                  onChange={(event) => setRecalcularEliminarValeIds(event.target.value)}
                  className={`${inputClassName} min-h-24`}
                  placeholder="uuid-1, uuid-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecalcularModalOpen(false)}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={recalcularStockMutation.isPending}
                  className="rounded-lg bg-[var(--color-error)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {recalcularStockMutation.isPending ? "Aplicando..." : "Aplicar correccion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
