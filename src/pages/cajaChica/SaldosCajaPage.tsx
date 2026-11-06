import { FormEvent, useEffect, useState } from "react";
import { Ban, Banknote, FileSpreadsheet, FileText, Landmark, PiggyBank, Scale } from "lucide-react";
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
  type FormaPagoBanco,
  type MovimientoBancoCaja
} from "@/features/movimientoBancoCaja/model/movimientoBancoCaja.schema";
import {
  useAnularMovimientoBancoMutation,
  useCreateMovimientoBancoCajaMutation,
  useCrearRemesaMovimientoBancoMutation,
  useMovimientosBancoCajaQuery,
  useVincularPresupuestoMovimientoBancoMutation
} from "@/features/movimientoBancoCaja/hooks/useMovimientoBancoCaja";
import { usePresupuestosCajaQuery } from "@/features/presupuestoCaja/hooks/usePresupuestoCaja";
import type { PresupuestoCaja } from "@/features/presupuestoCaja/model/presupuestoCaja.schema";
import { mensajeDeError } from "@/shared/api/core/apiError";
import { useAuth } from "@/features/auth/context/AuthContext";
import { CuadreSaldoCard } from "@/features/cuadreSaldo/ui/CuadreSaldoCard";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

// Año/mes/día LOCAL (Bolivia), nunca toISOString() sobre el instante
// actual: esa conversión corre a UTC antes de recortar, así que entre las
// 20:00 y las 23:59 hora boliviana ya devolvía la fecha de MAÑANA.
function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function primerDiaDelMes() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
}

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] invalid:border-[var(--color-error)] invalid:ring-1 invalid:ring-[var(--color-error)]/30";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

function normalizeError(error: unknown, fallbackMessage: string) {
  return mensajeDeError(error, fallbackMessage);
}

const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function etiquetaPresupuesto(p: Pick<PresupuestoCaja, "nombre" | "anio" | "mes" | "totalPresupuestado" | "totalRecibido">) {
  const total = p.totalPresupuestado ? ` · presupuestado ${formatMoneda(p.totalPresupuestado)}` : "";
  const recibido = p.totalRecibido ? ` · recibido ${formatMoneda(p.totalRecibido)}` : "";
  return `${p.nombre} (${MESES_CORTO[p.mes - 1]} ${p.anio})${total}${recibido}`;
}

// Valor del <select> de remesa que significa "crear una remesa nueva con la
// descripción del ingreso" en esa caja.
const PREFIJO_NUEVA = "nueva:";

function anioMesDe(fecha: string) {
  return { anio: Number(fecha.slice(0, 4)), mes: Number(fecha.slice(5, 7)) };
}

const selectSinRemesaClassName =
  "border-[var(--color-error)] text-[var(--color-error)] ring-1 ring-[var(--color-error)]/40 font-semibold";

function formatMoneda(value: number | string) {
  return Number(value).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// timeZone: "UTC" es a propósito: estas fechas son calendario (medianoche
// UTC guardada desde un <input type="date">), no un instante — sin esto,
// un navegador en Bolivia (UTC-4) las corre un día para atrás al mostrarlas.
function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO", { timeZone: "UTC" });
}

const ROLES_CUADRE = ["ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"];

const DETALLE_FONDO: Record<string, string> = {
  REMESA_PRESUPUESTO: "Remesa presupuesto",
  REMESA_SUELDOS: "Remesa para sueldos",
  REMESA_COMPRAS_GENERAL: "Remesa para compras",
  REMESA_OTROS: "Remesa varios",
  REPOSICION: "Reposición",
  AJUSTE_CUADRE: "Ajuste por cuadre de saldo"
};

export function SaldosCajaPage() {
  const { showError, showSuccess } = useToast();
  const { user } = useAuth();
  const puedeCuadrar = ROLES_CUADRE.includes(user?.role ?? "");

  const cajasQuery = useCajasChicasQuery();
  const cajas = cajasQuery.data?.data ?? [];
  const cuentasBancariasQuery = useCuentasBancariasCajaQuery();
  const cuentasBancarias = cuentasBancariasQuery.data?.data ?? [];

  const [cajaId, setCajaId] = useState("");
  useEffect(() => {
    if (!cajaId && cajas.length > 0) setCajaId(String(encontrarCajaLipena(cajas)?.id ?? ""));
  }, [cajas, cajaId]);

  // Rango del libro de movimientos: por defecto del 1° del mes actual a hoy,
  // editable. El saldo inicial que se muestra (y la primera fila de la
  // tabla) ya viene recalculado por el backend para reflejar todo lo
  // anterior a "Desde" — no es el saldo declarado en Parámetros a secas.
  const [fechaDesde, setFechaDesde] = useState(primerDiaDelMes);
  const [fechaHasta, setFechaHasta] = useState(today);

  const estadoCuentaQuery = useEstadoCuentaCajaQuery(cajaId ? Number(cajaId) : undefined, fechaDesde, fechaHasta);
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
    vistaSaldo === "BANCO" && cuentaSaldoId ? Number(cuentaSaldoId) : undefined,
    fechaDesde,
    fechaHasta
  );
  const estadoCuentaBancaria = estadoCuentaBancariaQuery.data?.data;

  const movimientosFondoQuery = useMovimientosFondoCajaQuery(cajaId ? Number(cajaId) : undefined);
  const movimientosFondo = movimientosFondoQuery.data?.data ?? [];
  const movimientosBancoQuery = useMovimientosBancoCajaQuery({});
  const movimientosBanco = movimientosBancoQuery.data?.data ?? [];

  const createFondoMutation = useCreateMovimientoFondoCajaMutation();
  const createBancoMutation = useCreateMovimientoBancoCajaMutation();
  const vincularMutation = useVincularPresupuestoMovimientoBancoMutation();
  const crearRemesaMutation = useCrearRemesaMovimientoBancoMutation();
  const anularMovimientoMutation = useAnularMovimientoBancoMutation();

  // Cada ingreso del banco trae una remesa del MISMO mes (una remesa puede
  // llegar en varias partes: todas sus partes se suman).
  const presupuestosQuery = usePresupuestosCajaQuery({});
  const presupuestos = presupuestosQuery.data?.data ?? [];
  const cajasActivas = cajas.filter((c) => c.activo);
  function remesasDelMes(fecha: string) {
    const { anio, mes } = anioMesDe(fecha);
    return presupuestos.filter((p) => p.activo && p.anio === anio && p.mes === mes);
  }
  // Los últimos 10 ingresos, y además cualquiera que todavía no tenga remesa.
  const ingresosBanco = movimientosBanco
    .filter((m) => m.tipo === "INGRESO")
    .filter((m, i) => i < 10 || (!m.anulado && !m.presupuesto));
  const salidasBanco = movimientosBanco.filter((m) => m.tipo === "SALIDA_A_CAJA").slice(0, 8);

  function handleVincular(movimiento: MovimientoBancoCaja, valor: string) {
    if (valor.startsWith(PREFIJO_NUEVA)) {
      const cajaNueva = Number(valor.slice(PREFIJO_NUEVA.length));
      crearRemesaMutation.mutate(
        { id: movimiento.id, cajaId: cajaNueva || undefined },
        {
          onSuccess: (r) => showSuccess(`Remesa "${r.data.presupuesto?.nombre ?? ""}" lista. Ya cuenta en la caja y en el Excel.`),
          onError: (error) => showError(normalizeError(error, "No se pudo crear la remesa."))
        }
      );
      return;
    }
    vincularMutation.mutate(
      { id: movimiento.id, presupuestoId: valor ? Number(valor) : null },
      {
        onSuccess: () => showSuccess(valor ? "Ingreso vinculado a la remesa." : "Ingreso sin remesa: ya no cuenta en la caja."),
        onError: (error) => showError(normalizeError(error, "No se pudo vincular la remesa."))
      }
    );
  }

  function handleAnularMovimiento(movimiento: MovimientoBancoCaja) {
    const que = movimiento.tipo === "INGRESO" ? "ingreso" : "salida";
    const motivo = window.prompt(
      `Anular ${que} del ${formatFecha(movimiento.fecha)} · ${movimiento.descripcion} · ${movimiento.moneda} ${formatMoneda(movimiento.monto)}.\n\n` +
        "Deja de contar en el saldo del banco" +
        (movimiento.tipo === "INGRESO" ? " y, si traía una remesa, sale de la caja y del Excel" : "") +
        ".\n\nMotivo (ej. Registrado dos veces):"
    );
    if (!motivo || !motivo.trim()) return;
    anularMovimientoMutation.mutate(
      { id: movimiento.id, motivo: motivo.trim() },
      {
        onSuccess: () => showSuccess(`${que === "ingreso" ? "Ingreso anulado" : "Salida anulada"}.`),
        onError: (error) => showError(normalizeError(error, "No se pudo anular el movimiento."))
      }
    );
  }

  // Opciones "+ Crear remesa" del <select>: una por caja activa (normalmente una sola).
  function opcionesNuevaRemesa(descripcion: string) {
    const nombre = descripcion.trim().toUpperCase();
    if (!nombre) return [<option key="nueva-vacia" value="" disabled>＋ Crear remesa nueva (primero escribe la descripción)</option>];
    return cajasActivas.map((c) => (
      <option key={`nueva-${c.id}`} value={`${PREFIJO_NUEVA}${c.id}`}>
        ＋ Crear remesa «{nombre}»{cajasActivas.length > 1 ? ` en ${c.nombre}` : ""}
      </option>
    ));
  }

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
  const [ingresoPresupuestoId, setIngresoPresupuestoId] = useState("");
  const remesasDelMesIngreso = remesasDelMes(ingresoFecha);
  // Si cambia la fecha a otro mes, la remesa elegida deja de valer.
  useEffect(() => {
    if (ingresoPresupuestoId && !ingresoPresupuestoId.startsWith(PREFIJO_NUEVA)
      && !remesasDelMesIngreso.some((p) => String(p.id) === ingresoPresupuestoId)) {
      setIngresoPresupuestoId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingresoFecha]);

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
    if (!ingresoPresupuestoId) {
      showError("Elige la remesa que trajo este ingreso o crea una nueva.");
      return;
    }
    // Aviso contra el error más común: registrar dos veces el mismo depósito.
    const monto = Number(ingresoMonto);
    const parecido = movimientosBanco.find(
      (m) =>
        m.tipo === "INGRESO" && !m.anulado && String(m.cuentaBancariaId) === ingresoCuentaBancariaId &&
        Math.abs(Number(m.monto) - monto) < 0.005 &&
        Math.abs(new Date(m.fecha).getTime() - new Date(ingresoFecha).getTime()) <= 31 * 86400000
    );
    if (
      parecido &&
      !window.confirm(
        `Ya hay un ingreso igual: ${formatFecha(parecido.fecha)} · ${parecido.descripcion} · ${parecido.moneda} ${formatMoneda(parecido.monto)}.\n\n¿Es otro depósito distinto y quieres registrarlo igual?`
      )
    ) {
      return;
    }
    const nueva = ingresoPresupuestoId.startsWith(PREFIJO_NUEVA);
    createBancoMutation.mutate(
      {
        cuentaBancariaId: Number(ingresoCuentaBancariaId),
        tipo: "INGRESO",
        fecha: ingresoFecha,
        formaPago: ingresoFormaPago,
        monto: Number(ingresoMonto),
        moneda: ingresoCuenta.monedaBase,
        depositanteNombre: ingresoDepositante.trim() || undefined,
        descripcion: ingresoDescripcion,
        presupuestoId: nueva ? undefined : Number(ingresoPresupuestoId),
        nuevaRemesa: nueva ? true : undefined,
        nuevaRemesaCajaId: nueva ? Number(ingresoPresupuestoId.slice(PREFIJO_NUEVA.length)) || undefined : undefined
      },
      {
        onSuccess: (r) => {
          showSuccess(`Ingreso registrado en la remesa "${r.data.presupuesto?.nombre ?? ""}".`);
          setIngresoMonto("");
          setIngresoDepositante("");
          setIngresoDescripcion("");
          setIngresoPresupuestoId("");
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
          <div className="flex flex-wrap items-center gap-2">
            {vistaSaldo === "CAJA" ? (
              <select value={cajaId} onChange={(e) => setCajaId(e.target.value)} className={`${inputClassName} w-56`}>
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            ) : (
              <select value={cuentaSaldoId} onChange={(e) => setCuentaSaldoId(e.target.value)} className={`${inputClassName} w-56`}>
                {cuentasBancarias.map((c) => (
                  <option key={c.id} value={c.id}>{c.banco} · {c.nombreCuenta}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1">
              <label className="text-[11px] text-[var(--color-on-surface-variant)]">Desde</label>
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className={`${inputClassName} w-40`} />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[11px] text-[var(--color-on-surface-variant)]">Hasta</label>
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className={`${inputClassName} w-40`} />
            </div>
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
                    Saldo inicial (al {formatFecha(fechaDesde)}
                    {estadoCuenta.fechaCorte ? `, desde el cierre del ${formatFecha(estadoCuenta.fechaCorte)}` : ""})
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
                    <tr className="bg-[var(--color-surface-container-highest)] font-semibold italic">
                      <td className="py-1 pr-3">{formatFecha(fechaDesde)}</td>
                      <td className="py-1 pr-3">Saldo inicial</td>
                      <td className="py-1 pr-3 text-right">—</td>
                      <td className="py-1 pr-3 text-right">—</td>
                      <td className="py-1 text-right">{formatMoneda(estadoCuenta.saldoInicial)}</td>
                    </tr>
                    {estadoCuenta.movimientos.map((m, index) => (
                      <tr key={index}>
                        <td className="py-1 pr-3">{formatFecha(m.fecha)}</td>
                        <td className="py-1 pr-3">
                          <span className={`mr-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${m.tipo === "FONDO" ? "bg-[var(--color-success)]/18 text-[var(--color-success)]" : "bg-[var(--color-error)]/18 text-[var(--color-error)]"}`}>
                            {m.tipo === "FONDO" ? "Fondo" : "Gasto"}
                          </span>
                          {DETALLE_FONDO[m.detalle] ?? m.detalle}{m.referencia ? ` · ${m.referencia}` : ""}
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
                <span className="block text-[11px] text-[var(--color-on-surface-variant)]">
                  Saldo inicial (al {formatFecha(fechaDesde)}, declarado en Parámetros)
                </span>
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
                  <tr className="bg-[var(--color-surface-container-highest)] font-semibold italic">
                    <td className="py-1 pr-3">{formatFecha(fechaDesde)}</td>
                    <td className="py-1 pr-3">Saldo inicial</td>
                    <td className="py-1 pr-3 text-right">—</td>
                    <td className="py-1 pr-3 text-right">—</td>
                    <td className="py-1 text-right">{formatMoneda(estadoCuentaBancaria.saldoInicial)}</td>
                  </tr>
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

      {puedeCuadrar ? <CuadreSaldoCard cajas={cajas} cuentasBancarias={cuentasBancarias} /> : null}

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
              <option value="REMESA_COMPRAS_GENERAL">Remesa para compras general</option>
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
            {estadoCuenta && String(estadoCuenta.caja.id) === fondoCajaId && Number(fondoMonto) > 0 ? (
              <p className="rounded-lg bg-[var(--color-primary)]/8 px-3 py-2 text-xs font-semibold text-[var(--color-primary)]">
                Hay {estadoCuenta.caja.monedaBase} {formatMoneda(estadoCuenta.saldoActual)} en {estadoCuenta.caja.nombre}. Con esto
                quedarán {formatMoneda(estadoCuenta.saldoActual + Number(fondoMonto))}.
              </p>
            ) : null}
            <button type="submit" disabled={createFondoMutation.isPending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
              {createFondoMutation.isPending ? "Guardando..." : "Registrar fondo"}
            </button>
          </form>
          <div className="mt-4 space-y-2 text-xs">
            {movimientosFondo.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                <span>
                  {formatFecha(item.fecha)}
                  {item.movimientoBanco?.presupuesto ? ` · ${item.movimientoBanco.presupuesto.nombre} (por el banco)` : ""}
                  {item.referencia ? ` · ${item.referencia}` : ""}
                </span>
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
              <p
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  (salidaCuenta.saldoActual ?? 0) - (Number(salidaMonto) || 0) < 0
                    ? "bg-[var(--color-error)]/10 text-[var(--color-error)]"
                    : "bg-[var(--color-primary)]/8 text-[var(--color-primary)]"
                }`}
              >
                Hay {salidaCuenta.monedaBase} {formatMoneda(salidaCuenta.saldoActual ?? 0)} en esta cuenta.
                {Number(salidaMonto) > 0
                  ? (salidaCuenta.saldoActual ?? 0) - Number(salidaMonto) >= 0
                    ? ` Después de esta salida quedarán ${formatMoneda((salidaCuenta.saldoActual ?? 0) - Number(salidaMonto))}.`
                    : " No alcanza para esta salida."
                  : ""}
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
          <div className="mt-4 space-y-2 text-xs">
            {salidasBanco.length > 0 ? (
              <p className="font-semibold text-[var(--color-on-surface-variant)]">Últimas salidas</p>
            ) : null}
            {salidasBanco.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border px-3 py-2 ${item.anulado ? "border-dashed border-[var(--color-border-soft)] opacity-70" : "border-[var(--color-border-soft)]"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`min-w-0 break-words ${item.anulado ? "line-through" : ""}`}>
                    {formatFecha(item.fecha)} · {item.descripcion}
                    {item.numeroCheque ? ` · CH-${item.numeroCheque}` : ""}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`font-mono font-bold ${item.anulado ? "line-through" : ""}`}>{item.moneda} {formatMoneda(item.monto)}</span>
                    {item.anulado ? null : (
                      <button
                        type="button"
                        onClick={() => handleAnularMovimiento(item)}
                        disabled={anularMovimientoMutation.isPending}
                        className="rounded p-1 text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10 disabled:opacity-50"
                        title="Anular esta salida (p. ej. si se registró dos veces)"
                      >
                        <Ban size={13} />
                      </button>
                    )}
                  </span>
                </div>
                {item.anulado ? <p className="mt-1 font-semibold text-[var(--color-error)]">Anulada: {item.motivoAnulacion}</p> : null}
              </div>
            ))}
          </div>
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
                Hay {ingresoCuenta.monedaBase} {formatMoneda(ingresoCuenta.saldoActual ?? 0)} en esta cuenta.
                {Number(ingresoMonto) > 0
                  ? ` Con este ingreso quedarán ${formatMoneda((ingresoCuenta.saldoActual ?? 0) + Number(ingresoMonto))}.`
                  : ""}
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
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
                Remesa que trajo este dinero (obligatoria, del mismo mes)
              </label>
              <select
                required
                value={ingresoPresupuestoId}
                onChange={(e) => setIngresoPresupuestoId(e.target.value)}
                className={`${inputClassName} ${ingresoPresupuestoId ? "" : selectSinRemesaClassName}`}
              >
                <option value="">Sin remesa: elige una o créala</option>
                {remesasDelMesIngreso.map((p) => (
                  <option key={p.id} value={p.id}>{etiquetaPresupuesto(p)}</option>
                ))}
                {opcionesNuevaRemesa(ingresoDescripcion)}
              </select>
              {remesasDelMesIngreso.length === 0 ? (
                <p className="mt-1 text-[11px] font-semibold text-[var(--color-error)]">
                  No hay remesas de {MESES_CORTO[anioMesDe(ingresoFecha).mes - 1]} {anioMesDe(ingresoFecha).anio}: créala con la descripción del ingreso.
                </p>
              ) : null}
            </div>
            <button type="submit" disabled={createBancoMutation.isPending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
              {createBancoMutation.isPending ? "Guardando..." : "Registrar ingreso"}
            </button>
          </form>
          <div className="mt-4 space-y-2 text-xs">
            <p className="font-semibold text-[var(--color-on-surface-variant)]">
              Últimos ingresos: cada uno debe tener su remesa del mismo mes (en rojo los que no la tienen)
            </p>
            {ingresosBanco.length === 0 ? (
              <p className="text-[var(--color-on-surface-variant)]">Todavía no hay ingresos registrados.</p>
            ) : null}
            {ingresosBanco.map((item) => {
              if (item.anulado) {
                return (
                  <div key={item.id} className="rounded-lg border border-dashed border-[var(--color-border-soft)] px-3 py-2 opacity-70">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 break-words line-through">{formatFecha(item.fecha)} · {item.descripcion}</span>
                      <span className="shrink-0 font-mono line-through">{item.moneda} {formatMoneda(item.monto)}</span>
                    </div>
                    <p className="mt-1 font-semibold text-[var(--color-error)]">Anulado: {item.motivoAnulacion}</p>
                  </div>
                );
              }
              const vinculado = item.presupuesto ?? null;
              const delMes = remesasDelMes(item.fecha);
              const remesa = vinculado ? presupuestos.find((p) => p.id === vinculado.id) : undefined;
              const diferencia =
                remesa && remesa.totalPresupuestado && remesa.totalRecibido !== undefined
                  ? remesa.totalRecibido - remesa.totalPresupuestado
                  : null;
              const ocupado = vincularMutation.isPending || crearRemesaMutation.isPending;
              return (
                <div
                  key={item.id}
                  className={`space-y-1.5 rounded-lg border px-3 py-2 ${
                    vinculado ? "border-[var(--color-border-soft)]" : "border-[var(--color-error)]/60 bg-[var(--color-error)]/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 break-words">
                      {formatFecha(item.fecha)} · {item.descripcion}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-mono font-bold">{item.moneda} {formatMoneda(item.monto)}</span>
                      <button
                        type="button"
                        onClick={() => handleAnularMovimiento(item)}
                        disabled={anularMovimientoMutation.isPending}
                        className="rounded p-1 text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10 disabled:opacity-50"
                        title="Anular este ingreso (p. ej. si se registró dos veces)"
                      >
                        <Ban size={13} />
                      </button>
                    </span>
                  </div>
                  <select
                    value={vinculado ? String(vinculado.id) : ""}
                    onChange={(e) => handleVincular(item, e.target.value)}
                    disabled={ocupado}
                    className={`${inputClassName} py-1.5 text-xs ${vinculado ? "" : selectSinRemesaClassName}`}
                  >
                    <option value="">Sin remesa: elige o crea una</option>
                    {vinculado && !delMes.some((p) => p.id === vinculado.id) ? (
                      <option value={vinculado.id}>{etiquetaPresupuesto({ ...vinculado, ...remesa })}</option>
                    ) : null}
                    {delMes.map((p) => (
                      <option key={p.id} value={p.id}>{etiquetaPresupuesto(p)}</option>
                    ))}
                    {opcionesNuevaRemesa(item.descripcion)}
                  </select>
                  {vinculado && !item.fondoCaja ? (
                    <p className="text-[var(--color-on-surface-variant)]">
                      No suma a la caja: es de un período que ya se cuadró o se rindió.
                    </p>
                  ) : null}
                  {diferencia !== null && Math.abs(diferencia) > 0.009 ? (
                    <p className="text-[var(--color-on-surface-variant)]">
                      La remesa {diferencia > 0 ? "recibió" : "todavía espera"} {formatMoneda(Math.abs(diferencia))} {diferencia > 0 ? "más de" : "para llegar a"} lo presupuestado.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
