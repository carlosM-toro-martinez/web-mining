import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Play, Search, Settings2 } from "lucide-react";
import {
  useAjustarPreciosSinIvaMutation,
  useDiagnosticoPreciosQuery,
  useDiagnosticoSaldosQuery
} from "@/features/inventario-import/hooks/useInventarioImport";
import type {
  AjustarPreciosSinIvaResponse,
  DiagnosticoPreciosItem,
  DiagnosticoSaldosItem,
  SaldoMensualQuery
} from "@/features/inventario-import/model/inventarioImport.schema";
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

function responseSummary(response: AjustarPreciosSinIvaResponse | undefined) {
  if (!response) return "";
  const data = response.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return response.message ?? "Ajuste ejecutado.";
  const record = data as Record<string, unknown>;
  const parts = [
    ["procesados", record.procesados],
    ["actualizados", record.actualizados],
    ["sinCompras", record.sinCompras],
    ["cascadeados", record.cascadeados],
    ["fallidos", record.fallidos]
  ]
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([label, value]) => `${label}: ${String(value)}`);
  return parts.length ? parts.join(" · ") : response.message ?? "Ajuste ejecutado.";
}

export function AjustesPage() {
  const now = new Date();
  const { showError, showSuccess } = useToast();
  const ajustarPreciosSinIvaMutation = useAjustarPreciosSinIvaMutation();

  const [diagnosticoAnio, setDiagnosticoAnio] = useState(String(now.getFullYear()));
  const [diagnosticoMes, setDiagnosticoMes] = useState(String(now.getMonth() + 1));
  const [diagnosticoParams, setDiagnosticoParams] = useState<SaldoMensualQuery | null>(null);
  const [diagnosticoTab, setDiagnosticoTab] = useState<"sinPrecio" | "sinProm">("sinPrecio");
  const [saldosAnio, setSaldosAnio] = useState(String(now.getFullYear()));
  const [saldosMes, setSaldosMes] = useState(String(now.getMonth() + 1));
  const [saldosParams, setSaldosParams] = useState<SaldoMensualQuery | null>(null);
  const [ajusteAnio, setAjusteAnio] = useState(String(now.getFullYear()));
  const [ajusteMes, setAjusteMes] = useState(String(now.getMonth() + 1));
  const [ajusteResponse, setAjusteResponse] = useState<AjustarPreciosSinIvaResponse | null>(null);

  const activeDiagnosticoParams = diagnosticoParams ?? {
    anio: Number(diagnosticoAnio),
    mes: Number(diagnosticoMes)
  };
  const diagnosticoQuery = useDiagnosticoPreciosQuery(activeDiagnosticoParams, Boolean(diagnosticoParams));
  const activeSaldosParams = saldosParams ?? {
    anio: Number(saldosAnio),
    mes: Number(saldosMes)
  };
  const saldosQuery = useDiagnosticoSaldosQuery(activeSaldosParams, Boolean(saldosParams));

  const diagnosticoData = diagnosticoQuery.data?.data;
  const saldosData = saldosQuery.data?.data;
  const saldosRows = saldosData?.discrepancias ?? [];
  const diagnosticoRows = useMemo(
    () => (diagnosticoTab === "sinPrecio" ? diagnosticoData?.sinPrecio ?? [] : diagnosticoData?.sinProm ?? []),
    [diagnosticoData?.sinPrecio, diagnosticoData?.sinProm, diagnosticoTab]
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

  function handleAjusteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const periodo = parsePeriodo(ajusteAnio, ajusteMes);
    if (!periodo) {
      showError("Indica un año y mes válidos para ejecutar el ajuste.");
      return;
    }

    setAjusteResponse(null);
    ajustarPreciosSinIvaMutation.mutate(periodo, {
      onSuccess: (response) => {
        setAjusteResponse(response);
        showSuccess(responseSummary(response));
      },
      onError: (error) =>
        showError(normalizeError(error, "No se pudo ejecutar el ajuste de precios sin IVA."))
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
            <h1 className="page-title font-headline text-3xl font-extrabold">Ajustes de inventario</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Diagnóstico de productos sin precio y ejecución controlada del ajuste de precios sin IVA.
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

          <form className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleDiagnosticoSubmit}>
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
                {diagnosticoQuery.isFetching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
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
              { key: "sinPrecio" as const, label: "Sin precio unitario", count: diagnosticoData?.sinPrecioCount },
              { key: "sinProm" as const, label: "Sin precio promedio", count: diagnosticoData?.sinPromCount }
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
                    <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Producto</th>
                    <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Unidad</th>
                    <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Saldo final</th>
                    <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Precio unit.</th>
                    <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Precio prom.</th>
                  </tr>
                </thead>
                <tbody>
                  {!diagnosticoParams ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
                        Consulta un período para ver productos sin precio asignado.
                      </td>
                    </tr>
                  ) : diagnosticoQuery.isFetching ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
                        Cargando diagnóstico...
                      </td>
                    </tr>
                  ) : diagnosticoRows.length ? (
                    diagnosticoRows.map((item, index) => (
                      <tr
                        key={`${productCode(item)}-${item.id ?? item.productoId ?? index}`}
                        className="border-b border-[var(--color-border-soft)] last:border-0"
                      >
                        <td className="px-3 py-2 font-mono text-xs">{item.productoId ?? item.id ?? "-"}</td>
                        <td className="px-3 py-2 font-mono text-xs">{productCode(item)}</td>
                        <td className="px-3 py-2 font-medium">{productName(item)}</td>
                        <td className="px-3 py-2">{item.unidad ?? "-"}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(item.saldoFinal)}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(item.precioUnit, 4)}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(item.precioUnitProm, 4)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-[var(--color-success)]">
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
          <div className="mb-4">
            <h2 className="text-lg font-bold">Ajustar precios sin IVA</h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Ejecuta el proceso para el período seleccionado y muestra la respuesta del servidor.
            </p>
          </div>

          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleAjusteSubmit}>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Año
              </label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={ajusteAnio}
                onChange={(event) => setAjusteAnio(event.target.value)}
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
                value={ajusteMes}
                onChange={(event) => setAjusteMes(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={ajustarPreciosSinIvaMutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-error)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ajustarPreciosSinIvaMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                Ejecutar ajuste
              </button>
            </div>
          </form>

          <div className="mt-4 rounded-lg border border-[var(--color-warning)]/35 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-on-surface)]">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 text-[var(--color-warning)]" />
              <p className="text-[var(--color-on-surface-variant)]">
                Este proceso modifica precios del mes y propaga cambios a meses siguientes según la lógica del backend.
              </p>
            </div>
          </div>

          {ajustarPreciosSinIvaMutation.isError ? (
            <div className="mt-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
              {normalizeError(ajustarPreciosSinIvaMutation.error, "No se pudo ejecutar el ajuste.")}
            </div>
          ) : null}

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Respuesta
            </h3>
            <pre className="max-h-[420px] overflow-auto rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] p-3 text-xs leading-relaxed text-[var(--color-on-surface)]">
              {ajusteResponse ? JSON.stringify(ajusteResponse, null, 2) : "Sin ejecución todavía."}
            </pre>
          </div>
        </article>
      </div>

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
              {saldosData?.periodo ?? `${String(saldosParams?.mes ?? "").padStart(2, "0")}/${saldosParams?.anio}`}
            </span>
          ) : null}
        </div>

        <form className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleSaldosSubmit}>
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
              {saldosQuery.isFetching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
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
              <p className="mt-1 text-2xl font-extrabold text-[var(--color-success)]">{saldosData.productosOk}</p>
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
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Saldo inicial</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Salida mensual</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Movimientos</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Dif. salida</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Saldo final</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Calculado</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2 text-right">Dif. saldo</th>
                  <th className="border-b border-[var(--color-border-soft)] px-3 py-2">Problemas</th>
                </tr>
              </thead>
              <tbody>
                {!saldosParams ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
                      Consulta un período para revisar discrepancias de saldos.
                    </td>
                  </tr>
                ) : saldosQuery.isFetching ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
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
                      <td className="min-w-[220px] px-3 py-2 font-medium">{saldoProductName(item)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.saldoInicial)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.salidaQty?.saldoMensual)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.salidaQty?.movimientos)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.salidaQty?.diferencia)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.saldoFinal?.saldoMensual)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.saldoFinal?.calculado)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.saldoFinal?.diferencia)}</td>
                      <td className="min-w-[260px] px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                        {item.problemas.length ? item.problemas.join(" | ") : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-sm text-[var(--color-success)]">
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
