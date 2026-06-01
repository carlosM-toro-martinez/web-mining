import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { httpClient } from "@/shared/api/core/httpClient";
import { useToast } from "@/shared/ui/toast/ToastProvider";

interface Horario {
  id: number;
  nombre: string;
  descripcion?: string | null;
  horaEntrada: string;
  horaSalida: string;
  tolerancia: number;
  lunes: boolean;
  martes: boolean;
  miercoles: boolean;
  jueves: boolean;
  viernes: boolean;
  sabado: boolean;
  domingo: boolean;
  activo: boolean;
  _count?: { asignaciones?: number };
}

const weekDays: Array<keyof Pick<Horario, "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo">> = [
  "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"
];

export function PersonalSchedulesPage() {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Horario | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [horaEntrada, setHoraEntrada] = useState("08:00");
  const [horaSalida, setHoraSalida] = useState("17:00");
  const [tolerancia, setTolerancia] = useState("15");
  const [dias, setDias] = useState<Record<string, boolean>>({
    lunes: true, martes: true, miercoles: true, jueves: true, viernes: true, sabado: false, domingo: false
  });

  const horariosQuery = useQuery({
    queryKey: ["personal-horarios"],
    queryFn: async () => {
      const response = await httpClient.get("/api/personal/horarios");
      const payload = response.data as { data?: Horario[] };
      return payload.data ?? [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        horaEntrada,
        horaSalida,
        tolerancia: Number(tolerancia),
        ...dias
      };
      if (editing) {
        await httpClient.put(`/api/personal/horarios/${editing.id}`, payload);
      } else {
        await httpClient.post("/api/personal/horarios", payload);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["personal-horarios"] });
      setEditing(null);
      setNombre("");
      setDescripcion("");
      setHoraEntrada("08:00");
      setHoraSalida("17:00");
      setTolerancia("15");
      setDias({ lunes: true, martes: true, miercoles: true, jueves: true, viernes: true, sabado: false, domingo: false });
      showSuccess("Horario guardado.");
    },
    onError: (error) => showError(error instanceof Error ? error.message : "No se pudo guardar el horario.")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await httpClient.delete(`/api/personal/horarios/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["personal-horarios"] });
      showSuccess("Horario eliminado.");
    },
    onError: (error) => showError(error instanceof Error ? error.message : "No se pudo eliminar el horario.")
  });

  function startEdit(horario: Horario) {
    setEditing(horario);
    setNombre(horario.nombre);
    setDescripcion(horario.descripcion ?? "");
    setHoraEntrada(horario.horaEntrada);
    setHoraSalida(horario.horaSalida);
    setTolerancia(String(horario.tolerancia));
    setDias({
      lunes: horario.lunes, martes: horario.martes, miercoles: horario.miercoles, jueves: horario.jueves, viernes: horario.viernes, sabado: horario.sabado, domingo: horario.domingo
    });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void saveMutation.mutateAsync();
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4"><SubrouteBackButton to="/personal" label="Volver a Personal" /></div>
        <h1 className="page-title font-headline text-3xl font-extrabold">Horarios</h1>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={onSubmit}>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Nombre" className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <input value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} type="time" className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <input value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} type="time" className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <input value={tolerancia} onChange={(e) => setTolerancia(e.target.value)} type="number" min={0} placeholder="Tolerancia (min)" className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción" className="md:col-span-2 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <div className="md:col-span-3 flex flex-wrap gap-3 text-xs">
            {weekDays.map((day) => (
              <label key={day} className="inline-flex items-center gap-2">
                <input type="checkbox" checked={dias[day]} onChange={(e) => setDias((prev) => ({ ...prev, [day]: e.target.checked }))} />
                {day}
              </label>
            ))}
          </div>
          <div className="md:col-span-3 flex gap-2">
            <button type="submit" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Guardando..." : editing ? "Actualizar" : "Crear horario"}</button>
            {editing ? <button type="button" className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm" onClick={() => setEditing(null)}>Cancelar</button> : null}
          </div>
        </form>
      </article>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
        <div className="px-5 py-3 text-xs text-[var(--color-on-surface-variant)]">Registros: {horariosQuery.data?.length ?? 0}</div>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr><th className="px-4 py-2 text-xs">Nombre</th><th className="px-4 py-2 text-xs">Horario</th><th className="px-4 py-2 text-xs">Tolerancia</th><th className="px-4 py-2 text-xs">Asignados</th><th className="px-4 py-2 text-right text-xs">Acción</th></tr></thead>
            <tbody>
              {horariosQuery.data?.map((h) => (
                <tr key={h.id} className="border-t border-[var(--color-border-soft)]">
                  <td className="px-4 py-2 text-sm">{h.nombre}</td>
                  <td className="px-4 py-2 text-sm font-mono">{h.horaEntrada} - {h.horaSalida}</td>
                  <td className="px-4 py-2 text-sm">{h.tolerancia} min</td>
                  <td className="px-4 py-2 text-sm">{h._count?.asignaciones ?? 0}</td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" className="mr-2 rounded border px-2 py-1 text-xs" onClick={() => startEdit(h)}>Editar</button>
                    <button type="button" className="rounded border border-red-500/45 px-2 py-1 text-xs text-red-600" onClick={() => void deleteMutation.mutateAsync(h.id)}>Eliminar</button>
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
