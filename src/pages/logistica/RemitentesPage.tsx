import { FormEvent, useMemo, useState } from "react";
import { Building2, Edit3, Save, Search, Trash2, UserPlus, X } from "lucide-react";
import {
  useCreateRemitenteMutation,
  useDeleteRemitenteMutation,
  useRemitentesQuery,
  useUpdateRemitenteMutation
} from "@/features/remitente/hooks/useRemitentes";
import type { Remitente, TipoEntidadRemitente } from "@/features/remitente/model/remitente.schema";
import { useMunicipiosOrigenQuery } from "@/features/parametrosLogistica/hooks/useParametrosLogistica";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

const TIPO_ENTIDAD_LABEL: Record<TipoEntidadRemitente, string> = {
  EMPRESA: "Empresa",
  TRABAJADOR_PARTICULAR: "Trabajador particular"
};

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

export function RemitentesPage() {
  const { showError, showSuccess } = useToast();
  const remitentesQuery = useRemitentesQuery();
  const municipiosQuery = useMunicipiosOrigenQuery();
  const createMutation = useCreateRemitenteMutation();
  const updateMutation = useUpdateRemitenteMutation();
  const deleteMutation = useDeleteRemitenteMutation();

  const remitentes = remitentesQuery.data?.data ?? [];
  const municipios = municipiosQuery.data?.data ?? [];

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [tipoEntidad, setTipoEntidad] = useState<TipoEntidadRemitente>("EMPRESA");
  const [nombreORazonSocial, setNombreORazonSocial] = useState("");
  const [nitOCi, setNitOCi] = useState("");
  const [municipioId, setMunicipioId] = useState("");

  const remitentesFiltrados = useMemo(
    () =>
      remitentes.filter(
        (item) =>
          item.nombreORazonSocial.toLowerCase().includes(search.toLowerCase()) ||
          item.nitOCi.toLowerCase().includes(search.toLowerCase())
      ),
    [remitentes, search]
  );

  function resetForm() {
    setTipoEntidad("EMPRESA");
    setNombreORazonSocial("");
    setNitOCi("");
    setMunicipioId("");
    setEditingId(null);
  }

  function startEdit(item: Remitente) {
    setEditingId(item.id);
    setTipoEntidad(item.tipoEntidad);
    setNombreORazonSocial(item.nombreORazonSocial);
    setNitOCi(item.nitOCi);
    setMunicipioId(item.municipioId ? String(item.municipioId) : "");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      tipoEntidad,
      nombreORazonSocial: nombreORazonSocial.trim(),
      nitOCi: nitOCi.trim(),
      municipioId: municipioId ? Number(municipioId) : null
    };

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, payload },
        {
          onSuccess: () => {
            showSuccess("Remitente actualizado.");
            resetForm();
          },
          onError: (error) => showError(normalizeError(error, "No se pudo actualizar el remitente."))
        }
      );
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        showSuccess("Remitente creado correctamente.");
        resetForm();
      },
      onError: (error) => showError(normalizeError(error, "No se pudo crear el remitente."))
    });
  }

  function handleDelete(item: Remitente) {
    const confirmed = window.confirm(`¿Eliminar "${item.nombreORazonSocial}"?`);
    if (!confirmed) return;

    deleteMutation.mutate(item.id, {
      onSuccess: () => showSuccess("Remitente eliminado."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar el remitente."))
    });
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Remitentes</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Empresas y trabajadores particulares que despachan mineral hacia el ingenio (distinto de
              los proveedores de insumos del almacén).
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            {editingId ? <Edit3 size={16} className="text-[var(--color-primary)]" /> : <UserPlus size={16} className="text-[var(--color-primary)]" />}
            {editingId ? "Editar remitente" : "Nuevo remitente"}
          </h2>
          {editingId ? (
            <button type="button" onClick={resetForm} className={buttonSecondaryClassName}>
              <X size={14} />
              Cancelar edición
            </button>
          ) : null}
        </div>

        <form className="grid grid-cols-1 gap-3 lg:grid-cols-4" onSubmit={handleSubmit}>
          <select
            value={tipoEntidad}
            onChange={(event) => setTipoEntidad(event.target.value as TipoEntidadRemitente)}
            className={inputClassName}
          >
            <option value="EMPRESA">Empresa</option>
            <option value="TRABAJADOR_PARTICULAR">Trabajador particular</option>
          </select>
          <input
            required
            value={nombreORazonSocial}
            onChange={(event) => setNombreORazonSocial(event.target.value)}
            className={inputClassName}
            placeholder="Nombre o razón social"
          />
          <input
            required
            value={nitOCi}
            onChange={(event) => setNitOCi(event.target.value)}
            className={inputClassName}
            placeholder="NIT o CI"
          />
          <select value={municipioId} onChange={(event) => setMunicipioId(event.target.value)} className={inputClassName}>
            <option value="">Municipio (opcional)</option>
            {municipios.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
          <div className="lg:col-span-4">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              <Save size={14} />
              {editingId
                ? updateMutation.isPending
                  ? "Guardando..."
                  : "Guardar cambios"
                : createMutation.isPending
                  ? "Guardando..."
                  : "Crear remitente"}
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Listado de remitentes</h2>
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            {remitentesFiltrados.length.toLocaleString("es-BO")} registros
          </span>
        </div>

        <div className="relative mb-3">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${inputClassName} pl-9`}
            placeholder="Buscar por nombre o NIT/CI"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {["Tipo", "Nombre / Razón social", "NIT / CI", "Municipio", "Estado", "Acciones"].map((title) => (
                  <th
                    key={title}
                    className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]"
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {remitentesQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
                    Cargando remitentes...
                  </td>
                </tr>
              ) : null}
              {!remitentesQuery.isLoading && remitentesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
                    No se encontraron remitentes.
                  </td>
                </tr>
              ) : null}
              {remitentesFiltrados.map((item) => (
                <tr key={item.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-3 py-2 text-xs">{TIPO_ENTIDAD_LABEL[item.tipoEntidad]}</td>
                  <td className="px-3 py-2 text-xs font-semibold">{item.nombreORazonSocial}</td>
                  <td className="px-3 py-2 text-xs">{item.nitOCi}</td>
                  <td className="px-3 py-2 text-xs">{item.municipio?.nombre ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        item.activo
                          ? "bg-[var(--color-success)]/18 text-[var(--color-success)]"
                          : "bg-[var(--color-on-surface-variant)]/15 text-[var(--color-on-surface-variant)]"
                      }`}
                    >
                      {item.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEdit(item)} className={buttonSecondaryClassName}>
                        <Edit3 size={13} />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-error)]/45 px-3 py-2 text-xs font-semibold text-[var(--color-error)] disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
