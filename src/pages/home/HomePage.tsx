import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  HardHat,
  IdCard,
  LayoutDashboard,
  Leaf,
  MoveRight,
  PiggyBank,
  Truck,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";

interface DashboardItem {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
}

export function HomePage() {
  const { user, isAdmin, isSuperintendente, canManageUsers } = useAuth();

  // Mismas condiciones de rol que el menú lateral (AppShell.tsx) y los guards
  // de ruta (app/router/guards/*.tsx) — si un rol no puede entrar al módulo,
  // tampoco debe ver su tarjeta acá. Al cambiar el acceso de un módulo, hay
  // que actualizar los 3 lugares juntos (guard, menú, este panel).
  const isAlmacenero = user?.role === "ALMACENERO";
  const isRecepcionista = user?.role === "RECEPCIONISTA";
  const isAdministrador = user?.role === "ADMINISTRADOR";
  const isAsistenteAdministrativo = user?.role === "ASISTENTE_ADMINISTRATIVO";
  const isContador = user?.role === "CONTADOR";

  const canSeeInventario = isAlmacenero || isAdmin || isRecepcionista || isSuperintendente;
  const canSeePersonal = isAdmin || isAdministrador || isSuperintendente;
  const canSeeLogistica = isAdmin || isSuperintendente || isAsistenteAdministrativo;
  const canSeeCajaChica = isAdmin || isAdministrador || isContador || isSuperintendente;
  // EPP y Ambiental: solo ADMIN por ahora, a pedido explícito, hasta que se
  // creen roles específicos (ej. Seguridad, Medioambiente) que deban verlos.
  const canSeeEpp = isAdmin;
  const canSeeAmbiental = isAdmin;

  const items: DashboardItem[] = [
    {
      title: "Dashboard",
      description: "Vista general del sistema y estado operativo.",
      to: "/",
      icon: LayoutDashboard
    }
    // Kardex Valorado queda deliberadamente fuera del panel por ahora — sigue
    // sin card ni entrada de menú, igual que antes de este cambio.
  ];

  if (canSeeInventario) {
    items.push({
      title: "Inventario",
      description: "Gestión de categorías, productos y flujos de almacén.",
      to: "/inventario",
      icon: Boxes
    });
  }

  if (canSeePersonal) {
    items.push({
      title: "Personal",
      description: "Empleados, horarios, asignaciones y ausencias.",
      to: "/personal",
      icon: IdCard
    });
  }

  if (canSeeLogistica) {
    items.push({
      title: "Logística",
      description: "Flota, lotes de despacho, liquidaciones y remitentes.",
      to: "/logistica",
      icon: Truck
    });
  }

  if (canSeeCajaChica) {
    items.push({
      title: "Caja Chica",
      description: "Gastos, presupuesto, saldos y rendiciones de caja.",
      to: "/caja-chica",
      icon: PiggyBank
    });
  }

  if (canSeeEpp) {
    items.push({
      title: "EPP",
      description: "Equipos de protección personal asignados al personal.",
      to: "/epp",
      icon: HardHat
    });
  }

  if (canSeeAmbiental) {
    items.push({
      title: "Ambiental",
      description: "Registros hídricos, de residuos, ruido y suelo.",
      to: "/ambiental",
      icon: Leaf
    });
  }

  if (canManageUsers) {
    items.push({
      title: "Trabajadores",
      description: "Administración de usuarios, permisos y cuentas.",
      to: "/trabajadores",
      icon: UserPlus
    });
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <h1 className="page-title font-headline text-4xl font-extrabold">Panel Principal</h1>
        <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
          Accesos rápidos a los módulos principales del sistema.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="group rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-container-highest)]"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="inline-flex rounded-xl bg-[var(--color-primary)]/15 p-3 text-[var(--color-primary)]">
                  <Icon size={22} />
                </span>
                <span className="rounded-full bg-[var(--color-tertiary)]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-tertiary)]">
                  módulo
                </span>
              </div>

              <h2 className="text-2xl font-bold">{item.title}</h2>
              <p className="mt-2 min-h-[48px] text-sm text-[var(--color-on-surface-variant)]">
                {item.description}
              </p>

              <Link
                to={item.to}
                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[var(--color-primary)]/50 px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition group-hover:bg-[var(--color-primary)]/10"
              >
                Ir al módulo
                <MoveRight size={15} />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
