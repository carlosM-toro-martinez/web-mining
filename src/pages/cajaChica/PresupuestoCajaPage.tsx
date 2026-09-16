import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Landmark, Trash2, Wallet } from "lucide-react";
import {
  useCajasChicasQuery,
  useCreatePartidaPresupuestoCajaMutation,
  useCuentasBancariasCajaQuery,
  useDeletePartidaPresupuestoCajaMutation,
  usePartidasPresupuestoCajaQuery
} from "@/features/parametrosCajaChica/hooks/useParametrosCajaChica";
import { encontrarCajaLipena } from "@/features/parametrosCajaChica/lib/defaultCaja";
import { exportPlanillaControlPagosExcel, exportPlanillaControlPagosPdf } from "@/features/reportesCajaChica/lib/cajaChicaExport";
import { useCreateMovimientoBancoCajaMutation } from "@/features/movimientoBancoCaja/hooks/useMovimientoBancoCaja";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] invalid:border-[var(--color-error)] invalid:ring-1 invalid:ring-[var(--color-error)]/30";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

const MESES_NOMBRE = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function formatMoneda(value: number) {
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

export function PresupuestoCajaPage() {
  const { showError, showSuccess } = useToast();
  const now = new Date();

  const cajasQuery = useCajasChicasQuery();
  const cajas = cajasQuery.data?.data ?? [];
  const cuentasBancariasQuery = useCuentasBancariasCajaQuery();
  const cuentasBancarias = cuentasBancariasQuery.data?.data ?? [];

  const [cajaId, setCajaId] = useState("");
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [descripcion, setDescripcion] = useState("");
  const [montoPresupuestado, setMontoPresupuestado] = useState("");
  const [bancoDestinoId, setBancoDestinoId] = useState("");
  const bancoDestino = cuentasBancarias.find((c) => String(c.id) === bancoDestinoId);

  useEffect(() => {
    if (!cajaId && cajas.length > 0) setCajaId(String(encontrarCajaLipena(cajas)?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajas]);

  const partidasQuery = usePartidasPresupuestoCajaQuery({
    cajaId: cajaId ? Number(cajaId) : undefined,
    anio,
    mes
  });
  const partidas = useMemo(() => partidasQuery.data?.data ?? [], [partidasQuery.data]);
  const periodoLabel = `${MESES_NOMBRE[mes - 1]} ${anio}`;

  const totalPresupuestado = partidas.reduce((sum, p) => sum + Number(p.montoPresupuestado), 0);
  const totalGastado = partidas.reduce((sum, p) => sum + (p.totalGastado ?? 0), 0);
  const totalSaldoAFavor = partidas.reduce((sum, p) => sum + (p.saldoAFavor ?? 0), 0);

  const createMutation = useCreatePartidaPresupuestoCajaMutation();
  const deleteMutation = useDeletePartidaPresupuestoCajaMutation();
  const asignarBancoMutation = useCreateMovimientoBancoCajaMutation();

  function handleAsignarBanco() {
    if (!bancoDestino) {
      showError("Elige a qué cuenta bancaria se asignó el presupuesto.");
      return;
    }
    if (totalPresupuestado <= 0) {
      showError("No hay presupuesto para asignar en este período.");
      return;
    }
    asignarBancoMutation.mutate(
      {
        cuentaBancariaId: bancoDestino.id,
        tipo: "INGRESO",
        fecha: today(),
        formaPago: "DEPOSITO",
        monto: totalPresupuestado,
        moneda: bancoDestino.monedaBase,
        descripcion: `Presupuesto aprobado y asignado — ${periodoLabel}`
      },
      {
        onSuccess: () => showSuccess(`Presupuesto de ${periodoLabel} asignado a ${bancoDestino.banco}.`),
        onError: (error) => showError(normalizeError(error, "No se pudo asignar el presupuesto al banco."))
      }
    );
  }

  function handleCreatePartida(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cajaId) {
      showError("Elige una caja primero.");
      return;
    }
    createMutation.mutate(
      {
        cajaId: Number(cajaId),
        anio,
        mes,
        descripcion,
        montoPresupuestado: Number(montoPresupuestado)
      },
      {
        onSuccess: () => {
          showSuccess("Partida de presupuesto creada.");
          setDescripcion("");
          setMontoPresupuestado("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la partida de presupuesto."))
      }
    );
  }

  function handleDeletePartida(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => showSuccess("Partida eliminada."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar la partida."))
    });
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <Wallet size={18} />
          </div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">Presupuesto</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Para qué se pidió el dinero de cada mes ("partidas") y cuánto queda a favor de cada una.
              Ejemplo: presupuestas 5000 para "Combustible", si se gastaron 4800, el saldo a favor es 200.
              Al registrar un gasto en "Gastos", puedes vincularlo a una de estas partidas para que su
              ejecución se actualice sola.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h3 className="mb-4 text-lg font-bold">Nueva partida de presupuesto</h3>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={handleCreatePartida}>
          <select value={cajaId} onChange={(e) => setCajaId(e.target.value)} className={inputClassName}>
            <option value="">Elige una caja</option>
            {cajas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={inputClassName}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={inputClassName}>
            {MESES_NOMBRE.map((nombre, index) => (
              <option key={nombre} value={index + 1}>{nombre}</option>
            ))}
          </select>
          <input
            required
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={inputClassName}
            placeholder="Descripción (ej. Combustible)"
          />
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={montoPresupuestado}
            onChange={(e) => setMontoPresupuestado(e.target.value)}
            className={inputClassName}
            placeholder="Monto presupuestado"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60 sm:col-span-2 lg:col-span-5"
          >
            {createMutation.isPending ? "Guardando..." : "Guardar partida"}
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            Partidas de {periodoLabel}
          </h2>
          {partidas.length > 0 ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => exportPlanillaControlPagosExcel(partidas, periodoLabel)} className={buttonSecondaryClassName}>
                <FileSpreadsheet size={13} /> Exportar Excel
              </button>
              <button type="button" onClick={() => exportPlanillaControlPagosPdf(partidas, periodoLabel)} className={buttonSecondaryClassName}>
                <FileText size={13} /> Exportar PDF
              </button>
            </div>
          ) : null}
        </div>
        <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
          Presupuestado vs. gastado por partida, para la caja y el mes elegidos arriba. La
          "Reposición" es lo que sobró (presupuestado − gastado), tal cual tu planilla real.
        </p>

        {partidas.length > 0 ? (
          <div className="mb-4 space-y-3 rounded-lg border border-[var(--color-on-surface)]/20 bg-[var(--color-surface-container-high)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold uppercase tracking-wide">Total Presupuesto</span>
              <span className="font-mono text-lg font-extrabold">{formatMoneda(totalPresupuestado)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border-soft)] pt-3">
              <Landmark size={14} className="shrink-0 text-[var(--color-primary)]" />
              <p className="mr-2 text-xs text-[var(--color-on-surface-variant)]">
                Cuando se apruebe este presupuesto y el dinero llegue al banco, regístralo aquí:
              </p>
              <select
                value={bancoDestinoId}
                onChange={(e) => setBancoDestinoId(e.target.value)}
                className={`${inputClassName} w-auto flex-1`}
              >
                <option value="">Cuenta bancaria destino...</option>
                {cuentasBancarias.map((c) => (
                  <option key={c.id} value={c.id}>{c.banco} · {c.nombreCuenta}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAsignarBanco}
                disabled={asignarBancoMutation.isPending}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
              >
                {asignarBancoMutation.isPending ? "Asignando..." : "Aprobar y asignar al banco"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                <th className="border border-[var(--color-border-soft)] px-2 py-1.5">N°</th>
                <th className="border border-[var(--color-border-soft)] px-2 py-1.5">Descripción</th>
                <th className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">Total Presupuestado</th>
                <th className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">Total Gastado</th>
                <th className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">Total Reposición</th>
                <th className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">% Ejecución</th>
                <th className="border border-[var(--color-border-soft)] px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {partidas.map((p, index) => (
                <tr key={p.id} className="group">
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-[var(--color-on-surface-variant)]">{index + 1}</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5">{p.descripcion}</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">{formatMoneda(Number(p.montoPresupuestado))}</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">{formatMoneda(p.totalGastado ?? 0)}</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right font-semibold">{formatMoneda(p.saldoAFavor ?? 0)}</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">{(p.porcentajeEjecucion ?? 0).toFixed(1)}%</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeletePartida(p.id)}
                      className="rounded p-1 text-[var(--color-error)] opacity-0 transition hover:bg-[var(--color-error)]/10 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {partidas.length === 0 ? (
                <tr><td colSpan={7} className="border border-[var(--color-border-soft)] py-3 text-center text-[var(--color-on-surface-variant)]">Sin partidas de presupuesto para este mes.</td></tr>
              ) : null}
            </tbody>
            {partidas.length > 0 ? (
              <tfoot>
                <tr className="font-bold">
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5" colSpan={2}>Total</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">{formatMoneda(totalPresupuestado)}</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">{formatMoneda(totalGastado)}</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">{formatMoneda(totalSaldoAFavor)}</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right"></td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5"></td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </article>
    </section>
  );
}
