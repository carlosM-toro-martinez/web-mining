import { Link } from "react-router-dom";
import { ClipboardList, Landmark, PiggyBank, ReceiptText, FileBarChart2, Scale, Wallet } from "lucide-react";

const cards = [
  {
    title: "Parámetros",
    description: "Cajas y cuentas bancarias (con su saldo inicial), centros de costo, funciones de gasto, cuentas contables y tasas de retención. Se configuran una sola vez.",
    to: "/caja-chica/parametros",
    icon: Landmark,
    available: true
  },
  {
    title: "Registro de gastos",
    description: "Carga cada compra o gasto con su respaldo (día a día); el motor tributario calcula retenciones al instante.",
    to: "/caja-chica/gastos",
    icon: Wallet,
    available: true
  },
  {
    title: "Saldos y movimientos",
    description: "Cuánto hay disponible ahora mismo en cada caja y en cada cuenta bancaria, y dónde registras cualquier movimiento de dinero que no sea un gasto.",
    to: "/caja-chica/saldos",
    icon: Scale,
    available: true
  },
  {
    title: "Presupuesto",
    description: "Para qué se pidió el dinero de cada mes (partidas) y cuánto queda a favor de cada una.",
    to: "/caja-chica/presupuesto",
    icon: ClipboardList,
    available: true
  },
  {
    title: "Rendiciones",
    description: "Cierre formal periódico (semanal/mensual): agrupa los gastos ya registrados y genera el comprobante oficial para enviar a contabilidad.",
    to: "/caja-chica/rendiciones",
    icon: ReceiptText,
    available: true
  },
  {
    title: "Reportes",
    description: "Retenciones para el SIAT, gastos no deducibles y desglose por centro de costo, función de gasto y cuenta contable.",
    to: "/caja-chica/reportes",
    icon: FileBarChart2,
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
              Rendición de cuentas de campamento: registro de gastos, motor tributario automático y
              comprobante de diario bimoneda.
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
