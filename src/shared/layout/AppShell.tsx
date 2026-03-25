import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Boxes,
  LayoutDashboard,
  Menu,
  Search,
  UserPlus,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";

interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Inventario", icon: Boxes, to: "/inventario" }
];

export function AppShell() {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const yearLabel = useMemo(() => new Date().getFullYear(), []);

  const displayItems = useMemo(() => {
    if (!isAdmin) return navItems;
    return [...navItems, { label: "Trabajadores", icon: UserPlus, to: "/usuarios/nuevo" }];
  }, [isAdmin]);

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

  return (
    <div className="min-h-screen bg-[var(--color-surface)] font-body text-[var(--color-on-surface)]">
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-[var(--color-surface-container-low)] px-0 py-6 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 px-6">
          <h1 className="font-headline text-xl font-bold uppercase tracking-[0.03em] text-[var(--color-primary)]">
            Minera Marte
          </h1>
          <p className="mt-1 text-[8px] font-medium tracking-[0.2em] text-[var(--color-tertiary)]">
            SISTEMA MINERO INTEGRAL V1.0
          </p>
        </div>

        <nav className="flex-1 space-y-1">
          {displayItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "border-l-4 border-[var(--color-primary)] bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-[var(--color-border-soft)] px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--color-surface-container-highest)] text-xs font-bold text-[var(--color-primary)]">
              {avatarLabel}
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-on-surface)]">{user?.nombre ?? "Usuario"}</p>
              <p className="text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                {user?.role ?? "SIN ROL"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[10px] tracking-wide text-[var(--color-on-surface-variant)]/80">
            Marte Mining {yearLabel}
          </p>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Cerrar menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      ) : null}

      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]/90 px-4 backdrop-blur-md lg:left-64 lg:px-8">
        <div className="flex items-center gap-4">
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
              className="w-56 rounded-lg border-none bg-[var(--color-surface-container)] py-2 pl-10 pr-4 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:ring-1 focus:ring-[var(--color-primary)] lg:w-80"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
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
            <img
              alt="Avatar del operador"
              className="h-8 w-8 rounded-full border border-white/10"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBudVX1vcjDRWpZ0-ZdxpUI2uUJzTbJFB4BVfWzOk6sZi83AkZQEAv75FjBf4SyhS5kGrPqGzWqLFyDGa8TobZnFxOJSkpQmo-Y1MQUFk7EOaGAWtkbaDdTuSZwIgahlWP5J8ArvEqKtdkitRsw0O1IUOOcltvF5sP7uLnI0HPeCnek-XKISWileS4nJyK9Bz8yYA__yzMlXWZ7_1P2q2BtGpWJFghTOSfgSEOBo6kA8RI3171BAGqC2QNA5nmU9fskPnKW4EFbnWhk"
            />
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
            className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="min-h-screen px-4 pb-12 pt-24 lg:ml-64 lg:px-8">
        <Outlet />
      </main>

      <img
        src="/images/miner.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed bottom-5 right-5 z-30 h-24 w-24 opacity-90 md:h-28 md:w-28"
      />
    </div>
  );
}
