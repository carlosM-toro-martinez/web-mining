import { FormEvent, useMemo, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useDeleteSaldoMensualByIdMutation,
  useImportCatalogoMutation,
  useImportSaldoMensualMutation,
  useImportStockInicialMutation,
  useReiniciarStockMutation,
  useSaldoMensualByIdQuery,
  useSaldoMensualQuery,
  useSincronizarStockMutation,
  useUpdateSaldoMensualByIdMutation,
  useUpsertSaldoMensualItemMutation
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
  const [syncAnio, setSyncAnio] = useState("");
  const [syncMes, setSyncMes] = useState("");
  const [reiniciarConfirmacion, setReiniciarConfirmacion] = useState("");
  const [saldoItemId, setSaldoItemId] = useState("");
  const [saldoItemByIdEnabled, setSaldoItemByIdEnabled] = useState(false);
  const [upsertItemJson, setUpsertItemJson] = useState(
    '{\n  "productoCodigo": "01-01-0001",\n  "anio": 2025,\n  "mes": 9,\n  "saldoInicial": 2000,\n  "ingresoQty": 1000,\n  "salidaQty": 800,\n  "saldoFinal": 2200,\n  "precioUnit": 8.5\n}'
  );
  const [patchItemJson, setPatchItemJson] = useState(
    '{\n  "saldoFinal": 2300,\n  "precioUnit": 8.7\n}'
  );
  const [stockFormCodigo, setStockFormCodigo] = useState("");
  const [stockFormCantidad, setStockFormCantidad] = useState("");
  const [stockFormPrecio, setStockFormPrecio] = useState("");
  const [stockFormItems, setStockFormItems] = useState<
    Array<{ productoCodigo: string; cantidad: number; precioUnit: number }>
  >([]);
  const [saldoFormProductoCodigo, setSaldoFormProductoCodigo] = useState("");
  const [saldoFormAnio, setSaldoFormAnio] = useState(String(new Date().getFullYear()));
  const [saldoFormMes, setSaldoFormMes] = useState(String(new Date().getMonth() + 1));
  const [saldoFormSaldoInicial, setSaldoFormSaldoInicial] = useState("0");
  const [saldoFormIngresoQty, setSaldoFormIngresoQty] = useState("0");
  const [saldoFormSalidaQty, setSaldoFormSalidaQty] = useState("0");
  const [saldoFormSaldoFinal, setSaldoFormSaldoFinal] = useState("0");
  const [saldoFormPrecioUnit, setSaldoFormPrecioUnit] = useState("0");

  const importCatalogoMutation = useImportCatalogoMutation();
  const importStockMutation = useImportStockInicialMutation();
  const importSaldoMutation = useImportSaldoMensualMutation();
  const reiniciarStockMutation = useReiniciarStockMutation();
  const sincronizarStockMutation = useSincronizarStockMutation();
  const upsertSaldoItemMutation = useUpsertSaldoMensualItemMutation();
  const updateSaldoItemMutation = useUpdateSaldoMensualByIdMutation();
  const deleteSaldoItemMutation = useDeleteSaldoMensualByIdMutation();
  const saldoQuery = useSaldoMensualQuery(
    { anio: Number(consultaAnio), mes: Number(consultaMes) },
    consultaEnabled
  );
  const saldoItemByIdQuery = useSaldoMensualByIdQuery(saldoItemId.trim(), saldoItemByIdEnabled);

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

  function handleReiniciarStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reiniciarConfirmacion.trim().toUpperCase() !== "REINICIAR") {
      showError('Debes escribir exactamente "REINICIAR".');
      return;
    }
    reiniciarStockMutation.mutate(
      { confirmacion: "REINICIAR" },
      {
        onSuccess: () => {
          showSuccess("Stock reiniciado correctamente.");
          setReiniciarConfirmacion("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo reiniciar el stock."))
      }
    );
  }

  function handleSincronizarStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const anio = syncAnio.trim() ? Number(syncAnio) : undefined;
    const mes = syncMes.trim() ? Number(syncMes) : undefined;
    if ((anio && !mes) || (!anio && mes)) {
      showError("Si defines periodo, debes completar año y mes.");
      return;
    }
    sincronizarStockMutation.mutate(
      anio && mes ? { anio, mes } : undefined,
      {
        onSuccess: () => showSuccess("Sincronización de stock completada."),
        onError: (error) => showError(normalizeError(error, "No se pudo sincronizar el stock."))
      }
    );
  }

  function handleUpsertSaldoItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const payload = JSON.parse(upsertItemJson);
      upsertSaldoItemMutation.mutate(payload, {
        onSuccess: (response) =>
          showSuccess(`Saldo mensual ${response.data.accion ?? "procesado"} correctamente.`),
        onError: (error) => showError(normalizeError(error, "No se pudo guardar el ítem."))
      });
    } catch {
      showError("JSON inválido para saldo mensual/item.");
    }
  }

  function handlePatchSaldoItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = saldoItemId.trim();
    if (!id) {
      showError("Debes indicar un ID para actualizar.");
      return;
    }
    try {
      const payload = JSON.parse(patchItemJson);
      updateSaldoItemMutation.mutate(
        { id, payload },
        {
          onSuccess: () => showSuccess("Registro actualizado correctamente."),
          onError: (error) => showError(normalizeError(error, "No se pudo actualizar el registro."))
        }
      );
    } catch {
      showError("JSON inválido para PATCH de saldo mensual.");
    }
  }

  function handleDeleteSaldoItem() {
    const id = saldoItemId.trim();
    if (!id) {
      showError("Debes indicar un ID para eliminar.");
      return;
    }
    deleteSaldoItemMutation.mutate(id, {
      onSuccess: () => showSuccess("Registro eliminado correctamente."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar el registro."))
    });
  }

  function handleAddStockFormItem() {
    const productoCodigo = stockFormCodigo.trim().toUpperCase();
    const cantidad = Number(stockFormCantidad);
    const precioUnit = Number(stockFormPrecio);
    if (!productoCodigo) {
      showError("Debes ingresar código de producto.");
      return;
    }
    if (!Number.isFinite(cantidad) || cantidad < 0 || !Number.isFinite(precioUnit) || precioUnit < 0) {
      showError("Cantidad y precio unitario deben ser números válidos.");
      return;
    }
    setStockFormItems((current) => [...current, { productoCodigo, cantidad, precioUnit }]);
    setStockFormCodigo("");
    setStockFormCantidad("");
    setStockFormPrecio("");
  }

  function handleSubmitStockFormItems(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stockFormItems.length === 0) {
      showError("Agrega al menos un ítem al lote.");
      return;
    }
    importStockMutation.mutate(
      { items: stockFormItems },
      {
        onSuccess: () => {
          showSuccess("Stock inicial importado correctamente (modo formulario).");
          setStockFormItems([]);
        },
        onError: (error) =>
          showError(normalizeError(error, "No se pudo importar el stock inicial."))
      }
    );
  }

  function handleSubmitSaldoForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      productoCodigo: saldoFormProductoCodigo.trim().toUpperCase(),
      anio: Number(saldoFormAnio),
      mes: Number(saldoFormMes),
      saldoInicial: Number(saldoFormSaldoInicial),
      ingresoQty: Number(saldoFormIngresoQty),
      salidaQty: Number(saldoFormSalidaQty),
      saldoFinal: Number(saldoFormSaldoFinal),
      precioUnit: Number(saldoFormPrecioUnit)
    };
    if (!payload.productoCodigo) {
      showError("Debes ingresar código de producto.");
      return;
    }
    upsertSaldoItemMutation.mutate(payload, {
      onSuccess: (response) => showSuccess(`Registro ${response.data.accion ?? "procesado"} correctamente.`),
      onError: (error) => showError(normalizeError(error, "No se pudo guardar el saldo mensual."))
    });
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
        <h2 className="mb-3 text-lg font-bold">4) Reiniciar stock (ADMIN)</h2>
        <form className="space-y-3" onSubmit={handleReiniciarStock}>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            Acción destructiva. Escribe <strong>REINICIAR</strong> para confirmar.
          </p>
          <input
            value={reiniciarConfirmacion}
            onChange={(event) => setReiniciarConfirmacion(event.target.value)}
            className={`${inputClassName} font-mono uppercase`}
            placeholder="REINICIAR"
          />
          <button
            type="submit"
            disabled={reiniciarStockMutation.isPending}
            className="rounded-lg border border-[var(--color-error)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10"
          >
            {reiniciarStockMutation.isPending ? "Reiniciando..." : "Reiniciar stock"}
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-3 text-lg font-bold">5) Sincronizar stock desde saldo mensual</h2>
        <form className="space-y-3" onSubmit={handleSincronizarStock}>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              value={syncAnio}
              onChange={(event) => setSyncAnio(event.target.value)}
              className={inputClassName}
              placeholder="Año (opcional)"
            />
            <input
              value={syncMes}
              onChange={(event) => setSyncMes(event.target.value)}
              className={inputClassName}
              placeholder="Mes (opcional, 1-12)"
            />
          </div>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            Si dejas vacío, se usará el período más reciente por producto.
          </p>
          <button
            type="submit"
            disabled={sincronizarStockMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            {sincronizarStockMutation.isPending ? "Sincronizando..." : "Sincronizar stock"}
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <FileSpreadsheet size={16} className="text-[var(--color-primary)]" />
          6) Consultar saldo mensual por período
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

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-3 text-lg font-bold">7) CRUD de saldo mensual por registro</h2>
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
          <input
            value={saldoItemId}
            onChange={(event) => setSaldoItemId(event.target.value)}
            className={inputClassName}
            placeholder="ID de saldo mensual"
          />
          <button
            type="button"
            onClick={() => {
              if (!saldoItemId.trim()) {
                showError("Debes ingresar un ID.");
                return;
              }
              setSaldoItemByIdEnabled(true);
              saldoItemByIdQuery.refetch();
            }}
            className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
          >
            Buscar por ID
          </button>
        </div>

        <form className="mb-4 space-y-2" onSubmit={handleUpsertSaldoItem}>
          <label className="block text-sm font-semibold">Upsert (`POST /saldo-mensual/item`)</label>
          <textarea
            value={upsertItemJson}
            onChange={(event) => setUpsertItemJson(event.target.value)}
            className={`${inputClassName} min-h-[170px] font-mono text-xs`}
          />
          <button
            type="submit"
            disabled={upsertSaldoItemMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            {upsertSaldoItemMutation.isPending ? "Guardando..." : "Guardar/Actualizar ítem"}
          </button>
        </form>

        <form className="mb-4 space-y-2" onSubmit={handlePatchSaldoItem}>
          <label className="block text-sm font-semibold">Patch por ID (`PATCH /saldo-mensual/:id`)</label>
          <textarea
            value={patchItemJson}
            onChange={(event) => setPatchItemJson(event.target.value)}
            className={`${inputClassName} min-h-[120px] font-mono text-xs`}
          />
          <button
            type="submit"
            disabled={updateSaldoItemMutation.isPending}
            className="rounded-lg border border-[var(--color-primary)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
          >
            {updateSaldoItemMutation.isPending ? "Actualizando..." : "Actualizar por ID"}
          </button>
        </form>

        <div className="mb-4">
          <button
            type="button"
            onClick={handleDeleteSaldoItem}
            disabled={deleteSaldoItemMutation.isPending}
            className="rounded-lg border border-[var(--color-error)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10"
          >
            {deleteSaldoItemMutation.isPending ? "Eliminando..." : "Eliminar por ID"}
          </button>
        </div>

        {saldoItemByIdEnabled && saldoItemByIdQuery.data ? (
          <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3 text-xs">
            <p><strong>ID:</strong> {String(saldoItemByIdQuery.data.data.id)}</p>
            <p><strong>Producto:</strong> {saldoItemByIdQuery.data.data.productoCodigo} - {saldoItemByIdQuery.data.data.productoNombre ?? "-"}</p>
            <p><strong>Periodo:</strong> {saldoItemByIdQuery.data.data.anio}/{saldoItemByIdQuery.data.data.mes}</p>
            <p><strong>Saldo final:</strong> {saldoItemByIdQuery.data.data.saldoFinal}</p>
            <p><strong>Total Bs:</strong> {saldoItemByIdQuery.data.data.totalBs}</p>
          </div>
        ) : null}
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-3 text-lg font-bold">8) Formularios rápidos (nuevo, sin JSON)</h2>

        <form className="mb-5 space-y-3 rounded-lg border border-[var(--color-border-soft)] p-4" onSubmit={handleSubmitStockFormItems}>
          <h3 className="text-sm font-bold">Stock inicial por formulario</h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <input value={stockFormCodigo} onChange={(e) => setStockFormCodigo(e.target.value)} className={inputClassName} placeholder="Código producto" />
            <input value={stockFormCantidad} onChange={(e) => setStockFormCantidad(e.target.value)} className={inputClassName} placeholder="Cantidad" />
            <input value={stockFormPrecio} onChange={(e) => setStockFormPrecio(e.target.value)} className={inputClassName} placeholder="Precio unitario" />
            <button type="button" onClick={handleAddStockFormItem} className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]">
              Agregar ítem
            </button>
          </div>
          <div className="max-h-36 overflow-y-auto rounded border border-[var(--color-border-soft)] p-2 text-xs">
            {stockFormItems.length === 0 ? "Sin ítems cargados." : stockFormItems.map((item, index) => (
              <div key={`${item.productoCodigo}-${index}`} className="flex justify-between py-1">
                <span>{item.productoCodigo}</span>
                <span>Cant: {item.cantidad} | P.U: {item.precioUnit}</span>
              </div>
            ))}
          </div>
          <button type="submit" disabled={importStockMutation.isPending} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]">
            {importStockMutation.isPending ? "Importando..." : "Enviar lote de stock inicial"}
          </button>
        </form>

        <form className="space-y-3 rounded-lg border border-[var(--color-border-soft)] p-4" onSubmit={handleSubmitSaldoForm}>
          <h3 className="text-sm font-bold">Saldo mensual (1 ítem) por formulario</h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input value={saldoFormProductoCodigo} onChange={(e) => setSaldoFormProductoCodigo(e.target.value)} className={inputClassName} placeholder="Código producto" />
            <input value={saldoFormAnio} onChange={(e) => setSaldoFormAnio(e.target.value)} className={inputClassName} placeholder="Año" />
            <input value={saldoFormMes} onChange={(e) => setSaldoFormMes(e.target.value)} className={inputClassName} placeholder="Mes" />
            <input value={saldoFormSaldoInicial} onChange={(e) => setSaldoFormSaldoInicial(e.target.value)} className={inputClassName} placeholder="Saldo inicial" />
            <input value={saldoFormIngresoQty} onChange={(e) => setSaldoFormIngresoQty(e.target.value)} className={inputClassName} placeholder="Ingreso qty" />
            <input value={saldoFormSalidaQty} onChange={(e) => setSaldoFormSalidaQty(e.target.value)} className={inputClassName} placeholder="Salida qty" />
            <input value={saldoFormSaldoFinal} onChange={(e) => setSaldoFormSaldoFinal(e.target.value)} className={inputClassName} placeholder="Saldo final" />
            <input value={saldoFormPrecioUnit} onChange={(e) => setSaldoFormPrecioUnit(e.target.value)} className={inputClassName} placeholder="Precio unitario" />
          </div>
          <button type="submit" disabled={upsertSaldoItemMutation.isPending} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]">
            {upsertSaldoItemMutation.isPending ? "Guardando..." : "Guardar saldo mensual"}
          </button>
        </form>
      </article>
    </section>
  );
}
