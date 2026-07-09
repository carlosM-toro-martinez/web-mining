import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HardHat,
  History,
  PackageCheck,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  type LucideIcon
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { AuthRole } from "@/features/auth/model/auth.schema";
import {
  useCreateEppAsignacionMutation,
  useDeleteEppAsignacionMutation,
  useEppAsignacionesQuery,
  useEppProductoHistorialQuery,
  useEppProductosQuery,
  useEppTrabajadorReporteQuery,
  useEppTrabajadoresQuery,
  useUpdateEppAsignacionMutation
} from "@/features/epp/hooks/useEpp";
import type { CondicionEpp, EppAsignacion, EppProducto } from "@/features/epp/model/epp.schema";
import { normalizeApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

type EppTab = "productos" | "trabajadores" | "asignaciones";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const conditionOptions: Array<{ value: CondicionEpp; label: string }> = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "EN_USO", label: "En uso" },
  { value: "DEVUELTO_BUENO", label: "Devuelto bueno" },
  { value: "DEVUELTO_USADO", label: "Devuelto usado" },
  { value: "BAJA", label: "Baja" }
];

function canManageEpp(role?: AuthRole | null) {
  return role === "ADMIN" || role === "ADMINISTRADOR" || role === "SUPERINTENDENTE";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-BO");
}

function toIsoFromLocal(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function conditionLabel(value?: string | null) {
  return conditionOptions.find((item) => item.value === value)?.label ?? value ?? "-";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return normalizeApiError(error).message || fallback;
}

export function EppPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const canManage = canManageEpp(user?.role);
  const canDelete = user?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState<EppTab>("productos");
  const [productoSearch, setProductoSearch] = useState("");
  const [soloConStock, setSoloConStock] = useState(false);
  const [selectedProductoId, setSelectedProductoId] = useState<number | null>(null);
  const [trabajadorSearch, setTrabajadorSearch] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [trabajadoresPage, setTrabajadoresPage] = useState(1);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);
  const [asignacionesPage, setAsignacionesPage] = useState(1);
  const [asignacionActiva, setAsignacionActiva] = useState("true");
  const [asignacionCondicion, setAsignacionCondicion] = useState("");
  const [filterProductoId, setFilterProductoId] = useState("");
  const [filterUsuarioId, setFilterUsuarioId] = useState("");
  const [formProductoId, setFormProductoId] = useState("");
  const [formUsuarioId, setFormUsuarioId] = useState("");
  const [formCondicion, setFormCondicion] = useState<CondicionEpp>("EN_USO");
  const [formFechaEntrega, setFormFechaEntrega] = useState("");
  const [formObservacion, setFormObservacion] = useState("");
  const [returnTarget, setReturnTarget] = useState<EppAsignacion | null>(null);
  const [returnCondicion, setReturnCondicion] = useState<CondicionEpp>("DEVUELTO_BUENO");
  const [returnFecha, setReturnFecha] = useState("");
  const [returnObservacion, setReturnObservacion] = useState("");

  const productosQuery = useEppProductosQuery({
    search: productoSearch || undefined,
    soloConStock
  });
  const historialQuery = useEppProductoHistorialQuery(selectedProductoId);
  const trabajadoresQuery = useEppTrabajadoresQuery(
    {
      search: trabajadorSearch || undefined,
      soloActivos,
      page: trabajadoresPage,
      limit: 20
    },
    canManage
  );
  const trabajadorReporteQuery = useEppTrabajadorReporteQuery(selectedUsuarioId, canManage);
  const asignacionesQuery = useEppAsignacionesQuery(
    {
      productoId: filterProductoId ? Number(filterProductoId) : undefined,
      usuarioId: filterUsuarioId ? Number(filterUsuarioId) : undefined,
      condicion: asignacionCondicion ? (asignacionCondicion as CondicionEpp) : undefined,
      activa:
        asignacionActiva === "true" ? true : asignacionActiva === "false" ? false : undefined,
      page: asignacionesPage,
      limit: 20
    },
    canManage
  );
  const createMutation = useCreateEppAsignacionMutation();
  const updateMutation = useUpdateEppAsignacionMutation();
  const deleteMutation = useDeleteEppAsignacionMutation();

  const productos = productosQuery.data?.data.productos ?? [];
  const trabajadores = trabajadoresQuery.data?.data.trabajadores ?? [];
  const trabajadoresMeta = trabajadoresQuery.data?.data.meta;
  const asignacionesData = asignacionesQuery.data?.data;
  const asignaciones = asignacionesData?.asignaciones ?? [];
  const asignacionesMeta = asignacionesData && "meta" in asignacionesData ? asignacionesData.meta : undefined;

  const stats = useMemo(() => {
    const total = productos.length;
    const stock = productos.reduce((sum, item) => sum + (item.stock?.cantidad ?? 0), 0);
    const activas = productos.reduce((sum, item) => sum + item.totalAsignacionesActivas, 0);
    return { total, stock, activas };
  }, [productos]);

  function handleCreateAsignacion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      showError("No tienes permisos para registrar asignaciones.");
      return;
    }
    if (!formProductoId || !formUsuarioId) {
      showError("Debes completar producto y trabajador.");
      return;
    }
    createMutation.mutate(
      {
        productoId: Number(formProductoId),
        usuarioId: Number(formUsuarioId),
        condicion: formCondicion,
        fechaEntrega: toIsoFromLocal(formFechaEntrega),
        observacion: formObservacion.trim() || undefined
      },
      {
        onSuccess: () => {
          showSuccess("Asignacion EPP registrada.");
          setFormProductoId("");
          setFormUsuarioId("");
          setFormCondicion("EN_USO");
          setFormFechaEntrega("");
          setFormObservacion("");
        },
        onError: (error) => showError(getErrorMessage(error, "No se pudo registrar la asignacion."))
      }
    );
  }

  function openReturnModal(asignacion: EppAsignacion) {
    setReturnTarget(asignacion);
    setReturnCondicion("DEVUELTO_BUENO");
    setReturnFecha("");
    setReturnObservacion(asignacion.observacion ?? "");
  }

  function handleReturnAsignacion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!returnTarget) return;
    updateMutation.mutate(
      {
        id: returnTarget.id,
        payload: {
          condicion: returnCondicion,
          fechaDevolucion: toIsoFromLocal(returnFecha) ?? new Date().toISOString(),
          observacion: returnObservacion.trim() || undefined
        }
      },
      {
        onSuccess: () => {
          showSuccess("Devolucion registrada.");
          setReturnTarget(null);
        },
        onError: (error) => showError(getErrorMessage(error, "No se pudo registrar la devolucion."))
      }
    );
  }

  function handleDeleteAsignacion(id: string) {
    if (!canDelete) {
      showError("Solo ADMIN puede eliminar asignaciones.");
      return;
    }
    if (!window.confirm("Eliminar esta asignacion permanentemente?")) return;
    deleteMutation.mutate(id, {
      onSuccess: () => showSuccess("Asignacion eliminada."),
      onError: (error) => showError(getErrorMessage(error, "No se pudo eliminar la asignacion."))
    });
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton to="/" label="Volver" />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
              <HardHat size={20} />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-extrabold">Control EPP</h1>
              <p className="mt-2 max-w-3xl text-sm text-[var(--color-on-surface-variant)]">
                Seguimiento de equipos de proteccion personal, responsables actuales, devoluciones e historial por trabajador.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
            Rol: <strong className="text-[var(--color-on-surface)]">{user?.role}</strong>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard icon={Boxes} label="Productos EPP" value={stats.total} />
        <StatCard icon={PackageCheck} label="Stock visible" value={stats.stock} />
        <StatCard icon={ShieldCheck} label="Asignaciones activas" value={stats.activas} />
      </div>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "productos", label: "Productos", icon: Boxes },
            { id: "trabajadores", label: "Trabajadores", icon: UserRound },
            { id: "asignaciones", label: "Asignaciones", icon: ClipboardList }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as EppTab)}
              disabled={tab.id !== "productos" && !canManage}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                activeTab === tab.id
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/14 text-[var(--color-primary)]"
                  : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]"
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
        {!canManage ? (
          <p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">
            Tu rol puede consultar productos e historial de EPP. Las asignaciones y reportes de trabajadores quedan reservados para roles administrativos.
          </p>
        ) : null}
      </article>

      {activeTab === "productos" ? (
        <ProductosPanel
          search={productoSearch}
          setSearch={setProductoSearch}
          soloConStock={soloConStock}
          setSoloConStock={setSoloConStock}
          productos={productos}
          isLoading={productosQuery.isLoading}
          selectedProductoId={selectedProductoId}
          setSelectedProductoId={setSelectedProductoId}
          historialQuery={historialQuery}
        />
      ) : null}

      {activeTab === "trabajadores" && canManage ? (
        <TrabajadoresPanel
          search={trabajadorSearch}
          setSearch={setTrabajadorSearch}
          soloActivos={soloActivos}
          setSoloActivos={setSoloActivos}
          trabajadores={trabajadores}
          meta={trabajadoresMeta}
          page={trabajadoresPage}
          setPage={setTrabajadoresPage}
          isLoading={trabajadoresQuery.isLoading}
          selectedUsuarioId={selectedUsuarioId}
          setSelectedUsuarioId={setSelectedUsuarioId}
          reporteQuery={trabajadorReporteQuery}
        />
      ) : null}

      {activeTab === "asignaciones" && canManage ? (
        <AsignacionesPanel
          canDelete={canDelete}
          filters={{
            productoId: filterProductoId,
            usuarioId: filterUsuarioId,
            condicion: asignacionCondicion,
            activa: asignacionActiva
          }}
          setFilters={{
            setProductoId: setFilterProductoId,
            setUsuarioId: setFilterUsuarioId,
            setCondicion: setAsignacionCondicion,
            setActiva: setAsignacionActiva
          }}
          asignaciones={asignaciones}
          meta={asignacionesMeta}
          page={asignacionesPage}
          setPage={setAsignacionesPage}
          isLoading={asignacionesQuery.isLoading}
          form={{
            productoId: formProductoId,
            usuarioId: formUsuarioId,
            condicion: formCondicion,
            fechaEntrega: formFechaEntrega,
            observacion: formObservacion
          }}
          setForm={{
            setProductoId: setFormProductoId,
            setUsuarioId: setFormUsuarioId,
            setCondicion: setFormCondicion,
            setFechaEntrega: setFormFechaEntrega,
            setObservacion: setFormObservacion
          }}
          onCreate={handleCreateAsignacion}
          onReturn={openReturnModal}
          onDelete={handleDeleteAsignacion}
          isSaving={createMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      ) : null}

      {returnTarget ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
          <form
            onSubmit={handleReturnAsignacion}
            className="w-full max-w-lg rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Registrar devolucion</h2>
                <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                  {returnTarget.producto?.nombre ?? "EPP"} - {returnTarget.usuario?.nombre ?? "Trabajador"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReturnTarget(null)}
                className="rounded-md border border-[var(--color-outline-variant)] px-2 py-1 text-xs"
              >
                Cerrar
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Condicion
                <select
                  value={returnCondicion}
                  onChange={(event) => setReturnCondicion(event.target.value as CondicionEpp)}
                  className={`${inputClassName} mt-1`}
                >
                  {conditionOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Fecha devolucion
                <input
                  type="datetime-local"
                  value={returnFecha}
                  onChange={(event) => setReturnFecha(event.target.value)}
                  className={`${inputClassName} mt-1`}
                />
              </label>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Observacion
                <textarea
                  value={returnObservacion}
                  onChange={(event) => setReturnObservacion(event.target.value)}
                  className={`${inputClassName} mt-1 min-h-24`}
                  maxLength={500}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              <RotateCcw size={15} />
              Guardar devolucion
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{label}</p>
          <p className="mt-2 text-2xl font-extrabold">{value.toLocaleString("es-BO")}</p>
        </div>
        <div className="rounded-lg bg-[var(--color-primary)]/12 p-2 text-[var(--color-primary)]">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

type QueryLike<T> = {
  data?: T;
  isLoading: boolean;
  isFetching?: boolean;
};

function ProductosPanel(props: {
  search: string;
  setSearch: (value: string) => void;
  soloConStock: boolean;
  setSoloConStock: (value: boolean) => void;
  productos: EppProducto[];
  isLoading: boolean;
  selectedProductoId: number | null;
  setSelectedProductoId: (value: number | null) => void;
  historialQuery: QueryLike<ReturnType<typeof useEppProductoHistorialQuery>["data"]>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 text-[var(--color-on-surface-variant)]" size={16} />
            <input
              value={props.search}
              onChange={(event) => props.setSearch(event.target.value)}
              placeholder="Buscar por codigo o nombre"
              className={`${inputClassName} pl-9`}
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={props.soloConStock}
              onChange={(event) => props.setSoloConStock(event.target.checked)}
            />
            Solo con stock
          </label>
        </div>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <TableHeader>Codigo</TableHeader>
                <TableHeader>Producto</TableHeader>
                <TableHeader>Unidad</TableHeader>
                <TableHeader align="right">Stock</TableHeader>
                <TableHeader align="right">Activas</TableHeader>
                <TableHeader>Accion</TableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {props.isLoading ? (
                <EmptyRow colSpan={6} text="Cargando productos EPP..." />
              ) : props.productos.length === 0 ? (
                <EmptyRow colSpan={6} text="Sin productos EPP para los filtros." />
              ) : (
                props.productos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-[var(--color-surface-container-high)]">
                    <TableCell>{producto.codigo ?? "-"}</TableCell>
                    <TableCell>
                      <p className="font-semibold">{producto.nombre ?? "-"}</p>
                      <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                        {producto.grupo?.nombre ?? "Sin grupo"} / {producto.subGrupo?.nombre ?? "Sin subgrupo"}
                      </p>
                    </TableCell>
                    <TableCell>{producto.unidad ?? "-"}</TableCell>
                    <TableCell align="right">{producto.stock?.cantidad ?? 0}</TableCell>
                    <TableCell align="right">{producto.totalAsignacionesActivas}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => props.setSelectedProductoId(producto.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-2 py-1 text-xs font-semibold text-[var(--color-primary)]"
                      >
                        <History size={13} />
                        Historial
                      </button>
                    </TableCell>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider">Historial de producto</h2>
        {!props.selectedProductoId ? (
          <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">Selecciona un producto para ver responsable actual, asignaciones y vales.</p>
        ) : props.historialQuery.isLoading ? (
          <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">Cargando historial...</p>
        ) : props.historialQuery.data ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-[var(--color-surface-container-high)] p-3">
              <p className="text-xs uppercase text-[var(--color-on-surface-variant)]">Producto</p>
              <p className="font-semibold">{props.historialQuery.data.data.producto.nombre ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Responsable actual</p>
              {props.historialQuery.data.data.propietarioActual ? (
                <AssignmentSummary asignacion={props.historialQuery.data.data.propietarioActual} />
              ) : (
                <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Sin asignacion activa.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Ultimas asignaciones</p>
              <div className="mt-2 space-y-2">
                {props.historialQuery.data.data.asignaciones.slice(0, 6).map((asignacion) => (
                  <AssignmentSummary key={asignacion.id} asignacion={asignacion} />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </article>
    </div>
  );
}

function TrabajadoresPanel(props: {
  search: string;
  setSearch: (value: string) => void;
  soloActivos: boolean;
  setSoloActivos: (value: boolean) => void;
  trabajadores: Array<{ usuario: { id: number; nombre?: string | null; email?: string | null; role?: string | null }; asignacionesActivas: number; totalAsignaciones: number; ultimaEntrega?: { fecha?: string | null; producto?: string | null } | null }>;
  meta?: { page: number; totalPages: number; total: number };
  page: number;
  setPage: (value: number) => void;
  isLoading: boolean;
  selectedUsuarioId: number | null;
  setSelectedUsuarioId: (value: number | null) => void;
  reporteQuery: QueryLike<ReturnType<typeof useEppTrabajadorReporteQuery>["data"]>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <input value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder="Buscar trabajador" className={inputClassName} />
          <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-sm">
            <input type="checkbox" checked={props.soloActivos} onChange={(event) => props.setSoloActivos(event.target.checked)} />
            Solo activos
          </label>
        </div>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead><tr><TableHeader>Trabajador</TableHeader><TableHeader align="right">Activas</TableHeader><TableHeader align="right">Total</TableHeader><TableHeader>Ultima entrega</TableHeader><TableHeader>Accion</TableHeader></tr></thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {props.isLoading ? <EmptyRow colSpan={5} text="Cargando trabajadores..." /> : props.trabajadores.length === 0 ? <EmptyRow colSpan={5} text="Sin trabajadores." /> : props.trabajadores.map((item) => (
                <tr key={item.usuario.id}>
                  <TableCell><p className="font-semibold">{item.usuario.nombre ?? "-"}</p><p className="text-[11px] text-[var(--color-on-surface-variant)]">{item.usuario.email ?? "-"} | {item.usuario.role ?? "-"}</p></TableCell>
                  <TableCell align="right">{item.asignacionesActivas}</TableCell>
                  <TableCell align="right">{item.totalAsignaciones}</TableCell>
                  <TableCell>{item.ultimaEntrega?.producto ?? "-"}<p className="text-[11px] text-[var(--color-on-surface-variant)]">{formatDate(item.ultimaEntrega?.fecha)}</p></TableCell>
                  <TableCell><button type="button" onClick={() => props.setSelectedUsuarioId(item.usuario.id)} className="rounded-md border border-[var(--color-outline-variant)] px-2 py-1 text-xs font-semibold text-[var(--color-primary)]">Reporte</button></TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {props.meta ? <Pager page={props.page} totalPages={props.meta.totalPages} total={props.meta.total} setPage={props.setPage} /> : null}
      </article>
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider">Reporte trabajador</h2>
        {!props.selectedUsuarioId ? <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">Selecciona un trabajador.</p> : props.reporteQuery.isLoading ? <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">Cargando reporte...</p> : props.reporteQuery.data ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-[var(--color-surface-container-high)] p-3"><p className="font-semibold">{props.reporteQuery.data.data.usuario.nombre}</p><p className="text-xs text-[var(--color-on-surface-variant)]">{props.reporteQuery.data.data.usuario.email}</p></div>
            <ReportSection title="Activos" asignaciones={props.reporteQuery.data.data.asignacionesActivas} />
            <ReportSection title="Devueltos" asignaciones={props.reporteQuery.data.data.asignacionesDevueltas.slice(0, 5)} />
          </div>
        ) : null}
      </article>
    </div>
  );
}

function AsignacionesPanel(props: {
  canDelete: boolean;
  filters: { productoId: string; usuarioId: string; condicion: string; activa: string };
  setFilters: { setProductoId: (value: string) => void; setUsuarioId: (value: string) => void; setCondicion: (value: string) => void; setActiva: (value: string) => void };
  asignaciones: EppAsignacion[];
  meta?: { page: number; totalPages: number; total: number };
  page: number;
  setPage: (value: number) => void;
  isLoading: boolean;
  form: { productoId: string; usuarioId: string; condicion: CondicionEpp; fechaEntrega: string; observacion: string };
  setForm: { setProductoId: (value: string) => void; setUsuarioId: (value: string) => void; setCondicion: (value: CondicionEpp) => void; setFechaEntrega: (value: string) => void; setObservacion: (value: string) => void };
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onReturn: (asignacion: EppAsignacion) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
      <form onSubmit={props.onCreate} className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">Nueva asignacion</h2>
        <div className="space-y-3">
          <input type="number" min={1} value={props.form.productoId} onChange={(event) => props.setForm.setProductoId(event.target.value)} placeholder="Producto ID" className={inputClassName} />
          <input type="number" min={1} value={props.form.usuarioId} onChange={(event) => props.setForm.setUsuarioId(event.target.value)} placeholder="Usuario ID trabajador" className={inputClassName} />
          <select value={props.form.condicion} onChange={(event) => props.setForm.setCondicion(event.target.value as CondicionEpp)} className={inputClassName}>{conditionOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <input type="datetime-local" value={props.form.fechaEntrega} onChange={(event) => props.setForm.setFechaEntrega(event.target.value)} className={inputClassName} />
          <textarea value={props.form.observacion} onChange={(event) => props.setForm.setObservacion(event.target.value)} placeholder="Observacion" className={`${inputClassName} min-h-24`} maxLength={500} />
        </div>
        <button type="submit" disabled={props.isSaving} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"><Save size={15} />Guardar</button>
      </form>
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input type="number" value={props.filters.productoId} onChange={(event) => props.setFilters.setProductoId(event.target.value)} placeholder="Producto ID" className={inputClassName} />
          <input type="number" value={props.filters.usuarioId} onChange={(event) => props.setFilters.setUsuarioId(event.target.value)} placeholder="Usuario ID" className={inputClassName} />
          <select value={props.filters.condicion} onChange={(event) => props.setFilters.setCondicion(event.target.value)} className={inputClassName}><option value="">Todas</option>{conditionOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <select value={props.filters.activa} onChange={(event) => props.setFilters.setActiva(event.target.value)} className={inputClassName}><option value="">Todas</option><option value="true">Activas</option><option value="false">Devueltas</option></select>
        </div>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead><tr><TableHeader>EPP</TableHeader><TableHeader>Trabajador</TableHeader><TableHeader>Condicion</TableHeader><TableHeader>Entrega</TableHeader><TableHeader>Devolucion</TableHeader><TableHeader>Acciones</TableHeader></tr></thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {props.isLoading ? <EmptyRow colSpan={6} text="Cargando asignaciones..." /> : props.asignaciones.length === 0 ? <EmptyRow colSpan={6} text="Sin asignaciones." /> : props.asignaciones.map((item) => (
                <tr key={item.id}>
                  <TableCell><p className="font-semibold">{item.producto?.nombre ?? "-"}</p><p className="text-[11px] text-[var(--color-on-surface-variant)]">{item.producto?.codigo ?? "-"}</p></TableCell>
                  <TableCell><p>{item.usuario?.nombre ?? "-"}</p><p className="text-[11px] text-[var(--color-on-surface-variant)]">{item.usuario?.email ?? "-"}</p></TableCell>
                  <TableCell>{conditionLabel(item.condicion)}</TableCell>
                  <TableCell>{formatDate(item.fechaEntrega)}</TableCell>
                  <TableCell>{formatDate(item.fechaDevolucion)}</TableCell>
                  <TableCell><div className="flex flex-wrap gap-2">{item.activa ? <button type="button" onClick={() => props.onReturn(item)} className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-2 py-1 text-xs font-semibold text-[var(--color-primary)]"><RotateCcw size={13} />Devolver</button> : null}{props.canDelete ? <button type="button" disabled={props.isDeleting} onClick={() => props.onDelete(item.id)} className="inline-flex items-center gap-1 rounded-md border border-[var(--color-error)]/45 px-2 py-1 text-xs font-semibold text-[var(--color-error)]"><Trash2 size={13} />Eliminar</button> : null}</div></TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {props.meta ? <Pager page={props.page} totalPages={props.meta.totalPages} total={props.meta.total} setPage={props.setPage} /> : null}
      </article>
    </div>
  );
}

function ReportSection({ title, asignaciones }: { title: string; asignaciones: EppAsignacion[] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{title}</p>
      <div className="mt-2 space-y-2">
        {asignaciones.length === 0 ? <p className="text-sm text-[var(--color-on-surface-variant)]">Sin registros.</p> : asignaciones.map((item) => <AssignmentSummary key={item.id} asignacion={item} />)}
      </div>
    </div>
  );
}

function AssignmentSummary({ asignacion }: { asignacion: EppAsignacion }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{asignacion.producto?.nombre ?? asignacion.usuario?.nombre ?? "-"}</p>
          <p className="text-xs text-[var(--color-on-surface-variant)]">{formatDate(asignacion.fechaEntrega)} - {formatDate(asignacion.fechaDevolucion)}</p>
        </div>
        <span className="rounded-full bg-[var(--color-primary)]/12 px-2 py-1 text-[11px] font-semibold text-[var(--color-primary)]">{conditionLabel(asignacion.condicion)}</span>
      </div>
      {asignacion.observacion ? <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">{asignacion.observacion}</p> : null}
    </div>
  );
}

function Pager({ page, totalPages, total, setPage }: { page: number; totalPages: number; total: number; setPage: (value: number) => void }) {
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
      <span>Pagina {page} de {totalPages} | Total: {total}</span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))} className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 disabled:opacity-40"><ChevronLeft size={16} /></button>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage(Math.min(totalPages, page + 1))} className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

function TableHeader({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  const alignClass = align === "right" ? "text-right" : "text-left";
  return <th className={`px-3 py-2 ${alignClass} text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]`}>{children}</th>;
}

function TableCell({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  const alignClass = align === "right" ? "text-right" : "text-left";
  return <td className={`px-3 py-2 ${alignClass} text-xs`}>{children}</td>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <tr><td colSpan={colSpan} className="px-3 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">{text}</td></tr>;
}
