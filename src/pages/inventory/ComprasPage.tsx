import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  PackagePlus,
  ShoppingCart,
  Upload,
  Plus
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useAnulacionesHistorialQuery,
  useAnularCompraMutation,
  useCompraByIdQuery,
  useComprasQuery,
  useCreateCompraMutation,
  useRecibirCompraMutation
} from "@/features/compras/hooks/useCompras";
import { createCompra } from "@/features/compras/api/comprasApi";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import { useProveedoresQuery } from "@/features/proveedores/hooks/useProveedores";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { CreateProveedorModal } from "@/shared/ui/CreateProveedorModal";
import { CreateProductoModal } from "@/shared/ui/CreateProductoModal";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { queryKeys } from "@/shared/lib/queryKeys";
import {
  useInventoryOfflinePendingCount,
  useSyncInventoryOfflineMutation
} from "@/features/inventory-offline/hooks/useInventoryOffline";
import { normalizeSpreadsheetRow, readSpreadsheetSheets } from "@/shared/lib/spreadsheetImport";
import {
  downloadComprasCsvTemplate,
  downloadComprasExcelTemplate
} from "@/shared/lib/importTemplates";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

interface CompraDraftItem {
  id: number;
  productoId: string;
  cantidadPedida: string;
  precioUnit: string;
  precioGlobal: string;
  usePrecioGlobal: boolean;
}

function computePrecioUnit(item: CompraDraftItem): number {
  if (!item.usePrecioGlobal) return Number(item.precioUnit);
  const total = Number(item.precioGlobal);
  const qty = Number(item.cantidadPedida);
  if (!qty || !Number.isFinite(total) || !Number.isFinite(qty)) return 0;
  return total / qty;
}

interface CompraGroupDraft {
  referencia: string;
  proveedorId: number;
  observacion?: string;
  items: Array<{
    productoId: number;
    cantidadPedida: number;
    precioUnit: number;
  }>;
}

const IMPORT_BATCH_SIZE = 10;
const IMPORT_MAX_ITEMS_PER_COMPRA = 40;

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function estadoClassName(estado: string) {
  if (estado === "COMPLETADO") {
    return "border-[var(--color-success)]/35 bg-[var(--color-success)]/18 text-[var(--color-success)]";
  }
  if (estado === "PARCIAL") {
    return "border-[var(--color-tertiary)]/35 bg-[var(--color-tertiary)]/18 text-[var(--color-tertiary)]";
  }
  if (estado === "ANULADA") {
    return "border-[var(--color-error)]/35 bg-[var(--color-error)]/18 text-[var(--color-error)]";
  }
  return "border-[var(--color-warning)]/35 bg-[var(--color-warning)]/18 text-[var(--color-warning)]";
}

export function ComprasPage() {
  const { user } = useAuth();
  const canManage =
    user?.role === "ADMIN" || user?.role === "ALMACENERO" || user?.role === "RECEPCIONISTA";
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const pendingOfflineQuery = useInventoryOfflinePendingCount();
  const syncOfflineMutation = useSyncInventoryOfflineMutation();

  const productosQuery = useProductosQuery({ page: 1, limit: 5000, search: "" });
  const [listPage, setListPage] = useState(1);
  const [listLimit] = useState(10);
  const [estadoFilter, setEstadoFilter] = useState("");
  const [proveedorFilterId, setProveedorFilterId] = useState("");

  const proveedoresQuery = useProveedoresQuery({
    page: 1,
    limit: 500,
    search: undefined
  });

  const comprasQuery = useComprasQuery({
    page: listPage,
    limit: listLimit,
    estado: estadoFilter || undefined,
    proveedorId: proveedorFilterId ? Number(proveedorFilterId) : undefined
  });

  const createCompraMutation = useCreateCompraMutation();
  const recibirCompraMutation = useRecibirCompraMutation();
  const anularCompraMutation = useAnularCompraMutation();
  const anulacionesHistorialQuery = useAnulacionesHistorialQuery();

  const [proveedorId, setProveedorId] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [observacion, setObservacion] = useState("");
  const [draftItems, setDraftItems] = useState<CompraDraftItem[]>([
    { id: 1, productoId: "", cantidadPedida: "1", precioUnit: "", precioGlobal: "", usePrecioGlobal: false }
  ]);
  const [nextDraftItemId, setNextDraftItemId] = useState(2);

  const [selectedCompraId, setSelectedCompraId] = useState("");
  const compraDetailQuery = useCompraByIdQuery(selectedCompraId);
  const selectedCompra = compraDetailQuery.data?.data;

  const [cantidadesRecibidas, setCantidadesRecibidas] = useState<Record<string, string>>({});
  const [isCreateProveedorModalOpen, setIsCreateProveedorModalOpen] = useState(false);
  const [isCreateProductoModalOpen, setIsCreateProductoModalOpen] = useState(false);
  const [anularMotivo, setAnularMotivo] = useState("");
  const [showAnularForm, setShowAnularForm] = useState(false);

  const canAnular = user?.role === "ADMIN" || user?.role === "SUPERINTENDENTE";

  const productos = productosQuery.data?.data ?? [];
  const proveedores = proveedoresQuery.data?.data ?? [];
  const compras = comprasQuery.data?.data ?? [];
  const comprasMeta = comprasQuery.data?.meta;
  const proveedoresOrdenados = useMemo(
    () =>
      [...proveedores].sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })
      ),
    [proveedores]
  );

  const comprasOrdenadas = useMemo(
    () =>
      [...compras].sort((a, b) => {
        const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return right - left;
      }),
    [compras]
  );
  const productoOptions = useMemo(
    () =>
      productos.map((producto) => ({
        id: String(producto.id),
        label: `${producto.codigo} - ${producto.nombre} (${producto.unidad})`,
        searchText: `${producto.codigo} ${producto.nombre} ${producto.unidad}`
      })),
    [productos]
  );

  useEffect(() => {
    if (!selectedCompra) return;
    const initial: Record<string, string> = {};
    selectedCompra.items.forEach((item) => {
      const pending = Math.max(item.cantidadPedida - (item.cantidadRecibida ?? 0), 0);
      initial[item.id] = String(pending);
    });
    setCantidadesRecibidas(initial);
  }, [selectedCompra]);

  function addDraftItem() {
    setDraftItems((current) => [
      ...current,
      { id: nextDraftItemId, productoId: "", cantidadPedida: "1", precioUnit: "", precioGlobal: "", usePrecioGlobal: false }
    ]);
    setNextDraftItemId((current) => current + 1);
  }

  function updateDraftItem(id: number, patch: Partial<CompraDraftItem>) {
    setDraftItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function removeDraftItem(id: number) {
    setDraftItems((current) => {
      if (current.length <= 1) return current;
      return current.filter((item) => item.id !== id);
    });
  }

  function handleCreateCompra(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      showError("No tienes permisos para crear compras.");
      return;
    }

    const payload = {
      proveedorId: Number(proveedorId),
      numeroFactura: numeroFactura.trim() || undefined,
      observacion: observacion.trim() || undefined,
      items: draftItems.map((item) => ({
        productoId: Number(item.productoId),
        cantidadPedida: Number(item.cantidadPedida),
        precioUnit: computePrecioUnit(item)
      }))
    };

    if (!payload.proveedorId) {
      showError("Debes ingresar un proveedorId valido.");
      return;
    }

    if (
      payload.items.some(
        (item) =>
          !item.productoId ||
          !item.cantidadPedida ||
          item.cantidadPedida <= 0 ||
          !item.precioUnit ||
          item.precioUnit <= 0
      )
    ) {
      showError("Completa producto, cantidad y precio unitario en todos los items.");
      return;
    }

    createCompraMutation.mutate(payload, {
      onSuccess: (response) => {
        showSuccess("Pedido de compra creado correctamente.");
        setSelectedCompraId(response.data.id);
        setProveedorId("");
        setNumeroFactura("");
        setObservacion("");
        setDraftItems([{ id: 1, productoId: "", cantidadPedida: "1", precioUnit: "", precioGlobal: "", usePrecioGlobal: false }]);
        setNextDraftItemId(2);
      },
      onError: (error) => showError(normalizeError(error, "No se pudo crear la compra."))
    });
  }

  function handleRecibirCompra(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCompra) return;

    const cantidades: Record<string, number> = {};
    let hasPositive = false;

    for (const item of selectedCompra.items) {
      const pending = Math.max(item.cantidadPedida - (item.cantidadRecibida ?? 0), 0);
      const value = Number(cantidadesRecibidas[item.id] ?? 0);

      if (Number.isNaN(value) || value < 0) {
        showError("Las cantidades recibidas deben ser mayores o iguales a cero.");
        return;
      }
      if (value > pending) {
        showError("No puedes recibir mas de lo pendiente por item.");
        return;
      }

      cantidades[item.id] = value;
      if (value > 0) hasPositive = true;
    }

    if (!hasPositive) {
      showError("Debes recibir al menos un item con cantidad mayor a cero.");
      return;
    }

    recibirCompraMutation.mutate(
      {
        id: selectedCompra.id,
        payload: { cantidadesRecibidas: cantidades },
        stockAdjustments: selectedCompra.items
          .map((item) => ({
            productoId: item.productoId,
            deltaCantidad: Number(cantidades[item.id] ?? 0)
          }))
          .filter((item) => item.deltaCantidad > 0)
      },
      {
        onSuccess: (response) => {
          showSuccess(
            `Recepcion registrada. Estado: ${response.data.compra.estado}. Movimientos: ${response.data.movimientos.length}.`
          );
        }
      }
    );
  }

  function openImportDialog() {
    importInputRef.current?.click();
  }

  function splitItems(items: CompraGroupDraft["items"]) {
    const chunks: CompraGroupDraft["items"][] = [];
    for (let index = 0; index < items.length; index += IMPORT_MAX_ITEMS_PER_COMPRA) {
      chunks.push(items.slice(index, index + IMPORT_MAX_ITEMS_PER_COMPRA));
    }
    return chunks;
  }

  async function processGroupsInBatches(groups: CompraGroupDraft[]) {
    let created = 0;
    let failed = 0;
    let processed = 0;
    const total = groups.length;
    const errors: string[] = [];

    for (let index = 0; index < groups.length; index += IMPORT_BATCH_SIZE) {
      const batch = groups.slice(index, index + IMPORT_BATCH_SIZE);

      for (const group of batch) {
        try {
          await createCompra({
            proveedorId: group.proveedorId,
            observacion: group.observacion,
            items: group.items
          });
          created += 1;
        } catch (error) {
          failed += 1;
          errors.push(
            `${group.referencia}: ${normalizeError(error, "No se pudo registrar la compra.")}`
          );
        } finally {
          processed += 1;
        }
      }

      if (processed < total) {
        showSuccess(`Importacion en progreso: ${processed}/${total} compras procesadas...`);
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    return { created, failed, errors };
  }

  async function handleImportCompras(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!canManage) {
      showError("No tienes permisos para importar compras.");
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

      const proveedorById = new Map(proveedores.map((item) => [item.id, item]));
      const proveedorByNit = new Map(
        proveedores
          .filter((item) => item.nit)
          .map((item) => [String(item.nit).replace(/\D/g, ""), item])
      );
      const proveedorByName = new Map(
        proveedores.map((item) => [item.nombre.trim().toUpperCase(), item])
      );
      const productoByCode = new Map(
        productos.map((item) => [item.codigo.trim().toUpperCase(), item])
      );

      const groupsMap = new Map<string, CompraGroupDraft>();
      let invalidRows = 0;
      const rowErrors: string[] = [];

      for (const [rowIndex, sourceRow] of sourceRows.entries()) {
        const rowNumber = rowIndex + 2;
        const row = normalizeSpreadsheetRow(sourceRow);

        const referencia = (row.referenciacompra || row.referencia || `AUTO-${rowNumber}`)
          .trim()
          .toUpperCase();
        const proveedorIdRaw = Number(row.proveedorid || 0);
        const proveedorNitRaw = (row.proveedornit || "").replace(/\D/g, "");
        const proveedorNombreRaw = (row.proveedornombre || "").trim().toUpperCase();
        const productoCodigo = (row.productocodigo || "").trim().toUpperCase();
        const cantidadPedida = Number(row.cantidadpedida || row.cantidad || 0);
        const precioUnit = Number(row.preciounit || row.preciounitario || row.precio || 0);
        const observacion = (row.observacion || "").trim();

        const proveedor =
          (proveedorIdRaw ? proveedorById.get(proveedorIdRaw) : undefined) ||
          (proveedorNitRaw ? proveedorByNit.get(proveedorNitRaw) : undefined) ||
          (proveedorNombreRaw ? proveedorByName.get(proveedorNombreRaw) : undefined);

        const producto = productoCodigo ? productoByCode.get(productoCodigo) : undefined;

        if (!proveedor) {
          invalidRows += 1;
          rowErrors.push(`Fila ${rowNumber}: proveedor no encontrado.`);
          continue;
        }
        if (!producto) {
          invalidRows += 1;
          rowErrors.push(`Fila ${rowNumber}: producto no encontrado (${productoCodigo || "-"})`);
          continue;
        }
        if (!Number.isFinite(cantidadPedida) || cantidadPedida <= 0) {
          invalidRows += 1;
          rowErrors.push(`Fila ${rowNumber}: cantidad invalida.`);
          continue;
        }
        if (!Number.isFinite(precioUnit) || precioUnit <= 0) {
          invalidRows += 1;
          rowErrors.push(`Fila ${rowNumber}: precio unitario invalido.`);
          continue;
        }

        const groupKey = `${referencia}::${proveedor.id}`;
        const existing = groupsMap.get(groupKey);
        if (!existing) {
          groupsMap.set(groupKey, {
            referencia,
            proveedorId: proveedor.id,
            observacion: observacion || referencia,
            items: [
              {
                productoId: producto.id,
                cantidadPedida,
                precioUnit
              }
            ]
          });
          continue;
        }

        existing.items.push({
          productoId: producto.id,
          cantidadPedida,
          precioUnit
        });
      }

      const groups: CompraGroupDraft[] = [];
      for (const group of groupsMap.values()) {
        const itemChunks = splitItems(group.items);
        if (itemChunks.length <= 1) {
          groups.push(group);
          continue;
        }

        itemChunks.forEach((chunk, chunkIndex) => {
          groups.push({
            referencia: `${group.referencia}-L${chunkIndex + 1}`,
            proveedorId: group.proveedorId,
            observacion: `${group.observacion ?? group.referencia} | Lote ${chunkIndex + 1}/${itemChunks.length}`,
            items: chunk
          });
        });
      }

      if (!groups.length) {
        showError("No hay compras validas para importar.");
        return;
      }

      const result = await processGroupsInBatches(groups);
      await queryClient.invalidateQueries({ queryKey: queryKeys.compras.all });

      showSuccess(
        `Importacion finalizada. Compras creadas: ${result.created}, fallidas: ${result.failed}, filas invalidas: ${invalidRows}.`
      );

      const allErrors = [...rowErrors, ...result.errors];
      if (allErrors.length) {
        showError(allErrors.slice(0, 4).join(" | "));
      }
    } catch (error) {
      showError(normalizeError(error, "No se pudo procesar el archivo de compras."));
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
              <ShoppingCart size={18} />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-extrabold">Compras</h1>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Crea pedidos, controla estado de recepcion y registra entradas de inventario
                vinculadas automaticamente a la compra.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                syncOfflineMutation.mutate(undefined, {
                  onSuccess: () => showSuccess("Sincronización offline ejecutada."),
                  onError: () => showError("No se pudo ejecutar la sincronización offline.")
                })
              }
              disabled={syncOfflineMutation.isPending}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              Reintentar sync ({pendingOfflineQuery.data ?? 0})
            </button>
            <button
              type="button"
              onClick={openImportDialog}
              disabled={!canManage || isImporting}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-50"
            >
              <Upload size={13} />
              {isImporting ? "Importando..." : "Importar CSV/Excel"}
            </button>
            <button
              type="button"
              onClick={downloadComprasCsvTemplate}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              <Download size={13} />
              Plantilla CSV
            </button>
            <button
              type="button"
              onClick={downloadComprasExcelTemplate}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)] transition hover:opacity-90"
            >
              <FileSpreadsheet size={13} />
              Plantilla Excel
            </button>
          </div>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleImportCompras}
          className="hidden"
        />
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <PackagePlus size={16} className="text-[var(--color-primary)]" />
            Crear pedido de compra
          </h2>

          <form className="space-y-3" onSubmit={handleCreateCompra}>
            <div className="flex gap-2">
              <select
                required
                value={proveedorId}
                onChange={(event) => setProveedorId(event.target.value)}
                className={inputClassName}
                disabled={!canManage || proveedoresQuery.isLoading}
              >
                <option value="">
                  {proveedoresQuery.isLoading ? "Cargando proveedores..." : "Selecciona proveedor"}
                </option>
                {proveedoresOrdenados.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                    {proveedor.lugar ? ` - ${proveedor.lugar}` : ""}
                    {proveedor.nit ? ` - NIT ${proveedor.nit}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsCreateProveedorModalOpen(true)}
                disabled={!canManage}
                className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2.5 text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
                title="Crear nuevo proveedor"
              >
                <Plus size={18} />
              </button>
            </div>
            {!proveedoresQuery.isLoading && proveedoresOrdenados.length === 0 ? (
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                No hay proveedores registrados. Crea uno haciendo clic en el botón &quot;+&quot; o
                ve a{" "}
                <Link
                  to="/inventario/proveedores"
                  className="font-semibold text-[var(--color-primary)] hover:underline"
                >
                  Proveedores
                </Link>
              </p>
            ) : null}
            <input
              type="text"
              value={numeroFactura}
              onChange={(event) => setNumeroFactura(event.target.value)}
              className={inputClassName}
              placeholder="Número de factura (opcional)"
              disabled={!canManage}
            />
            <textarea
              value={observacion}
              onChange={(event) => setObservacion(event.target.value)}
              className={`${inputClassName} min-h-[84px]`}
              placeholder="Observacion"
              disabled={!canManage}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateProductoModalOpen(true)}
                className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2.5 text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
                disabled={!canManage}
              >
                <Plus size={18} />
              </button>
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                Crear producto nuevo
              </span>
            </div>

            {draftItems.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-1 gap-2 rounded-lg bg-[var(--color-surface-container-high)] p-3 md:grid-cols-[1fr_160px_160px_auto]"
              >
                <AutocompleteSelect
                  value={item.productoId}
                  onChange={(nextValue) => updateDraftItem(item.id, { productoId: nextValue })}
                  options={productoOptions}
                  placeholder={`Producto #${index + 1}`}
                  className={inputClassName}
                  disabled={!canManage}
                />
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.cantidadPedida}
                  onChange={(event) =>
                    updateDraftItem(item.id, { cantidadPedida: event.target.value })
                  }
                  className={inputClassName}
                  placeholder={`Cantidad (${productos.find((producto) => producto.id === Number(item.productoId))?.unidad ?? "unidad"})`}
                  disabled={!canManage}
                />
                <div className="flex flex-col gap-1">
                  <input
                    required={!item.usePrecioGlobal}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.usePrecioGlobal ? item.precioGlobal : item.precioUnit}
                    onChange={(event) =>
                      updateDraftItem(
                        item.id,
                        item.usePrecioGlobal
                          ? { precioGlobal: event.target.value }
                          : { precioUnit: event.target.value }
                      )
                    }
                    className={inputClassName}
                    placeholder={item.usePrecioGlobal ? "Total factura Bs." : "Precio unit. Bs."}
                    disabled={!canManage}
                  />
                  {item.usePrecioGlobal ? (
                    <p className="pl-1 text-[11px] font-semibold text-[var(--color-primary)]">
                      ={" "}
                      {Number(item.cantidadPedida) > 0 && Number(item.precioGlobal) > 0
                        ? `Bs. ${(Number(item.precioGlobal) / Number(item.cantidadPedida)).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} / unidad`
                        : "ingresa cantidad y total"}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      updateDraftItem(item.id, {
                        usePrecioGlobal: !item.usePrecioGlobal,
                        precioGlobal: "",
                        precioUnit: ""
                      })
                    }
                    disabled={!canManage}
                    tabIndex={-1}
                    className={`self-start rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                      item.usePrecioGlobal
                        ? "border-[var(--color-primary)]/50 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                        : "border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    }`}
                  >
                    {item.usePrecioGlobal ? "÷ Precio unitario" : "÷ Desde total"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeDraftItem(item.id)}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                  disabled={!canManage}
                >
                  Quitar
                </button>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addDraftItem}
                className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
                disabled={!canManage}
              >
                Agregar item
              </button>
              <button
                type="submit"
                disabled={
                  !canManage || createCompraMutation.isPending || proveedoresOrdenados.length === 0
                }
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
              >
                {createCompraMutation.isPending ? "Guardando..." : "Crear compra"}
              </button>
            </div>
          </form>
        </article>

        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 text-lg font-bold">Listado de compras</h2>
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            <select
              value={estadoFilter}
              onChange={(event) => {
                setEstadoFilter(event.target.value);
                setListPage(1);
              }}
              className={inputClassName}
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="PARCIAL">PARCIAL</option>
              <option value="COMPLETADO">COMPLETADO</option>
            </select>
            <select
              value={proveedorFilterId}
              onChange={(event) => {
                setProveedorFilterId(event.target.value);
                setListPage(1);
              }}
              className={inputClassName}
            >
              <option value="">Todos los proveedores</option>
              {proveedoresOrdenados.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setEstadoFilter("");
                setProveedorFilterId("");
                setListPage(1);
              }}
              className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              Limpiar
            </button>
          </div>

          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Estado
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Proveedor
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Fecha
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Accion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {comprasQuery.isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Cargando compras...
                    </td>
                  </tr>
                ) : null}
                {!comprasQuery.isLoading && comprasOrdenadas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      No se encontraron compras.
                    </td>
                  </tr>
                ) : null}
                {comprasOrdenadas.map((compra) => (
                  <tr
                    key={compra.id}
                    className="transition hover:bg-[var(--color-surface-container-highest)]"
                  >
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${estadoClassName(compra.estado)}`}
                      >
                        {compra.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="font-semibold text-[var(--color-on-surface)]">
                        {compra.proveedor?.nombre ?? "-"}
                      </div>
                      <div className="text-[11px] text-[var(--color-on-surface-variant)]">
                        {compra.proveedor?.lugar ?? "Lugar no definido"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                      {compra.createdAt ? new Date(compra.createdAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCompraId(compra.id)}
                        className="rounded-md border border-[var(--color-primary)]/45 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-[var(--color-on-surface-variant)]">
              {comprasMeta ? `Pagina ${comprasMeta.page} de ${comprasMeta.totalPages}` : "-"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setListPage((current) => Math.max(1, current - 1))}
                disabled={!comprasMeta || listPage <= 1}
                className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setListPage((current) =>
                    comprasMeta && current < comprasMeta.totalPages ? current + 1 : current
                  )
                }
                disabled={!comprasMeta || listPage >= comprasMeta.totalPages}
                className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </article>
      </div>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 text-lg font-bold">Detalle y recepcion de compra</h2>
        {!selectedCompraId ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            Selecciona una compra de la lista para revisar items y confirmar recepcion.
          </p>
        ) : null}
        {compraDetailQuery.isLoading ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando detalle...</p>
        ) : null}
        {compraDetailQuery.isError ? (
          <p className="text-sm text-[var(--color-error)]">
            No se pudo cargar el detalle de la compra.
          </p>
        ) : null}

        {selectedCompra ? (
          <form className="space-y-3" onSubmit={handleRecibirCompra}>
            <div className="rounded-lg bg-[var(--color-surface-container-high)] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${estadoClassName(selectedCompra.estado)}`}
                >
                  {selectedCompra.estado}
                </span>
                <span className="text-xs text-[var(--color-on-surface-variant)]">
                  {selectedCompra.createdAt
                    ? new Date(selectedCompra.createdAt).toLocaleString()
                    : "-"}
                </span>
              </div>
              <p className="text-sm font-semibold">
                {selectedCompra.proveedor?.nombre ?? "Proveedor"}
              </p>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Lugar: {selectedCompra.proveedor?.lugar ?? "No definido"}
              </p>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Observacion: {selectedCompra.observacion || "Sin observacion"}
              </p>
            </div>

            {selectedCompra.items.map((item) => {
              const pending = Math.max(item.cantidadPedida - (item.cantidadRecibida ?? 0), 0);
              const progress =
                item.cantidadPedida > 0
                  ? Math.min((item.cantidadRecibida / item.cantidadPedida) * 100, 100)
                  : 0;
              return (
                <div
                  key={item.id}
                  className="space-y-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-on-surface)]">
                      {item.producto?.nombre ?? `Producto #${item.productoId}`} (
                      {item.producto?.unidad ?? "u"})
                    </p>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      Precio unitario: <strong>Bs. {item.precioUnit}</strong>
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-[var(--color-surface-container-highest)] px-2 py-2">
                      <span className="block text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                        Pedida
                      </span>
                      <span className="font-semibold">{item.cantidadPedida}</span>
                    </div>
                    <div className="rounded-md bg-[var(--color-surface-container-highest)] px-2 py-2">
                      <span className="block text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                        Recibida
                      </span>
                      <span className="font-semibold">{item.cantidadRecibida}</span>
                    </div>
                    <div className="rounded-md bg-[var(--color-surface-container-highest)] px-2 py-2">
                      <span className="block text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                        Pendiente
                      </span>
                      <span className="font-semibold">{pending}</span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-container-highest)]">
                    <div
                      className="h-full bg-[var(--color-primary)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px] md:items-center">
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      Cantidad a recibir ahora
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cantidadesRecibidas[item.id] ?? "0"}
                      onChange={(event) =>
                        setCantidadesRecibidas((current) => ({
                          ...current,
                          [item.id]: event.target.value
                        }))
                      }
                      className={inputClassName}
                      placeholder="0"
                      disabled={!canManage || selectedCompra.estado === "COMPLETADO"}
                    />
                  </div>
                </div>
              );
            })}

            {selectedCompra.estado !== "COMPLETADO" ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const full: Record<string, string> = {};
                    selectedCompra.items.forEach((item) => {
                      const pending = Math.max(
                        item.cantidadPedida - (item.cantidadRecibida ?? 0),
                        0
                      );
                      full[item.id] = String(pending);
                    });
                    setCantidadesRecibidas(full);
                  }}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                >
                  Cargar todo pendiente
                </button>
              </div>
            ) : null}
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Si confirmas con cantidades menores a lo pendiente, la compra queda en estado PARCIAL.
              Si recibes todo lo pendiente, pasa a COMPLETADO.
            </p>
            <button
              type="submit"
              disabled={
                !canManage ||
                recibirCompraMutation.isPending ||
                selectedCompra.estado === "COMPLETADO"
              }
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {recibirCompraMutation.isPending ? "Registrando..." : "Confirmar recepcion"}
            </button>

            {canAnular && selectedCompra.estado !== "ANULADA" ? (
              <div className="mt-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4">
                {!showAnularForm ? (
                  <button
                    type="button"
                    onClick={() => setShowAnularForm(true)}
                    className="text-xs font-semibold text-[var(--color-error)] hover:underline"
                  >
                    Anular esta compra
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-[var(--color-error)]">
                      Anular compra — acción irreversible
                    </p>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      Se crearán contra-movimientos por los ítems ya recibidos y la compra
                      quedará marcada como ANULADA.
                    </p>
                    <textarea
                      value={anularMotivo}
                      onChange={(event) => setAnularMotivo(event.target.value)}
                      rows={2}
                      placeholder="Motivo de la anulación (obligatorio)"
                      className={`${inputClassName} text-xs`}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!anularMotivo.trim() || anularCompraMutation.isPending}
                        onClick={async () => {
                          try {
                            const result = await anularCompraMutation.mutateAsync({
                              id: selectedCompra.id,
                              payload: { motivo: anularMotivo.trim() }
                            });
                            showSuccess(
                              `Compra anulada. Contra-asientos generados: ${result.data.contraAsientos}.`
                            );
                            setAnularMotivo("");
                            setShowAnularForm(false);
                          } catch (error) {
                            showError(normalizeError(error, "No se pudo anular la compra."));
                          }
                        }}
                        className="rounded-lg bg-[var(--color-error)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {anularCompraMutation.isPending ? "Anulando..." : "Confirmar anulación"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAnularForm(false);
                          setAnularMotivo("");
                        }}
                        className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </form>
        ) : null}
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 text-lg font-bold">Historial de anulaciones</h2>
        {anulacionesHistorialQuery.isLoading ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando historial...</p>
        ) : null}
        {!anulacionesHistorialQuery.isLoading &&
        (anulacionesHistorialQuery.data?.data ?? []).length === 0 ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            No hay anulaciones registradas.
          </p>
        ) : null}
        {(anulacionesHistorialQuery.data?.data ?? []).length > 0 ? (
          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Compra
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Motivo
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Anulado por
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {(anulacionesHistorialQuery.data?.data ?? []).map((anulacion) => (
                  <tr key={anulacion.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                    <td className="px-3 py-2 text-xs">
                      <span className="font-mono text-[var(--color-on-surface-variant)]">
                        #{anulacion.compraId ?? anulacion.compra?.id ?? "-"}
                      </span>
                      {anulacion.compra?.proveedor?.nombre ? (
                        <span className="ml-1 text-[var(--color-on-surface-variant)]">
                          — {anulacion.compra.proveedor.nombre}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--color-on-surface)]">
                      {anulacion.motivo ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                      {anulacion.usuario?.nombre ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                      {anulacion.createdAt
                        ? new Date(anulacion.createdAt).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>

      <CreateProveedorModal
        isOpen={isCreateProveedorModalOpen}
        onClose={() => setIsCreateProveedorModalOpen(false)}
      />
      <CreateProductoModal
        isOpen={isCreateProductoModalOpen}
        onClose={() => setIsCreateProductoModalOpen(false)}
      />
    </section>
  );
}
