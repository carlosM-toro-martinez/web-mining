import { FormEvent, useEffect, useState } from "react";
import {
  contratacionOptions,
  getTipoPersonalLabel,
  tipoPersonalOptions
} from "@/modules/employee/hooks/useEmployees";
import type { EmployeeContratacion, EmployeeTipoPersonal } from "@/modules/employee/db/employee.db";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

interface EmployeeFormValues {
  nombre: string;
  documento?: string;
  cargo?: string;
  tipoPersonal?: EmployeeTipoPersonal;
  contratacion?: EmployeeContratacion;
  activo?: boolean;
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
  const [documento, setDocumento] = useState(initialValues?.documento ?? "");
  const [cargo, setCargo] = useState(initialValues?.cargo ?? "");
  const [tipoPersonal, setTipoPersonal] = useState<EmployeeTipoPersonal>(initialValues?.tipoPersonal ?? "OBRERO");
  const [contratacion, setContratacion] = useState<EmployeeContratacion>(initialValues?.contratacion ?? "PLANTA");
  const [activo, setActivo] = useState(initialValues?.activo ?? true);

  useEffect(() => {
    setNombre(initialValues?.nombre ?? "");
    setDocumento(initialValues?.documento ?? "");
    setCargo(initialValues?.cargo ?? "");
    setTipoPersonal(initialValues?.tipoPersonal ?? "OBRERO");
    setContratacion(initialValues?.contratacion ?? "PLANTA");
    setActivo(initialValues?.activo ?? true);
  }, [
    initialValues?.nombre,
    initialValues?.documento,
    initialValues?.cargo,
    initialValues?.tipoPersonal,
    initialValues?.contratacion,
    initialValues?.activo
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      nombre: nombre.trim(),
      documento: documento.trim() || undefined,
      cargo: cargo.trim() || undefined,
      tipoPersonal,
      contratacion,
      activo
    });
    if (mode === "create") {
      setNombre("");
      setDocumento("");
      setCargo("");
      setTipoPersonal("OBRERO");
      setContratacion("PLANTA");
      setActivo(true);
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
          Documento
        </label>
        <input
          value={documento}
          onChange={(event) => setDocumento(event.target.value)}
          className={inputClassName}
          placeholder="CI / DNI (opcional)"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
          Cargo
        </label>
        <input
          value={cargo}
          onChange={(event) => setCargo(event.target.value)}
          className={inputClassName}
          placeholder="Cargo (opcional)"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
          Tipo de personal
        </label>
        <select
          value={tipoPersonal}
          onChange={(event) => setTipoPersonal(event.target.value as EmployeeTipoPersonal)}
          className={inputClassName}
        >
          {tipoPersonalOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {getTipoPersonalLabel(option.value)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
          Contratación
        </label>
        <select
          value={contratacion}
          onChange={(event) => setContratacion(event.target.value as EmployeeContratacion)}
          className={inputClassName}
        >
          {contratacionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">
          El personal con contrato no entra al Rayador de mitas.
        </p>
      </div>

      {mode === "edit" ? (
        <label className="flex items-center gap-2 text-sm text-[var(--color-on-surface)]">
          <input
            type="checkbox"
            checked={activo}
            onChange={(event) => setActivo(event.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-outline-variant)] bg-[var(--color-surface-container-highest)]"
          />
          Activo
        </label>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Guardando..." : mode === "edit" ? "Actualizar" : "Guardar"}
        </button>
        {onCancelEdit ? (
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
