import { FormEvent, useState } from "react";
import { CheckCircle2, Scale } from "lucide-react";
import {
  useCrearCuadreSaldoMutation,
  useCuadresSaldoQuery,
  usePrevisualizarCuadreQuery
} from "@/features/cuadreSaldo/hooks/useCuadreSaldo";
import { mensajeDeError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const formatMoneda = (n: number) => n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatFecha = (v: string) => new Date(v).toLocaleDateString("es-BO", { timeZone: "UTC" });

function primerDiaDelMes() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
}

interface Props {
  cajas: Array<{ id: number; nombre: string }>;
  cuentasBancarias: Array<{ id: number; banco: string; nombreCuenta: string }>;
}

// "Cuadrar saldo": se anota cuánto había DE VERDAD (contado o en el extracto)
// al empezar un día, y el sistema registra la diferencia como ajuste.
export function CuadreSaldoCard({ cajas, cuentasBancarias }: Props) {
  const { showError, showSuccess } = useToast();
  const [destino, setDestino] = useState("");
  const [fecha, setFecha] = useState(primerDiaDelMes);
  const [saldoReal, setSaldoReal] = useState("");
  const [motivo, setMotivo] = useState("");

  const [tipo, id] = destino.split(":");
  const destinoParams = destino
    ? tipo === "caja"
      ? { cajaId: Number(id) }
      : { cuentaBancariaId: Number(id) }
    : null;

  const previaQuery = usePrevisualizarCuadreQuery(destinoParams && fecha ? { ...destinoParams, fechaCorte: fecha } : null);
  const previa = previaQuery.data?.data;
  const cuadresQuery = useCuadresSaldoQuery();
  const crearMutation = useCrearCuadreSaldoMutation();

  const real = saldoReal === "" ? null : Number(saldoReal);
  const diferencia = previa && real !== null ? Math.round((real - previa.saldoSistema) * 100) / 100 : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!destinoParams || !previa || real === null || diferencia === null) return;
    const aviso =
      diferencia === 0
        ? "No hay diferencia: no se crea ningún ajuste, solo queda registrado el cuadre."
        : `Se registrará un ajuste de ${diferencia > 0 ? "+" : "−"}${formatMoneda(Math.abs(diferencia))} ${previa.moneda} en ${previa.nombre}.`;
    const ok = window.confirm(
      `${aviso}\n\nDesde el ${formatFecha(fecha)} el saldo partirá de ${formatMoneda(real)} ${previa.moneda}.\nYa no se podrá registrar, anular ni cambiar el monto de nada anterior a esa fecha.\n\n¿Confirmas el cuadre?`
    );
    if (!ok) return;
    crearMutation.mutate(
      { ...destinoParams, fechaCorte: fecha, saldoReal: real, motivo: motivo.trim() },
      {
        onSuccess: () => {
          showSuccess(`Saldo cuadrado: ${previa.nombre} parte de ${formatMoneda(real)} ${previa.moneda} desde el ${formatFecha(fecha)}.`);
          setSaldoReal("");
          setMotivo("");
        },
        onError: (error) => showError(mensajeDeError(error, "No se pudo registrar el cuadre."))
      }
    );
  }

  const cuadres = cuadresQuery.data?.data ?? [];

  return (
    <article className="rounded-xl border-2 border-[var(--color-secondary)]/40 bg-[var(--color-secondary)]/[0.05] p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-secondary)]">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-secondary)]/20">
          <Scale size={14} />
        </span>
        Cuadrar con el saldo real
      </h2>
      <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
        Si lo que hay de verdad en la caja (contado) o en el banco (extracto) no coincide con el sistema, anótalo aquí.
        El sistema registra la diferencia y desde esa fecha todo parte del monto real. Lo anterior a esa fecha queda cerrado.
      </p>
      <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">¿Qué vas a cuadrar?</label>
          <select required value={destino} onChange={(e) => setDestino(e.target.value)} className={inputClassName}>
            <option value="">Elige una caja o una cuenta...</option>
            <optgroup label="Cajas">
              {cajas.map((c) => (
                <option key={`caja-${c.id}`} value={`caja:${c.id}`}>{c.nombre}</option>
              ))}
            </optgroup>
            <optgroup label="Cuentas bancarias">
              {cuentasBancarias.map((c) => (
                <option key={`banco-${c.id}`} value={`banco:${c.id}`}>{c.banco} · {c.nombreCuenta}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Saldo real al empezar el día</label>
          <input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClassName} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
            Monto real {previa ? `(${previa.moneda})` : ""}
          </label>
          <input
            required
            type="number"
            step="0.01"
            value={saldoReal}
            onChange={(e) => setSaldoReal(e.target.value)}
            className={inputClassName}
            placeholder="Lo que hay de verdad"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">¿De dónde sale este monto?</label>
          <input
            required
            minLength={5}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={inputClassName}
            placeholder="Ej. Conteo físico del 1 de octubre / Extracto del banco"
          />
        </div>

        <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-sm sm:col-span-2">
          {!destinoParams ? (
            <span className="text-[var(--color-on-surface-variant)]">Elige qué vas a cuadrar para ver cuánto calcula el sistema.</span>
          ) : previaQuery.isLoading ? (
            <span className="text-[var(--color-on-surface-variant)]">Calculando...</span>
          ) : previaQuery.isError ? (
            <span className="text-[var(--color-error)]">{mensajeDeError(previaQuery.error, "No se puede cuadrar esa fecha.")}</span>
          ) : previa ? (
            <span>
              Según el sistema, al empezar el {formatFecha(fecha)} había{" "}
              <strong>{previa.moneda} {formatMoneda(previa.saldoSistema)}</strong>.
              {diferencia !== null ? (
                diferencia === 0 ? (
                  <span className="text-[var(--color-success)]"> Coincide con el monto real: no hay que ajustar nada.</span>
                ) : (
                  <span className={diferencia > 0 ? "text-[var(--color-success)]" : "text-[var(--color-error)]"}>
                    {" "}Diferencia: <strong>{diferencia > 0 ? "+" : "−"}{formatMoneda(Math.abs(diferencia))}</strong>{" "}
                    ({diferencia > 0 ? "hay más de lo registrado" : "hay menos de lo registrado"}).
                  </span>
                )
              ) : null}
            </span>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={crearMutation.isPending || !previa || real === null}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60 sm:col-span-2"
        >
          {crearMutation.isPending ? "Guardando..." : "Cuadrar saldo"}
        </button>
      </form>

      {cuadres.length > 0 ? (
        <div className="mt-4 space-y-1.5 text-xs">
          <p className="font-semibold text-[var(--color-on-surface-variant)]">Cuadres registrados</p>
          {cuadres.slice(0, 8).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
              <span className="min-w-0 flex-1">
                <CheckCircle2 size={12} className="mr-1 inline text-[var(--color-success)]" />
                <strong>{c.caja?.nombre ?? `${c.cuentaBancaria?.banco} · ${c.cuentaBancaria?.nombreCuenta}`}</strong> al{" "}
                {formatFecha(c.fechaCorte)} · {c.motivo}
                {c.usuario ? <span className="text-[var(--color-on-surface-variant)]"> · {c.usuario.nombre}</span> : null}
              </span>
              <span className="font-mono">
                real {formatMoneda(c.saldoReal)}{" "}
                <span className={c.diferencia === 0 ? "" : c.diferencia > 0 ? "text-[var(--color-success)]" : "text-[var(--color-error)]"}>
                  ({c.diferencia > 0 ? "+" : c.diferencia < 0 ? "−" : ""}{formatMoneda(Math.abs(c.diferencia))})
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
