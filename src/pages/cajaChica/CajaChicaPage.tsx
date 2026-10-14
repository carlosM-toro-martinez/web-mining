import { Link } from "react-router-dom";
import { ClipboardList, Landmark, PiggyBank, ReceiptText, FileBarChart2, Scale, Wallet } from "lucide-react";

// Ordenadas por lo que más se usa: lo del día a día primero, la
// configuración al final.
const cards = [
  {
    title: "Registro de gastos",
    description: "Anota cada compra o pago con su comprobante, el mismo día. Es lo que más vas a usar.",
    to: "/caja-chica/gastos",
    icon: Wallet,
    available: true
  },
  {
    title: "Saldos y movimientos",
    description: "Cuánto dinero hay ahora en cada caja y en cada banco. Aquí también anotas el dinero que llega o que pasa del banco a la caja.",
    to: "/caja-chica/saldos",
    icon: Scale,
    available: true
  },
  {
    title: "Presupuesto",
    description: "Para qué se pidió el dinero de cada mes y cuánto queda de cada cosa.",
    to: "/caja-chica/presupuesto",
    icon: ClipboardList,
    available: true
  },
  {
    title: "Rendiciones",
    description: "Cierre de cada semana o mes: junta los gastos y arma el documento para contabilidad.",
    to: "/caja-chica/rendiciones",
    icon: ReceiptText,
    available: true
  },
  {
    title: "Reportes",
    description: "Resúmenes para contabilidad e impuestos, y aviso de gastos o entradas que parecen repetidos.",
    to: "/caja-chica/reportes",
    icon: FileBarChart2,
    available: true
  },
  {
    title: "Parámetros",
    description: "Configuración: cajas, cuentas bancarias y listas de clasificación. Se arma una sola vez.",
    to: "/caja-chica/parametros",
    icon: Landmark,
    available: true
  }
] as const;

export function CajaChicaPage() {
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-[var(--color-primary)]/15 p-3 text-[var(--color-primary)]">
            <PiggyBank size={22} />
          </div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">Caja Chica</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              El dinero del campamento: qué se gastó, cuánto queda y el cierre para contabilidad.
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
