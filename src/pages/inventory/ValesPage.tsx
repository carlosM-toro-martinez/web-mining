import { FormEvent, useMemo, useState } from "react";
import { PackageCheck, Plus, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useRegisterMutation } from "@/features/auth/hooks/useRegisterMutation";
import { useUsersListQuery } from "@/features/auth/hooks/useUsersManagement";
import { useCuentasQuery } from "@/features/contabilidad/hooks/useContabilidad";
import {
  useProductosQuery,
  useUpdateProductoMutation
} from "@/features/productos/hooks/useProductos";
import {
  useAnulacionesValesQuery,
  useAnularValeMutation,
  useCreateValeMutation,
  useEliminarValeMutation,
  useEntregarValeMutation,
  useProductosPorUsuarioQuery,
  useResumenSolicitantesQuery,
  useValesQuery
} from "@/features/vales/hooks/useVales";
import { ApiError } from "@/shared/api/core/apiError";
import { enqueueInventoryOperation } from "@/features/inventory-offline/lib/inventoryOfflineQueue";
import { applyOptimisticStockAdjustments } from "@/features/inventory-offline/lib/stockOptimistic";
import {
  useInventoryOfflinePendingCount,
  useSyncInventoryOfflineMutation
} from "@/features/inventory-offline/hooks/useInventoryOffline";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { CreateCuentaModal } from "@/shared/ui/CreateCuentaModal";
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
  const queryClient = useQueryClient();
  const canUseFlow =
    user?.role === "ADMIN" || user?.role === "SUPERINTENDENTE" || user?.role === "ALMACENERO";

  const usersQuery = useUsersListQuery();
  const productosQuery = useProductosQuery({ page: 1, limit: 5000, search: "" });
  const cuentasQuery = useCuentasQuery();
  const [filterFechaInicio, setFilterFechaInicio] = useState("");
  const [filterFechaFin, setFilterFechaFin] = useState("");

  const valesQuery = useValesQuery({
    page: 1,
    limit: 500,
    ...(filterFechaInicio ? { fechaInicio: filterFechaInicio } : {}),
    ...(filterFechaFin ? { fechaFin: filterFechaFin } : {})
  });
  const anulacionesQuery = useAnulacionesValesQuery(user?.role === "ADMIN");
  const resumenSolicitantesQuery = useResumenSolicitantesQuery(canUseFlow);

  const createValeMutation = useCreateValeMutation();
  const entregarValeMutation = useEntregarValeMutation();
  const anularValeMutation = useAnularValeMutation();
  const eliminarValeMutation = useEliminarValeMutation();
  const updateProductoMutation = useUpdateProductoMutation();
  const registerMutation = useRegisterMutation();
  const pendingOfflineQuery = useInventoryOfflinePendingCount();
  const syncOfflineMutation = useSyncInventoryOfflineMutation();

  const [historialUserId, setHistorialUserId] = useState("");
  const [historialProductoFilter, setHistorialProductoFilter] = useState("");
  const [solicitanteCreateId, setSolicitanteCreateId] = useState("");
  const [isCreateWorkerModalOpen, setIsCreateWorkerModalOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [isCreateCuentaModalOpen, setIsCreateCuentaModalOpen] = useState(false);
  const [targetDraftItemIdForCuenta, setTargetDraftItemIdForCuenta] = useState<number | null>(null);
  const [draftItems, setDraftItems] = useState<ValeDraftItem[]>([
    { id: 1, productoId: "", cantidadSolicitada: "1", cuentaId: "" }
  ]);
  const [nextDraftItemId, setNextDraftItemId] = useState(2);
  const [isAnularModalOpen, setIsAnularModalOpen] = useState(false);
  const [anularValeId, setAnularValeId] = useState("");
  const [anularMotivo, setAnularMotivo] = useState("");
  const [isEliminarModalOpen, setIsEliminarModalOpen] = useState(false);
  const [eliminarValeId, setEliminarValeId] = useState("");

  const productosPorUsuarioQuery = useProductosPorUsuarioQuery(
    historialUserId ? Number(historialUserId) : null,
    canUseFlow
  );

  const usuarios = usersQuery.data?.data ?? [];
  const productos = productosQuery.data?.data ?? [];
  const cuentas = cuentasQuery.data?.data ?? [];
  const vales = valesQuery.data?.data ?? [];
  const anulaciones = anulacionesQuery.data?.data ?? [];

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
        label: `${producto.codigo} - ${producto.nombre} (${producto.unidad}) - stock: ${producto.stock?.cantidad ?? "0"}`,
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
    setIsCreateCuentaModalOpen(true);
  }

  function closeCreateCuentaModal() {
    setIsCreateCuentaModalOpen(false);
    setTargetDraftItemIdForCuenta(null);
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

  function isCuentaContableMissingError(error: unknown) {
    const message = normalizeError(error, "").toLowerCase();
    return message.includes("cuenta contable");
  }

  function canAnularVale(estado: string) {
    return estado === "APROBADO" || estado === "PARCIAL" || estado === "COMPLETADO";
  }

  function openAnularModal(valeId: string) {
    setAnularValeId(valeId);
    setAnularMotivo("");
    setIsAnularModalOpen(true);
  }

  function openEliminarModal(valeId: string) {
    setEliminarValeId(valeId);
    setIsEliminarModalOpen(true);
  }

  function handleConfirmEliminarVale() {
    if (!eliminarValeId) return;
    eliminarValeMutation.mutate(eliminarValeId, {
      onSuccess: () => {
        showSuccess("Vale eliminado permanentemente. El stock ha sido restaurado.");
        setIsEliminarModalOpen(false);
        setEliminarValeId("");
      },
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar el vale."))
    });
  }

  function handleConfirmAnularVale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (anularMotivo.trim().length < 5) {
      showError("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    if (!anularValeId) {
      showError("No se selecciono vale para anular.");
      return;
    }
    anularValeMutation.mutate(
      { id: anularValeId, payload: { motivo: anularMotivo.trim() } },
      {
        onSuccess: () => {
          showSuccess("Vale anulado correctamente.");
          setIsAnularModalOpen(false);
          setAnularValeId("");
          setAnularMotivo("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo anular el vale."))
      }
    );
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

    const createPayload = {
      solicitanteId,
      items: parsedItems.map((item) => ({
        productoId: item.productoId,
        cantidadSolicitada: item.cantidadSolicitada
      }))
    };

    const stockAdjustments = parsedItems.map((item) => ({
      productoId: item.productoId,
      deltaCantidad: -item.cantidadSolicitada
    }));

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        applyOptimisticStockAdjustments(stockAdjustments);
        await enqueueInventoryOperation("CREATE_AND_ENTREGAR_VALE", createPayload);
        await queryClient.invalidateQueries({ queryKey: ["inventory-offline"] });
        await queryClient.invalidateQueries({ queryKey: ["productos"] });
        showSuccess("Vale encolado offline. Se creará y entregará automáticamente al reconectar.");
        setSolicitanteCreateId("");
        setDraftItems([{ id: 1, productoId: "", cantidadSolicitada: "1", cuentaId: "" }]);
        setNextDraftItemId(2);
        return;
      }

      const created = await createValeMutation.mutateAsync(createPayload);

      const cantidadesEntregadas = Object.fromEntries(
        (created.data.items ?? []).map((item) => [item.id, Number(item.cantidadSolicitada)])
      );

      let delivered;
      try {
        delivered = await entregarValeMutation.mutateAsync({
          id: created.data.id,
          payload: { cantidadesEntregadas },
          stockAdjustments
        });
      } catch (error) {
        if (!isCuentaContableMissingError(error)) {
          throw error;
        }
        const uniquePairs = Array.from(
          new Map(parsedItems.map((item) => [`${item.productoId}:${item.cuentaId}`, item])).values()
        );
        await Promise.all(uniquePairs.map((item) => ensureProductoCuenta(item.productoId, item.cuentaId)));
        delivered = await entregarValeMutation.mutateAsync({
          id: created.data.id,
          payload: { cantidadesEntregadas },
          stockAdjustments
        });
      }

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
            <button
              type="button"
              onClick={() =>
                syncOfflineMutation.mutate(undefined, {
                  onSuccess: () => showSuccess("Sincronización offline ejecutada."),
                  onError: () => showError("No se pudo ejecutar la sincronización offline.")
                })
              }
              disabled={syncOfflineMutation.isPending}
              className="mt-3 rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              Reintentar sync ({pendingOfflineQuery.data ?? 0})
            </button>
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
            maxVisibleOptions={30}
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
                maxVisibleOptions={30}
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
                maxVisibleOptions={60}
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

      <CreateCuentaModal
        isOpen={isCreateCuentaModalOpen}
        onClose={closeCreateCuentaModal}
        onCreated={(cuentaId) => {
          if (targetDraftItemIdForCuenta !== null) {
            updateDraftItem(targetDraftItemIdForCuenta, { cuentaId: String(cuentaId) });
          }
        }}
      />

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 text-lg font-bold">Vales</h2>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_1fr_auto]">
          <span className="self-center text-xs font-semibold text-[var(--color-on-surface-variant)]">
            Filtrar por fecha:
          </span>
          <input
            type="date"
            value={filterFechaInicio}
            onChange={(e) => setFilterFechaInicio(e.target.value)}
            className={inputClassName}
            placeholder="Desde"
          />
          <input
            type="date"
            value={filterFechaFin}
            onChange={(e) => setFilterFechaFin(e.target.value)}
            className={inputClassName}
            placeholder="Hasta"
          />
          <button
            type="button"
            onClick={() => { setFilterFechaInicio(""); setFilterFechaFin(""); }}
            className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
          >
            Limpiar
          </button>
        </div>
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
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Accion
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {valesRecientes.map((vale) => (
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
                  <td className="px-3 py-2 text-xs">
                    <div className="flex flex-wrap gap-1.5">
                      {canAnularVale(vale.estado) ? (
                        <button
                          type="button"
                          onClick={() => openAnularModal(vale.id)}
                          className="rounded-lg border border-[var(--color-error)]/55 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10"
                        >
                          Anular
                        </button>
                      ) : null}
                      {user?.role === "ADMIN" && canAnularVale(vale.estado) ? (
                        <button
                          type="button"
                          onClick={() => openEliminarModal(vale.id)}
                          className="rounded-lg border border-[var(--color-error)] bg-[var(--color-error)]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/20"
                        >
                          Eliminar
                        </button>
                      ) : null}
                      {!canAnularVale(vale.estado) ? (
                        <span className="text-[10px] text-[var(--color-on-surface-variant)]">
                          No aplica
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {valesRecientes.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
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

      {user?.role === "ADMIN" ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 text-lg font-bold">Auditoria de anulaciones</h2>
          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Fecha anulacion
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Vale ID
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Solicitante
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Anulado por
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Motivo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {anulaciones.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-xs">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">{item.vale?.id ?? "-"}</td>
                    <td className="px-3 py-2 text-xs">{item.vale?.solicitante?.nombre ?? "-"}</td>
                    <td className="px-3 py-2 text-xs">{item.usuario?.nombre ?? "-"}</td>
                    <td className="px-3 py-2 text-xs">{item.motivo ?? "-"}</td>
                  </tr>
                ))}
                {!anulaciones.length ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-3 text-xs text-[var(--color-on-surface-variant)]"
                    >
                      Sin anulaciones registradas.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      {isEliminarModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <h3 className="text-lg font-bold text-[var(--color-error)]">Eliminar vale permanentemente</h3>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Esta accion <strong>borra el vale completamente</strong> de la base de datos y restaura
              el stock directamente, sin crear contra-asientos. No se puede deshacer.
            </p>
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
              Solo aplica a vales no retroactivos. Si el vale tiene movimientos retroactivos, usa Anular.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setIsEliminarModalOpen(false); setEliminarValeId(""); }}
                className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminarValeMutation.isPending}
                onClick={handleConfirmEliminarVale}
                className="rounded-lg bg-[var(--color-error)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {eliminarValeMutation.isPending ? "Eliminando..." : "Confirmar eliminacion"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isAnularModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
            <h3 className="text-lg font-bold">Anular vale</h3>
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
              Esta accion crea contra-asientos y devuelve stock automaticamente.
            </p>
            <form className="mt-3 space-y-3" onSubmit={handleConfirmAnularVale}>
              <textarea
                required
                minLength={5}
                value={anularMotivo}
                onChange={(event) => setAnularMotivo(event.target.value)}
                className={`${inputClassName} min-h-24`}
                placeholder="Motivo de anulacion"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnularModalOpen(false)}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={anularValeMutation.isPending}
                  className="rounded-lg bg-[var(--color-error)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {anularValeMutation.isPending ? "Anulando..." : "Confirmar anulacion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
