import { ESTADO_ENTREGA, ESTADO_PAGO, etiquetaDocumento } from "@/features/solicitudesPago/lib/etiquetas";
import type { SolicitudPago } from "@/features/solicitudesPago/model/solicitudesPago.schema";

const base = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold";

const COLOR_PAGO: Record<SolicitudPago["estado"], string> = {
  BORRADOR: "bg-amber-500/15 text-amber-600",
  SOLICITADA: "bg-sky-500/15 text-sky-600",
  PAGADA: "bg-emerald-500/15 text-emerald-600",
  ANULADA: "bg-red-500/15 text-red-500"
};

export function InsigniaPago({ estado }: { estado: SolicitudPago["estado"] }) {
  return <span className={`${base} ${COLOR_PAGO[estado]}`}>{ESTADO_PAGO[estado].etiqueta}</span>;
}

export function InsigniaDocumento({ solicitud }: { solicitud: SolicitudPago }) {
  // Una solicitud anulada no necesita factura; una pagada sin factura es lo que hay que perseguir
  if (solicitud.estado === "ANULADA") return <span className="text-xs text-[var(--color-on-surface-variant)]">—</span>;
  const color = solicitud.tipoDocumento
    ? "bg-emerald-500/15 text-emerald-600"
    : solicitud.estado === "PAGADA"
      ? "bg-red-500/15 text-red-500"
      : "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]";
  return <span className={`${base} ${color}`}>{etiquetaDocumento(solicitud)}</span>;
}

export function InsigniaEntrega({ solicitud }: { solicitud: SolicitudPago }) {
  if (solicitud.estado === "ANULADA") return <span className="text-xs text-[var(--color-on-surface-variant)]">—</span>;
  const color =
    solicitud.estadoEntrega === "COMPLETADO"
      ? "bg-emerald-500/15 text-emerald-600"
      : solicitud.estadoEntrega === "EN_EJECUCION"
        ? "bg-sky-500/15 text-sky-600"
        : "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]";
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={`${base} ${color}`}>{ESTADO_ENTREGA[solicitud.estadoEntrega]}</span>
      {solicitud.notaEntrega ? <span className="text-[11px] text-[var(--color-on-surface-variant)]">{solicitud.notaEntrega}</span> : null}
    </span>
  );
}
