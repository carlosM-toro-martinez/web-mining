import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
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
import {
  useAjustarSaldoMensualTotalMutation,
  useImportarAjusteInicialSaldoMensualExcelMutation,
  useAjustarProductosMesMutation
} from "@/features/inventario-import/hooks/useInventarioImport";
import type { AjusteProductosMesPayload } from "@/features/inventario-import/model/inventarioImport.schema";
import type { Producto } from "@/features/productos/model/producto.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { normalizeSpreadsheetRow, readSpreadsheetSheets } from "@/shared/lib/spreadsheetImport";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallbackMessage;
}

function parseSpreadsheetNumber(value: string) {
  const raw = value.trim();
  if (!raw) return undefined;
  const normalized =
    raw.includes(",") && raw.includes(".")
      ? raw.lastIndexOf(",") > raw.lastIndexOf(".")
        ? raw.replace(/\./g, "").replace(",", ".")
        : raw.replace(/,/g, "")
      : raw.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function spreadsheetValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]?.trim();
    if (value) return value;
  }
  return "";
}

function spreadsheetNumber(row: Record<string, string>, keys: string[]) {
  const value = spreadsheetValue(row, keys);
  return value ? parseSpreadsheetNumber(value) : undefined;
}

const ajusteExcelColumns = [
  "codigo",
  "precioUnit",
  "saldoInicial",
  "ingresoQty",
  "salidaQty",
  "saldoFinal",
  "totalBsInicial",
  "totalBs"
];

export function ProductsPage() {
  const { user } = useAuth();
  const canManage =
    user?.role === "ADMIN" || user?.role === "ALMACENERO" || user?.role === "RECEPCIONISTA";
  const { showError, showSuccess } = useToast();

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
  const ajustarSaldoTotalMutation = useAjustarSaldoMensualTotalMutation();
  const importarAjusteInicialExcelMutation = useImportarAjusteInicialSaldoMensualExcelMutation();
  const ajustarProductosMesMutation = useAjustarProductosMesMutation();

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
  const [isAjusteTotalModalOpen, setIsAjusteTotalModalOpen] = useState(false);
  const [isAjusteProductosMesModalOpen, setIsAjusteProductosMesModalOpen] = useState(false);
  const now = new Date();
  const [ajusteProductoId, setAjusteProductoId] = useState("");
  const [ajusteAnio, setAjusteAnio] = useState(String(now.getFullYear()));
  const [ajusteMes, setAjusteMes] = useState(String(now.getMonth() + 1));
  const [ajusteSaldoInicial, setAjusteSaldoInicial] = useState("");
  const [ajustePrecioUnit, setAjustePrecioUnit] = useState("");
  const [ajusteTotalBsInicial, setAjusteTotalBsInicial] = useState("");
  const [ajusteTotalBs, setAjusteTotalBs] = useState("");
  const [ajusteTotalBsProm, setAjusteTotalBsProm] = useState("");
  const [isAjusteMasivoImporting, setIsAjusteMasivoImporting] = useState(false);
  const [ajusteMasivoStatus, setAjusteMasivoStatus] = useState("");
  const [ajusteProductosMesAnio, setAjusteProductosMesAnio] = useState(String(now.getFullYear()));
  const [ajusteProductosMesMes, setAjusteProductosMesMes] = useState(String(now.getMonth() + 1));
  const [isAjusteProductosMesImporting, setIsAjusteProductosMesImporting] = useState(false);
  const [ajusteProductosMesStatus, setAjusteProductosMesStatus] = useState("");

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
  const ajusteProductoOptions = useMemo(
    () =>
      products.map((producto) => ({
        id: String(producto.id),
        label: `${producto.codigo} - ${producto.nombre}`,
        searchText: `${producto.codigo} ${producto.nombre}`
      })),
    [products]
  );

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

    const parsedGrupoId = grupoId ? Number(grupoId) : undefined;
    const parsedSubgrupoId = subgrupoId ? Number(subgrupoId) : undefined;
    const parsedCentroCostoId = centroCostoIdForm ? Number(centroCostoIdForm) : undefined;
    const parsedFuncionGastoId = funcionGastoIdForm ? Number(funcionGastoIdForm) : undefined;
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

  function openAjusteTotalModal() {
    setIsAjusteTotalModalOpen(true);
    setAjusteProductoId("");
    setAjusteAnio(String(now.getFullYear()));
    setAjusteMes(String(now.getMonth() + 1));
    setAjusteSaldoInicial("");
    setAjustePrecioUnit("");
    setAjusteTotalBsInicial("");
    setAjusteTotalBs("");
    setAjusteTotalBsProm("");
    setAjusteMasivoStatus("");
  }

  function openAjusteProductosMesModal() {
    setIsAjusteProductosMesModalOpen(true);
    setAjusteProductosMesAnio(String(now.getFullYear()));
    setAjusteProductosMesMes(String(now.getMonth() + 1));
    setAjusteProductosMesStatus("");
  }

  function handleAjustarTotalHistorico(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (user?.role !== "ADMIN") {
      showError("Solo ADMIN puede usar esta correccion.");
      return;
    }
    const productoId = Number(ajusteProductoId);
    const anio = Number(ajusteAnio);
    const mes = Number(ajusteMes);
    const ajusteValores = {
      saldoInicial: ajusteSaldoInicial.trim() ? Number(ajusteSaldoInicial) : undefined,
      precioUnit: ajustePrecioUnit.trim() ? Number(ajustePrecioUnit) : undefined,
      totalBsInicial: ajusteTotalBsInicial.trim() ? Number(ajusteTotalBsInicial) : undefined,
      totalBs: ajusteTotalBs.trim() ? Number(ajusteTotalBs) : undefined,
      totalBsProm: ajusteTotalBsProm.trim() ? Number(ajusteTotalBsProm) : undefined
    };
    const selectedProduct = products.find((producto) => producto.id === productoId);

    if (!productoId || !selectedProduct) {
      showError("Selecciona un producto valido.");
      return;
    }
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      showError("Indica un año y mes validos.");
      return;
    }
    const ajusteEntries = Object.entries(ajusteValores).filter(([, value]) => value !== undefined);
    if (!ajusteEntries.length) {
      showError("Indica al menos un campo de ajuste.");
      return;
    }
    const invalidField = ajusteEntries.find(
      ([, value]) => typeof value !== "number" || !Number.isFinite(value) || value < 0
    );
    if (invalidField) {
      showError("Todos los valores de ajuste deben ser números validos mayores o iguales a cero.");
      return;
    }

    ajustarSaldoTotalMutation.mutate(
      {
        productoId,
        productoCodigo: selectedProduct.codigo,
        anio,
        mes,
        ajuste: Object.fromEntries(ajusteEntries)
      },
      {
        onSuccess: (response) => {
          const detalleTotal =
            response.data.totalBsAnterior !== undefined && response.data.totalBsNuevo !== undefined
              ? ` Antes: Bs. ${response.data.totalBsAnterior}. Nuevo: Bs. ${response.data.totalBsNuevo}.`
              : "";
          showSuccess(`Ajuste histórico aplicado correctamente.${detalleTotal}`);
          setIsAjusteTotalModalOpen(false);
        },
        onError: (error) =>
          showError(normalizeError(error, "No se pudo ajustar el total histórico del producto."))
      }
    );
  }

  async function handleImportAjustesTotales(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (user?.role !== "ADMIN") {
      showError("Solo ADMIN puede usar esta correccion.");
      return;
    }

    const anio = Number(ajusteAnio);
    const mes = Number(ajusteMes);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      showError("Indica un año y mes validos antes de importar.");
      return;
    }

    try {
      setIsAjusteMasivoImporting(true);
      setAjusteMasivoStatus("Subiendo archivo...");
      const response = await importarAjusteInicialExcelMutation.mutateAsync({ file, anio, mes });
      const errors = response.data.resultados
        .filter((resultado) => !resultado.ok)
        .map(
          (resultado) =>
            `Fila ${resultado.fila}: ${resultado.codigo} - ${
              resultado.error ?? "No se pudo aplicar el ajuste."
            }`
        );
      setAjusteMasivoStatus("");
      showSuccess(
        `Importacion finalizada. Procesados: ${response.data.procesados}, exitosos: ${response.data.exitosos}, fallidos: ${response.data.fallidos}.`
      );
      if (errors.length) {
        showError(errors.slice(0, 4).join(" | "));
      }
    } catch (error) {
      showError(normalizeError(error, "No se pudo procesar el archivo de ajustes."));
    } finally {
      setIsAjusteMasivoImporting(false);
    }
  }

  async function handleImportAjusteProductosMes(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (user?.role !== "ADMIN") {
      showError("Solo ADMIN puede usar esta correccion.");
      return;
    }

    const anio = Number(ajusteProductosMesAnio);
    const mes = Number(ajusteProductosMesMes);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      showError("Indica un año y mes validos antes de importar.");
      return;
    }

    try {
      setIsAjusteProductosMesImporting(true);
      setAjusteProductosMesStatus("Leyendo archivo...");
      const sheets = await readSpreadsheetSheets(file);
      const sourceRows = sheets[0]?.rows ?? [];
      if (!sourceRows.length) {
        showError("El archivo no tiene filas para importar.");
        return;
      }

      const productos: AjusteProductosMesPayload["productos"] = [];
      const errors: string[] = [];
      sourceRows.map((row) => normalizeSpreadsheetRow(row)).forEach((row, index) => {
        const fila = index + 2;
        const productoCodigo = spreadsheetValue(row, ["codigo", "productocodigo", "codigoproducto"]);
        const productoId = spreadsheetNumber(row, ["productoid", "idproducto"]);
        const item = {
          productoCodigo: productoCodigo || undefined,
          productoId,
          precioUnit: spreadsheetNumber(row, ["preciounit", "preciounitario"]),
          saldoInicial: spreadsheetNumber(row, ["saldoinicial"]),
          ingresoQty: spreadsheetNumber(row, ["ingresoqty", "ingreso", "ingresos"]),
          salidaQty: spreadsheetNumber(row, ["salidaqty", "salida", "salidas"]),
          saldoFinal: spreadsheetNumber(row, ["saldofinal"]),
          totalBsInicial: spreadsheetNumber(row, ["totalbsinicial"]),
          totalBs: spreadsheetNumber(row, ["totalbs"])
        };
        const hasProduct = Boolean(item.productoCodigo || item.productoId);
        const hasAdjustment = Object.entries(item).some(
          ([key, value]) => key !== "productoCodigo" && key !== "productoId" && value !== undefined
        );
        if (!hasProduct && !hasAdjustment) return;
        if (!hasProduct) {
          errors.push(`Fila ${fila}: falta codigo.`);
          return;
        }
        if (!hasAdjustment) {
          errors.push(`Fila ${fila}: falta al menos un campo de ajuste.`);
          return;
        }
        productos.push(item);
      });

      if (!productos.length) {
        showError(errors[0] ?? "No se encontraron productos válidos para ajustar.");
        return;
      }

      setAjusteProductosMesStatus("Aplicando ajustes...");
      const response = await ajustarProductosMesMutation.mutateAsync({ anio, mes, productos });
      const serverErrors = response.data
        .filter((resultado) => !resultado.ok)
        .map(
          (resultado) =>
            `${resultado.productoCodigo ?? resultado.productoId ?? "Producto"} - ${
              resultado.error ?? "No se pudo aplicar el ajuste."
            }`
        );
      const okCount = response.data.filter((resultado) => resultado.ok).length;
      const failCount = serverErrors.length + errors.length;
      setAjusteProductosMesStatus("");
      showSuccess(
        `Importacion finalizada. Procesados: ${productos.length}, exitosos: ${okCount}, fallidos: ${failCount}.`
      );
      if (errors.length || serverErrors.length) {
        showError([...errors, ...serverErrors].slice(0, 4).join(" | "));
      }
    } catch (error) {
      showError(normalizeError(error, "No se pudo procesar el archivo de ajustes."));
    } finally {
      setIsAjusteProductosMesImporting(false);
    }
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
              <>
                <button
                  type="button"
                  onClick={openAjusteTotalModal}
                  className="flex items-center gap-2 rounded-lg border border-[var(--color-error)]/55 px-4 py-2.5 text-sm font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10"
                >
                  Correccion historica
                </button>
                <button
                  type="button"
                  onClick={openAjusteProductosMesModal}
                  className="flex items-center gap-2 rounded-lg border border-[var(--color-primary)]/55 px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
                >
                  Ajuste productos mes
                </button>
              </>
            ) : null}
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
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-7"
          onSubmit={(event) => event.preventDefault()}
        >
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

                {!productosQuery.isLoading &&
                !productosQuery.isError &&
                paginatedProducts.length === 0 ? (
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

      {isAjusteTotalModalOpen && user?.role === "ADMIN" ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <h3 className="text-lg font-bold">Corregir total mensual historico</h3>
            <p className="mt-1 text-xs text-[var(--color-error)]">
              Esta accion ajusta el total Bs. del saldo mensual, incluso en periodos cerrados.
            </p>
            <form className="mt-4 space-y-3" onSubmit={handleAjustarTotalHistorico}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Año
                  </label>
                  <input
                    required
                    type="number"
                    min="2000"
                    max="2100"
                    value={ajusteAnio}
                    onChange={(event) => setAjusteAnio(event.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Mes
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="12"
                    value={ajusteMes}
                    onChange={(event) => setAjusteMes(event.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Producto
                </label>
                <AutocompleteSelect
                  value={ajusteProductoId}
                  onChange={setAjusteProductoId}
                  options={ajusteProductoOptions}
                  placeholder="Busca por código o nombre"
                  className={inputClassName}
                  maxVisibleOptions={40}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Saldo inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={ajusteSaldoInicial}
                    onChange={(event) => setAjusteSaldoInicial(event.target.value)}
                    className={inputClassName}
                    placeholder="31257"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Precio unitario
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.000001"
                    value={ajustePrecioUnit}
                    onChange={(event) => setAjustePrecioUnit(event.target.value)}
                    className={inputClassName}
                    placeholder="9.739094"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Total Bs. inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ajusteTotalBsInicial}
                    onChange={(event) => setAjusteTotalBsInicial(event.target.value)}
                    className={inputClassName}
                    placeholder="304413.49"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Total Bs. cierre
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ajusteTotalBs}
                    onChange={(event) => setAjusteTotalBs(event.target.value)}
                    className={inputClassName}
                    placeholder="304413.49"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Total Bs. promedio cierre
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ajusteTotalBsProm}
                    onChange={(event) => setAjusteTotalBsProm(event.target.value)}
                    className={inputClassName}
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Ajuste masivo por Excel/CSV
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImportAjustesTotales}
                  disabled={
                    isAjusteMasivoImporting ||
                    ajustarSaldoTotalMutation.isPending ||
                    importarAjusteInicialExcelMutation.isPending
                  }
                  className={inputClassName}
                />
                <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">
                  Columna requerida: codigo. Puedes incluir cualquier combinación de:
                  totalBsInicial, precioUnit, saldoInicial, totalBs, totalBsProm. Se aplicará al
                  año y mes seleccionados arriba.
                </p>
                {ajusteMasivoStatus ? (
                  <p className="mt-2 text-xs font-semibold text-[var(--color-primary)]">
                    {ajusteMasivoStatus}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAjusteTotalModalOpen(false)}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    ajustarSaldoTotalMutation.isPending ||
                    isAjusteMasivoImporting ||
                    importarAjusteInicialExcelMutation.isPending
                  }
                  className="rounded-lg bg-[var(--color-error)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {ajustarSaldoTotalMutation.isPending ||
                  isAjusteMasivoImporting ||
                  importarAjusteInicialExcelMutation.isPending
                    ? "Aplicando..."
                    : "Aplicar correccion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {isAjusteProductosMesModalOpen && user?.role === "ADMIN" ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <h3 className="text-lg font-bold">Ajuste productos por mes</h3>
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
              Sube un Excel para ajustar varios productos con el endpoint nuevo. Los campos no enviados se conservan en el servidor.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Año
                </label>
                <input
                  required
                  type="number"
                  min="2000"
                  max="2100"
                  value={ajusteProductosMesAnio}
                  onChange={(event) => setAjusteProductosMesAnio(event.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Mes
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  max="12"
                  value={ajusteProductosMesMes}
                  onChange={(event) => setAjusteProductosMesMes(event.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Excel de ajustes
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportAjusteProductosMes}
                disabled={isAjusteProductosMesImporting || ajustarProductosMesMutation.isPending}
                className={inputClassName}
              />
              <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">
                Columnas: {ajusteExcelColumns.join(", ")}. Requerida: codigo. Puedes incluir solo
                los campos que quieras ajustar.
              </p>
              {ajusteProductosMesStatus ? (
                <p className="mt-2 text-xs font-semibold text-[var(--color-primary)]">
                  {ajusteProductosMesStatus}
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAjusteProductosMesModalOpen(false)}
                className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
