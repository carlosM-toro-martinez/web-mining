import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CalendarClock, Lock, Plus, ShieldAlert, ShoppingCart, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useUsersListQuery } from "@/features/auth/hooks/useUsersManagement";
import { useCuentasQuery } from "@/features/contabilidad/hooks/useContabilidad";
import {
  useCierresMesQuery,
  useCreateCierreMesMutation,
  useInicializarPeriodoHistoricoMutation,
  useSaldoMensualPreviewQuery,
  useSaldoMensualQuery,
  useUpdateSaldoMensualByIdMutation
} from "@/features/inventario-import/hooks/useInventarioImport";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import {
  useAnularValeMutation,
  useCreateValeMutation,
  useEntregarValeMutation,
  useValesQuery
} from "@/features/vales/hooks/useVales";
import type { Vale, ValeItem } from "@/features/vales/model/vales.schema";
import {
  useActualizarCompraItemPrecioMutation,
  useAnularCompraMutation,
  useCreateCompraMutation,
  useComprasQuery,
  useRecibirCompraMutation
} from "@/features/compras/hooks/useCompras";
import type { Compra, CompraItem } from "@/features/compras/model/compras.schema";
import { useProveedoresQuery } from "@/features/proveedores/hooks/useProveedores";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { CreateCuentaModal } from "@/shared/ui/CreateCuentaModal";
import { CreateProveedorModal } from "@/shared/ui/CreateProveedorModal";
import { CreateProductoModal } from "@/shared/ui/CreateProductoModal";
import { queryKeys } from "@/shared/lib/queryKeys";
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
  precioGlobal: string;
  usePrecioGlobal: boolean;
}

function computeCompraPrecioUnit(item: CompraDraftItem): number {
  const qty = Number(item.cantidadPedida);
  const treatAsTotal = item.usePrecioGlobal || (Number.isFinite(qty) && qty > 0 && qty < 1);
  if (!treatAsTotal) return Number(item.precioUnit);
  const total = Number(item.usePrecioGlobal ? item.precioGlobal : item.precioUnit);
  if (!qty || !Number.isFinite(total) || !Number.isFinite(qty)) return 0;
  return total / qty;
}

interface SaldoMensualDraft {
  saldoInicial: string;
  precioUnit: string;
}

type HistoricoConsultaParams = {
  anio: number;
  mes: number;
  estado?: string;
  solicitanteId?: number;
  productoId?: number;
  proveedorId?: number;
};

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-BO");
}

function formatNumber(value: number) {
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getValeItemCantidad(item: ValeItem) {
  return item.cantidadEntregada || item.cantidadSolicitada;
}

function getValeItemsForDisplay(vale: Vale, productoId?: number) {
  if (!productoId) return vale.items;
  return vale.items.filter((item) => item.productoId === productoId);
}

function getValeCantidadTotal(vale: Vale, productoId?: number) {
  return getValeItemsForDisplay(vale, productoId).reduce(
    (total, item) => total + getValeItemCantidad(item),
    0
  );
}

function isValeCompletado(vale: Vale) {
  return vale.estado.toUpperCase() === "COMPLETADO";
}

function isValeAnulado(vale: Vale) {
  const estado = vale.estado.toUpperCase();
  return estado === "ANULADO" || estado === "ANULADA";
}

function getCompraItemCantidad(item: CompraItem) {
  return item.cantidadRecibida || item.cantidadPedida;
}

function getCompraItemTotal(item: CompraItem) {
  return getCompraItemCantidad(item) * item.precioUnit;
}

function getCompraTotal(compra: Compra) {
  return compra.items.reduce((total, item) => total + getCompraItemTotal(item), 0);
}

function CompraItemsTable({
  compra,
  canEditPrecio = false,
  onEditPrecio,
  savingItemId
}: {
  compra: Compra;
  canEditPrecio?: boolean;
  onEditPrecio?: (compra: Compra, item: CompraItem) => void;
  savingItemId?: string | null;
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--color-border-soft)]">
      <table className="w-full min-w-[660px] border-collapse text-left">
        <thead className="bg-[var(--color-surface-container)]">
          <tr>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Codigo
            </th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Producto
            </th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Cantidad
            </th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              P. Unit. Bs.
            </th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Total item Bs.
            </th>
            {canEditPrecio ? (
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Accion
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-soft)]">
          {compra.items.map((item) => (
            <tr key={item.id} className="bg-[var(--color-surface-container-low)]/50">
              <td className="px-3 py-2 font-mono text-[11px] text-[var(--color-on-surface-variant)]">
                {item.producto?.codigo ?? "-"}
              </td>
              <td className="px-3 py-2 text-xs text-[var(--color-on-surface)]">
                {item.producto?.nombre ?? "Producto"}
              </td>
              <td className="px-3 py-2 text-right text-xs text-[var(--color-on-surface)]">
                {formatNumber(getCompraItemCantidad(item))}
              </td>
              <td className="px-3 py-2 text-right text-xs text-[var(--color-on-surface)]">
                {formatNumber(item.precioUnit)}
              </td>
              <td className="px-3 py-2 text-right text-xs font-semibold text-[var(--color-on-surface)]">
                {formatNumber(getCompraItemTotal(item))}
              </td>
              {canEditPrecio ? (
                <td className="px-3 py-2 text-right text-xs">
                  <button
                    type="button"
                    onClick={() => onEditPrecio?.(compra, item)}
                    disabled={savingItemId === item.id}
                    className="rounded-md border border-[var(--color-border)] px-2 py-1 font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingItemId === item.id ? "Guardando..." : "Editar precio"}
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]">
          <tr>
            <td colSpan={4} className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface)]">
              Total factura
            </td>
            <td className="px-3 py-2 text-right text-sm font-extrabold text-[var(--color-primary)]">
              Bs. {formatNumber(getCompraTotal(compra))}
            </td>
            {canEditPrecio ? <td /> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
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
  const anularValeMutation = useAnularValeMutation();
  const createCompraMutation = useCreateCompraMutation();
  const recibirCompraMutation = useRecibirCompraMutation();
  const anularCompraMutation = useAnularCompraMutation();
  const actualizarCompraItemPrecioMutation = useActualizarCompraItemPrecioMutation();
  const createCierreMesMutation = useCreateCierreMesMutation();
  const inicializarPeriodoMutation = useInicializarPeriodoHistoricoMutation();
  const updateSaldoMensualByIdMutation = useUpdateSaldoMensualByIdMutation();
  const canUseFlow =
    user?.role === "ADMIN" || user?.role === "SUPERINTENDENTE" || user?.role === "ALMACENERO";
  const canAnularHistorico =
    user?.role === "ADMIN" || user?.role === "ALMACENERO" || user?.role === "SUPERINTENDENTE";
  const canEditCompraItemPrecio = user?.role === "ADMIN";
  const canManagePeriods = user?.role === "ADMIN";
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
    { id: 1, productoId: "", cantidadPedida: "1", precioUnit: "", precioGlobal: "", usePrecioGlobal: false }
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
  const [isCreateCuentaModalOpen, setIsCreateCuentaModalOpen] = useState(false);
  const [targetDraftItemIdForCuenta, setTargetDraftItemIdForCuenta] = useState<number | null>(null);
  const [saldoSearchQuery, setSaldoSearchQuery] = useState("");
  const [saldoCurrentPage, setSaldoCurrentPage] = useState(1);
  const [previewAnio, setPreviewAnio] = useState(String(now.getFullYear()));
  const [previewMes, setPreviewMes] = useState(String(now.getMonth() + 1));
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [previewSearchQuery, setPreviewSearchQuery] = useState("");
  const [previewCurrentPage, setPreviewCurrentPage] = useState(1);
  const [historicoAnio, setHistoricoAnio] = useState(String(now.getFullYear()));
  const [historicoMes, setHistoricoMes] = useState(String(now.getMonth() + 1));
  const [historicoEstado, setHistoricoEstado] = useState("");
  const [historicoSolicitanteId, setHistoricoSolicitanteId] = useState("");
  const [historicoProductoId, setHistoricoProductoId] = useState("");
  const [historicoProveedorId, setHistoricoProveedorId] = useState("");
  const [compraHistoricoAnio, setCompraHistoricoAnio] = useState(String(now.getFullYear()));
  const [compraHistoricoMes, setCompraHistoricoMes] = useState(String(now.getMonth() + 1));
  const [compraHistoricoEstado, setCompraHistoricoEstado] = useState("");
  const [compraHistoricoProveedorId, setCompraHistoricoProveedorId] = useState("");
  const [isHistoricoPanelOpen, setIsHistoricoPanelOpen] = useState(false);
  const [isValesHistoricosOpen, setIsValesHistoricosOpen] = useState(true);
  const [isComprasHistoricasOpen, setIsComprasHistoricasOpen] = useState(true);
  const [historicoConsulta, setHistoricoConsulta] = useState<HistoricoConsultaParams | null>(null);
  const [compraHistoricoConsulta, setCompraHistoricoConsulta] =
    useState<HistoricoConsultaParams | null>(null);
  const [savingCompraItemPrecioId, setSavingCompraItemPrecioId] = useState<string | null>(null);
  const itemsPerPage = 10;

  const usuarios = usersQuery.data?.data ?? [];
  const productos = productosQuery.data?.data ?? [];
  const cuentas = cuentasQuery.data?.data ?? [];
  const cierres = cierresMesQuery.data?.data ?? [];
  const proveedoresQuery = useProveedoresQuery({ page: 1, limit: 500, search: undefined });
  const proveedores = proveedoresQuery.data?.data ?? [];
  const historicoParams = useMemo(
    () => ({
      anio: historicoConsulta?.anio ?? now.getFullYear(),
      mes: historicoConsulta?.mes ?? now.getMonth() + 1,
      estado: historicoConsulta?.estado,
      sinPaginar: true,
      page: 1,
      limit: 100
    }),
    [historicoConsulta, now]
  );
  const compraHistoricoParams = useMemo(
    () => ({
      anio: compraHistoricoConsulta?.anio ?? now.getFullYear(),
      mes: compraHistoricoConsulta?.mes ?? now.getMonth() + 1,
      estado: compraHistoricoConsulta?.estado,
      sinPaginar: true,
      page: 1,
      limit: 100
    }),
    [compraHistoricoConsulta, now]
  );
  const valesHistoricosQuery = useValesQuery({
    ...historicoParams,
    solicitanteId: historicoConsulta?.solicitanteId
  }, Boolean(historicoConsulta));
  const comprasHistoricasQuery = useComprasQuery({
    ...compraHistoricoParams,
    proveedorId: compraHistoricoConsulta?.proveedorId
  }, Boolean(compraHistoricoConsulta));
  const valesHistoricosFiltrados = useMemo(() => {
    const vales = valesHistoricosQuery.data?.data ?? [];
    if (!historicoConsulta?.productoId) return vales;
    return vales.filter((vale) =>
      vale.items.some((item) => item.productoId === historicoConsulta.productoId)
    );
  }, [historicoConsulta?.productoId, valesHistoricosQuery.data?.data]);
  const productoHistoricoFiltrado = useMemo(() => {
    if (!historicoConsulta?.productoId) return null;
    return productos.find((producto) => producto.id === historicoConsulta.productoId) ?? null;
  }, [historicoConsulta?.productoId, productos]);
  const resumenProductoHistorico = useMemo(() => {
    if (!historicoConsulta?.productoId) return null;
    return valesHistoricosFiltrados.reduce(
      (resumen, vale) => {
        const cantidad = getValeCantidadTotal(vale, historicoConsulta.productoId);
        if (isValeCompletado(vale)) {
          resumen.completadosCantidad += cantidad;
          resumen.completadosVales += 1;
        } else if (isValeAnulado(vale)) {
          resumen.anuladosCantidad += cantidad;
          resumen.anuladosVales += 1;
        } else {
          resumen.otrosCantidad += cantidad;
          resumen.otrosVales += 1;
        }
        return resumen;
      },
      {
        completadosCantidad: 0,
        completadosVales: 0,
        anuladosCantidad: 0,
        anuladosVales: 0,
        otrosCantidad: 0,
        otrosVales: 0
      }
    );
  }, [historicoConsulta?.productoId, valesHistoricosFiltrados]);
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

  const previewParams = useMemo(
    () => ({
      anio: Number(previewAnio) || now.getFullYear(),
      mes: Number(previewMes) || now.getMonth() + 1
    }),
    [previewAnio, previewMes, now]
  );
  const previewQuery = useSaldoMensualPreviewQuery(previewParams, previewEnabled);

  const filteredPreviewItems = useMemo(() => {
    const items = previewQuery.data?.items ?? [];
    if (!previewSearchQuery.trim()) return items;
    const q = previewSearchQuery.toLowerCase();
    return items.filter(
      (item) =>
        (item.productoCodigo ?? "").toLowerCase().includes(q) ||
        (item.productoNombre ?? "").toLowerCase().includes(q)
    );
  }, [previewQuery.data, previewSearchQuery]);

  const paginatedPreviewItems = useMemo(() => {
    const start = (previewCurrentPage - 1) * itemsPerPage;
    return filteredPreviewItems.slice(start, start + itemsPerPage);
  }, [filteredPreviewItems, previewCurrentPage]);

  const totalPreviewPages = useMemo(
    () => Math.ceil(filteredPreviewItems.length / itemsPerPage),
    [filteredPreviewItems.length]
  );

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

  const proveedorOptions = useMemo(
    () =>
      proveedores.map((proveedor) => ({
        id: String(proveedor.id),
        label: `${proveedor.nombre}${proveedor.nit ? ` - NIT ${proveedor.nit}` : ""}`,
        searchText: `${proveedor.nombre} ${proveedor.razonSocial ?? ""} ${proveedor.nit ?? ""}`
      })),
    [proveedores]
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

  function openCreateCuentaModal(draftItemId: number) {
    setTargetDraftItemIdForCuenta(draftItemId);
    setIsCreateCuentaModalOpen(true);
  }

  function closeCreateCuentaModal() {
    setIsCreateCuentaModalOpen(false);
    setTargetDraftItemIdForCuenta(null);
  }

  function addCompraDraftItem() {
    setCompraDraftItems((current) => [
      ...current,
      { id: nextCompraDraftItemId, productoId: "", cantidadPedida: "1", precioUnit: "", precioGlobal: "", usePrecioGlobal: false }
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

  function handleVerPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const anio = Number(previewAnio);
    const mes = Number(previewMes);
    if (!anio || !mes) {
      showError("Debes indicar año y mes válidos.");
      return;
    }
    setPreviewEnabled(true);
    setPreviewCurrentPage(1);
  }

  function handleConsultarHistoricos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const anio = Number(historicoAnio);
    const mes = Number(historicoMes);
    if (!anio || !mes || mes < 1 || mes > 12) {
      showError("Debes indicar año y mes válidos para consultar históricos.");
      return;
    }
    setHistoricoConsulta({
      anio,
      mes,
      estado: historicoEstado || undefined,
      solicitanteId: historicoSolicitanteId ? Number(historicoSolicitanteId) : undefined,
      productoId: historicoProductoId ? Number(historicoProductoId) : undefined
    });
    setIsHistoricoPanelOpen(true);
    setIsValesHistoricosOpen(true);
  }

  function handleConsultarComprasHistoricas(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const anio = Number(compraHistoricoAnio);
    const mes = Number(compraHistoricoMes);
    if (!anio || !mes || mes < 1 || mes > 12) {
      showError("Debes indicar año y mes válidos para consultar compras históricas.");
      return;
    }
    setCompraHistoricoConsulta({
      anio,
      mes,
      estado: compraHistoricoEstado || undefined,
      proveedorId: compraHistoricoProveedorId ? Number(compraHistoricoProveedorId) : undefined
    });
    setIsHistoricoPanelOpen(true);
    setIsComprasHistoricasOpen(true);
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

  async function handleAnularValeHistorico(id: string) {
    if (!canAnularHistorico) {
      showError("Solo ADMIN, ALMACENERO o SUPERINTENDENTE puede anular vales históricos.");
      return;
    }
    const motivo = window.prompt("Motivo de anulación del vale histórico:");
    if (!motivo || motivo.trim().length < 5) {
      showError("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    try {
      const result = await anularValeMutation.mutateAsync({
        id,
        payload: { motivo: motivo.trim() }
      });
      await queryClient.invalidateQueries({ queryKey: ["inventario-import", "saldo-mensual"] });
      showSuccess(`Vale anulado. Contra-asientos generados: ${result.data.contraAsientos}.`);
    } catch (error) {
      showError(normalizeError(error, "No se pudo anular el vale histórico."));
    }
  }

  async function handleAnularCompraHistorica(id: string) {
    if (!canAnularHistorico) {
      showError("Solo ADMIN, ALMACENERO o SUPERINTENDENTE puede anular compras históricas.");
      return;
    }
    const motivo = window.prompt("Motivo de anulación de la compra histórica:");
    if (!motivo || !motivo.trim()) {
      showError("El motivo es obligatorio.");
      return;
    }
    try {
      const result = await anularCompraMutation.mutateAsync({
        id,
        payload: { motivo: motivo.trim() }
      });
      await queryClient.invalidateQueries({ queryKey: ["inventario-import", "saldo-mensual"] });
      showSuccess(`Compra anulada. Contra-asientos generados: ${result.data.contraAsientos}.`);
    } catch (error) {
      showError(normalizeError(error, "No se pudo anular la compra histórica."));
    }
  }

  async function handleEditarPrecioCompraItem(compra: Compra, item: CompraItem) {
    if (!canEditCompraItemPrecio) {
      showError("Solo ADMIN puede editar precios de items de compras históricas.");
      return;
    }

    const productoNombre = item.producto?.nombre ?? item.producto?.codigo ?? "Producto";
    const rawPrecio = window.prompt(
      `Nuevo precio unitario para ${productoNombre}:`,
      String(item.precioUnit)
    );
    if (rawPrecio === null) return;

    const precioUnit = Number(rawPrecio.trim().replace(",", "."));
    if (!Number.isFinite(precioUnit) || precioUnit <= 0) {
      showError("Ingresa un precio unitario valido mayor a cero.");
      return;
    }

    try {
      setSavingCompraItemPrecioId(item.id);
      const response = await actualizarCompraItemPrecioMutation.mutateAsync({
        compraId: compra.id,
        itemId: item.id,
        payload: { precioUnit }
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.compras.all });
      showSuccess(
        `Precio actualizado: Bs. ${formatNumber(response.data.precioAnterior)} -> Bs. ${formatNumber(
          response.data.nuevoPrecioUnit
        )}. Movimientos actualizados: ${response.data.movimientosActualizados}.`
      );
    } catch (error) {
      showError(normalizeError(error, "No se pudo actualizar el precio del item."));
    } finally {
      setSavingCompraItemPrecioId(null);
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
      precioUnit: computeCompraPrecioUnit(item)
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
      setCompraDraftItems([{ id: 1, productoId: "", cantidadPedida: "1", precioUnit: "", precioGlobal: "", usePrecioGlobal: false }]);
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

      {false ? (
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2 text-[var(--color-primary)]">
            <Search size={16} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Observar históricos por período</h2>
            <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
              Lista vales y compras del período seleccionado. ADMIN y SUPERINTENDENTE pueden anular registros.
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Año
            </label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={historicoAnio}
              onChange={(event) => setHistoricoAnio(event.target.value)}
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
              value={historicoMes}
              onChange={(event) => setHistoricoMes(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Estado
            </label>
            <select
              value={historicoEstado}
              onChange={(event) => setHistoricoEstado(event.target.value)}
              className={inputClassName}
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="APROBADO">APROBADO</option>
              <option value="PARCIAL">PARCIAL</option>
              <option value="COMPLETADO">COMPLETADO</option>
              <option value="ANULADO">ANULADO</option>
              <option value="ANULADA">ANULADA</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Solicitante
            </label>
            <AutocompleteSelect
              value={historicoSolicitanteId}
              onChange={setHistoricoSolicitanteId}
              options={usuarioOptions}
              placeholder="Todos los solicitantes"
              className={inputClassName}
              maxVisibleOptions={30}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Proveedor
            </label>
            <AutocompleteSelect
              value={historicoProveedorId}
              onChange={setHistoricoProveedorId}
              options={proveedorOptions}
              placeholder="Todos los proveedores"
              className={inputClassName}
              maxVisibleOptions={30}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
            <h3 className="mb-3 font-bold">Vales del período</h3>
            <div className="table-scroll overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Vale</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Estado</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Solicitante</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Fecha</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {valesHistoricosQuery.isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-center text-xs text-[var(--color-on-surface-variant)]">
                        Cargando vales...
                      </td>
                    </tr>
                  ) : null}
                  {!valesHistoricosQuery.isLoading && valesHistoricosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-center text-xs text-[var(--color-on-surface-variant)]">
                        Sin vales para el período.
                      </td>
                    </tr>
                  ) : null}
                  {valesHistoricosFiltrados.map((vale) => (
                    <tr key={vale.id} className="align-top transition hover:bg-[var(--color-surface-container-highest)]">
                      <td className="px-3 py-2 text-xs font-mono">
                        {vale.id}
                        <div className="mt-1 space-y-1 font-sans text-[11px] text-[var(--color-on-surface-variant)]">
                          {vale.items.map((item) => (
                            <div key={item.id}>
                              {item.producto?.codigo ? `${item.producto.codigo} - ` : ""}
                              {item.producto?.nombre ?? "Producto"}: {formatNumber(item.cantidadEntregada || item.cantidadSolicitada)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">{vale.estado}</td>
                      <td className="px-3 py-2 text-xs">{vale.solicitante?.nombre ?? "-"}</td>
                      <td className="px-3 py-2 text-xs">{formatDateTime(vale.fechaOperacion ?? vale.createdAt)}</td>
                      <td className="px-3 py-2 text-right text-xs">
                        {canAnularHistorico && vale.estado !== "ANULADO" ? (
                          <button
                            type="button"
                            onClick={() => void handleAnularValeHistorico(vale.id)}
                            disabled={anularValeMutation.isPending}
                            className="rounded-md border border-[var(--color-error)]/45 px-2 py-1 font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10 disabled:opacity-50"
                          >
                            Anular
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
            <h3 className="mb-3 font-bold">Compras del período</h3>
            <div className="table-scroll overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Factura</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Estado</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Proveedor</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Fecha</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Total</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {comprasHistoricasQuery.isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-3 text-center text-xs text-[var(--color-on-surface-variant)]">
                        Cargando compras...
                      </td>
                    </tr>
                  ) : null}
                  {!comprasHistoricasQuery.isLoading && (comprasHistoricasQuery.data?.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-3 text-center text-xs text-[var(--color-on-surface-variant)]">
                        Sin compras para el período.
                      </td>
                    </tr>
                  ) : null}
                  {(comprasHistoricasQuery.data?.data ?? []).map((compra) => (
                    <tr key={compra.id} className="align-top transition hover:bg-[var(--color-surface-container-highest)]">
                      <td className="px-3 py-2 text-xs">
                        <span className="font-semibold">{compra.numeroFactura ?? "-"}</span>
                        <CompraItemsTable
                          compra={compra}
                          canEditPrecio={canEditCompraItemPrecio}
                          onEditPrecio={handleEditarPrecioCompraItem}
                          savingItemId={savingCompraItemPrecioId}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">{compra.estado}</td>
                      <td className="px-3 py-2 text-xs">{compra.proveedor?.nombre ?? "-"}</td>
                      <td className="px-3 py-2 text-xs">{formatDateTime(compra.fechaOperacion ?? compra.createdAt)}</td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-[var(--color-primary)]">
                        Bs. {formatNumber(getCompraTotal(compra))}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {canAnularHistorico && compra.estado !== "ANULADA" ? (
                          <button
                            type="button"
                            onClick={() => void handleAnularCompraHistorica(compra.id)}
                            disabled={anularCompraMutation.isPending}
                            className="rounded-md border border-[var(--color-error)]/45 px-2 py-1 font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10 disabled:opacity-50"
                          >
                            Anular
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </article>
      ) : null}

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
              className="grid grid-cols-1 gap-2 rounded-lg bg-[var(--color-surface-container-high)] p-3 md:grid-cols-[1fr_130px_1fr_auto_auto]"
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

          {compraDraftItems.map((item, index) => {
            const cantidad = Number(item.cantidadPedida);
            const usarImporteTotal = item.usePrecioGlobal || (cantidad > 0 && cantidad < 1);
            const importe = Number(item.usePrecioGlobal ? item.precioGlobal : item.precioUnit);
            const precioUnitCalculado =
              usarImporteTotal && cantidad > 0 && importe > 0 ? importe / cantidad : null;

            return (
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
              <div className="flex flex-col gap-1">
                <input
                  required={!item.usePrecioGlobal}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.usePrecioGlobal ? item.precioGlobal : item.precioUnit}
                  onChange={(event) =>
                    updateCompraDraftItem(
                      item.id,
                      item.usePrecioGlobal
                        ? { precioGlobal: event.target.value }
                        : { precioUnit: event.target.value }
                    )
                  }
                  className={inputClassName}
                  placeholder={
                    usarImporteTotal ? "Total factura Bs." : "Precio unit. Bs."
                  }
                />
                {usarImporteTotal ? (
                  <p className="pl-1 text-[11px] font-semibold text-[var(--color-primary)]">
                    ={" "}
                    {precioUnitCalculado
                      ? `Bs. ${precioUnitCalculado.toLocaleString("es-BO", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4
                        })} / unidad`
                      : "ingresa cantidad y total"}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    updateCompraDraftItem(item.id, {
                      usePrecioGlobal: !item.usePrecioGlobal,
                      precioGlobal: "",
                      precioUnit: ""
                    })
                  }
                  tabIndex={-1}
                  className={`self-start rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                    item.usePrecioGlobal
                      ? "border-[var(--color-primary)]/50 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                      : "border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  }`}
                >
                  {item.usePrecioGlobal ? "÷ Precio unitario" : "÷ Desde total"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeCompraDraftItem(item.id)}
                className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                >
                  Quitar
                </button>
              </div>
            );
          })}

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
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <BarChart3 size={16} className="text-[var(--color-primary)]" />
          Vista previa — Saldo del mes
        </h2>
        <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
          Consulta el estado real del mes combinando el saldo inicial con todos los movimientos
          cargados hasta ahora. No modifica ningún dato.
        </p>

        <form
          className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[160px_140px_auto]"
          onSubmit={handleVerPreview}
        >
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Año
            </label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={previewAnio}
              onChange={(event) => {
                setPreviewAnio(event.target.value);
                setPreviewEnabled(false);
              }}
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
              value={previewMes}
              onChange={(event) => {
                setPreviewMes(event.target.value);
                setPreviewEnabled(false);
              }}
              className={inputClassName}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg border border-[var(--color-primary)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
            >
              Ver saldo del mes
            </button>
          </div>
        </form>

        {previewEnabled && previewQuery.isLoading ? (
          <div className="py-4 text-center text-xs text-[var(--color-on-surface-variant)]">
            Calculando saldo del mes...
          </div>
        ) : null}

        {previewEnabled && previewQuery.data ? (
          <div className="space-y-4">
            <div>
              {previewQuery.data.esCerrado ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success)]/15 px-3 py-1 text-xs font-semibold text-[var(--color-success)]">
                  <Lock size={12} />
                  Período cerrado — valores definitivos
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning)]/15 px-3 py-1 text-xs font-semibold text-[var(--color-warning)]">
                  <AlertTriangle size={12} />
                  Período abierto — valores acumulados hasta ahora
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-[var(--color-surface-container-high)] p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Total productos
                </p>
                <p className="mt-1 text-xl font-extrabold text-[var(--color-on-surface)]">
                  {previewQuery.data.resumen.totalProductos}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--color-surface-container-high)] p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Con movimiento
                </p>
                <p className="mt-1 text-xl font-extrabold text-[var(--color-primary)]">
                  {previewQuery.data.resumen.productosConMovimiento}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--color-surface-container-high)] p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Total unidades
                </p>
                <p className="mt-1 text-xl font-extrabold text-[var(--color-on-surface)]">
                  {previewQuery.data.resumen.totalUnidades.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--color-surface-container-high)] p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Total Bs.
                </p>
                <p className="mt-1 text-xl font-extrabold text-[var(--color-on-surface)]">
                  {previewQuery.data.resumen.totalBs.toLocaleString("es-BO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-3.5 text-[var(--color-on-surface-variant)]"
                />
                <input
                  type="text"
                  placeholder="Buscar por código o nombre..."
                  value={previewSearchQuery}
                  onChange={(e) => {
                    setPreviewSearchQuery(e.target.value);
                    setPreviewCurrentPage(1);
                  }}
                  className={`${inputClassName} pl-10`}
                />
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                {filteredPreviewItems.length}{" "}
                {filteredPreviewItems.length !== 1 ? "productos" : "producto"}
              </p>
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
                      Unidad
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      Grupo
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      Saldo inicial
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      Ingresos
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      Salidas
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      Saldo final
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      Precio Bs.
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      Total Bs.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {paginatedPreviewItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-4 text-center text-xs text-[var(--color-on-surface-variant)]"
                      >
                        {previewSearchQuery
                          ? "Sin resultados para la búsqueda."
                          : "Sin productos en este período."}
                      </td>
                    </tr>
                  ) : null}
                  {paginatedPreviewItems.map((row) => (
                    <tr
                      key={row.productoCodigo}
                      className="transition hover:bg-[var(--color-surface-container)]"
                    >
                      <td className="px-4 py-3 text-xs font-medium text-[var(--color-on-surface)]">
                        {row.productoCodigo}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-on-surface)]">
                        {row.productoNombre ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
                        {row.unidad ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
                        {row.grupo ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">
                        {row.saldoInicial}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-[var(--color-success)]">
                        {row.ingresoQty > 0 ? `+${row.ingresoQty}` : row.ingresoQty}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-[var(--color-error)]">
                        {row.salidaQty > 0 ? `-${row.salidaQty}` : row.salidaQty}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">
                        {row.saldoFinal}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-[var(--color-on-surface-variant)]">
                        {row.precioUnit.toLocaleString("es-BO", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4
                        })}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">
                        {row.totalBs.toLocaleString("es-BO", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPreviewPages > 1 ? (
              <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] pt-4">
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  Página {previewCurrentPage} de {totalPreviewPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={previewCurrentPage === 1}
                    className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewCurrentPage((prev) => Math.min(prev + 1, totalPreviewPages))
                    }
                    disabled={previewCurrentPage === totalPreviewPages}
                    className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <button
          type="button"
          onClick={() => setIsHistoricoPanelOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-start gap-3">
            <span className="rounded-lg bg-[var(--color-primary)]/14 p-2 text-[var(--color-primary)]">
              <Search size={16} />
            </span>
            <span>
              <span className="block text-lg font-bold">Observar históricos por período</span>
              <span className="mt-0.5 block text-xs text-[var(--color-on-surface-variant)]">
                Consulta vales y compras solo cuando lo necesites. Puedes contraer esta sección.
              </span>
            </span>
          </span>
          <span className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)]">
            {isHistoricoPanelOpen ? "Contraer" : "Abrir"}
          </span>
        </button>

        {isHistoricoPanelOpen ? (
          <div className="mt-5 space-y-5">
            <section className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
              <h3 className="mb-3 font-bold">Consultar vales de salida</h3>
              <form
              className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6"
              onSubmit={handleConsultarHistoricos}
            >
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Año
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={historicoAnio}
                  onChange={(event) => setHistoricoAnio(event.target.value)}
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
                  value={historicoMes}
                  onChange={(event) => setHistoricoMes(event.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Estado
                </label>
                <select
                  value={historicoEstado}
                  onChange={(event) => setHistoricoEstado(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="APROBADO">APROBADO</option>
                  <option value="PARCIAL">PARCIAL</option>
                  <option value="COMPLETADO">COMPLETADO</option>
                  <option value="ANULADO">ANULADO</option>
                  <option value="ANULADA">ANULADA</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Solicitante
                </label>
                <AutocompleteSelect
                  value={historicoSolicitanteId}
                  onChange={setHistoricoSolicitanteId}
                  options={usuarioOptions}
                  placeholder="Todos"
                  className={inputClassName}
                  maxVisibleOptions={30}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Producto
                </label>
                <AutocompleteSelect
                  value={historicoProductoId}
                  onChange={setHistoricoProductoId}
                  options={productoOptions}
                  placeholder="Todos"
                  className={inputClassName}
                  maxVisibleOptions={40}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
                >
                  Consultar vales
                </button>
              </div>
            </form>
            </section>

            <section className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
              <h3 className="mb-3 font-bold">Consultar compras históricas</h3>
              <form
                className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
                onSubmit={handleConsultarComprasHistoricas}
              >
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Año
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={compraHistoricoAnio}
                    onChange={(event) => setCompraHistoricoAnio(event.target.value)}
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
                    value={compraHistoricoMes}
                    onChange={(event) => setCompraHistoricoMes(event.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Estado
                  </label>
                  <select
                    value={compraHistoricoEstado}
                    onChange={(event) => setCompraHistoricoEstado(event.target.value)}
                    className={inputClassName}
                  >
                    <option value="">Todos</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="PARCIAL">PARCIAL</option>
                    <option value="COMPLETADO">COMPLETADO</option>
                    <option value="ANULADA">ANULADA</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Proveedor
                  </label>
                  <AutocompleteSelect
                    value={compraHistoricoProveedorId}
                    onChange={setCompraHistoricoProveedorId}
                    options={proveedorOptions}
                    placeholder="Todos"
                    className={inputClassName}
                    maxVisibleOptions={30}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
                  >
                    Consultar compras
                  </button>
                </div>
              </form>
            </section>

              <div className="space-y-4">
                <section className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">
                      {historicoConsulta
                        ? `Vales del período ${String(historicoConsulta.mes).padStart(2, "0")}/${historicoConsulta.anio}`
                        : "Vales de salida"}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsValesHistoricosOpen((current) => !current)}
                        className="rounded-md border border-[var(--color-outline-variant)] px-2 py-1 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      >
                        {isValesHistoricosOpen ? "Contraer" : "Expandir"}
                      </button>
                      {historicoConsulta ? (
                        <button
                          type="button"
                          onClick={() => setHistoricoConsulta(null)}
                          className="rounded-md border border-[var(--color-outline-variant)] px-2 py-1 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-error)] hover:text-[var(--color-error)]"
                        >
                          Limpiar
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {isValesHistoricosOpen ? (
                    <>
                  {!historicoConsulta ? (
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      Pulsa <strong>Consultar vales</strong> para cargar esta lista.
                    </p>
                  ) : (
                    <div className="space-y-3">
                    {valesHistoricosQuery.isLoading ? (
                      <p className="text-xs text-[var(--color-on-surface-variant)]">Cargando vales...</p>
                    ) : null}
                    {historicoConsulta?.productoId ? (
                      <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                              Producto filtrado
                            </p>
                            <p className="mt-1 text-sm font-extrabold text-[var(--color-on-surface)]">
                              {productoHistoricoFiltrado?.codigo ? `${productoHistoricoFiltrado.codigo} - ` : ""}
                              {productoHistoricoFiltrado?.nombre ?? `Producto #${historicoConsulta.productoId}`}
                            </p>
                          </div>
                          <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                              Vales encontrados
                            </p>
                            <p className="mt-1 text-sm font-extrabold text-[var(--color-primary)]">
                              {valesHistoricosFiltrados.length}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div className="rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/8 px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                              Completados
                            </p>
                            <p className="mt-1 text-lg font-extrabold text-[var(--color-primary)]">
                              {formatNumber(resumenProductoHistorico?.completadosCantidad ?? 0)} {productoHistoricoFiltrado?.unidad ?? ""}
                            </p>
                            <p className="mt-0.5 text-[10px] font-semibold text-[var(--color-on-surface-variant)]">
                              {resumenProductoHistorico?.completadosVales ?? 0} vale(s)
                            </p>
                          </div>
                          <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/8 px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                              Anulados
                            </p>
                            <p className="mt-1 text-lg font-extrabold text-[var(--color-error)]">
                              {formatNumber(resumenProductoHistorico?.anuladosCantidad ?? 0)} {productoHistoricoFiltrado?.unidad ?? ""}
                            </p>
                            <p className="mt-0.5 text-[10px] font-semibold text-[var(--color-on-surface-variant)]">
                              {resumenProductoHistorico?.anuladosVales ?? 0} vale(s)
                            </p>
                          </div>
                          <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                              Otros estados
                            </p>
                            <p className="mt-1 text-lg font-extrabold text-[var(--color-on-surface)]">
                              {formatNumber(resumenProductoHistorico?.otrosCantidad ?? 0)} {productoHistoricoFiltrado?.unidad ?? ""}
                            </p>
                            <p className="mt-0.5 text-[10px] font-semibold text-[var(--color-on-surface-variant)]">
                              {resumenProductoHistorico?.otrosVales ?? 0} vale(s)
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {!valesHistoricosQuery.isLoading && valesHistoricosFiltrados.length === 0 ? (
                      <p className="text-xs text-[var(--color-on-surface-variant)]">Sin vales para el período.</p>
                    ) : null}
                    {valesHistoricosFiltrados.map((vale) => {
                      const itemsVisibles = getValeItemsForDisplay(vale, historicoConsulta?.productoId);
                      const cantidadVale = getValeCantidadTotal(vale, historicoConsulta?.productoId);
                      const valeAnulado = isValeAnulado(vale);
                      const valeCompletado = isValeCompletado(vale);

                      return (
                        <div
                          key={vale.id}
                          className={`rounded-lg border bg-[var(--color-surface-container-low)] p-4 ${
                            valeAnulado
                              ? "border-[var(--color-error)]/30"
                              : "border-[var(--color-border-soft)]"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-extrabold text-[var(--color-on-surface)]">
                                  Vale <span className="font-mono">{vale.id}</span>
                                </p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                    valeAnulado
                                      ? "bg-[var(--color-error)]/12 text-[var(--color-error)]"
                                      : valeCompletado
                                        ? "bg-[var(--color-primary)]/12 text-[var(--color-primary)]"
                                        : "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]"
                                  }`}
                                >
                                  {vale.estado}
                                </span>
                              </div>
                              <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-[var(--color-on-surface-variant)] md:grid-cols-2">
                                <span>
                                  <span className="font-bold text-[var(--color-on-surface)]">Solicitante:</span>{" "}
                                  {vale.solicitante?.nombre ?? "Sin solicitante"}
                                </span>
                                <span>
                                  <span className="font-bold text-[var(--color-on-surface)]">Fecha:</span>{" "}
                                  {formatDateTime(vale.fechaOperacion ?? vale.createdAt)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-right">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                                  {historicoConsulta?.productoId ? "Cantidad producto" : "Cantidad total"}
                                </p>
                                <p
                                  className={`mt-1 text-sm font-extrabold ${
                                    valeAnulado ? "text-[var(--color-error)]" : "text-[var(--color-primary)]"
                                  }`}
                                >
                                  {formatNumber(cantidadVale)}
                                </p>
                              </div>
                              {canAnularHistorico && vale.estado !== "ANULADO" ? (
                                <button
                                  type="button"
                                  onClick={() => void handleAnularValeHistorico(vale.id)}
                                  disabled={anularValeMutation.isPending}
                                  className="rounded-md border border-[var(--color-error)]/45 px-2 py-1 text-xs font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10 disabled:opacity-50"
                                >
                                  Anular
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--color-border-soft)]">
                            <table className="w-full min-w-[520px] border-collapse text-left">
                              <thead className="bg-[var(--color-surface-container)]">
                                <tr>
                                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                                    Codigo
                                  </th>
                                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                                    Producto
                                  </th>
                                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                                    Cantidad
                                  </th>
                                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                                    Unidad
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--color-border-soft)]">
                                {itemsVisibles.map((item) => (
                                  <tr key={item.id} className="bg-[var(--color-surface-container-low)]/50">
                                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--color-on-surface-variant)]">
                                      {item.producto?.codigo ?? "-"}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-[var(--color-on-surface)]">
                                      {item.producto?.nombre ?? "Producto"}
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs font-semibold text-[var(--color-on-surface)]">
                                      {formatNumber(getValeItemCantidad(item))}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                                      {item.producto?.unidad ?? "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                    </>
                  ) : null}
                </section>

                <section className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">
                      {compraHistoricoConsulta
                        ? `Compras del período ${String(compraHistoricoConsulta.mes).padStart(2, "0")}/${compraHistoricoConsulta.anio}`
                        : "Compras históricas"}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsComprasHistoricasOpen((current) => !current)}
                        className="rounded-md border border-[var(--color-outline-variant)] px-2 py-1 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      >
                        {isComprasHistoricasOpen ? "Contraer" : "Expandir"}
                      </button>
                      {compraHistoricoConsulta ? (
                        <button
                          type="button"
                          onClick={() => setCompraHistoricoConsulta(null)}
                          className="rounded-md border border-[var(--color-outline-variant)] px-2 py-1 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-error)] hover:text-[var(--color-error)]"
                        >
                          Limpiar
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {isComprasHistoricasOpen ? (
                    <>
                  {!compraHistoricoConsulta ? (
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      Pulsa <strong>Consultar compras</strong> para cargar esta lista.
                    </p>
                  ) : (
                    <div className="space-y-3">
                    {comprasHistoricasQuery.isLoading ? (
                      <p className="text-xs text-[var(--color-on-surface-variant)]">Cargando compras...</p>
                    ) : null}
                    {!comprasHistoricasQuery.isLoading && (comprasHistoricasQuery.data?.data ?? []).length === 0 ? (
                      <p className="text-xs text-[var(--color-on-surface-variant)]">Sin compras para el período.</p>
                    ) : null}
                    {(comprasHistoricasQuery.data?.data ?? []).map((compra) => (
                      <div
                        key={compra.id}
                        className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-extrabold text-[var(--color-on-surface)]">
                                Factura {compra.numeroFactura ?? "-"}
                              </p>
                              <span className="rounded-full bg-[var(--color-primary)]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                                {compra.estado}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                              {compra.proveedor?.nombre ?? "Sin proveedor"} · {formatDateTime(compra.fechaOperacion ?? compra.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-right">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                                Total factura
                              </p>
                              <p className="mt-1 text-sm font-extrabold text-[var(--color-primary)]">
                                Bs. {formatNumber(getCompraTotal(compra))}
                              </p>
                            </div>
                            {canAnularHistorico && compra.estado !== "ANULADA" ? (
                              <button
                                type="button"
                                onClick={() => void handleAnularCompraHistorica(compra.id)}
                                disabled={anularCompraMutation.isPending}
                                className="rounded-md border border-[var(--color-error)]/45 px-2 py-1 text-xs font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10 disabled:opacity-50"
                              >
                                Anular
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <CompraItemsTable
                          compra={compra}
                          canEditPrecio={canEditCompraItemPrecio}
                          onEditPrecio={handleEditarPrecioCompraItem}
                          savingItemId={savingCompraItemPrecioId}
                        />
                      </div>
                    ))}
                    </div>
                  )}
                    </>
                  ) : null}
                </section>
              </div>
          </div>
        ) : null}
      </article>

      {canManagePeriods ? (
        <>
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-[var(--color-border-soft)]" />
            <span className="mx-4 flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)]">
              <ShieldAlert size={13} />
              Administración de períodos
            </span>
            <div className="flex-grow border-t border-[var(--color-border-soft)]" />
          </div>

          <article className="rounded-xl border border-[var(--color-warning)]/25 bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-warning)]/14 p-2 text-[var(--color-warning)]">
            <ShieldAlert size={16} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Administración de períodos</h2>
            <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
              Inicializa, revisa y cierra períodos mensuales. Solo para roles administrativos.
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
          <p className="mb-0.5 text-xs font-bold text-[var(--color-on-surface)]">
            Paso 1 — Inicializar período (solo la primera vez)
          </p>
          <p className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
            Siembra los saldos iniciales del primer mes histórico. Úsalo una sola vez por período.
          </p>
          <form
            className="grid grid-cols-1 gap-3 md:grid-cols-[160px_140px_auto]"
            onSubmit={handleInicializarPeriodo}
          >
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
                {inicializarPeriodoMutation.isPending ? "Inicializando..." : "Inicializar período"}
              </button>
            </div>
          </form>
        </div>

        <div className="mb-4 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
          <p className="mb-0.5 text-xs font-bold text-[var(--color-on-surface)]">
            Paso 2 — Revisar y corregir saldos iniciales del período
          </p>
          <p className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
            Carga el período y edita <strong>saldo inicial</strong> y{" "}
            <strong>precio unitario</strong> por producto antes de cerrar.
          </p>
          <form
            className="grid grid-cols-1 gap-3 md:grid-cols-[160px_140px_auto]"
            onSubmit={handleCargarSaldosPeriodo}
          >
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
            <div className="mt-4 space-y-4">
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
                        <tr
                          key={id}
                          className="hover:bg-[var(--color-surface-container)] transition"
                        >
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
        </div>

        <div className="mb-4 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
          <p className="mb-3 text-xs font-bold text-[var(--color-on-surface)]">
            Períodos ya cerrados
          </p>
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
        </div>

        {canClosePeriod ? (
          <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4">
            <p className="mb-0.5 text-xs font-bold text-[var(--color-error)]">
              Paso 3 — Cerrar período mensual
            </p>
            <p className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
              Cierra el período de forma definitiva. Esta acción fija los saldos y no se puede
              deshacer.
            </p>
            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-[160px_140px_auto]"
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
                  className="rounded-lg bg-[var(--color-error)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {createCierreMesMutation.isPending ? "Cerrando..." : "Cerrar período"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            Solo ADMIN o SUPERINTENDENTE puede cerrar meses.
          </p>
        )}
          </article>
        </>
      ) : null}

      <CreateProveedorModal
        isOpen={isCreateProveedorModalOpen}
        onClose={() => setIsCreateProveedorModalOpen(false)}
      />
      <CreateCuentaModal
        isOpen={isCreateCuentaModalOpen}
        onClose={closeCreateCuentaModal}
        onCreated={(cuentaId) => {
          if (targetDraftItemIdForCuenta !== null) {
            updateDraftItem(targetDraftItemIdForCuenta, { cuentaId: String(cuentaId) });
          }
        }}
      />
      <CreateProductoModal
        isOpen={isCreateProductoModalOpen}
        onClose={() => setIsCreateProductoModalOpen(false)}
      />
    </section>
  );
}
