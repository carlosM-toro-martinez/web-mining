import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileSpreadsheet, PackagePlus, Plus, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateCompraMutation } from "@/features/compras/hooks/useCompras";
import { createCompra } from "@/features/compras/api/comprasApi";
import { DOCUMENTO_OPCIONES, formatBs } from "@/features/compras/lib/compraResumen";
import type { TipoDocumentoCompra } from "@/features/compras/model/compras.schema";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import { useProveedoresQuery } from "@/features/proveedores/hooks/useProveedores";
import {
  useInventoryOfflinePendingCount,
  useSyncInventoryOfflineMutation
} from "@/features/inventory-offline/hooks/useInventoryOffline";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { CreateProveedorModal } from "@/shared/ui/CreateProveedorModal";
import { CreateProductoModal } from "@/shared/ui/CreateProductoModal";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { queryKeys } from "@/shared/lib/queryKeys";
import { normalizeSpreadsheetRow, readSpreadsheetSheets } from "@/shared/lib/spreadsheetImport";
import {
  downloadComprasCsvTemplate,
  downloadComprasExcelTemplate
} from "@/shared/lib/importTemplates";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-60";

const toolButtonClassName =
  "inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-50";

interface CompraDraftItem {
  id: number;
  productoId: string;
  cantidadPedida: string;
  precioUnit: string;
  precioGlobal: string;
  usePrecioGlobal: boolean;
}

const nuevoItem = (id: number): CompraDraftItem => ({
  id,
  productoId: "",
  cantidadPedida: "1",
  precioUnit: "",
  precioGlobal: "",
  usePrecioGlobal: true
});

function computePrecioUnit(item: CompraDraftItem): number {
  if (!item.usePrecioGlobal) return Number(item.precioUnit);
  const total = Number(item.precioGlobal);
  const qty = Number(item.cantidadPedida);
  if (!qty || !Number.isFinite(total) || !Number.isFinite(qty)) return 0;
  return total / qty;
}

function computeTotalItem(item: CompraDraftItem): number {
  const qty = Number(item.cantidadPedida);
  if (item.usePrecioGlobal) return Number(item.precioGlobal) > 0 ? Number(item.precioGlobal) : 0;
  const precio = Number(item.precioUnit);
  return qty > 0 && precio > 0 ? qty * precio : 0;
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

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]/60 p-4">
      <legend className="flex items-center gap-2 px-1 text-sm font-bold text-[var(--color-on-surface)]">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[11px] font-bold text-[var(--color-on-primary)]">
          {numero}
        </span>
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

interface NuevoPedidoCompraFormProps {
  canCreate: boolean;
  // Se llama con el id del pedido recién creado (para mostrarlo en el seguimiento)
  onCreated: (compraId: string) => void;
}

export function NuevoPedidoCompraForm({ canCreate, onCreated }: NuevoPedidoCompraFormProps) {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const pendingOfflineQuery = useInventoryOfflinePendingCount();
  const syncOfflineMutation = useSyncInventoryOfflineMutation();

  const productosQuery = useProductosQuery({ page: 1, limit: 5000, search: "" });
  const proveedoresQuery = useProveedoresQuery({ page: 1, limit: 500, search: undefined });
  const createCompraMutation = useCreateCompraMutation();

  const [proveedorId, setProveedorId] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoCompra | "">("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [observacion, setObservacion] = useState("");
  const [draftItems, setDraftItems] = useState<CompraDraftItem[]>([nuevoItem(1)]);
  const [nextDraftItemId, setNextDraftItemId] = useState(2);
  const [isCreateProveedorModalOpen, setIsCreateProveedorModalOpen] = useState(false);
  const [isCreateProductoModalOpen, setIsCreateProductoModalOpen] = useState(false);
  const [tieneIva, setTieneIva] = useState<boolean>(true);
  const [esGasEspecial, setEsGasEspecial] = useState<boolean>(false);

  const productos = productosQuery.data?.data ?? [];
  const proveedores = proveedoresQuery.data?.data ?? [];
  const proveedoresOrdenados = useMemo(
    () =>
      [...proveedores].sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })
      ),
    [proveedores]
  );
  const proveedorOptions = useMemo(
    () =>
      proveedoresOrdenados.map((proveedor) => ({
        id: String(proveedor.id),
        label:
          (proveedor.nombre ?? "") +
          (proveedor.lugar ? ` — ${proveedor.lugar}` : "") +
          (proveedor.nit ? ` · NIT ${proveedor.nit}` : ""),
        searchText: `${proveedor.nombre ?? ""} ${proveedor.lugar ?? ""} ${proveedor.nit ?? ""}`
      })),
    [proveedoresOrdenados]
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

  const totalPedido = useMemo(
    () => draftItems.reduce((suma, item) => suma + computeTotalItem(item), 0),
    [draftItems]
  );
  const necesitaNumero = tipoDocumento === "FACTURA" || tipoDocumento === "RECIBO";

  function addDraftItem() {
    setDraftItems((current) => [...current, nuevoItem(nextDraftItemId)]);
    setNextDraftItemId((current) => current + 1);
  }

  function updateDraftItem(id: number, patch: Partial<CompraDraftItem>) {
    setDraftItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeDraftItem(id: number) {
    setDraftItems((current) => (current.length <= 1 ? current : current.filter((item) => item.id !== id)));
  }

  function handleCreateCompra(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) {
      showError("No tienes permisos para crear pedidos de compra.");
      return;
    }

    const payload = {
      proveedorId: Number(proveedorId),
      ...(tipoDocumento ? { tipoDocumento } : {}),
      ...(necesitaNumero && numeroFactura.trim() ? { numeroFactura: numeroFactura.trim() } : {}),
      observacion: observacion.trim() || undefined,
      tieneIva,
      esGasEspecial: tieneIva ? esGasEspecial : null,
      items: draftItems.map((item) => ({
        productoId: Number(item.productoId),
        cantidadPedida: Number(item.cantidadPedida),
        precioUnit: computePrecioUnit(item),
        ...(item.usePrecioGlobal && Number(item.precioGlobal) > 0 ? { totalBs: Number(item.precioGlobal) } : {})
      }))
    };

    if (!payload.proveedorId) {
      showError("Elige el proveedor del pedido.");
      return;
    }

    if (necesitaNumero && !numeroFactura.trim()) {
      showError("Escribe el número de la factura o del recibo, o elige \"Aún no tiene\".");
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
        setProveedorId("");
        setTipoDocumento("");
        setNumeroFactura("");
        setObservacion("");
        setTieneIva(true);
        setEsGasEspecial(false);
        setDraftItems([nuevoItem(1)]);
        setNextDraftItemId(2);
        onCreated(response.data.id);
      },
      onError: (error) => showError(normalizeError(error, "No se pudo crear el pedido."))
    });
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
          errors.push(`${group.referencia}: ${normalizeError(error, "No se pudo registrar la compra.")}`);
        } finally {
          processed += 1;
        }
      }

      if (processed < total) {
        showSuccess(`Importación en progreso: ${processed}/${total} compras procesadas...`);
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    return { created, failed, errors };
  }

  async function handleImportCompras(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!canCreate) {
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
        proveedores.filter((item) => item.nit).map((item) => [String(item.nit).replace(/\D/g, ""), item])
      );
      const proveedorByName = new Map(proveedores.map((item) => [item.nombre.trim().toUpperCase(), item]));
      const productoByCode = new Map(productos.map((item) => [item.codigo.trim().toUpperCase(), item]));

      const groupsMap = new Map<string, CompraGroupDraft>();
      let invalidRows = 0;
      const rowErrors: string[] = [];

      for (const [rowIndex, sourceRow] of sourceRows.entries()) {
        const rowNumber = rowIndex + 2;
        const row = normalizeSpreadsheetRow(sourceRow);

        const referencia = (row.referenciacompra || row.referencia || `AUTO-${rowNumber}`).trim().toUpperCase();
        const proveedorIdRaw = Number(row.proveedorid || 0);
        const proveedorNitRaw = (row.proveedornit || "").replace(/\D/g, "");
        const proveedorNombreRaw = (row.proveedornombre || "").trim().toUpperCase();
        const productoCodigo = (row.productocodigo || "").trim().toUpperCase();
        const cantidadPedida = Number(row.cantidadpedida || row.cantidad || 0);
        const precioUnit = Number(row.preciounit || row.preciounitario || row.precio || 0);
        const observacionFila = (row.observacion || "").trim();

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
            observacion: observacionFila || referencia,
            items: [{ productoId: producto.id, cantidadPedida, precioUnit }]
          });
          continue;
        }

        existing.items.push({ productoId: producto.id, cantidadPedida, precioUnit });
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
        `Importación finalizada. Compras creadas: ${result.created}, fallidas: ${result.failed}, filas invalidas: ${invalidRows}.`
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--color-outline-variant)] p-3">
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          ¿Tienes muchos pedidos? Impórtalos desde un archivo con la plantilla.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              syncOfflineMutation.mutate(undefined, {
                onSuccess: () => showSuccess("Sincronización offline ejecutada."),
                onError: () => showError("No se pudo ejecutar la sincronización offline.")
              })
            }
            disabled={syncOfflineMutation.isPending}
            className={toolButtonClassName}
          >
            Reintentar sync ({pendingOfflineQuery.data ?? 0})
          </button>
          <button type="button" onClick={openImportDialog} disabled={!canCreate || isImporting} className={toolButtonClassName}>
            <Upload size={13} />
            {isImporting ? "Importando..." : "Importar CSV/Excel"}
          </button>
          <button type="button" onClick={downloadComprasCsvTemplate} className={toolButtonClassName}>
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
        <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImportCompras} className="hidden" />
      </div>

      <form className="space-y-4" onSubmit={handleCreateCompra}>
        <Paso numero={1} titulo="Proveedor y documento">
          <div className="flex gap-2">
            <AutocompleteSelect
              value={proveedorId}
              onChange={setProveedorId}
              options={proveedorOptions}
              placeholder={proveedoresQuery.isLoading ? "Cargando proveedores..." : "Buscar proveedor..."}
              className={inputClassName}
              disabled={!canCreate || proveedoresQuery.isLoading}
            />
            <button
              type="button"
              onClick={() => setIsCreateProveedorModalOpen(true)}
              disabled={!canCreate}
              className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2.5 text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
              title="Crear nuevo proveedor"
              aria-label="Crear nuevo proveedor"
            >
              <Plus size={18} />
            </button>
          </div>
          {!proveedoresQuery.isLoading && proveedoresOrdenados.length === 0 ? (
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              No hay proveedores registrados. Crea uno con el botón &quot;+&quot; o ve a{" "}
              <Link to="/inventario/proveedores" className="font-semibold text-[var(--color-primary)] hover:underline">
                Proveedores
              </Link>
            </p>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--color-on-surface-variant)]">¿Ya tiene factura o recibo?</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Documento del pedido">
              {[{ valor: "" as const, etiqueta: "Aún no tiene", ayuda: "Se registra después, cuando llegue el documento." }, ...DOCUMENTO_OPCIONES].map((opcion) => {
                const activa = tipoDocumento === opcion.valor;
                return (
                  <button
                    key={opcion.valor || "ninguno"}
                    type="button"
                    role="radio"
                    aria-checked={activa}
                    title={opcion.ayuda}
                    disabled={!canCreate}
                    onClick={() => setTipoDocumento(opcion.valor)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                      activa
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/14 text-[var(--color-primary)]"
                        : "border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    {opcion.etiqueta}
                  </button>
                );
              })}
            </div>
            {necesitaNumero ? (
              <input
                type="text"
                value={numeroFactura}
                onChange={(event) => setNumeroFactura(event.target.value)}
                className={`${inputClassName} mt-2`}
                placeholder={tipoDocumento === "FACTURA" ? "Número de factura" : "Número de recibo"}
                disabled={!canCreate}
              />
            ) : null}
          </div>

          <textarea
            value={observacion}
            onChange={(event) => setObservacion(event.target.value)}
            className={`${inputClassName} min-h-[72px]`}
            placeholder="Observación (opcional)"
            disabled={!canCreate}
          />
        </Paso>

        <Paso numero={2} titulo="Fórmula de IVA">
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!tieneIva}
                onChange={(event) => {
                  setTieneIva(!event.target.checked);
                  if (event.target.checked) setEsGasEspecial(false);
                }}
                disabled={!canCreate}
              />
              <span>Sin IVA (factor × 1)</span>
            </label>
            {tieneIva ? (
              <>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="esGasEspecial"
                    checked={!esGasEspecial}
                    onChange={() => setEsGasEspecial(false)}
                    disabled={!canCreate}
                  />
                  <span>IVA 13% normal (× 0.87)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="esGasEspecial"
                    checked={esGasEspecial}
                    onChange={() => setEsGasEspecial(true)}
                    disabled={!canCreate}
                  />
                  <span>Gas especial IVA (× 0.909)</span>
                </label>
              </>
            ) : (
              <span className="text-xs text-[var(--color-on-surface-variant)]">Precio registrado sin descuento de IVA</span>
            )}
          </div>
        </Paso>

        <Paso numero={3} titulo="Productos del pedido">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateProductoModalOpen(true)}
              className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2 text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
              disabled={!canCreate}
              aria-label="Crear producto nuevo"
            >
              <Plus size={16} />
            </button>
            <span className="text-xs text-[var(--color-on-surface-variant)]">Crear producto nuevo</span>
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
                disabled={!canCreate}
              />
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={item.cantidadPedida}
                onChange={(event) => updateDraftItem(item.id, { cantidadPedida: event.target.value })}
                className={inputClassName}
                placeholder={`Cantidad (${productos.find((producto) => producto.id === Number(item.productoId))?.unidad ?? "unidad"})`}
                disabled={!canCreate}
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
                      item.usePrecioGlobal ? { precioGlobal: event.target.value } : { precioUnit: event.target.value }
                    )
                  }
                  className={inputClassName}
                  placeholder={item.usePrecioGlobal ? "Total factura Bs." : "Precio unit. Bs."}
                  disabled={!canCreate}
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
                    updateDraftItem(item.id, { usePrecioGlobal: !item.usePrecioGlobal, precioGlobal: "", precioUnit: "" })
                  }
                  disabled={!canCreate}
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
                disabled={!canCreate}
              >
                Quitar
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addDraftItem}
            className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
            disabled={!canCreate}
          >
            Agregar item
          </button>
        </Paso>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-container-high)] px-4 py-3">
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            {draftItems.length} {draftItems.length === 1 ? "producto" : "productos"} · total del pedido{" "}
            <strong className="text-[var(--color-on-surface)]">{formatBs(totalPedido)}</strong>
          </p>
          <button
            type="submit"
            disabled={!canCreate || createCompraMutation.isPending || proveedoresOrdenados.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            <PackagePlus size={16} />
            {createCompraMutation.isPending ? "Guardando..." : "Crear pedido de compra"}
          </button>
        </div>
      </form>

      <CreateProveedorModal isOpen={isCreateProveedorModalOpen} onClose={() => setIsCreateProveedorModalOpen(false)} />
      <CreateProductoModal isOpen={isCreateProductoModalOpen} onClose={() => setIsCreateProductoModalOpen(false)} />
    </div>
  );
}
