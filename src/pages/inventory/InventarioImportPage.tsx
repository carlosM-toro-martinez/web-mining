import { FormEvent, useMemo, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useImportCatalogoMutation,
  useImportSaldoMensualMutation,
  useImportStockInicialMutation,
  useSaldoMensualQuery
} from "@/features/inventario-import/hooks/useInventarioImport";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

function normalizeError(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function InventarioImportPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const canImport = user?.role === "ADMIN" || user?.role === "ALMACENERO";

  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [catalogAnio, setCatalogAnio] = useState("");
  const [catalogMes, setCatalogMes] = useState("");
  const [stockJson, setStockJson] = useState(
    '[\n  { "productoCodigo": "01-01-0001", "cantidad": 2200, "precioUnit": 8.5 }\n]'
  );
  const [saldoAnio, setSaldoAnio] = useState(String(new Date().getFullYear()));
  const [saldoMes, setSaldoMes] = useState(String(new Date().getMonth() + 1));
  const [saldoJson, setSaldoJson] = useState(
    '[\n  { "productoCodigo": "01-01-0001", "saldoInicial": 2000, "ingresoQty": 1000, "salidaQty": 800, "saldoFinal": 2200, "precioUnit": 8.5 }\n]'
  );
  const [consultaAnio, setConsultaAnio] = useState(String(new Date().getFullYear()));
  const [consultaMes, setConsultaMes] = useState(String(new Date().getMonth() + 1));
  const [consultaEnabled, setConsultaEnabled] = useState(false);

  const importCatalogoMutation = useImportCatalogoMutation();
  const importStockMutation = useImportStockInicialMutation();
  const importSaldoMutation = useImportSaldoMensualMutation();
  const saldoQuery = useSaldoMensualQuery(
    { anio: Number(consultaAnio), mes: Number(consultaMes) },
    consultaEnabled
  );

  const consultaRows = useMemo(() => saldoQuery.data?.data ?? [], [saldoQuery.data?.data]);

  if (!canImport && user?.role) {
    return (
      <section className="space-y-6 text-[var(--color-on-surface)]">
        <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
          <SubrouteBackButton />
          <h1 className="mt-4 font-headline text-3xl font-extrabold">Importación de inventario</h1>
          <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
            No tienes permisos para importar. Rol actual: {user.role}.
          </p>
        </header>
      </section>
    );
  }

  function handleImportCatalogo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catalogFile) {
      showError("Selecciona un archivo Excel primero.");
      return;
    }
    const anio = catalogAnio.trim() ? Number(catalogAnio) : undefined;
    const mes = catalogMes.trim() ? Number(catalogMes) : undefined;
    if ((anio && !mes) || (!anio && mes)) {
      showError("Si usas modo histórico, debes completar año y mes.");
      return;
    }
    importCatalogoMutation.mutate({ file: catalogFile, anio, mes }, {
      onSuccess: () => showSuccess("Catálogo importado correctamente."),
      onError: (error) => showError(normalizeError(error, "No se pudo importar el catálogo."))
    });
  }

  function handleImportStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const items = JSON.parse(stockJson);
      importStockMutation.mutate(
        { items },
        {
          onSuccess: () => showSuccess("Stock inicial importado correctamente."),
          onError: (error) =>
            showError(normalizeError(error, "No se pudo importar el stock inicial."))
        }
      );
    } catch {
      showError("JSON inválido en stock inicial.");
    }
  }

  function handleImportSaldo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const items = JSON.parse(saldoJson);
      importSaldoMutation.mutate(
        { anio: Number(saldoAnio), mes: Number(saldoMes), items },
        {
          onSuccess: () => showSuccess("Saldo mensual importado correctamente."),
          onError: (error) =>
            showError(normalizeError(error, "No se pudo importar el saldo mensual."))
        }
      );
    } catch {
      showError("JSON inválido en saldo mensual.");
    }
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <UploadCloud size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Importación de inventario</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Catálogo, stock inicial y saldos mensuales para reportes históricos.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-3 text-lg font-bold">1) Importar catálogo Excel</h2>
        <form className="space-y-3" onSubmit={handleImportCatalogo}>
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={(event) => setCatalogFile(event.target.files?.[0] ?? null)}
            className={inputClassName}
          />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              value={catalogAnio}
              onChange={(event) => setCatalogAnio(event.target.value)}
              className={inputClassName}
              placeholder="Año (opcional, ej. 2025)"
            />
            <input
              value={catalogMes}
              onChange={(event) => setCatalogMes(event.target.value)}
              className={inputClassName}
              placeholder="Mes (opcional, 1-12)"
            />
          </div>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            Si completas año y mes, se ejecuta el modo completo: catálogo + stock + saldo mensual histórico.
          </p>
          <button
            type="submit"
            disabled={importCatalogoMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            {importCatalogoMutation.isPending ? "Importando..." : "Importar catálogo"}
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-3 text-lg font-bold">2) Importar stock inicial</h2>
        <form className="space-y-3" onSubmit={handleImportStock}>
          <textarea
            value={stockJson}
            onChange={(event) => setStockJson(event.target.value)}
            className={`${inputClassName} min-h-[150px] font-mono text-xs`}
          />
          <button
            type="submit"
            disabled={importStockMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            {importStockMutation.isPending ? "Importando..." : "Importar stock inicial"}
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-3 text-lg font-bold">3) Importar saldo mensual</h2>
        <form className="space-y-3" onSubmit={handleImportSaldo}>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <input value={saldoAnio} onChange={(e) => setSaldoAnio(e.target.value)} className={inputClassName} placeholder="Año" />
            <input value={saldoMes} onChange={(e) => setSaldoMes(e.target.value)} className={inputClassName} placeholder="Mes (1-12)" />
          </div>
          <textarea
            value={saldoJson}
            onChange={(event) => setSaldoJson(event.target.value)}
            className={`${inputClassName} min-h-[170px] font-mono text-xs`}
          />
          <button
            type="submit"
            disabled={importSaldoMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            {importSaldoMutation.isPending ? "Importando..." : "Importar saldo mensual"}
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <FileSpreadsheet size={16} className="text-[var(--color-primary)]" />
          4) Consultar saldo mensual
        </h2>
        <form
          className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setConsultaEnabled(true);
            saldoQuery.refetch();
          }}
        >
          <input value={consultaAnio} onChange={(e) => setConsultaAnio(e.target.value)} className={inputClassName} placeholder="Año" />
          <input value={consultaMes} onChange={(e) => setConsultaMes(e.target.value)} className={inputClassName} placeholder="Mes (1-12)" />
          <button type="submit" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]">
            Consultar
          </button>
        </form>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Código</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Producto</th>
                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Saldo Final</th>
                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Total Bs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {consultaRows.map((row) => (
                <tr key={`${row.productoCodigo}-${row.anio}-${row.mes}`}>
                  <td className="px-3 py-2 text-xs">{row.productoCodigo}</td>
                  <td className="px-3 py-2 text-xs">{row.productoNombre ?? "-"}</td>
                  <td className="px-3 py-2 text-right text-xs">{row.saldoFinal}</td>
                  <td className="px-3 py-2 text-right text-xs">{row.totalBs}</td>
                </tr>
              ))}
              {consultaEnabled && !saldoQuery.isLoading && consultaRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
                    Sin registros para ese mes.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
