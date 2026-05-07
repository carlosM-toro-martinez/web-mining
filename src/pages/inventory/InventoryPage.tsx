import { Link } from "react-router-dom";
import {
  Building2,
  Boxes,
  Landmark,
  FolderTree,
  HardHat,
  PackageSearch,
  PackageCheck,
  Layers3,
  FileBarChart2,
  ReceiptText,
  Settings,
  Truck
} from "lucide-react";

const cards = [
  // {
  //   title: "Kardex Valorado",
  //   description: "Consulta movimientos, saldos y valorizacion historica de materiales.",
  //   to: "/kardex-valorado",
  //   icon: ClipboardList,
  //   available: true
  // },
  {
    title: "Categorias",
    description: "Define grupos y subgrupos para mantener la jerarquia de inventario.",
    to: "/inventario/categorias",
    icon: FolderTree,
    available: true
  },
  {
    title: "Productos",
    description: "Crea, filtra y edita productos por grupo y subgrupo.",
    to: "/inventario/productos",
    icon: PackageSearch,
    available: true
  },
  {
    title: "Stock Actual",
    description: "Consulta stock detallado por producto y ordena de menor a mayor existencia.",
    to: "/inventario/stock",
    icon: Layers3,
    available: true
  },
  {
    title: "Reportes",
    description: "Consulta Bin Card y Bin Card Valorado por fecha, producto y paginacion.",
    to: "/inventario/reportes",
    icon: FileBarChart2,
    available: true
  },
  {
    title: "Contabilidad",
    description: "Administra centros de costo, funciones de gasto y cuentas contables.",
    to: "/inventario/contabilidad",
    icon: Landmark,
    available: true
  },
  {
    title: "Proveedores",
    description: "Crea y consulta proveedores para abastecimiento y trazabilidad de compras.",
    to: "/inventario/proveedores",
    icon: Building2,
    available: true
  },
  {
    title: "Compras",
    description: "Gestiona requisiciones, ordenes y recepcion de abastecimiento.",
    to: "/inventario/compras",
    icon: ReceiptText,
    available: true
  },
  {
    title: "Vales",
    description: "Control de vales de salida para consumo interno y trazabilidad.",
    to: "/inventario/vales",
    icon: PackageCheck,
    available: true
  },
  {
    title: "Movimientos y Entregas",
    description: "Operacion de entregas por vale y registro de entrega sin vale.",
    to: "/inventario/entregas",
    icon: Truck,
    available: true
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
            <h1 className="page-title font-headline text-3xl font-extrabold">Inventario</h1>
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
