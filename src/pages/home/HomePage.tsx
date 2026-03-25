import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";

export function HomePage() {
  return (
    <section className="space-y-6">
      <div className="rounded-xl bg-surface-container-low p-6">
        <h2 className="font-headline text-3xl font-extrabold text-on-surface">Dashboard Operativo</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Este tablero ya usa el nuevo theme de Kardex Valorado. Desde aqui puedes navegar a
          reportes, inventario y modulos operativos con una interfaz unificada.
        </p>
        <div className="mt-5">
          <Link
            to="/kardex-valorado"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:opacity-90"
          >
            <BarChart3 size={18} />
            Ir a Kardex Valorado
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-xl bg-surface-container-high p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Alertas</p>
          <p className="mt-2 font-headline text-2xl font-bold text-tertiary">3 Activas</p>
        </article>
        <article className="rounded-xl bg-surface-container-high p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Ordenes del dia</p>
          <p className="mt-2 font-headline text-2xl font-bold text-primary-dim">18</p>
        </article>
        <article className="rounded-xl bg-surface-container-high p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Sincronizacion</p>
          <p className="mt-2 font-headline text-2xl font-bold text-on-surface">Hace 4 min</p>
        </article>
      </div>
    </section>
  );
}
