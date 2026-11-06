import {
  documentoDeCompra,
  llegadaDeEstado,
  type DocumentoTono,
  type LlegadaTono
} from "@/features/compras/lib/compraResumen";
import type { Compra } from "@/features/compras/model/compras.schema";

const badgeBase =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider";

const llegadaClases: Record<LlegadaTono, string> = {
  pendiente: "border-[var(--color-warning)]/35 bg-[var(--color-warning)]/16 text-[var(--color-warning)]",
  parcial: "border-[var(--color-tertiary)]/35 bg-[var(--color-tertiary)]/16 text-[var(--color-tertiary)]",
  completo: "border-[var(--color-success)]/35 bg-[var(--color-success)]/16 text-[var(--color-success)]",
  anulado: "border-[var(--color-error)]/35 bg-[var(--color-error)]/16 text-[var(--color-error)]"
};

const documentoClases: Record<DocumentoTono, string> = {
  factura: "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/14 text-[var(--color-primary)]",
  recibo: "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/14 text-[var(--color-primary)]",
  sin: "border-[var(--color-outline-variant)] bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]",
  falta: "border-dashed border-[var(--color-warning)]/55 bg-transparent text-[var(--color-warning)]"
};

export function LlegadaBadge({ estado }: { estado: string }) {
  const info = llegadaDeEstado(estado);
  return (
    <span className={`${badgeBase} ${llegadaClases[info.tono]}`} title={info.detalle}>
      {info.etiqueta}
    </span>
  );
}

export function DocumentoBadge({
  compra,
  conNumero = true
}: {
  compra: Pick<Compra, "tipoDocumento" | "numeroFactura">;
  conNumero?: boolean;
}) {
  const info = documentoDeCompra(compra);
  return (
    <span className={`${badgeBase} ${documentoClases[info.tono]}`}>
      {info.etiqueta}
      {conNumero && info.numero ? <span className="font-mono normal-case tracking-normal">Nº {info.numero}</span> : null}
    </span>
  );
}

// Barra de avance de lo recibido. El color sigue al estado: ámbar si falta, verde si está completo.
export function BarraAvance({ porcentaje, tono }: { porcentaje: number; tono: LlegadaTono }) {
  const color =
    tono === "completo"
      ? "bg-[var(--color-success)]"
      : tono === "anulado"
        ? "bg-[var(--color-error)]"
        : "bg-[var(--color-primary)]";
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-container-highest)]"
      role="progressbar"
      aria-valuenow={Math.round(porcentaje)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full ${color}`} style={{ width: `${Math.min(Math.max(porcentaje, 0), 100)}%` }} />
    </div>
  );
}
