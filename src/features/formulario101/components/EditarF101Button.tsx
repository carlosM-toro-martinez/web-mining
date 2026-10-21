import { useState } from "react";
import { Pencil } from "lucide-react";
import { useEditarFormulario101Mutation } from "@/features/formulario101/hooks/useFormulario101";
import { mensajeDeError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const buttonClassName =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

// Corrige el código y la fecha de un Formulario 101 ya vinculado. La fecha
// debe seguir coincidiendo con la del Conocimiento (lo valida la API).
export function EditarF101Button({ id, codigo, fecha }: { id: string; codigo: string; fecha: string }) {
  const [abierto, setAbierto] = useState(false);
  const [codigoInput, setCodigoInput] = useState(codigo);
  const [fechaInput, setFechaInput] = useState(fecha.slice(0, 10));
  const mutation = useEditarFormulario101Mutation();
  const { showError, showSuccess } = useToast();

  function abrir() {
    setCodigoInput(codigo);
    setFechaInput(fecha.slice(0, 10));
    setAbierto(true);
  }

  function guardar() {
    const payload: { codigo?: string; fecha?: string } = {};
    if (codigoInput.trim() !== codigo) payload.codigo = codigoInput.trim();
    if (fechaInput !== fecha.slice(0, 10)) payload.fecha = fechaInput;
    if (!payload.codigo && !payload.fecha) {
      setAbierto(false);
      return;
    }
    mutation.mutate(
      { id, payload },
      {
        onSuccess: () => {
          showSuccess("Formulario 101 actualizado.");
          setAbierto(false);
        },
        onError: (error) => showError(mensajeDeError(error, "No se pudo editar el Formulario 101."))
      }
    );
  }

  if (!abierto) {
    return (
      <button type="button" onClick={abrir} className={buttonClassName}>
        <Pencil size={12} /> Editar F101
      </button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-end gap-2 border-t border-[var(--color-success)]/30 pt-3">
      <label className="min-w-32 flex-1 text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
        Código
        <input value={codigoInput} onChange={(e) => setCodigoInput(e.target.value)} className={`${inputClassName} mt-1`} />
      </label>
      <label className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
        Fecha
        <input type="date" value={fechaInput} onChange={(e) => setFechaInput(e.target.value)} className={`${inputClassName} mt-1`} />
      </label>
      <button type="button" onClick={guardar} disabled={mutation.isPending || !codigoInput.trim() || !fechaInput} className={buttonClassName}>
        Guardar
      </button>
      <button type="button" onClick={() => setAbierto(false)} className={buttonClassName}>
        Cancelar
      </button>
    </div>
  );
}
