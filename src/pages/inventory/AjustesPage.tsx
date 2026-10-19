import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, Loader2, Play, Search, Settings2, TriangleAlert } from "lucide-react";
import {
  useBackfillCppMutation,
  useSyncStockFromSaldoMensualMutation,
  useDiagnosticoRedondeoQuery,
  useFixRedondeoMutation
} from "@/features/inventario-import/hooks/useInventarioImport";
import { useReconstruirCadenaMutation } from "@/features/movimientos/hooks/useMovimientos";
import { useInventarioAlmacenReportQuery } from "@/features/reportes/hooks/useReportes";
import type {
  BackfillCppResponse,
  SyncStockFromSaldoMensualResponse
} from "@/features/inventario-import/model/inventarioImport.schema";
import type { ReconstruirCadenaResponse } from "@/features/movimientos/model/movimientos.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallbackMessage;
}

function formatNumber(value: number | undefined, decimals = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function AjustesPage() {
  const now = new Date();
  const { showError, showSuccess } = useToast();
  const backfillCppMutation = useBackfillCppMutation();
  const syncStockMutation = useSyncStockFromSaldoMensualMutation();
  const [syncStockResult, setSyncStockResult] = useState<SyncStockFromSaldoMensualResponse | null>(null);
  const reconstruirMutation = useReconstruirCadenaMutation();

  const [cadenaAnio, setCadenaAnio] = useState(String(now.getFullYear()));
  const [cadenaMes, setCadenaMes] = useState(String(now.getMonth() + 1));
  const [cadenaProductoId, setCadenaProductoId] = useState("");
  const [cadenaResponse, setCadenaResponse] = useState<ReconstruirCadenaResponse | null>(null);
  const [cppAnio, setCppAnio] = useState(String(now.getFullYear()));
  const [cppMes, setCppMes] = useState(String(now.getMonth() + 1));
  const [cppResponse, setCppResponse] = useState<BackfillCppResponse | null>(null);
  const [negativosAnio, setNegativosAnio] = useState(String(now.getFullYear()));
  const [negativosMes, setNegativosMes] = useState(String(now.getMonth() + 1));
  const [negativosParams, setNegativosParams] = useState<{ anioInicio: number; mesInicio: number; anioFin: number; mesFin: number } | null>(null);
  const [redondeoAnio, setRedondeoAnio] = useState(String(now.getFullYear()));
  const [redondeoMes, setRedondeoMes] = useState(String(now.getMonth() + 1));
  const [redondeoParams, setRedondeoParams] = useState<{ anio: number; mes: number } | null>(null);
  const fixRedondeoMutation = useFixRedondeoMutation();

  const activeRedondeoParams = redondeoParams ?? { anio: Number(redondeoAnio), mes: Number(redondeoMes) };
  const redondeoQuery = useDiagnosticoRedondeoQuery(activeRedondeoParams, Boolean(redondeoParams));
  const activeNegativosParams = negativosParams ?? {
    anioInicio: Number(negativosAnio), mesInicio: Number(negativosMes),
    anioFin: Number(negativosAnio),   mesFin: Number(negativosMes)
  };
  const negativosQuery = useInventarioAlmacenReportQuery(activeNegativosParams, Boolean(negativosParams));

  const negativosRows = useMemo(() => {
    const meses = negativosQuery.data?.data?.meses ?? [];
    return meses.flatMap(mes =>
      mes.grupos.flatMap(grupo =>
        grupo.subGrupos.flatMap(sg =>
          sg.productos
            .filter(p =>
              p.saldoInicial < 0 || p.ingresoQty < 0 || p.salidaQty < 0 ||
              p.saldoFinal < 0  || p.precioUnit < 0  || p.totalBs < 0
            )
            .map(p => ({
              grupoNombre:    grupo.nombre ?? "-",
              subGrupoNombre: sg.nombre    ?? "-",
              codigo:         p.codigo     ?? "-",
              nombre:         p.nombre     ?? "-",
              unidad:         p.unidad     ?? "-",
              saldoInicial:   p.saldoInicial,
              ingresoQty:     p.ingresoQty,
              salidaQty:      p.salidaQty,
              saldoFinal:     p.saldoFinal,
              precioUnit:     p.precioUnit,
              totalBs:        p.totalBs,
            }))
        )
      )
    );
  }, [negativosQuery.data]);
  function parsePeriodo(anioValue: string, mesValue: string) {
    const anio = Number(anioValue);
    const mes = Number(mesValue);
    if (
      !Number.isInteger(anio) ||
      anio < 2000 ||
      anio > 2100 ||
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12
    ) {
      return null;
    }
    return { anio, mes };
  }

  function handleNegativosSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const periodo = parsePeriodo(negativosAnio, negativosMes);
    if (!periodo) {
      showError("Indica un año y mes válidos.");
      return;
    }
    const params = { anioInicio: periodo.anio, mesInicio: periodo.mes, anioFin: periodo.anio, mesFin: periodo.mes };
    setNegativosParams(params);
    if (
      negativosParams?.anioInicio === params.anioInicio &&
      negativosParams.mesInicio === params.mesInicio
    ) {
      void negativosQuery.refetch();
    }
  }

  function ejecutarReconstruirCadena(aplicar: boolean) {
    const periodo = parsePeriodo(cadenaAnio, cadenaMes);
    if (!periodo) {
      showError("Indica un año y mes válidos.");
      return;
    }
    const payload: { anio: number; mes: number; productoId?: number; aplicar: boolean } = {
      ...periodo,
      aplicar
    };
    const pid = Number(cadenaProductoId);
    if (cadenaProductoId.trim() && Number.isInteger(pid) && pid > 0) payload.productoId = pid;

    if (
      aplicar &&
      !window.confirm(
        `Vas a corregir el bin card de ${String(periodo.mes).padStart(2, "0")}/${periodo.anio}. ` +
          "Solo cambia stock antes/después y saldo Bs de cada fila; no toca precios, CPP ni saldos. ¿Continuar?"
      )
    ) {
      return;
    }

    setCadenaResponse(null);
    reconstruirMutation.mutate(payload, {
      onSuccess: (response) => {
        setCadenaResponse(response);
        const d = response.data;
        showSuccess(
          aplicar
            ? `Bin card corregido · productos: ${d.productosAplicados} · filas: ${d.filasModificadas}`
            : `Simulación · productos con cambios: ${d.productosConCambios} · filas: ${d.filasModificadas}`
        );
      },
      onError: (error) => showError(normalizeError(error, "No se pudo reconstruir la cadena del bin card."))
    });
  }

  function handleBackfillCppSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const periodo = parsePeriodo(cppAnio, cppMes);
    if (!periodo) {
      showError("Indica un año y mes válidos para ejecutar el backfill CPP.");
      return;
    }

    setCppResponse(null);
    backfillCppMutation.mutate(periodo, {
      onSuccess: (response) => {
        setCppResponse(response);
        const data = response.data;
        if (data?.advertencia) {
          showError(data.advertencia);
          return;
        }
        const productos = data?.productosProcessados ?? data?.productosProcesados;
        const resumen = [
          productos !== undefined ? `productos: ${productos}` : null,
          data?.movimientosActualizados !== undefined
            ? `movimientos: ${data.movimientosActualizados}`
            : null,
          data?.saldosActualizados !== undefined ? `saldos: ${data.saldosActualizados}` : null,
          data?.errores?.length ? `errores: ${data.errores.length}` : null
        ].filter(Boolean);
        showSuccess(
          resumen.length
            ? `Backfill CPP ejecutado · ${resumen.join(" · ")}`
            : "Backfill CPP ejecutado."
        );
      },
      onError: (error) => showError(normalizeError(error, "No se pudo ejecutar el backfill CPP."))
    });
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/15 p-2.5 text-[var(--color-primary)]">
            <Settings2 size={18} />
          </div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">
              Ajustes de inventario
            </h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Herramientas de mantenimiento: sincronizar stock, ordenar el bin card, backfill de CPP y
              controles de negativos y redondeo.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-[var(--color-warning)]/14 p-2 text-[var(--color-warning)]">
            <ArrowUpDown size={16} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Sincronizar Stock desde SaldoMensual</h2>
            <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
              Actualiza <code>Stock.cantidad</code>, <code>precioUnit</code> y <code>precioProm</code> de cada producto
              usando el <strong>SaldoMensual más reciente</strong> como fuente de verdad.
              Ejecutar antes de registrar compras/vales del mes actual para asegurar que el stock de partida sea correcto.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={syncStockMutation.isPending}
            onClick={() => {
              if (!window.confirm(
                "Esta acción sobreescribirá Stock.cantidad, precioUnit y precioProm de TODOS los productos con el SaldoMensual más reciente. ¿Confirmar?"
              )) return;
              setSyncStockResult(null);
              syncStockMutation.mutate(undefined, {
                onSuccess: (response) => {
                  setSyncStockResult(response);
                  showSuccess(
                    `Stock sincronizado: ${response.data.actualizados} de ${response.data.total} productos actualizados.`
                  );
                },
                onError: (error) => showError(normalizeError(error, "No se pudo sincronizar el stock."))
              });
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-warning)] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncStockMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowUpDown size={16} />
            )}
            {syncStockMutation.isPending ? "Sincronizando..." : "Sincronizar Stock → SaldoMensual"}
          </button>
          {syncStockResult ? (
            <button
              type="button"
              onClick={() => setSyncStockResult(null)}
              className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)]"
            >
              Limpiar resultado
            </button>
          ) : null}
        </div>

        {syncStockResult ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-4 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3 text-xs">
              <span>Total productos en SaldoMensual: <strong>{syncStockResult.data.total}</strong></span>
              <span className="text-[var(--color-success)]">Actualizados: <strong>{syncStockResult.data.actualizados}</strong></span>
              <span className="text-[var(--color-on-surface-variant)]">Sin Stock (omitidos): <strong>{syncStockResult.data.omitidos}</strong></span>
              {syncStockResult.data.errores.length > 0 ? (
                <span className="text-[var(--color-error)]">Errores: <strong>{syncStockResult.data.errores.length}</strong></span>
              ) : null}
            </div>
            {syncStockResult.data.errores.length > 0 ? (
              <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/8 p-3 text-xs text-[var(--color-error)]">
                {syncStockResult.data.errores.map((e) => (
                  <div key={e.productoId}>productoId {e.productoId}: {e.error}</div>
                ))}
              </div>
            ) : null}
            {syncStockResult.data.detalle.length > 0 ? (
              <div className="table-scroll overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Código</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Cantidad</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">P. Unit</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">P. Prom</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-soft)]">
                    {syncStockResult.data.detalle.map((item) => (
                      <tr key={item.productoId}>
                        <td className="px-3 py-1.5 font-mono">{item.codigo}</td>
                        <td className="px-3 py-1.5 text-right">{item.cantidad}</td>
                        <td className="px-3 py-1.5 text-right">{item.precioUnit}</td>
                        <td className="px-3 py-1.5 text-right">{item.precioProm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </article>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/12 p-2 text-[var(--color-primary)]">
              <ArrowUpDown size={16} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Ordenar bin card del mes</h2>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                Deja la cadena de stock de cada producto en orden cronológico: empieza en el saldo
                inicial del mes, cada fila continúa en la anterior y termina en el saldo final.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Año
              </label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={cadenaAnio}
                onChange={(event) => setCadenaAnio(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Mes
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={cadenaMes}
                onChange={(event) => setCadenaMes(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                ID Producto{" "}
                <span className="font-normal normal-case">(opcional — vacío = todos)</span>
              </label>
              <input
                type="number"
                min={1}
                placeholder="Todos los productos del período"
                value={cadenaProductoId}
                onChange={(event) => setCadenaProductoId(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={reconstruirMutation.isPending}
                onClick={() => ejecutarReconstruirCadena(false)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-4 py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reconstruirMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Simular (no cambia nada)
              </button>
              <button
                type="button"
                disabled={reconstruirMutation.isPending}
                onClick={() => ejecutarReconstruirCadena(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reconstruirMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpDown size={16} />}
                Aplicar
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[var(--color-warning)]/35 bg-[var(--color-warning)]/10 p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
              <p className="text-[var(--color-on-surface-variant)]">
                Solo reescribe stock antes, stock después y saldo Bs de cada fila. No cambia fechas,
                precios, importes, CPP, saldos mensuales ni stock. No funciona en meses cerrados ni
                con CPP móvil. Los productos cuyos movimientos no suman el saldo del mes se omiten.
              </p>
            </div>
          </div>

          {reconstruirMutation.isError ? (
            <div className="mt-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
              {normalizeError(reconstruirMutation.error, "No se pudo reconstruir la cadena del bin card.")}
            </div>
          ) : null}

          {cadenaResponse ? (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                {cadenaResponse.data.aplicar ? "Resultado aplicado" : "Simulación (no se guardó nada)"} ·{" "}
                {String(cadenaResponse.data.mes).padStart(2, "0")}/{cadenaResponse.data.anio}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Analizados", cadenaResponse.data.productosAnalizados],
                  ["Con cambios", cadenaResponse.data.productosConCambios],
                  ["Filas", cadenaResponse.data.filasModificadas]
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{label}</p>
                    <p className="mt-1 text-2xl font-extrabold">{value}</p>
                  </div>
                ))}
              </div>
              {cadenaResponse.data.productosOmitidos.length > 0 ? (
                <div className="rounded-lg border border-[var(--color-warning)]/35 bg-[var(--color-warning)]/10 p-3 text-xs">
                  <p className="mb-1 font-bold">
                    Omitidos ({cadenaResponse.data.productosOmitidos.length}): sus movimientos no suman el saldo del mes
                  </p>
                  {cadenaResponse.data.productosOmitidos.slice(0, 15).map((o) => (
                    <div key={o.codigo}>
                      {o.codigo}: movimientos terminan en {o.saldoFinalCadena}, saldo del mes {o.saldoFinalMes}
                    </div>
                  ))}
                </div>
              ) : null}
              {cadenaResponse.data.errores.length > 0 ? (
                <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-xs text-[var(--color-error)]">
                  {cadenaResponse.data.errores.map((e) => (
                    <div key={e.productoId}>
                      Producto {e.productoId}: {e.error}
                    </div>
                  ))}
                </div>
              ) : null}
              {cadenaResponse.data.muestra.length > 0 ? (
                <details className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3 text-xs">
                  <summary className="cursor-pointer font-bold">Ejemplos de filas corregidas</summary>
                  <div className="mt-2 space-y-2">
                    {cadenaResponse.data.muestra.map((m) => (
                      <div key={m.codigo}>
                        <p className="font-semibold">{m.codigo} · {m.filasModificadas} filas</p>
                        {m.cambios.slice(0, 4).map((c, index) => (
                          <p key={`${m.codigo}-${index}`} className="text-[var(--color-on-surface-variant)]">
                            {c.tipo} {c.cantidad}: antes {c.stockAntes.antes}→{c.stockDespues.antes}, ahora{" "}
                            {c.stockAntes.despues}→{c.stockDespues.despues}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 text-sm text-[var(--color-on-surface-variant)]">Sin ejecución todavía.</p>
          )}
        </article>

        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-5">
          <div className="mb-4">
            <h2 className="text-lg font-bold">Backfill CPP</h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Recalcula el CPP del mes, actualiza movimientos y deja el saldo mensual consistente
              con compras sin IVA.
            </p>
          </div>

          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            onSubmit={handleBackfillCppSubmit}
          >
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Año
              </label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={cppAnio}
                onChange={(event) => setCppAnio(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Mes
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={cppMes}
                onChange={(event) => setCppMes(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={backfillCppMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-[var(--color-on-primary)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {backfillCppMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                Ejecutar backfill CPP
              </button>
            </div>
          </form>

          <div className="mt-4 rounded-lg border border-[var(--color-warning)]/35 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-on-surface)]">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 text-[var(--color-warning)]" />
              <p className="text-[var(--color-on-surface-variant)]">
                Ejecuta los meses en orden cronológico. El CPP de un mes depende del precio promedio
                del mes anterior.
              </p>
            </div>
          </div>

          {backfillCppMutation.isError ? (
            <div className="mt-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
              {normalizeError(backfillCppMutation.error, "No se pudo ejecutar el backfill CPP.")}
            </div>
          ) : null}

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Respuesta
            </h3>
            <pre className="max-h-[420px] overflow-auto rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] p-3 text-xs leading-relaxed text-[var(--color-on-surface)]">
              {cppResponse ? JSON.stringify(cppResponse, null, 2) : "Sin ejecución todavía."}
            </pre>
          </div>
        </article>
      </div>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-error)]/12 p-2 text-[var(--color-error)]">
              <TriangleAlert size={16} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Negativos en inventario</h2>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                Detecta productos con valores negativos según inventario-almacen: saldo inicial, ingreso, salida, saldo final, precio unitario o total Bs.
              </p>
            </div>
          </div>
          {negativosParams ? (
            <span className="rounded-full bg-[var(--color-error)]/12 px-3 py-1 text-xs font-bold text-[var(--color-error)]">
              {String(negativosParams.mesInicio).padStart(2, "0")}/{negativosParams.anioInicio}
            </span>
          ) : null}
        </div>

        <form className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleNegativosSubmit}>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Año
            </label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={negativosAnio}
              onChange={(e) => setNegativosAnio(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Mes
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={negativosMes}
              onChange={(e) => setNegativosMes(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={negativosQuery.isFetching}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-error)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {negativosQuery.isFetching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Consultar
            </button>
          </div>
        </form>

        {negativosQuery.isError ? (
          <div className="mb-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            {normalizeError(negativosQuery.error, "No se pudo consultar el inventario.")}
          </div>
        ) : null}

        {negativosParams && !negativosQuery.isFetching && negativosRows.length === 0 ? (
          <div className="rounded-lg border border-[var(--color-success)]/25 bg-[var(--color-success)]/8 p-4 text-sm text-[var(--color-success)]">
            Sin valores negativos para el período consultado.
          </div>
        ) : null}

        {negativosRows.length > 0 ? (
          <>
            <div className="mb-3 rounded-lg border border-[var(--color-error)]/25 bg-[var(--color-error)]/8 p-3 text-sm">
              <span className="font-bold text-[var(--color-error)]">{negativosRows.length}</span>
              <span className="ml-1 text-[var(--color-on-surface-variant)]">
                {negativosRows.length === 1 ? "producto con valor negativo" : "productos con valores negativos"}
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-[var(--color-surface-container-highest)] text-left text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    <tr>
                      <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Grupo</th>
                      <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Código</th>
                      <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Producto</th>
                      <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Unidad</th>
                      <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Saldo inicial</th>
                      <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Ingreso</th>
                      <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Salida</th>
                      <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Saldo final</th>
                      <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">P. Unit.</th>
                      <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Total Bs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {negativosRows.map((row, index) => (
                      <tr
                        key={`${row.codigo}-${index}`}
                        className="border-b border-[var(--color-border-soft)] last:border-0"
                      >
                        <td className="px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">{row.grupoNombre}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.codigo}</td>
                        <td className="min-w-[200px] px-3 py-2 font-medium">{row.nombre}</td>
                        <td className="px-3 py-2 text-xs">{row.unidad}</td>
                        {[
                          { val: row.saldoInicial, dec: 2 },
                          { val: row.ingresoQty,   dec: 2 },
                          { val: row.salidaQty,    dec: 2 },
                          { val: row.saldoFinal,   dec: 2 },
                          { val: row.precioUnit,   dec: 4 },
                          { val: row.totalBs,      dec: 2 },
                        ].map(({ val, dec }, ci) => (
                          <td
                            key={ci}
                            className={`px-3 py-2 text-right font-mono text-xs tabular-nums ${
                              val < 0
                                ? "bg-[var(--color-error)]/12 font-bold text-[var(--color-error)]"
                                : ""
                            }`}
                          >
                            {formatNumber(val, dec)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </article>

      {/* ── Diagnóstico de redondeo ingresosBs ─────────────────────────────── */}
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container)] p-5">
        <h2 className="mb-1 text-base font-semibold text-[var(--color-on-surface)]">
          Diagnóstico de redondeo — Ingreso Materiales
        </h2>
        <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
          Verifica si la suma per-grupo de <code>ingresosBs</code> difiere de la suma flat en el mes.
          Si hay discrepancia, muestra el grupo y producto exacto a ajustar y permite aplicar el fix mínimo (&lt;&nbsp;0.01&nbsp;Bs).
        </p>
        <form
          className="mb-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setRedondeoParams({ anio: Number(redondeoAnio), mes: Number(redondeoMes) });
          }}
        >
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Año</label>
            <input type="number" min="2000" max="2100" value={redondeoAnio}
              onChange={(e) => setRedondeoAnio(e.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Mes</label>
            <input type="number" min="1" max="12" value={redondeoMes}
              onChange={(e) => setRedondeoMes(e.target.value)} className={inputClassName} />
          </div>
          <button type="submit" className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">
            <Search className="h-4 w-4" /> Verificar
          </button>
        </form>

        {redondeoQuery.isLoading && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Analizando…
          </div>
        )}

        {redondeoQuery.data && (() => {
          const d = redondeoQuery.data.data;
          return (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-4 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] p-4">
                <div>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">Suma flat (inventarios-suministros)</p>
                  <p className="font-mono text-sm font-semibold">{formatNumber(d.flatRnd)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">Suma per-grupo (balance-mensual)</p>
                  <p className="font-mono text-sm font-semibold">{formatNumber(d.perGrupoRnd)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">Discrepancia</p>
                  <p className={`font-mono text-sm font-bold ${d.ok ? "text-[var(--color-success)]" : "text-[var(--color-error)]"}`}>
                    {d.ok ? "✓ Sin discrepancia" : `${formatNumber(d.discrepancia)} Bs`}
                  </p>
                </div>
              </div>

              {d.ok && (
                <p className="text-sm text-[var(--color-success)]">
                  Los totales coinciden para {String(d.mes).padStart(2,"0")}/{d.anio}. No se requiere ajuste.
                </p>
              )}

              {!d.ok && d.grupos.map((g) => (
                <div key={g.grupoId} className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-error)]">Grupo con sub-centavo ≥ 0.005</p>
                    <p className="text-sm font-semibold">{g.grupoCodigo} — {g.grupoNombre}</p>
                    <p className="font-mono text-xs text-[var(--color-on-surface-variant)]">
                      rawSum: {g.rawSum.toFixed(8)} → redondeado: {formatNumber(g.rounded)} (sub-centavo: {g.subCentavo.toFixed(6)})
                    </p>
                  </div>

                  {g.productoAjuste && (
                    <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container)] p-3 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Ajuste mínimo propuesto</p>
                      <p className="text-sm"><span className="font-mono font-semibold">[{g.productoAjuste.codigo}]</span> {g.productoAjuste.nombre}</p>
                      <div className="flex flex-wrap gap-4 font-mono text-xs">
                        <span>Actual: <strong>{g.productoAjuste.ingresosBsActual.toFixed(10)}</strong></span>
                        <span>→ Nuevo: <strong>{g.productoAjuste.ingresosBsNuevo.toFixed(10)}</strong></span>
                        <span className="text-[var(--color-on-surface-variant)]">ε = {g.productoAjuste.epsilon.toFixed(10)} Bs</span>
                      </div>
                      <p className="text-xs text-[var(--color-on-surface-variant)]">
                        SaldoMensual id: <span className="font-mono">{g.productoAjuste.saldoMensualId}</span>
                      </p>
                      <div className="pt-1">
                        <p className="mb-1 text-xs font-semibold text-[var(--color-on-surface-variant)]">Query SQL equivalente para producción:</p>
                        <pre className="overflow-x-auto rounded bg-[var(--color-surface-container-highest)] p-2 font-mono text-xs">
{`UPDATE "SaldoMensual"\nSET "ingresosBs" = ${g.productoAjuste.ingresosBsNuevo.toFixed(10)}\nWHERE id = '${g.productoAjuste.saldoMensualId}';`}
                        </pre>
                      </div>
                      <button
                        type="button"
                        disabled={fixRedondeoMutation.isPending}
                        onClick={async () => {
                          const ok = window.confirm(
                            `Ajustar ingresosBs de [${g.productoAjuste!.codigo}] en ${d.mes}/${d.anio} de ${g.productoAjuste!.ingresosBsActual.toFixed(6)} a ${g.productoAjuste!.ingresosBsNuevo.toFixed(6)} (cambio: ${g.productoAjuste!.epsilon.toFixed(6)} Bs). ¿Confirmar?`
                          );
                          if (!ok) return;
                          try {
                            await fixRedondeoMutation.mutateAsync({
                              anio: d.anio,
                              mes: d.mes,
                              saldoMensualId: g.productoAjuste!.saldoMensualId,
                              ingresosBsNuevo: g.productoAjuste!.ingresosBsNuevo,
                            });
                            showSuccess(`Fix aplicado. ingresosBs ajustado en ${g.productoAjuste!.epsilon.toFixed(6)} Bs. Los reportes de ${d.mes}/${d.anio} ahora cuadran.`);
                            setRedondeoParams({ anio: d.anio, mes: d.mes });
                          } catch (err) {
                            showError(normalizeError(err, "No se pudo aplicar el fix."));
                          }
                        }}
                        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {fixRedondeoMutation.isPending ? "Aplicando…" : "Aplicar fix"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </article>
    </section>
  );
}
