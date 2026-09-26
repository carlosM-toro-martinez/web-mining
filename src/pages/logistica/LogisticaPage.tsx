import { Link } from "react-router-dom";
import { Landmark, Truck, PackageSearch, ReceiptText, FileBarChart2 } from "lucide-react";

const cards = [
  {
    title: "Flota",
    description: "Vehículos, choferes y transportistas (empresas y particulares), con tablero de estado.",
    to: "/logistica/flota",
    icon: Truck,
    available: true
  },
  {
    title: "Parámetros",
    description: "Municipios, tipos de mineral, ingenios, alícuotas, tarifas y conceptos de liquidación.",
    to: "/logistica/parametros",
    icon: Landmark,
    available: true
  },
  {
    title: "Lotes de despacho",
    description: "Registro de lotes, Formulario 101, Conocimiento de Carga y pesaje en balanza.",
    to: "/logistica/lotes",
    icon: PackageSearch,
    available: true
  },
  {
    title: "Liquidaciones",
    description: "Liquidaciones semanales y mensuales a empresas y trabajadores particulares.",
    to: "/logistica/liquidaciones",
    icon: ReceiptText,
    available: true
  },
  {
    title: "Reportes",
    description: "Cuadro mensual y reporte municipal de regalías mineras.",
    to: "/logistica/reportes",
    icon: FileBarChart2,
    available: true
  }
] as const;

export function LogisticaPage() {
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-[var(--color-primary)]/15 p-3 text-[var(--color-primary)]">
            <Truck size={22} />
          </div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">
              Logística, Acopio y Liquidación
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Desde aquí eliges el proceso que quieres ejecutar dentro del área de logística minera.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-lg bg-[var(--color-primary)]/12 p-2 text-[var(--color-primary)]">
                  <Icon size={18} />
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    card.available
                      ? "bg-[var(--color-success)]/18 text-[var(--color-success)]"
                      : "bg-[var(--color-on-surface-variant)]/15 text-[var(--color-on-surface-variant)]"
                  }`}
                >
                  {card.available ? "Disponible" : "Próximamente"}
                </span>
              </div>

              <h2 className="text-lg font-bold">{card.title}</h2>
              <p className="mt-2 min-h-[48px] text-sm text-[var(--color-on-surface-variant)]">
                {card.description}
              </p>

              <div className="mt-5">
                {card.available ? (
                  <Link
                    to={card.to}
                    className="inline-flex rounded-lg border border-[var(--color-primary)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
                  >
                    Ir al proceso
                  </Link>
                ) : (
                  <span className="inline-flex rounded-lg border border-[var(--color-border-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]">
                    Aún no disponible
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
