import { useKardexValoradoQuery } from "@/features/kardex-valorado/hooks/useKardexValoradoQuery";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Filter,
  History,
  Info,
  Table2
} from "lucide-react";

const headers = [
  "Fecha",
  "Movimiento",
  "Documento Ref",
  "Cantidad",
  "Saldo",
  "Costo Unitario",
  "Costo Total"
] as const;

export function KardexValoradoPage() {
  const { data, isLoading, isError, refetch, isFetching } = useKardexValoradoQuery();

  if (isLoading) {
    return (
      <section className="rounded-xl bg-[var(--color-surface-container-low)] p-6 text-[var(--color-on-surface)]">
        <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando reporte Kardex...</p>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="rounded-xl border border-[var(--color-error)]/55 bg-[var(--color-surface-container-low)] p-6 text-[var(--color-on-surface)]">
        <p className="text-sm text-[var(--color-error)]">No se pudo cargar el reporte Kardex.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 rounded-lg bg-[var(--color-surface-container-high)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)]"
        >
          Reintentar
        </button>
      </section>
    );
  }

  return (
    <section className="font-body text-[var(--color-on-surface)] antialiased">
      <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            <span>{data.breadcrumbs[0]}</span>
            <ChevronRight size={14} />
            <span className="text-[var(--color-primary)]">{data.breadcrumbs[1]}</span>
          </nav>
          <h2 className="font-headline text-[62px] text-4xl font-extrabold tracking-tight text-[var(--color-on-surface)]">
            {data.title}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--color-on-surface-variant)]">{data.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-container-high)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-surface)] transition hover:bg-[var(--color-surface-container-highest)]">
            <FileText size={18} />
            Descargar PDF
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90">
            <Table2 size={18} />
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-end gap-6 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="min-w-[200px] flex-1">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Rango de Fechas
          </label>
          <div className="relative">
            <CalendarDays
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
            />
            <input
              className="w-full rounded-lg border-none bg-[var(--color-surface-container-highest)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-on-surface)] focus:ring-1 focus:ring-[var(--color-primary)]"
              type="text"
              defaultValue={data.filters.dateRange}
            />
          </div>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Centro de Costo
          </label>
          <select className="w-full rounded-lg border-none bg-[var(--color-surface-container-highest)] px-4 py-2.5 text-sm text-[var(--color-on-surface)] focus:ring-1 focus:ring-[var(--color-primary)]">
            {data.filters.costCenters.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Familia de Productos
          </label>
          <select className="w-full appearance-none rounded-lg border-none bg-[var(--color-surface-container-highest)] px-4 py-2.5 text-sm text-[var(--color-on-surface)] focus:ring-1 focus:ring-[var(--color-primary)]">
            {data.filters.productFamilies.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-container-high)] px-6 py-2.5 text-sm font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-surface-container-highest)]">
          <Filter size={16} />
          Aplicar Filtros
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Saldo Inicial
          </p>
          <p className="font-headline text-3xl font-extrabold text-[var(--color-on-surface)]">
            {data.summary.initialBalance.value}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-tighter text-[var(--color-on-surface-variant)]">
            {data.summary.initialBalance.label}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border-soft)] border-l-4 border-l-[var(--color-primary)] bg-[var(--color-surface-container-high)] p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Total Entradas
          </p>
          <p className="font-headline text-3xl font-extrabold text-[var(--color-primary)]">
            {data.summary.totalEntries.value}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-tighter text-[var(--color-primary)]">
            {data.summary.totalEntries.label}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border-soft)] border-l-4 border-l-[var(--color-tertiary)] bg-[var(--color-surface-container-high)] p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Total Salidas
          </p>
          <p className="font-headline text-3xl font-extrabold text-[var(--color-tertiary)]">
            {data.summary.totalOutputs.value}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-tighter text-[var(--color-tertiary)]">
            {data.summary.totalOutputs.label}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] p-5 shadow-xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
            Valor Total Final
          </p>
          <p className="font-headline text-3xl font-extrabold text-[var(--color-on-surface)]">
            {data.summary.finalTotalValue.value}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-tighter text-[var(--color-on-surface-variant)]">
            {data.summary.finalTotalValue.label}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[var(--color-surface-container-high)]">
                {headers.map((header) => (
                  <th
                    key={header}
                    className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] ${
                      header !== "Fecha" && header !== "Movimiento" && header !== "Documento Ref"
                        ? "text-right"
                        : ""
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {data.rows.map((row) => (
                <tr
                  key={`${row.date}-${row.documentRef}`}
                  className="group transition-colors hover:bg-[var(--color-surface-container-highest)]"
                >
                  <td className="px-6 py-4 font-mono text-xs text-[var(--color-on-surface)]">{row.date}</td>
                  <td className="px-6 py-4">
                    <span
                      className="flex items-center gap-2 text-xs font-semibold"
                      style={{
                        color:
                          row.movement === "SALIDA"
                            ? "var(--color-tertiary)"
                            : "var(--color-primary)"
                      }}
                    >
                      {row.movement === "SALIDA" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      {row.movement}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-[var(--color-on-surface)]">{row.documentRef}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-[var(--color-on-surface)]">
                    {row.quantity}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-[var(--color-on-surface-variant)]">
                    {row.balance}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-[var(--color-on-surface)]">
                    {row.unitCost}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs font-bold text-[var(--color-on-surface)]">
                    {row.totalCost}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]/65 px-6 py-4">
          <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">{data.pagination.label}</span>
          <div className="flex items-center gap-2">
            <button className="rounded bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] transition-colors hover:text-[var(--color-on-surface)]">
              <ChevronsLeft size={18} />
            </button>
            <button className="rounded bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] transition-colors hover:text-[var(--color-on-surface)]">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1 px-2">
              {data.pagination.pages.map((page) => (
                <span
                  key={page}
                  className={`flex h-8 w-8 items-center justify-center rounded text-xs font-bold ${
                    page === data.pagination.currentPage
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "cursor-pointer text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container-highest)]"
                  }`}
                >
                  {page}
                </span>
              ))}
            </div>
            <button className="rounded bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] transition-colors hover:text-[var(--color-on-surface)]">
              <ChevronRight size={18} />
            </button>
            <button className="rounded bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] transition-colors hover:text-[var(--color-on-surface)]">
              <ChevronsRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex items-start gap-4 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container)] p-4">
          <div className="rounded-lg bg-[var(--color-primary)]/12 p-3">
            <Info size={18} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h4 className="mb-1 text-sm font-bold text-[var(--color-on-surface)]">Método de Valorización</h4>
            <p className="text-xs leading-relaxed text-[var(--color-on-surface-variant)]">
              {data.notes.valuationMethod}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container)] p-4">
          <div className="rounded-lg bg-[var(--color-tertiary)]/12 p-3">
            <History size={18} className="text-[var(--color-tertiary)]" />
          </div>
          <div>
            <h4 className="mb-1 text-sm font-bold text-[var(--color-on-surface)]">Última Sincronización</h4>
            <p className="text-xs leading-relaxed text-[var(--color-on-surface-variant)]">
              {data.notes.lastSync}
            </p>
          </div>
        </div>
      </div>

      {isFetching ? (
        <p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">Actualizando datos...</p>
      ) : null}
    </section>
  );
}
