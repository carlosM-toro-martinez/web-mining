import { FormEvent, useMemo, useState } from "react";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  ListFilter
} from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  useBinCardQuery,
  useBinCardValoradoQuery,
  useComprasReportQuery,
  useStockReportQuery,
  useValesReportQuery
} from "@/features/reportes/hooks/useReportes";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import {
  buildInventoryReportDefinition,
  INVENTORY_REPORTS,
  isInventoryReportType
} from "@/features/reportes/lib/inventoryReportBuilder";
import {
  exportInventoryReportExcel,
  exportInventoryReportPdf,
  exportLegacyBinCardExcel,
  exportLegacyBinCardPdf
} from "@/features/reportes/lib/reportesExport";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

type DateMode = "none" | "specific" | "range";
type DataMode = "paged" | "all";
type LegacyReportType = "bin-card" | "bin-card-valorado";
type ApiReportType = "stock-actual" | "vales-resumen" | "compras-resumen";

const LEGACY_REPORTS: Array<{ type: LegacyReportType; title: string; description: string }> = [
  {
    type: "bin-card",
    title: "Bin Card",
    description: "Listado historico de movimientos por producto."
  },
  {
    type: "bin-card-valorado",
    title: "Bin Card Valorado",
    description: "Bin Card con costos unitarios, entradas y salidas valorizadas."
  }
];

function isLegacyReportType(value: string | undefined): value is LegacyReportType {
  return value === "bin-card" || value === "bin-card-valorado";
}
function isApiReportType(value: string | undefined): value is ApiReportType {
  return value === "stock-actual" || value === "vales-resumen" || value === "compras-resumen";
}

function formatLegacyCellValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function isSaldoInicialReferencia(referencia: unknown) {
  if (typeof referencia !== "string") return false;
  return referencia.trim().toUpperCase() === "SALDO_INICIAL";
}

function formatInventoryDate(value: string) {
  const midnightUtcMatch = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/.exec(value);
  if (midnightUtcMatch) {
    const [, year, month, day] = midnightUtcMatch;
    return `${day}/${month}/${year}`;
  }
  return new Date(value).toLocaleString();
}

function buildRetroactivoLabel(item: {
  esRetroactivo?: boolean | null;
  periodoAnio?: number | null;
  periodoMes?: number | null;
}) {
  if (!item.esRetroactivo) return null;
  if (item.periodoAnio && item.periodoMes) {
    return `Retroactivo (${item.periodoMes}/${item.periodoAnio})`;
  }
  return "Retroactivo";
}

export function ReportesPage() {
  const { tipo } = useParams();
  const navigate = useNavigate();

  const isLegacyType = isLegacyReportType(tipo);
  const isAdminType = isInventoryReportType(tipo);
  const isApiType = isApiReportType(tipo);

  if (!isLegacyType && !isAdminType && !isApiType) {
    return <Navigate to="/inventario/reportes/bin-card" replace />;
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const defaultFechaInicio = `${currentYear}-01-01`;
  const defaultFechaFin = today.toISOString().slice(0, 10);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [productoIdDraft, setProductoIdDraft] = useState("");
  const [dateModeDraft, setDateModeDraft] = useState<DateMode>("range");
  const [fechaDraft, setFechaDraft] = useState("");
  const [fechaInicioDraft, setFechaInicioDraft] = useState(defaultFechaInicio);
  const [fechaFinDraft, setFechaFinDraft] = useState(defaultFechaFin);
  const [dataModeDraft, setDataModeDraft] = useState<DataMode>("paged");
  const [productoId, setProductoId] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("range");
  const [fecha, setFecha] = useState("");
  const [fechaInicio, setFechaInicio] = useState(defaultFechaInicio);
  const [fechaFin, setFechaFin] = useState(defaultFechaFin);
  const [dataMode, setDataMode] = useState<DataMode>("paged");

  const productosQuery = useProductosQuery({ page: 1, limit: 5000, search: "" });
  const productos = productosQuery.data?.data ?? [];
  const productoOptions = useMemo(
    () =>
      productos.map((producto) => ({
        id: String(producto.id),
        label: `${producto.codigo} - ${producto.nombre} (${producto.unidad})`,
        searchText: `${producto.codigo} ${producto.nombre} ${producto.unidad}`
      })),
    [productos]
  );

  const params = useMemo(
    () => ({
      page,
      limit,
      productoId: productoId ? Number(productoId) : undefined,
      fecha: dateMode === "specific" ? fecha || undefined : undefined,
      fechaInicio:
        dateMode === "specific"
          ? fecha || undefined
          : dateMode === "range"
            ? fechaInicio || undefined
            : undefined,
      fechaFin:
        dateMode === "specific"
          ? fecha || undefined
          : dateMode === "range"
            ? fechaFin || undefined
            : undefined
    }),
    [dateMode, fecha, fechaFin, fechaInicio, limit, page, productoId]
  );

  const shouldFetchAllLegacy = isLegacyType;
  const binCardQuery = useBinCardQuery(params, dataMode === "all" || shouldFetchAllLegacy, isLegacyType && tipo === "bin-card");
  const binCardValoradoQuery = useBinCardValoradoQuery(
    params,
    dataMode === "all" || shouldFetchAllLegacy || isAdminType,
    (isLegacyType && tipo === "bin-card-valorado") || isAdminType
  );
  const stockQuery = useStockReportQuery(
    { page, limit, categoriaId: undefined },
    isApiType && tipo === "stock-actual"
  );
  const valesResumenQuery = useValesReportQuery(
    { page, limit, estado: undefined, solicitanteId: productoId ? Number(productoId) : undefined, fechaInicio, fechaFin },
    isApiType && tipo === "vales-resumen"
  );
  const comprasResumenQuery = useComprasReportQuery(
    { page, limit, estado: undefined, proveedorId: productoId ? Number(productoId) : undefined, fechaInicio, fechaFin },
    isApiType && tipo === "compras-resumen"
  );

  const legacyActiveQuery = tipo === "bin-card" ? binCardQuery : binCardValoradoQuery;
  const legacyItems = useMemo(
    () =>
      [...(legacyActiveQuery.data?.items ?? [])]
        .filter((item) => !isSaldoInicialReferencia(item.referencia))
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [legacyActiveQuery.data?.items]
  );

  const pagedLegacyItems = useMemo(() => {
    if (dataMode === "all") return legacyItems;
    const start = (page - 1) * limit;
    return legacyItems.slice(start, start + limit);
  }, [dataMode, legacyItems, limit, page]);

  const legacyMeta = useMemo(() => {
    const total = legacyItems.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    return {
      page: safePage,
      limit,
      total,
      totalPages
    };
  }, [legacyItems.length, limit, page]);

  const valorizadoItems = useMemo(
    () =>
      [...(binCardValoradoQuery.data?.items ?? [])]
        .filter((item) => !isSaldoInicialReferencia(item.referencia))
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()),
    [binCardValoradoQuery.data?.items]
  );

  const selectedProductLabel =
    productoOptions.find((option) => option.id === productoId)?.label ?? "Todos los productos";
  const selectedDateLabel =
    dateMode === "specific"
      ? fecha || "Sin fecha"
      : dateMode === "range"
        ? `${fechaInicio || "-"} a ${fechaFin || "-"}`
        : "Sin filtro";

  const reportDefinition = useMemo(
    () =>
      isAdminType
        ? buildInventoryReportDefinition({
            type: tipo,
            items: valorizadoItems,
            productos,
            dateLabel: selectedDateLabel
          })
        : null,
    [isAdminType, tipo, valorizadoItems, productos, selectedDateLabel]
  );

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setProductoId(productoIdDraft);
    setDateMode(dateModeDraft);
    setFecha(fechaDraft);
    setFechaInicio(fechaInicioDraft);
    setFechaFin(fechaFinDraft);
    setDataMode(dataModeDraft);
  }

  function handleResetFilters() {
    setProductoIdDraft("");
    setDateModeDraft("range");
    setFechaDraft("");
    setFechaInicioDraft(defaultFechaInicio);
    setFechaFinDraft(defaultFechaFin);
    setDataModeDraft("paged");
    setProductoId("");
    setDateMode("range");
    setFecha("");
    setFechaInicio(defaultFechaInicio);
    setFechaFin(defaultFechaFin);
    setDataMode("paged");
    setPage(1);
    setLimit(50);
  }

  function handleExportExcel() {
    if (isLegacyType) {
      exportLegacyBinCardExcel({
        tab: tipo,
        items: dataMode === "all" ? legacyItems : pagedLegacyItems,
        productLabel: selectedProductLabel,
        dateFilterLabel: selectedDateLabel
      });
      return;
    }
    if (reportDefinition) exportInventoryReportExcel(reportDefinition);
  }

  function handleExportPdf() {
    try {
      if (isLegacyType) {
        exportLegacyBinCardPdf({
          tab: tipo,
          items: dataMode === "all" ? legacyItems : pagedLegacyItems,
          productLabel: selectedProductLabel,
          dateFilterLabel: selectedDateLabel
        });
        return;
      }
      if (reportDefinition) exportInventoryReportPdf(reportDefinition);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar el PDF.";
      window.alert(message);
    }
  }

  const currentQuery = isLegacyType ? legacyActiveQuery : isAdminType ? binCardValoradoQuery : tipo === "stock-actual" ? stockQuery : tipo === "vales-resumen" ? valesResumenQuery : comprasResumenQuery;
  const currentMeta = isLegacyType ? legacyMeta : currentQuery.data?.meta;

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <FileBarChart2 size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Reportes De Inventario</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Bin Card, Bin Card Valorado y formatos administrativos en una sola vista.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Tipo de reporte (rutas)
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {LEGACY_REPORTS.map((report) => (
            <button
              key={report.type}
              type="button"
              onClick={() => navigate(`/inventario/reportes/${report.type}`)}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                report.type === tipo
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/12"
                  : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] hover:border-[var(--color-primary)]"
              }`}
            >
              <p className="text-sm font-bold">{report.title}</p>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{report.description}</p>
            </button>
          ))}
          {INVENTORY_REPORTS.map((report) => (
            <button
              key={report.type}
              type="button"
              onClick={() => navigate(`/inventario/reportes/${report.type}`)}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                report.type === tipo
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/12"
                  : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] hover:border-[var(--color-primary)]"
              }`}
            >
              <p className="text-sm font-bold">{report.title}</p>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{report.description}</p>
            </button>
          ))}
          {[
            { type: "stock-actual", title: "Stock Actual", description: "Stock con reservado, disponible y valor total." },
            { type: "vales-resumen", title: "Resumen De Vales", description: "Vales filtrables por estado, solicitante y fechas." },
            { type: "compras-resumen", title: "Resumen De Compras", description: "Compras filtrables por estado, proveedor y fechas." }
          ].map((report) => (
            <button
              key={report.type}
              type="button"
              onClick={() => navigate(`/inventario/reportes/${report.type}`)}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                report.type === tipo
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/12"
                  : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] hover:border-[var(--color-primary)]"
              }`}
            >
              <p className="text-sm font-bold">{report.title}</p>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{report.description}</p>
            </button>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6"
          onSubmit={handleApplyFilters}
        >
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Producto
            </label>
            <AutocompleteSelect
              value={productoIdDraft}
              onChange={setProductoIdDraft}
              options={productoOptions}
              placeholder="Todos los productos"
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Modo de fecha
            </label>
            <select
              value={dateModeDraft}
              onChange={(event) => setDateModeDraft(event.target.value as DateMode)}
              className={inputClassName}
            >
              <option value="none">Sin filtro de fecha</option>
              <option value="specific">Fecha especifica</option>
              <option value="range">Rango de fechas</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Modo de carga
            </label>
            <select
              value={dataModeDraft}
              onChange={(event) => setDataModeDraft(event.target.value as DataMode)}
              className={inputClassName}
            >
              <option value="paged">Paginado</option>
              <option value="all">Ver todo</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Registros por pagina
            </label>
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className={inputClassName}
              disabled={dataModeDraft === "all"}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
            >
              <ListFilter size={14} />
              Aplicar
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              Limpiar
            </button>
          </div>
          {dateModeDraft === "specific" ? (
            <div className="xl:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Fecha
              </label>
              <input
                type="date"
                value={fechaDraft}
                onChange={(event) => setFechaDraft(event.target.value)}
                className={inputClassName}
              />
            </div>
          ) : null}
          {dateModeDraft === "range" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  value={fechaInicioDraft}
                  onChange={(event) => setFechaInicioDraft(event.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Fecha fin
                </label>
                <input
                  type="date"
                  value={fechaFinDraft}
                  onChange={(event) => setFechaFinDraft(event.target.value)}
                  className={inputClassName}
                />
              </div>
            </>
          ) : null}
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 mb-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
            <CalendarRange size={14} />
            {dataMode === "all" ? "Modo: ver todo" : "Modo: paginado"} | Producto: {selectedProductLabel}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={
                (isLegacyType && legacyItems.length === 0) ||
                (isAdminType && (!reportDefinition || reportDefinition.rows.length === 0)) ||
                currentQuery.isLoading
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface)] transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={
                (isLegacyType && legacyItems.length === 0) ||
                (isAdminType && (!reportDefinition || reportDefinition.rows.length === 0)) ||
                currentQuery.isLoading
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface)] transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText size={14} />
              PDF
            </button>
          </div>
        </div>

        {isLegacyType ? (
          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Fecha
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Tipo
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Producto
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Cantidad
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Stock antes
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Stock despues
                  </th>
                  {tipo === "bin-card-valorado" ? (
                    <>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        P. Unit
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Entrada Bs.
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Salida Bs.
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Saldo Bs.
                      </th>
                    </>
                  ) : null}
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Usuario
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Referencia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {legacyActiveQuery.isLoading ? (
                  <tr>
                    <td
                      colSpan={tipo === "bin-card-valorado" ? 12 : 8}
                      className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Cargando reporte...
                    </td>
                  </tr>
                ) : null}
                {!legacyActiveQuery.isLoading && (dataMode === "all" ? legacyItems : pagedLegacyItems).length === 0 ? (
                  <tr>
                    <td
                      colSpan={tipo === "bin-card-valorado" ? 12 : 8}
                      className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Sin movimientos para los filtros seleccionados.
                    </td>
                  </tr>
                ) : null}
                {(dataMode === "all" ? legacyItems : pagedLegacyItems).map((item) => (
                  // Highlight retroactive rows coming from closed-month operations.
                  <tr
                    key={item.id}
                    className={`transition hover:bg-[var(--color-surface-container-highest)] ${
                      item.esRetroactivo ? "italic bg-[var(--color-warning)]/10" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-xs">{formatInventoryDate(item.fecha)}</td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                          item.tipo === "ENTRADA"
                            ? "bg-[var(--color-success)]/18 text-[var(--color-success)]"
                            : "bg-[var(--color-error)]/18 text-[var(--color-error)]"
                        }`}
                      >
                        {item.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{item.productoNombre ?? "-"}</td>
                    <td className="px-3 py-2 text-right text-xs">{item.cantidad}</td>
                    <td className="px-3 py-2 text-right text-xs">{item.stockAntes}</td>
                    <td className="px-3 py-2 text-right text-xs">{item.stockDespues}</td>
                    {tipo === "bin-card-valorado" ? (
                      <>
                        <td className="px-3 py-2 text-right text-xs">
                          {formatLegacyCellValue((item as { precioUnit?: unknown }).precioUnit)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {formatLegacyCellValue((item as { entradaBs?: unknown }).entradaBs)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {formatLegacyCellValue((item as { salidaBs?: unknown }).salidaBs)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {formatLegacyCellValue((item as { saldoBs?: unknown }).saldoBs)}
                        </td>
                      </>
                    ) : null}
                    <td className="px-3 py-2 text-xs">{item.usuarioNombre ?? "-"}</td>
                    <td className="px-3 py-2 text-xs">
                      {item.referencia ?? "-"} {item.referenciaId ? `(${item.referenciaId})` : ""}
                      {buildRetroactivoLabel(item) ? (
                        <span className="ml-1 rounded-full bg-[var(--color-warning)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-warning)] not-italic">
                          {buildRetroactivoLabel(item)}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isApiType ? (
          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {tipo === "stock-actual" ? (
                    <>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Codigo</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Producto</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Stock</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Reservado</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Disponible</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Valor Total</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">ID</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Estado</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Principal</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Fecha</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {tipo === "stock-actual" ? (stockQuery.data?.data ?? []).map((item) => (
                  <tr key={`${item.productoId}`}>
                    <td className="px-3 py-2 text-xs">{item.codigo ?? "-"}</td><td className="px-3 py-2 text-xs">{item.nombre ?? "-"}</td><td className="px-3 py-2 text-right text-xs">{item.cantidad}</td><td className="px-3 py-2 text-right text-xs">{item.cantidadReservada}</td><td className="px-3 py-2 text-right text-xs">{item.cantidadDisponible}</td><td className="px-3 py-2 text-right text-xs">{item.valorTotal}</td>
                  </tr>
                )) : tipo === "vales-resumen" ? (valesResumenQuery.data?.data ?? []).map((item) => (
                  <tr key={item.id}><td className="px-3 py-2 text-xs">{item.id}</td><td className="px-3 py-2 text-xs">{item.estado}</td><td className="px-3 py-2 text-xs">{item.solicitante?.nombre ?? "-"}</td><td className="px-3 py-2 text-xs">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</td></tr>
                )) : (comprasResumenQuery.data?.data ?? []).map((item) => (
                  <tr key={item.id}><td className="px-3 py-2 text-xs">{item.id}</td><td className="px-3 py-2 text-xs">{item.estado}</td><td className="px-3 py-2 text-xs">{item.proveedor?.nombre ?? "-"}</td><td className="px-3 py-2 text-xs">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : reportDefinition ? (
          <>
            <div className="mb-2">
              <h2 className="text-base font-bold uppercase">{reportDefinition.title}</h2>
              <p className="text-xs text-[var(--color-on-surface-variant)]">{reportDefinition.subtitle}</p>
            </div>
            <div className="table-scroll overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    {reportDefinition.columns.map((column) => (
                      <th
                        key={column.key}
                        className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] ${
                          column.align === "right"
                            ? "text-right"
                            : column.align === "center"
                              ? "text-center"
                              : ""
                        }`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {binCardValoradoQuery.isLoading ? (
                    <tr>
                      <td
                        colSpan={reportDefinition.columns.length}
                        className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]"
                      >
                        Cargando reporte...
                      </td>
                    </tr>
                  ) : null}
                  {!binCardValoradoQuery.isLoading && reportDefinition.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={reportDefinition.columns.length}
                        className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]"
                      >
                        Sin datos para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : null}
                  {reportDefinition.rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`transition ${
                        row.type === "group"
                          ? "bg-[var(--color-primary)]/12 font-bold"
                          : row.type === "subtotal"
                            ? "bg-[var(--color-warning)]/10 font-semibold"
                            : row.type === "total"
                              ? "bg-[var(--color-success)]/12 font-bold"
                              : "hover:bg-[var(--color-surface-container-highest)]"
                      }`}
                    >
                      {reportDefinition.columns.map((column) => {
                        const value = row.values[column.key];
                        const showValue =
                          value === undefined || value === ""
                            ? ""
                            : typeof value === "number"
                              ? value.toLocaleString("es-BO", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })
                              : value;
                        return (
                          <td
                            key={`${row.id}-${column.key}`}
                            className={`px-3 py-2 text-xs ${
                              column.align === "right"
                                ? "text-right"
                                : column.align === "center"
                                  ? "text-center"
                                  : ""
                            }`}
                          >
                            {showValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-on-surface-variant)]">
              {reportDefinition.summary.map((item) => (
                <span
                  key={item.label}
                  className="rounded-full bg-[var(--color-surface-container-high)] px-3 py-1.5"
                >
                  {item.label}:{" "}
                  <strong className="text-[var(--color-on-surface)]">
                    {typeof item.value === "number"
                      ? item.value.toLocaleString("es-BO", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })
                      : item.value}
                  </strong>
                </span>
              ))}
            </div>
          </>
        ) : null}

        {dataMode === "paged" && currentMeta ? (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-[var(--color-on-surface-variant)]">
              Pagina {currentMeta.page} de {currentMeta.totalPages} | Total: {currentMeta.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(currentMeta.totalPages, current + 1))}
                disabled={page >= currentMeta.totalPages}
                className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </article>
    </section>
  );
}
