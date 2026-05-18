import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, XCircle } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { usePedidosQuery, useCancelarPedidoMutation } from "@/features/pedidos/hooks/usePedidos";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

export function PedidosPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const canCancel = user?.role === "ADMIN";
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const pedidosQuery = usePedidosQuery({ page, limit: 10, estado: estado || undefined, proveedorId: proveedorId ? Number(proveedorId) : undefined });
  const cancelarMutation = useCancelarPedidoMutation();
  const pedidos = pedidosQuery.data?.data ?? [];
  const meta = pedidosQuery.data?.meta;
  const proveedores = useMemo(() => {
    const map = new Map<string, string>();
    pedidos.forEach((pedido) => {
      if (pedido.proveedor?.id) map.set(String(pedido.proveedor.id), pedido.proveedor.nombre ?? `Proveedor ${pedido.proveedor.id}`);
    });
    return [...map.entries()];
  }, [pedidos]);

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4"><SubrouteBackButton /></div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]"><ClipboardList size={18} /></div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Pedidos a proveedor</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Seguimiento de ordenes de compra sin afectar stock.</p>
          </div>
        </div>
      </header>
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} className={inputClassName}>
            <option value="">Todos los estados</option><option value="PENDIENTE">PENDIENTE</option><option value="PARCIAL">PARCIAL</option><option value="COMPLETADO">COMPLETADO</option>
          </select>
          <select value={proveedorId} onChange={(e) => { setProveedorId(e.target.value); setPage(1); }} className={inputClassName}>
            <option value="">Todos los proveedores</option>
            {proveedores.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
          </select>
          <button type="button" onClick={() => { setEstado(""); setProveedorId(""); setPage(1); }} className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]">Limpiar</button>
        </div>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead><tr><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Estado</th><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Proveedor</th><th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Fecha</th><th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Accion</th></tr></thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {pedidos.map((pedido) => <tr key={pedido.id}><td className="px-3 py-2 text-xs">{pedido.estado}</td><td className="px-3 py-2 text-xs">{pedido.proveedor?.nombre ?? "-"}</td><td className="px-3 py-2 text-xs">{pedido.createdAt ? new Date(pedido.createdAt).toLocaleString() : "-"}</td><td className="px-3 py-2 text-right">{canCancel && pedido.estado !== "COMPLETADO" ? <button type="button" onClick={() => cancelarMutation.mutate(pedido.id, { onSuccess: () => showSuccess("Pedido cerrado."), onError: () => showError("No se pudo cerrar el pedido.") })} className="inline-flex items-center gap-1 rounded-md border border-[var(--color-error)]/45 px-2 py-1 text-xs font-semibold text-[var(--color-error)]"><XCircle size={12} />Cerrar</button> : "-"}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between"><span className="text-xs text-[var(--color-on-surface-variant)]">{meta ? `Pagina ${meta.page} de ${meta.totalPages}` : "-"}</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((c) => Math.max(1, c - 1))} disabled={!meta || page <= 1} className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"><ChevronLeft size={16} /></button><button type="button" onClick={() => setPage((c) => (meta && c < meta.totalPages ? c + 1 : c))} disabled={!meta || page >= meta.totalPages} className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"><ChevronRight size={16} /></button></div></div>
      </article>
    </section>
  );
}
