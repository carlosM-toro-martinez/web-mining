import { useQuery, type QueryClient } from "@tanstack/react-query";
import { httpClient } from "@/shared/api/core/httpClient";
import type { EmployeeTipoPersonal } from "@/modules/employee/db/employee.db";

export interface Horario {
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
  // trabajadores que lo usan hoy
  _count?: { asignaciones?: number };
  // vigentes + historial (asignaciones ya cerradas)
  totalAsignaciones?: number;
}

export type DiaSemanaKey = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";

export const DIAS_SEMANA: Array<{ key: DiaSemanaKey; corto: string; largo: string }> = [
  { key: "lunes", corto: "Lu", largo: "Lunes" },
  { key: "martes", corto: "Ma", largo: "Martes" },
  { key: "miercoles", corto: "Mi", largo: "Miércoles" },
  { key: "jueves", corto: "Ju", largo: "Jueves" },
  { key: "viernes", corto: "Vi", largo: "Viernes" },
  { key: "sabado", corto: "Sa", largo: "Sábado" },
  { key: "domingo", corto: "Do", largo: "Domingo" }
];

export interface EmpleadoAsignacion {
  id: number;
  nombre: string;
  documento?: string | null;
  cargo?: string | null;
  tipoPersonal?: EmployeeTipoPersonal | null;
  // asignaciones totales (vigente + historial)
  totalAsignaciones: number;
  horarioActual: {
    asignacionId: number;
    horarioId: number;
    nombre: string;
    horaEntrada: string;
    horaSalida: string;
    desde: string;
  } | null;
}

export const HORARIOS_KEY = ["personal-horarios"] as const;
export const ESTADO_ASIGNACIONES_KEY = ["personal-asignaciones-estado"] as const;

export function useHorariosQuery(enabled = true) {
  return useQuery({
    queryKey: HORARIOS_KEY,
    enabled,
    queryFn: async () => {
      const response = await httpClient.get("/api/personal/horarios");
      return (response.data as { data?: Horario[] }).data ?? [];
    }
  });
}

// Todos los empleados activos con su horario vigente (o null).
export function useEstadoAsignacionesQuery(enabled = true) {
  return useQuery({
    queryKey: ESTADO_ASIGNACIONES_KEY,
    enabled,
    queryFn: async () => {
      const response = await httpClient.get("/api/personal/asignaciones/estado");
      return (response.data as { data?: EmpleadoAsignacion[] }).data ?? [];
    }
  });
}

// Tras cualquier cambio de horarios o asignaciones: refresca listas, historial y reportes.
export async function invalidarHorariosYAsignaciones(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: HORARIOS_KEY }),
    queryClient.invalidateQueries({ queryKey: ESTADO_ASIGNACIONES_KEY }),
    queryClient.invalidateQueries({ queryKey: ["personal-horarios-historial"] }),
    queryClient.invalidateQueries({ queryKey: ["personal-reporte"] })
  ]);
}
