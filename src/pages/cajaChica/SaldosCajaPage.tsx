import { FormEvent, useEffect, useState } from "react";
import { Banknote, FileSpreadsheet, FileText, Landmark, PiggyBank, Scale } from "lucide-react";
import { useEstadoCuentaBancariaQuery, useEstadoCuentaCajaQuery } from "@/features/reportesCajaChica/hooks/useReportesCajaChica";
import { exportEstadoCuentaExcel, exportEstadoCuentaPdf } from "@/features/reportesCajaChica/lib/cajaChicaExport";
import { useCajasChicasQuery, useCuentasBancariasCajaQuery } from "@/features/parametrosCajaChica/hooks/useParametrosCajaChica";
import { encontrarCajaLipena } from "@/features/parametrosCajaChica/lib/defaultCaja";
import {
  useCreateMovimientoFondoCajaMutation,
  useMovimientosFondoCajaQuery
} from "@/features/gastoCaja/hooks/useGastoCaja";
import type { MonedaCaja, TipoMovimientoFondoCaja } from "@/features/gastoCaja/model/gastoCaja.schema";
import {
  FORMA_PAGO_BANCO_LABEL,
  type FormaPagoBanco
} from "@/features/movimientoBancoCaja/model/movimientoBancoCaja.schema";
import {
  useCreateMovimientoBancoCajaMutation,
  useMovimientosBancoCajaQuery
} from "@/features/movimientoBancoCaja/hooks/useMovimientoBancoCaja";
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

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function formatMoneda(value: number | string) {
  return Number(value).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO");
}

export function SaldosCajaPage() {
  const { showError, showSuccess } = useToast();

  const cajasQuery = useCajasChicasQuery();
  const cajas = cajasQuery.data?.data ?? [];
  const cuentasBancariasQuery = useCuentasBancariasCajaQuery();
  const cuentasBancarias = cuentasBancariasQuery.data?.data ?? [];

  const [cajaId, setCajaId] = useState("");
  useEffect(() => {
    if (!cajaId && cajas.length > 0) setCajaId(String(encontrarCajaLipena(cajas)?.id ?? ""));
  }, [cajas, cajaId]);

  const estadoCuentaQuery = useEstadoCuentaCajaQuery(cajaId ? Number(cajaId) : undefined);
  const estadoCuenta = estadoCuentaQuery.data?.data;

  // El bloque de arriba ("Saldo de caja/banco") alterna entre mostrar el
  // detalle de una caja o el de una cuenta bancaria — se elige con las
  // pestañas de ahí mismo, o haciendo clic en una de las tarjetas de abajo.
  const [vistaSaldo, setVistaSaldo] = useState<"CAJA" | "BANCO">("CAJA");
  const [cuentaSaldoId, setCuentaSaldoId] = useState("");
  useEffect(() => {
    if (!cuentaSaldoId && cuentasBancarias.length > 0) setCuentaSaldoId(String(cuentasBancarias[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentasBancarias]);

  const estadoCuentaBancariaQuery = useEstadoCuentaBancariaQuery(
    vistaSaldo === "BANCO" && cuentaSaldoId ? Number(cuentaSaldoId) : undefined
  );
  const estadoCuentaBancaria = estadoCuentaBancariaQuery.data?.data;

  const movimientosFondoQuery = useMovimientosFondoCajaQuery(cajaId ? Number(cajaId) : undefined);
  const movimientosFondo = movimientosFondoQuery.data?.data ?? [];
  const movimientosBancoQuery = useMovimientosBancoCajaQuery({});
  const movimientosBanco = movimientosBancoQuery.data?.data ?? [];

  const createFondoMutation = useCreateMovimientoFondoCajaMutation();
  const createBancoMutation = useCreateMovimientoBancoCajaMutation();

  // --- Form: registrar fondo directo a la caja (sin pasar por un banco) ---
  const [fondoCajaId, setFondoCajaId] = useState("");
  const [fondoTipo, setFondoTipo] = useState<TipoMovimientoFondoCaja>("REPOSICION");
  const [fondoMonto, setFondoMonto] = useState("");
  const [fondoMoneda, setFondoMoneda] = useState<MonedaCaja>("BOB");
  const [fondoFecha, setFondoFecha] = useState(today);
  const [fondoReferencia, setFondoReferencia] = useState("");

  // --- Form: registrar salida del banco hacia una caja (cheque/transferencia) ---
  const [salidaCuentaBancariaId, setSalidaCuentaBancariaId] = useState("");
  const [salidaCajaId, setSalidaCajaId] = useState("");
  const [salidaFecha, setSalidaFecha] = useState(today);
  const [salidaFormaPago, setSalidaFormaPago] = useState<FormaPagoBanco>("DEPOSITO");
  const [salidaNumeroCheque, setSalidaNumeroCheque] = useState("");
  const [salidaMonto, setSalidaMonto] = useState("");
  const [salidaDepositante, setSalidaDepositante] = useState("");
  const [salidaDescripcion, setSalidaDescripcion] = useState("");

  // --- Form: registrar ingreso a una cuenta bancaria (presupuesto, sueldos) ---
  const [ingresoCuentaBancariaId, setIngresoCuentaBancariaId] = useState("");
  const [ingresoFecha, setIngresoFecha] = useState(today);
  const [ingresoFormaPago, setIngresoFormaPago] = useState<FormaPagoBanco>("DEPOSITO");
  const [ingresoMonto, setIngresoMonto] = useState("");
  const [ingresoDepositante, setIngresoDepositante] = useState("");
  const [ingresoDescripcion, setIngresoDescripcion] = useState("");

  useEffect(() => {
    if (cajas.length === 0) return;
    const lipena = String(encontrarCajaLipena(cajas)?.id ?? "");
    if (!fondoCajaId) setFondoCajaId(lipena);
    if (!salidaCajaId) setSalidaCajaId(lipena);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajas]);

  // La moneda del movimiento siempre es la misma que la de la cuenta bancaria
  // elegida (el backend la exige así) — nunca se elige aparte, para no
  // arriesgarse a mezclar monedas sin darse cuenta.
  const salidaCuenta = cuentasBancarias.find((c) => String(c.id) === salidaCuentaBancariaId);
  const ingresoCuenta = cuentasBancarias.find((c) => String(c.id) === ingresoCuentaBancariaId);

  function handleCreateFondo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createFondoMutation.mutate(
      {
        cajaId: Number(fondoCajaId),
        tipo: fondoTipo,
        monto: Number(fondoMonto),
        moneda: fondoMoneda,
        fecha: fondoFecha,
        referencia: fondoReferencia.trim() || undefined
      },
      {
        onSuccess: () => {
          showSuccess("Fondo registrado en la caja.");
          setFondoMonto("");
          setFondoReferencia("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el fondo."))
      }
    );
  }

  function handleCreateSalida(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!salidaCuenta) {
      showError("Elige una cuenta bancaria.");
      return;
    }
    createBancoMutation.mutate(
      {
        cuentaBancariaId: Number(salidaCuentaBancariaId),
        tipo: "SALIDA_A_CAJA",
        cajaId: Number(salidaCajaId),
        fecha: salidaFecha,
        formaPago: salidaFormaPago,
        numeroCheque: salidaFormaPago === "CHEQUE" ? salidaNumeroCheque.trim() || undefined : undefined,
        monto: Number(salidaMonto),
        moneda: salidaCuenta.monedaBase,
        depositanteNombre: salidaDepositante.trim() || undefined,
        descripcion: salidaDescripcion
      },
      {
        onSuccess: () => {
          showSuccess("Salida de banco hacia la caja registrada.");
          setSalidaMonto("");
          setSalidaNumeroCheque("");
          setSalidaDepositante("");
          setSalidaDescripcion("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar la salida de banco."))
      }
    );
  }

  function handleCreateIngreso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ingresoCuenta) {
      showError("Elige una cuenta bancaria.");
      return;
    }
    createBancoMutation.mutate(
      {
        cuentaBancariaId: Number(ingresoCuentaBancariaId),
        tipo: "INGRESO",
        fecha: ingresoFecha,
        formaPago: ingresoFormaPago,
        monto: Number(ingresoMonto),
        moneda: ingresoCuenta.monedaBase,
        depositanteNombre: ingresoDepositante.trim() || undefined,
        descripcion: ingresoDescripcion
      },
      {
        onSuccess: () => {
          showSuccess("Ingreso a la cuenta bancaria registrado.");
          setIngresoMonto("");
          setIngresoDepositante("");
          setIngresoDescripcion("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el ingreso."))
      }
    );
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <Scale size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Saldos y Movimientos</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              El único lugar del módulo donde ves cuánto hay disponible — en cada caja y en cada cuenta
              bancaria — y donde registras cualquier movimiento de dinero que no sea un gasto: dinero que
              llega al banco, dinero que sale del banco hacia una caja (por cheque o transferencia), o
              dinero que entra directo a una caja. Los gastos se registran en "Gastos"; el cierre formal
              del período, en "Rendiciones".
            </p>
          </div>
        </div>
      </header>

      {/* Saldo de la caja o cuenta bancaria seleccionada */}
      <article
        className={`rounded-xl border-2 p-5 ${
          vistaSaldo === "CAJA"
            ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/[0.06]"
            : "border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/[0.06]"
        }`}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                vistaSaldo === "CAJA"
                  ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                  : "bg-[var(--color-tertiary)]/20 text-[var(--color-tertiary)]"
              }`}
            >
              {vistaSaldo === "CAJA" ? <PiggyBank size={14} /> : <Landmark size={14} />}
            </span>
            <div className="flex rounded-lg border border-[var(--color-outline-variant)] p-0.5 text-xs font-bold uppercase tracking-wide">
              <button
                type="button"
                onClick={() => setVistaSaldo("CAJA")}
                className={`rounded-md px-3 py-1.5 transition ${vistaSaldo === "CAJA" ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "text-[var(--color-on-surface-variant)]"}`}
              >
                Caja
              </button>
              <button
                type="button"
                onClick={() => setVistaSaldo("BANCO")}
                className={`rounded-md px-3 py-1.5 transition ${vistaSaldo === "BANCO" ? "bg-[var(--color-tertiary)] text-[var(--color-on-primary)]" : "text-[var(--color-on-surface-variant)]"}`}
              >
                Banco
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {vistaSaldo === "CAJA" ? (
              <select value={cajaId} onChange={(e) => setCajaId(e.target.value)} className={`${inputClassName} w-64`}>
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            ) : (
              <select value={cuentaSaldoId} onChange={(e) => setCuentaSaldoId(e.target.value)} className={`${inputClassName} w-64`}>
                {cuentasBancarias.map((c) => (
                  <option key={c.id} value={c.id}>{c.banco} · {c.nombreCuenta}</option>
                ))}
              </select>
            )}
            {vistaSaldo === "CAJA" && estadoCuenta ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => exportEstadoCuentaExcel(estadoCuenta)} className={buttonSecondaryClassName}>
                  <FileSpreadsheet size={13} /> Excel
                </button>
                <button type="button" onClick={() => exportEstadoCuentaPdf(estadoCuenta)} className={buttonSecondaryClassName}>
                  <FileText size={13} /> PDF
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {vistaSaldo === "CAJA" ? (
          estadoCuentaQuery.isLoading ? (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Calculando saldo...</p>
          ) : estadoCuenta ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-4 text-sm sm:grid-cols-4">
                <p>
                  <span className="block text-[11px] text-[var(--color-on-surface-variant)]">
                    Saldo inicial{estadoCuenta.fechaCorte ? ` (cierre del ${formatFecha(estadoCuenta.fechaCorte)})` : " (declarado en Parámetros)"}
                  </span>
                  {formatMoneda(estadoCuenta.saldoInicial)}
                </p>
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">+ Fondos recibidos</span><span className="text-[var(--color-success)]">{formatMoneda(estadoCuenta.totalIngresos)}</span></p>
                <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">− Gastos</span><span className="text-[var(--color-error)]">{formatMoneda(estadoCuenta.totalEgresos)}</span></p>
                <p className="font-extrabold text-[var(--color-primary)]">
                  <span className="block text-[11px] font-normal text-[var(--color-on-surface-variant)]">= Saldo actual disponible</span>
                  <span className="font-mono text-lg">{estadoCuenta.caja.monedaBase} {formatMoneda(estadoCuenta.saldoActual)}</span>
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-lg border border-[var(--color-outline-variant)] p-2">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-[var(--color-surface-container-low)]">
                    <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      <th className="py-1 pr-3">Fecha</th>
                      <th className="py-1 pr-3">Detalle</th>
                      <th className="py-1 pr-3 text-right">Ingreso</th>
                      <th className="py-1 pr-3 text-right">Egreso</th>
                      <th className="py-1 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-soft)]">
                    {estadoCuenta.movimientos.map((m, index) => (
                      <tr key={index}>
                        <td className="py-1 pr-3">{formatFecha(m.fecha)}</td>
                        <td className="py-1 pr-3">
                          <span className={`mr-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${m.tipo === "FONDO" ? "bg-[var(--color-success)]/18 text-[var(--color-success)]" : "bg-[var(--color-error)]/18 text-[var(--color-error)]"}`}>
                            {m.tipo === "FONDO" ? "Fondo" : "Gasto"}
                          </span>
                          {m.detalle}{m.referencia ? ` · ${m.referencia}` : ""}
                        </td>
                        <td className="py-1 pr-3 text-right text-[var(--color-success)]">{m.ingreso > 0 ? formatMoneda(m.ingreso) : ""}</td>
                        <td className="py-1 pr-3 text-right text-[var(--color-error)]">{m.egreso > 0 ? formatMoneda(m.egreso) : ""}</td>
                        <td className="py-1 text-right font-semibold">{formatMoneda(m.saldo)}</td>
                      </tr>
                    ))}
                    {estadoCuenta.movimientos.length === 0 ? (
                      <tr><td colSpan={5} className="py-3 text-center text-[var(--color-on-surface-variant)]">Sin movimientos desde el saldo inicial.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Selecciona una caja para ver su saldo.</p>
          )
        ) : estadoCuentaBancariaQuery.isLoading ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">Calculando saldo...</p>
        ) : estadoCuentaBancaria ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-4 text-sm sm:grid-cols-4">
              <p>
                <span className="block text-[11px] text-[var(--color-on-surface-variant)]">Saldo inicial (declarado en Parámetros)</span>
                {formatMoneda(estadoCuentaBancaria.saldoInicial)}
              </p>
              <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">+ Ingresos</span><span className="text-[var(--color-success)]">{formatMoneda(estadoCuentaBancaria.totalIngresos)}</span></p>
              <p><span className="block text-[11px] text-[var(--color-on-surface-variant)]">− Salidas y gastos</span><span className="text-[var(--color-error)]">{formatMoneda(estadoCuentaBancaria.totalEgresos)}</span></p>
              <p className="font-extrabold text-[var(--color-tertiary)]">
                <span className="block text-[11px] font-normal text-[var(--color-on-surface-variant)]">= Saldo actual disponible</span>
                <span className="font-mono text-lg">{estadoCuentaBancaria.cuenta.monedaBase} {formatMoneda(estadoCuentaBancaria.saldoActual)}</span>
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-lg border border-[var(--color-outline-variant)] p-2">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-[var(--color-surface-container-low)]">
                  <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    <th className="py-1 pr-3">Fecha</th>
                    <th className="py-1 pr-3">Detalle</th>
                    <th className="py-1 pr-3 text-right">Ingreso</th>
                    <th className="py-1 pr-3 text-right">Egreso</th>
                    <th className="py-1 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {estadoCuentaBancaria.movimientos.map((m, index) => (
                    <tr key={index}>
                      <td className="py-1 pr-3">{formatFecha(m.fecha)}</td>
                      <td className="py-1 pr-3">
                        <span className={`mr-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${m.tipo === "FONDO" ? "bg-[var(--color-success)]/18 text-[var(--color-success)]" : "bg-[var(--color-error)]/18 text-[var(--color-error)]"}`}>
                          {m.tipo === "FONDO" ? "Mov." : "Gasto"}
                        </span>
                        {m.detalle}{m.referencia ? ` · ${m.referencia}` : ""}
                      </td>
                      <td className="py-1 pr-3 text-right text-[var(--color-success)]">{m.ingreso > 0 ? formatMoneda(m.ingreso) : ""}</td>
                      <td className="py-1 pr-3 text-right text-[var(--color-error)]">{m.egreso > 0 ? formatMoneda(m.egreso) : ""}</td>
                      <td className="py-1 text-right font-semibold">{formatMoneda(m.saldo)}</td>
                    </tr>
                  ))}
                  {estadoCuentaBancaria.movimientos.length === 0 ? (
                    <tr><td colSpan={5} className="py-3 text-center text-[var(--color-on-surface-variant)]">Sin movimientos desde el saldo inicial.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--color-on-surface-variant)]">Selecciona una cuenta bancaria para ver su saldo.</p>
        )}
      </article>

      {/* Saldo de cuentas bancarias */}
      <article className="rounded-xl border-2 border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/[0.06] p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-tertiary)]">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-tertiary)]/20 text-[var(--color-tertiary)]">
            <Landmark size={14} />
          </span>
          Saldo de cuentas bancarias
        </h2>
        <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
          Saldo inicial declarado + ingresos registrados − salidas hacia cajas. Si no coincide con tu
          extracto bancario real, es porque falta registrar un ingreso o una salida — agrégalo abajo. Haz
          clic en una tarjeta para ver su detalle completo arriba.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {estadoCuenta ? (
            <button
              type="button"
              onClick={() => setVistaSaldo("CAJA")}
              className={`rounded-lg border p-4 text-left transition ${
                vistaSaldo === "CAJA"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]"
                  : "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/6 hover:border-[var(--color-primary)]"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">Para comparar — caja</p>
              <p className="font-semibold">{estadoCuenta.caja.nombre}</p>
              <p className="mt-2 font-mono text-lg font-extrabold text-[var(--color-primary)]">{estadoCuenta.caja.monedaBase} {formatMoneda(estadoCuenta.saldoActual)}</p>
            </button>
          ) : null}
          {cuentasBancarias.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => {
                setVistaSaldo("BANCO");
                setCuentaSaldoId(String(c.id));
              }}
              className={`rounded-lg border p-4 text-left transition ${
                vistaSaldo === "BANCO" && cuentaSaldoId === String(c.id)
                  ? "border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10 ring-1 ring-[var(--color-tertiary)]"
                  : "border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] hover:border-[var(--color-tertiary)]"
              }`}
            >
              <p className="font-semibold">{c.banco}</p>
              <p className="text-xs text-[var(--color-on-surface-variant)]">{c.nombreCuenta}{c.numeroCuenta ? ` · N° ${c.numeroCuenta}` : ""}</p>
              <p className="mt-2 font-mono text-lg font-extrabold text-[var(--color-tertiary)]">{c.monedaBase} {formatMoneda(c.saldoActual ?? 0)}</p>
            </button>
          ))}
          {cuentasBancarias.length === 0 ? (
            <p className="text-xs text-[var(--color-on-surface-variant)]">Aún no hay cuentas bancarias. Créalas en Parámetros.</p>
          ) : null}
        </div>
      </article>

      {/* Registrar movimientos */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="rounded-xl border-2 border-[var(--color-success)]/40 bg-[var(--color-success)]/[0.05] p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-success)]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-success)]/20 text-[var(--color-success)]">
              <PiggyBank size={14} />
            </span>
            Fondo directo a la caja
          </h2>
          <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
            Para cuando el dinero entra a la caja sin pasar por una cuenta bancaria registrada aquí.
          </p>
          <form className="space-y-3" onSubmit={handleCreateFondo}>
            <select required value={fondoCajaId} onChange={(e) => setFondoCajaId(e.target.value)} className={inputClassName}>
              <option value="">Caja...</option>
              {cajas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <select value={fondoTipo} onChange={(e) => setFondoTipo(e.target.value as TipoMovimientoFondoCaja)} className={inputClassName}>
              <option value="REMESA_PRESUPUESTO">Remesa presupuesto</option>
              <option value="REMESA_SUELDOS">Remesa para sueldos</option>
              <option value="REMESA_OTROS">Remesa varios</option>
              <option value="REPOSICION">Reposición</option>
            </select>
            <div className="flex gap-2">
              <input required type="number" min="0.01" step="0.01" value={fondoMonto} onChange={(e) => setFondoMonto(e.target.value)} className={inputClassName} placeholder="Monto" />
              <select value={fondoMoneda} onChange={(e) => setFondoMoneda(e.target.value as MonedaCaja)} className={`${inputClassName} w-24`}>
                <option value="BOB">BOB</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <input required type="date" value={fondoFecha} onChange={(e) => setFondoFecha(e.target.value)} className={inputClassName} />
            <input value={fondoReferencia} onChange={(e) => setFondoReferencia(e.target.value)} className={inputClassName} placeholder="Referencia (opcional)" />
            <button type="submit" disabled={createFondoMutation.isPending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
              {createFondoMutation.isPending ? "Guardando..." : "Registrar fondo"}
            </button>
          </form>
          <div className="mt-4 space-y-2 text-xs">
            {movimientosFondo.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                <span>{formatFecha(item.fecha)}{item.referencia ? ` · ${item.referencia}` : ""}</span>
                <span className="font-mono font-bold">{item.moneda} {formatMoneda(item.monto)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border-2 border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/[0.05] p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-tertiary)]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-tertiary)]/20 text-[var(--color-tertiary)]">
              <Banknote size={14} />
            </span>
            Salida de banco → caja
          </h2>
          <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
            Cuando se saca dinero del banco hacia una caja, por cheque (con su número) o transferencia.
          </p>
          <form className="space-y-3" onSubmit={handleCreateSalida}>
            <select required value={salidaCuentaBancariaId} onChange={(e) => setSalidaCuentaBancariaId(e.target.value)} className={inputClassName}>
              <option value="">Cuenta bancaria...</option>
              {cuentasBancarias.map((c) => (
                <option key={c.id} value={c.id}>{c.banco} · {c.nombreCuenta} ({c.monedaBase} {formatMoneda(c.saldoActual ?? 0)} disponible)</option>
              ))}
            </select>
            {salidaCuenta ? (
              <p className="rounded-lg bg-[var(--color-primary)]/8 px-3 py-2 text-xs font-semibold text-[var(--color-primary)]">
                Disponible en esta cuenta: {salidaCuenta.monedaBase} {formatMoneda(salidaCuenta.saldoActual ?? 0)}
              </p>
            ) : null}
            <select required value={salidaCajaId} onChange={(e) => setSalidaCajaId(e.target.value)} className={inputClassName}>
              <option value="">Caja destino...</option>
              {cajas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <select value={salidaFormaPago} onChange={(e) => setSalidaFormaPago(e.target.value as FormaPagoBanco)} className={inputClassName}>
              {Object.entries(FORMA_PAGO_BANCO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {salidaFormaPago === "CHEQUE" ? (
              <input required value={salidaNumeroCheque} onChange={(e) => setSalidaNumeroCheque(e.target.value)} className={inputClassName} placeholder="N° de cheque" />
            ) : null}
            <div className="flex gap-2">
              <input required type="number" min="0.01" step="0.01" value={salidaMonto} onChange={(e) => setSalidaMonto(e.target.value)} className={inputClassName} placeholder="Monto" />
              <span className={`${inputClassName} flex w-20 items-center justify-center font-semibold text-[var(--color-on-surface-variant)]`}>
                {salidaCuenta?.monedaBase ?? "BOB"}
              </span>
            </div>
            <input required type="date" value={salidaFecha} onChange={(e) => setSalidaFecha(e.target.value)} className={inputClassName} />
            <input value={salidaDepositante} onChange={(e) => setSalidaDepositante(e.target.value)} className={inputClassName} placeholder="Depositante (opcional)" />
            <input required value={salidaDescripcion} onChange={(e) => setSalidaDescripcion(e.target.value)} className={inputClassName} placeholder="Descripción (ej. Remesa presupuesto septiembre)" />
            <button type="submit" disabled={createBancoMutation.isPending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
              {createBancoMutation.isPending ? "Guardando..." : "Registrar salida"}
            </button>
          </form>
        </article>

        <article className="rounded-xl border-2 border-[var(--color-primary)]/40 bg-[var(--color-primary)]/[0.05] p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-primary)]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
              <Landmark size={14} />
            </span>
            Ingreso a cuenta bancaria
          </h2>
          <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
            Cuando llega dinero al banco (presupuesto del mes, sueldos, etc.), antes de sacarlo hacia
            una caja.
          </p>
          <form className="space-y-3" onSubmit={handleCreateIngreso}>
            <select required value={ingresoCuentaBancariaId} onChange={(e) => setIngresoCuentaBancariaId(e.target.value)} className={inputClassName}>
              <option value="">Cuenta bancaria...</option>
              {cuentasBancarias.map((c) => (
                <option key={c.id} value={c.id}>{c.banco} · {c.nombreCuenta} ({c.monedaBase} {formatMoneda(c.saldoActual ?? 0)} actual)</option>
              ))}
            </select>
            {ingresoCuenta ? (
              <p className="rounded-lg bg-[var(--color-primary)]/8 px-3 py-2 text-xs font-semibold text-[var(--color-primary)]">
                Saldo actual de esta cuenta: {ingresoCuenta.monedaBase} {formatMoneda(ingresoCuenta.saldoActual ?? 0)}
              </p>
            ) : null}
            <select value={ingresoFormaPago} onChange={(e) => setIngresoFormaPago(e.target.value as FormaPagoBanco)} className={inputClassName}>
              {Object.entries(FORMA_PAGO_BANCO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input required type="number" min="0.01" step="0.01" value={ingresoMonto} onChange={(e) => setIngresoMonto(e.target.value)} className={inputClassName} placeholder="Monto" />
              <span className={`${inputClassName} flex w-20 items-center justify-center font-semibold text-[var(--color-on-surface-variant)]`}>
                {ingresoCuenta?.monedaBase ?? "BOB"}
              </span>
            </div>
            <input required type="date" value={ingresoFecha} onChange={(e) => setIngresoFecha(e.target.value)} className={inputClassName} />
            <input value={ingresoDepositante} onChange={(e) => setIngresoDepositante(e.target.value)} className={inputClassName} placeholder="Depositante (opcional)" />
            <input required value={ingresoDescripcion} onChange={(e) => setIngresoDescripcion(e.target.value)} className={inputClassName} placeholder="Descripción (ej. Presupuesto octubre)" />
            <button type="submit" disabled={createBancoMutation.isPending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
              {createBancoMutation.isPending ? "Guardando..." : "Registrar ingreso"}
            </button>
          </form>
          <div className="mt-4 space-y-2 text-xs">
            {movimientosBanco.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                <div>
                  <span className={`mr-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${item.tipo === "INGRESO" ? "bg-[var(--color-success)]/18 text-[var(--color-success)]" : "bg-[var(--color-error)]/18 text-[var(--color-error)]"}`}>
                    {item.tipo === "INGRESO" ? "Ingreso" : `→ ${item.caja?.nombre ?? ""}`}
                  </span>
                  {formatFecha(item.fecha)}
                </div>
                <span className="font-mono font-bold">{item.moneda} {formatMoneda(item.monto)}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
