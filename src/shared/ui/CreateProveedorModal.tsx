import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { useCreateProveedorMutation } from "@/features/proveedores/hooks/useProveedores";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { ApiError } from "@/shared/api/core/apiError";

interface CreateProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

export function CreateProveedorModal({ isOpen, onClose }: CreateProveedorModalProps) {
  const { showSuccess, showError } = useToast();
  const createProveedorMutation = useCreateProveedorMutation();

  const [nombre, setNombre] = useState("");
  const [lugar, setLugar] = useState("");
  const [contacto, setContacto] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nit, setNit] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!nombre.trim()) {
      showError("El nombre del proveedor es obligatorio.");
      return;
    }

    if (!lugar.trim()) {
      showError("El lugar del proveedor es obligatorio.");
      return;
    }

    createProveedorMutation.mutate(
      {
        nombre: nombre.trim(),
        lugar: lugar.trim(),
        contacto: contacto.trim() || undefined,
        razonSocial: razonSocial.trim() || undefined,
        nit: nit.trim() || undefined
      },
      {
        onSuccess: () => {
          showSuccess("Proveedor creado correctamente.");
          setNombre("");
          setLugar("");
          setContacto("");
          setRazonSocial("");
          setNit("");
          onClose();
        },
        onError: (error) => {
          const message =
            error instanceof ApiError ? error.message : "No se pudo crear el proveedor.";
          showError(message);
        }
      }
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-[var(--color-surface-container-high)] p-6 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          disabled={createProveedorMutation.isPending}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        <h2 className="mb-4 text-lg font-bold text-[var(--color-on-surface)]">
          Crear nuevo proveedor
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Nombre <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClassName}
              placeholder="ej. Proveedor ABC"
              required
              disabled={createProveedorMutation.isPending}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Lugar <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              className={inputClassName}
              placeholder="ej. La Paz, Bolivia"
              required
              disabled={createProveedorMutation.isPending}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              NIT (opcional)
            </label>
            <input
              type="text"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              className={inputClassName}
              placeholder="ej. 1234567890"
              disabled={createProveedorMutation.isPending}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Razón social (opcional)
            </label>
            <input
              type="text"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              className={inputClassName}
              placeholder="ej. ABC Industrias S.A."
              disabled={createProveedorMutation.isPending}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Contacto (opcional)
            </label>
            <input
              type="text"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              className={inputClassName}
              placeholder="ej. Teléfono, email, etc."
              disabled={createProveedorMutation.isPending}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={createProveedorMutation.isPending}
              className="flex-1 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createProveedorMutation.isPending}
              className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] transition disabled:opacity-60"
            >
              {createProveedorMutation.isPending ? "Guardando..." : "Crear proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
