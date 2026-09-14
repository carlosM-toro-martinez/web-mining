import { FormEvent, useMemo, useState } from "react";
import {
  Check,
  Coins,
  Factory,
  ListChecks,
  MapPin,
  Mountain,
  Pencil,
  Percent,
  Plus,
  Search,
  Trash2,
  X
} from "lucide-react";
import {
  useAlicuotasRegaliaQuery,
  useConceptosLiquidacionQuery,
  useCreateAlicuotaRegaliaMutation,
  useCreateConceptoLiquidacionMutation,
  useCreateIngenioMutation,
  useCreateMunicipioOrigenMutation,
  useCreateTarifaLiquidacionMutation,
  useCreateTipoMineralMutation,
  useDeleteConceptoLiquidacionMutation,
  useDeleteIngenioMutation,
  useDeleteMunicipioOrigenMutation,
  useDeleteTipoMineralMutation,
  useIngeniosQuery,
  useMunicipiosOrigenQuery,
  useTarifasLiquidacionQuery,
  useTiposMineralQuery,
  useUpdateConceptoLiquidacionMutation,
  useUpdateIngenioMutation,
  useUpdateMunicipioOrigenMutation,
  useUpdateTipoMineralMutation
} from "@/features/parametrosLogistica/hooks/useParametrosLogistica";
import type {
  CatalogoSimple,
  TipoEntidadRemitente
} from "@/features/parametrosLogistica/model/parametrosLogistica.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const MAX_ROWS = 12;

const TIPO_ENTIDAD_LABEL: Record<TipoEntidadRemitente, string> = {
  EMPRESA: "Empresa",
  TRABAJADOR_PARTICULAR: "Trabajador particular"
};

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function includesText(value: string | undefined, search: string) {
  return value?.toLowerCase().includes(search.toLowerCase()) ?? false;
}

function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO");
}

export function ParametrosLogisticaPage() {
  const { showError, showSuccess } = useToast();

  const municipiosQuery = useMunicipiosOrigenQuery();
  const tiposMineralQuery = useTiposMineralQuery();
  const ingeniosQuery = useIngeniosQuery();
  const conceptosQuery = useConceptosLiquidacionQuery();
  const alicuotasQuery = useAlicuotasRegaliaQuery();
  const tarifasQuery = useTarifasLiquidacionQuery();

  const createMunicipioMutation = useCreateMunicipioOrigenMutation();
  const updateMunicipioMutation = useUpdateMunicipioOrigenMutation();
  const deleteMunicipioMutation = useDeleteMunicipioOrigenMutation();

  const createTipoMutation = useCreateTipoMineralMutation();
  const updateTipoMutation = useUpdateTipoMineralMutation();
  const deleteTipoMutation = useDeleteTipoMineralMutation();

  const createIngenioMutation = useCreateIngenioMutation();
  const updateIngenioMutation = useUpdateIngenioMutation();
  const deleteIngenioMutation = useDeleteIngenioMutation();

  const createConceptoMutation = useCreateConceptoLiquidacionMutation();
  const updateConceptoMutation = useUpdateConceptoLiquidacionMutation();
  const deleteConceptoMutation = useDeleteConceptoLiquidacionMutation();

  const createAlicuotaMutation = useCreateAlicuotaRegaliaMutation();
  const createTarifaMutation = useCreateTarifaLiquidacionMutation();

  const municipios = municipiosQuery.data?.data ?? [];
  const tiposMineral = tiposMineralQuery.data?.data ?? [];
  const ingenios = ingeniosQuery.data?.data ?? [];
  const conceptos = conceptosQuery.data?.data ?? [];
  const alicuotas = alicuotasQuery.data?.data ?? [];
  const tarifas = tarifasQuery.data?.data ?? [];

  // --- Municipio ---
  const [municipioCodigo, setMunicipioCodigo] = useState("");
  const [municipioNombre, setMunicipioNombre] = useState("");
  const [municipioSearch, setMunicipioSearch] = useState("");
  const [editingMunicipioId, setEditingMunicipioId] = useState<number | null>(null);

  // --- Tipo de mineral ---
  const [tipoCodigo, setTipoCodigo] = useState("");
  const [tipoNombre, setTipoNombre] = useState("");
  const [tipoSearch, setTipoSearch] = useState("");
  const [editingTipoId, setEditingTipoId] = useState<number | null>(null);

  // --- Ingenio ---
  const [ingenioCodigo, setIngenioCodigo] = useState("");
  const [ingenioNombre, setIngenioNombre] = useState("");
  const [ingenioSearch, setIngenioSearch] = useState("");
  const [editingIngenioId, setEditingIngenioId] = useState<number | null>(null);

  // Campos de edición compartidos entre municipio/tipo/ingenio (misma forma: codigo + nombre)
  const [editCodigo, setEditCodigo] = useState("");
  const [editNombre, setEditNombre] = useState("");

  // --- Concepto de liquidación ---
  const [conceptoNombre, setConceptoNombre] = useState("");
  const [conceptoTipo, setConceptoTipo] = useState<"ABONO" | "DEDUCCION">("ABONO");
  const [conceptoSearch, setConceptoSearch] = useState("");
  const [editingConceptoId, setEditingConceptoId] = useState<number | null>(null);
  const [editConceptoNombre, setEditConceptoNombre] = useState("");
  const [editConceptoTipo, setEditConceptoTipo] = useState<"ABONO" | "DEDUCCION">("ABONO");

  // --- Alícuota de regalía ---
  const [alicuotaMunicipioId, setAlicuotaMunicipioId] = useState("");
  const [alicuotaTipoMineralId, setAlicuotaTipoMineralId] = useState("");
  const [alicuotaPorcentaje, setAlicuotaPorcentaje] = useState("");
  const [alicuotaVigenteDesde, setAlicuotaVigenteDesde] = useState("");

  // --- Tarifa de liquidación ---
  const [tarifaTipoEntidad, setTarifaTipoEntidad] = useState<TipoEntidadRemitente>("EMPRESA");
  const [tarifaTipoMineralId, setTarifaTipoMineralId] = useState("");
  const [tarifaPrecio, setTarifaPrecio] = useState("");
  const [tarifaVigenteDesde, setTarifaVigenteDesde] = useState("");

  const municipioMap = useMemo(() => new Map(municipios.map((m) => [m.id, m])), [municipios]);
  const tipoMineralMap = useMemo(() => new Map(tiposMineral.map((t) => [t.id, t])), [tiposMineral]);

  const municipiosFiltered = useMemo(
    () =>
      municipios
        .filter((item) => includesText(item.codigo, municipioSearch) || includesText(item.nombre, municipioSearch))
        .slice(0, MAX_ROWS),
    [municipioSearch, municipios]
  );

  const tiposMineralFiltered = useMemo(
    () =>
      tiposMineral
        .filter((item) => includesText(item.codigo, tipoSearch) || includesText(item.nombre, tipoSearch))
        .slice(0, MAX_ROWS),
    [tipoSearch, tiposMineral]
  );

  const ingeniosFiltered = useMemo(
    () =>
      ingenios
        .filter((item) => includesText(item.codigo, ingenioSearch) || includesText(item.nombre, ingenioSearch))
        .slice(0, MAX_ROWS),
    [ingenioSearch, ingenios]
  );

  const conceptosFiltered = useMemo(
    () => conceptos.filter((item) => includesText(item.nombre, conceptoSearch)).slice(0, MAX_ROWS),
    [conceptoSearch, conceptos]
  );

  const isLoadingBase =
    municipiosQuery.isLoading || tiposMineralQuery.isLoading || ingeniosQuery.isLoading || conceptosQuery.isLoading;

  function startEditCatalogo(item: CatalogoSimple, setEditingId: (id: number | null) => void) {
    setEditingId(item.id);
    setEditCodigo(item.codigo);
    setEditNombre(item.nombre);
  }

  function cancelEditCatalogo() {
    setEditingMunicipioId(null);
    setEditingTipoId(null);
    setEditingIngenioId(null);
  }

  function handleCreateMunicipio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMunicipioMutation.mutate(
      { codigo: municipioCodigo, nombre: municipioNombre },
      {
        onSuccess: () => {
          showSuccess("Municipio de origen creado correctamente.");
          setMunicipioCodigo("");
          setMunicipioNombre("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear el municipio de origen."))
      }
    );
  }

  function handleSaveMunicipio(id: number) {
    updateMunicipioMutation.mutate(
      { id, payload: { codigo: editCodigo, nombre: editNombre } },
      {
        onSuccess: () => {
          showSuccess("Municipio actualizado.");
          cancelEditCatalogo();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar el municipio."))
      }
    );
  }

  function handleDeleteMunicipio(id: number) {
    deleteMunicipioMutation.mutate(id, {
      onSuccess: () => showSuccess("Municipio eliminado."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar el municipio."))
    });
  }

  function handleCreateTipo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTipoMutation.mutate(
      { codigo: tipoCodigo, nombre: tipoNombre },
      {
        onSuccess: () => {
          showSuccess("Tipo de mineral creado correctamente.");
          setTipoCodigo("");
          setTipoNombre("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear el tipo de mineral."))
      }
    );
  }

  function handleSaveTipo(id: number) {
    updateTipoMutation.mutate(
      { id, payload: { codigo: editCodigo, nombre: editNombre } },
      {
        onSuccess: () => {
          showSuccess("Tipo de mineral actualizado.");
          cancelEditCatalogo();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar el tipo de mineral."))
      }
    );
  }

  function handleDeleteTipo(id: number) {
    deleteTipoMutation.mutate(id, {
      onSuccess: () => showSuccess("Tipo de mineral eliminado."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar el tipo de mineral."))
    });
  }

  function handleCreateIngenio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createIngenioMutation.mutate(
      { codigo: ingenioCodigo, nombre: ingenioNombre },
      {
        onSuccess: () => {
          showSuccess("Ingenio creado correctamente.");
          setIngenioCodigo("");
          setIngenioNombre("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear el ingenio."))
      }
    );
  }

  function handleSaveIngenio(id: number) {
    updateIngenioMutation.mutate(
      { id, payload: { codigo: editCodigo, nombre: editNombre } },
      {
        onSuccess: () => {
          showSuccess("Ingenio actualizado.");
          cancelEditCatalogo();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar el ingenio."))
      }
    );
  }

  function handleDeleteIngenio(id: number) {
    deleteIngenioMutation.mutate(id, {
      onSuccess: () => showSuccess("Ingenio eliminado."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar el ingenio."))
    });
  }

  function handleCreateConcepto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createConceptoMutation.mutate(
      { nombre: conceptoNombre, tipo: conceptoTipo },
      {
        onSuccess: () => {
          showSuccess("Concepto de liquidación creado correctamente.");
          setConceptoNombre("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear el concepto de liquidación."))
      }
    );
  }

  function startEditConcepto(item: (typeof conceptos)[number]) {
    setEditingConceptoId(item.id);
    setEditConceptoNombre(item.nombre);
    setEditConceptoTipo(item.tipo);
  }

  function handleSaveConcepto(id: number) {
    updateConceptoMutation.mutate(
      { id, payload: { nombre: editConceptoNombre, tipo: editConceptoTipo } },
      {
        onSuccess: () => {
          showSuccess("Concepto actualizado.");
          setEditingConceptoId(null);
        },
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar el concepto."))
      }
    );
  }

  function handleDeleteConcepto(id: number) {
    deleteConceptoMutation.mutate(id, {
      onSuccess: () => showSuccess("Concepto eliminado."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar el concepto."))
    });
  }

  function handleCreateAlicuota(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createAlicuotaMutation.mutate(
      {
        municipioOrigenId: Number(alicuotaMunicipioId),
        tipoMineralId: Number(alicuotaTipoMineralId),
        porcentaje: Number(alicuotaPorcentaje),
        vigenteDesde: alicuotaVigenteDesde
      },
      {
        onSuccess: () => {
          showSuccess("Alícuota de regalía registrada. La vigencia anterior (si existía) quedó cerrada automáticamente.");
          setAlicuotaPorcentaje("");
          setAlicuotaVigenteDesde("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar la alícuota de regalía."))
      }
    );
  }

  function handleCreateTarifa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTarifaMutation.mutate(
      {
        tipoEntidad: tarifaTipoEntidad,
        tipoMineralId: tarifaTipoMineralId ? Number(tarifaTipoMineralId) : null,
        precioPorTonelada: Number(tarifaPrecio),
        vigenteDesde: tarifaVigenteDesde
      },
      {
        onSuccess: () => {
          showSuccess("Tarifa de liquidación registrada. La vigencia anterior (si existía) quedó cerrada automáticamente.");
          setTarifaPrecio("");
          setTarifaVigenteDesde("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar la tarifa de liquidación."))
      }
    );
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-tertiary)]/16 p-2.5 text-[var(--color-tertiary)]">
            <ListChecks size={18} />
          </div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">Parámetros de Logística</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Municipios de origen, tipos de mineral, ingenios, alícuotas de regalía, tarifas y conceptos de
              liquidación. Estos catálogos alimentan el registro de lotes y las liquidaciones.
            </p>
          </div>
        </div>
      </header>

      {isLoadingBase ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 text-sm text-[var(--color-on-surface-variant)]">
          Cargando parámetros...
        </article>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Municipio de origen */}
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <MapPin size={16} className="text-[var(--color-primary)]" />
            Municipio de origen
          </h3>
          <form className="space-y-3" onSubmit={handleCreateMunicipio}>
            <input
              required
              value={municipioCodigo}
              onChange={(event) => setMunicipioCodigo(event.target.value.toUpperCase())}
              className={`${inputClassName} font-mono uppercase tracking-wide`}
              placeholder="Código"
            />
            <input
              required
              value={municipioNombre}
              onChange={(event) => setMunicipioNombre(event.target.value)}
              className={inputClassName}
              placeholder="Nombre"
            />
            <button
              type="submit"
              disabled={createMunicipioMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createMunicipioMutation.isPending ? "Guardando..." : "Guardar municipio"}
            </button>
          </form>
          <div className="relative mt-4">
            <Search
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
            />
            <input
              value={municipioSearch}
              onChange={(event) => setMunicipioSearch(event.target.value)}
              className={`${inputClassName} pl-7`}
              placeholder="Buscar municipio"
            />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {municipiosFiltered.map((item) =>
              editingMunicipioId === item.id ? (
                <div
                  key={item.id}
                  className="space-y-2 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 px-3 py-2"
                >
                  <input
                    value={editCodigo}
                    onChange={(e) => setEditCodigo(e.target.value.toUpperCase())}
                    className={`${inputClassName} font-mono uppercase tracking-wide`}
                  />
                  <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className={inputClassName} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveMunicipio(item.id)}
                      disabled={updateMunicipioMutation.isPending}
                      className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                    >
                      <Check size={12} /> Guardar
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditCatalogo}
                      className="flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
                    >
                      <X size={12} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2"
                >
                  <div>
                    <p className="font-mono text-xs uppercase">{item.codigo}</p>
                    <p>{item.nombre}</p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => startEditCatalogo(item, setEditingMunicipioId)}
                      className="rounded p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMunicipio(item.id)}
                      disabled={deleteMunicipioMutation.isPending}
                      className="rounded p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </article>

        {/* Tipo de mineral */}
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Mountain size={16} className="text-[var(--color-primary)]" />
            Tipo de mineral
          </h3>
          <form className="space-y-3" onSubmit={handleCreateTipo}>
            <input
              required
              value={tipoCodigo}
              onChange={(event) => setTipoCodigo(event.target.value.toUpperCase())}
              className={`${inputClassName} font-mono uppercase tracking-wide`}
              placeholder="Código"
            />
            <input
              required
              value={tipoNombre}
              onChange={(event) => setTipoNombre(event.target.value)}
              className={inputClassName}
              placeholder="Nombre (ej. Carga Chami)"
            />
            <button
              type="submit"
              disabled={createTipoMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createTipoMutation.isPending ? "Guardando..." : "Guardar tipo de mineral"}
            </button>
          </form>
          <div className="relative mt-4">
            <Search
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
            />
            <input
              value={tipoSearch}
              onChange={(event) => setTipoSearch(event.target.value)}
              className={`${inputClassName} pl-7`}
              placeholder="Buscar tipo de mineral"
            />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {tiposMineralFiltered.map((item) =>
              editingTipoId === item.id ? (
                <div
                  key={item.id}
                  className="space-y-2 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 px-3 py-2"
                >
                  <input
                    value={editCodigo}
                    onChange={(e) => setEditCodigo(e.target.value.toUpperCase())}
                    className={`${inputClassName} font-mono uppercase tracking-wide`}
                  />
                  <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className={inputClassName} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveTipo(item.id)}
                      disabled={updateTipoMutation.isPending}
                      className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                    >
                      <Check size={12} /> Guardar
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditCatalogo}
                      className="flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
                    >
                      <X size={12} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2"
                >
                  <div>
                    <p className="font-mono text-xs uppercase">{item.codigo}</p>
                    <p>{item.nombre}</p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => startEditCatalogo(item, setEditingTipoId)}
                      className="rounded p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTipo(item.id)}
                      disabled={deleteTipoMutation.isPending}
                      className="rounded p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </article>

        {/* Ingenio */}
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Factory size={16} className="text-[var(--color-primary)]" />
            Ingenio destino
          </h3>
          <form className="space-y-3" onSubmit={handleCreateIngenio}>
            <input
              required
              value={ingenioCodigo}
              onChange={(event) => setIngenioCodigo(event.target.value.toUpperCase())}
              className={`${inputClassName} font-mono uppercase tracking-wide`}
              placeholder="Código"
            />
            <input
              required
              value={ingenioNombre}
              onChange={(event) => setIngenioNombre(event.target.value)}
              className={inputClassName}
              placeholder="Nombre"
            />
            <button
              type="submit"
              disabled={createIngenioMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createIngenioMutation.isPending ? "Guardando..." : "Guardar ingenio"}
            </button>
          </form>
          <div className="relative mt-4">
            <Search
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
            />
            <input
              value={ingenioSearch}
              onChange={(event) => setIngenioSearch(event.target.value)}
              className={`${inputClassName} pl-7`}
              placeholder="Buscar ingenio"
            />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {ingeniosFiltered.map((item) =>
              editingIngenioId === item.id ? (
                <div
                  key={item.id}
                  className="space-y-2 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 px-3 py-2"
                >
                  <input
                    value={editCodigo}
                    onChange={(e) => setEditCodigo(e.target.value.toUpperCase())}
                    className={`${inputClassName} font-mono uppercase tracking-wide`}
                  />
                  <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className={inputClassName} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveIngenio(item.id)}
                      disabled={updateIngenioMutation.isPending}
                      className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                    >
                      <Check size={12} /> Guardar
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditCatalogo}
                      className="flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
                    >
                      <X size={12} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2"
                >
                  <div>
                    <p className="font-mono text-xs uppercase">{item.codigo}</p>
                    <p>{item.nombre}</p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => startEditCatalogo(item, setEditingIngenioId)}
                      className="rounded p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteIngenio(item.id)}
                      disabled={deleteIngenioMutation.isPending}
                      className="rounded p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </article>
      </div>

      {/* Concepto de liquidación */}
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <ListChecks size={16} className="text-[var(--color-primary)]" />
          Conceptos de liquidación (abonos y deducciones)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
          <form className="space-y-3" onSubmit={handleCreateConcepto}>
            <input
              required
              value={conceptoNombre}
              onChange={(event) => setConceptoNombre(event.target.value)}
              className={inputClassName}
              placeholder="Nombre (ej. Descuento de combustible)"
            />
            <select
              value={conceptoTipo}
              onChange={(event) => setConceptoTipo(event.target.value as "ABONO" | "DEDUCCION")}
              className={inputClassName}
            >
              <option value="ABONO">Abono</option>
              <option value="DEDUCCION">Deducción</option>
            </select>
            <button
              type="submit"
              disabled={createConceptoMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createConceptoMutation.isPending ? "Guardando..." : "Guardar concepto"}
            </button>
          </form>

          <div>
            <div className="relative mb-3">
              <Search
                size={14}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
              />
              <input
                value={conceptoSearch}
                onChange={(event) => setConceptoSearch(event.target.value)}
                className={`${inputClassName} pl-7`}
                placeholder="Buscar concepto"
              />
            </div>
            <div className="space-y-2 text-sm">
              {conceptosFiltered.map((item) =>
                editingConceptoId === item.id ? (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 px-3 py-2"
                  >
                    <input
                      value={editConceptoNombre}
                      onChange={(e) => setEditConceptoNombre(e.target.value)}
                      className={`${inputClassName} flex-1`}
                    />
                    <select
                      value={editConceptoTipo}
                      onChange={(e) => setEditConceptoTipo(e.target.value as "ABONO" | "DEDUCCION")}
                      className={`${inputClassName} w-40`}
                    >
                      <option value="ABONO">Abono</option>
                      <option value="DEDUCCION">Deducción</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleSaveConcepto(item.id)}
                      disabled={updateConceptoMutation.isPending}
                      className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                    >
                      <Check size={12} /> Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingConceptoId(null)}
                      className="flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
                    >
                      <X size={12} /> Cancelar
                    </button>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          item.tipo === "ABONO"
                            ? "bg-[var(--color-success)]/18 text-[var(--color-success)]"
                            : "bg-[var(--color-error)]/18 text-[var(--color-error)]"
                        }`}
                      >
                        {item.tipo === "ABONO" ? "Abono" : "Deducción"}
                      </span>
                      <p>{item.nombre}</p>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEditConcepto(item)}
                        className="rounded p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConcepto(item.id)}
                        disabled={deleteConceptoMutation.isPending}
                        className="rounded p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </article>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Alícuota de regalía */}
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
            <Percent size={16} className="text-[var(--color-primary)]" />
            Alícuotas de regalía minera
          </h3>
          <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
            Nunca se editan: registrar una nueva cierra automáticamente la vigencia anterior del mismo
            municipio + tipo de mineral, conservando el historial para auditoría.
          </p>
          <form className="grid grid-cols-2 gap-3" onSubmit={handleCreateAlicuota}>
            <select
              required
              value={alicuotaMunicipioId}
              onChange={(event) => setAlicuotaMunicipioId(event.target.value)}
              className={`${inputClassName} col-span-2`}
            >
              <option value="">Municipio de origen...</option>
              {municipios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <select
              required
              value={alicuotaTipoMineralId}
              onChange={(event) => setAlicuotaTipoMineralId(event.target.value)}
              className={`${inputClassName} col-span-2`}
            >
              <option value="">Tipo de mineral...</option>
              {tiposMineral.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={alicuotaPorcentaje}
              onChange={(event) => setAlicuotaPorcentaje(event.target.value)}
              className={inputClassName}
              placeholder="Porcentaje (%)"
            />
            <input
              required
              type="date"
              value={alicuotaVigenteDesde}
              onChange={(event) => setAlicuotaVigenteDesde(event.target.value)}
              className={inputClassName}
            />
            <button
              type="submit"
              disabled={createAlicuotaMutation.isPending}
              className="col-span-2 w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createAlicuotaMutation.isPending ? "Guardando..." : "Registrar alícuota vigente"}
            </button>
          </form>

          <div className="mt-4 space-y-2 text-sm">
            {alicuotas.slice(0, MAX_ROWS).map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                <p className="font-semibold">
                  {municipioMap.get(item.municipioOrigenId)?.nombre ?? item.municipioOrigen.nombre} ·{" "}
                  {tipoMineralMap.get(item.tipoMineralId)?.nombre ?? item.tipoMineral.nombre}
                </p>
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  {item.porcentaje}% · desde {formatFecha(item.vigenteDesde)}
                  {item.vigenteHasta ? ` hasta ${formatFecha(item.vigenteHasta)}` : " (vigente)"}
                </p>
              </div>
            ))}
            {alicuotas.length === 0 ? (
              <p className="text-xs text-[var(--color-on-surface-variant)]">Aún no hay alícuotas registradas.</p>
            ) : null}
          </div>
        </article>

        {/* Tarifa de liquidación */}
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
            <Coins size={16} className="text-[var(--color-primary)]" />
            Tarifas de liquidación (precio por tonelada)
          </h3>
          <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
            Igual que las alícuotas: registrar una nueva tarifa cierra la vigencia anterior para el mismo
            tipo de entidad y tipo de mineral (deja el tipo de mineral vacío para "aplica a todos").
          </p>
          <form className="grid grid-cols-2 gap-3" onSubmit={handleCreateTarifa}>
            <select
              value={tarifaTipoEntidad}
              onChange={(event) => setTarifaTipoEntidad(event.target.value as TipoEntidadRemitente)}
              className={`${inputClassName} col-span-2`}
            >
              <option value="EMPRESA">Empresa</option>
              <option value="TRABAJADOR_PARTICULAR">Trabajador particular</option>
            </select>
            <select
              value={tarifaTipoMineralId}
              onChange={(event) => setTarifaTipoMineralId(event.target.value)}
              className={`${inputClassName} col-span-2`}
            >
              <option value="">Todos los tipos de mineral</option>
              {tiposMineral.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={tarifaPrecio}
              onChange={(event) => setTarifaPrecio(event.target.value)}
              className={inputClassName}
              placeholder="Precio por tonelada (Bs)"
            />
            <input
              required
              type="date"
              value={tarifaVigenteDesde}
              onChange={(event) => setTarifaVigenteDesde(event.target.value)}
              className={inputClassName}
            />
            <button
              type="submit"
              disabled={createTarifaMutation.isPending}
              className="col-span-2 w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createTarifaMutation.isPending ? "Guardando..." : "Registrar tarifa vigente"}
            </button>
          </form>

          <div className="mt-4 space-y-2 text-sm">
            {tarifas.slice(0, MAX_ROWS).map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                <p className="font-semibold">
                  {TIPO_ENTIDAD_LABEL[item.tipoEntidad]} ·{" "}
                  {item.tipoMineral?.nombre ?? "Todos los tipos"}
                </p>
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  Bs {item.precioPorTonelada} / ton · desde {formatFecha(item.vigenteDesde)}
                  {item.vigenteHasta ? ` hasta ${formatFecha(item.vigenteHasta)}` : " (vigente)"}
                </p>
              </div>
            ))}
            {tarifas.length === 0 ? (
              <p className="text-xs text-[var(--color-on-surface-variant)]">Aún no hay tarifas registradas.</p>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}
