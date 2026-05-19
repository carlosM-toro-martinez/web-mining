import { FormEvent, useMemo, useState } from "react";
import { PencilLine, Trash2 } from "lucide-react";
import { useImportStockInicialMutation } from "@/features/inventario-import/hooks/useInventarioImport";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

interface StockItemForm {
  productoCodigo: string;
  cantidad: string;
  precioUnit: string;
}

function normalizeError(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function StockInicialEditorPage() {
  const { showError, showSuccess } = useToast();
  const importStockMutation = useImportStockInicialMutation();
  const productosQuery = useProductosQuery({ page: 1, limit: 5000, search: "" });
  const [form, setForm] = useState<StockItemForm>({
    productoCodigo: "",
    cantidad: "",
    precioUnit: ""
  });
  const [items, setItems] = useState<Array<{ productoCodigo: string; cantidad: number; precioUnit: number }>>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedProductoId, setSelectedProductoId] = useState("");

  const stockJson = useMemo(() => JSON.stringify(items, null, 2), [items]);
  const productoOptions = useMemo(
    () =>
      (productosQuery.data?.data ?? []).map((producto) => ({
        id: String(producto.id),
        label: `${producto.codigo} - ${producto.nombre}`,
        searchText: `${producto.codigo} ${producto.nombre}`
      })),
    [productosQuery.data?.data]
  );

  function clearForm() {
    setForm({ productoCodigo: "", cantidad: "", precioUnit: "" });
    setSelectedProductoId("");
    setEditingIndex(null);
  }

  function addOrUpdateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const productoCodigo = form.productoCodigo.trim().toUpperCase();
    const cantidad = Number(form.cantidad);
    const precioUnit = Number(form.precioUnit);

    if (!productoCodigo) {
      showError("Ingresa el código del producto.");
      return;
    }
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      showError("Cantidad inválida.");
      return;
    }
    if (!Number.isFinite(precioUnit) || precioUnit < 0) {
      showError("Precio unitario inválido.");
      return;
    }

    const next = { productoCodigo, cantidad, precioUnit };
    setItems((current) => {
      if (editingIndex === null) return [...current, next];
      return current.map((item, index) => (index === editingIndex ? next : item));
    });
    clearForm();
  }

  function editItem(index: number) {
    const item = items[index];
    if (!item) return;
    setForm({
      productoCodigo: item.productoCodigo,
      cantidad: String(item.cantidad),
      precioUnit: String(item.precioUnit)
    });
    setSelectedProductoId("");
    setEditingIndex(index);
  }

  function handleProductAutocompleteChange(nextId: string) {
    setSelectedProductoId(nextId);
    const selected = (productosQuery.data?.data ?? []).find(
      (producto) => String(producto.id) === nextId
    );
    if (!selected) return;
    setForm((current) => ({ ...current, productoCodigo: selected.codigo }));
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, currentIndex) => currentIndex !== index));
    if (editingIndex === index) clearForm();
  }

  function submitAll() {
    if (items.length === 0) {
      showError("Agrega al menos un ítem.");
      return;
    }
    importStockMutation.mutate(
      { items },
      {
        onSuccess: () => showSuccess("Stock inicial actualizado correctamente."),
        onError: (error) => showError(normalizeError(error, "No se pudo importar el stock inicial."))
      }
    );
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <SubrouteBackButton />
        <h1 className="mt-4 font-headline text-3xl font-extrabold">Editar stock inicial</h1>
        <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
          Agrega productos uno por uno y genera el JSON automáticamente.
        </p>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <form className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_150px_150px_auto_auto]" onSubmit={addOrUpdateItem}>
          <AutocompleteSelect
            value={selectedProductoId}
            onChange={handleProductAutocompleteChange}
            options={productoOptions}
            placeholder="Código producto (buscar por código o nombre)"
            className={inputClassName}
          />
          <input
            value={form.cantidad}
            onChange={(e) => setForm((c) => ({ ...c, cantidad: e.target.value }))}
            className={inputClassName}
            placeholder="Cantidad"
          />
          <input
            value={form.precioUnit}
            onChange={(e) => setForm((c) => ({ ...c, precioUnit: e.target.value }))}
            className={inputClassName}
            placeholder="P. Unit."
          />
          <button type="submit" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]">
            {editingIndex === null ? "Agregar" : "Actualizar"}
          </button>
          <button type="button" onClick={clearForm} className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]">
            Limpiar
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-3 text-lg font-bold">Ítems cargados ({items.length})</h2>
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Sin ítems cargados.</p>
          ) : (
            items.map((item, index) => (
              <div key={`${item.productoCodigo}-${index}`} className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] p-3 text-sm">
                <span>{item.productoCodigo} | Cant: {item.cantidad} | P.U: {item.precioUnit}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => editItem(index)} className="rounded border border-[var(--color-primary)]/50 p-1.5 text-[var(--color-primary)]">
                    <PencilLine size={14} />
                  </button>
                  <button type="button" onClick={() => removeItem(index)} className="rounded border border-[var(--color-error)]/50 p-1.5 text-[var(--color-error)]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">JSON generado</p>
          <textarea value={stockJson} readOnly className={`${inputClassName} min-h-[220px] font-mono text-xs`} />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={submitAll}
            disabled={importStockMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            {importStockMutation.isPending ? "Guardando..." : "Enviar stock inicial"}
          </button>
          <button type="button" onClick={() => setItems([])} className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]">
            Vaciar lista
          </button>
        </div>
      </article>
    </section>
  );
}
