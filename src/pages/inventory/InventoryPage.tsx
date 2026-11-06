import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { usePermisos } from "@/features/auth/hooks/usePermisos";
import {
  ArrowRight,
  Building2,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  FileBarChart2,
  FolderTree,
  HardHat,
  Landmark,
  Layers3,
  PackageCheck,
  PackageSearch,
  ReceiptText,
  Settings,
  type LucideIcon
} from "lucide-react";

interface InventoryCard {
  title: string;
  description: string;
  to: string;
  recurso: string;
  icon: LucideIcon;
  proximamente?: boolean;
}

interface InventorySection {
  title: string;
  description: string;
  cards: InventoryCard[];
}

// "__admin__" = solo visible para ADMIN (no depende de permisos asignables)
const sections: InventorySection[] = [
  {
    title: "Compras, abastecimiento y salidas",
    description: "Lo que se pide a los proveedores, lo que llega al almacén y lo que sale para consumo interno.",
    cards: [
      {
        title: "Pedidos de compra",
        description: "Crea pedidos a proveedores y sigue si llegaron y si tienen factura o recibo.",
        to: "/inventario/compras",
        recurso: "inventario.compras",
        icon: ReceiptText
      },
      {
        title: "Recepción de compras",
        description: "Confirma con las cantidades reales lo que llegó de cada pedido.",
        to: "/inventario/recepcion",
        recurso: "inventario.recepcion",
        icon: ClipboardCheck
      },
      {
        title: "Proveedores",
        description: "Crea y consulta proveedores para abastecimiento y trazabilidad de compras.",
        to: "/inventario/proveedores",
        recurso: "inventario.proveedores",
        icon: Building2
      },
      {
        title: "Vales",
        description: "Control de vales de salida para consumo interno y trazabilidad.",
        to: "/inventario/vales",
        recurso: "inventario.vales",
        icon: PackageCheck
      }
    ]
  },
  {
    title: "Históricos",
    description: "Registros de meses anteriores, con su fecha de operación original.",
    cards: [
      {
        title: "Vales y compras históricos",
        description: "Registro de vales y compras con fecha de operación específica, y cierre de períodos.",
        to: "/inventario/vales-historicos",
        recurso: "inventario.vales_historicos",
        icon: CalendarClock
      }
    ]
  },
  {
    title: "Consulta y reportes",
    description: "Ver cuánto hay y revisar los movimientos.",
    cards: [
      {
        title: "Stock",
        description: "Existencias actuales de cada producto con su costo.",
        to: "/inventario/stock",
        recurso: "inventario.stock",
        icon: Layers3
      },
      {
        title: "Reportes",
        description: "Bin Card, Bin Card Valorado, inventario general y demás reportes por fecha y producto.",
        to: "/inventario/reportes",
        recurso: "inventario.reportes",
        icon: FileBarChart2
      }
    ]
  },
  {
    title: "Catálogo y configuración",
    description: "Los datos base sobre los que trabaja el inventario.",
    cards: [
      {
        title: "Productos",
        description: "Crea, filtra y edita productos por grupo y subgrupo.",
        to: "/inventario/productos",
        recurso: "inventario.productos",
        icon: PackageSearch
      },
      {
        title: "Categorías",
        description: "Define grupos y subgrupos para mantener la jerarquía de inventario.",
        to: "/inventario/categorias",
        recurso: "inventario.productos",
        icon: FolderTree
      },
      {
        title: "Contabilidad",
        description: "Administra centros de costo, funciones de gasto y cuentas contables.",
        to: "/inventario/contabilidad",
        recurso: "inventario.contabilidad",
        icon: Landmark
      },
      {
        title: "Ajustes",
        description: "Sincronizar stock, backfill de CPP y revisión de negativos.",
        to: "/inventario/ajustes",
        recurso: "inventario.stock",
        icon: Settings
      }
    ]
  },
  {
    title: "Otros módulos relacionados",
    description: "Áreas que se apoyan en el inventario.",
    cards: [
      {
        title: "EPP",
        description: "Asignación y control de equipos de protección personal.",
        to: "/epp",
        recurso: "__admin__",
        icon: HardHat,
        proximamente: true
      }
    ]
  }
];

export function InventoryPage() {
  const { isAdmin } = useAuth();
  const { can } = usePermisos();

  // Solo se muestran los procesos a los que el rol tiene acceso, y las secciones que
  // se quedan sin tarjetas no aparecen
  const visibleSections = sections
    .map((section) => ({
      ...section,
      cards: section.cards.filter((card) =>
        card.recurso === "__admin__" ? isAdmin : can(card.recurso, "ver")
      )
    }))
    .filter((section) => section.cards.length > 0);

  return (
    <section className="space-y-8 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-[var(--color-primary)]/15 p-3 text-[var(--color-primary)]">
            <Boxes size={22} />
          </div>
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">Inventario</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Elige lo que quieres hacer. Las opciones están agrupadas por para qué sirven.
            </p>
          </div>
        </div>
      </header>

      {visibleSections.map((section) => (
        <section key={section.title} aria-labelledby={`seccion-${section.title}`} className="space-y-3">
          <div className="border-b border-[var(--color-border-soft)] pb-2">
            <h2 id={`seccion-${section.title}`} className="font-headline text-xl font-extrabold">
              {section.title}
            </h2>
            <p className="text-sm text-[var(--color-on-surface-variant)]">{section.description}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {section.cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  to={card.to}
                  className="group flex items-start gap-4 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4 transition hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-surface-container-highest)]"
                >
                  <span className="shrink-0 rounded-lg bg-[var(--color-primary)]/12 p-2.5 text-[var(--color-primary)]">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold">{card.title}</span>
                      {card.proximamente ? (
                        <span className="rounded-full bg-[var(--color-on-surface-variant)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                          Próximamente
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">{card.description}</span>
                  </span>
                  <ArrowRight
                    size={16}
                    className="mt-1 shrink-0 text-[var(--color-on-surface-variant)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}
