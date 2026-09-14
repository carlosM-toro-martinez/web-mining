import { FormEvent, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, IdCard, Plus, Truck, UserCog } from "lucide-react";
import {
  useCambiarEstadoVehiculoMutation,
  useChoferesQuery,
  useCreateChoferMutation,
  useCreateVehiculoMutation,
  useVehiculosQuery
} from "@/features/flota/hooks/useFlota";
import type { EstadoVehiculo, Vehiculo } from "@/features/flota/model/flota.schema";
import { useRemitentesQuery } from "@/features/remitente/hooks/useRemitentes";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

const COLUMNAS: { estado: EstadoVehiculo; label: string; badgeClass: string }[] = [
  { estado: "DISPONIBLE", label: "Disponible", badgeClass: "bg-[var(--color-success)]/18 text-[var(--color-success)]" },
  { estado: "EN_TRANSITO", label: "En tránsito", badgeClass: "bg-[var(--color-primary)]/18 text-[var(--color-primary)]" },
  { estado: "EN_BALANZA", label: "En balanza", badgeClass: "bg-[var(--color-tertiary)]/18 text-[var(--color-tertiary)]" },
  { estado: "CON_FALLA_MECANICA", label: "Con falla mecánica", badgeClass: "bg-[var(--color-error)]/18 text-[var(--color-error)]" },
  { estado: "EN_MANTENIMIENTO", label: "En mantenimiento", badgeClass: "bg-[var(--color-on-surface-variant)]/18 text-[var(--color-on-surface-variant)]" }
];

function VehiculoCard({ vehiculo }: { vehiculo: Vehiculo }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(vehiculo.id)
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab touch-none rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-bold uppercase">{vehiculo.placa}</p>
          <p className="text-xs text-[var(--color-on-surface-variant)]">{vehiculo.tipo}</p>
        </div>
        <GripVertical size={14} className="mt-0.5 shrink-0 text-[var(--color-on-surface-variant)]" />
      </div>
      {vehiculo.propietario ? (
        <p className="mt-2 truncate text-[11px] text-[var(--color-on-surface-variant)]">
          {vehiculo.propietario.nombreORazonSocial}
        </p>
      ) : null}
    </div>
  );
}

function FlotaColumn({
  estado,
  label,
  badgeClass,
  vehiculos
}: {
  estado: EstadoVehiculo;
  label: string;
  badgeClass: string;
  vehiculos: Vehiculo[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[220px] flex-col gap-2 rounded-xl border p-3 transition ${
        isOver
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
          : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]"
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
          {label}
        </span>
        <span className="text-xs text-[var(--color-on-surface-variant)]">{vehiculos.length}</span>
      </div>
      {vehiculos.map((vehiculo) => (
        <VehiculoCard key={vehiculo.id} vehiculo={vehiculo} />
      ))}
      {vehiculos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-border-soft)] p-3 text-center text-[11px] text-[var(--color-on-surface-variant)]">
          Suelta aquí un vehículo
        </p>
      ) : null}
    </div>
  );
}

export function FlotaPage() {
  const { showError, showSuccess } = useToast();
  const vehiculosQuery = useVehiculosQuery();
  const remitentesQuery = useRemitentesQuery();
  const choferesQuery = useChoferesQuery();
  const cambiarEstadoMutation = useCambiarEstadoVehiculoMutation();
  const createVehiculoMutation = useCreateVehiculoMutation();
  const createChoferMutation = useCreateChoferMutation();

  const vehiculos = vehiculosQuery.data?.data ?? [];
  const remitentes = remitentesQuery.data?.data ?? [];
  const choferes = choferesQuery.data?.data ?? [];

  const [placa, setPlaca] = useState("");
  const [tipo, setTipo] = useState("");
  const [capacidadTon, setCapacidadTon] = useState("");
  const [propietarioId, setPropietarioId] = useState("");

  const [choferNombre, setChoferNombre] = useState("");
  const [choferCi, setChoferCi] = useState("");
  const [choferLicencia, setChoferLicencia] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const vehiculosPorEstado = useMemo(() => {
    const grupos = new Map<EstadoVehiculo, Vehiculo[]>();
    for (const columna of COLUMNAS) grupos.set(columna.estado, []);
    for (const vehiculo of vehiculos) {
      grupos.get(vehiculo.estadoActual)?.push(vehiculo);
    }
    return grupos;
  }, [vehiculos]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const vehiculoId = Number(active.id);
    const nuevoEstado = over.id as EstadoVehiculo;
    const vehiculo = vehiculos.find((v) => v.id === vehiculoId);
    if (!vehiculo || vehiculo.estadoActual === nuevoEstado) return;

    cambiarEstadoMutation.mutate(
      { id: vehiculoId, payload: { estado: nuevoEstado } },
      {
        onError: (error) =>
          showError(normalizeError(error, "No se pudo mover el vehículo. Se restauró su estado anterior."))
      }
    );
  }

  function handleCreateVehiculo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createVehiculoMutation.mutate(
      {
        placa: placa.trim(),
        tipo: tipo.trim(),
        capacidadTon: Number(capacidadTon),
        propietarioId: propietarioId ? Number(propietarioId) : null
      },
      {
        onSuccess: () => {
          showSuccess("Vehículo registrado en Disponible.");
          setPlaca("");
          setTipo("");
          setCapacidadTon("");
          setPropietarioId("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el vehículo."))
      }
    );
  }

  function handleCreateChofer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createChoferMutation.mutate(
      { nombre: choferNombre.trim(), ci: choferCi.trim(), licencia: choferLicencia.trim() || undefined },
      {
        onSuccess: () => {
          showSuccess("Chofer registrado.");
          setChoferNombre("");
          setChoferCi("");
          setChoferLicencia("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el chofer."))
      }
    );
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <Truck size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Tablero de Flota</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Arrastra un vehículo a la columna correspondiente para actualizar su estado. Cada movimiento
              queda registrado en su historial.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Plus size={16} className="text-[var(--color-primary)]" />
          Registrar vehículo
        </h2>
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-5" onSubmit={handleCreateVehiculo}>
          <input
            required
            value={placa}
            onChange={(event) => setPlaca(event.target.value.toUpperCase())}
            className={`${inputClassName} font-mono uppercase`}
            placeholder="Placa"
          />
          <input
            required
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
            className={inputClassName}
            placeholder="Tipo (ej. Volqueta 10m³)"
          />
          <input
            required
            type="number"
            min="0.1"
            step="0.1"
            value={capacidadTon}
            onChange={(event) => setCapacidadTon(event.target.value)}
            className={inputClassName}
            placeholder="Capacidad (ton)"
          />
          <select value={propietarioId} onChange={(event) => setPropietarioId(event.target.value)} className={inputClassName}>
            <option value="">Propietario (opcional)</option>
            {remitentes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombreORazonSocial}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createVehiculoMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            {createVehiculoMutation.isPending ? "Guardando..." : "Registrar"}
          </button>
        </form>
      </article>

      {vehiculosQuery.isLoading ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 text-sm text-[var(--color-on-surface-variant)]">
          Cargando flota...
        </article>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {COLUMNAS.map((columna) => (
              <FlotaColumn
                key={columna.estado}
                estado={columna.estado}
                label={columna.label}
                badgeClass={columna.badgeClass}
                vehiculos={vehiculosPorEstado.get(columna.estado) ?? []}
              />
            ))}
          </div>
        </DndContext>
      )}

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <IdCard size={16} className="text-[var(--color-primary)]" />
          Choferes
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
          <form className="space-y-3" onSubmit={handleCreateChofer}>
            <input
              required
              value={choferNombre}
              onChange={(event) => setChoferNombre(event.target.value)}
              className={inputClassName}
              placeholder="Nombre completo"
            />
            <input
              required
              value={choferCi}
              onChange={(event) => setChoferCi(event.target.value)}
              className={inputClassName}
              placeholder="Carnet de identidad"
            />
            <input
              value={choferLicencia}
              onChange={(event) => setChoferLicencia(event.target.value)}
              className={inputClassName}
              placeholder="Licencia (opcional)"
            />
            <button
              type="submit"
              disabled={createChoferMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createChoferMutation.isPending ? "Guardando..." : "Registrar chofer"}
            </button>
          </form>
          <div className="space-y-2 text-sm">
            {choferesQuery.isLoading ? (
              <p className="text-xs text-[var(--color-on-surface-variant)]">Cargando choferes...</p>
            ) : null}
            {choferes.map((chofer) => (
              <div
                key={chofer.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <UserCog size={14} className="text-[var(--color-on-surface-variant)]" />
                  <div>
                    <p className="font-semibold">{chofer.nombre}</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      CI {chofer.ci}
                      {chofer.licencia ? ` · Lic. ${chofer.licencia}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {!choferesQuery.isLoading && choferes.length === 0 ? (
              <p className="text-xs text-[var(--color-on-surface-variant)]">Aún no hay choferes registrados.</p>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}
