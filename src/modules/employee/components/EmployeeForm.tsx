import { FormEvent, useEffect, useState } from "react";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

interface EmployeeFormValues {
  nombre: string;
  deviceUserId: string;
}

interface EmployeeFormProps {
  initialValues?: EmployeeFormValues;
  onSubmit: (values: EmployeeFormValues) => Promise<void> | void;
  onCancelEdit?: () => void;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
}

export function EmployeeForm({
  initialValues,
  onSubmit,
  onCancelEdit,
  isSubmitting = false,
  mode = "create"
}: EmployeeFormProps) {
  const [nombre, setNombre] = useState(initialValues?.nombre ?? "");
  const [deviceUserId, setDeviceUserId] = useState(initialValues?.deviceUserId ?? "");

  useEffect(() => {
    setNombre(initialValues?.nombre ?? "");
    setDeviceUserId(initialValues?.deviceUserId ?? "");
  }, [initialValues?.nombre, initialValues?.deviceUserId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      nombre: nombre.trim(),
      deviceUserId: deviceUserId.trim()
    });
    if (mode === "create") {
      setNombre("");
      setDeviceUserId("");
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
          Nombre
        </label>
        <input
          required
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          className={inputClassName}
          placeholder="Nombre completo"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
          Device User ID
        </label>
        <input
          required
          value={deviceUserId}
          onChange={(event) => setDeviceUserId(event.target.value)}
          className={`${inputClassName} font-mono`}
          placeholder="Ej: 1001"
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Guardando..." : mode === "edit" ? "Actualizar" : "Guardar"}
        </button>
        {mode === "edit" && onCancelEdit ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
