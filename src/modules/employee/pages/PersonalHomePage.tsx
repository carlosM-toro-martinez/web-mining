import { Link } from "react-router-dom";
import { ClipboardList, UsersRound, Clock3, CalendarDays, UserCog, FileBarChart2 } from "lucide-react";
import { usePermisos } from "@/features/auth/hooks/usePermisos";
import { BiometricStatusBadge } from "@/modules/employee/components/BiometricStatusBadge";

const cards = [
  {
    title: "Personal",
    description: "Gestión de empleados, edición y estado de sincronización.",
    to: "/personal/empleados",
    icon: UsersRound,
    recurso: "personal.empleados"
  },
  {
    title: "Reportes",
    description: "Asistencia filtrada por fecha, empleado y tipo con paginación.",
    to: "/personal/reportes",
    icon: ClipboardList,
    recurso: "personal.asistencia"
  },
  {
    title: "Horarios",
    description: "Configura turnos, tolerancia y días laborales.",
    to: "/personal/horarios",
    icon: CalendarDays,
    recurso: "personal.horarios"
  },
  {
    title: "Asignaciones",
    description: "Asigna horarios a empleados y consulta historial.",
    to: "/personal/asignaciones",
    icon: UserCog,
    recurso: "personal.asignaciones"
  },
  {
    title: "Ausencias",
    description: "Vacaciones, permisos y demás ausencias por empleado.",
    to: "/personal/ausencias",
    icon: Clock3,
    recurso: "personal.ausencias"
  },
  {
    title: "Reporte Asistencia",
    description: "Comparación de marcajes versus horario asignado.",
    to: "/personal/reporte",
    icon: FileBarChart2,
    recurso: "personal.asistencia"
  }
] as const;

export function PersonalHomePage() {
  const { can } = usePermisos();
  const visibles = cards.filter((card) => can(card.recurso, "ver"));

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <h1 className="page-title font-headline text-3xl font-extrabold">Personal</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
          Selecciona el proceso del módulo de personal.
        </p>
        <div className="mt-4">
          <BiometricStatusBadge />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibles.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-5">
              <div className="mb-4 rounded-lg bg-[var(--color-primary)]/12 p-2 text-[var(--color-primary)] w-fit">
                <Icon size={18} />
              </div>
              <h2 className="text-lg font-bold">{card.title}</h2>
              <p className="mt-2 min-h-[48px] text-sm text-[var(--color-on-surface-variant)]">{card.description}</p>
              <div className="mt-5">
                <Link to={card.to} className="inline-flex rounded-lg border border-[var(--color-primary)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10">
                  Ir al proceso
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
