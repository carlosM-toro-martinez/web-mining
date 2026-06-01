import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Boxes,
  CircleUserRound,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  FileBarChart2,
  UploadCloud,
  LayoutDashboard,
  Layers3,
  Menu,
  PackageCheck,
  Building2,
  ShoppingCart,
  ClipboardList,
  Truck,
  UserPlus,
  RefreshCw,
  IdCard,
  PencilLine,
  CalendarClock,
  Moon,
  Sun
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useInventoryOfflinePendingCount } from "@/features/inventory-offline/hooks/useInventoryOffline";
import { useTheme } from "@/shared/theme/ThemeProvider";
import minerImage from "@/assets/miner.png";
import { getPostLogoutPath } from "@/app/router/domainConfig";

interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, canManageUsers, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const offlinePendingQuery = useInventoryOfflinePendingCount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInventoryExpanded, setIsInventoryExpanded] = useState(false);
  const [isPersonalExpanded, setIsPersonalExpanded] = useState(false);
  const yearLabel = useMemo(() => new Date().getFullYear(), []);
  const isAlmacenero = user?.role === "ALMACENERO";
  const isRecepcionista = user?.role === "RECEPCIONISTA";
  const isSuperintendente = user?.role === "SUPERINTENDENTE";
  const isAdministrador = user?.role === "ADMINISTRADOR";
  const canSeeInventoryRoute = isAlmacenero || isAdmin || isRecepcionista || isSuperintendente;

  const topNavItems = useMemo(() => {
    const items: NavItem[] = [{ label: "Dashboard", icon: LayoutDashboard, to: "/" }];
    // if (isAdmin) {
    //   items.push({ label: "Exploraciones", icon: FlaskConical, to: "/exploraciones" });
    // }
    if (isAdmin || isAdministrador || isSuperintendente) {
      items.push({
        label: "Exploraciones Data Room",
        icon: FlaskConical,
        to: "/exploraciones-data-room"
      });
    }
    if (canManageUsers) {
      items.push({ label: "Trabajadores", icon: UserPlus, to: "/trabajadores" });
    }
    return items;
  }, [canManageUsers, isAdmin, isAdministrador, isSuperintendente]);

  const inventoryNavItems = useMemo(() => {
    if (!canSeeInventoryRoute) return [];
    const items: NavItem[] = [
      // { label: "Movimientos", icon: Truck, to: "/inventario/entregas" },
      { label: "Compras", icon: ShoppingCart, to: "/inventario/compras" },
      { label: "Pedidos", icon: ClipboardList, to: "/inventario/pedidos" },
      { label: "Vales", icon: PackageCheck, to: "/inventario/vales" },
      { label: "Vales históricos", icon: CalendarClock, to: "/inventario/vales-historicos" },
      { label: "Proveedores", icon: Building2, to: "/inventario/proveedores" },
      { label: "Stock", icon: Layers3, to: "/inventario/stock" },
      { label: "Reportes", icon: FileBarChart2, to: "/inventario/reportes" },
      { label: "Importación", icon: UploadCloud, to: "/inventario/importacion" },
      { label: "Editar stock inicial", icon: PencilLine, to: "/inventario/stock-inicial-editar" }
    ];
    if (isAdmin) {
      items.push({ label: "Monitoreo offline", icon: Truck, to: "/inventario/offline-monitor" });
    }
    return items;
  }, [canSeeInventoryRoute, isAdmin]);

  const personalNavItems = useMemo(() => {
    if (!(isAdmin || isAdministrador || isSuperintendente)) return [];
    return [
      { label: "Personal", icon: IdCard, to: "/personal/empleados" },
      { label: "Reportes", icon: FileBarChart2, to: "/personal/reportes" },
      { label: "Horarios", icon: CalendarClock, to: "/personal/horarios" },
      { label: "Asignaciones", icon: ClipboardList, to: "/personal/asignaciones" },
      { label: "Ausencias", icon: RefreshCw, to: "/personal/ausencias" },
      { label: "Reporte", icon: FileBarChart2, to: "/personal/reporte" }
    ] as NavItem[];
  }, [isAdmin, isAdministrador, isSuperintendente]);

  const avatarLabel = useMemo(() => {
    const source = user?.nombre?.trim();
    if (!source) return "UO";
    const parts = source.split(" ").filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
    return initials || "UO";
  }, [user?.nombre]);

  useEffect(() => {
    const persisted = window.localStorage.getItem("ui:sidebar-collapsed");
    if (persisted === "true") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("ui:sidebar-collapsed", isSidebarCollapsed ? "true" : "false");
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const persisted = window.localStorage.getItem("ui:inventory-expanded");
    if (persisted === "true") {
      setIsInventoryExpanded(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("ui:inventory-expanded", isInventoryExpanded ? "true" : "false");
  }, [isInventoryExpanded]);

  useEffect(() => {
    const persisted = window.localStorage.getItem("ui:personal-expanded");
    if (persisted === "true") {
      setIsPersonalExpanded(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("ui:personal-expanded", isPersonalExpanded ? "true" : "false");
  }, [isPersonalExpanded]);

  useEffect(() => {
    if (location.pathname.startsWith("/inventario")) {
      setIsInventoryExpanded(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith("/personal")) {
      setIsPersonalExpanded(true);
    }
  }, [location.pathname]);

  const isInventorySectionActive = location.pathname.startsWith("/inventario");
  const isPersonalSectionActive = location.pathname.startsWith("/personal");

  return (
    <div className="app-shell min-h-screen bg-[var(--color-surface)] font-body text-[var(--color-on-surface)]">
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col overflow-y-auto bg-[var(--color-surface-container-low)] px-0 py-6 transition-all duration-300 lg:translate-x-0 ${
          isSidebarCollapsed ? "lg:w-20" : "lg:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`${isSidebarCollapsed ? "mb-6 px-3" : "mb-8 px-6"}`}>
          <div className="relative min-h-[28px]">
            <div
              className={`absolute left-0 top-0 flex items-center gap-1 transition-all duration-300 ${
                isSidebarCollapsed
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-2 opacity-0 pointer-events-none"
              }`}
            >
              <h1 className="font-headline text-xl font-bold uppercase tracking-[0.03em] text-[var(--color-primary)]">
                MM
              </h1>
              <span className="text-[8px] font-medium tracking-[0.2em] text-[var(--color-tertiary)]">
                v0.1
              </span>
            </div>
            <div
              className={`overflow-hidden transition-all duration-500 ${
                isSidebarCollapsed
                  ? "max-w-0 translate-x-1 opacity-0"
                  : "max-w-[210px] translate-x-0 opacity-100 delay-200"
              }`}
            >
              <h1 className="whitespace-nowrap font-headline text-xl font-bold uppercase tracking-[0.03em] text-[var(--color-primary)]">
                Minera Marte
              </h1>
              <p className="mt-1 whitespace-nowrap text-[8px] font-medium tracking-[0.2em] text-[var(--color-tertiary)]">
                SISTEMA MINERO INTEGRAL V1.0
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {topNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center py-3 text-sm font-medium transition-all ${
                  isSidebarCollapsed ? "justify-center px-2" : "gap-3 px-4"
                } ${
                  isActive
                    ? "border-l-4 border-[var(--color-primary)] bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
                }`
              }
            >
              <item.icon size={18} />
              {isSidebarCollapsed ? null : <span>{item.label}</span>}
            </NavLink>
          ))}

          {inventoryNavItems.length > 0 ? (
            <>
              <div
                className={`mt-2 flex items-center ${
                  isInventorySectionActive
                    ? "border-l-4 border-[var(--color-primary)] bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
                }`}
              >
                <NavLink
                  to="/inventario"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center py-3 text-sm font-semibold transition-all ${
                    isSidebarCollapsed ? "w-full justify-center px-2" : "flex-1 gap-3 px-4"
                  }`}
                >
                  <Boxes size={18} />
                  {isSidebarCollapsed ? null : <span>Inventario</span>}
                </NavLink>
                {isSidebarCollapsed ? null : (
                  <button
                    type="button"
                    onClick={() => setIsInventoryExpanded((current) => !current)}
                    className="px-3 text-[var(--color-on-surface-variant)] transition hover:text-[var(--color-on-surface)]"
                    aria-label={isInventoryExpanded ? "Contraer inventario" : "Expandir inventario"}
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isInventoryExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                )}
              </div>

              {isSidebarCollapsed || !isInventoryExpanded
                ? null
                : inventoryNavItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `ml-5 mr-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
                            : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
                        }`
                      }
                    >
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
            </>
          ) : null}

          {personalNavItems.length > 0 ? (
            <>
              <div
                className={`mt-2 flex items-center ${
                  isPersonalSectionActive
                    ? "border-l-4 border-[var(--color-primary)] bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
                }`}
              >
                <NavLink
                  to="/personal"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center py-3 text-sm font-semibold transition-all ${
                    isSidebarCollapsed ? "w-full justify-center px-2" : "flex-1 gap-3 px-4"
                  }`}
                >
                  <IdCard size={18} />
                  {isSidebarCollapsed ? null : <span>Personal</span>}
                </NavLink>
                {isSidebarCollapsed ? null : (
                  <button
                    type="button"
                    onClick={() => setIsPersonalExpanded((current) => !current)}
                    className="px-3 text-[var(--color-on-surface-variant)] transition hover:text-[var(--color-on-surface)]"
                    aria-label={isPersonalExpanded ? "Contraer personal" : "Expandir personal"}
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isPersonalExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                )}
              </div>

              {isSidebarCollapsed || !isPersonalExpanded
                ? null
                : personalNavItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `ml-5 mr-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
                            : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
                        }`
                      }
                    >
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
            </>
          ) : null}
        </nav>

        <div
          className={`mt-auto border-t border-[var(--color-border-soft)] pt-6 ${isSidebarCollapsed ? "px-3" : "px-6"}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--color-surface-container-highest)] text-xs font-bold text-[var(--color-primary)]">
              {avatarLabel}
            </div>
            {isSidebarCollapsed ? null : (
              <div>
                <p className="text-xs font-semibold text-[var(--color-on-surface)]">
                  {user?.nombre ?? "Usuario"}
                </p>
                <p className="text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                  {user?.role ?? "SIN ROL"}
                </p>
              </div>
            )}
          </div>
          {isSidebarCollapsed ? null : (
            <p className="mt-4 text-[10px] tracking-wide text-[var(--color-on-surface-variant)]/80">
              Marte Mining {yearLabel}
            </p>
          )}
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setIsSidebarCollapsed((current) => !current)}
        className={`fixed top-20 z-[60] hidden rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-1.5 text-[var(--color-on-surface-variant)] shadow-lg transition-all duration-300 hover:text-[var(--color-primary)] lg:block ${
          isSidebarCollapsed ? "left-[68px]" : "left-[244px]"
        }`}
        aria-label={isSidebarCollapsed ? "Expandir menu lateral" : "Colapsar menu lateral"}
      >
        {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Cerrar menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      ) : null}

      <header
        className={`fixed right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]/90 px-4 backdrop-blur-md transition-all duration-300 lg:px-8 ${
          isSidebarCollapsed ? "left-0 lg:left-20" : "left-0 lg:left-64"
        }`}
      >
        <div className="app-shell__header-search flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded p-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <button
            type="button"
            onClick={toggleMode}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            aria-label="Cambiar tema"
            title={`Cambiar a modo ${mode === "dark" ? "claro" : "oscuro"}`}
          >
            {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            <span className="hidden sm:inline">
              {mode === "dark" ? "Modo claro" : "Modo oscuro"}
            </span>
          </button>
        </div>

        <div className="app-shell__header-actions flex items-center gap-2 lg:gap-4">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => navigate("/inventario/offline-monitor")}
              className="rounded-lg border border-[var(--color-outline-variant)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
              title="Abrir monitoreo offline"
            >
              Offline queue: {offlinePendingQuery.data ?? 0}
            </button>
          ) : null}
          <button className="p-2 text-[var(--color-on-surface-variant)] transition-colors hover:text-[var(--color-primary)]">
            <RefreshCw size={18} />
          </button>
          <button className="relative p-2 text-[var(--color-on-surface-variant)] transition-colors hover:text-[var(--color-primary)]">
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--color-tertiary)]" />
          </button>
          <div className="mx-1 hidden h-6 w-px bg-[var(--color-border-soft)] sm:block" />
          <button
            type="button"
            onClick={() => navigate("/perfil")}
            className="hidden items-center gap-2 text-sm font-medium text-[var(--color-on-surface-variant)] transition hover:text-[var(--color-on-surface)] sm:flex"
          >
            <span>Perfil</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]">
              <CircleUserRound size={16} />
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate(getPostLogoutPath(window.location.hostname), { replace: true });
            }}
            className="app-shell__logout-btn rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main
        className={`min-h-screen px-4 pb-12 pt-24 transition-all duration-300 lg:px-8 ${
          isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <Outlet />
      </main>

      <img
        src={minerImage}
        alt=""
        aria-hidden="true"
        className="app-shell__miner pointer-events-none fixed bottom-5 right-5 z-30 h-24 w-24 opacity-90 md:h-28 md:w-28"
      />
    </div>
  );
}
