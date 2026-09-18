import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, FileSpreadsheet, FileText, History, Landmark, ListFilter, Pencil, Plus, Trash2, Wallet, X } from "lucide-react";
import { CATEGORIA_RENDICION_LABEL, type CategoriaRendicionGasto } from "@/features/gastoCaja/model/gastoCaja.schema";
import {
  useCajasChicasQuery,
  useCentrosCostoCajaQuery,
  useCreatePartidaPresupuestoCajaMutation,
  useCuentasBancariasCajaQuery,
  useCuentasContablesCajaQuery,
  useDeletePartidaPresupuestoCajaMutation,
  useFuncionesGastoCajaQuery,
  usePartidasPresupuestoCajaQuery,
  useUpdatePartidaPresupuestoCajaMutation
} from "@/features/parametrosCajaChica/hooks/useParametrosCajaChica";
import type { PartidaPresupuestoCaja } from "@/features/parametrosCajaChica/model/parametrosCajaChica.schema";
import { encontrarCajaLipena } from "@/features/parametrosCajaChica/lib/defaultCaja";
import { exportPlanillaControlPagosExcel, exportPlanillaControlPagosPdf } from "@/features/reportesCajaChica/lib/cajaChicaExport";
import {
  useAsignarBancoPresupuestoCajaMutation,
  useCreatePresupuestoCajaMutation,
  useDeletePresupuestoCajaMutation,
  useDuplicarPresupuestoCajaMutation,
  usePresupuestosCajaQuery,
  useUpdatePresupuestoCajaMutation
} from "@/features/presupuestoCaja/hooks/usePresupuestoCaja";
import type { PresupuestoCaja } from "@/features/presupuestoCaja/model/presupuestoCaja.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] invalid:border-[var(--color-error)] invalid:ring-1 invalid:ring-[var(--color-error)]/30";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

const MESES_NOMBRE = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function formatMoneda(value: number) {
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO");
}

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

interface RemesaCardProps {
  presupuesto: PresupuestoCaja;
  cuentasBancarias: Array<{ id: number; banco: string; nombreCuenta: string; monedaBase: string }>;
  centroOptions: Array<{ id: string; label: string; searchText: string }>;
  funcionOptions: Array<{ id: string; label: string; searchText: string }>;
  cuentaOptions: Array<{ id: string; label: string; searchText: string }>;
}

function RemesaCard({ presupuesto, cuentasBancarias, centroOptions, funcionOptions, cuentaOptions }: RemesaCardProps) {
  const { showError, showSuccess } = useToast();

  const partidasQuery = usePartidasPresupuestoCajaQuery({ presupuestoId: presupuesto.id });
  const partidas = partidasQuery.data?.data ?? [];

  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [centroCostoCajaId, setCentroCostoCajaId] = useState("");
  const [funcionGastoCajaId, setFuncionGastoCajaId] = useState("");
  const [cuentaContableCajaId, setCuentaContableCajaId] = useState("");
  const [categoriaRendicion, setCategoriaRendicion] = useState<CategoriaRendicionGasto | "">("");
  const [bancoDestinoId, setBancoDestinoId] = useState("");

  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreEdit, setNombreEdit] = useState(presupuesto.nombre);

  const [editingPartidaId, setEditingPartidaId] = useState<number | null>(null);
  const [partidaEditDraft, setPartidaEditDraft] = useState<{
    descripcion: string;
    monto: string;
    centroCostoCajaId: string;
    funcionGastoCajaId: string;
    cuentaContableCajaId: string;
    categoriaRendicion: CategoriaRendicionGasto | "";
  } | null>(null);

  const createPartidaMutation = useCreatePartidaPresupuestoCajaMutation();
  const updatePartidaMutation = useUpdatePartidaPresupuestoCajaMutation();
  const deletePartidaMutation = useDeletePartidaPresupuestoCajaMutation();
  const deleteRemesaMutation = useDeletePresupuestoCajaMutation();
  const updateRemesaMutation = useUpdatePresupuestoCajaMutation();
  const asignarBancoMutation = useAsignarBancoPresupuestoCajaMutation();

  const totalPresupuestado = presupuesto.totalPresupuestado ?? 0;
  const totalGastado = presupuesto.totalGastado ?? 0;
  const saldoAFavor = presupuesto.saldoAFavor ?? 0;
  const porcentajeEjecucion = presupuesto.porcentajeEjecucion ?? 0;
  const yaAsignado = Boolean(presupuesto.asignadoMovimientoBancoId);

  function handleCreatePartida(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createPartidaMutation.mutate(
      {
        presupuestoId: presupuesto.id,
        descripcion,
        montoPresupuestado: Number(monto),
        centroCostoCajaId: centroCostoCajaId ? Number(centroCostoCajaId) : undefined,
        funcionGastoCajaId: funcionGastoCajaId ? Number(funcionGastoCajaId) : undefined,
        cuentaContableCajaId: cuentaContableCajaId ? Number(cuentaContableCajaId) : undefined,
        categoriaRendicion: categoriaRendicion || undefined
      },
      {
        onSuccess: () => {
          showSuccess("Partida agregada.");
          setDescripcion("");
          setMonto("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo agregar la partida."))
      }
    );
  }

  function handleDeletePartida(id: number) {
    deletePartidaMutation.mutate(id, {
      onSuccess: () => showSuccess("Partida eliminada."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar la partida."))
    });
  }

  function handleDeleteRemesa() {
    if (!window.confirm(`¿Eliminar la remesa "${presupuesto.nombre}" y todas sus partidas?`)) return;
    deleteRemesaMutation.mutate(presupuesto.id, {
      onSuccess: () => showSuccess("Remesa eliminada."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar: puede tener gastos imputados."))
    });
  }

  function handleAsignarBanco() {
    if (!bancoDestinoId) {
      showError("Elige a qué cuenta bancaria se asignó esta remesa.");
      return;
    }
    asignarBancoMutation.mutate(
      { id: presupuesto.id, payload: { cuentaBancariaId: Number(bancoDestinoId) } },
      {
        onSuccess: () => showSuccess(`"${presupuesto.nombre}" aprobada y asignada al banco.`),
        onError: (error) => showError(normalizeError(error, "No se pudo asignar la remesa al banco."))
      }
    );
  }

  function handleStartEditNombre() {
    setNombreEdit(presupuesto.nombre);
    setEditandoNombre(true);
  }

  function handleSaveNombre() {
    if (!nombreEdit.trim()) {
      showError("El nombre no puede estar vacío.");
      return;
    }
    updateRemesaMutation.mutate(
      { id: presupuesto.id, payload: { nombre: nombreEdit.trim() } },
      {
        onSuccess: () => {
          showSuccess("Nombre de la remesa actualizado.");
          setEditandoNombre(false);
        },
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar el nombre."))
      }
    );
  }

  function handleStartEditPartida(p: PartidaPresupuestoCaja) {
    setEditingPartidaId(p.id);
    setPartidaEditDraft({
      descripcion: p.descripcion,
      monto: String(p.montoPresupuestado),
      centroCostoCajaId: p.centroCostoCajaId ? String(p.centroCostoCajaId) : "",
      funcionGastoCajaId: p.funcionGastoCajaId ? String(p.funcionGastoCajaId) : "",
      cuentaContableCajaId: p.cuentaContableCajaId ? String(p.cuentaContableCajaId) : "",
      categoriaRendicion: p.categoriaRendicion ?? ""
    });
  }

  function handleSavePartida() {
    if (!editingPartidaId || !partidaEditDraft) return;
    if (!partidaEditDraft.descripcion.trim() || !partidaEditDraft.monto) {
      showError("La descripción y el monto son obligatorios.");
      return;
    }
    updatePartidaMutation.mutate(
      {
        id: editingPartidaId,
        payload: {
          descripcion: partidaEditDraft.descripcion.trim(),
          montoPresupuestado: Number(partidaEditDraft.monto),
          centroCostoCajaId: partidaEditDraft.centroCostoCajaId ? Number(partidaEditDraft.centroCostoCajaId) : undefined,
          funcionGastoCajaId: partidaEditDraft.funcionGastoCajaId ? Number(partidaEditDraft.funcionGastoCajaId) : undefined,
          cuentaContableCajaId: partidaEditDraft.cuentaContableCajaId ? Number(partidaEditDraft.cuentaContableCajaId) : undefined,
          categoriaRendicion: partidaEditDraft.categoriaRendicion || undefined
        }
      },
      {
        onSuccess: () => {
          showSuccess("Partida actualizada.");
          setEditingPartidaId(null);
          setPartidaEditDraft(null);
        },
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar la partida."))
      }
    );
  }

  return (
    <article className="rounded-xl border border-[var(--color-outline-variant)] border-l-4 border-l-[var(--color-primary)] bg-[var(--color-surface-container-low)] p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editandoNombre ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                autoFocus
                value={nombreEdit}
                onChange={(e) => setNombreEdit(e.target.value)}
                className={`${inputClassName} w-auto flex-1`}
              />
              <button
                type="button"
                onClick={handleSaveNombre}
                disabled={updateRemesaMutation.isPending}
                className="rounded-lg bg-[var(--color-primary)] p-1.5 text-[var(--color-on-primary)] disabled:opacity-60"
                title="Guardar"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => setEditandoNombre(false)}
                className="rounded-lg border border-[var(--color-outline-variant)] p-1.5 text-[var(--color-on-surface-variant)]"
                title="Cancelar"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <h3 className="flex items-center gap-2 text-lg font-bold">
              {presupuesto.nombre}
              {yaAsignado ? null : (
                <button
                  type="button"
                  onClick={handleStartEditNombre}
                  className="rounded p-1 text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-primary)]"
                  title="Editar nombre"
                >
                  <Pencil size={13} />
                </button>
              )}
            </h3>
          )}
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            Presupuestado {formatMoneda(totalPresupuestado)} · Gastado {formatMoneda(totalGastado)} · Reposición{" "}
            <span className="font-semibold">{formatMoneda(saldoAFavor)}</span> · {porcentajeEjecucion.toFixed(1)}%
          </p>
        </div>
        {yaAsignado ? null : (
          <button
            type="button"
            onClick={handleDeleteRemesa}
            className="rounded p-1 text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10"
            title="Eliminar remesa"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {yaAsignado ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--color-success)]/35 bg-[var(--color-success)]/8 px-3 py-2 text-xs font-semibold text-[var(--color-success)]">
          <Check size={14} />
          Aprobada y asignada al banco
          {presupuesto.asignadoEn ? ` el ${formatFecha(presupuesto.asignadoEn)}` : ""}
          {presupuesto.asignadoMovimientoBanco?.cuentaBancaria
            ? ` a ${presupuesto.asignadoMovimientoBanco.cuentaBancaria.banco} · ${presupuesto.asignadoMovimientoBanco.cuentaBancaria.nombreCuenta}`
            : ""}
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
          <Landmark size={14} className="shrink-0 text-[var(--color-primary)]" />
          <select
            value={bancoDestinoId}
            onChange={(e) => setBancoDestinoId(e.target.value)}
            className={`${inputClassName} w-auto flex-1`}
          >
            <option value="">Cuenta bancaria destino...</option>
            {cuentasBancarias.map((c) => (
              <option key={c.id} value={c.id}>{c.banco} · {c.nombreCuenta}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAsignarBanco}
            disabled={asignarBancoMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            {asignarBancoMutation.isPending ? "Asignando..." : "Aprobar y asignar al banco"}
          </button>
        </div>
      )}

      {yaAsignado ? (
        <p className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
          Esta remesa ya fue aprobada y asignada al banco: sus partidas quedan fijas y no se pueden agregar,
          editar ni eliminar.
        </p>
      ) : (
        <form className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_auto]" onSubmit={handleCreatePartida}>
          <input
            required
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={inputClassName}
            placeholder="Descripción (ej. Internet Starlink)"
          />
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={inputClassName}
            placeholder="Monto"
          />
          <button
            type="submit"
            disabled={createPartidaMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            {createPartidaMutation.isPending ? "Guardando..." : "Agregar partida"}
          </button>

          <div className="sm:col-span-3">
            <p className="mb-1.5 text-[11px] text-[var(--color-on-surface-variant)]">
              Clasificación (opcional): si la llenas, al registrar el gasto real que ejecuta esta partida el
              formulario se autocompleta con esto.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <AutocompleteSelect
                value={centroCostoCajaId}
                onChange={setCentroCostoCajaId}
                options={centroOptions}
                placeholder="Centro de costo..."
                className={inputClassName}
              />
              <AutocompleteSelect
                value={funcionGastoCajaId}
                onChange={setFuncionGastoCajaId}
                options={funcionOptions}
                placeholder="Función de gasto..."
                className={inputClassName}
              />
              <AutocompleteSelect
                value={cuentaContableCajaId}
                onChange={setCuentaContableCajaId}
                options={cuentaOptions}
                placeholder="Cuenta contable..."
                className={inputClassName}
              />
              <select
                value={categoriaRendicion}
                onChange={(e) => setCategoriaRendicion(e.target.value as CategoriaRendicionGasto | "")}
                className={inputClassName}
              >
                <option value="">Categoría del reporte...</option>
                {Object.entries(CATEGORIA_RENDICION_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <th className="border border-[var(--color-border-soft)] px-2 py-1.5">Descripción</th>
              <th className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">Presupuestado</th>
              <th className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">Gastado</th>
              <th className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">Reposición</th>
              <th className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">% Ejec.</th>
              <th className="border border-[var(--color-border-soft)] px-2 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {partidas.map((p) =>
              editingPartidaId === p.id && partidaEditDraft ? (
                <tr key={p.id} className="bg-[var(--color-primary)]/6">
                  <td colSpan={6} className="border border-[var(--color-border-soft)] p-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        value={partidaEditDraft.descripcion}
                        onChange={(e) => setPartidaEditDraft({ ...partidaEditDraft, descripcion: e.target.value })}
                        className={inputClassName}
                        placeholder="Descripción"
                      />
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={partidaEditDraft.monto}
                        onChange={(e) => setPartidaEditDraft({ ...partidaEditDraft, monto: e.target.value })}
                        className={inputClassName}
                        placeholder="Monto"
                      />
                      <AutocompleteSelect
                        value={partidaEditDraft.centroCostoCajaId}
                        onChange={(v) => setPartidaEditDraft({ ...partidaEditDraft, centroCostoCajaId: v })}
                        options={centroOptions}
                        placeholder="Centro de costo..."
                        className={inputClassName}
                      />
                      <AutocompleteSelect
                        value={partidaEditDraft.funcionGastoCajaId}
                        onChange={(v) => setPartidaEditDraft({ ...partidaEditDraft, funcionGastoCajaId: v })}
                        options={funcionOptions}
                        placeholder="Función de gasto..."
                        className={inputClassName}
                      />
                      <AutocompleteSelect
                        value={partidaEditDraft.cuentaContableCajaId}
                        onChange={(v) => setPartidaEditDraft({ ...partidaEditDraft, cuentaContableCajaId: v })}
                        options={cuentaOptions}
                        placeholder="Cuenta contable..."
                        className={inputClassName}
                      />
                      <select
                        value={partidaEditDraft.categoriaRendicion}
                        onChange={(e) => setPartidaEditDraft({ ...partidaEditDraft, categoriaRendicion: e.target.value as CategoriaRendicionGasto | "" })}
                        className={inputClassName}
                      >
                        <option value="">Categoría del reporte...</option>
                        {Object.entries(CATEGORIA_RENDICION_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={handleSavePartida}
                        disabled={updatePartidaMutation.isPending}
                        className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                      >
                        {updatePartidaMutation.isPending ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPartidaId(null);
                          setPartidaEditDraft(null);
                        }}
                        className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={p.id} className="group">
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5">{p.descripcion}</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">{formatMoneda(Number(p.montoPresupuestado))}</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">{formatMoneda(p.totalGastado ?? 0)}</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right font-semibold">{formatMoneda(p.saldoAFavor ?? 0)}</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">{(p.porcentajeEjecucion ?? 0).toFixed(1)}%</td>
                  <td className="border border-[var(--color-border-soft)] px-2 py-1.5 text-right">
                    {yaAsignado ? null : (
                      <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleStartEditPartida(p)}
                          className="rounded p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                          title="Editar partida"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePartida(p.id)}
                          className="rounded p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                          title="Eliminar partida"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            )}
            {partidas.length === 0 ? (
              <tr><td colSpan={6} className="border border-[var(--color-border-soft)] py-2 text-center text-[var(--color-on-surface-variant)]">Sin partidas todavía.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function PresupuestoCajaPage() {
  const { showError, showSuccess } = useToast();
  const now = new Date();

  const cajasQuery = useCajasChicasQuery();
  const cajas = cajasQuery.data?.data ?? [];
  const cuentasBancariasQuery = useCuentasBancariasCajaQuery();
  const cuentasBancarias = cuentasBancariasQuery.data?.data ?? [];
  const centrosQuery = useCentrosCostoCajaQuery();
  const funcionesQuery = useFuncionesGastoCajaQuery();
  const cuentasContablesQuery = useCuentasContablesCajaQuery();
  const centros = centrosQuery.data?.data.filter((c) => c.parentId !== null) ?? [];
  const funciones = funcionesQuery.data?.data.filter((f) => f.parentId !== null) ?? [];
  const cuentasContables = cuentasContablesQuery.data?.data ?? [];
  const centroOptions = useMemo(
    () => centros.map((c) => ({ id: String(c.id), label: `${c.codigo} · ${c.nombre}`, searchText: c.codigo })),
    [centros]
  );
  const funcionOptions = useMemo(
    () => funciones.map((f) => ({ id: String(f.id), label: `${f.codigo} · ${f.nombre}`, searchText: f.codigo })),
    [funciones]
  );
  const cuentaOptions = useMemo(
    () => cuentasContables.map((c) => ({ id: String(c.id), label: `${c.codigo} · ${c.nombre}`, searchText: c.codigo })),
    [cuentasContables]
  );

  const [cajaId, setCajaId] = useState("");
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [nombreNuevaRemesa, setNombreNuevaRemesa] = useState("");
  const [plantillaId, setPlantillaId] = useState("");

  useEffect(() => {
    if (!cajaId && cajas.length > 0) setCajaId(String(encontrarCajaLipena(cajas)?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajas]);

  const periodoLabel = `${MESES_NOMBRE[mes - 1]} ${anio}`;

  const presupuestosQuery = usePresupuestosCajaQuery({
    cajaId: cajaId ? Number(cajaId) : undefined,
    anio,
    mes
  });
  const presupuestos = presupuestosQuery.data?.data ?? [];

  // Todas las plantillas posibles: cualquier remesa ya creada para esta
  // caja, sin importar el mes (así se puede traer una de meses anteriores).
  const plantillasQuery = usePresupuestosCajaQuery({ cajaId: cajaId ? Number(cajaId) : undefined });
  const plantillas = plantillasQuery.data?.data ?? [];

  // Para el total del período (todas las remesas juntas) y el export,
  // reutiliza el listado plano de partidas por caja/año/mes.
  const partidasDelPeriodoQuery = usePartidasPresupuestoCajaQuery({
    cajaId: cajaId ? Number(cajaId) : undefined,
    anio,
    mes
  });
  const partidasDelPeriodo = partidasDelPeriodoQuery.data?.data ?? [];
  const totalPresupuestado = partidasDelPeriodo.reduce((sum, p) => sum + Number(p.montoPresupuestado), 0);

  const createRemesaMutation = useCreatePresupuestoCajaMutation();
  const duplicarMutation = useDuplicarPresupuestoCajaMutation();

  function handleCreateRemesa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cajaId) {
      showError("Elige una caja primero.");
      return;
    }
    createRemesaMutation.mutate(
      { cajaId: Number(cajaId), anio, mes, nombre: nombreNuevaRemesa },
      {
        onSuccess: () => {
          showSuccess("Remesa creada.");
          setNombreNuevaRemesa("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la remesa."))
      }
    );
  }

  function handleUsarPlantilla() {
    if (!plantillaId) {
      showError("Elige qué remesa usar como plantilla.");
      return;
    }
    duplicarMutation.mutate(
      { id: Number(plantillaId), payload: { anio, mes } },
      {
        onSuccess: (response) => {
          showSuccess(`"${response.data.nombre}" creada en ${periodoLabel} con las mismas partidas.`);
          setPlantillaId("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo duplicar la remesa."))
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
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <Wallet size={18} />
          </div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">Presupuesto</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Cada mes puede tener varias remesas de presupuesto independientes (ej. "Remesa Presupuesto
              Octubre", "Remesa para pago de salarios", "Remesa para pago de varios"), cada una con sus
              propias partidas de detalle (Internet, sueldos, etc.). Cada remesa se aprueba y se asigna a
              un banco una sola vez.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-secondary)]/16 text-[var(--color-secondary)]">
            <ListFilter size={14} />
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface)]">
            Filtrar por caja y período
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select value={cajaId} onChange={(e) => setCajaId(e.target.value)} className={inputClassName}>
            <option value="">Elige una caja</option>
            {cajas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={inputClassName}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={inputClassName}>
            {MESES_NOMBRE.map((nombre, index) => (
              <option key={nombre} value={index + 1}>{nombre}</option>
            ))}
          </select>
        </div>
      </article>

      <article className="rounded-xl border-2 border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/[0.07] p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-tertiary)]/20 text-[var(--color-tertiary)]">
            <History size={14} />
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-tertiary)]">
            Usar una remesa anterior como plantilla
          </h3>
        </div>
        <p className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
          Trae la estructura de una remesa ya creada (de este mes o de uno anterior) hacia {periodoLabel},
          con las mismas partidas para no tener que volver a escribirlas — puedes ajustar los montos después.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)} className={`${inputClassName} w-auto flex-1`}>
            <option value="">Elige una remesa como plantilla...</option>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre} ({MESES_NOMBRE[p.mes - 1]} {p.anio})</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleUsarPlantilla}
            disabled={duplicarMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-tertiary)]/50 bg-[var(--color-tertiary)]/12 px-3 py-2 text-xs font-semibold text-[var(--color-tertiary)] transition hover:bg-[var(--color-tertiary)]/20 disabled:opacity-60"
          >
            {duplicarMutation.isPending ? "Creando..." : `Duplicar en ${periodoLabel}`}
          </button>
        </div>
      </article>

      <article className="rounded-xl border-2 border-[var(--color-primary)]/45 bg-[var(--color-primary)]/[0.07] p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
            <Plus size={14} />
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-primary)]">
            Nueva remesa de {periodoLabel}
          </h3>
        </div>
        <form className="flex flex-wrap items-center gap-2" onSubmit={handleCreateRemesa}>
          <input
            required
            value={nombreNuevaRemesa}
            onChange={(e) => setNombreNuevaRemesa(e.target.value)}
            className={`${inputClassName} w-auto flex-1`}
            placeholder='Nombre (ej. "Remesa para pago de salarios")'
          />
          <button
            type="submit"
            disabled={createRemesaMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            {createRemesaMutation.isPending ? "Creando..." : "Crear remesa"}
          </button>
        </form>
      </article>

      {partidasDelPeriodo.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-[var(--color-success)]/45 bg-[var(--color-success)]/[0.08] p-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-success)]">Total Presupuesto de {periodoLabel}</span>
            <p className="font-mono text-2xl font-extrabold text-[var(--color-on-surface)]">{formatMoneda(totalPresupuestado)}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => exportPlanillaControlPagosExcel(partidasDelPeriodo, periodoLabel)} className={buttonSecondaryClassName}>
              <FileSpreadsheet size={13} /> Exportar Excel
            </button>
            <button type="button" onClick={() => exportPlanillaControlPagosPdf(partidasDelPeriodo, periodoLabel)} className={buttonSecondaryClassName}>
              <FileText size={13} /> Exportar PDF
            </button>
          </div>
        </div>
      ) : null}

      {presupuestosQuery.isLoading ? (
        <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando remesas...</p>
      ) : presupuestos.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5 text-sm text-[var(--color-on-surface-variant)]">
          Sin remesas creadas para {periodoLabel} todavía. Crea una arriba, o duplica una anterior como plantilla.
        </p>
      ) : (
        <>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
            Remesas de {periodoLabel} ({presupuestos.length})
          </h3>
          {presupuestos.map((p) => (
            <RemesaCard
              key={p.id}
              presupuesto={p}
              cuentasBancarias={cuentasBancarias}
              centroOptions={centroOptions}
              funcionOptions={funcionOptions}
              cuentaOptions={cuentaOptions}
            />
          ))}
        </>
      )}
    </section>
  );
}
