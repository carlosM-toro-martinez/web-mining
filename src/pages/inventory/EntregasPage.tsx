import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, PackageCheck, Plus, Search, X } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useUsersListQuery } from "@/features/auth/hooks/useUsersManagement";
import { useCuentasQuery } from "@/features/contabilidad/hooks/useContabilidad";
import { useCreateSalidaManualMutation } from "@/features/movimientos/hooks/useMovimientos";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import {
  useAprobarValeMutation,
  useEntregarValeMutation,
  useValesQuery,
  useValeQuery
} from "@/features/vales/hooks/useVales";
import type { Vale } from "@/features/vales/model/vales.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

type EstadoListado = "ACTIVOS" | "TODOS" | "CON_COMPLETADOS";

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function isEstadoEntregable(estado: Vale["estado"]) {
  return estado === "APROBADO" || estado === "PARCIAL";
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

function formatDimensionValue(
  value: { codigo?: string | null; nombre?: string | null } | null | undefined
) {
  if (!value) return "No definido";
  const codigo = value.codigo?.trim();
  const nombre = value.nombre?.trim();
  if (codigo && nombre) return `${codigo} - ${nombre}`;
  return codigo ?? nombre ?? "No definido";
}

export function EntregasPage() {
  const { user, isAdmin, isSuperintendente } = useAuth();
  const canApprove = isSuperintendente || isAdmin;
  const canDeliver =
    user?.role === "ALMACENERO" || user?.role === "ADMIN" || user?.role === "RECEPCIONISTA";
  const { showError, showSuccess } = useToast();

  const usersQuery = useUsersListQuery();
  const valesQuery = useValesQuery();
  const aprobarValeMutation = useAprobarValeMutation();
  const entregarValeMutation = useEntregarValeMutation();

  const productosQuery = useProductosQuery({ page: 1, limit: 300, search: "" });
  const cuentasQuery = useCuentasQuery();
  const createSalidaMutation = useCreateSalidaManualMutation();

  const [estadoListado, setEstadoListado] = useState<EstadoListado>("ACTIVOS");
  const [solicitanteFilter, setSolicitanteFilter] = useState("");
  const [valesPage, setValesPage] = useState(1);
  const [valeIdInput, setValeIdInput] = useState("");
  const [valeIdActivo, setValeIdActivo] = useState("");
  const [cantidadesEntregadas, setCantidadesEntregadas] = useState<Record<string, string>>({});
  const [manualModalOpen, setManualModalOpen] = useState(false);

  const valeQuery = useValeQuery(valeIdActivo);
  const vale = valeQuery.data?.data;
  const usuarios = usersQuery.data?.data ?? [];
  const vales = valesQuery.data?.data ?? [];
  const productos = productosQuery.data?.data ?? [];
  const cuentas = cuentasQuery.data?.data ?? [];

  const [salidaProductoId, setSalidaProductoId] = useState("");
  const [salidaCantidad, setSalidaCantidad] = useState("1");
  const [salidaCuentaId, setSalidaCuentaId] = useState("");
  const [salidaUsuarioEntregaId, setSalidaUsuarioEntregaId] = useState(user?.id ? String(user.id) : "");
  const [salidaUsuarioRecibidoId, setSalidaUsuarioRecibidoId] = useState("");

  const valesPageSize = 8;
  const valesOrdenados = useMemo(
    () =>
      [...vales].sort((a, b) => {
        const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return right - left;
      }),
    [vales]
  );

  const valesFiltrados = useMemo(
    () =>
      valesOrdenados.filter((valeItem) => {
        const sameSolicitante = solicitanteFilter
          ? String(valeItem.solicitanteId ?? "") === solicitanteFilter
          : true;

        if (!sameSolicitante) return false;

        if (estadoListado === "TODOS") return true;
        if (estadoListado === "CON_COMPLETADOS") {
          return valeItem.estado === "COMPLETADO";
        }
        return ["PENDIENTE", "APROBADO", "PARCIAL"].includes(valeItem.estado);
      }),
    [estadoListado, solicitanteFilter, valesOrdenados]
  );

  const totalValesPages = Math.max(1, Math.ceil(valesFiltrados.length / valesPageSize));
  const valesPaginados = useMemo(() => {
    const start = (valesPage - 1) * valesPageSize;
    return valesFiltrados.slice(start, start + valesPageSize);
  }, [valesFiltrados, valesPage]);

  const solicitantesConVales = useMemo(
    () =>
      usuarios.filter((usuarioItem) =>
        vales.some((valeItem) => String(valeItem.solicitanteId ?? "") === String(usuarioItem.id))
      ),
    [usuarios, vales]
  );

  const solicitanteFilterOptions = useMemo(
    () =>
      solicitantesConVales.map((usuarioItem) => ({
        id: String(usuarioItem.id),
        label: usuarioItem.nombre,
        searchText: `${usuarioItem.nombre} ${usuarioItem.role}`
      })),
    [solicitantesConVales]
  );

  const entregaControl = useMemo(() => {
    if (!vale) {
      return {
        hasPositive: false,
        hasError: false,
        messages: {} as Record<string, string>
      };
    }

    const messages: Record<string, string> = {};
    let hasPositive = false;
    let hasError = false;

    for (const item of vale.items) {
      const pending = Math.max(item.cantidadSolicitada - (item.cantidadEntregada ?? 0), 0);
      const stockDisponible = Number(item.producto?.stock?.cantidad ?? 0);
      const stock = Number.isFinite(stockDisponible) ? stockDisponible : 0;
      const value = Number(cantidadesEntregadas[item.id] ?? 0);

      if (Number.isNaN(value) || value < 0) {
        messages[item.id] = "Cantidad invalida.";
        hasError = true;
        continue;
      }
      if (value > pending) {
        messages[item.id] = "No puedes entregar mas de lo pendiente.";
        hasError = true;
      } else if (value > stock) {
        messages[item.id] = "Stock insuficiente para entregar esa cantidad.";
        hasError = true;
      }
      if (value > 0) hasPositive = true;
    }

    return { hasPositive, hasError, messages };
  }, [vale, cantidadesEntregadas]);

  const selectedSalidaProduct = useMemo(
    () => productos.find((producto) => producto.id === Number(salidaProductoId)),
    [productos, salidaProductoId]
  );
  const selectedSalidaCuenta = useMemo(
    () => cuentas.find((cuenta) => cuenta.id === Number(salidaCuentaId)),
    [cuentas, salidaCuentaId]
  );
  const salidaStockDisponible = Number(selectedSalidaProduct?.stock?.cantidad ?? 0);
  const productoOptions = useMemo(
    () =>
      productos.map((producto) => ({
        id: String(producto.id),
        label: `${producto.codigo} - ${producto.nombre} (${producto.unidad}) - stock: ${producto.stock.cantidad}`,
        searchText: `${producto.codigo} ${producto.nombre} ${producto.unidad}`
      })),
    [productos]
  );
  const usuarioOptions = useMemo(
    () =>
      usuarios.map((usuarioItem) => ({
        id: String(usuarioItem.id),
        label: `${usuarioItem.nombre} (${usuarioItem.role})`,
        searchText: `${usuarioItem.nombre} ${usuarioItem.role} ${usuarioItem.email ?? ""}`
      })),
    [usuarios]
  );

  useEffect(() => {
    setValesPage(1);
  }, [estadoListado, solicitanteFilter]);

  useEffect(() => {
    if (valesPage > totalValesPages) {
      setValesPage(totalValesPages);
    }
  }, [totalValesPages, valesPage]);

  useEffect(() => {
    if (!vale) return;
    const values: Record<string, string> = {};
    vale.items.forEach((item) => {
      const pendiente = Math.max(item.cantidadSolicitada - (item.cantidadEntregada ?? 0), 0);
      values[item.id] = String(pendiente);
    });
    setCantidadesEntregadas(values);
  }, [vale]);

  function handleBuscarVale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = valeIdInput.trim();
    if (!trimmed) {
      showError("Ingresa el ID del vale.");
      return;
    }
    setValeIdActivo(trimmed);
  }

  function handleAprobarVale() {
    if (!vale || !user?.id) return;
    aprobarValeMutation.mutate(
      { id: vale.id, payload: { superintendenteId: user.id } },
      {
        onSuccess: () => showSuccess("Vale aprobado correctamente."),
        onError: (error) => showError(normalizeError(error, "No se pudo aprobar el vale."))
      }
    );
  }

  function handleEntregarVale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vale) return;

    const payload: Record<string, number> = {};
    let hasPositive = false;

    for (const item of vale.items) {
      const pending = Math.max(item.cantidadSolicitada - (item.cantidadEntregada ?? 0), 0);
      const stockDisponible = Number(item.producto?.stock?.cantidad ?? 0);
      const stock = Number.isFinite(stockDisponible) ? stockDisponible : 0;
      const value = Number(cantidadesEntregadas[item.id] ?? 0);

      if (Number.isNaN(value) || value < 0) {
        showError("Las cantidades entregadas deben ser numeros mayores o iguales a cero.");
        return;
      }
      if (value > pending) {
        showError("No puedes entregar mas de lo pendiente para un item.");
        return;
      }
      if (value > stock) {
        showError("Stock insuficiente para una o mas cantidades entregadas.");
        return;
      }

      payload[item.id] = value;
      if (value > 0) hasPositive = true;
    }

    if (!hasPositive) {
      showError("Debes entregar al menos un item con cantidad mayor a cero.");
      return;
    }

    entregarValeMutation.mutate(
      { id: vale.id, payload: { cantidadesEntregadas: payload } },
      {
        onSuccess: (response) => {
          showSuccess(
            `Entrega registrada. Estado: ${response.data.vale.estado}. Movimientos: ${response.data.movimientos.length}.`
          );
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar la entrega."))
      }
    );
  }

  function handleSalidaProductChange(value: string) {
    setSalidaProductoId(value);
    const found = productos.find((producto) => producto.id === Number(value));
    setSalidaCuentaId(found?.cuentaId ? String(found.cuentaId) : "");
  }

  function closeManualModal() {
    setManualModalOpen(false);
  }

  function handleEntregaSinVale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      productoId: Number(salidaProductoId),
      cantidad: Number(salidaCantidad),
      cuentaId: salidaCuentaId ? Number(salidaCuentaId) : undefined,
      usuarioEntregaId: Number(salidaUsuarioEntregaId),
      usuarioRecibidoId: Number(salidaUsuarioRecibidoId),
      referencia: "ENTREGA_SIN_VALE"
    };

    if (
      !payload.productoId ||
      !payload.cantidad ||
      payload.cantidad <= 0 ||
      !payload.usuarioEntregaId ||
      !payload.usuarioRecibidoId
    ) {
      showError("Completa todos los campos obligatorios de la salida manual.");
      return;
    }
    if (!payload.cuentaId) {
      showError("Selecciona una cuenta contable para registrar la salida.");
      return;
    }
    if (selectedSalidaProduct && payload.cantidad > salidaStockDisponible) {
      showError(
        `No puedes sacar mas de ${salidaStockDisponible} ${selectedSalidaProduct.unidad} del stock disponible.`
      );
      return;
    }

    createSalidaMutation.mutate(payload, {
      onSuccess: () => {
        showSuccess("Entrega sin vale registrada correctamente.");
        setSalidaCantidad("1");
        setSalidaProductoId("");
        setSalidaCuentaId("");
        setSalidaUsuarioRecibidoId("");
        closeManualModal();
      },
      onError: (error) =>
        showError(normalizeError(error, "No se pudo registrar la entrega sin vale."))
    });
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
              <PackageCheck size={18} />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-extrabold">Entregas de almacen</h1>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Lista operativa de vales para aprobar y entregar material.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setManualModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            <Plus size={14} />
            Entrega sin vale
          </button>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 text-lg font-bold">Vales para entrega</h2>
        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <select
            value={estadoListado}
            onChange={(event) => setEstadoListado(event.target.value as EstadoListado)}
            className={inputClassName}
          >
            <option value="ACTIVOS">Pendientes y aprobados (incluye parciales)</option>
            <option value="CON_COMPLETADOS">Solo completados</option>
            <option value="TODOS">Todos los estados</option>
          </select>
          <AutocompleteSelect
            value={solicitanteFilter}
            onChange={setSolicitanteFilter}
            options={solicitanteFilterOptions}
            placeholder="Filtrar por solicitante"
            className={inputClassName}
          />
          <button
            type="button"
            onClick={() => {
              setEstadoListado("ACTIVOS");
              setSolicitanteFilter("");
            }}
            className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
          >
            Limpiar filtros
          </button>
        </div>

        {valesQuery.isLoading ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando vales...</p>
        ) : null}
        {valesQuery.isError ? (
          <p className="text-sm text-[var(--color-error)]">No se pudo cargar la lista de vales.</p>
        ) : null}
        {!valesQuery.isLoading && !valesQuery.isError && valesFiltrados.length === 0 ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            No hay vales para esos filtros.
          </p>
        ) : null}

        {valesFiltrados.length > 0 ? (
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
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Accion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {valesPaginados.map((valeItem) => (
                  <tr key={valeItem.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${estadoValeClassName(valeItem.estado)}`}
                      >
                        {valeItem.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {valeItem.solicitante?.nombre ?? valeItem.solicitanteId ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {valeItem.createdAt ? new Date(valeItem.createdAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setValeIdInput(valeItem.id);
                          setValeIdActivo(valeItem.id);
                        }}
                        className="rounded-md border border-[var(--color-primary)]/45 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                Pagina {valesPage} de {totalValesPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setValesPage((current) => Math.max(1, current - 1))}
                  disabled={valesPage <= 1}
                  className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setValesPage((current) => Math.min(totalValesPages, current + 1))}
                  disabled={valesPage >= totalValesPages}
                  className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Search size={16} className="text-[var(--color-primary)]" />
          Buscar y gestionar vale
        </h2>
        <form className="mb-3 flex gap-2" onSubmit={handleBuscarVale}>
          <input
            value={valeIdInput}
            onChange={(event) => setValeIdInput(event.target.value)}
            className={inputClassName}
            placeholder="ID del vale"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            Buscar
          </button>
        </form>

        {valeQuery.isLoading ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando vale...</p>
        ) : null}
        {valeQuery.isError ? (
          <p className="text-sm text-[var(--color-error)]">No se pudo cargar el vale solicitado.</p>
        ) : null}

        {vale ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-[var(--color-surface-container-high)] p-3">
              <p className="mt-1 text-xs">
                Estado:{" "}
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${estadoValeClassName(vale.estado)}`}
                >
                  {vale.estado}
                </span>
              </p>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Solicitante: {vale.solicitante?.nombre ?? vale.solicitanteId ?? "-"}
              </p>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Fecha: {vale.createdAt ? new Date(vale.createdAt).toLocaleString() : "-"}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Items solicitados
              </h3>
              {vale.items.map((item) => {
                const pendiente = Math.max(item.cantidadSolicitada - (item.cantidadEntregada ?? 0), 0);
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3"
                  >
                    <p className="text-sm font-semibold">
                      {item.producto?.nombre ?? `Producto #${item.productoId}`}
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md bg-[var(--color-surface-container-highest)] px-2 py-2">
                        <span className="block text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                          Solicitado
                        </span>
                        <span className="font-semibold">{item.cantidadSolicitada}</span>
                      </div>
                      <div className="rounded-md bg-[var(--color-surface-container-highest)] px-2 py-2">
                        <span className="block text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                          Entregado
                        </span>
                        <span className="font-semibold">{item.cantidadEntregada ?? 0}</span>
                      </div>
                      <div className="rounded-md bg-[var(--color-surface-container-highest)] px-2 py-2">
                        <span className="block text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                          Pendiente
                        </span>
                        <span className="font-semibold">{pendiente}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {canApprove && vale.estado === "PENDIENTE" ? (
              <button
                type="button"
                onClick={handleAprobarVale}
                disabled={aprobarValeMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-tertiary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-tertiary)] disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                {aprobarValeMutation.isPending ? "Aprobando..." : "Aprobar vale"}
              </button>
            ) : null}

            {canDeliver && isEstadoEntregable(vale.estado) ? (
              <form className="space-y-3" onSubmit={handleEntregarVale}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Entrega por item
                </h3>
                {vale.items.map((item) => {
                  const pendiente = Math.max(item.cantidadSolicitada - (item.cantidadEntregada ?? 0), 0);
                  const stockDisponible = Number(item.producto?.stock?.cantidad ?? 0);
                  const stock = Number.isFinite(stockDisponible) ? stockDisponible : 0;
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 gap-2 rounded-lg bg-[var(--color-surface-container-high)] p-3 md:grid-cols-[1fr_120px_120px]"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {item.producto?.nombre ?? `Producto #${item.productoId}`}
                        </p>
                        <p className="text-xs text-[var(--color-on-surface-variant)]">
                          Solicitado: {item.cantidadSolicitada} | Entregado: {item.cantidadEntregada ?? 0} |
                          Pendiente: {pendiente} | Stock: {stock}
                        </p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cantidadesEntregadas[item.id] ?? "0"}
                        onChange={(event) =>
                          setCantidadesEntregadas((current) => ({
                            ...current,
                            [item.id]: event.target.value
                          }))
                        }
                        className={inputClassName}
                      />
                      <div className="flex items-center text-xs text-[var(--color-on-surface-variant)]">
                        {entregaControl.messages[item.id] ? (
                          <span className="font-semibold text-[var(--color-error)]">
                            {entregaControl.messages[item.id]}
                          </span>
                        ) : (
                          "Cantidad valida"
                        )}
                      </div>
                    </div>
                  );
                })}
                <button
                  type="submit"
                  disabled={
                    entregarValeMutation.isPending || !entregaControl.hasPositive || entregaControl.hasError
                  }
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                >
                  {entregarValeMutation.isPending ? "Registrando..." : "Registrar entrega"}
                </button>
              </form>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            Busca un vale por ID para aprobarlo o registrarle una entrega.
          </p>
        )}
      </article>

      {manualModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
          <article className="w-full max-w-2xl rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-extrabold">Entrega sin vale</h3>
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  Registra una salida manual cuando no existe solicitud por vale.
                </p>
              </div>
              <button
                type="button"
                onClick={closeManualModal}
                className="rounded-md border border-[var(--color-outline-variant)] p-2 text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleEntregaSinVale}>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Producto
                </label>
                <AutocompleteSelect
                  value={salidaProductoId}
                  onChange={handleSalidaProductChange}
                  options={productoOptions}
                  placeholder="Selecciona producto"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Cantidad a entregar
                </label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={salidaCantidad}
                  onChange={(event) => setSalidaCantidad(event.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Cuenta contable
                </label>
                <select
                  required
                  value={salidaCuentaId}
                  onChange={(event) => setSalidaCuentaId(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona cuenta</option>
                  {cuentas.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.codigoCompleto} - {cuenta.centroCosto.nombre} / {cuenta.funcionGasto.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] p-3">
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  Centro de costo: {formatDimensionValue(selectedSalidaCuenta?.centroCosto)}
                </p>
                <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                  Funcion de gasto: {formatDimensionValue(selectedSalidaCuenta?.funcionGasto)}
                </p>
                <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                  Area / Sector: {formatDimensionValue(selectedSalidaCuenta?.sector)}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Usuario que entrega
                </label>
                <AutocompleteSelect
                  value={salidaUsuarioEntregaId}
                  onChange={setSalidaUsuarioEntregaId}
                  options={usuarioOptions}
                  placeholder="Selecciona usuario"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Usuario que recibe
                </label>
                <AutocompleteSelect
                  value={salidaUsuarioRecibidoId}
                  onChange={setSalidaUsuarioRecibidoId}
                  options={usuarioOptions}
                  placeholder="Selecciona usuario"
                  className={inputClassName}
                />
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Stock disponible:{" "}
                {selectedSalidaProduct
                  ? `${selectedSalidaProduct.stock.cantidad} ${selectedSalidaProduct.unidad}`
                  : "-"}
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeManualModal}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createSalidaMutation.isPending}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                >
                  {createSalidaMutation.isPending ? "Registrando..." : "Registrar entrega"}
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : null}
    </section>
  );
}
