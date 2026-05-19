import { FormEvent, useMemo, useState } from "react";
import { PackageCheck, Plus, Search } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useRegisterMutation } from "@/features/auth/hooks/useRegisterMutation";
import { useUsersListQuery } from "@/features/auth/hooks/useUsersManagement";
import {
  useCentrosCostoQuery,
  useCreateCuentaMutation,
  useCuentasQuery,
  useFuncionesGastoQuery,
  useSectoresQuery
} from "@/features/contabilidad/hooks/useContabilidad";
import {
  useProductosQuery,
  useUpdateProductoMutation
} from "@/features/productos/hooks/useProductos";
import {
  useCreateValeMutation,
  useEntregarValeMutation,
  useProductosPorUsuarioQuery,
  useResumenSolicitantesQuery,
  useValesQuery
} from "@/features/vales/hooks/useVales";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

interface ValeDraftItem {
  id: number;
  productoId: string;
  cantidadSolicitada: string;
  cuentaId: string;
}

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function estadoValeClassName(estado: string) {
  if (estado === "ENTREGADO" || estado === "COMPLETADO") {
    return "border-[var(--color-success)]/35 bg-[var(--color-success)]/18 text-[var(--color-success)]";
  }
  if (estado === "APROBADO" || estado === "PARCIAL") {
    return "border-[var(--color-tertiary)]/35 bg-[var(--color-tertiary)]/18 text-[var(--color-tertiary)]";
  }
  return "border-[var(--color-warning)]/35 bg-[var(--color-warning)]/18 text-[var(--color-warning)]";
}

export function ValesPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const canUseFlow =
    user?.role === "ADMIN" || user?.role === "SUPERINTENDENTE" || user?.role === "ALMACENERO";

  const usersQuery = useUsersListQuery();
  const productosQuery = useProductosQuery({ page: 1, limit: 500, search: "" });
  const cuentasQuery = useCuentasQuery();
  const centrosCostoQuery = useCentrosCostoQuery();
  const funcionesGastoQuery = useFuncionesGastoQuery();
  const sectoresQuery = useSectoresQuery();
  const valesQuery = useValesQuery({ page: 1, limit: 200 });
  const resumenSolicitantesQuery = useResumenSolicitantesQuery(canUseFlow);

  const createValeMutation = useCreateValeMutation();
  const entregarValeMutation = useEntregarValeMutation();
  const updateProductoMutation = useUpdateProductoMutation();
  const registerMutation = useRegisterMutation();
  const createCuentaMutation = useCreateCuentaMutation();

  const [historialUserId, setHistorialUserId] = useState("");
  const [historialProductoFilter, setHistorialProductoFilter] = useState("");
  const [solicitanteCreateId, setSolicitanteCreateId] = useState("");
  const [isCreateWorkerModalOpen, setIsCreateWorkerModalOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [isCreateCuentaModalOpen, setIsCreateCuentaModalOpen] = useState(false);
  const [targetDraftItemIdForCuenta, setTargetDraftItemIdForCuenta] = useState<number | null>(null);
  const [centroCostoCreateId, setCentroCostoCreateId] = useState("");
  const [funcionGastoCreateId, setFuncionGastoCreateId] = useState("");
  const [sectorCreateId, setSectorCreateId] = useState("");
  const [draftItems, setDraftItems] = useState<ValeDraftItem[]>([
    { id: 1, productoId: "", cantidadSolicitada: "1", cuentaId: "" }
  ]);
  const [nextDraftItemId, setNextDraftItemId] = useState(2);

  const productosPorUsuarioQuery = useProductosPorUsuarioQuery(
    historialUserId ? Number(historialUserId) : null,
    canUseFlow
  );

  const usuarios = usersQuery.data?.data ?? [];
  const productos = productosQuery.data?.data ?? [];
  const cuentas = cuentasQuery.data?.data ?? [];
  const centrosCosto = centrosCostoQuery.data?.data ?? [];
  const funcionesGasto = funcionesGastoQuery.data?.data ?? [];
  const sectores = sectoresQuery.data?.data ?? [];
  const vales = valesQuery.data?.data ?? [];

  const usuarioOptions = useMemo(
    () =>
      usuarios.map((item) => ({
        id: String(item.id),
        label: `${item.nombre} (${item.role})`,
        searchText: `${item.nombre} ${item.role} ${item.email ?? ""} ${item.id}`
      })),
    [usuarios]
  );

  const productoOptions = useMemo(
    () =>
      productos.map((producto) => ({
        id: String(producto.id),
        label: `${producto.codigo} - ${producto.nombre} (${producto.unidad}) - stock: ${producto.stock.cantidad}`,
        searchText: `${producto.codigo} ${producto.nombre} ${producto.unidad}`
      })),
    [productos]
  );

  const solicitantesOptions = useMemo(
    () =>
      (resumenSolicitantesQuery.data?.data ?? []).map((item) => ({
        id: String(item.usuario.id),
        label: `${item.usuario.nombre ?? "Sin nombre"} (${item.totalVales} vales)`,
        searchText: `${item.usuario.nombre ?? ""} ${item.usuario.email ?? ""} ${item.usuario.id}`
      })),
    [resumenSolicitantesQuery.data?.data]
  );
  const centroCostoOptions = useMemo(
    () =>
      centrosCosto.map((item) => ({
        id: String(item.id),
        label: `${item.codigo} - ${item.nombre}`,
        searchText: `${item.codigo} ${item.nombre}`
      })),
    [centrosCosto]
  );
  const funcionGastoOptions = useMemo(
    () =>
      funcionesGasto.map((item) => ({
        id: String(item.id),
        label: `${item.codigo} - ${item.nombre}`,
        searchText: `${item.codigo} ${item.nombre}`
      })),
    [funcionesGasto]
  );
  const sectorOptions = useMemo(
    () =>
      sectores.map((item) => ({
        id: String(item.id),
        label: `${item.codigo} - ${item.nombre}`,
        searchText: `${item.codigo} ${item.nombre}`
      })),
    [sectores]
  );

  const productosHistoricosFiltrados = useMemo(() => {
    const rows = productosPorUsuarioQuery.data?.data.productos ?? [];
    const q = historialProductoFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) =>
      `${item.codigo ?? ""} ${item.nombre ?? ""} ${item.unidad ?? ""}`.toLowerCase().includes(q)
    );
  }, [productosPorUsuarioQuery.data?.data.productos, historialProductoFilter]);

  const valesRecientes = useMemo(
    () =>
      [...vales].sort((a, b) => {
        const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return right - left;
      }),
    [vales]
  );

  function addDraftItem() {
    setDraftItems((current) => [
      ...current,
      { id: nextDraftItemId, productoId: "", cantidadSolicitada: "1", cuentaId: "" }
    ]);
    setNextDraftItemId((current) => current + 1);
  }

  function updateDraftItem(id: number, patch: Partial<ValeDraftItem>) {
    setDraftItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function removeDraftItem(id: number) {
    setDraftItems((current) =>
      current.length <= 1 ? current : current.filter((item) => item.id !== id)
    );
  }

  function handleDraftProductChange(id: number, productoId: string) {
    const producto = productos.find((item) => String(item.id) === productoId);
    updateDraftItem(id, {
      productoId,
      cuentaId: producto?.cuentaId ? String(producto.cuentaId) : ""
    });
  }

  function buildRandomCredentials() {
    const seed = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
    const email = `trabajador.${seed}@marte.local`;
    const password = `Tm!${seed}Aa9`;
    return { email, password };
  }

  function handleCreateWorkerQuick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nombre = newWorkerName.trim();
    if (nombre.length < 2) {
      showError("Ingresa al menos 2 caracteres para el nombre.");
      return;
    }

    const { email, password } = buildRandomCredentials();
    registerMutation.mutate(
      {
        nombre,
        email,
        password,
        role: "TRABAJADOR"
      },
      {
        onSuccess: (response) => {
          const createdId = response.data?.id;
          if (createdId) {
            setSolicitanteCreateId(String(createdId));
          }
          setNewWorkerName("");
          setIsCreateWorkerModalOpen(false);
          showSuccess(`Trabajador creado: ${response.data.nombre}`);
        },
        onError: (error) => {
          showError(normalizeError(error, "No se pudo crear el trabajador."));
        }
      }
    );
  }

  function openCreateCuentaModal(draftItemId: number) {
    setTargetDraftItemIdForCuenta(draftItemId);
    setCentroCostoCreateId("");
    setFuncionGastoCreateId("");
    setSectorCreateId("");
    setIsCreateCuentaModalOpen(true);
  }

  function closeCreateCuentaModal() {
    setIsCreateCuentaModalOpen(false);
    setTargetDraftItemIdForCuenta(null);
    setCentroCostoCreateId("");
    setFuncionGastoCreateId("");
    setSectorCreateId("");
  }

  function buildCuentaCodigoCompleto(centroId: number, funcionId: number, sectorId: number) {
    const centro = centrosCosto.find((item) => item.id === centroId);
    const funcion = funcionesGasto.find((item) => item.id === funcionId);
    const sector = sectores.find((item) => item.id === sectorId);
    return `${centro?.codigo ?? centroId}-${funcion?.codigo ?? funcionId}-${sector?.codigo ?? sectorId}`;
  }

  function handleCreateCuentaQuick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const centroCostoId = Number(centroCostoCreateId);
    const funcionGastoId = Number(funcionGastoCreateId);
    const sectorId = Number(sectorCreateId);
    if (!centroCostoId || !funcionGastoId || !sectorId) {
      showError("Selecciona centro de costo, función de gasto y área/sector.");
      return;
    }
    const codigoCompleto = buildCuentaCodigoCompleto(centroCostoId, funcionGastoId, sectorId);
    createCuentaMutation.mutate(
      { codigoCompleto, centroCostoId, funcionGastoId, sectorId },
      {
        onSuccess: (response) => {
          if (targetDraftItemIdForCuenta !== null) {
            updateDraftItem(targetDraftItemIdForCuenta, { cuentaId: String(response.data.id) });
          }
          showSuccess("Cuenta contable creada y seleccionada.");
          closeCreateCuentaModal();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la cuenta contable."))
      }
    );
  }

  async function ensureProductoCuenta(productoId: number, cuentaId: number) {
    const producto = productos.find((item) => item.id === productoId);
    if (!producto) return;
    if (producto.cuentaId === cuentaId) return;
    await updateProductoMutation.mutateAsync({
      id: productoId,
      payload: { cuentaId }
    });
  }

  async function handleCreateAndDeliverVale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const solicitanteId = Number(solicitanteCreateId);
    if (!solicitanteId) {
      showError("Debes seleccionar el trabajador solicitante.");
      return;
    }

    const parsedItems = draftItems.map((item) => ({
      productoId: Number(item.productoId),
      cantidadSolicitada: Number(item.cantidadSolicitada),
      cuentaId: Number(item.cuentaId)
    }));

    if (
      parsedItems.some(
        (item) =>
          !item.productoId ||
          !item.cantidadSolicitada ||
          item.cantidadSolicitada <= 0 ||
          !item.cuentaId
      )
    ) {
      showError("Completa producto, cantidad y cuenta contable en todos los ítems.");
      return;
    }

    try {
      for (const item of parsedItems) {
        await ensureProductoCuenta(item.productoId, item.cuentaId);
      }

      const created = await createValeMutation.mutateAsync({
        solicitanteId,
        items: parsedItems.map((item) => ({
          productoId: item.productoId,
          cantidadSolicitada: item.cantidadSolicitada
        }))
      });

      const cantidadesEntregadas = Object.fromEntries(
        (created.data.items ?? []).map((item) => [item.id, Number(item.cantidadSolicitada)])
      );

      const delivered = await entregarValeMutation.mutateAsync({
        id: created.data.id,
        payload: { cantidadesEntregadas }
      });

      showSuccess(`Vale ${delivered.data.vale.id} creado y entregado automáticamente.`);
      setSolicitanteCreateId("");
      setDraftItems([{ id: 1, productoId: "", cantidadSolicitada: "1", cuentaId: "" }]);
      setNextDraftItemId(2);
    } catch (error) {
      showError(normalizeError(error, "No se pudo registrar y entregar el vale."));
    }
  }

  if (!canUseFlow && user?.role) {
    return (
      <section className="space-y-6 text-[var(--color-on-surface)]">
        <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
          <SubrouteBackButton />
          <h1 className="mt-4 font-headline text-3xl font-extrabold">Flujo de vales físicos</h1>
          <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
            No tienes permisos. Roles permitidos: ADMIN, SUPERINTENDENTE, ALMACENERO.
          </p>
        </header>
      </section>
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
            <PackageCheck size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Flujo de vales físicos</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              1) Revisión histórica del solicitante. 2) Aprobación física con firma. 3) Registro y
              entrega inmediata en sistema.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Search size={16} className="text-[var(--color-primary)]" />
          Revisión histórica por solicitante
        </h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <AutocompleteSelect
            value={historialUserId}
            onChange={setHistorialUserId}
            options={solicitantesOptions}
            placeholder="Selecciona solicitante"
            className={inputClassName}
          />
          <input
            value={historialProductoFilter}
            onChange={(event) => setHistorialProductoFilter(event.target.value)}
            className={inputClassName}
            placeholder="Filtrar producto/código"
          />
        </div>
        <div className="mt-3 table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Producto
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Veces
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Cantidad total
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Última vez
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Último estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {productosHistoricosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-3 text-xs text-[var(--color-on-surface-variant)]"
                  >
                    Sin datos para el solicitante/filtro.
                  </td>
                </tr>
              ) : (
                productosHistoricosFiltrados.map((item) => (
                  <tr key={`${item.productoId}-${item.ultimoValeId ?? "na"}`}>
                    <td className="px-3 py-2 text-xs">
                      {item.codigo ?? "-"} - {item.nombre ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">{item.vecessolicitado}</td>
                    <td className="px-3 py-2 text-xs">{item.cantidadTotal}</td>
                    <td className="px-3 py-2 text-xs">
                      {item.ultimaFecha ? new Date(item.ultimaFecha).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">{item.ultimoEstado ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Plus size={16} className="text-[var(--color-primary)]" />
          Registro en almacén (crear + entregar inmediato)
        </h2>
        <form className="space-y-3" onSubmit={handleCreateAndDeliverVale}>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Trabajador solicitante
            </label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
              <AutocompleteSelect
                value={solicitanteCreateId}
                onChange={setSolicitanteCreateId}
                options={usuarioOptions}
                placeholder="Buscar por nombre o código"
                className={inputClassName}
              />
              <button
                type="button"
                onClick={() => setIsCreateWorkerModalOpen(true)}
                className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
              >
                Nuevo trabajador
              </button>
            </div>
          </div>

          {draftItems.map((item, index) => (
            <div
              key={item.id}
              className="grid grid-cols-1 gap-2 rounded-lg bg-[var(--color-surface-container-high)] p-3 md:grid-cols-[1fr_130px_1fr_auto_auto]"
            >
              <AutocompleteSelect
                value={item.productoId}
                onChange={(nextValue) => handleDraftProductChange(item.id, nextValue)}
                options={productoOptions}
                placeholder={`Producto #${index + 1}`}
                className={inputClassName}
              />
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={item.cantidadSolicitada}
                onChange={(event) =>
                  updateDraftItem(item.id, { cantidadSolicitada: event.target.value })
                }
                className={inputClassName}
                placeholder="Cantidad"
              />
              <select
                value={item.cuentaId}
                onChange={(event) => updateDraftItem(item.id, { cuentaId: event.target.value })}
                className={inputClassName}
              >
                <option value="">Cuenta contable</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.codigoCompleto} - {cuenta.centroCosto.nombre}/
                    {cuenta.funcionGasto.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openCreateCuentaModal(item.id)}
                className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
              >
                Nueva cuenta
              </button>
              <button
                type="button"
                onClick={() => removeDraftItem(item.id)}
                className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
              >
                Quitar
              </button>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addDraftItem}
              className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
            >
              Agregar item
            </button>
            <button
              type="submit"
              disabled={
                createValeMutation.isPending ||
                entregarValeMutation.isPending ||
                updateProductoMutation.isPending
              }
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createValeMutation.isPending ||
              entregarValeMutation.isPending ||
              updateProductoMutation.isPending
                ? "Procesando..."
                : "Registrar y entregar vale"}
            </button>
          </div>
        </form>
      </article>

      {isCreateWorkerModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <h3 className="text-lg font-bold">Crear trabajador rápido</h3>
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
              Solo ingresa nombre y presiona Enter.
            </p>
            <form className="mt-3 space-y-3" onSubmit={handleCreateWorkerQuick}>
              <input
                autoFocus
                value={newWorkerName}
                onChange={(event) => setNewWorkerName(event.target.value)}
                className={inputClassName}
                placeholder="Nombre completo"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateWorkerModalOpen(false);
                    setNewWorkerName("");
                  }}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
                >
                  {registerMutation.isPending ? "Creando..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isCreateCuentaModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <h3 className="text-lg font-bold">Crear cuenta contable rápida</h3>
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
              Selecciona centro de costo, función de gasto y área/sector.
            </p>
            <form className="mt-3 space-y-3" onSubmit={handleCreateCuentaQuick}>
              <AutocompleteSelect
                value={centroCostoCreateId}
                onChange={setCentroCostoCreateId}
                options={centroCostoOptions}
                placeholder="Centro de costo (código o nombre)"
                className={inputClassName}
              />
              <AutocompleteSelect
                value={funcionGastoCreateId}
                onChange={setFuncionGastoCreateId}
                options={funcionGastoOptions}
                placeholder="Función de gasto (código o nombre)"
                className={inputClassName}
              />
              <AutocompleteSelect
                value={sectorCreateId}
                onChange={setSectorCreateId}
                options={sectorOptions}
                placeholder="Área / Sector (código o nombre)"
                className={inputClassName}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateCuentaModal}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createCuentaMutation.isPending}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
                >
                  {createCuentaMutation.isPending ? "Creando..." : "Crear y seleccionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 text-lg font-bold">Vales recientes</h2>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Estado
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Solicitante
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {valesRecientes.slice(0, 12).map((vale) => (
                <tr key={vale.id}>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${estadoValeClassName(vale.estado)}`}
                    >
                      {vale.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {vale.solicitante?.nombre ?? vale.solicitanteId ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {vale.createdAt ? new Date(vale.createdAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
              {valesRecientes.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-3 text-xs text-[var(--color-on-surface-variant)]"
                  >
                    Sin vales registrados.
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
