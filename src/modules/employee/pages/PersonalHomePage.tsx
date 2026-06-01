import { Link } from "react-router-dom";
import { ClipboardList, UsersRound, Clock3 } from "lucide-react";

const cards = [
  {
    title: "Personal",
    description: "Gestión de empleados, edición y estado de sincronización.",
    to: "/personal/empleados",
    icon: UsersRound
  },
  {
    title: "Reportes",
    description: "Asistencia filtrada por fecha, empleado y tipo con paginación.",
    to: "/personal/reportes",
    icon: ClipboardList
  },
  {
    title: "Pendientes",
    description: "Comandos pendientes por enviar al biométrico.",
    to: "/personal/empleados",
    icon: Clock3
  }
] as const;

export function PersonalHomePage() {
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <h1 className="page-title font-headline text-3xl font-extrabold">Personal</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
          Selecciona el proceso del módulo de personal.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
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
