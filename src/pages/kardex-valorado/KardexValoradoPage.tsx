import { useKardexValoradoQuery } from "@/features/kardex-valorado/hooks/useKardexValoradoQuery";

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
      <section className="rounded-xl bg-[#0b1324] p-6 text-[#dde5ff]">
        <p className="text-sm text-[#9aaad6]">Cargando reporte Kardex...</p>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="rounded-xl border border-[#7f2927] bg-[#0b1324] p-6 text-[#dde5ff]">
        <p className="text-sm text-[#ff9993]">No se pudo cargar el reporte Kardex.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 rounded-lg bg-[#152a56] px-4 py-2 text-sm font-semibold text-[#9ecaff]"
        >
          Reintentar
        </button>
      </section>
    );
  }

  return (
    <section className="font-body text-[#dde5ff] antialiased">
      <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#6f7fa3]">
            <span>{data.breadcrumbs[0]}</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-[#82bdff]">{data.breadcrumbs[1]}</span>
          </nav>
          <h2 className="font-headline text-[62px] text-4xl font-extrabold tracking-tight text-[#dde5ff]">
            {data.title}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[#9aaad6]">{data.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-[#111f3c] px-5 py-2.5 text-sm font-semibold text-[#dde5ff] transition hover:bg-[#152a56]">
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            Descargar PDF
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-[#9ecaff] px-5 py-2.5 text-sm font-semibold text-[#004272] transition hover:opacity-90">
            <span className="material-symbols-outlined text-lg">table_view</span>
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-end gap-6 rounded-xl bg-[#0b1324] p-6">
        <div className="min-w-[200px] flex-1">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#6f7fa3]">
            Rango de Fechas
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#7686ab]">
              calendar_today
            </span>
            <input
              className="w-full rounded-lg border-none bg-[#132549] py-2.5 pl-10 pr-4 text-sm text-[#dde5ff] focus:ring-1 focus:ring-[#9ecaff]"
              type="text"
              defaultValue={data.filters.dateRange}
            />
          </div>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#6f7fa3]">
            Centro de Costo
          </label>
          <select className="w-full rounded-lg border-none bg-[#132549] px-4 py-2.5 text-sm text-[#dde5ff] focus:ring-1 focus:ring-[#9ecaff]">
            {data.filters.costCenters.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#6f7fa3]">
            Familia de Productos
          </label>
          <select className="w-full appearance-none rounded-lg border-none bg-[#132549] px-4 py-2.5 text-sm text-[#dde5ff] focus:ring-1 focus:ring-[#9ecaff]">
            {data.filters.productFamilies.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#152a56] px-6 py-2.5 text-sm font-bold text-[#9ecaff] transition hover:bg-[#00497d] hover:text-[#b1d3ff]">
          <span className="material-symbols-outlined">filter_alt</span>
          Aplicar Filtros
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-[#111f3c] p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#7382a5]">Saldo Inicial</p>
          <p className="font-headline text-3xl font-extrabold text-[#dde5ff]">
            {data.summary.initialBalance.value}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-tighter text-[#7b89a9]">
            {data.summary.initialBalance.label}
          </p>
        </div>
        <div className="rounded-xl border-l-4 border-[#9ecaff] bg-[#111f3c] p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#7382a5]">Total Entradas</p>
          <p className="font-headline text-3xl font-extrabold text-[#82bdff]">
            {data.summary.totalEntries.value}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-tighter text-[#9ecaff]">
            {data.summary.totalEntries.label}
          </p>
        </div>
        <div className="rounded-xl border-l-4 bg-[#111f3c] p-5" style={{ borderLeftColor: "#ffb14b" }}>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#7382a5]">Total Salidas</p>
          <p className="font-headline text-3xl font-extrabold" style={{ color: "#ffb14b" }}>
            {data.summary.totalOutputs.value}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-tighter" style={{ color: "#ffb14b" }}>
            {data.summary.totalOutputs.label}
          </p>
        </div>
        <div className="rounded-xl bg-[#132549] p-5 shadow-xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#9ecaff]">Valor Total Final</p>
          <p className="font-headline text-3xl font-extrabold text-white">
            {data.summary.finalTotalValue.value}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-tighter text-[#9aaad6]">
            {data.summary.finalTotalValue.label}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-[#0b1324] shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#111f3c]">
                {headers.map((header) => (
                  <th
                    key={header}
                    className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#7382a5] ${
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
            <tbody className="divide-y divide-white/5">
              {data.rows.map((row) => (
                <tr key={`${row.date}-${row.documentRef}`} className="group transition-colors hover:bg-[#132549]">
                  <td className="px-6 py-4 font-mono text-xs text-[#c7d0ea]">{row.date}</td>
                  <td className="px-6 py-4">
                    <span
                      className="flex items-center gap-2 text-xs font-semibold"
                      style={{ color: row.movement === "SALIDA" ? "#ffb14b" : "#9ecaff" }}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {row.movement === "SALIDA" ? "arrow_upward" : "arrow_downward"}
                      </span>
                      {row.movement}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-[#dde5ff]">{row.documentRef}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-[#dde5ff]">{row.quantity}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-[#9aaad6]">{row.balance}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-[#c7d0ea]">{row.unitCost}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs font-bold text-white">
                    {row.totalCost}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 bg-[#111f3c]/50 px-6 py-4">
          <span className="text-xs font-medium text-[#8c9ab9]">{data.pagination.label}</span>
          <div className="flex items-center gap-2">
            <button className="rounded bg-[#132549] p-1.5 text-[#8ea0c7] transition-colors hover:text-white">
              <span className="material-symbols-outlined text-lg">first_page</span>
            </button>
            <button className="rounded bg-[#132549] p-1.5 text-[#8ea0c7] transition-colors hover:text-white">
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <div className="flex items-center gap-1 px-2">
              {data.pagination.pages.map((page) => (
                <span
                  key={page}
                  className={`flex h-8 w-8 items-center justify-center rounded text-xs font-bold ${
                    page === data.pagination.currentPage
                      ? "bg-[#9ecaff] text-[#004272]"
                      : "cursor-pointer text-[#9aaad6] transition-colors hover:bg-[#132549]"
                  }`}
                >
                  {page}
                </span>
              ))}
            </div>
            <button className="rounded bg-[#132549] p-1.5 text-[#8ea0c7] transition-colors hover:text-white">
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
            <button className="rounded bg-[#132549] p-1.5 text-[#8ea0c7] transition-colors hover:text-white">
              <span className="material-symbols-outlined text-lg">last_page</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex items-start gap-4 rounded-lg border border-white/5 bg-[#0e1930] p-4">
          <div className="rounded-lg bg-[#9ecaff]/10 p-3">
            <span className="material-symbols-outlined text-[#9ecaff]">info</span>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-bold text-[#dde5ff]">Método de Valorización</h4>
            <p className="text-xs leading-relaxed text-[#9aaad6]">{data.notes.valuationMethod}</p>
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-lg border border-white/5 bg-[#0e1930] p-4">
          <div className="rounded-lg bg-[#ffb14b]/10 p-3">
            <span className="material-symbols-outlined text-[#ffb14b]">history</span>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-bold text-[#dde5ff]">Última Sincronización</h4>
            <p className="text-xs leading-relaxed text-[#9aaad6]">{data.notes.lastSync}</p>
          </div>
        </div>
      </div>

      {isFetching ? <p className="mt-3 text-xs text-[#8c9ab9]">Actualizando datos...</p> : null}
    </section>
  );
}
