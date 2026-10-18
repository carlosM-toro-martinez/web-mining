import { useMemo, useState, type FormEvent } from "react";
import { Check, Fuel, ListChecks, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  useConceptosLiquidacionQuery,
  useCreateConceptoLiquidacionMutation,
  useDeleteConceptoLiquidacionMutation,
  useTarifasLiquidacionQuery,
  useUpdateConceptoLiquidacionMutation
} from "@/features/parametrosLogistica/hooks/useParametrosLogistica";
import { mensajeDeError } from "@/shared/api/core/apiError";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

type TipoConcepto = "ABONO" | "DEDUCCION";

// Conceptos de liquidación: las líneas extra que se suman (abono) o se restan
// (deducción) al total de una liquidación, además de los viajes.
export function ConceptosLiquidacionPanel() {
  const { showError, showSuccess } = useToast();
  const conceptosQuery = useConceptosLiquidacionQuery();
  const tarifasQuery = useTarifasLiquidacionQuery();
  const createMutation = useCreateConceptoLiquidacionMutation();
  const updateMutation = useUpdateConceptoLiquidacionMutation();
  const deleteMutation = useDeleteConceptoLiquidacionMutation();

  const conceptos = conceptosQuery.data?.data ?? [];
  const tarifas = tarifasQuery.data?.data ?? [];

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoConcepto>("DEDUCCION");
  const [esCombustible, setEsCombustible] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTipo, setEditTipo] = useState<TipoConcepto>("DEDUCCION");
  const [editEsCombustible, setEditEsCombustible] = useState(false);
  const [porEliminar, setPorEliminar] = useState<(typeof conceptos)[number] | null>(null);

  // La deducción automática de combustible se bloquea para quien ya tiene un
  // precio "con combustible" (su precio por tonelada ya lo incluye, y el
  // descuento se duplicaría). Mismo criterio que liquidacion.service.ts.
  const bloqueados = useMemo(() => {
    const tipos = new Set<string>();
    const nombres = new Set<string>();
    for (const t of tarifas) {
      if (t.incluyeCombustible !== "CON_COMBUSTIBLE") continue;
      if (t.transportistaId) nombres.add(t.transportista?.nombreORazonSocial ?? `transportista ${t.transportistaId}`);
      else tipos.add(t.tipoEntidad === "EMPRESA" ? "las Empresas" : "los Trabajadores particulares");
    }
    return [...tipos, ...nombres];
  }, [tarifas]);

  const abonos = conceptos.filter((c) => c.tipo === "ABONO");
  const deducciones = conceptos.filter((c) => c.tipo === "DEDUCCION");

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(
      { nombre: nombre.trim(), tipo, esCombustible: tipo === "DEDUCCION" && esCombustible },
      {
        onSuccess: () => {
          showSuccess("Concepto creado. Ya aparece al armar una liquidación.");
          setNombre("");
          setEsCombustible(false);
        },
        onError: (error) => showError(mensajeDeError(error, "No se pudo crear el concepto."))
      }
    );
  }

  function handleSave(id: number) {
    updateMutation.mutate(
      { id, payload: { nombre: editNombre.trim(), tipo: editTipo, esCombustible: editTipo === "DEDUCCION" && editEsCombustible } },
      {
        onSuccess: () => {
          showSuccess("Concepto actualizado.");
          setEditandoId(null);
        },
        onError: (error) => showError(mensajeDeError(error, "No se pudo actualizar el concepto."))
      }
    );
  }

  function confirmarEliminar() {
    if (!porEliminar) return;
    deleteMutation.mutate(porEliminar.id, {
      onSuccess: () => {
        showSuccess("Concepto eliminado.");
        setPorEliminar(null);
      },
      onError: (error) => {
        showError(mensajeDeError(error, "No se pudo eliminar el concepto."));
        setPorEliminar(null);
      }
    });
  }

  const fila = (item: (typeof conceptos)[number]) =>
    editandoId === item.id ? (
      <div key={item.id} className="space-y-2 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 px-3 py-2">
        <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className={inputClassName} />
        <div className="flex flex-wrap items-center gap-3">
          <select value={editTipo} onChange={(e) => setEditTipo(e.target.value as TipoConcepto)} className={`${inputClassName} w-40`}>
            <option value="ABONO">Abono (suma)</option>
            <option value="DEDUCCION">Deducción (resta)</option>
          </select>
          {editTipo === "DEDUCCION" ? (
            <label className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
              <input type="checkbox" checked={editEsCombustible} onChange={(e) => setEditEsCombustible(e.target.checked)} />
              Monto automático por combustible
            </label>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => handleSave(item.id)} disabled={updateMutation.isPending || !editNombre.trim()} className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
            <Check size={12} /> Guardar
          </button>
          <button type="button" onClick={() => setEditandoId(null)} className="flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold">
            <X size={12} /> Cancelar
          </button>
        </div>
      </div>
    ) : (
      <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{item.nombre}</span>
          {item.esCombustible ? (
            <span className="flex items-center gap-1 rounded-full bg-[var(--color-primary)]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary)]" title="El monto se calcula solo desde el combustible asignado">
              <Fuel size={10} /> Monto automático
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => {
              setEditandoId(item.id);
              setEditNombre(item.nombre);
              setEditTipo(item.tipo);
              setEditEsCombustible(item.esCombustible);
            }}
            className="rounded p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button type="button" onClick={() => setPorEliminar(item)} className="rounded p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10" title="Eliminar">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );

  return (
    <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
      <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <ListChecks size={16} className="text-[var(--color-primary)]" />
        Abonos y descuentos de una liquidación
      </h3>
      <p className="mb-4 max-w-3xl text-sm text-[var(--color-on-surface-variant)]">
        Además de los viajes, a una liquidación se le pueden agregar renglones. Un <b>abono suma</b> al pago (por ejemplo, un
        reembolso) y una <b>deducción resta</b> (por ejemplo, un adelanto o el combustible que se entregó). Aquí se crea la lista
        de opciones; el monto se escribe al armar cada liquidación.
      </p>

      <form className="grid grid-cols-1 gap-3 rounded-lg border border-[var(--color-border-soft)] p-4 md:grid-cols-[1fr_auto]" onSubmit={handleCreate}>
        <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClassName} placeholder='Nombre (ej. "Adelanto" o "Descuento de combustible")' />
        <div className="flex gap-2">
          {([["ABONO", "Abono (suma)", Plus], ["DEDUCCION", "Deducción (resta)", Minus]] as const).map(([valor, texto, Icono]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setTipo(valor)}
              className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                tipo === valor ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10" : "border-[var(--color-border-soft)]"
              }`}
            >
              <Icono size={12} /> {texto}
            </button>
          ))}
        </div>
        {tipo === "DEDUCCION" ? (
          <label className="flex items-start gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-xs text-[var(--color-on-surface-variant)] md:col-span-2">
            <input type="checkbox" checked={esCombustible} onChange={(e) => setEsCombustible(e.target.checked)} className="mt-0.5" />
            <span>
              <b>Calcular el monto solo desde el combustible.</b> Al agregarlo a una liquidación, el sistema propone: litros asignados en
              cada viaje × precio del litro de esa fecha. Se puede ajustar.
            </span>
          </label>
        ) : null}
        <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60 md:col-span-2">
          {createMutation.isPending ? "Guardando…" : "Crear concepto"}
        </button>
      </form>

      {deducciones.some((c) => c.esCombustible) && bloqueados.length > 0 ? (
        <p className="mt-3 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3 py-2 text-xs">
          <b>El descuento automático de combustible hoy no se puede usar con {bloqueados.join(" ni con ")}</b>: ya tienen un precio por tonelada
          "con combustible", que ya descuenta ese costo, y se descontaría dos veces. Si se deja un solo precio para todos los viajes, se habilita.
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-success)]">
            <Plus size={12} /> Abonos (suman al pago)
          </p>
          <div className="space-y-2">
            {abonos.map(fila)}
            {abonos.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Todavía no hay abonos.</p> : null}
          </div>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-error)]">
            <Minus size={12} /> Deducciones (restan del pago)
          </p>
          <div className="space-y-2">
            {deducciones.map(fila)}
            {deducciones.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Todavía no hay deducciones.</p> : null}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(porEliminar)}
        title="¿Eliminar este concepto?"
        tone="danger"
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        onConfirm={confirmarEliminar}
        onCancel={() => setPorEliminar(null)}
      >
        <p className="text-sm">
          <b>{porEliminar?.nombre}</b> dejará de ofrecerse al armar liquidaciones. Si ya se usó en una liquidación, el sistema no lo permite y se
          puede editar su nombre en su lugar.
        </p>
      </ConfirmDialog>
    </article>
  );
}
