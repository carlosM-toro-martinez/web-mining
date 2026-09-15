import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, Calculator, Plus, RefreshCw, Wallet } from "lucide-react";
import {
  useAnularGastoCajaMutation,
  useCreateGastoCajaMutation,
  useGastosCajaQuery
} from "@/features/gastoCaja/hooks/useGastoCaja";
import { useGastoCajaOfflineQueue } from "@/features/gastoCaja/hooks/useGastoCajaOfflineQueue";
import {
  CATEGORIA_RENDICION_LABEL,
  type CategoriaRendicionGasto,
  type CategoriaRetencionGasto,
  type EstadoGastoCaja,
  type MonedaCaja,
  type TipoDocumentoGasto
} from "@/features/gastoCaja/model/gastoCaja.schema";
import {
  useCajasChicasQuery,
  useCentrosCostoCajaQuery,
  useConceptosRetencionCajaQuery,
  useCuentasContablesCajaQuery,
  useFuncionesGastoCajaQuery,
  usePartidasPresupuestoCajaQuery
} from "@/features/parametrosCajaChica/hooks/useParametrosCajaChica";
import { encontrarCajaLipena } from "@/features/parametrosCajaChica/lib/defaultCaja";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

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
  const centrosQuery = useCentrosCostoCajaQuery();
  const funcionesQuery = useFuncionesGastoCajaQuery();
  const cuentasQuery = useCuentasContablesCajaQuery();
  const retencionesQuery = useConceptosRetencionCajaQuery();
  const partidasQuery = usePartidasPresupuestoCajaQuery();
  const { pendientes, encolar, sincronizar, sincronizando } = useGastoCajaOfflineQueue();

  const [filtroCaja, setFiltroCaja] = useState("");
  const gastosQuery = useGastosCajaQuery({ cajaId: filtroCaja ? Number(filtroCaja) : undefined, limit: 50 });

  const createGastoMutation = useCreateGastoCajaMutation();
  const anularGastoMutation = useAnularGastoCajaMutation();

  const cajas = cajasQuery.data?.data ?? [];
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
    () => partidas.map((p) => ({ id: String(p.id), label: p.descripcion, searchText: p.descripcion })),
    [partidas]
  );

  const tasaRcIva = useMemo(() => Number(retenciones.find((r) => r.codigo === "RC_IVA")?.porcentaje ?? 0) / 100, [retenciones]);
  const tasaIueCompras = useMemo(() => Number(retenciones.find((r) => r.codigo === "IUE_COMPRAS")?.porcentaje ?? 0) / 100, [retenciones]);
  const tasaIt = useMemo(() => Number(retenciones.find((r) => r.codigo === "IT")?.porcentaje ?? 0) / 100, [retenciones]);

  const [cajaId, setCajaId] = useState("");
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

  function handleCreateGasto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!centroCostoCajaId || !funcionGastoCajaId) {
      showError("Selecciona un centro de costo y una función de gasto de la lista.");
      return;
    }
    const payload = {
      cajaId: Number(cajaId),
      fecha,
      tipoDocumento,
      categoriaRetencion: tipoDocumento === "CONTRATO_RETENCION" ? categoriaRetencion : undefined,
      categoriaRendicion,
      proveedorNombre,
      proveedorNitCi: proveedorNitCi.trim() || undefined,
      glosa,
      numeroRespaldo: numeroRespaldo.trim() || undefined,
      montoTotal: Number(montoTotal),
      moneda,
      centroCostoCajaId: Number(centroCostoCajaId),
      funcionGastoCajaId: Number(funcionGastoCajaId),
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
              retenciones automáticamente, según las tasas configuradas en Parámetros. ¿Buscas registrar
              un fondo recibido o una salida de banco hacia la caja? Eso está en "Saldos y Movimientos".
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Plus size={16} className="text-[var(--color-primary)]" />
          Nuevo gasto
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleCreateGasto}>
            <select required value={cajaId} onChange={(e) => setCajaId(e.target.value)} className={inputClassName}>
              <option value="">Caja...</option>
              {cajas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClassName} title="Fecha del gasto (hoy por defecto, editable)" />

            <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value as TipoDocumentoGasto)} className={inputClassName}>
              <option value="FACTURA">Factura</option>
              <option value="CONTRATO_RETENCION">Contrato con retención</option>
              <option value="RECIBO_DIRECTO">Recibo directo (sin respaldo)</option>
            </select>
            {tipoDocumento === "CONTRATO_RETENCION" ? (
              <select value={categoriaRetencion} onChange={(e) => setCategoriaRetencion(e.target.value as CategoriaRetencionGasto)} className={inputClassName}>
                <option value="SERVICIO">Servicio (RC-IVA + IT)</option>
                <option value="COMPRA">Compra / alimentación (IUE + IT)</option>
              </select>
            ) : <div />}

            <input required value={proveedorNombre} onChange={(e) => setProveedorNombre(e.target.value)} className={inputClassName} placeholder="Proveedor / beneficiario" />
            <input value={proveedorNitCi} onChange={(e) => setProveedorNitCi(e.target.value)} className={inputClassName} placeholder="NIT / CI (opcional)" />

            <input required value={glosa} onChange={(e) => setGlosa(e.target.value)} className={`${inputClassName} sm:col-span-2`} placeholder="Glosa (ej. 500 Lts Gasolina)" />
            <input value={numeroRespaldo} onChange={(e) => setNumeroRespaldo(e.target.value)} className={inputClassName} placeholder="N° factura / recibo (opcional)" />

            <div className="flex gap-2">
              <input required type="number" min="0.01" step="0.01" value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)} className={inputClassName} placeholder="Monto" />
              <select value={moneda} onChange={(e) => setMoneda(e.target.value as MonedaCaja)} className={`${inputClassName} w-24`}>
                <option value="BOB">BOB</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <AutocompleteSelect
              value={centroCostoCajaId}
              onChange={setCentroCostoCajaId}
              options={centroOptions}
              placeholder="Buscar centro de costo..."
              className={inputClassName}
            />
            <AutocompleteSelect
              value={funcionGastoCajaId}
              onChange={setFuncionGastoCajaId}
              options={funcionOptions}
              placeholder="Buscar función de gasto..."
              className={inputClassName}
            />

            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
                Cuenta contable (opcional; si la dejas vacía, se resuelve sola)
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
                Partida de presupuesto (opcional; para saber el saldo a favor)
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
              <div key={item.localId} className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] px-3 py-2">
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
          <select value={filtroCaja} onChange={(e) => setFiltroCaja(e.target.value)} className={`${inputClassName} w-56`}>
            <option value="">Todas las cajas</option>
            {cajas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {["Fecha", "Proveedor", "Glosa", "Monto", "Estado", "Acciones"].map((title) => (
                  <th key={title} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{title}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {gastosQuery.isLoading ? (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">Cargando gastos...</td></tr>
              ) : null}
              {!gastosQuery.isLoading && gastos.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">No se encontraron gastos.</td></tr>
              ) : null}
              {gastos.map((item) => (
                <tr key={item.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-3 py-2 text-xs">{formatFecha(item.fecha)}</td>
                  <td className="px-3 py-2 text-xs font-semibold">{item.proveedorNombre}</td>
                  <td className="px-3 py-2 text-xs">{item.glosa}</td>
                  <td className="px-3 py-2 text-xs">{item.moneda} {formatMoneda(item.montoTotal)}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ESTADO_CLASS[item.estado]}`}>{ESTADO_LABEL[item.estado]}</span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {item.estado === "REGISTRADO" ? (
                      <button type="button" onClick={() => handleAnularGasto(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-error)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-error)]">
                        <Ban size={12} /> Anular
                      </button>
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
