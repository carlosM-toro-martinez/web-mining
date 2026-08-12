import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, Loader2, Play, Search, Settings2, TriangleAlert } from "lucide-react";
import {
  useBackfillCppMutation,
  useDiagnosticoPreciosQuery,
  useDiagnosticoSaldosQuery
} from "@/features/inventario-import/hooks/useInventarioImport";
import { useReordenarMovimientosMutation } from "@/features/movimientos/hooks/useMovimientos";
import {
  useComprasConSaldoInicialReportQuery,
  useInventarioAlmacenReportQuery
} from "@/features/reportes/hooks/useReportes";
import type {
  BackfillCppResponse,
  DiagnosticoPreciosItem,
  DiagnosticoSaldosItem,
  SaldoMensualQuery
} from "@/features/inventario-import/model/inventarioImport.schema";
import type {
  CompraConSaldoInicialGrupo,
  CompraConSaldoInicialProducto,
  MonthlyRangeReportQueryParams
} from "@/features/reportes/model/reportes.schema";
import type { ReordenarMovimientosResponse } from "@/features/movimientos/model/movimientos.schema";
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

function productCode(item: DiagnosticoPreciosItem) {
  return item.productoCodigo ?? item.codigo ?? "-";
}

function productName(item: DiagnosticoPreciosItem) {
  return item.productoNombre ?? item.nombre ?? "-";
}

function saldoProductCode(item: DiagnosticoSaldosItem) {
  return item.productoCodigo ?? item.codigo ?? "-";
}

function saldoProductName(item: DiagnosticoSaldosItem) {
  return item.productoNombre ?? item.nombre ?? "-";
}

function comprasGrupoKey(grupo: CompraConSaldoInicialGrupo) {
  const codigo = (grupo.grupoCodigo ?? "").trim();
  const nombre = (grupo.grupoNombre ?? "").trim();
  return `${codigo}|||${nombre}`;
}

function comprasGrupoLabel(grupo: CompraConSaldoInicialGrupo) {
  const codigo = (grupo.grupoCodigo ?? "").trim();
  const nombre = (grupo.grupoNombre ?? "").trim();
  if (codigo && nombre) return `${codigo} - ${nombre}`;
  return codigo || nombre || "Sin grupo";
}

function comprasProductoSearchText(
  producto: CompraConSaldoInicialProducto,
  grupo: CompraConSaldoInicialGrupo
) {
  return `${producto.codigo ?? ""} ${producto.nombre ?? ""} ${grupo.grupoCodigo ?? ""} ${grupo.grupoNombre ?? ""}`.toLowerCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-BO");
}

export function AjustesPage() {
  const now = new Date();
  const { showError, showSuccess } = useToast();
  const backfillCppMutation = useBackfillCppMutation();
  const reordenarMutation = useReordenarMovimientosMutation();

  const [diagnosticoAnio, setDiagnosticoAnio] = useState(String(now.getFullYear()));
  const [diagnosticoMes, setDiagnosticoMes] = useState(String(now.getMonth() + 1));
  const [diagnosticoParams, setDiagnosticoParams] = useState<SaldoMensualQuery | null>(null);
  const [diagnosticoTab, setDiagnosticoTab] = useState<"sinPrecio" | "sinProm">("sinPrecio");
  const [saldosAnio, setSaldosAnio] = useState(String(now.getFullYear()));
  const [saldosMes, setSaldosMes] = useState(String(now.getMonth() + 1));
  const [saldosParams, setSaldosParams] = useState<SaldoMensualQuery | null>(null);
  const [comprasAnioInicio, setComprasAnioInicio] = useState(String(now.getFullYear()));
  const [comprasMesInicio, setComprasMesInicio] = useState(String(now.getMonth() + 1));
  const [comprasAnioFin, setComprasAnioFin] = useState(String(now.getFullYear()));
  const [comprasMesFin, setComprasMesFin] = useState(String(now.getMonth() + 1));
  const [comprasParams, setComprasParams] = useState<MonthlyRangeReportQueryParams | null>(null);
  const [comprasGrupo, setComprasGrupo] = useState("");
  const [comprasSearch, setComprasSearch] = useState("");
  const [reordenarAnio, setReordenarAnio] = useState(String(now.getFullYear()));
  const [reordenarMes, setReordenarMes] = useState(String(now.getMonth() + 1));
  const [reordenarProductoId, setReordenarProductoId] = useState("");
  const [reordenarResponse, setReordenarResponse] = useState<ReordenarMovimientosResponse | null>(
    null
  );
  const [cppAnio, setCppAnio] = useState(String(now.getFullYear()));
  const [cppMes, setCppMes] = useState(String(now.getMonth() + 1));
  const [cppResponse, setCppResponse] = useState<BackfillCppResponse | null>(null);
  const [negativosAnio, setNegativosAnio] = useState(String(now.getFullYear()));
  const [negativosMes, setNegativosMes] = useState(String(now.getMonth() + 1));
  const [negativosParams, setNegativosParams] = useState<{ anioInicio: number; mesInicio: number; anioFin: number; mesFin: number } | null>(null);

  const activeDiagnosticoParams = diagnosticoParams ?? {
    anio: Number(diagnosticoAnio),
    mes: Number(diagnosticoMes)
  };
  const diagnosticoQuery = useDiagnosticoPreciosQuery(
    activeDiagnosticoParams,
    Boolean(diagnosticoParams)
  );
  const activeSaldosParams = saldosParams ?? {
    anio: Number(saldosAnio),
    mes: Number(saldosMes)
  };
  const saldosQuery = useDiagnosticoSaldosQuery(activeSaldosParams, Boolean(saldosParams));
  const activeComprasParams = comprasParams ?? {
    anioInicio: Number(comprasAnioInicio),
    mesInicio: Number(comprasMesInicio),
    anioFin: Number(comprasAnioFin),
    mesFin: Number(comprasMesFin)
  };
  const comprasConSaldoQuery = useComprasConSaldoInicialReportQuery(
    activeComprasParams,
    Boolean(comprasParams)
  );
  const activeNegativosParams = negativosParams ?? {
    anioInicio: Number(negativosAnio), mesInicio: Number(negativosMes),
    anioFin: Number(negativosAnio),   mesFin: Number(negativosMes)
  };
  const negativosQuery = useInventarioAlmacenReportQuery(activeNegativosParams, Boolean(negativosParams));

  const diagnosticoData = diagnosticoQuery.data?.data;
  const saldosData = saldosQuery.data?.data;
  const comprasConSaldoData = comprasConSaldoQuery.data?.data;

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
  const saldosRows = saldosData?.discrepancias ?? [];
  const diagnosticoRows = useMemo(
    () =>
      diagnosticoTab === "sinPrecio"
        ? (diagnosticoData?.sinPrecio ?? [])
        : (diagnosticoData?.sinProm ?? []),
    [diagnosticoData?.sinPrecio, diagnosticoData?.sinProm, diagnosticoTab]
  );
  const comprasGrupoOptions = useMemo(() => {
    const groups = new Map<string, { id: string; label: string }>();
    for (const mes of comprasConSaldoData?.meses ?? []) {
      for (const grupo of mes.grupos) {
        const id = comprasGrupoKey(grupo);
        if (!groups.has(id)) groups.set(id, { id, label: comprasGrupoLabel(grupo) });
      }
    }
    return [...groups.values()].sort((a, b) => {
      const aCode = Number(a.label.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
      const bCode = Number(b.label.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
      return aCode - bCode || a.label.localeCompare(b.label);
    });
  }, [comprasConSaldoData?.meses]);
  const comprasRows = useMemo(() => {
    const search = comprasSearch.trim().toLowerCase();
    return (comprasConSaldoData?.meses ?? []).flatMap((mes) =>
      mes.grupos
        .filter((grupo) => !comprasGrupo || comprasGrupoKey(grupo) === comprasGrupo)
        .flatMap((grupo) =>
          grupo.productos
            .filter(
              (producto) => !search || comprasProductoSearchText(producto, grupo).includes(search)
            )
            .map((producto) => ({ mes, grupo, producto }))
        )
    );
  }, [comprasConSaldoData?.meses, comprasGrupo, comprasSearch]);
  const comprasFiltradasTotal = useMemo(
    () => comprasRows.reduce((sum, row) => sum + row.producto.totalCompradoBs, 0),
    [comprasRows]
  );

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

  function parseRangoMensual() {
    const inicio = parsePeriodo(comprasAnioInicio, comprasMesInicio);
    const fin = parsePeriodo(comprasAnioFin, comprasMesFin);
    if (!inicio || !fin) return null;
    const inicioKey = inicio.anio * 12 + inicio.mes;
    const finKey = fin.anio * 12 + fin.mes;
    if (inicioKey > finKey) return null;
    return {
      anioInicio: inicio.anio,
      mesInicio: inicio.mes,
      anioFin: fin.anio,
      mesFin: fin.mes
    };
  }

  function handleDiagnosticoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const periodo = parsePeriodo(diagnosticoAnio, diagnosticoMes);
    if (!periodo) {
      showError("Indica un año y mes válidos para consultar el diagnóstico.");
      return;
    }
    setDiagnosticoParams(periodo);
    if (diagnosticoParams?.anio === periodo.anio && diagnosticoParams.mes === periodo.mes) {
      void diagnosticoQuery.refetch();
    }
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

  function handleReordenarSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const periodo = parsePeriodo(reordenarAnio, reordenarMes);
    if (!periodo) {
      showError("Indica un año y mes válidos para reordenar.");
      return;
    }
    const payload: { anio: number; mes: number; productoId?: number } = { ...periodo };
    const pid = Number(reordenarProductoId);
    if (reordenarProductoId.trim() && Number.isInteger(pid) && pid > 0) {
      payload.productoId = pid;
    }

    setReordenarResponse(null);
    reordenarMutation.mutate(payload, {
      onSuccess: (response) => {
        setReordenarResponse(response);
        const d = response.data;
        const resumen = [
          `productos: ${d.productosReordenados}`,
          `movimientos: ${d.movimientosActualizados}`,
          d.errores.length ? `errores: ${d.errores.length}` : null
        ]
          .filter(Boolean)
          .join(" · ");
        showSuccess(`Reordenamiento completado · ${resumen}`);
      },
      onError: (error) => showError(normalizeError(error, "No se pudo reordenar los movimientos."))
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

  function handleSaldosSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const periodo = parsePeriodo(saldosAnio, saldosMes);
    if (!periodo) {
      showError("Indica un año y mes válidos para consultar el diagnóstico de saldos.");
      return;
    }
    setSaldosParams(periodo);
    if (saldosParams?.anio === periodo.anio && saldosParams.mes === periodo.mes) {
      void saldosQuery.refetch();
    }
  }

  function handleComprasConSaldoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rango = parseRangoMensual();
    if (!rango) {
      showError("Indica un rango mensual válido para consultar compras con saldo inicial.");
      return;
    }
    setComprasParams(rango);
    if (
      comprasParams?.anioInicio === rango.anioInicio &&
      comprasParams.mesInicio === rango.mesInicio &&
      comprasParams.anioFin === rango.anioFin &&
      comprasParams.mesFin === rango.mesFin
    ) {
      void comprasConSaldoQuery.refetch();
    }
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
              Diagnóstico de productos sin precio y ejecución controlada del ajuste de precios sin
              IVA.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Diagnóstico de precios</h2>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                Productos con saldo final y precio unitario o promedio pendiente.
              </p>
            </div>
            {diagnosticoData?.periodo || diagnosticoParams ? (
              <span className="rounded-full bg-[var(--color-primary)]/12 px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                {diagnosticoData?.periodo ??
                  `${String(diagnosticoParams?.mes ?? "").padStart(2, "0")}/${diagnosticoParams?.anio}`}
              </span>
            ) : null}
          </div>

          <form
            className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
            onSubmit={handleDiagnosticoSubmit}
          >
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Año
              </label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={diagnosticoAnio}
                onChange={(event) => setDiagnosticoAnio(event.target.value)}
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
                value={diagnosticoMes}
                onChange={(event) => setDiagnosticoMes(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={diagnosticoQuery.isFetching}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {diagnosticoQuery.isFetching ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                Consultar
              </button>
            </div>
          </form>

          {diagnosticoQuery.isError ? (
            <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
              {normalizeError(diagnosticoQuery.error, "No se pudo consultar el diagnóstico.")}
            </div>
          ) : null}

          {diagnosticoData ? (
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Productos
                </p>
                <p className="mt-1 text-2xl font-extrabold">{diagnosticoData.totalProductos}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-error)]/25 bg-[var(--color-error)]/8 p-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Sin precio unit.
                </p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--color-error)]">
                  {diagnosticoData.sinPrecioCount}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-warning)]/25 bg-[var(--color-warning)]/8 p-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Sin precio prom.
                </p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--color-warning)]">
                  {diagnosticoData.sinPromCount}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mb-3 flex flex-wrap gap-2">
            {[
              {
                key: "sinPrecio" as const,
                label: "Sin precio unitario",
                count: diagnosticoData?.sinPrecioCount
              },
              {
                key: "sinProm" as const,
                label: "Sin precio promedio",
                count: diagnosticoData?.sinPromCount
              }
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setDiagnosticoTab(option.key)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  diagnosticoTab === option.key
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/14 text-[var(--color-primary)]"
                    : "border-[var(--color-border-soft)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]/45"
                }`}
              >
                {option.label}
                {option.count !== undefined ? ` (${option.count})` : ""}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
            <div className="max-h-[560px] overflow-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-[var(--color-surface-container-highest)] text-left text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  <tr>
                    <th className="border-b border-[var(--color-border-soft)] px-3 py-2">ID</th>
                    <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Código</th>
                    <th className="border-b border-[var(--color-border-soft)] px-3 py-2">
                      Producto
                    </th>
                    <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Unidad</th>
                    <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                      Saldo final
                    </th>
                    <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                      Precio unit.
                    </th>
                    <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                      Precio prom.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!diagnosticoParams ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-8 text-center text-sm text-[var(--color-on-surface-variant)]"
                      >
                        Consulta un período para ver productos sin precio asignado.
                      </td>
                    </tr>
                  ) : diagnosticoQuery.isFetching ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-8 text-center text-sm text-[var(--color-on-surface-variant)]"
                      >
                        Cargando diagnóstico...
                      </td>
                    </tr>
                  ) : diagnosticoRows.length ? (
                    diagnosticoRows.map((item, index) => (
                      <tr
                        key={`${productCode(item)}-${item.id ?? item.productoId ?? index}`}
                        className="border-b border-[var(--color-border-soft)] last:border-0"
                      >
                        <td className="px-3 py-2 font-mono text-xs">
                          {item.productoId ?? item.id ?? "-"}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{productCode(item)}</td>
                        <td className="px-3 py-2 font-medium">{productName(item)}</td>
                        <td className="px-3 py-2">{item.unidad ?? "-"}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(item.saldoFinal)}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(item.precioUnit, 4)}</td>
                        <td className="px-3 py-2 text-right">
                          {formatNumber(item.precioUnitProm, 4)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-8 text-center text-sm text-[var(--color-success)]"
                      >
                        Sin productos pendientes para el período consultado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/12 p-2 text-[var(--color-primary)]">
              <ArrowUpDown size={16} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Reordenar movimientos</h2>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                Corrige stockAntes, stockDespues y saldoBs del bin card cuando hay salidas
                registradas antes de su compra.
              </p>
            </div>
          </div>

          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleReordenarSubmit}>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Año
              </label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={reordenarAnio}
                onChange={(event) => setReordenarAnio(event.target.value)}
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
                value={reordenarMes}
                onChange={(event) => setReordenarMes(event.target.value)}
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
                value={reordenarProductoId}
                onChange={(event) => setReordenarProductoId(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={reordenarMutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reordenarMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowUpDown size={16} />
                )}
                Reordenar movimientos
              </button>
            </div>
          </form>

          <div className="mt-4 rounded-lg border border-[var(--color-warning)]/35 bg-[var(--color-warning)]/10 p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
              <p className="text-[var(--color-on-surface-variant)]">
                Solo modifica stockAntes, stockDespues y saldoBs de los movimientos. Ejecuta
                backfill CPP primero para tener precios correctos.
              </p>
            </div>
          </div>

          {reordenarMutation.isError ? (
            <div className="mt-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
              {normalizeError(reordenarMutation.error, "No se pudo reordenar los movimientos.")}
            </div>
          ) : null}

          {reordenarResponse ? (
            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Productos
                  </p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {reordenarResponse.data.productosReordenados}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Movimientos
                  </p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {reordenarResponse.data.movimientosActualizados}
                  </p>
                </div>
              </div>
              {reordenarResponse.data.errores.length > 0 ? (
                <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-xs text-[var(--color-error)]">
                  {reordenarResponse.data.errores.map((e) => (
                    <div key={e.productoId}>
                      Producto {e.productoId}: {e.error}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 text-sm text-[var(--color-on-surface-variant)]">
              Sin ejecución todavía.
            </p>
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
          <div>
            <h2 className="text-lg font-bold">Compras con saldo inicial</h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Productos que tienen saldo inicial mayor a cero y compras dentro del período.
            </p>
          </div>
          {comprasParams ? (
            <span className="rounded-full bg-[var(--color-primary)]/12 px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
              {String(comprasParams.mesInicio).padStart(2, "0")}/{comprasParams.anioInicio} -{" "}
              {String(comprasParams.mesFin).padStart(2, "0")}/{comprasParams.anioFin}
            </span>
          ) : null}
        </div>

        <form
          className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-5"
          onSubmit={handleComprasConSaldoSubmit}
        >
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Año inicio
            </label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={comprasAnioInicio}
              onChange={(event) => setComprasAnioInicio(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Mes inicio
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={comprasMesInicio}
              onChange={(event) => setComprasMesInicio(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Año fin
            </label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={comprasAnioFin}
              onChange={(event) => setComprasAnioFin(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Mes fin
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={comprasMesFin}
              onChange={(event) => setComprasMesFin(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={comprasConSaldoQuery.isFetching}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {comprasConSaldoQuery.isFetching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Consultar
            </button>
          </div>
        </form>

        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.4fr]">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Grupo
            </label>
            <select
              value={comprasGrupo}
              onChange={(event) => setComprasGrupo(event.target.value)}
              disabled={!comprasConSaldoData || comprasConSaldoQuery.isFetching}
              className={inputClassName}
            >
              <option value="">Todos los grupos</option>
              {comprasGrupoOptions.map((grupo) => (
                <option key={grupo.id} value={grupo.id}>
                  {grupo.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Buscar producto
            </label>
            <input
              value={comprasSearch}
              onChange={(event) => setComprasSearch(event.target.value)}
              placeholder="Código o nombre"
              disabled={!comprasConSaldoData || comprasConSaldoQuery.isFetching}
              className={inputClassName}
            />
          </div>
        </div>

        {comprasConSaldoQuery.isError ? (
          <div className="mb-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            {normalizeError(
              comprasConSaldoQuery.error,
              "No se pudo consultar compras con saldo inicial."
            )}
          </div>
        ) : null}

        {comprasConSaldoData ? (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Meses
              </p>
              <p className="mt-1 text-2xl font-extrabold">{comprasConSaldoData.meses.length}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Productos filtrados
              </p>
              <p className="mt-1 text-2xl font-extrabold">{comprasRows.length}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-success)]/25 bg-[var(--color-success)]/8 p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Total comprado Bs.
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[var(--color-success)]">
                {formatNumber(comprasFiltradasTotal)}
              </p>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
          <div className="max-h-[620px] overflow-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-[var(--color-surface-container-highest)] text-left text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                <tr>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Periodo</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Grupo</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Código</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Producto</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                    Saldo inicial
                  </th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                    Saldo Bs.
                  </th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                    Comprado Bs.
                  </th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Compras</th>
                </tr>
              </thead>
              <tbody>
                {!comprasParams ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Consulta un rango para ver productos con saldo inicial y compras.
                    </td>
                  </tr>
                ) : comprasConSaldoQuery.isFetching ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Cargando compras con saldo inicial...
                    </td>
                  </tr>
                ) : comprasRows.length ? (
                  comprasRows.map(({ mes, grupo, producto }) => (
                    <tr
                      key={`${mes.anio}-${mes.mes}-${comprasGrupoKey(grupo)}-${producto.codigo ?? producto.nombre}`}
                      className="border-b border-[var(--color-border-soft)] align-top last:border-0"
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {String(mes.mes).padStart(2, "0")}/{mes.anio}
                      </td>
                      <td className="min-w-[160px] px-3 py-2">{comprasGrupoLabel(grupo)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{producto.codigo ?? "-"}</td>
                      <td className="min-w-[220px] px-3 py-2 font-medium">
                        {producto.nombre ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(producto.saldoInicialQty)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(producto.saldoInicialBs)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatNumber(producto.totalCompradoBs)}
                      </td>
                      <td className="min-w-[360px] px-3 py-2">
                        <div className="space-y-1 text-xs text-[var(--color-on-surface-variant)]">
                          {producto.compras.map((compra, index) => (
                            <div
                              key={`${compra.numeroFactura ?? "sf"}-${compra.fecha ?? "sf"}-${index}`}
                              className="rounded-md bg-[var(--color-surface-container-low)] px-2 py-1"
                            >
                              <span className="font-semibold text-[var(--color-on-surface)]">
                                {compra.numeroFactura ?? "Sin factura"}
                              </span>{" "}
                              · {formatDate(compra.fecha)} · {compra.proveedor ?? "Sin proveedor"} ·
                              Cant. {formatNumber(compra.cantidad)} · P.U.{" "}
                              {formatNumber(compra.precioUnit, 4)} · Bs.{" "}
                              {formatNumber(compra.importeBs)}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Sin productos para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </article>

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

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Diagnóstico de saldos</h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Compara salida mensual contra movimientos y valida saldoInicial + ingresos - salidas.
            </p>
          </div>
          {saldosData?.periodo || saldosParams ? (
            <span className="rounded-full bg-[var(--color-primary)]/12 px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
              {saldosData?.periodo ??
                `${String(saldosParams?.mes ?? "").padStart(2, "0")}/${saldosParams?.anio}`}
            </span>
          ) : null}
        </div>

        <form
          className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={handleSaldosSubmit}
        >
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Año
            </label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={saldosAnio}
              onChange={(event) => setSaldosAnio(event.target.value)}
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
              value={saldosMes}
              onChange={(event) => setSaldosMes(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saldosQuery.isFetching}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saldosQuery.isFetching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Consultar
            </button>
          </div>
        </form>

        {saldosQuery.isError ? (
          <div className="mb-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            {normalizeError(saldosQuery.error, "No se pudo consultar el diagnóstico de saldos.")}
          </div>
        ) : null}

        {saldosData ? (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Productos
              </p>
              <p className="mt-1 text-2xl font-extrabold">{saldosData.totalProductos}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-success)]/25 bg-[var(--color-success)]/8 p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Correctos
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[var(--color-success)]">
                {saldosData.productosOk}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--color-error)]/25 bg-[var(--color-error)]/8 p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Discrepancias
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[var(--color-error)]">
                {saldosData.discrepanciasCount}
              </p>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-[var(--color-surface-container-highest)] text-left text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                <tr>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Código</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Producto</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                    Saldo inicial
                  </th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                    Salida mensual
                  </th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                    Movimientos
                  </th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                    Dif. salida
                  </th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                    Saldo final
                  </th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                    Calculado
                  </th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">
                    Dif. saldo
                  </th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2">
                    Problemas
                  </th>
                </tr>
              </thead>
              <tbody>
                {!saldosParams ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-8 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Consulta un período para revisar discrepancias de saldos.
                    </td>
                  </tr>
                ) : saldosQuery.isFetching ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-8 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Cargando diagnóstico...
                    </td>
                  </tr>
                ) : saldosRows.length ? (
                  saldosRows.map((item, index) => (
                    <tr
                      key={`${saldoProductCode(item)}-${item.id ?? item.productoId ?? index}`}
                      className="border-b border-[var(--color-border-soft)] last:border-0"
                    >
                      <td className="px-3 py-2 font-mono text-xs">{saldoProductCode(item)}</td>
                      <td className="min-w-[220px] px-3 py-2 font-medium">
                        {saldoProductName(item)}
                      </td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.saldoInicial)}</td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(item.salidaQty?.saldoMensual)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(item.salidaQty?.movimientos)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(item.salidaQty?.diferencia)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(item.saldoFinal?.saldoMensual)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(item.saldoFinal?.calculado)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(item.saldoFinal?.diferencia)}
                      </td>
                      <td className="min-w-[260px] px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                        {item.problemas.length ? item.problemas.join(" | ") : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-8 text-center text-sm text-[var(--color-success)]"
                    >
                      Sin discrepancias para el período consultado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </section>
  );
}
