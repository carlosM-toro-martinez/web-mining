import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  useCreateProveedorMutation,
  useUpdateProveedorMutation
} from "@/features/proveedores/hooks/useProveedores";
import type { Proveedor } from "@/features/proveedores/model/proveedores.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-60";

const labelClassName =
  "mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]";

interface ProveedorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Con proveedor: se edita. Sin proveedor: se crea uno nuevo.
  proveedor?: Proveedor | null;
}

export function ProveedorFormModal({ isOpen, onClose, proveedor }: ProveedorFormModalProps) {
  const { showError, showSuccess } = useToast();
  const createMutation = useCreateProveedorMutation();
  const updateMutation = useUpdateProveedorMutation();
  const isEditing = Boolean(proveedor);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [nombre, setNombre] = useState("");
  const [lugar, setLugar] = useState("");
  const [contacto, setContacto] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nit, setNit] = useState("");

  // Cada vez que se abre, el formulario parte de los datos del proveedor (o vacío si es nuevo)
  useEffect(() => {
    if (!isOpen) return;
    setNombre(proveedor?.nombre ?? "");
    setLugar(proveedor?.lugar ?? "");
    setContacto(proveedor?.contacto ?? "");
    setRazonSocial(proveedor?.razonSocial ?? "");
    setNit(proveedor?.nit ?? "");
  }, [isOpen, proveedor]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isPending, onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (proveedor) {
      const next = {
        nombre: nombre.trim(),
        lugar: lugar.trim(),
        contacto: contacto.trim(),
        razonSocial: razonSocial.trim(),
        nit: nit.trim()
      };
      const payload: Record<string, string> = {};
      if (next.nombre && next.nombre !== (proveedor.nombre ?? "")) payload.nombre = next.nombre;
      if (next.lugar && next.lugar !== (proveedor.lugar ?? "")) payload.lugar = next.lugar;
      if (next.contacto !== (proveedor.contacto ?? "")) payload.contacto = next.contacto;
      if (next.razonSocial !== (proveedor.razonSocial ?? "")) payload.razonSocial = next.razonSocial;
      if (next.nit !== (proveedor.nit ?? "")) payload.nit = next.nit;

      if (Object.keys(payload).length === 0) {
        showError("No hay cambios para guardar.");
        return;
      }

      updateMutation.mutate(
        { id: proveedor.id, payload },
        {
          onSuccess: (response) => {
            showSuccess(`Proveedor actualizado: ${response.data.nombre}`);
            onClose();
          },
          onError: (error) =>
            showError(error instanceof ApiError ? error.message : "No se pudo actualizar el proveedor.")
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

    createMutation.mutate(payload, {
      onSuccess: (response) => {
        showSuccess(`Proveedor creado: ${response.data.nombre}`);
        onClose();
      },
      onError: (error) =>
        showError(error instanceof ApiError ? error.message : "No se pudo crear el proveedor.")
    });
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proveedor-form-titulo"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-[var(--color-surface-container-high)] p-6 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container-highest)] hover:text-[var(--color-on-surface)]"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <h2 id="proveedor-form-titulo" className="mb-1 text-lg font-bold text-[var(--color-on-surface)]">
          {isEditing ? "Editar proveedor" : "Nuevo proveedor"}
        </h2>
        <p className="mb-5 text-sm text-[var(--color-on-surface-variant)]">
          {isEditing ? "Cambia los datos y guarda." : "Los campos con * son obligatorios."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClassName} htmlFor="proveedor-nombre">
              Nombre <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id="proveedor-nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className={inputClassName}
              placeholder="ej. Proveedor ABC"
              required
              autoFocus
              disabled={isPending}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="proveedor-lugar">
              Lugar <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id="proveedor-lugar"
              value={lugar}
              onChange={(event) => setLugar(event.target.value)}
              className={inputClassName}
              placeholder="ej. Potosí"
              required
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="proveedor-nit">NIT</label>
              <input
                id="proveedor-nit"
                value={nit}
                onChange={(event) => setNit(event.target.value)}
                className={inputClassName}
                placeholder="ej. 1234567890"
                disabled={isPending}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="proveedor-contacto">Contacto</label>
              <input
                id="proveedor-contacto"
                value={contacto}
                onChange={(event) => setContacto(event.target.value)}
                className={inputClassName}
                placeholder="Teléfono o correo"
                disabled={isPending}
              />
            </div>
          </div>

          <div>
            <label className={labelClassName} htmlFor="proveedor-razon">Razón social</label>
            <input
              id="proveedor-razon"
              value={razonSocial}
              onChange={(event) => setRazonSocial(event.target.value)}
              className={inputClassName}
              placeholder="ej. ABC Industrias S.A."
              disabled={isPending}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition disabled:opacity-60"
            >
              {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
