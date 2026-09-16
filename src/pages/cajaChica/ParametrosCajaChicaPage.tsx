import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, Banknote, Check, FolderTree, Landmark, ListTree, Pencil, Percent, PiggyBank, RotateCcw, Search, Trash2, X } from "lucide-react";
import {
  useCajasChicasQuery,
  useCentrosCostoCajaQuery,
  useConceptosRetencionCajaQuery,
  useCreateCajaChicaMutation,
  useCreateCentroCostoCajaMutation,
  useCreateConceptoRetencionCajaMutation,
  useCreateCuentaContableCajaMutation,
  useCreateFuncionGastoCajaMutation,
  useCreateCuentaBancariaCajaMutation,
  useCuentasContablesCajaQuery,
  useCuentasBancariasCajaQuery,
  useDeleteCajaChicaMutation,
  useDeleteCentroCostoCajaMutation,
  useDeleteCuentaContableCajaMutation,
  useDeleteFuncionGastoCajaMutation,
  useDeleteCuentaBancariaCajaMutation,
  useFuncionesGastoCajaQuery,
  useResetTransaccionalCajaChicaMutation,
  useUpdateCajaChicaMutation,
  useUpdateCentroCostoCajaMutation,
  useUpdateConceptoRetencionCajaMutation,
  useUpdateCuentaContableCajaMutation,
  useUpdateFuncionGastoCajaMutation
} from "@/features/parametrosCajaChica/hooks/useParametrosCajaChica";
import type {
  CajaChica,
  CentroCostoCaja,
  ClaseCuentaCaja,
  ConceptoRetencionCaja,
  CuentaContableCaja,
  CuentaBancariaCaja,
  FuncionGastoCaja,
  MonedaCaja,
  TipoCosteoCaja,
  TipoRetencionCaja
} from "@/features/parametrosCajaChica/model/parametrosCajaChica.schema";
import { useAuth } from "@/features/auth/context/AuthContext";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const CONFIRMACION_REINICIO = "REINICIAR TODO";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] invalid:border-[var(--color-error)] invalid:ring-1 invalid:ring-[var(--color-error)]/30";

const MAX_ROWS = 12;

const TIPO_RETENCION_LABEL: Record<TipoRetencionCaja, string> = {
  RC_IVA: "RC-IVA (servicios)",
  IUE_COMPRAS: "IUE (compras)",
  IT: "IT"
};

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function includesText(value: string | undefined, search: string) {
  return value?.toLowerCase().includes(search.toLowerCase()) ?? false;
}

export function ParametrosCajaChicaPage() {
  const { showError, showSuccess } = useToast();
  const { isAdmin } = useAuth();

  // --- Queries ---
  const cajasQuery = useCajasChicasQuery();
  const centrosQuery = useCentrosCostoCajaQuery();
  const funcionesQuery = useFuncionesGastoCajaQuery();
  const cuentasQuery = useCuentasContablesCajaQuery();
  const retencionesQuery = useConceptosRetencionCajaQuery();
  const cuentasBancariasQuery = useCuentasBancariasCajaQuery();

  const cajas = cajasQuery.data?.data ?? [];
  const centros = centrosQuery.data?.data ?? [];
  const funciones = funcionesQuery.data?.data ?? [];
  const cuentas = cuentasQuery.data?.data ?? [];
  const retenciones = retencionesQuery.data?.data ?? [];
  const cuentasBancarias = cuentasBancariasQuery.data?.data ?? [];

  // --- Mutations ---
  const createCajaMutation = useCreateCajaChicaMutation();
  const updateCajaMutation = useUpdateCajaChicaMutation();
  const deleteCajaMutation = useDeleteCajaChicaMutation();

  const createCentroMutation = useCreateCentroCostoCajaMutation();
  const updateCentroMutation = useUpdateCentroCostoCajaMutation();
  const deleteCentroMutation = useDeleteCentroCostoCajaMutation();

  const createFuncionMutation = useCreateFuncionGastoCajaMutation();
  const updateFuncionMutation = useUpdateFuncionGastoCajaMutation();
  const deleteFuncionMutation = useDeleteFuncionGastoCajaMutation();

  const createCuentaMutation = useCreateCuentaContableCajaMutation();
  const deleteCuentaMutation = useDeleteCuentaContableCajaMutation();

  const createRetencionMutation = useCreateConceptoRetencionCajaMutation();
  const updateRetencionMutation = useUpdateConceptoRetencionCajaMutation();

  const createCuentaBancariaMutation = useCreateCuentaBancariaCajaMutation();
  const deleteCuentaBancariaMutation = useDeleteCuentaBancariaCajaMutation();
  const resetTransaccionalMutation = useResetTransaccionalCajaChicaMutation();

  // --- Reinicio total (solo ADMIN) ---
  const [confirmacionReinicio, setConfirmacionReinicio] = useState("");

  // --- Caja chica form ---
  const [cajaCodigo, setCajaCodigo] = useState("");
  const [cajaNombre, setCajaNombre] = useState("");
  const [cajaMoneda, setCajaMoneda] = useState<MonedaCaja>("BOB");
  const [cajaSaldoInicial, setCajaSaldoInicial] = useState("0");
  const [cajaSearch, setCajaSearch] = useState("");
  const [editingCajaId, setEditingCajaId] = useState<number | null>(null);
  const [editCajaCodigo, setEditCajaCodigo] = useState("");
  const [editCajaNombre, setEditCajaNombre] = useState("");

  // --- Centro de costo form ---
  const [centroCodigo, setCentroCodigo] = useState("");
  const [centroNombre, setCentroNombre] = useState("");
  const [centroParentId, setCentroParentId] = useState("");
  const [centroSearch, setCentroSearch] = useState("");

  // --- Función de gasto form ---
  const [funcionCodigo, setFuncionCodigo] = useState("");
  const [funcionNombre, setFuncionNombre] = useState("");
  const [funcionTipo, setFuncionTipo] = useState<TipoCosteoCaja>("DISTRIBUIBLE");
  const [funcionParentId, setFuncionParentId] = useState("");
  const [funcionSearch, setFuncionSearch] = useState("");

  // --- Cuenta contable form ---
  const [cuentaCodigo, setCuentaCodigo] = useState("");
  const [cuentaNombre, setCuentaNombre] = useState("");
  const [cuentaClase, setCuentaClase] = useState<ClaseCuentaCaja>("MAY");
  const [cuentaNivel, setCuentaNivel] = useState("2");
  const [cuentaMonedaCodigo, setCuentaMonedaCodigo] = useState("A");
  const [cuentaSearch, setCuentaSearch] = useState("");

  // --- Retención (edición de porcentaje) ---
  const [editingRetencionId, setEditingRetencionId] = useState<number | null>(null);
  const [editRetencionPorcentaje, setEditRetencionPorcentaje] = useState("");

  // --- Cuenta bancaria ---
  const [bancoNombre, setBancoNombre] = useState("");
  const [bancoNumeroCuenta, setBancoNumeroCuenta] = useState("");
  const [bancoNombreCuenta, setBancoNombreCuenta] = useState("");
  const [bancoMonedaBase, setBancoMonedaBase] = useState<MonedaCaja>("BOB");
  const [bancoSaldoInicial, setBancoSaldoInicial] = useState("0");

  const centrosRaiz = useMemo(() => centros.filter((c) => c.parentId === null), [centros]);
  const funcionesRaiz = useMemo(() => funciones.filter((f) => f.parentId === null), [funciones]);

  const cajasFiltradas = useMemo(
    () => cajas.filter((c) => includesText(c.codigo, cajaSearch) || includesText(c.nombre, cajaSearch)).slice(0, MAX_ROWS),
    [cajas, cajaSearch]
  );
  const centrosFiltrados = useMemo(
    () => centros.filter((c) => includesText(c.codigo, centroSearch) || includesText(c.nombre, centroSearch)).slice(0, MAX_ROWS),
    [centros, centroSearch]
  );
  const funcionesFiltradas = useMemo(
    () => funciones.filter((f) => includesText(f.codigo, funcionSearch) || includesText(f.nombre, funcionSearch)).slice(0, MAX_ROWS),
    [funciones, funcionSearch]
  );
  const cuentasFiltradas = useMemo(
    () => cuentas.filter((c) => includesText(c.codigo, cuentaSearch) || includesText(c.nombre, cuentaSearch)).slice(0, MAX_ROWS),
    [cuentas, cuentaSearch]
  );

  function handleCreateCaja(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCajaMutation.mutate(
      { codigo: cajaCodigo, nombre: cajaNombre, monedaBase: cajaMoneda, saldoInicial: Number(cajaSaldoInicial) || 0 },
      {
        onSuccess: () => {
          showSuccess("Caja chica creada.");
          setCajaCodigo("");
          setCajaNombre("");
          setCajaSaldoInicial("0");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la caja chica."))
      }
    );
  }

  function startEditCaja(caja: CajaChica) {
    setEditingCajaId(caja.id);
    setEditCajaCodigo(caja.codigo);
    setEditCajaNombre(caja.nombre);
  }

  function handleSaveCaja(id: number) {
    updateCajaMutation.mutate(
      { id, payload: { codigo: editCajaCodigo, nombre: editCajaNombre } },
      {
        onSuccess: () => {
          showSuccess("Caja actualizada.");
          setEditingCajaId(null);
        },
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar la caja."))
      }
    );
  }

  function handleDeleteCaja(id: number) {
    deleteCajaMutation.mutate(id, {
      onSuccess: () => showSuccess("Caja eliminada."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar la caja."))
    });
  }

  function handleCreateCentro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCentroMutation.mutate(
      { codigo: centroCodigo, nombre: centroNombre, parentId: centroParentId ? Number(centroParentId) : null },
      {
        onSuccess: () => {
          showSuccess("Centro de costo creado.");
          setCentroCodigo("");
          setCentroNombre("");
          setCentroParentId("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear el centro de costo."))
      }
    );
  }

  function handleDeleteCentro(id: number) {
    deleteCentroMutation.mutate(id, {
      onSuccess: () => showSuccess("Centro de costo eliminado."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar el centro de costo."))
    });
  }

  function handleCreateFuncion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createFuncionMutation.mutate(
      {
        codigo: funcionCodigo,
        nombre: funcionNombre,
        tipo: funcionTipo,
        parentId: funcionParentId ? Number(funcionParentId) : null
      },
      {
        onSuccess: () => {
          showSuccess("Función de gasto creada.");
          setFuncionCodigo("");
          setFuncionNombre("");
          setFuncionParentId("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la función de gasto."))
      }
    );
  }

  function handleDeleteFuncion(id: number) {
    deleteFuncionMutation.mutate(id, {
      onSuccess: () => showSuccess("Función de gasto eliminada."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar la función de gasto."))
    });
  }

  function handleCreateCuenta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCuentaMutation.mutate(
      {
        codigo: cuentaCodigo,
        nombre: cuentaNombre,
        clase: cuentaClase,
        nivel: Number(cuentaNivel),
        monedaCodigo: cuentaMonedaCodigo
      },
      {
        onSuccess: () => {
          showSuccess("Cuenta contable creada.");
          setCuentaCodigo("");
          setCuentaNombre("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la cuenta contable."))
      }
    );
  }

  function handleDeleteCuenta(id: number) {
    deleteCuentaMutation.mutate(id, {
      onSuccess: () => showSuccess("Cuenta contable eliminada."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar la cuenta. Puede estar en uso por un concepto de retención."))
    });
  }

  function startEditRetencion(item: ConceptoRetencionCaja) {
    setEditingRetencionId(item.id);
    setEditRetencionPorcentaje(String(item.porcentaje));
  }

  function handleSaveRetencion(id: number) {
    updateRetencionMutation.mutate(
      { id, payload: { porcentaje: Number(editRetencionPorcentaje) } },
      {
        onSuccess: () => {
          showSuccess("Tasa de retención actualizada.");
          setEditingRetencionId(null);
        },
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar la tasa."))
      }
    );
  }

  function handleCreateCuentaBancaria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCuentaBancariaMutation.mutate(
      {
        banco: bancoNombre,
        numeroCuenta: bancoNumeroCuenta.trim() || undefined,
        nombreCuenta: bancoNombreCuenta,
        monedaBase: bancoMonedaBase,
        saldoInicial: Number(bancoSaldoInicial) || 0
      },
      {
        onSuccess: () => {
          showSuccess("Cuenta bancaria creada.");
          setBancoNombre("");
          setBancoNumeroCuenta("");
          setBancoNombreCuenta("");
          setBancoSaldoInicial("0");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la cuenta bancaria."))
      }
    );
  }

  function handleDeleteCuentaBancaria(id: number) {
    deleteCuentaBancariaMutation.mutate(id, {
      onSuccess: () => showSuccess("Cuenta bancaria eliminada."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar: puede tener movimientos registrados."))
    });
  }

  function handleResetTransaccional() {
    resetTransaccionalMutation.mutate(undefined, {
      onSuccess: () => {
        showSuccess("Se reiniciaron todos los registros. Las cajas, cuentas bancarias y catálogos se conservaron.");
        setConfirmacionReinicio("");
      },
      onError: (error) => showError(normalizeError(error, "No se pudo reiniciar los registros."))
    });
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-tertiary)]/16 p-2.5 text-[var(--color-tertiary)]">
            <PiggyBank size={18} />
          </div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">Parámetros de Caja Chica</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Configuración de una sola vez: cajas y cuentas bancarias (con su saldo inicial), centros de
              costo, funciones de gasto, cuentas contables y tasas de retención. ¿Buscas crear el
              presupuesto del mes? Eso está en "Presupuesto".
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Caja chica */}
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <PiggyBank size={16} className="text-[var(--color-primary)]" />
            Cajas chicas
          </h3>
          <form className="space-y-3" onSubmit={handleCreateCaja}>
            <input required value={cajaCodigo} onChange={(e) => setCajaCodigo(e.target.value)} className={`${inputClassName} font-mono`} placeholder="Código (ej. 10.003.000)" />
            <input required value={cajaNombre} onChange={(e) => setCajaNombre(e.target.value)} className={inputClassName} placeholder="Nombre" />
            <select value={cajaMoneda} onChange={(e) => setCajaMoneda(e.target.value as MonedaCaja)} className={inputClassName}>
              <option value="BOB">Bolivianos (BOB)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
                Saldo inicial (cuánto había en esta caja al empezar a usar el sistema)
              </label>
              <input type="number" min="0" step="0.01" value={cajaSaldoInicial} onChange={(e) => setCajaSaldoInicial(e.target.value)} className={inputClassName} placeholder="0.00" />
            </div>
            <button type="submit" disabled={createCajaMutation.isPending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
              {createCajaMutation.isPending ? "Guardando..." : "Guardar caja"}
            </button>
          </form>
          <div className="relative mt-4">
            <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
            <input value={cajaSearch} onChange={(e) => setCajaSearch(e.target.value)} className={`${inputClassName} pl-7`} placeholder="Buscar caja" />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {cajasFiltradas.map((item) =>
              editingCajaId === item.id ? (
                <div key={item.id} className="space-y-2 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 px-3 py-2">
                  <input value={editCajaCodigo} onChange={(e) => setEditCajaCodigo(e.target.value)} className={`${inputClassName} font-mono`} />
                  <input value={editCajaNombre} onChange={(e) => setEditCajaNombre(e.target.value)} className={inputClassName} />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleSaveCaja(item.id)} className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)]">
                      <Check size={12} /> Guardar
                    </button>
                    <button type="button" onClick={() => setEditingCajaId(null)} className="flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold">
                      <X size={12} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="group flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                  <div>
                    <p className="font-mono text-xs">{item.codigo}</p>
                    <p>{item.nombre} <span className="text-[10px] text-[var(--color-on-surface-variant)]">({item.monedaBase})</span></p>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)]">Saldo inicial: {Number(item.saldoInicial).toFixed(2)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                    <button type="button" onClick={() => startEditCaja(item)} className="rounded p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"><Pencil size={14} /></button>
                    <button type="button" onClick={() => handleDeleteCaja(item.id)} className="rounded p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            )}
          </div>
        </article>

        {/* Centro de costo */}
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <FolderTree size={16} className="text-[var(--color-primary)]" />
            Centros de costo
          </h3>
          <form className="space-y-3" onSubmit={handleCreateCentro}>
            <input required value={centroCodigo} onChange={(e) => setCentroCodigo(e.target.value)} className={`${inputClassName} font-mono`} placeholder="Código" />
            <input required value={centroNombre} onChange={(e) => setCentroNombre(e.target.value)} className={inputClassName} placeholder="Nombre" />
            <select value={centroParentId} onChange={(e) => setCentroParentId(e.target.value)} className={inputClassName}>
              <option value="">Sin grupo (raíz)</option>
              {centrosRaiz.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>
              ))}
            </select>
            <button type="submit" disabled={createCentroMutation.isPending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
              {createCentroMutation.isPending ? "Guardando..." : "Guardar centro"}
            </button>
          </form>
          <div className="relative mt-4">
            <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
            <input value={centroSearch} onChange={(e) => setCentroSearch(e.target.value)} className={`${inputClassName} pl-7`} placeholder="Buscar centro" />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {centrosFiltrados.map((item: CentroCostoCaja) => (
              <div key={item.id} className="group flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                <div>
                  <p className="font-mono text-xs">{item.codigo}</p>
                  <p>{item.nombre}</p>
                  {item.parent ? <p className="text-[10px] text-[var(--color-on-surface-variant)]">bajo {item.parent.nombre}</p> : null}
                </div>
                <button type="button" onClick={() => handleDeleteCentro(item.id)} className="rounded p-1 text-[var(--color-error)] opacity-0 transition hover:bg-[var(--color-error)]/10 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </article>

        {/* Función de gasto */}
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <ListTree size={16} className="text-[var(--color-primary)]" />
            Funciones de gasto
          </h3>
          <form className="space-y-3" onSubmit={handleCreateFuncion}>
            <input required value={funcionCodigo} onChange={(e) => setFuncionCodigo(e.target.value)} className={`${inputClassName} font-mono`} placeholder="Código" />
            <input required value={funcionNombre} onChange={(e) => setFuncionNombre(e.target.value)} className={inputClassName} placeholder="Nombre" />
            <select value={funcionTipo} onChange={(e) => setFuncionTipo(e.target.value as TipoCosteoCaja)} className={inputClassName}>
              <option value="DISTRIBUIBLE">Distribuible</option>
              <option value="NO_DISTRIBUIBLE">No distribuible</option>
            </select>
            <select value={funcionParentId} onChange={(e) => setFuncionParentId(e.target.value)} className={inputClassName}>
              <option value="">Sin grupo (raíz)</option>
              {funcionesRaiz.map((f) => (
                <option key={f.id} value={f.id}>{f.codigo} · {f.nombre}</option>
              ))}
            </select>
            <button type="submit" disabled={createFuncionMutation.isPending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
              {createFuncionMutation.isPending ? "Guardando..." : "Guardar función"}
            </button>
          </form>
          <div className="relative mt-4">
            <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
            <input value={funcionSearch} onChange={(e) => setFuncionSearch(e.target.value)} className={`${inputClassName} pl-7`} placeholder="Buscar función" />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {funcionesFiltradas.map((item: FuncionGastoCaja) => (
              <div key={item.id} className="group flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                <div>
                  <p className="font-mono text-xs">{item.codigo}</p>
                  <p>{item.nombre}</p>
                  <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                    {item.tipo === "DISTRIBUIBLE" ? "Distribuible" : "No distribuible"}
                    {item.parent ? ` · bajo ${item.parent.nombre}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => handleDeleteFuncion(item.id)} className="rounded p-1 text-[var(--color-error)] opacity-0 transition hover:bg-[var(--color-error)]/10 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* Cuentas contables */}
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Landmark size={16} className="text-[var(--color-primary)]" />
          Cuentas contables de caja
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
          <form className="space-y-3" onSubmit={handleCreateCuenta}>
            <input required value={cuentaCodigo} onChange={(e) => setCuentaCodigo(e.target.value)} className={`${inputClassName} font-mono`} placeholder="Código (ej. 69.001.000)" />
            <input required value={cuentaNombre} onChange={(e) => setCuentaNombre(e.target.value)} className={inputClassName} placeholder="Nombre" />
            <div className="grid grid-cols-3 gap-2">
              <select value={cuentaClase} onChange={(e) => setCuentaClase(e.target.value as ClaseCuentaCaja)} className={inputClassName}>
                <option value="BAL">BAL</option>
                <option value="IND">IND</option>
                <option value="MAY">MAY</option>
              </select>
              <input type="number" min="1" value={cuentaNivel} onChange={(e) => setCuentaNivel(e.target.value)} className={inputClassName} placeholder="Nivel" />
              <input value={cuentaMonedaCodigo} onChange={(e) => setCuentaMonedaCodigo(e.target.value.toUpperCase())} maxLength={1} className={inputClassName} placeholder="A/B" />
            </div>
            <button type="submit" disabled={createCuentaMutation.isPending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
              {createCuentaMutation.isPending ? "Guardando..." : "Guardar cuenta"}
            </button>
          </form>
          <div>
            <div className="relative mb-3">
              <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
              <input value={cuentaSearch} onChange={(e) => setCuentaSearch(e.target.value)} className={`${inputClassName} pl-7`} placeholder="Buscar cuenta" />
            </div>
            <div className="space-y-2 text-sm">
              {cuentasFiltradas.map((item: CuentaContableCaja) => (
                <div key={item.id} className="group flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                  <div>
                    <p className="font-mono text-xs">{item.codigo}</p>
                    <p>{item.nombre}</p>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                      {item.clase} · nivel {item.nivel} · moneda {item.monedaCodigo}
                      {item.requiereCentroCosto ? " · requiere centro de costo" : ""}
                      {item.requiereFuncionGasto ? " · requiere función de gasto" : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => handleDeleteCuenta(item.id)} className="rounded p-1 text-[var(--color-error)] opacity-0 transition hover:bg-[var(--color-error)]/10 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>

      {/* Conceptos de retención */}
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <Percent size={16} className="text-[var(--color-primary)]" />
          Tasas de retención tributaria
        </h3>
        <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
          Estas tasas alimentan el motor tributario automático al registrar cada gasto. Ajusta el
          porcentaje aquí si tu contador confirma un valor distinto — nunca hace falta tocar código.
        </p>
        <div className="space-y-2 text-sm">
          {retenciones.map((item: ConceptoRetencionCaja) =>
            editingRetencionId === item.id ? (
              <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 px-3 py-2">
                <span className="font-semibold">{TIPO_RETENCION_LABEL[item.codigo]}</span>
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={editRetencionPorcentaje}
                  onChange={(e) => setEditRetencionPorcentaje(e.target.value)}
                  className={`${inputClassName} w-28`}
                />
                <span>%</span>
                <button type="button" onClick={() => handleSaveRetencion(item.id)} className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)]">
                  <Check size={12} /> Guardar
                </button>
                <button type="button" onClick={() => setEditingRetencionId(null)} className="flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold">
                  <X size={12} /> Cancelar
                </button>
              </div>
            ) : (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                <div>
                  <p className="font-semibold">{TIPO_RETENCION_LABEL[item.codigo]} · {item.nombre}</p>
                  <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                    Se acredita a {item.cuentaContableCaja?.codigo} — {item.cuentaContableCaja?.nombre}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold">{item.porcentaje}%</span>
                  <button type="button" onClick={() => startEditRetencion(item)} className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]">
                    Editar tasa
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </article>

      {/* Cuentas bancarias */}
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <Banknote size={16} className="text-[var(--color-primary)]" />
          Cuentas bancarias
        </h3>
        <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
          Ahí llega primero el presupuesto y los sueldos, antes de sacarse hacia la caja chica por
          cheque o transferencia.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
          <form className="space-y-3" onSubmit={handleCreateCuentaBancaria}>
            <input required value={bancoNombre} onChange={(e) => setBancoNombre(e.target.value)} className={inputClassName} placeholder="Banco (ej. Mercantil Santa Cruz)" />
            <input value={bancoNumeroCuenta} onChange={(e) => setBancoNumeroCuenta(e.target.value)} className={inputClassName} placeholder="N° de cuenta (opcional)" />
            <input required value={bancoNombreCuenta} onChange={(e) => setBancoNombreCuenta(e.target.value)} className={inputClassName} placeholder="Nombre de la cuenta (ej. Cuenta Marte SRL)" />
            <select value={bancoMonedaBase} onChange={(e) => setBancoMonedaBase(e.target.value as MonedaCaja)} className={inputClassName}>
              <option value="BOB">Bolivianos (BOB)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
                Saldo inicial (cuánto había en esta cuenta al empezar a usar el sistema)
              </label>
              <input type="number" min="0" step="0.01" value={bancoSaldoInicial} onChange={(e) => setBancoSaldoInicial(e.target.value)} className={inputClassName} placeholder="0.00" />
            </div>
            <button type="submit" disabled={createCuentaBancariaMutation.isPending} className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
              {createCuentaBancariaMutation.isPending ? "Guardando..." : "Guardar cuenta bancaria"}
            </button>
          </form>
          <div className="space-y-2 text-sm">
            {cuentasBancarias.map((item: CuentaBancariaCaja) => (
              <div key={item.id} className="group flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
                <div>
                  <p className="font-semibold">{item.banco} · {item.nombreCuenta}</p>
                  <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                    {item.numeroCuenta ? `N° ${item.numeroCuenta} · ` : ""}{item.monedaBase} · Saldo inicial: {Number(item.saldoInicial).toFixed(2)}
                  </p>
                </div>
                <button type="button" onClick={() => handleDeleteCuentaBancaria(item.id)} className="rounded p-1 text-[var(--color-error)] opacity-0 transition hover:bg-[var(--color-error)]/10 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {cuentasBancarias.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Aún no hay cuentas bancarias.</p> : null}
          </div>
        </div>
      </article>

      {isAdmin ? (
        <article className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error)]/6 p-5">
          <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-[var(--color-error)]">
            <AlertTriangle size={16} />
            Reiniciar todos los registros
          </h3>
          <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
            Borra permanentemente todos los gastos, movimientos de fondo y de banco, partidas de
            presupuesto y rendiciones — de <strong>todas</strong> las cajas. Las cajas, cuentas
            bancarias y catálogos (centros de costo, funciones de gasto, cuentas contables, tasas de
            retención) no se tocan. Solo visible para el rol ADMIN, y no se puede deshacer.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={confirmacionReinicio}
              onChange={(e) => setConfirmacionReinicio(e.target.value)}
              className={`${inputClassName} w-auto flex-1`}
              placeholder={`Escribe "${CONFIRMACION_REINICIO}" para confirmar`}
            />
            <button
              type="button"
              disabled={confirmacionReinicio !== CONFIRMACION_REINICIO || resetTransaccionalMutation.isPending}
              onClick={handleResetTransaccional}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-error)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              <RotateCcw size={14} />
              {resetTransaccionalMutation.isPending ? "Reiniciando..." : "Reiniciar todo"}
            </button>
          </div>
        </article>
      ) : null}
    </section>
  );
}
