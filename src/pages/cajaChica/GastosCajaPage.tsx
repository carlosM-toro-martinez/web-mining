import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Pencil,
  Plus,
  RefreshCw,
  Wallet,
  X
} from "lucide-react";
import {
  useAnularGastoCajaMutation,
  useCreateGastoCajaMutation,
  useGastosCajaQuery,
  useUpdateGastoCajaMutation
} from "@/features/gastoCaja/hooks/useGastoCaja";
import { useGastoCajaOfflineQueue } from "@/features/gastoCaja/hooks/useGastoCajaOfflineQueue";
import {
  CATEGORIA_RENDICION_LABEL,
  type CategoriaRendicionGasto,
  type CategoriaRetencionGasto,
  type EstadoGastoCaja,
  type GastoCaja,
  type MonedaCaja,
  type OrigenGastoCaja,
  type TipoDocumentoGasto
} from "@/features/gastoCaja/model/gastoCaja.schema";
import {
  useCajasChicasQuery,
  useCentrosCostoCajaQuery,
  useConceptosRetencionCajaQuery,
  useCuentasBancariasCajaQuery,
  useCuentasContablesCajaQuery,
  useFuncionesGastoCajaQuery,
  usePartidasPresupuestoCajaQuery
} from "@/features/parametrosCajaChica/hooks/useParametrosCajaChica";
import { encontrarCajaLipena } from "@/features/parametrosCajaChica/lib/defaultCaja";
import type { PartidaPresupuestoCaja } from "@/features/parametrosCajaChica/model/parametrosCajaChica.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

function today() {
  return new Date().toISOString().slice(0, 10);
}

// text-base (16px) en móvil evita el zoom automático de iOS al enfocar un
// input con font-size menor a 16px; en sm+ se reduce a como estaba antes.
const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-3 text-base text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] invalid:border-[var(--color-error)] invalid:ring-1 invalid:ring-[var(--color-error)]/30 sm:py-2.5 sm:text-sm";

const MESES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

const ESTADO_LABEL: Record<EstadoGastoCaja, string> = {
  REGISTRADO: "Registrado",
  RENDIDO: "Rendido",
  ANULADO: "Anulado"
};
const ESTADO_CLASS: Record<EstadoGastoCaja, string> = {
  REGISTRADO: "bg-[var(--color-primary)]/18 text-[var(--color-primary)]",
  RENDIDO: "bg-[var(--color-success)]/18 text-[var(--color-success)]",
  ANULADO: "bg-[var(--color-error)]/18 text-[var(--color-error)]"
};

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function formatMoneda(value: string | number) {
  return Number(value).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO");
}

export function GastosCajaPage() {
  const { showError, showSuccess } = useToast();

  const cajasQuery = useCajasChicasQuery();
  const cuentasBancariasQuery = useCuentasBancariasCajaQuery();
  const centrosQuery = useCentrosCostoCajaQuery();
  const funcionesQuery = useFuncionesGastoCajaQuery();
  const cuentasQuery = useCuentasContablesCajaQuery();
  const retencionesQuery = useConceptosRetencionCajaQuery();
  const partidasQuery = usePartidasPresupuestoCajaQuery();
  const { pendientes, encolar, sincronizar, sincronizando } = useGastoCajaOfflineQueue();

  const [filtroCaja, setFiltroCaja] = useState("");
  const gastosQuery = useGastosCajaQuery({ cajaId: filtroCaja ? Number(filtroCaja) : undefined, limit: 50 });

  const createGastoMutation = useCreateGastoCajaMutation();
  const updateGastoMutation = useUpdateGastoCajaMutation();
  const anularGastoMutation = useAnularGastoCajaMutation();

  const cajas = cajasQuery.data?.data ?? [];
  const cuentasBancarias = cuentasBancariasQuery.data?.data ?? [];
  const centros = centrosQuery.data?.data.filter((c) => c.parentId !== null) ?? [];
  const funciones = funcionesQuery.data?.data.filter((f) => f.parentId !== null) ?? [];
  const cuentas = cuentasQuery.data?.data ?? [];
  const retenciones = retencionesQuery.data?.data ?? [];
  const partidas = partidasQuery.data?.data ?? [];
  const gastos = gastosQuery.data?.data ?? [];

  const centroOptions = useMemo(
    () => centros.map((c) => ({ id: String(c.id), label: `${c.codigo} · ${c.nombre}`, searchText: c.codigo })),
    [centros]
  );
  const funcionOptions = useMemo(
    () => funciones.map((f) => ({ id: String(f.id), label: `${f.codigo} · ${f.nombre}`, searchText: f.codigo })),
    [funciones]
  );
  const cuentaOptions = useMemo(
    () => cuentas.map((c) => ({ id: String(c.id), label: `${c.codigo} · ${c.nombre}`, searchText: c.codigo })),
    [cuentas]
  );
  const partidaOptions = useMemo(
    () =>
      partidas.map((p) => ({
        id: String(p.id),
        label: p.presupuesto?.nombre ? `${p.presupuesto.nombre} · ${p.descripcion}` : p.descripcion,
        searchText: p.descripcion
      })),
    [partidas]
  );

  // Partidas de cualquier remesa que todavía tienen saldo disponible (más
  // recientes primero), en una sola lista plana — con muchos pendientes
  // acumulados, una tarjeta por remesa se vuelve interminable, así que esto
  // se pagina de a PENDIENTES_POR_PAGINA en vez de mostrarlas todas juntas.
  const partidasPendientes = useMemo(() => {
    return partidas
      .filter((p) => (p.saldoAFavor ?? Number(p.montoPresupuestado)) > 0.009)
      .sort((a, b) => {
        const anioA = a.presupuesto?.anio ?? 0;
        const anioB = b.presupuesto?.anio ?? 0;
        if (anioA !== anioB) return anioB - anioA;
        const mesA = a.presupuesto?.mes ?? 0;
        const mesB = b.presupuesto?.mes ?? 0;
        if (mesA !== mesB) return mesB - mesA;
        return a.descripcion.localeCompare(b.descripcion);
      });
  }, [partidas]);

  const PENDIENTES_POR_PAGINA = 5;
  const [mostrarPendientes, setMostrarPendientes] = useState(false);
  const [paginaPendientes, setPaginaPendientes] = useState(0);
  const totalPaginasPendientes = Math.max(1, Math.ceil(partidasPendientes.length / PENDIENTES_POR_PAGINA));
  const paginaPendientesActual = Math.min(paginaPendientes, totalPaginasPendientes - 1);
  const partidasPendientesPagina = partidasPendientes.slice(
    paginaPendientesActual * PENDIENTES_POR_PAGINA,
    paginaPendientesActual * PENDIENTES_POR_PAGINA + PENDIENTES_POR_PAGINA
  );

  const tasaRcIva = useMemo(() => Number(retenciones.find((r) => r.codigo === "RC_IVA")?.porcentaje ?? 0) / 100, [retenciones]);
  const tasaIueCompras = useMemo(() => Number(retenciones.find((r) => r.codigo === "IUE_COMPRAS")?.porcentaje ?? 0) / 100, [retenciones]);
  const tasaIt = useMemo(() => Number(retenciones.find((r) => r.codigo === "IT")?.porcentaje ?? 0) / 100, [retenciones]);

  const [origen, setOrigen] = useState<OrigenGastoCaja>("CAJA");
  const [cajaId, setCajaId] = useState("");
  const [cuentaBancariaCajaId, setCuentaBancariaCajaId] = useState("");
  const [fecha, setFecha] = useState(today);
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoGasto>("FACTURA");
  const [categoriaRetencion, setCategoriaRetencion] = useState<CategoriaRetencionGasto>("SERVICIO");
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [proveedorNitCi, setProveedorNitCi] = useState("");
  const [glosa, setGlosa] = useState("");
  const [numeroRespaldo, setNumeroRespaldo] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [moneda, setMoneda] = useState<MonedaCaja>("BOB");
  const [centroCostoCajaId, setCentroCostoCajaId] = useState("");
  const [funcionGastoCajaId, setFuncionGastoCajaId] = useState("");
  const [cuentaContableCajaId, setCuentaContableCajaId] = useState("");
  const [partidaPresupuestoId, setPartidaPresupuestoId] = useState("");
  const [categoriaRendicion, setCategoriaRendicion] = useState<CategoriaRendicionGasto>("MATERIALES_SUMINISTROS");
  const cuentaBancariaSeleccionada = cuentasBancarias.find((c) => String(c.id) === cuentaBancariaCajaId);
  const esReciboDirecto = tipoDocumento === "RECIBO_DIRECTO";

  // Caja Bolivianos Lipeña es la única que se usa a diario: se preselecciona
  // sola en cuanto carga la lista.
  useEffect(() => {
    if (cajas.length === 0) return;
    const lipena = String(encontrarCajaLipena(cajas)?.id ?? "");
    if (!cajaId) setCajaId(lipena);
    if (!filtroCaja) setFiltroCaja(lipena);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajas]);

  const preview = useMemo(() => {
    const monto = Number(montoTotal) || 0;
    if (monto <= 0) return null;

    if (tipoDocumento === "FACTURA") {
      return { creditoFiscal: monto * tasaRcIva, retencionRcIva: 0, retencionIueCompras: 0, retencionIt: 0, noDeducible: false };
    }
    if (tipoDocumento === "RECIBO_DIRECTO") {
      return { creditoFiscal: 0, retencionRcIva: 0, retencionIueCompras: 0, retencionIt: 0, noDeducible: true };
    }
    const retencionIt = monto * tasaIt;
    if (categoriaRetencion === "SERVICIO") {
      return { creditoFiscal: 0, retencionRcIva: monto * tasaRcIva, retencionIueCompras: 0, retencionIt, noDeducible: false };
    }
    return { creditoFiscal: 0, retencionRcIva: 0, retencionIueCompras: monto * tasaIueCompras, retencionIt, noDeducible: false };
  }, [montoTotal, tipoDocumento, categoriaRetencion, tasaRcIva, tasaIueCompras, tasaIt]);

  function resetGastoForm() {
    setProveedorNombre("");
    setProveedorNitCi("");
    setGlosa("");
    setNumeroRespaldo("");
    setMontoTotal("");
  }

  // Autocompleta el formulario con la clasificación guardada en una partida
  // pendiente: solo queda por poner el origen (caja/banco) y el proveedor o
  // beneficiario real de este gasto puntual.
  function handleUsarPartida(p: PartidaPresupuestoCaja) {
    setPartidaPresupuestoId(String(p.id));
    setGlosa(p.descripcion);
    const pendiente = p.saldoAFavor ?? Number(p.montoPresupuestado);
    if (pendiente > 0) setMontoTotal(String(pendiente));
    if (p.centroCostoCajaId) setCentroCostoCajaId(String(p.centroCostoCajaId));
    if (p.funcionGastoCajaId) setFuncionGastoCajaId(String(p.funcionGastoCajaId));
    if (p.cuentaContableCajaId) setCuentaContableCajaId(String(p.cuentaContableCajaId));
    if (p.categoriaRendicion) setCategoriaRendicion(p.categoriaRendicion);
    if (p.caja?.monedaBase) setMoneda(p.caja.monedaBase);
    if (p.caja?.id) {
      setOrigen("CAJA");
      setCajaId(String(p.caja.id));
    }
    setMostrarPendientes(false);
    showSuccess(`Formulario completado con "${p.descripcion}". Falta el origen y el proveedor/beneficiario.`);
  }

  function handleCreateGasto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (origen === "CAJA" && !cajaId) {
      showError("Elige una caja.");
      return;
    }
    if (origen === "BANCO" && !cuentaBancariaCajaId) {
      showError("Elige la cuenta bancaria de donde sale el pago.");
      return;
    }
    const payload = {
      origen,
      cajaId: origen === "CAJA" ? Number(cajaId) : undefined,
      cuentaBancariaCajaId: origen === "BANCO" ? Number(cuentaBancariaCajaId) : undefined,
      fecha,
      tipoDocumento,
      categoriaRetencion: tipoDocumento === "CONTRATO_RETENCION" ? categoriaRetencion : undefined,
      categoriaRendicion,
      proveedorNombre,
      proveedorNitCi: proveedorNitCi.trim() || undefined,
      glosa,
      numeroRespaldo: numeroRespaldo.trim() || undefined,
      montoTotal: Number(montoTotal),
      moneda: origen === "BANCO" && cuentaBancariaSeleccionada ? cuentaBancariaSeleccionada.monedaBase : moneda,
      centroCostoCajaId: centroCostoCajaId ? Number(centroCostoCajaId) : undefined,
      funcionGastoCajaId: funcionGastoCajaId ? Number(funcionGastoCajaId) : undefined,
      cuentaContableCajaId: cuentaContableCajaId ? Number(cuentaContableCajaId) : undefined,
      partidaPresupuestoId: partidaPresupuestoId ? Number(partidaPresupuestoId) : undefined
    };

    createGastoMutation.mutate(payload, {
      onSuccess: () => {
        showSuccess("Gasto registrado.");
        resetGastoForm();
      },
      onError: (error) => {
        const sinConexion = error instanceof ApiError && error.statusCode === undefined;
        if (sinConexion) {
          encolar(payload);
          showSuccess("Sin conexión: el gasto quedó guardado en este dispositivo y se enviará solo cuando vuelva la conexión.");
          resetGastoForm();
          return;
        }
        showError(normalizeError(error, "No se pudo registrar el gasto."));
      }
    });
  }

  function handleAnularGasto(id: string) {
    const motivo = window.prompt("Motivo de la anulación del gasto:");
    if (!motivo || !motivo.trim()) return;

    anularGastoMutation.mutate(
      { id, payload: { motivo: motivo.trim() } },
      {
        onSuccess: () => showSuccess("Gasto anulado."),
        onError: (error) => showError(normalizeError(error, "No se pudo anular el gasto."))
      }
    );
  }

  // --- Editar un gasto ya registrado (para completar clasificación
  // faltante, o corregir cualquier otro dato, mientras siga REGISTRADO) ---
  const [editDraft, setEditDraft] = useState<{
    id: string;
    fecha: string;
    tipoDocumento: TipoDocumentoGasto;
    categoriaRetencion: CategoriaRetencionGasto;
    categoriaRendicion: CategoriaRendicionGasto;
    proveedorNombre: string;
    proveedorNitCi: string;
    glosa: string;
    numeroRespaldo: string;
    montoTotal: string;
    moneda: MonedaCaja;
    centroCostoCajaId: string;
    funcionGastoCajaId: string;
    cuentaContableCajaId: string;
    partidaPresupuestoId: string;
  } | null>(null);

  function handleStartEdit(item: GastoCaja) {
    setEditDraft({
      id: item.id,
      fecha: item.fecha.slice(0, 10),
      tipoDocumento: item.tipoDocumento,
      categoriaRetencion: item.categoriaRetencion ?? "SERVICIO",
      categoriaRendicion: item.categoriaRendicion,
      proveedorNombre: item.proveedorNombre,
      proveedorNitCi: item.proveedorNitCi ?? "",
      glosa: item.glosa,
      numeroRespaldo: item.numeroRespaldo ?? "",
      montoTotal: String(item.montoTotal),
      moneda: item.moneda,
      centroCostoCajaId: item.centroCostoCajaId ? String(item.centroCostoCajaId) : "",
      funcionGastoCajaId: item.funcionGastoCajaId ? String(item.funcionGastoCajaId) : "",
      cuentaContableCajaId: item.cuentaContableCajaId ? String(item.cuentaContableCajaId) : "",
      partidaPresupuestoId: item.partidaPresupuestoId ? String(item.partidaPresupuestoId) : ""
    });
  }

  function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editDraft) return;
    const esReciboDirectoEdit = editDraft.tipoDocumento === "RECIBO_DIRECTO";

    updateGastoMutation.mutate(
      {
        id: editDraft.id,
        payload: {
          fecha: editDraft.fecha,
          tipoDocumento: editDraft.tipoDocumento,
          categoriaRetencion: editDraft.tipoDocumento === "CONTRATO_RETENCION" ? editDraft.categoriaRetencion : null,
          categoriaRendicion: editDraft.categoriaRendicion,
          proveedorNombre: editDraft.proveedorNombre,
          proveedorNitCi: esReciboDirectoEdit ? null : editDraft.proveedorNitCi.trim() || null,
          glosa: editDraft.glosa,
          numeroRespaldo: esReciboDirectoEdit ? null : editDraft.numeroRespaldo.trim() || null,
          montoTotal: Number(editDraft.montoTotal),
          moneda: editDraft.moneda,
          centroCostoCajaId: editDraft.centroCostoCajaId ? Number(editDraft.centroCostoCajaId) : null,
          funcionGastoCajaId: editDraft.funcionGastoCajaId ? Number(editDraft.funcionGastoCajaId) : null,
          cuentaContableCajaId: editDraft.cuentaContableCajaId ? Number(editDraft.cuentaContableCajaId) : null,
          partidaPresupuestoId: editDraft.partidaPresupuestoId ? Number(editDraft.partidaPresupuestoId) : null
        }
      },
      {
        onSuccess: () => {
          showSuccess("Gasto actualizado.");
          setEditDraft(null);
        },
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar el gasto."))
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
            <Wallet size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Registro de Gastos</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Carga cada gasto con su respaldo. El motor tributario calcula el crédito fiscal o las
              retenciones automáticamente, según las tasas configuradas en Parámetros. Elige si el gasto
              sale de una caja o directo del banco (ej. una transferencia sin pasar por caja chica); en
              ambos casos no se deja registrar un gasto por más de lo que hay disponible. ¿Buscas registrar
              un fondo recibido o una salida de banco hacia la caja? Eso está en "Saldos y Movimientos".
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border-2 border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/[0.06] p-4">
        <button
          type="button"
          onClick={() => setMostrarPendientes((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-tertiary)]/20 text-[var(--color-tertiary)]">
              <ClipboardList size={14} />
            </span>
            <span className="text-sm font-bold uppercase tracking-wide text-[var(--color-tertiary)]">
              Completar un gasto desde una partida pendiente
            </span>
            <span className="rounded-full bg-[var(--color-tertiary)]/20 px-2 py-0.5 text-[11px] font-bold text-[var(--color-tertiary)]">
              {partidasPendientes.length}
            </span>
          </span>
          {mostrarPendientes ? <ChevronUp size={16} className="text-[var(--color-tertiary)]" /> : <ChevronDown size={16} className="text-[var(--color-tertiary)]" />}
        </button>

        {mostrarPendientes ? (
          <div className="mt-3">
            <p className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
              Elige un pendiente y el formulario de abajo se completa solo — solo faltará poner el origen
              (caja o banco) y el proveedor o beneficiario real de este gasto.
            </p>
            {partidasPendientes.length === 0 ? (
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                No hay partidas con saldo disponible todavía. Créalas en "Presupuesto".
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  {partidasPendientesPagina.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleUsarPartida(p)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--color-tertiary)]/35 bg-[var(--color-surface-container-low)] px-3 py-2 text-left text-xs transition hover:border-[var(--color-tertiary)] hover:bg-[var(--color-tertiary)]/10"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-semibold">{p.descripcion}</span>
                        <span className="ml-1.5 text-[var(--color-on-surface-variant)]">
                          {p.presupuesto?.nombre ?? "Remesa"}
                          {p.presupuesto ? ` · ${MESES_CORTO[p.presupuesto.mes - 1]} ${p.presupuesto.anio}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono font-bold text-[var(--color-tertiary)]">
                        {formatMoneda(p.saldoAFavor ?? Number(p.montoPresupuestado))}
                      </span>
                    </button>
                  ))}
                </div>
                {totalPaginasPendientes > 1 ? (
                  <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
                    <button
                      type="button"
                      onClick={() => setPaginaPendientes((p) => Math.max(0, p - 1))}
                      disabled={paginaPendientesActual === 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-outline-variant)] px-2.5 py-1.5 font-semibold disabled:opacity-40"
                    >
                      <ChevronLeft size={13} /> Anterior
                    </button>
                    <span>Página {paginaPendientesActual + 1} de {totalPaginasPendientes}</span>
                    <button
                      type="button"
                      onClick={() => setPaginaPendientes((p) => Math.min(totalPaginasPendientes - 1, p + 1))}
                      disabled={paginaPendientesActual >= totalPaginasPendientes - 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-outline-variant)] px-2.5 py-1.5 font-semibold disabled:opacity-40"
                    >
                      Siguiente <ChevronRight size={13} />
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Plus size={16} className="text-[var(--color-primary)]" />
          Nuevo gasto
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleCreateGasto}>
            <select value={origen} onChange={(e) => setOrigen(e.target.value as OrigenGastoCaja)} className={inputClassName}>
              <option value="CAJA">Sale de una caja</option>
              <option value="BANCO">Sale directo del banco (sin pasar por caja)</option>
            </select>
            {origen === "CAJA" ? (
              <select required value={cajaId} onChange={(e) => setCajaId(e.target.value)} className={inputClassName}>
                <option value="">Caja...</option>
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            ) : (
              <select required value={cuentaBancariaCajaId} onChange={(e) => setCuentaBancariaCajaId(e.target.value)} className={inputClassName}>
                <option value="">Cuenta bancaria...</option>
                {cuentasBancarias.map((c) => (
                  <option key={c.id} value={c.id}>{c.banco} · {c.nombreCuenta} ({c.monedaBase} {formatMoneda(c.saldoActual ?? 0)} disponible)</option>
                ))}
              </select>
            )}
            <input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClassName} title="Fecha del gasto (hoy por defecto, editable)" />

            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value as TipoDocumentoGasto)}
              className={`${inputClassName} ${tipoDocumento === "CONTRATO_RETENCION" ? "" : "sm:col-span-2"}`}
            >
              <option value="FACTURA">Factura</option>
              <option value="CONTRATO_RETENCION">Contrato con retención</option>
              <option value="RECIBO_DIRECTO">Recibo directo (sin respaldo)</option>
            </select>
            {tipoDocumento === "CONTRATO_RETENCION" ? (
              <select value={categoriaRetencion} onChange={(e) => setCategoriaRetencion(e.target.value as CategoriaRetencionGasto)} className={inputClassName}>
                <option value="SERVICIO">Servicio (RC-IVA + IT)</option>
                <option value="COMPRA">Compra / alimentación (IUE + IT)</option>
              </select>
            ) : null}

            <input
              required
              value={proveedorNombre}
              onChange={(e) => setProveedorNombre(e.target.value)}
              className={`${inputClassName} ${esReciboDirecto ? "sm:col-span-2" : ""}`}
              placeholder="Proveedor / beneficiario"
            />
            {esReciboDirecto ? null : (
              <input value={proveedorNitCi} onChange={(e) => setProveedorNitCi(e.target.value)} className={inputClassName} placeholder="NIT / CI (opcional)" />
            )}

            <input required value={glosa} onChange={(e) => setGlosa(e.target.value)} className={`${inputClassName} sm:col-span-2`} placeholder="Glosa (ej. 500 Lts Gasolina)" />
            {/* Un recibo directo no tiene número de factura/recibo formal — no tiene sentido pedirlo. */}
            {esReciboDirecto ? null : (
              <input value={numeroRespaldo} onChange={(e) => setNumeroRespaldo(e.target.value)} className={inputClassName} placeholder="N° factura / recibo (opcional)" />
            )}

            <div className={`flex gap-2 ${esReciboDirecto ? "sm:col-span-2" : ""}`}>
              <input required type="number" min="0.01" step="0.01" value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)} className={inputClassName} placeholder="Monto" />
              {origen === "BANCO" && cuentaBancariaSeleccionada ? (
                <span className={`${inputClassName} flex w-24 items-center justify-center font-semibold text-[var(--color-on-surface-variant)]`}>
                  {cuentaBancariaSeleccionada.monedaBase}
                </span>
              ) : (
                <select value={moneda} onChange={(e) => setMoneda(e.target.value as MonedaCaja)} className={`${inputClassName} w-24`}>
                  <option value="BOB">BOB</option>
                  <option value="USD">USD</option>
                </select>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
                Centro de costo (opcional; se puede completar después)
              </label>
              <AutocompleteSelect
                value={centroCostoCajaId}
                onChange={setCentroCostoCajaId}
                options={centroOptions}
                placeholder="Buscar centro de costo..."
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
                Función de gasto (opcional; se puede completar después)
              </label>
              <AutocompleteSelect
                value={funcionGastoCajaId}
                onChange={setFuncionGastoCajaId}
                options={funcionOptions}
                placeholder="Buscar función de gasto..."
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
                Cuenta contable (opcional; se puede completar después)
              </label>
              <AutocompleteSelect
                value={cuentaContableCajaId}
                onChange={setCuentaContableCajaId}
                options={cuentaOptions}
                placeholder="Buscar cuenta contable..."
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
                Partida de presupuesto (opcional; se puede completar después)
              </label>
              <AutocompleteSelect
                value={partidaPresupuestoId}
                onChange={setPartidaPresupuestoId}
                options={partidaOptions}
                placeholder="Buscar partida de presupuesto..."
                className={inputClassName}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
                Categoría del reporte mensual (agrupa este gasto en el reporte de rendición; la cuenta contable
                se resuelve sola a partir de esta categoría)
              </label>
              <select
                required
                value={categoriaRendicion}
                onChange={(e) => setCategoriaRendicion(e.target.value as CategoriaRendicionGasto)}
                className={inputClassName}
              >
                {Object.entries(CATEGORIA_RENDICION_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={createGastoMutation.isPending}
              className="sm:col-span-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createGastoMutation.isPending ? "Registrando..." : "Registrar gasto"}
            </button>
          </form>

          <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
              <Calculator size={14} /> Desglose tributario (vista previa)
            </h3>
            {preview ? (
              <div className="space-y-2 text-sm">
                {preview.creditoFiscal > 0 ? <p>Crédito fiscal IVA: <span className="font-bold">{formatMoneda(preview.creditoFiscal)}</span></p> : null}
                {preview.retencionRcIva > 0 ? <p>Retención RC-IVA: <span className="font-bold">{formatMoneda(preview.retencionRcIva)}</span></p> : null}
                {preview.retencionIueCompras > 0 ? <p>Retención IUE Compras: <span className="font-bold">{formatMoneda(preview.retencionIueCompras)}</span></p> : null}
                {preview.retencionIt > 0 ? <p>Retención IT: <span className="font-bold">{formatMoneda(preview.retencionIt)}</span></p> : null}
                {preview.noDeducible ? <p className="text-[var(--color-warning)]">100% a Gastos No Deducibles</p> : null}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-on-surface-variant)]">Ingresa un monto para ver el cálculo.</p>
            )}
          </div>
        </div>
      </article>

      {editDraft ? (
        <article className="rounded-xl border-2 border-[var(--color-primary)]/45 bg-[var(--color-primary)]/[0.06] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-primary)]">
              <Pencil size={16} /> Editando gasto
            </h2>
            <button
              type="button"
              onClick={() => setEditDraft(null)}
              className="rounded-lg p-1.5 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]"
              title="Cancelar edición"
            >
              <X size={16} />
            </button>
          </div>
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleSaveEdit}>
            <input required type="date" value={editDraft.fecha} onChange={(e) => setEditDraft({ ...editDraft, fecha: e.target.value })} className={inputClassName} />

            <select
              value={editDraft.tipoDocumento}
              onChange={(e) => setEditDraft({ ...editDraft, tipoDocumento: e.target.value as TipoDocumentoGasto })}
              className={`${inputClassName} ${editDraft.tipoDocumento === "CONTRATO_RETENCION" ? "" : "sm:col-span-2"}`}
            >
              <option value="FACTURA">Factura</option>
              <option value="CONTRATO_RETENCION">Contrato con retención</option>
              <option value="RECIBO_DIRECTO">Recibo directo (sin respaldo)</option>
            </select>
            {editDraft.tipoDocumento === "CONTRATO_RETENCION" ? (
              <select
                value={editDraft.categoriaRetencion}
                onChange={(e) => setEditDraft({ ...editDraft, categoriaRetencion: e.target.value as CategoriaRetencionGasto })}
                className={inputClassName}
              >
                <option value="SERVICIO">Servicio (RC-IVA + IT)</option>
                <option value="COMPRA">Compra / alimentación (IUE + IT)</option>
              </select>
            ) : null}

            <input
              required
              value={editDraft.proveedorNombre}
              onChange={(e) => setEditDraft({ ...editDraft, proveedorNombre: e.target.value })}
              className={`${inputClassName} ${editDraft.tipoDocumento === "RECIBO_DIRECTO" ? "sm:col-span-2" : ""}`}
              placeholder="Proveedor / beneficiario"
            />
            {editDraft.tipoDocumento === "RECIBO_DIRECTO" ? null : (
              <input
                value={editDraft.proveedorNitCi}
                onChange={(e) => setEditDraft({ ...editDraft, proveedorNitCi: e.target.value })}
                className={inputClassName}
                placeholder="NIT / CI (opcional)"
              />
            )}

            <input
              required
              value={editDraft.glosa}
              onChange={(e) => setEditDraft({ ...editDraft, glosa: e.target.value })}
              className={`${inputClassName} sm:col-span-2`}
              placeholder="Glosa"
            />
            {editDraft.tipoDocumento === "RECIBO_DIRECTO" ? null : (
              <input
                value={editDraft.numeroRespaldo}
                onChange={(e) => setEditDraft({ ...editDraft, numeroRespaldo: e.target.value })}
                className={inputClassName}
                placeholder="N° factura / recibo (opcional)"
              />
            )}

            <div className="flex gap-2">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={editDraft.montoTotal}
                onChange={(e) => setEditDraft({ ...editDraft, montoTotal: e.target.value })}
                className={inputClassName}
                placeholder="Monto"
              />
              <select
                value={editDraft.moneda}
                onChange={(e) => setEditDraft({ ...editDraft, moneda: e.target.value as MonedaCaja })}
                className={`${inputClassName} w-24`}
              >
                <option value="BOB">BOB</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Centro de costo (opcional)</label>
              <AutocompleteSelect
                value={editDraft.centroCostoCajaId}
                onChange={(v) => setEditDraft({ ...editDraft, centroCostoCajaId: v })}
                options={centroOptions}
                placeholder="Buscar centro de costo..."
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Función de gasto (opcional)</label>
              <AutocompleteSelect
                value={editDraft.funcionGastoCajaId}
                onChange={(v) => setEditDraft({ ...editDraft, funcionGastoCajaId: v })}
                options={funcionOptions}
                placeholder="Buscar función de gasto..."
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Cuenta contable (opcional)</label>
              <AutocompleteSelect
                value={editDraft.cuentaContableCajaId}
                onChange={(v) => setEditDraft({ ...editDraft, cuentaContableCajaId: v })}
                options={cuentaOptions}
                placeholder="Buscar cuenta contable..."
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Partida de presupuesto (opcional)</label>
              <AutocompleteSelect
                value={editDraft.partidaPresupuestoId}
                onChange={(v) => setEditDraft({ ...editDraft, partidaPresupuestoId: v })}
                options={partidaOptions}
                placeholder="Buscar partida de presupuesto..."
                className={inputClassName}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Categoría del reporte mensual</label>
              <select
                required
                value={editDraft.categoriaRendicion}
                onChange={(e) => setEditDraft({ ...editDraft, categoriaRendicion: e.target.value as CategoriaRendicionGasto })}
                className={inputClassName}
              >
                {Object.entries(CATEGORIA_RENDICION_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={updateGastoMutation.isPending}
                className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
              >
                {updateGastoMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => setEditDraft(null)}
                className={buttonSecondaryClassName}
              >
                Cancelar
              </button>
            </div>
          </form>
        </article>
      ) : null}

      {pendientes.length > 0 ? (
        <article className="rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/8 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-warning)]">
              <AlertTriangle size={15} /> {pendientes.length} gasto(s) pendiente(s) de sincronizar
            </h2>
            <button
              type="button"
              onClick={() => sincronizar()}
              disabled={sincronizando}
              className={buttonSecondaryClassName}
            >
              <RefreshCw size={13} className={sincronizando ? "animate-spin" : ""} />
              {sincronizando ? "Sincronizando..." : "Sincronizar ahora"}
            </button>
          </div>
          <div className="space-y-2 text-xs">
            {pendientes.map((item) => (
              <div key={item.localId} className="flex flex-col gap-1 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div>
                  <p className="font-semibold">{item.payload.proveedorNombre} · {item.payload.glosa}</p>
                  <p className="text-[var(--color-on-surface-variant)]">
                    Guardado en este dispositivo el {formatFecha(item.createdAt)}
                    {item.ultimoError ? ` · último intento falló: ${item.ultimoError}` : ""}
                  </p>
                </div>
                <span className="font-mono font-bold">{item.payload.moneda} {formatMoneda(item.payload.montoTotal)}</span>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Gastos registrados</h2>
          <select value={filtroCaja} onChange={(e) => setFiltroCaja(e.target.value)} className={`${inputClassName} w-full sm:w-56`}>
            <option value="">Todas las cajas</option>
            {cajas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        {gastosQuery.isLoading ? (
          <p className="px-1 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">Cargando gastos...</p>
        ) : null}
        {!gastosQuery.isLoading && gastos.length === 0 ? (
          <p className="px-1 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">No se encontraron gastos.</p>
        ) : null}

        {/* Lista en tarjetas: mucho más legible en teléfono que una tabla ancha con scroll horizontal. */}
        <div className="space-y-2 sm:hidden">
          {gastos.map((item) => (
            <div key={item.id} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{item.proveedorNombre}</p>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ESTADO_CLASS[item.estado]}`}>{ESTADO_LABEL[item.estado]}</span>
                  {item.informacionIncompleta ? (
                    <span className="flex items-center gap-1 rounded-full bg-[var(--color-warning)]/18 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-warning)]">
                      <AlertTriangle size={10} /> Info incompleta
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)]">{item.glosa}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
                <span>{formatFecha(item.fecha)} · {item.origen === "BANCO" ? `Banco: ${item.cuentaBancariaCaja?.banco ?? "-"}` : (item.caja?.nombre ?? "-")}</span>
                <span className="font-mono font-bold text-[var(--color-on-surface)]">{item.moneda} {formatMoneda(item.montoTotal)}</span>
              </div>
              {item.estado === "REGISTRADO" ? (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-primary)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)]"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnularGasto(item.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-error)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-error)]"
                  >
                    <Ban size={12} /> Anular
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {["Fecha", "Origen", "Proveedor", "Glosa", "Monto", "Estado", "Acciones"].map((title) => (
                  <th key={title} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{title}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {gastos.map((item) => (
                <tr key={item.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-3 py-2 text-xs">{formatFecha(item.fecha)}</td>
                  <td className="px-3 py-2 text-xs">
                    {item.origen === "BANCO"
                      ? `Banco: ${item.cuentaBancariaCaja?.banco ?? "-"}`
                      : (item.caja?.nombre ?? "-")}
                  </td>
                  <td className="px-3 py-2 text-xs font-semibold">{item.proveedorNombre}</td>
                  <td className="px-3 py-2 text-xs">{item.glosa}</td>
                  <td className="px-3 py-2 text-xs">{item.moneda} {formatMoneda(item.montoTotal)}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ESTADO_CLASS[item.estado]}`}>{ESTADO_LABEL[item.estado]}</span>
                      {item.informacionIncompleta ? (
                        <span className="flex items-center gap-1 rounded-full bg-[var(--color-warning)]/18 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-warning)]">
                          <AlertTriangle size={10} /> Info incompleta
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {item.estado === "REGISTRADO" ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleStartEdit(item)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-primary)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)]">
                          <Pencil size={12} /> Editar
                        </button>
                        <button type="button" onClick={() => handleAnularGasto(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-error)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-error)]">
                          <Ban size={12} /> Anular
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
