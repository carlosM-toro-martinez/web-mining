import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import {
  Calculator,
  Download,
  FileSpreadsheet,
  Landmark,
  MapPinned,
  Plus,
  ReceiptText,
  Search,
  Upload
} from "lucide-react";
import {
  useCentrosCostoQuery,
  useCreateCentroCostoMutation,
  useCreateCuentaMutation,
  useCreateFuncionGastoMutation,
  useCreateSalidaMovimientoMutation,
  useCreateSectorMutation,
  useCuentasQuery,
  useFuncionesGastoQuery,
  useSectoresQuery
} from "@/features/contabilidad/hooks/useContabilidad";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import { ApiError } from "@/shared/api/core/apiError";
import {
  downloadContabilidadCsvTemplate,
  downloadContabilidadExcelTemplate
} from "@/shared/lib/importTemplates";
import {
  normalizeImportKey,
  normalizeSpreadsheetRow,
  readSpreadsheetSheets
} from "@/shared/lib/spreadsheetImport";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

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
  const productosQuery = useProductosQuery({ page: 1, limit: 100, search: "" });

  const createCentroMutation = useCreateCentroCostoMutation();
  const createFuncionMutation = useCreateFuncionGastoMutation();
  const createSectorMutation = useCreateSectorMutation();
  const createCuentaMutation = useCreateCuentaMutation();
  const createSalidaMutation = useCreateSalidaMovimientoMutation();

  const centros = centrosQuery.data?.data ?? [];
  const funciones = funcionesQuery.data?.data ?? [];
  const sectores = sectoresQuery.data?.data ?? [];
  const cuentas = cuentasQuery.data?.data ?? [];
  const productos = productosQuery.data?.data ?? [];

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

  const [productoId, setProductoId] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [referencia, setReferencia] = useState("VALE");
  const [referenciaId, setReferenciaId] = useState("");

  const [centroSearch, setCentroSearch] = useState("");
  const [funcionSearch, setFuncionSearch] = useState("");
  const [sectorSearch, setSectorSearch] = useState("");
  const [cuentaSearch, setCuentaSearch] = useState("");

  const centroMap = useMemo(() => new Map(centros.map((item) => [item.id, item])), [centros]);
  const funcionMap = useMemo(() => new Map(funciones.map((item) => [item.id, item])), [funciones]);

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
    if (!centro?.codigo || !funcion?.codigo) {
      setCuentaCodigoCompleto("");
      return;
    }
    setCuentaCodigoCompleto(`${centro.codigo}-${funcion.codigo}`.toUpperCase());
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
      { codigo: centroCodigo, nombre: centroNombre },
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
      { codigo: funcionCodigo, nombre: funcionNombre },
      {
        onSuccess: () => {
          showSuccess("Funcion de gasto creada correctamente.");
          setFuncionCodigo("");
          setFuncionNombre("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la funcion de gasto."))
      }
    );
  }

  function handleCreateSector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createSectorMutation.mutate(
      { codigo: sectorCodigo, nombre: sectorNombre },
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
    const centroCostoId = Number(cuentaCentroId);
    const funcionGastoId = Number(cuentaFuncionId);
    const sectorId = cuentaSectorId ? Number(cuentaSectorId) : undefined;

    if (!centroCostoId || !funcionGastoId) {
      showError("Debes seleccionar centro de costo y funcion de gasto.");
      return;
    }

    createCuentaMutation.mutate(
      { codigoCompleto: cuentaCodigoCompleto, centroCostoId, funcionGastoId, sectorId },
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

  function handleCreateSalida(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedProductoId = Number(productoId);
    const parsedCuentaId = Number(cuentaId);
    const parsedCantidad = Number(cantidad);

    if (!parsedProductoId || !parsedCuentaId || !parsedCantidad) {
      showError("Debes completar producto, cuenta y cantidad.");
      return;
    }

    createSalidaMutation.mutate(
      {
        productoId: parsedProductoId,
        cuentaId: parsedCuentaId,
        cantidad: parsedCantidad,
        referencia: referencia.trim().toUpperCase(),
        referenciaId: referenciaId.trim()
      },
      {
        onSuccess: () => {
          showSuccess("Salida registrada correctamente.");
          setProductoId("");
          setCuentaId("");
          setCantidad("1");
          setReferencia("VALE");
          setReferenciaId("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar la salida."))
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
      const funcionMapByCode = new Map(funciones.map((item) => [item.codigo.trim().toUpperCase(), item.id]));
      const sectorMapByCode = new Map(sectores.map((item) => [item.codigo.trim().toUpperCase(), item.id]));
      const cuentaMapByCode = new Map(cuentas.map((item) => [item.codigoCompleto.trim().toUpperCase(), item.id]));

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
        const response = await createFuncionMutation.mutateAsync({ codigo: code, nombre: nombre.trim() });
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
        if (!centroId || !funcionId) throw new Error(`${payload.rowLabel}: centro o funcion inexistente.`);

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

        const response = await createCuentaMutation.mutateAsync({
          codigoCompleto: codigoCuenta,
          centroCostoId: centroId,
          funcionGastoId: funcionId,
          sectorId
        });
        cuentaMapByCode.set(codigoCuenta, response.data.id);
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
          const centroNombreRow = (row.nombrecentrocosto || "").trim();
          const funcionCode = (row.codigofunciongasto || "").trim().toUpperCase();
          const funcionNombreRow = (row.nombrefunciongasto || "").trim();
          const sectorCode = (row.codigosector || "").trim().toUpperCase();
          const sectorNombreRow = (row.nombresector || "").trim();
          const codigoCuenta = (row.codigocuentacompleto || "").trim().toUpperCase();

          if (!centroCode || !funcionCode) {
            failed += 1;
            errors.push(`${rowLabel}: codigo_centro_costo y codigo_funcion_gasto son obligatorios.`);
            continue;
          }

          try {
            await ensureCentro(centroCode, centroNombreRow, rowLabel);
            await ensureFuncion(funcionCode, funcionNombreRow, rowLabel);
            if (sectorCode) await ensureSector(sectorCode, sectorNombreRow, rowLabel);

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
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-tertiary)]/16 p-2.5 text-[var(--color-tertiary)]">
              <Landmark size={18} />
            </div>
            <div>
              <h1 className="page-title font-headline text-3xl font-extrabold">Contabilidad</h1>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Administra centros, funciones, sectores y cuentas contables del inventario.
              </p>
            </div>
          </div>

          <div className="page-toolbar flex items-center gap-3">
            <button
              type="button"
              onClick={openImportDialog}
              disabled={isImporting}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-50"
            >
              <Upload size={16} />
              {isImporting ? "Importando..." : "Importar CSV/Excel"}
            </button>
            <button
              type="button"
              onClick={downloadContabilidadCsvTemplate}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              <Download size={16} />
              Plantilla CSV
            </button>
            <button
              type="button"
              onClick={downloadContabilidadExcelTemplate}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)]/14 px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/22"
            >
              <FileSpreadsheet size={16} />
              Plantilla Excel
            </button>
          </div>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleImportAccounting}
        />
      </header>

      {isLoadingBase ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 text-sm text-[var(--color-on-surface-variant)]">
          Cargando datos de contabilidad...
        </article>
      ) : null}

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
            {centrosFiltered.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2"
              >
                <p className="font-mono text-xs uppercase">{item.codigo}</p>
                <p>{item.nombre}</p>
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
            {funcionesFiltered.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2"
              >
                <p className="font-mono text-xs uppercase">{item.codigo}</p>
                <p>{item.nombre}</p>
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
            {sectoresFiltered.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2"
              >
                <p className="font-mono text-xs uppercase">{item.codigo}</p>
                <p>{item.nombre}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Calculator size={16} className="text-[var(--color-primary)]" />
          Crear cuenta contable
        </h2>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleCreateCuenta}>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Centro de costo</label>
            <select required value={cuentaCentroId} onChange={(event) => handleCentroChange(event.target.value)} className={inputClassName}>
              <option value="">Selecciona centro</option>
              {centros.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo} - {item.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Funcion de gasto</label>
            <select required value={cuentaFuncionId} onChange={(event) => handleFuncionChange(event.target.value)} className={inputClassName}>
              <option value="">Selecciona funcion</option>
              {funciones.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo} - {item.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Area / Sector</label>
            <select value={cuentaSectorId} onChange={(event) => setCuentaSectorId(event.target.value)} className={inputClassName}>
              <option value="">Sin sector</option>
              {sectores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo} - {item.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Codigo completo</label>
            <input
              required
              value={cuentaCodigoCompleto}
              onChange={(event) => setCuentaCodigoCompleto(event.target.value.toUpperCase())}
              className={`${inputClassName} font-mono uppercase tracking-wide`}
              placeholder="1804-229"
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
              placeholder="Buscar por codigo, centro, funcion o sector"
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
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Codigo</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Centro</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Funcion</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Sector</th>
                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Movimientos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {cuentasFiltered.map((cuenta) => (
                <tr key={cuenta.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-3 py-2 font-mono text-xs uppercase">{cuenta.codigoCompleto}</td>
                  <td className="px-3 py-2 text-sm">
                    {cuenta.centroCosto.codigo} - {cuenta.centroCosto.nombre}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {cuenta.funcionGasto.codigo} - {cuenta.funcionGasto.nombre}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {cuenta.sector ? `${cuenta.sector.codigo} - ${cuenta.sector.nombre}` : "Sin sector"}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">{cuenta._count?.movimientos ?? 0}</td>
                </tr>
              ))}
              {!cuentasFiltered.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                    No hay cuentas para el filtro actual.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <ReceiptText size={16} className="text-[var(--color-primary)]" />
          Registrar salida con cuenta contable
        </h2>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={handleCreateSalida}>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Producto</label>
            <select required value={productoId} onChange={(event) => setProductoId(event.target.value)} className={inputClassName}>
              <option value="">Selecciona producto</option>
              {productos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.codigo} - {producto.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Cuenta contable</label>
            <select required value={cuentaId} onChange={(event) => setCuentaId(event.target.value)} className={inputClassName}>
              <option value="">Selecciona cuenta</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.codigoCompleto} - {cuenta.centroCosto.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Cantidad</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={cantidad}
              onChange={(event) => setCantidad(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Referencia</label>
            <input
              required
              value={referencia}
              onChange={(event) => setReferencia(event.target.value.toUpperCase())}
              className={`${inputClassName} uppercase`}
              placeholder="VALE"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Referencia ID</label>
            <input
              required
              value={referenciaId}
              onChange={(event) => setReferenciaId(event.target.value)}
              className={inputClassName}
              placeholder="vale-123"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={createSalidaMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createSalidaMutation.isPending ? "Registrando..." : "Registrar salida"}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}
