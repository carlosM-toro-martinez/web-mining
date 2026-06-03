import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Lock, Plus, ShoppingCart, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useUsersListQuery } from "@/features/auth/hooks/useUsersManagement";
import { useCuentasQuery } from "@/features/contabilidad/hooks/useContabilidad";
import {
  useCierresMesQuery,
  useCreateCierreMesMutation,
  useInicializarPeriodoHistoricoMutation,
  useSaldoMensualQuery,
  useUpdateSaldoMensualByIdMutation
} from "@/features/inventario-import/hooks/useInventarioImport";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import { useCreateValeMutation, useEntregarValeMutation } from "@/features/vales/hooks/useVales";
import {
  useCreateCompraMutation,
  useRecibirCompraMutation
} from "@/features/compras/hooks/useCompras";
import { useProveedoresQuery } from "@/features/proveedores/hooks/useProveedores";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { CreateProveedorModal } from "@/shared/ui/CreateProveedorModal";
import { CreateProductoModal } from "@/shared/ui/CreateProductoModal";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

interface ValeDraftItem {
  id: number;
  productoId: string;
  cantidadSolicitada: string;
  cuentaId: string;
}

interface CompraDraftItem {
  id: number;
  productoId: string;
  cantidadPedida: string;
  precioUnit: string;
}

interface SaldoMensualDraft {
  saldoInicial: string;
  precioUnit: string;
}

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

export function ValesHistoricosPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const usersQuery = useUsersListQuery();
  const productosQuery = useProductosQuery({ page: 1, limit: 5000, search: "" });
  const cuentasQuery = useCuentasQuery();
  const cierresMesQuery = useCierresMesQuery();
  const createValeMutation = useCreateValeMutation();
  const entregarValeMutation = useEntregarValeMutation();
  const createCompraMutation = useCreateCompraMutation();
  const recibirCompraMutation = useRecibirCompraMutation();
  const createCierreMesMutation = useCreateCierreMesMutation();
  const inicializarPeriodoMutation = useInicializarPeriodoHistoricoMutation();
  const updateSaldoMensualByIdMutation = useUpdateSaldoMensualByIdMutation();
  const canUseFlow =
    user?.role === "ADMIN" || user?.role === "SUPERINTENDENTE" || user?.role === "ALMACENERO";
  const canClosePeriod = user?.role === "ADMIN" || user?.role === "SUPERINTENDENTE";

  const [solicitanteId, setSolicitanteId] = useState("");
  const [fechaOperacion, setFechaOperacion] = useState("");
  const [draftItems, setDraftItems] = useState<ValeDraftItem[]>([
    { id: 1, productoId: "", cantidadSolicitada: "1", cuentaId: "" }
  ]);
  const [nextDraftItemId, setNextDraftItemId] = useState(2);
  const [proveedorId, setProveedorId] = useState("");
  const [fechaOperacionCompra, setFechaOperacionCompra] = useState("");
  const [numeroFacturaCompra, setNumeroFacturaCompra] = useState("");
  const [compraDraftItems, setCompraDraftItems] = useState<CompraDraftItem[]>([
    { id: 1, productoId: "", cantidadPedida: "1", precioUnit: "" }
  ]);
  const [nextCompraDraftItemId, setNextCompraDraftItemId] = useState(2);
  const now = new Date();
  const [cierreAnio, setCierreAnio] = useState(String(now.getFullYear()));
  const [cierreMes, setCierreMes] = useState(String(now.getMonth() + 1));
  const [initAnio, setInitAnio] = useState(String(now.getFullYear()));
  const [initMes, setInitMes] = useState(String(now.getMonth() + 1));
  const [aperturaAnio, setAperturaAnio] = useState(String(now.getFullYear()));
  const [aperturaMes, setAperturaMes] = useState(String(now.getMonth() + 1));
  const [aperturaEnabled, setAperturaEnabled] = useState(false);
  const [saldoDraftById, setSaldoDraftById] = useState<Record<string, SaldoMensualDraft>>({});
  const [savingSaldoId, setSavingSaldoId] = useState<string | null>(null);
  const [isCreateProveedorModalOpen, setIsCreateProveedorModalOpen] = useState(false);
  const [isCreateProductoModalOpen, setIsCreateProductoModalOpen] = useState(false);
  const [saldoSearchQuery, setSaldoSearchQuery] = useState("");
  const [saldoCurrentPage, setSaldoCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const usuarios = usersQuery.data?.data ?? [];
  const productos = productosQuery.data?.data ?? [];
  const cuentas = cuentasQuery.data?.data ?? [];
  const cierres = cierresMesQuery.data?.data ?? [];
  const proveedoresQuery = useProveedoresQuery({ page: 1, limit: 500, search: undefined });
  const proveedores = proveedoresQuery.data?.data ?? [];
  const aperturaParams = useMemo(
    () => ({
      anio: Number(aperturaAnio) || now.getFullYear(),
      mes: Number(aperturaMes) || now.getMonth() + 1
    }),
    [aperturaAnio, aperturaMes, now]
  );
  const saldosPeriodoQuery = useSaldoMensualQuery(aperturaParams, aperturaEnabled);

  const filteredSaldos = useMemo(() => {
    const allSaldos = saldosPeriodoQuery.data?.data ?? [];
    if (!saldoSearchQuery.trim()) return allSaldos;
    const query = saldoSearchQuery.toLowerCase();
    return allSaldos.filter(
      (item) =>
        (item.productoCodigo ?? "").toLowerCase().includes(query) ||
        (item.productoNombre ?? "").toLowerCase().includes(query)
    );
  }, [saldosPeriodoQuery.data?.data, saldoSearchQuery]);

  const paginatedSaldos = useMemo(() => {
    const start = (saldoCurrentPage - 1) * itemsPerPage;
    return filteredSaldos.slice(start, start + itemsPerPage);
  }, [filteredSaldos, saldoCurrentPage]);

  const totalSaldoPages = useMemo(() => {
    return Math.ceil(filteredSaldos.length / itemsPerPage);
  }, [filteredSaldos.length]);

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

  const isPeriodoCerrado = useMemo(() => {
    if (!fechaOperacion) return false;
    const date = new Date(`${fechaOperacion}T00:00:00`);
    const anio = date.getFullYear();
    const mes = date.getMonth() + 1;
    return cierres.some((item) => item.anio === anio && item.mes === mes);
  }, [cierres, fechaOperacion]);
  const isPeriodoCerradoCompra = useMemo(() => {
    if (!fechaOperacionCompra) return false;
    const date = new Date(`${fechaOperacionCompra}T00:00:00`);
    const anio = date.getFullYear();
    const mes = date.getMonth() + 1;
    return cierres.some((item) => item.anio === anio && item.mes === mes);
  }, [cierres, fechaOperacionCompra]);

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

  function addCompraDraftItem() {
    setCompraDraftItems((current) => [
      ...current,
      { id: nextCompraDraftItemId, productoId: "", cantidadPedida: "1", precioUnit: "" }
    ]);
    setNextCompraDraftItemId((current) => current + 1);
  }

  function updateCompraDraftItem(id: number, patch: Partial<CompraDraftItem>) {
    setCompraDraftItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function removeCompraDraftItem(id: number) {
    setCompraDraftItems((current) =>
      current.length <= 1 ? current : current.filter((item) => item.id !== id)
    );
  }

  async function handleCreateCierreMes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const anio = Number(cierreAnio);
    const mes = Number(cierreMes);
    if (!anio || !mes) {
      showError("Debes indicar año y mes válidos.");
      return;
    }
    try {
      const response = await createCierreMesMutation.mutateAsync({ anio, mes });
      await queryClient.invalidateQueries({ queryKey: ["inventario-import", "cierre-mes"] });
      showSuccess(
        `Período ${mes}/${anio} cerrado. Saldos creados: ${response.data.saldosCreados ?? 0}, actualizados: ${response.data.saldosActualizados ?? 0}.`
      );
    } catch (error) {
      showError(normalizeError(error, "No se pudo cerrar el período mensual."));
    }
  }

  async function handleInicializarPeriodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const anio = Number(initAnio);
    const mes = Number(initMes);
    if (!anio || !mes) {
      showError("Debes indicar año y mes válidos para inicializar.");
      return;
    }
    try {
      await inicializarPeriodoMutation.mutateAsync({ anio, mes });
      await queryClient.invalidateQueries({ queryKey: ["inventario-import", "saldo-mensual"] });
      setAperturaAnio(String(anio));
      setAperturaMes(String(mes));
      setAperturaEnabled(true);
      showSuccess(
        `Período ${mes}/${anio} inicializado. Revisa y corrige saldos si hace falta antes de continuar.`
      );
    } catch (error) {
      showError(normalizeError(error, "No se pudo inicializar el período histórico."));
    }
  }

  function handleCargarSaldosPeriodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const anio = Number(aperturaAnio);
    const mes = Number(aperturaMes);
    if (!anio || !mes) {
      showError("Debes indicar año y mes válidos para listar saldos.");
      return;
    }
    setAperturaEnabled(true);
  }

  async function handleGuardarSaldoFila(id: string) {
    const draft = saldoDraftById[id];
    if (!draft) return;
    const saldoInicial = Number(draft.saldoInicial);
    const precioUnit = Number(draft.precioUnit);
    if (!Number.isFinite(saldoInicial) || saldoInicial < 0) {
      showError("Saldo inicial inválido.");
      return;
    }
    if (!Number.isFinite(precioUnit) || precioUnit < 0) {
      showError("Precio unitario inválido.");
      return;
    }
    try {
      setSavingSaldoId(id);
      await updateSaldoMensualByIdMutation.mutateAsync({
        id,
        payload: { saldoInicial, precioUnit }
      });
      await queryClient.invalidateQueries({ queryKey: ["inventario-import", "saldo-mensual"] });
      showSuccess(`Saldo actualizado para registro ${id}.`);
    } catch (error) {
      showError(normalizeError(error, "No se pudo actualizar el saldo del producto."));
    } finally {
      setSavingSaldoId(null);
    }
  }

  async function handleCreateAndReceiveCompraHistorica(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const proveedorIdNum = Number(proveedorId);
    if (!proveedorIdNum) {
      showError("Debes seleccionar el proveedor.");
      return;
    }
    if (!fechaOperacionCompra) {
      showError("Debes definir la fecha de operación de la compra.");
      return;
    }
    const parsedItems = compraDraftItems.map((item) => ({
      productoId: Number(item.productoId),
      cantidadPedida: Number(item.cantidadPedida),
      precioUnit: Number(item.precioUnit)
    }));
    if (
      parsedItems.some(
        (item) =>
          !item.productoId ||
          !item.cantidadPedida ||
          item.cantidadPedida <= 0 ||
          !item.precioUnit ||
          item.precioUnit <= 0
      )
    ) {
      showError("Completa producto, cantidad y precio unitario en todos los ítems.");
      return;
    }
    try {
      const created = await createCompraMutation.mutateAsync({
        proveedorId: proveedorIdNum,
        numeroFactura: numeroFacturaCompra.trim() || undefined,
        fechaOperacion: `${fechaOperacionCompra}T00:00:00.000Z`,
        items: parsedItems
      });
      const cantidadesRecibidas = Object.fromEntries(
        (created.data.items ?? []).map((item) => [item.id, Number(item.cantidadPedida)])
      );
      await recibirCompraMutation.mutateAsync({
        id: created.data.id,
        payload: { cantidadesRecibidas }
      });
      showSuccess(
        isPeriodoCerradoCompra
          ? "Compra histórica registrada. El período está cerrado (operación retroactiva)."
          : "Compra con fecha de operación registrada correctamente."
      );
      setProveedorId("");
      setFechaOperacionCompra("");
      setNumeroFacturaCompra("");
      setCompraDraftItems([{ id: 1, productoId: "", cantidadPedida: "1", precioUnit: "" }]);
      setNextCompraDraftItemId(2);
    } catch (error) {
      // If server reports the compra is already completed (409), the mutation hook
      // already invalidates cache and shows a message, so avoid duplicating toasts.
      if ((error as any)?.statusCode === 409) return;
      showError(normalizeError(error, "No se pudo registrar o recibir la compra histórica."));
    }
  }

  async function handleCreateAndDeliverVale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const solicitanteIdNum = Number(solicitanteId);
    if (!solicitanteIdNum) {
      showError("Debes seleccionar el trabajador solicitante.");
      return;
    }
    if (!fechaOperacion) {
      showError("Debes definir la fecha de operación.");
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
      const created = await createValeMutation.mutateAsync({
        solicitanteId: solicitanteIdNum,
        fechaOperacion: `${fechaOperacion}T00:00:00.000Z`,
        items: parsedItems.map((item) => ({
          productoId: item.productoId,
          cantidadSolicitada: item.cantidadSolicitada
        }))
      });

      const cantidadesEntregadas = Object.fromEntries(
        (created.data.items ?? []).map((item) => [item.id, Number(item.cantidadSolicitada)])
      );
      const cuentaIds = Object.fromEntries(
        (created.data.items ?? []).map((item, index) => [
          item.id,
          parsedItems[index]?.cuentaId ?? 0
        ])
      );
      if (Object.values(cuentaIds).some((value) => !value || value <= 0)) {
        showError("No se pudo mapear la cuenta contable por item para la entrega histórica.");
        return;
      }

      await entregarValeMutation.mutateAsync({
        id: created.data.id,
        payload: { cantidadesEntregadas, cuentaIds }
      });

      showSuccess(
        isPeriodoCerrado
          ? "Vale histórico registrado. El período está cerrado (operación retroactiva)."
          : "Vale con fecha de operación registrada correctamente."
      );
      setSolicitanteId("");
      setFechaOperacion("");
      setDraftItems([{ id: 1, productoId: "", cantidadSolicitada: "1", cuentaId: "" }]);
      setNextDraftItemId(2);
    } catch (error) {
      showError(normalizeError(error, "No se pudo registrar o entregar el vale histórico."));
    }
  }

  if (!canUseFlow && user?.role) {
    return (
      <section className="space-y-6 text-[var(--color-on-surface)]">
        <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
          <SubrouteBackButton />
          <h1 className="mt-4 font-headline text-3xl font-extrabold">Vales históricos</h1>
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
            <CalendarClock size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Vales históricos</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Registro separado para vales con fecha de operación específica.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Plus size={16} className="text-[var(--color-primary)]" />
          Registrar vale histórico
        </h2>
        <form className="space-y-3" onSubmit={handleCreateAndDeliverVale}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Trabajador solicitante
              </label>
              <AutocompleteSelect
                value={solicitanteId}
                onChange={setSolicitanteId}
                options={usuarioOptions}
                placeholder="Buscar por nombre o código"
                className={inputClassName}
                maxVisibleOptions={30}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Fecha de operación
              </label>
              <input
                required
                type="date"
                value={fechaOperacion}
                onChange={(event) => setFechaOperacion(event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          {isPeriodoCerrado ? (
            <div className="rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/15 p-3 text-xs text-[var(--color-warning)]">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={14} />
                Período cerrado detectado
              </div>
              <p className="mt-1">
                Esta entrega será retroactiva: actualizará saldo mensual histórico y no el stock
                actual.
              </p>
            </div>
          ) : null}

          {draftItems.map((item, index) => (
            <div
              key={item.id}
              className="grid grid-cols-1 gap-2 rounded-lg bg-[var(--color-surface-container-high)] p-3 md:grid-cols-[1fr_130px_1fr_auto]"
            >
              <AutocompleteSelect
                value={item.productoId}
                onChange={(nextValue) => updateDraftItem(item.id, { productoId: nextValue })}
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
              onClick={() => setIsCreateProductoModalOpen(true)}
              disabled={!canUseFlow}
              className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
            >
              Crear producto
            </button>
            <button
              type="button"
              onClick={addDraftItem}
              disabled={!canUseFlow}
              className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
            >
              Agregar item
            </button>
            <button
              type="submit"
              disabled={createValeMutation.isPending || entregarValeMutation.isPending}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createValeMutation.isPending || entregarValeMutation.isPending
                ? "Procesando..."
                : "Registrar y entregar vale histórico"}
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <ShoppingCart size={16} className="text-[var(--color-primary)]" />
          Registrar compra histórica
        </h2>
        <form className="space-y-3" onSubmit={handleCreateAndReceiveCompraHistorica}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Proveedor
              </label>
              <div className="flex gap-2">
                <select
                  required
                  value={proveedorId}
                  onChange={(event) => setProveedorId(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona proveedor</option>
                  {proveedores.map((proveedor) => (
                    <option key={proveedor.id} value={proveedor.id}>
                      {proveedor.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCreateProveedorModalOpen(true)}
                  className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2.5 text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
                  title="Crear nuevo proveedor"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Fecha de operación
              </label>
              <input
                required
                type="date"
                value={fechaOperacionCompra}
                onChange={(event) => setFechaOperacionCompra(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                N° Factura (opcional)
              </label>
              <input
                type="text"
                value={numeroFacturaCompra}
                onChange={(event) => setNumeroFacturaCompra(event.target.value)}
                className={inputClassName}
                placeholder="FAC-2025-001"
              />
            </div>
          </div>

          {isPeriodoCerradoCompra ? (
            <div className="rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/15 p-3 text-xs text-[var(--color-warning)]">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={14} />
                Período cerrado detectado
              </div>
              <p className="mt-1">
                Esta recepción será retroactiva: actualizará saldo mensual histórico y no el stock
                actual.
              </p>
            </div>
          ) : null}

          {compraDraftItems.map((item, index) => (
            <div
              key={item.id}
              className="grid grid-cols-1 gap-2 rounded-lg bg-[var(--color-surface-container-high)] p-3 md:grid-cols-[1fr_130px_130px_auto]"
            >
              <AutocompleteSelect
                value={item.productoId}
                onChange={(nextValue) => updateCompraDraftItem(item.id, { productoId: nextValue })}
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
                value={item.cantidadPedida}
                onChange={(event) =>
                  updateCompraDraftItem(item.id, { cantidadPedida: event.target.value })
                }
                className={inputClassName}
                placeholder="Cantidad"
              />
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={item.precioUnit}
                onChange={(event) =>
                  updateCompraDraftItem(item.id, { precioUnit: event.target.value })
                }
                className={inputClassName}
                placeholder="Precio Bs."
              />
              <button
                type="button"
                onClick={() => removeCompraDraftItem(item.id)}
                className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
              >
                Quitar
              </button>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsCreateProductoModalOpen(true)}
              disabled={!canUseFlow}
              className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
            >
              Crear producto
            </button>
            <button
              type="button"
              onClick={addCompraDraftItem}
              disabled={!canUseFlow}
              className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
            >
              Agregar item
            </button>
            <button
              type="submit"
              disabled={createCompraMutation.isPending || recibirCompraMutation.isPending}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createCompraMutation.isPending || recibirCompraMutation.isPending
                ? "Procesando..."
                : "Registrar y recibir compra histórica"}
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Lock size={16} className="text-[var(--color-primary)]" />
          Cierre de mes y períodos cerrados
        </h2>

        <form
          className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3 md:grid-cols-[160px_140px_auto]"
          onSubmit={handleInicializarPeriodo}
        >
          <div className="md:col-span-3">
            <p className="text-xs font-semibold text-[var(--color-on-surface)]">
              Inicializar período (solo primera vez)
            </p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Aquí mismo se siembran los saldos iniciales del primer mes histórico. Solo elige
              año/mes y presiona el botón.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Año
            </label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={initAnio}
              onChange={(event) => setInitAnio(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Mes
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={initMes}
              onChange={(event) => setInitMes(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={inicializarPeriodoMutation.isPending}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {inicializarPeriodoMutation.isPending ? "Inicializando..." : "Inicializar ahora"}
            </button>
          </div>
        </form>

        <form
          className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3 md:grid-cols-[160px_140px_auto]"
          onSubmit={handleCargarSaldosPeriodo}
        >
          <div className="md:col-span-3">
            <p className="text-xs font-semibold text-[var(--color-on-surface)]">
              Revisar y corregir saldos (PASO 2 y PASO 3)
            </p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Carga el período y edita <strong>saldo inicial</strong> y{" "}
              <strong>precio unitario</strong> por producto.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Año
            </label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={aperturaAnio}
              onChange={(event) => setAperturaAnio(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Mes
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={aperturaMes}
              onChange={(event) => setAperturaMes(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg border border-[var(--color-primary)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
            >
              Cargar saldos del período
            </button>
          </div>
        </form>

        {aperturaEnabled ? (
          <div className="mb-4 space-y-4 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--color-on-surface)]">
                  Productos en período: {filteredSaldos.length}
                </h3>
              </div>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-3.5 text-[var(--color-on-surface-variant)]"
                />
                <input
                  type="text"
                  placeholder="Buscar por código o nombre..."
                  value={saldoSearchQuery}
                  onChange={(e) => {
                    setSaldoSearchQuery(e.target.value);
                    setSaldoCurrentPage(1);
                  }}
                  className={`${inputClassName} pl-10`}
                />
              </div>
            </div>

            <div className="table-scroll overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[var(--color-surface-container)]">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      Código
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      Saldo inicial
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      Precio unitario
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {saldosPeriodoQuery.isLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-4 text-center text-xs text-[var(--color-on-surface-variant)]"
                      >
                        Cargando saldos del período...
                      </td>
                    </tr>
                  ) : null}
                  {!saldosPeriodoQuery.isLoading && filteredSaldos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-4 text-center text-xs text-[var(--color-on-surface-variant)]"
                      >
                        {saldoSearchQuery
                          ? "No hay resultados para la búsqueda."
                          : "Sin registros para este período."}
                      </td>
                    </tr>
                  ) : null}
                  {paginatedSaldos.map((row) => {
                    const id = String(row.id);
                    const draft = saldoDraftById[id] ?? {
                      saldoInicial: String(row.saldoInicial ?? 0),
                      precioUnit: String(row.precioUnit ?? 0)
                    };
                    return (
                      <tr key={id} className="hover:bg-[var(--color-surface-container)] transition">
                        <td className="px-4 py-3 text-xs font-medium text-[var(--color-on-surface)]">
                          {row.productoCodigo}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-on-surface)]">
                          {row.productoNombre ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.saldoInicial}
                            onChange={(event) =>
                              setSaldoDraftById((current) => ({
                                ...current,
                                [id]: { ...draft, saldoInicial: event.target.value }
                              }))
                            }
                            className={`${inputClassName} text-xs`}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={draft.precioUnit}
                            onChange={(event) =>
                              setSaldoDraftById((current) => ({
                                ...current,
                                [id]: { ...draft, precioUnit: event.target.value }
                              }))
                            }
                            className={`${inputClassName} text-xs`}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <button
                            type="button"
                            onClick={() => handleGuardarSaldoFila(id)}
                            disabled={savingSaldoId === id}
                            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:opacity-60"
                          >
                            {savingSaldoId === id ? "Guardando..." : "Guardar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalSaldoPages > 1 ? (
              <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] pt-4">
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  Página {saldoCurrentPage} de {totalSaldoPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSaldoCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={saldoCurrentPage === 1}
                    className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSaldoCurrentPage((prev) => Math.min(prev + 1, totalSaldoPages))
                    }
                    disabled={saldoCurrentPage === totalSaldoPages}
                    className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {canClosePeriod ? (
          <form
            className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[160px_140px_auto]"
            onSubmit={handleCreateCierreMes}
          >
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Año
              </label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={cierreAnio}
                onChange={(event) => setCierreAnio(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Mes
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={cierreMes}
                onChange={(event) => setCierreMes(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={createCierreMesMutation.isPending}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
              >
                {createCierreMesMutation.isPending ? "Cerrando..." : "Cerrar período"}
              </button>
            </div>
          </form>
        ) : (
          <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
            Solo ADMIN o SUPERINTENDENTE puede cerrar meses.
          </p>
        )}

        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Período
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Cerrado en
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {cierresMesQuery.isLoading ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-3 text-xs text-[var(--color-on-surface-variant)]"
                  >
                    Cargando períodos cerrados...
                  </td>
                </tr>
              ) : null}
              {!cierresMesQuery.isLoading && cierres.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-3 text-xs text-[var(--color-on-surface-variant)]"
                  >
                    Aún no hay períodos cerrados.
                  </td>
                </tr>
              ) : null}
              {cierres.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-xs font-semibold">
                    {String(item.mes).padStart(2, "0")}/{item.anio}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {item.creadoAt ? new Date(item.creadoAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <CreateProveedorModal
        isOpen={isCreateProveedorModalOpen}
        onClose={() => setIsCreateProveedorModalOpen(false)}
      />
      <CreateProductoModal
        isOpen={isCreateProductoModalOpen}
        onClose={() => setIsCreateProductoModalOpen(false)}
      />
    </section>
  );
}
