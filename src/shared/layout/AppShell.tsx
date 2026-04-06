import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Boxes,
  CircleUserRound,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  LayoutDashboard,
  Map,
  Menu,
  Search,
  UserPlus,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import minerImage from "@/assets/miner.png";

interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
}

const baseNavItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  // { label: "Mapa", icon: Map, to: "/mapa" },
  { label: "Exploraciones", icon: FlaskConical, to: "/exploraciones" }
];

export function AppShell() {
  const navigate = useNavigate();
  const { user, isAdmin, canManageUsers, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const yearLabel = useMemo(() => new Date().getFullYear(), []);
  const isAlmacenero = user?.role === "ALMACENERO";
  const canSeeInventory = isAlmacenero || isAdmin;

  const displayItems = useMemo(() => {
    const items: NavItem[] = [...baseNavItems];
    if (canSeeInventory) {
      items.push({ label: "Inventario", icon: Boxes, to: "/inventario" });
    }
    if (canManageUsers) {
      items.push({ label: "Trabajadores", icon: UserPlus, to: "/trabajadores" });
    }
    return items;
  }, [canManageUsers, canSeeInventory]);

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

  return (
    <div className="app-shell min-h-screen bg-[var(--color-surface)] font-body text-[var(--color-on-surface)]">
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-[var(--color-surface-container-low)] px-0 py-6 transition-all duration-300 lg:translate-x-0 ${
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
          {displayItems.map((item) => (
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
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
            />
            <input
              type="text"
              placeholder="Buscar reporte..."
              className="app-shell__search-input w-56 rounded-lg border-none bg-[var(--color-surface-container)] py-2 pl-10 pr-4 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:ring-1 focus:ring-[var(--color-primary)] lg:w-80"
            />
          </div>
        </div>

        <div className="app-shell__header-actions flex items-center gap-2 lg:gap-4">
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
              navigate("/login", { replace: true });
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
