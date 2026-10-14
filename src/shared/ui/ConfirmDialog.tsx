import { useEffect, type ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  // null oculta el botón de cancelar (diálogo informativo)
  cancelLabel?: string | null;
  tone?: "primary" | "danger";
  confirmDisabled?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Diálogo de confirmación con contenido libre (listas, advertencias, casillas).
// Se cierra con Escape o haciendo clic fuera, salvo mientras se ejecuta la acción.
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "primary",
  confirmDisabled = false,
  isLoading = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isLoading, onCancel]);

  if (!open) return null;

  const danger = tone === "danger";
  const Icon = danger ? AlertTriangle : Info;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-[var(--color-border-soft)] px-5 py-4">
          <div className={`rounded-lg p-2 ${danger ? "bg-red-500/14 text-red-600" : "bg-[var(--color-primary)]/14 text-[var(--color-primary)]"}`}>
            <Icon size={18} />
          </div>
          <h2 className="pt-1 text-base font-bold text-[var(--color-on-surface)]">{title}</h2>
        </div>

        {children ? <div className="space-y-3 overflow-y-auto px-5 py-4 text-sm text-[var(--color-on-surface)]">{children}</div> : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]/55 px-5 py-3">
          {cancelLabel !== null ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] disabled:opacity-60"
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled || isLoading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
              danger ? "bg-red-600 text-white" : "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
            }`}
          >
            {isLoading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
