import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, Loader2, Play, Search, Settings2, Trash2, TriangleAlert } from "lucide-react";
import {
  useBackfillCppMutation,
  useDiagnosticoPreciosQuery,
  useDiagnosticoSaldosQuery,
  useDiagnosticoRedondeoQuery,
  useFixRedondeoMutation,
  useLimpiarMesPreviewQuery,
  useEjecutarLimpiarMesMutation
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
  LimpiarMesVale,
  LimpiarMesCompra,
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
  const [limpiarAnio, setLimpiarAnio] = useState(String(now.getFullYear()));
  const [limpiarMes, setLimpiarMes] = useState(String(now.getMonth() + 1));
  const [limpiarParams, setLimpiarParams] = useState<{ anio: number; mes: number } | null>(null);
  const [limpiarTab, setLimpiarTab] = useState<"vales" | "compras">("vales");
  const [limpiarConfirmando, setLimpiarConfirmando] = useState(false);
  const [redondeoAnio, setRedondeoAnio] = useState(String(now.getFullYear()));
  const [redondeoMes, setRedondeoMes] = useState(String(now.getMonth() + 1));
  const [redondeoParams, setRedondeoParams] = useState<{ anio: number; mes: number } | null>(null);
  const fixRedondeoMutation = useFixRedondeoMutation();

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
  const activeRedondeoParams = redondeoParams ?? { anio: Number(redondeoAnio), mes: Number(redondeoMes) };
  const redondeoQuery = useDiagnosticoRedondeoQuery(activeRedondeoParams, Boolean(redondeoParams));
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
  const activeLimpiarParams = limpiarParams ?? { anio: Number(limpiarAnio), mes: Number(limpiarMes) };
  const limpiarPreviewQuery = useLimpiarMesPreviewQuery(activeLimpiarParams, Boolean(limpiarParams));
  const limpiarMesMutation = useEjecutarLimpiarMesMutation();

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

  function handleLimpiarPreviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const periodo = parsePeriodo(limpiarAnio, limpiarMes);
    if (!periodo) {
      showError("Indica un año y mes válidos.");
      return;
    }
    setLimpiarConfirmando(false);
    setLimpiarParams(periodo);
    if (limpiarParams?.anio === periodo.anio && limpiarParams.mes === periodo.mes) {
      void limpiarPreviewQuery.refetch();
    }
  }

  function handleLimpiarMesConfirmar() {
    if (!limpiarParams) return;
    limpiarMesMutation.mutate(limpiarParams, {
      onSuccess: (response) => {
        const d = response.data;
        showSuccess(
          `Limpiar mes completado · vales eliminados: ${d.valesEliminados} · compras eliminadas: ${d.comprasEliminadas}`
        );
        setLimpiarParams(null);
        setLimpiarConfirmando(false);
      },
      onError: (error) => showError(normalizeError(error, "No se pudo limpiar el mes."))
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

      {/* ─── Limpiar mes ─────────────────────────────────────────────────── */}
      <article className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-surface-container-high)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Limpiar mes</h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Elimina permanentemente todos los vales y compras no-retroactivos de un mes.
              No afecta movimientos históricos ni SaldoMensual.
            </p>
          </div>
          {limpiarParams ? (
            <span className="rounded-full bg-[var(--color-error)]/12 px-3 py-1 text-xs font-bold text-[var(--color-error)]">
              {String(limpiarParams.mes).padStart(2, "0")}/{limpiarParams.anio}
            </span>
          ) : null}
        </div>

        <form
          className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={handleLimpiarPreviewSubmit}
        >
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Año
            </label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={limpiarAnio}
              onChange={(e) => setLimpiarAnio(e.target.value)}
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
              value={limpiarMes}
              onChange={(e) => setLimpiarMes(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={limpiarPreviewQuery.isFetching}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {limpiarPreviewQuery.isFetching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Ver preview
            </button>
          </div>
        </form>

        {limpiarPreviewQuery.isError ? (
          <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            {normalizeError(limpiarPreviewQuery.error, "No se pudo cargar el preview.")}
          </div>
        ) : null}

        {limpiarPreviewQuery.data ? (() => {
          const preview = limpiarPreviewQuery.data.data;
          const vales = preview.vales as LimpiarMesVale[];
          const compras = preview.compras as LimpiarMesCompra[];
          const totalVales = vales.length;
          const totalCompras = compras.length;
          const tabVales = limpiarTab === "vales";

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Vales
                  </p>
                  <p className="mt-1 text-2xl font-extrabold">{totalVales}</p>
                </div>
                <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Compras
                  </p>
                  <p className="mt-1 text-2xl font-extrabold">{totalCompras}</p>
                </div>
              </div>

              {/* tabs */}
              <div className="flex gap-1 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-1">
                {(["vales", "compras"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setLimpiarTab(tab)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                      limpiarTab === tab
                        ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                        : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]"
                    }`}
                  >
                    {tab === "vales" ? `Vales (${totalVales})` : `Compras (${totalCompras})`}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-lg border border-[var(--color-border-soft)]">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Fecha</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        {tabVales ? "Solicitante" : "Proveedor"}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Estado</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Productos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabVales
                      ? vales.length === 0
                        ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                              Sin vales no-retroactivos en este mes.
                            </td>
                          </tr>
                        )
                        : vales.map((vale) => (
                          <tr key={vale.id} className="border-b border-[var(--color-border-soft)] last:border-0">
                            <td className="px-3 py-2 font-mono text-xs">{formatDate(vale.fecha.toISOString())}</td>
                            <td className="px-3 py-2">{vale.solicitante}</td>
                            <td className="px-3 py-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                vale.estado === "ANULADO"
                                  ? "bg-[var(--color-error)]/15 text-[var(--color-error)]"
                                  : vale.estado === "ENTREGADO"
                                  ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                                  : "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                              }`}>
                                {vale.estado}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                              {vale.items.map((i) => `${i.productoCodigo} ×${i.cantidadEntregada}`).join(", ")}
                            </td>
                          </tr>
                        ))
                      : compras.length === 0
                        ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                              Sin compras no-retroactivas en este mes.
                            </td>
                          </tr>
                        )
                        : compras.map((compra) => (
                          <tr key={compra.id} className="border-b border-[var(--color-border-soft)] last:border-0">
                            <td className="px-3 py-2 font-mono text-xs">{formatDate(compra.fecha.toISOString())}</td>
                            <td className="px-3 py-2">{compra.proveedor}</td>
                            <td className="px-3 py-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                compra.estado === "ANULADA"
                                  ? "bg-[var(--color-error)]/15 text-[var(--color-error)]"
                                  : "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                              }`}>
                                {compra.estado}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                              {compra.items.map((i) => `${i.productoCodigo} ×${i.cantidadRecibida}`).join(", ")}
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>

              {totalVales === 0 && totalCompras === 0 ? null : (
                <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/8 p-4">
                  <div className="mb-3 flex items-start gap-2 text-sm text-[var(--color-error)]">
                    <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Esta acción es <strong>irreversible</strong>. Se eliminarán {totalVales} vale(s) y {totalCompras} compra(s)
                      del mes {String(preview.mes).padStart(2, "0")}/{preview.anio} junto con todos sus movimientos.
                      El stock físico será ajustado automáticamente.
                    </span>
                  </div>
                  {!limpiarConfirmando ? (
                    <button
                      type="button"
                      onClick={() => setLimpiarConfirmando(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-error)]/40 bg-transparent px-4 py-2 text-sm font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/12"
                    >
                      <Trash2 size={15} />
                      Eliminar todo el mes
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[var(--color-error)]">
                        ¿Confirmas la eliminación permanente?
                      </p>
                      <button
                        type="button"
                        onClick={handleLimpiarMesConfirmar}
                        disabled={limpiarMesMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-error)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {limpiarMesMutation.isPending ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                        Sí, eliminar
                      </button>
                      <button
                        type="button"
                        onClick={() => setLimpiarConfirmando(false)}
                        disabled={limpiarMesMutation.isPending}
                        className="rounded-lg border border-[var(--color-border-soft)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--color-surface-container-highest)]"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })() : null}
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
