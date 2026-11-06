import { eventosDeCompra, formatFecha, type EventoCompra } from "@/features/compras/lib/compraResumen";
import type { Compra } from "@/features/compras/model/compras.schema";

const puntoClases: Record<EventoCompra["tono"], string> = {
  neutro: "bg-[var(--color-on-surface-variant)]",
  ok: "bg-[var(--color-success)]",
  aviso: "bg-[var(--color-warning)]",
  error: "bg-[var(--color-error)]"
};

// Qué pasó con el pedido y cuándo: registro, cada llegada, documento y anulación.
export function LineaTiempoCompra({ compra }: { compra: Compra }) {
  const eventos = eventosDeCompra(compra);
  return (
    <ol className="space-y-0">
      {eventos.map((evento, index) => (
        <li key={evento.clave} className="relative flex gap-3 pb-4 last:pb-0">
          {index < eventos.length - 1 ? (
            <span className="absolute left-[5px] top-3 h-full w-px bg-[var(--color-border-soft)]" aria-hidden />
          ) : null}
          <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${puntoClases[evento.tono]}`} aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-on-surface)]">
              {evento.titulo}
              <span className="ml-2 text-xs font-normal text-[var(--color-on-surface-variant)]">
                {formatFecha(evento.fecha, true)}
              </span>
            </p>
            {evento.detalle ? (
              <p className="break-words text-xs text-[var(--color-on-surface-variant)]">{evento.detalle}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
