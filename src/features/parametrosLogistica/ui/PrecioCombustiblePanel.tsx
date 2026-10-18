import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Fuel, Info } from "lucide-react";
import {
  useCreatePrecioCombustibleMutation,
  usePreciosCombustibleQuery
} from "@/features/parametrosLogistica/hooks/useParametrosLogistica";
import { mensajeDeError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const dia = (iso: string) => iso.slice(0, 10);
const hoyIso = () => new Date().toISOString().slice(0, 10);
function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO", { timeZone: "UTC" });
}
const bs = (v: string | number) =>
  `Bs ${Number(v).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Precio del litro de combustible: se usa solo para calcular el descuento
// automático de combustible de una liquidación (litros del viaje × precio
// del litro vigente en la fecha de ese viaje).
export function PrecioCombustiblePanel() {
  const { showError, showSuccess } = useToast();
  const preciosQuery = usePreciosCombustibleQuery();
  const createMutation = useCreatePrecioCombustibleMutation();
  const precios = preciosQuery.data?.data ?? [];
  const hoy = hoyIso();

  const vigente =
    precios.find((p) => dia(p.vigenteDesde) <= hoy && (!p.vigenteHasta || dia(p.vigenteHasta) > hoy)) ?? null;
  const abierto = precios.find((p) => !p.vigenteHasta) ?? null;

  const [precio, setPrecio] = useState("");
  const [desde, setDesde] = useState(hoy);
  const [verTodos, setVerTodos] = useState(false);

  const fechaInvalida = Boolean(abierto && desde && desde <= dia(abierto.vigenteDesde));
  const puedeGuardar = Number(precio) > 0 && Boolean(desde) && !fechaInvalida;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!puedeGuardar) return;
    createMutation.mutate(
      { precioPorLitro: Number(precio), vigenteDesde: desde },
      {
        onSuccess: () => {
          showSuccess(abierto ? `Precio guardado. El anterior (${bs(abierto.precioPorLitro)}) quedó cerrado.` : "Precio guardado.");
          setPrecio("");
        },
        onError: (error) => showError(mensajeDeError(error, "No se pudo guardar el precio del combustible."))
      }
    );
  }

  const estado = (p: (typeof precios)[number]) =>
    dia(p.vigenteDesde) > hoy ? "Próximo" : p.vigenteHasta && dia(p.vigenteHasta) <= hoy ? "Cerrado" : "Vigente";
  const estadoClase: Record<string, string> = {
    Vigente: "bg-[var(--color-success)]/18 text-[var(--color-success)]",
    Próximo: "bg-[var(--color-warning)]/20 text-[var(--color-warning)]",
    Cerrado: "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]"
  };

  return (
    <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
      <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <Fuel size={16} className="text-[var(--color-primary)]" />
        Precio del litro de combustible
      </h3>
      <p className="mb-4 max-w-3xl text-sm text-[var(--color-on-surface-variant)]">
        Sirve para calcular el <b>descuento automático de combustible</b> de una liquidación: litros entregados en cada viaje × el
        precio del litro <b>de la fecha de ese viaje</b>. Cambia seguido, así que se registra cada vez que cambia; nunca se edita.
      </p>

      <div className="mb-4 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Hoy el litro cuesta</p>
        {vigente ? (
          <p className="text-2xl font-bold">
            {bs(vigente.precioPorLitro)} <span className="text-sm font-normal text-[var(--color-on-surface-variant)]">por litro, desde el {formatFecha(vigente.vigenteDesde)}</span>
          </p>
        ) : (
          <p className="flex items-center gap-2 font-semibold text-[var(--color-warning)]">
            <AlertTriangle size={15} /> Sin precio definido: el descuento automático de combustible no se puede calcular.
          </p>
        )}
      </div>

      <form className="space-y-3 rounded-lg border border-[var(--color-border-soft)] p-4" onSubmit={handleSubmit}>
        <p className="text-sm font-semibold">Registrar un precio nuevo</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Precio por litro (Bs)</label>
            <input required type="number" min="0.01" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={inputClassName} placeholder="Ej. 15,71" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Rige desde</label>
            <input required type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClassName} />
          </div>
        </div>
        <div aria-live="polite" className="space-y-1">
          {Number(precio) > 0 && desde ? (
            <p className="flex items-start gap-2 rounded-lg bg-[var(--color-primary)]/10 px-3 py-2 text-sm">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
              <span>Desde el {formatFecha(`${desde}T00:00:00.000Z`)} el litro costará <b>{bs(precio)}</b>. Los viajes anteriores a esa fecha siguen con el precio de antes.</span>
            </p>
          ) : null}
          {abierto && !fechaInvalida ? (
            <p className="flex items-start gap-2 text-xs text-[var(--color-on-surface-variant)]">
              <Info size={13} className="mt-0.5 shrink-0" />
              Reemplaza al de {bs(abierto.precioPorLitro)} (desde {formatFecha(abierto.vigenteDesde)}), que se cierra en la fecha nueva.
            </p>
          ) : null}
          {fechaInvalida && abierto ? (
            <p className="flex items-start gap-2 text-xs text-[var(--color-error)]">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              La fecha tiene que ser posterior al {formatFecha(abierto.vigenteDesde)}, cuando empezó el precio actual.
            </p>
          ) : null}
        </div>
        <button type="submit" disabled={!puedeGuardar || createMutation.isPending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-50">
          {createMutation.isPending ? "Guardando…" : "Guardar precio del litro"}
        </button>
      </form>

      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Historial</p>
      <div className="space-y-2 text-sm">
        {(verTodos ? precios : precios.slice(0, 5)).map((p) => {
          const e = estado(p);
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
              <div>
                <p className="font-semibold">{bs(p.precioPorLitro)} por litro</p>
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  desde {formatFecha(p.vigenteDesde)}
                  {p.vigenteHasta ? ` hasta ${formatFecha(p.vigenteHasta)}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${estadoClase[e]}`}>{e}</span>
            </div>
          );
        })}
        {precios.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Aún no hay precios registrados.</p> : null}
        {precios.length > 5 ? (
          <button type="button" className="rounded-lg border border-[var(--color-outline-variant)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)]" onClick={() => setVerTodos((v) => !v)}>
            {verTodos ? "Ver menos" : `Ver los ${precios.length} precios`}
          </button>
        ) : null}
      </div>
    </article>
  );
}
