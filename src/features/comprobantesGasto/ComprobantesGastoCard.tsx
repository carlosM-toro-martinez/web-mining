import { FormEvent, useState } from "react";
import { Check, Pencil, Receipt, Trash2, X } from "lucide-react";
import {
  TRATAMIENTO_LABEL,
  useComprobantesGastoQuery,
  useCreateComprobanteGastoMutation,
  useDeleteComprobanteGastoMutation,
  useUpdateComprobanteGastoMutation
} from "@/features/comprobantesGasto/comprobantesGasto";
import type { TipoDocumentoGasto } from "@/features/gastoCaja/model/gastoCaja.schema";
import { mensajeDeError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm";

const VACIO = { nombre: "", ayuda: "", tratamiento: "PLANILLA" as TipoDocumentoGasto };

function CamposComprobante({ valor, onChange }: { valor: typeof VACIO; onChange: (v: typeof VACIO) => void }) {
  return (
    <>
      <input required maxLength={60} value={valor.nombre} onChange={(e) => onChange({ ...valor, nombre: e.target.value })} className={inputClassName} placeholder="Nombre (ej. Comprobante por rendir)" />
      <input maxLength={200} value={valor.ayuda} onChange={(e) => onChange({ ...valor, ayuda: e.target.value })} className={inputClassName} placeholder="Texto de ayuda (opcional)" />
      <label className="block text-[11px] text-[var(--color-on-surface-variant)]">
        ¿Qué hace el sistema con los impuestos?
        <select value={valor.tratamiento} onChange={(e) => onChange({ ...valor, tratamiento: e.target.value as TipoDocumentoGasto })} className={`${inputClassName} mt-1`}>
          {(Object.keys(TRATAMIENTO_LABEL) as TipoDocumentoGasto[]).map((key) => (
            <option key={key} value={key}>{TRATAMIENTO_LABEL[key]}</option>
          ))}
        </select>
      </label>
    </>
  );
}

export function ComprobantesGastoCard() {
  const { showSuccess, showError } = useToast();
  const comprobantes = useComprobantesGastoQuery().data?.data ?? [];
  const crear = useCreateComprobanteGastoMutation();
  const actualizar = useUpdateComprobanteGastoMutation();
  const eliminar = useDeleteComprobanteGastoMutation();
  const [nuevo, setNuevo] = useState(VACIO);
  const [edicion, setEdicion] = useState<(typeof VACIO & { id: number }) | null>(null);

  const alFallar = (mensaje: string) => (error: unknown) => showError(mensajeDeError(error, mensaje));

  function handleCrear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    crear.mutate(nuevo, {
      onSuccess: () => {
        showSuccess("Comprobante agregado.");
        setNuevo(VACIO);
      },
      onError: alFallar("No se pudo agregar el comprobante.")
    });
  }

  function handleGuardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edicion) return;
    const { id, ...payload } = edicion;
    actualizar.mutate(
      { id, payload },
      {
        onSuccess: () => {
          showSuccess("Comprobante actualizado.");
          setEdicion(null);
        },
        onError: alFallar("No se pudo actualizar el comprobante.")
      }
    );
  }

  return (
    <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
      <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <Receipt size={16} className="text-[var(--color-primary)]" />
        Comprobantes de gasto
      </h3>
      <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
        Las opciones de "¿Qué comprobante te dieron?" al registrar un gasto.
      </p>
      <form className="space-y-3" onSubmit={handleCrear}>
        <CamposComprobante valor={nuevo} onChange={setNuevo} />
        <button type="submit" disabled={crear.isPending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
          {crear.isPending ? "Guardando..." : "Agregar comprobante"}
        </button>
      </form>
      <div className="mt-4 space-y-2 text-sm">
        {comprobantes.map((item) =>
          edicion?.id === item.id ? (
            <form key={item.id} onSubmit={handleGuardar} className="space-y-2 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 px-3 py-2">
              <CamposComprobante valor={edicion} onChange={(v) => setEdicion({ ...v, id: item.id })} />
              <div className="flex gap-2">
                <button type="submit" disabled={actualizar.isPending} className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)]">
                  <Check size={12} /> Guardar
                </button>
                <button type="button" onClick={() => setEdicion(null)} className="flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold">
                  <X size={12} /> Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
              <div className={item.activo ? "" : "opacity-50"}>
                <p>{item.nombre}</p>
                <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                  {TRATAMIENTO_LABEL[item.tratamiento]}
                  {item.activo ? "" : " · desactivado"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <label className="flex items-center gap-1 text-[10px]" title="Solo los activos aparecen al registrar un gasto">
                  <input
                    type="checkbox"
                    checked={item.activo}
                    onChange={(e) => actualizar.mutate({ id: item.id, payload: { activo: e.target.checked } }, { onError: alFallar("No se pudo cambiar el estado.") })}
                  />
                  Activo
                </label>
                <button type="button" aria-label="Editar" onClick={() => setEdicion({ id: item.id, nombre: item.nombre, ayuda: item.ayuda ?? "", tratamiento: item.tratamiento })} className="rounded p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10">
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Eliminar"
                  onClick={() => {
                    if (!window.confirm(`¿Eliminar el comprobante "${item.nombre}"?`)) return;
                    eliminar.mutate(item.id, { onSuccess: () => showSuccess("Comprobante eliminado."), onError: alFallar("No se pudo eliminar.") });
                  }}
                  className="rounded p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </article>
  );
}
