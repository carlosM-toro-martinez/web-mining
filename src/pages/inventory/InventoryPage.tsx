import { Link } from "react-router-dom";
import { Boxes, ClipboardList, HardHat, PackageCheck, ReceiptText, Settings, Truck } from "lucide-react";

const cards = [
  {
    title: "Kardex Valorado",
    description: "Consulta movimientos, saldos y valorizacion historica de materiales.",
    to: "/kardex-valorado",
    icon: ClipboardList,
    available: true
  },
  {
    title: "Compras",
    description: "Gestiona requisiciones, ordenes y recepcion de abastecimiento.",
    to: "/compras",
    icon: ReceiptText,
    available: false
  },
  {
    title: "Vales",
    description: "Control de vales de salida para consumo interno y trazabilidad.",
    to: "/vales",
    icon: PackageCheck,
    available: false
  },
  {
    title: "Entregas",
    description: "Seguimiento de entrega de materiales por area y responsable.",
    to: "/entregas",
    icon: Truck,
    available: false
  },
  {
    title: "EPP",
    description: "Asignacion y control de equipos de proteccion personal.",
    to: "/epp",
    icon: HardHat,
    available: false
  },
  {
    title: "Ajustes",
    description: "Configuraciones operativas y parametros del modulo inventario.",
    to: "/ajustes",
    icon: Settings,
    available: false
  }
] as const;

export function InventoryPage() {
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-[var(--color-primary)]/15 p-3 text-[var(--color-primary)]">
            <Boxes size={22} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Inventario</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Desde aqui eliges el proceso que quieres ejecutar dentro del area de inventario.
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
                  {card.available ? "Disponible" : "Proximamente"}
                </span>
              </div>

              <h2 className="text-lg font-bold">{card.title}</h2>
              <p className="mt-2 min-h-[48px] text-sm text-[var(--color-on-surface-variant)]">
                {card.description}
              </p>

              <div className="mt-5">
                <Link
                  to={card.to}
                  className="inline-flex rounded-lg border border-[var(--color-primary)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
                >
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
