import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import {
  Calculator,
  Download,
  FileSpreadsheet,
  Landmark,
  MapPinned,
  Plus,
  Search,
  Upload
} from "lucide-react";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import {
  useCentrosCostoQuery,
  useCreateCentroCostoMutation,
  useCreateCuentaMutation,
  useCreateFuncionGastoMutation,
  useCreateSectorMutation,
  useCuentasQuery,
  useFuncionesGastoQuery,
  useSectoresQuery
} from "@/features/contabilidad/hooks/useContabilidad";
import {
  downloadContabilidadCsvTemplate,
  downloadContabilidadExcelTemplate
} from "@/shared/lib/importTemplates";
import {
  normalizeImportKey,
  normalizeSpreadsheetRow,
  readSpreadsheetSheets
} from "@/shared/lib/spreadsheetImport";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const MAX_ROWS = 10;
const MAX_CUENTAS_ROWS = 20;

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function includesText(value: string | undefined, search: string) {
  return value?.toLowerCase().includes(search.toLowerCase()) ?? false;
}

export function AccountingPage() {
  const { showError, showSuccess } = useToast();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const centrosQuery = useCentrosCostoQuery();
  const funcionesQuery = useFuncionesGastoQuery();
  const sectoresQuery = useSectoresQuery();
  const cuentasQuery = useCuentasQuery();

  const createCentroMutation = useCreateCentroCostoMutation();
  const createFuncionMutation = useCreateFuncionGastoMutation();
  const createSectorMutation = useCreateSectorMutation();
  const createCuentaMutation = useCreateCuentaMutation();

  const centros = centrosQuery.data?.data ?? [];
  const funciones = funcionesQuery.data?.data ?? [];
  const sectores = sectoresQuery.data?.data ?? [];
  const cuentas = cuentasQuery.data?.data ?? [];

  const [centroCodigo, setCentroCodigo] = useState("");
  const [centroNombre, setCentroNombre] = useState("");
  const [funcionCodigo, setFuncionCodigo] = useState("");
  const [funcionNombre, setFuncionNombre] = useState("");
  const [sectorCodigo, setSectorCodigo] = useState("");
  const [sectorNombre, setSectorNombre] = useState("");

  const [cuentaCentroId, setCuentaCentroId] = useState("");
  const [cuentaFuncionId, setCuentaFuncionId] = useState("");
  const [cuentaSectorId, setCuentaSectorId] = useState("");
  const [cuentaCodigoCompleto, setCuentaCodigoCompleto] = useState("");

  const [centroSearch, setCentroSearch] = useState("");
  const [funcionSearch, setFuncionSearch] = useState("");
  const [sectorSearch, setSectorSearch] = useState("");
  const [cuentaSearch, setCuentaSearch] = useState("");

  const centroMap = useMemo(() => new Map(centros.map((centro) => [centro.id, centro])), [centros]);
  const funcionMap = useMemo(
    () => new Map(funciones.map((funcion) => [funcion.id, funcion])),
    [funciones]
  );

  const centrosFiltered = useMemo(
    () =>
      centros
        .filter(
          (item) =>
            includesText(item.codigo, centroSearch) || includesText(item.nombre, centroSearch)
        )
        .slice(0, MAX_ROWS),
    [centroSearch, centros]
  );
  const funcionesFiltered = useMemo(
    () =>
      funciones
        .filter(
          (item) =>
            includesText(item.codigo, funcionSearch) || includesText(item.nombre, funcionSearch)
        )
        .slice(0, MAX_ROWS),
    [funcionSearch, funciones]
  );
  const sectoresFiltered = useMemo(
    () =>
      sectores
        .filter(
          (item) =>
            includesText(item.codigo, sectorSearch) || includesText(item.nombre, sectorSearch)
        )
        .slice(0, MAX_ROWS),
    [sectorSearch, sectores]
  );

  const cuentasFiltered = useMemo(
    () =>
      cuentas
        .filter(
          (item) =>
            includesText(item.codigoCompleto, cuentaSearch) ||
            includesText(item.centroCosto.codigo, cuentaSearch) ||
            includesText(item.centroCosto.nombre, cuentaSearch) ||
            includesText(item.funcionGasto.codigo, cuentaSearch) ||
            includesText(item.funcionGasto.nombre, cuentaSearch) ||
            includesText(item.sector?.codigo ?? "", cuentaSearch) ||
            includesText(item.sector?.nombre ?? "", cuentaSearch)
        )
        .slice(0, MAX_CUENTAS_ROWS),
    [cuentaSearch, cuentas]
  );

  const isLoadingBase =
    centrosQuery.isLoading ||
    funcionesQuery.isLoading ||
    sectoresQuery.isLoading ||
    cuentasQuery.isLoading;

  function updateCuentaCodigoCompleto(nextCentroId: string, nextFuncionId: string) {
    const centro = centroMap.get(Number(nextCentroId));
    const funcion = funcionMap.get(Number(nextFuncionId));
    if (centro?.codigo && funcion?.codigo) {
      setCuentaCodigoCompleto(`${centro.codigo}-${funcion.codigo}`.toUpperCase());
      return;
    }
    setCuentaCodigoCompleto("");
  }

  function handleCentroChange(value: string) {
    setCuentaCentroId(value);
    updateCuentaCodigoCompleto(value, cuentaFuncionId);
  }

  function handleFuncionChange(value: string) {
    setCuentaFuncionId(value);
    updateCuentaCodigoCompleto(cuentaCentroId, value);
  }

  function handleCreateCentro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCentroMutation.mutate(
      {
        codigo: centroCodigo,
        nombre: centroNombre
      },
      {
        onSuccess: () => {
          showSuccess("Centro de costo creado correctamente.");
          setCentroCodigo("");
          setCentroNombre("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear el centro de costo."))
      }
    );
  }

  function handleCreateFuncion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createFuncionMutation.mutate(
      {
        codigo: funcionCodigo,
        nombre: funcionNombre
      },
      {
        onSuccess: () => {
          showSuccess("Funcion de gasto creada correctamente.");
          setFuncionCodigo("");
          setFuncionNombre("");
        },
        onError: (error) =>
          showError(normalizeError(error, "No se pudo crear la funcion de gasto."))
      }
    );
  }

  function handleCreateSector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createSectorMutation.mutate(
      {
        codigo: sectorCodigo,
        nombre: sectorNombre
      },
      {
        onSuccess: () => {
          showSuccess("Sector creado correctamente.");
          setSectorCodigo("");
          setSectorNombre("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear el sector."))
      }
    );
  }

  function handleCreateCuenta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedCentroId = Number(cuentaCentroId);
    const parsedFuncionId = Number(cuentaFuncionId);
    const parsedSectorId = cuentaSectorId ? Number(cuentaSectorId) : undefined;

    if (!parsedCentroId || !parsedFuncionId) {
      showError("Debes seleccionar centro de costo y funcion de gasto.");
      return;
    }

    if (!cuentaCodigoCompleto) {
      showError("No se pudo generar el codigo de cuenta.");
      return;
    }

    createCuentaMutation.mutate(
      {
        codigoCompleto: cuentaCodigoCompleto,
        centroCostoId: parsedCentroId,
        funcionGastoId: parsedFuncionId,
        sectorId: parsedSectorId
      },
      {
        onSuccess: () => {
          showSuccess("Cuenta contable creada correctamente.");
          setCuentaCentroId("");
          setCuentaFuncionId("");
          setCuentaSectorId("");
          setCuentaCodigoCompleto("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la cuenta contable."))
      }
    );
  }

  function openImportDialog() {
    importInputRef.current?.click();
  }

  async function handleImportAccounting(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setIsImporting(true);
      const sheets = await readSpreadsheetSheets(file);
      if (!sheets.length) {
        showError("No se encontraron hojas para importar.");
        return;
      }

      const centroMapByCode = new Map(centros.map((item) => [item.codigo.trim().toUpperCase(), item.id]));
      const funcionMapByCode = new Map(
        funciones.map((item) => [item.codigo.trim().toUpperCase(), item.id])
      );
      const sectorMapByCode = new Map(sectores.map((item) => [item.codigo.trim().toUpperCase(), item.id]));
      const cuentaMapByCode = new Map(
        cuentas.map((item) => [item.codigoCompleto.trim().toUpperCase(), item.id])
      );

      let createdCentros = 0;
      let createdFunciones = 0;
      let createdSectores = 0;
      let createdCuentas = 0;
      let skipped = 0;
      let failed = 0;
      const errors: string[] = [];

      const ensureCentro = async (codigo: string, nombre: string, rowLabel: string) => {
        const code = codigo.trim().toUpperCase();
        if (!code) throw new Error(`${rowLabel}: codigo de centro vacio.`);
        const existing = centroMapByCode.get(code);
        if (existing) return existing;
        if (!nombre.trim()) throw new Error(`${rowLabel}: nombre de centro obligatorio.`);
        const response = await createCentroMutation.mutateAsync({ codigo: code, nombre: nombre.trim() });
        centroMapByCode.set(code, response.data.id);
        createdCentros += 1;
        return response.data.id;
      };

      const ensureFuncion = async (codigo: string, nombre: string, rowLabel: string) => {
        const code = codigo.trim().toUpperCase();
        if (!code) throw new Error(`${rowLabel}: codigo de funcion vacio.`);
        const existing = funcionMapByCode.get(code);
        if (existing) return existing;
        if (!nombre.trim()) throw new Error(`${rowLabel}: nombre de funcion obligatorio.`);
        const response = await createFuncionMutation.mutateAsync({
          codigo: code,
          nombre: nombre.trim()
        });
        funcionMapByCode.set(code, response.data.id);
        createdFunciones += 1;
        return response.data.id;
      };

      const ensureSector = async (codigo: string, nombre: string, rowLabel: string) => {
        const code = codigo.trim().toUpperCase();
        if (!code) return undefined;
        const existing = sectorMapByCode.get(code);
        if (existing) return existing;
        if (!nombre.trim()) throw new Error(`${rowLabel}: nombre de sector obligatorio.`);
        const response = await createSectorMutation.mutateAsync({ codigo: code, nombre: nombre.trim() });
        sectorMapByCode.set(code, response.data.id);
        createdSectores += 1;
        return response.data.id;
      };

      const createCuentaIfNeeded = async (payload: {
        centroCode: string;
        funcionCode: string;
        sectorCode?: string;
        codigoCuenta?: string;
        rowLabel: string;
      }) => {
        const centroId = centroMapByCode.get(payload.centroCode);
        const funcionId = funcionMapByCode.get(payload.funcionCode);
        if (!centroId || !funcionId) {
          throw new Error(`${payload.rowLabel}: centro o funcion inexistente.`);
        }

        const codigoCuenta =
          (payload.codigoCuenta || `${payload.centroCode}-${payload.funcionCode}`).trim().toUpperCase();
        if (cuentaMapByCode.has(codigoCuenta)) {
          skipped += 1;
          return;
        }

        const sectorId = payload.sectorCode ? sectorMapByCode.get(payload.sectorCode) : undefined;
        if (payload.sectorCode && !sectorId) {
          throw new Error(`${payload.rowLabel}: sector ${payload.sectorCode} inexistente.`);
        }
        await createCuentaMutation.mutateAsync({
          codigoCompleto: codigoCuenta,
          centroCostoId: centroId,
          funcionGastoId: funcionId,
          sectorId
        });
        cuentaMapByCode.set(codigoCuenta, 1);
        createdCuentas += 1;
      };

      const normalizedSheets = sheets.map((sheet) => ({
        name: normalizeImportKey(sheet.name),
        rows: sheet.rows.map((row) => normalizeSpreadsheetRow(row))
      }));

      const byName = new Map(normalizedSheets.map((sheet) => [sheet.name, sheet.rows]));
      const hasStructuredSheets =
        byName.has("centroscosto") ||
        byName.has("funcionesgasto") ||
        byName.has("sectores") ||
        byName.has("cuentascontables");

      if (hasStructuredSheets) {
        for (const [index, row] of (byName.get("centroscosto") ?? []).entries()) {
          const rowLabel = `Centros fila ${index + 2}`;
          const codigo = (row.codigo || "").trim().toUpperCase();
          const nombre = (row.nombre || "").trim();
          if (!codigo || !nombre) {
            failed += 1;
            errors.push(`${rowLabel}: codigo y nombre son obligatorios.`);
            continue;
          }
          try {
            await ensureCentro(codigo, nombre, rowLabel);
          } catch (error) {
            failed += 1;
            errors.push(normalizeError(error, `${rowLabel}: error al crear centro.`));
          }
        }

        for (const [index, row] of (byName.get("funcionesgasto") ?? []).entries()) {
          const rowLabel = `Funciones fila ${index + 2}`;
          const codigo = (row.codigo || "").trim().toUpperCase();
          const nombre = (row.nombre || "").trim();
          if (!codigo || !nombre) {
            failed += 1;
            errors.push(`${rowLabel}: codigo y nombre son obligatorios.`);
            continue;
          }
          try {
            await ensureFuncion(codigo, nombre, rowLabel);
          } catch (error) {
            failed += 1;
            errors.push(normalizeError(error, `${rowLabel}: error al crear funcion.`));
          }
        }

        for (const [index, row] of (byName.get("sectores") ?? []).entries()) {
          const rowLabel = `Sectores fila ${index + 2}`;
          const codigo = (row.codigo || "").trim().toUpperCase();
          const nombre = (row.nombre || "").trim();
          if (!codigo || !nombre) {
            failed += 1;
            errors.push(`${rowLabel}: codigo y nombre son obligatorios.`);
            continue;
          }
          try {
            await ensureSector(codigo, nombre, rowLabel);
          } catch (error) {
            failed += 1;
            errors.push(normalizeError(error, `${rowLabel}: error al crear sector.`));
          }
        }

        for (const [index, row] of (byName.get("cuentascontables") ?? []).entries()) {
          const rowLabel = `Cuentas fila ${index + 2}`;
          const centroCode = (row.codigocentrocosto || "").trim().toUpperCase();
          const funcionCode = (row.codigofunciongasto || "").trim().toUpperCase();
          const sectorCode = (row.codigosector || "").trim().toUpperCase();
          const codigoCuenta = (row.codigocuentacompleto || "").trim().toUpperCase();

          if (!centroCode || !funcionCode) {
            failed += 1;
            errors.push(`${rowLabel}: codigo_centro_costo y codigo_funcion_gasto son obligatorios.`);
            continue;
          }
          try {
            await createCuentaIfNeeded({
              centroCode,
              funcionCode,
              sectorCode: sectorCode || undefined,
              codigoCuenta: codigoCuenta || undefined,
              rowLabel
            });
          } catch (error) {
            failed += 1;
            errors.push(normalizeError(error, `${rowLabel}: error al crear cuenta.`));
          }
        }
      } else {
        const rows = normalizedSheets[0]?.rows ?? [];
        for (const [index, row] of rows.entries()) {
          const rowLabel = `Fila ${index + 2}`;
          const centroCode = (row.codigocentrocosto || "").trim().toUpperCase();
          const centroNombre = (row.nombrecentrocosto || "").trim();
          const funcionCode = (row.codigofunciongasto || "").trim().toUpperCase();
          const funcionNombre = (row.nombrefunciongasto || "").trim();
          const sectorCode = (row.codigosector || "").trim().toUpperCase();
          const sectorNombre = (row.nombresector || "").trim();
          const codigoCuenta = (row.codigocuentacompleto || "").trim().toUpperCase();

          if (!centroCode || !funcionCode) {
            failed += 1;
            errors.push(`${rowLabel}: codigo_centro_costo y codigo_funcion_gasto son obligatorios.`);
            continue;
          }

          try {
            await ensureCentro(centroCode, centroNombre, rowLabel);
            await ensureFuncion(funcionCode, funcionNombre, rowLabel);
            if (sectorCode) {
              await ensureSector(sectorCode, sectorNombre, rowLabel);
            }

            await createCuentaIfNeeded({
              centroCode,
              funcionCode,
              sectorCode: sectorCode || undefined,
              codigoCuenta: codigoCuenta || undefined,
              rowLabel
            });
          } catch (error) {
            failed += 1;
            errors.push(normalizeError(error, `${rowLabel}: no se pudo importar.`));
          }
        }
      }

      showSuccess(
        `Importacion completada. Centros: ${createdCentros}, Funciones: ${createdFunciones}, Sectores: ${createdSectores}, Cuentas: ${createdCuentas}, Omitidos: ${skipped}, Errores: ${failed}.`
      );
      if (errors.length) {
        showError(errors.slice(0, 3).join(" | "));
      }
    } catch (error) {
      showError(normalizeError(error, "No se pudo procesar el archivo de contabilidad."));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
              <Landmark size={18} />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-extrabold">Contabilidad de Inventario</h1>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Crea cuentas de forma directa y manten catalogos base (centro, funcion y sector) en un
                solo flujo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openImportDialog}
              disabled={isImporting}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-50"
            >
              <Upload size={13} />
              {isImporting ? "Importando..." : "Importar CSV/Excel"}
            </button>
            <button
              type="button"
              onClick={downloadContabilidadCsvTemplate}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              <Download size={13} />
              Plantilla CSV
            </button>
            <button
              type="button"
              onClick={downloadContabilidadExcelTemplate}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)] transition hover:opacity-90"
            >
              <FileSpreadsheet size={13} />
              Plantilla Excel
            </button>
          </div>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleImportAccounting}
          className="hidden"
        />
      </header>

      {isLoadingBase ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            Cargando datos de contabilidad...
          </p>
        </article>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Centros
          </p>
          <p className="mt-1 text-2xl font-bold">{centros.length}</p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Funciones
          </p>
          <p className="mt-1 text-2xl font-bold">{funciones.length}</p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Sectores
          </p>
          <p className="mt-1 text-2xl font-bold">{sectores.length}</p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Cuentas
          </p>
          <p className="mt-1 text-2xl font-bold">{cuentas.length}</p>
        </article>
      </div>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Calculator size={16} className="text-[var(--color-primary)]" />
          Crear cuenta contable
        </h2>

        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
          onSubmit={handleCreateCuenta}
        >
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Centro de costo
            </label>
            <select
              required
              value={cuentaCentroId}
              onChange={(event) => handleCentroChange(event.target.value)}
              className={inputClassName}
            >
              <option value="">Selecciona centro</option>
              {centros.map((centro) => (
                <option key={centro.id} value={centro.id}>
                  {centro.codigo} - {centro.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Funcion de gasto
            </label>
            <select
              required
              value={cuentaFuncionId}
              onChange={(event) => handleFuncionChange(event.target.value)}
              className={inputClassName}
            >
              <option value="">Selecciona funcion</option>
              {funciones.map((funcion) => (
                <option key={funcion.id} value={funcion.id}>
                  {funcion.codigo} - {funcion.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Area / Sector
            </label>
            <select
              value={cuentaSectorId}
              onChange={(event) => setCuentaSectorId(event.target.value)}
              className={inputClassName}
            >
              <option value="">Sin sector</option>
              {sectores.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.codigo} - {sector.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Codigo de cuenta
            </label>
            <input
              required
              readOnly
              value={cuentaCodigoCompleto}
              className={`${inputClassName} cursor-not-allowed font-mono uppercase tracking-wide opacity-90`}
              placeholder="CC-FG"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={createCuentaMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createCuentaMutation.isPending ? "Guardando..." : "Guardar cuenta"}
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Cuentas contables registradas</h2>
          <div className="relative w-full max-w-sm">
            <Search
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
            />
            <input
              value={cuentaSearch}
              onChange={(event) => setCuentaSearch(event.target.value)}
              className={`${inputClassName} pl-7`}
              placeholder="  Buscar por codigo, centro, funcion o sector"
            />
          </div>
        </div>
        <p className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
          Mostrando {cuentasFiltered.length} de {cuentas.length} cuentas.
        </p>

        <div className="max-h-[26rem] overflow-auto rounded-lg border border-[var(--color-border-soft)]">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-[var(--color-surface-container-highest)]">
              <tr>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Codigo
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Centro
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Funcion
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Sector
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Movimientos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {cuentasFiltered.map((cuenta) => (
                <tr
                  key={cuenta.id}
                  className="transition hover:bg-[var(--color-surface-container-highest)]"
                >
                  <td className="px-3 py-2 font-mono text-xs uppercase">{cuenta.codigoCompleto}</td>
                  <td className="px-3 py-2 text-sm">
                    {cuenta.centroCosto.codigo} - {cuenta.centroCosto.nombre}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {cuenta.funcionGasto.codigo} - {cuenta.funcionGasto.nombre}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {cuenta.sector
                      ? `${cuenta.sector.codigo} - ${cuenta.sector.nombre}`
                      : "Sin sector"}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {cuenta._count?.movimientos ?? 0}
                  </td>
                </tr>
              ))}
              {!cuentasFiltered.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                  >
                    No hay cuentas para el filtro actual.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Plus size={16} className="text-[var(--color-primary)]" />
            Centro de costo
          </h3>
          <form className="space-y-3" onSubmit={handleCreateCentro}>
            <input
              required
              value={centroCodigo}
              onChange={(event) => setCentroCodigo(event.target.value.toUpperCase())}
              className={`${inputClassName} font-mono uppercase tracking-wide`}
              placeholder="Codigo"
            />
            <input
              required
              value={centroNombre}
              onChange={(event) => setCentroNombre(event.target.value)}
              className={inputClassName}
              placeholder="Nombre"
            />
            <button
              type="submit"
              disabled={createCentroMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createCentroMutation.isPending ? "Guardando..." : "Guardar centro"}
            </button>
          </form>

          <div className="relative mt-4">
            <Search
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
            />
            <input
              value={centroSearch}
              onChange={(event) => setCentroSearch(event.target.value)}
              className={`${inputClassName} pl-7`}
              placeholder="Buscar centro"
            />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {centrosFiltered.map((centro) => (
              <div
                key={centro.id}
                className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2"
              >
                <p className="font-mono text-xs uppercase">{centro.codigo}</p>
                <p>{centro.nombre}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Plus size={16} className="text-[var(--color-primary)]" />
            Funcion de gasto
          </h3>
          <form className="space-y-3" onSubmit={handleCreateFuncion}>
            <input
              required
              value={funcionCodigo}
              onChange={(event) => setFuncionCodigo(event.target.value.toUpperCase())}
              className={`${inputClassName} font-mono uppercase tracking-wide`}
              placeholder="Codigo"
            />
            <input
              required
              value={funcionNombre}
              onChange={(event) => setFuncionNombre(event.target.value)}
              className={inputClassName}
              placeholder="Nombre"
            />
            <button
              type="submit"
              disabled={createFuncionMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createFuncionMutation.isPending ? "Guardando..." : "Guardar funcion"}
            </button>
          </form>

          <div className="relative mt-4">
            <Search
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
            />
            <input
              value={funcionSearch}
              onChange={(event) => setFuncionSearch(event.target.value)}
              className={`${inputClassName} pl-7`}
              placeholder="Buscar funcion"
            />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {funcionesFiltered.map((funcion) => (
              <div
                key={funcion.id}
                className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2"
              >
                <p className="font-mono text-xs uppercase">{funcion.codigo}</p>
                <p>{funcion.nombre}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <MapPinned size={16} className="text-[var(--color-primary)]" />
            Sector
          </h3>
          <form className="space-y-3" onSubmit={handleCreateSector}>
            <input
              required
              value={sectorCodigo}
              onChange={(event) => setSectorCodigo(event.target.value.toUpperCase())}
              className={`${inputClassName} font-mono uppercase tracking-wide`}
              placeholder="Codigo"
            />
            <input
              required
              value={sectorNombre}
              onChange={(event) => setSectorNombre(event.target.value)}
              className={inputClassName}
              placeholder="Nombre"
            />
            <button
              type="submit"
              disabled={createSectorMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createSectorMutation.isPending ? "Guardando..." : "Guardar sector"}
            </button>
          </form>

          <div className="relative mt-4">
            <Search
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
            />
            <input
              value={sectorSearch}
              onChange={(event) => setSectorSearch(event.target.value)}
              className={`${inputClassName} pl-7`}
              placeholder="Buscar sector"
            />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {sectoresFiltered.map((sector) => (
              <div
                key={sector.id}
                className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2"
              >
                <p className="font-mono text-xs uppercase">{sector.codigo}</p>
                <p>{sector.nombre}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
