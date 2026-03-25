import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

interface NavItem {
  label: string;
  icon: string;
  to: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", to: "/" },
  { label: "Inventario", icon: "inventory_2", to: "/inventario" },
  { label: "Compras", icon: "shopping_cart", to: "/compras" },
  { label: "Vales", icon: "receipt_long", to: "/vales" },
  { label: "Entrega de Materiales", icon: "local_shipping", to: "/entregas" },
  { label: "Reportes", icon: "analytics", to: "/kardex-valorado" },
  { label: "EPP", icon: "engineering", to: "/epp" },
  { label: "Ajustes", icon: "settings", to: "/ajustes" }
];

export function AppShell() {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const yearLabel = useMemo(() => new Date().getFullYear(), []);

  const displayItems = useMemo(() => {
    if (!isAdmin) return navItems;
    return [...navItems, { label: "Nuevo Usuario", icon: "person_add", to: "/usuarios/nuevo" }];
  }, [isAdmin]);

  const avatarLabel = useMemo(() => {
    const source = user?.nombre?.trim();
    if (!source) return "UO";
    const parts = source.split(" ").filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
    return initials || "UO";
  }, [user?.nombre]);

  return (
    <div className="min-h-screen bg-[#090e1a] font-body text-[#dde5ff]">
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-[#090e1a] px-0 py-6 transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-8 px-6">
          <h1 className="font-headline text-[39px] text-xl font-bold uppercase tracking-[0.03em] text-[#9ecaff]">
            Gestión Minera
          </h1>
          <p className="mt-1 text-[10px] font-medium tracking-[0.2em] text-[#7a85a5]">
            OPERACIONES V2.4
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
                    ? "border-l-4 border-[#9ecaff] bg-[#1a243a] text-[#9ecaff]"
                    : "text-[#a2adc8] hover:bg-[#121b2e] hover:text-[#dde5ff]"
                }`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/5 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#132549] text-xs font-bold text-[#9ecaff]">
              {avatarLabel}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#dde5ff]">{user?.nombre ?? "Usuario"}</p>
              <p className="text-[10px] uppercase text-[#7a85a5]">{user?.role ?? "SIN ROL"}</p>
            </div>
          </div>
          <p className="mt-4 text-[10px] tracking-wide text-[#5b6787]">Marte Mining {yearLabel}</p>
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

      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-[#090e1acc] px-4 backdrop-blur-md lg:left-64 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded p-2 text-[#9aaad6] hover:text-[#9ecaff] lg:hidden"
            aria-label="Abrir menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#63739b]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar reporte..."
              className="w-56 rounded-lg border-none bg-[#0b1324] py-2 pl-10 pr-4 text-sm text-[#dde5ff] placeholder:text-[#5f6f94] focus:ring-1 focus:ring-[#9ecaff] lg:w-80"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <button className="p-2 text-[#9aaad6] transition-colors hover:text-[#9ecaff]">
            <span className="material-symbols-outlined">sync</span>
          </button>
          <button className="relative p-2 text-[#9aaad6] transition-colors hover:text-[#9ecaff]">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ffb14b]" />
          </button>
          <div className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
          <button
            type="button"
            onClick={() => navigate("/perfil")}
            className="hidden items-center gap-2 text-sm font-medium text-[#9aaad6] transition hover:text-white sm:flex"
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
            className="rounded-lg border border-[#37476d] px-3 py-1.5 text-xs font-semibold text-[#9aaad6] transition hover:border-[#9ecaff] hover:text-[#dde5ff]"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="min-h-screen px-4 pb-12 pt-24 lg:ml-64 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
