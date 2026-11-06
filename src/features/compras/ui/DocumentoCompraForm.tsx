import { FormEvent, useEffect, useState } from "react";
import { DOCUMENTO_OPCIONES } from "@/features/compras/lib/compraResumen";
import { useRegistrarDocumentoCompraMutation } from "@/features/compras/hooks/useCompras";
import type { Compra, TipoDocumentoCompra } from "@/features/compras/model/compras.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-60";

interface DocumentoCompraFormProps {
  compra: Compra;
  canEdit: boolean;
}

// Registrar o cambiar el documento de un pedido: factura, recibo o sin documento.
export function DocumentoCompraForm({ compra, canEdit }: DocumentoCompraFormProps) {
  const { showError, showSuccess } = useToast();
  const mutation = useRegistrarDocumentoCompraMutation();
  const [tipo, setTipo] = useState<TipoDocumentoCompra | "">(compra.tipoDocumento ?? "");
  const [numero, setNumero] = useState(compra.numeroFactura ?? "");

  // Al cambiar de pedido o al guardar, el formulario toma lo que quedó registrado
  useEffect(() => {
    setTipo(compra.tipoDocumento ?? "");
    setNumero(compra.numeroFactura ?? "");
  }, [compra.id, compra.tipoDocumento, compra.numeroFactura]);

  const necesitaNumero = tipo === "FACTURA" || tipo === "RECIBO";
  const sinCambios = tipo === (compra.tipoDocumento ?? "") && (necesitaNumero ? numero.trim() === (compra.numeroFactura ?? "") : true);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || !tipo) return;
    if (necesitaNumero && !numero.trim()) {
      showError("Escribe el número de la factura o del recibo.");
      return;
    }
    mutation.mutate(
      {
        id: compra.id,
        payload: { tipoDocumento: tipo, ...(necesitaNumero ? { numeroFactura: numero.trim() } : {}) }
      },
      {
        onSuccess: (response) => {
          if (response.data.advertenciaDuplicado) {
            showError("Documento guardado, pero ese número ya está en otra compra de este proveedor. Revisa que no sea un duplicado.");
          } else {
            showSuccess("Documento registrado.");
          }
        },
        onError: (error) =>
          showError(error instanceof ApiError ? error.message : "No se pudo registrar el documento.")
      }
    );
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de documento">
        {DOCUMENTO_OPCIONES.map((opcion) => {
          const activa = tipo === opcion.valor;
          return (
            <button
              key={opcion.valor}
              type="button"
              role="radio"
              aria-checked={activa}
              title={opcion.ayuda}
              disabled={!canEdit}
              onClick={() => setTipo(opcion.valor)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                activa
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/14 text-[var(--color-primary)]"
                  : "border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]"
              }`}
            >
              {opcion.etiqueta}
            </button>
          );
        })}
      </div>

      {necesitaNumero ? (
        <input
          type="text"
          value={numero}
          onChange={(event) => setNumero(event.target.value)}
          placeholder={tipo === "FACTURA" ? "Número de factura" : "Número de recibo"}
          className={inputClassName}
          disabled={!canEdit}
        />
      ) : null}

      {canEdit ? (
        <button
          type="submit"
          disabled={!tipo || sinCambios || mutation.isPending}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-on-primary)] transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? "Guardando..." : compra.tipoDocumento ? "Actualizar documento" : "Guardar documento"}
        </button>
      ) : (
        <p className="text-xs text-[var(--color-on-surface-variant)]">No tienes permiso para registrar documentos.</p>
      )}
    </form>
  );
}
