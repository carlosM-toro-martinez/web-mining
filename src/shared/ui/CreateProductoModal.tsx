import { FormEvent, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useCategoriasTreeQuery } from "@/features/categorias-inventario/hooks/useCategoriasInventario";
import { useCreateProductoMutation } from "@/features/productos/hooks/useProductos";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { ApiError } from "@/shared/api/core/apiError";

interface CreateProductoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess?: (productoId: number) => void;
}

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

export function CreateProductoModal({ isOpen, onClose, onCreateSuccess }: CreateProductoModalProps) {
  const { showSuccess, showError } = useToast();
  const createProductoMutation = useCreateProductoMutation();

  const categoriasQuery = useCategoriasTreeQuery();
  const grupos = categoriasQuery.data?.data ?? [];
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("UND");
  const [grupoId, setGrupoId] = useState("");
  const [subgrupoId, setSubgrupoId] = useState("");
  const [esEpp, setEsEpp] = useState(false);

  const availableSubgrupos = useMemo(
    () => (grupoId ? grupos.find((grupo) => String(grupo.id) === grupoId)?.children ?? [] : []),
    [grupoId, grupos]
  );

  function resetForm() {
    setCodigo("");
    setNombre("");
    setUnidad("UND");
    setGrupoId("");
    setSubgrupoId("");
    setEsEpp(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!codigo.trim()) {
      showError("El código del producto es obligatorio.");
      return;
    }
    if (!nombre.trim()) {
      showError("El nombre del producto es obligatorio.");
      return;
    }
    if (!unidad.trim()) {
      showError("La unidad del producto es obligatoria.");
      return;
    }

    createProductoMutation.mutate(
      {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        unidad: unidad.trim().toUpperCase(),
        grupoId: grupoId ? Number(grupoId) : undefined,
        subgrupoId: subgrupoId ? Number(subgrupoId) : undefined,
        esEpp
      },
      {
        onSuccess: (response) => {
          showSuccess("Producto creado correctamente.");
          const createdId = response.data.id;
          resetForm();
          onClose();
          if (typeof onCreateSuccess === "function") {
            onCreateSuccess(createdId);
          }
        },
        onError: (error) => {
          const message = error instanceof ApiError ? error.message : "No se pudo crear el producto.";
          showError(message);
        }
      }
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-md rounded-lg bg-[var(--color-surface-container-high)] p-6 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          disabled={createProductoMutation.isPending}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        <h2 className="mb-4 text-lg font-bold text-[var(--color-on-surface)]">Crear producto</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Código <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className={inputClassName}
              placeholder="ej. PRO-001"
              required
              disabled={createProductoMutation.isPending}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Nombre <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClassName}
              placeholder="ej. Martillo"
              required
              disabled={createProductoMutation.isPending}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Unidad <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value.toUpperCase())}
              className={inputClassName}
              placeholder="UND"
              required
              disabled={createProductoMutation.isPending}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Grupo
            </label>
            <select
              value={grupoId}
              onChange={(event) => {
                setGrupoId(event.target.value);
                setSubgrupoId("");
              }}
              className={inputClassName}
              disabled={createProductoMutation.isPending}
            >
              <option value="">Selecciona grupo</option>
              {grupos.map((grupo) => (
                <option key={grupo.id} value={String(grupo.id)}>
                  {grupo.codigo} - {grupo.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Subgrupo
            </label>
            <select
              value={subgrupoId}
              onChange={(event) => setSubgrupoId(event.target.value)}
              className={inputClassName}
              disabled={!grupoId || createProductoMutation.isPending}
            >
              <option value="">Selecciona subgrupo</option>
              {availableSubgrupos.map((subgrupo) => (
                <option key={subgrupo.id} value={String(subgrupo.id)}>
                  {subgrupo.codigo} - {subgrupo.nombre}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--color-on-surface)]">
            <input
              type="checkbox"
              checked={esEpp}
              onChange={(event) => setEsEpp(event.target.checked)}
              disabled={createProductoMutation.isPending}
              className="h-4 w-4 rounded border-[var(--color-outline-variant)] bg-[var(--color-surface-container-highest)]"
            />
            Es EPP
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={createProductoMutation.isPending}
              className="flex-1 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createProductoMutation.isPending}
              className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] transition disabled:opacity-60"
            >
              {createProductoMutation.isPending ? "Guardando..." : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
