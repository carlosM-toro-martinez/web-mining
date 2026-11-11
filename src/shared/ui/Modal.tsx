import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  titulo: string;
  descripcion?: string;
  onClose: () => void;
  children: ReactNode;
  anchoClassName?: string;
}

// Ventana flotante: se cierra con la X, con Escape o con un clic afuera.
export function Modal({ titulo, descripcion, onClose, children, anchoClassName = "max-w-2xl" }: ModalProps) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className={`relative my-8 w-full ${anchoClassName} rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl sm:p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container-highest)] hover:text-[var(--color-on-surface)]"
        >
          <X size={20} />
        </button>
        <h2 className="pr-10 text-lg font-bold text-[var(--color-on-surface)]">{titulo}</h2>
        {descripcion ? <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{descripcion}</p> : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
