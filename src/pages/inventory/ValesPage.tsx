import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PackageCheck, Plus, Search } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import { useCreateValeMutation, useValeQuery, useValesQuery } from "@/features/vales/hooks/useVales";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

interface ValeDraftItem {
  id: number;
  productoId: string;
  cantidadSolicitada: string;
}

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function estadoValeClassName(estado: string) {
  if (estado === "ENTREGADO" || estado === "COMPLETADO") {
    return "border-[var(--color-success)]/35 bg-[var(--color-success)]/18 text-[var(--color-success)]";
  }
  if (estado === "APROBADO" || estado === "PARCIAL") {
    return "border-[var(--color-tertiary)]/35 bg-[var(--color-tertiary)]/18 text-[var(--color-tertiary)]";
  }
  return "border-[var(--color-warning)]/35 bg-[var(--color-warning)]/18 text-[var(--color-warning)]";
}

export function ValesPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const productosQuery = useProductosQuery({ page: 1, limit: 200, search: "" });
  const createValeMutation = useCreateValeMutation();
  const valesQuery = useValesQuery();

  const [draftItems, setDraftItems] = useState<ValeDraftItem[]>([
    { id: 1, productoId: "", cantidadSolicitada: "1" }
  ]);
  const [nextDraftItemId, setNextDraftItemId] = useState(2);
  const [ultimosVales, setUltimosVales] = useState<string[]>([]);
  const [valesPage, setValesPage] = useState(1);
  const [valeIdInput, setValeIdInput] = useState("");
  const [valeIdActivo, setValeIdActivo] = useState("");

  const valeQuery = useValeQuery(valeIdActivo);
  const vale = valeQuery.data?.data;
  const productos = productosQuery.data?.data ?? [];
  const vales = valesQuery.data?.data ?? [];

  const valesPageSize = 8;
  const misValesOrdenados = useMemo(
    () =>
      [...vales]
        .filter((valeItem) => String(valeItem.solicitanteId ?? "") === String(user?.id ?? ""))
        .sort((a, b) => {
          const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return right - left;
        }),
    [user?.id, vales]
  );

  const totalValesPages = Math.max(1, Math.ceil(misValesOrdenados.length / valesPageSize));
  const valesPaginados = useMemo(() => {
    const start = (valesPage - 1) * valesPageSize;
    return misValesOrdenados.slice(start, start + valesPageSize);
  }, [misValesOrdenados, valesPage]);

  const productoOptions = useMemo(
    () =>
      productos.map((producto) => ({
        id: String(producto.id),
        label: `${producto.codigo} - ${producto.nombre} (${producto.unidad}) - stock: ${producto.stock.cantidad}`,
        searchText: `${producto.codigo} ${producto.nombre} ${producto.unidad}`
      })),
    [productos]
  );

  useEffect(() => {
    if (valesPage > totalValesPages) {
      setValesPage(totalValesPages);
    }
  }, [totalValesPages, valesPage]);

  function addDraftItem() {
    setDraftItems((current) => [
      ...current,
      { id: nextDraftItemId, productoId: "", cantidadSolicitada: "1" }
    ]);
    setNextDraftItemId((current) => current + 1);
  }

  function updateDraftItem(id: number, patch: Partial<ValeDraftItem>) {
    setDraftItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function removeDraftItem(id: number) {
    setDraftItems((current) => {
      if (current.length <= 1) return current;
      return current.filter((item) => item.id !== id);
    });
  }

  function handleCreateVale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.id) {
      showError("No se detecto un usuario autenticado.");
      return;
    }

    const items = draftItems.map((item) => ({
      productoId: Number(item.productoId),
      cantidadSolicitada: Number(item.cantidadSolicitada)
    }));

    if (
      items.some(
        (item) => !item.productoId || !item.cantidadSolicitada || item.cantidadSolicitada <= 0
      )
    ) {
      showError("Completa producto y cantidad solicitada valida en todos los items.");
      return;
    }

    createValeMutation.mutate(
      { solicitanteId: Number(user.id), items },
      {
        onSuccess: (response) => {
          const createdId = response.data.id;
          showSuccess("Vale creado correctamente.");
          setValeIdInput(createdId);
          setValeIdActivo(createdId);
          setUltimosVales((current) =>
            [createdId, ...current.filter((id) => id !== createdId)].slice(0, 6)
          );
          setDraftItems([{ id: 1, productoId: "", cantidadSolicitada: "1" }]);
          setNextDraftItemId(2);
        },
        onError: (error) => {
          showError(normalizeError(error, "No se pudo crear el vale."));
        }
      }
    );
  }

  function handleBuscarVale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = valeIdInput.trim();
    if (!trimmed) {
      showError("Ingresa el ID del vale.");
      return;
    }
    setValeIdActivo(trimmed);
  }

  const valeEsMio = vale
    ? String(vale.solicitanteId ?? "") === String(user?.id ?? "")
    : true;

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <PackageCheck size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Mis vales de solicitud</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Crea y consulta solo los vales que solicitaste como usuario logueado.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 text-lg font-bold">Mis vales registrados</h2>
        {valesQuery.isLoading ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando vales...</p>
        ) : null}
        {valesQuery.isError ? (
          <p className="text-sm text-[var(--color-error)]">No se pudo cargar la lista de vales.</p>
        ) : null}
        {!valesQuery.isLoading && !valesQuery.isError && misValesOrdenados.length === 0 ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            Aun no registraste vales.
          </p>
        ) : null}

        {misValesOrdenados.length > 0 ? (
          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Estado
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Fecha
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Accion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {valesPaginados.map((valeItem) => (
                  <tr key={valeItem.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${estadoValeClassName(valeItem.estado)}`}
                      >
                        {valeItem.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {valeItem.createdAt ? new Date(valeItem.createdAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setValeIdInput(valeItem.id);
                          setValeIdActivo(valeItem.id);
                        }}
                        className="rounded-md border border-[var(--color-primary)]/45 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                Pagina {valesPage} de {totalValesPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setValesPage((current) => Math.max(1, current - 1))}
                  disabled={valesPage <= 1}
                  className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setValesPage((current) => Math.min(totalValesPages, current + 1))}
                  disabled={valesPage >= totalValesPages}
                  className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </article>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Plus size={16} className="text-[var(--color-primary)]" />
            Crear vale de solicitud
          </h2>

          <form className="space-y-3" onSubmit={handleCreateVale}>
            {draftItems.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-1 gap-2 rounded-lg bg-[var(--color-surface-container-high)] p-3 md:grid-cols-[1fr_150px_auto]"
              >
                <AutocompleteSelect
                  value={item.productoId}
                  onChange={(nextValue) => updateDraftItem(item.id, { productoId: nextValue })}
                  options={productoOptions}
                  placeholder={`Producto #${index + 1}`}
                  className={inputClassName}
                />
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.cantidadSolicitada}
                  onChange={(event) =>
                    updateDraftItem(item.id, { cantidadSolicitada: event.target.value })
                  }
                  className={inputClassName}
                  placeholder="Cantidad"
                />
                <button
                  type="button"
                  onClick={() => removeDraftItem(item.id)}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                >
                  Quitar
                </button>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addDraftItem}
                className="rounded-lg border border-[var(--color-primary)]/55 px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
              >
                Agregar item
              </button>
              <button
                type="submit"
                disabled={createValeMutation.isPending || !user?.id}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
              >
                {createValeMutation.isPending ? "Guardando..." : "Crear vale"}
              </button>
            </div>
          </form>
        </article>

        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Search size={16} className="text-[var(--color-primary)]" />
            Buscar mi vale
          </h2>

          <form className="mb-3 flex gap-2" onSubmit={handleBuscarVale}>
            <input
              value={valeIdInput}
              onChange={(event) => setValeIdInput(event.target.value)}
              className={inputClassName}
              placeholder="ID del vale"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
            >
              Buscar
            </button>
          </form>

          {ultimosVales.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {ultimosVales.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setValeIdInput(id);
                    setValeIdActivo(id);
                  }}
                  className="rounded-full border border-[var(--color-outline-variant)] px-3 py-1 text-xs text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                >
                  {id}
                </button>
              ))}
            </div>
          ) : null}

          {valeQuery.isLoading ? (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando vale...</p>
          ) : null}
          {valeQuery.isError ? (
            <p className="text-sm text-[var(--color-error)]">No se pudo cargar el vale solicitado.</p>
          ) : null}
          {vale && !valeEsMio ? (
            <p className="text-sm text-[var(--color-error)]">
              Este vale no pertenece al usuario actual.
            </p>
          ) : null}

          {vale && valeEsMio ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-[var(--color-surface-container-high)] p-3">
                <p className="mt-1 text-xs">
                  Estado:{" "}
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${estadoValeClassName(vale.estado)}`}
                  >
                    {vale.estado}
                  </span>
                </p>
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  Fecha: {vale.createdAt ? new Date(vale.createdAt).toLocaleString() : "-"}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Items solicitados
                </h3>
                {vale.items.map((item) => {
                  const pendiente = Math.max(
                    item.cantidadSolicitada - (item.cantidadEntregada ?? 0),
                    0
                  );
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3"
                    >
                      <p className="text-sm font-semibold">
                        {item.producto?.nombre ?? `Producto #${item.productoId}`}
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-md bg-[var(--color-surface-container-highest)] px-2 py-2">
                          <span className="block text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                            Solicitado
                          </span>
                          <span className="font-semibold">{item.cantidadSolicitada}</span>
                        </div>
                        <div className="rounded-md bg-[var(--color-surface-container-highest)] px-2 py-2">
                          <span className="block text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                            Entregado
                          </span>
                          <span className="font-semibold">{item.cantidadEntregada ?? 0}</span>
                        </div>
                        <div className="rounded-md bg-[var(--color-surface-container-highest)] px-2 py-2">
                          <span className="block text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                            Pendiente
                          </span>
                          <span className="font-semibold">{pendiente}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
