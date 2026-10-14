import type { EmployeeTipoPersonal } from "@/modules/employee/db/employee.db";

// Forma de la respuesta de GET /api/personal/reporte (un item por empleado).
export interface ReportDay {
  fecha: string;
  estado: string;
  minutosRetraso: number;
  programado?: { entrada?: string | null; salida?: string | null } | null;
  real?: { entrada?: string | null; salida?: string | null } | null;
  salidaEstimada?: string | null;
}

export interface ReportEmployee {
  empleado: {
    id: number;
    nombre: string;
    documento?: string | null;
    cargo?: string | null;
    tipoPersonal?: EmployeeTipoPersonal | null;
  };
  horarioActual?: { nombre: string; entrada: string; salida: string } | null;
  dias: ReportDay[];
  resumen: Record<string, number>;
}

export interface ReportData {
  entries: ReportEmployee[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  // Rango efectivamente cargado (no el que se está editando en los filtros)
  desde: string;
  hasta: string;
}

export function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthRange() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    desde: formatDateInputValue(firstDay),
    hasta: formatDateInputValue(today)
  };
}

// "HH:MM" -> minutos desde medianoche
export function hhmmToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// 135 -> "2 h 15 min"; 45 -> "45 min"; 0 -> "0 min"
export function formatMinutos(total: number): string {
  const minutes = Math.max(0, Math.round(total));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

// "2026-10-05" -> "05/10/2026"
export function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function isDiaAsistido(day: ReportDay) {
  const estado = day.estado.trim().toUpperCase();
  return estado === "PUNTUAL" || estado === "TARDE";
}

// Minutos de retraso medidos desde la hora de entrada del horario, SIN
// descontar la tolerancia (day.minutosRetraso ya la descuenta). 0 si no hay
// marca de entrada o llegó antes de hora.
export function minutosDesdeEntrada(day: ReportDay): number {
  const programada = hhmmToMinutes(day.programado?.entrada);
  const real = hhmmToMinutes(day.real?.entrada);
  if (programada === null || real === null) return 0;
  return Math.max(0, real - programada);
}

// El backend recorre TODOS los días del rango, incluidos los futuros, y los
// marca como AUSENTE si no hay marcas. Los reportes de conteo (faltas, resumen)
// no deben contar días que todavía no ocurrieron.
export function diasHastaHoy(dias: ReportDay[]): ReportDay[] {
  const hoy = formatDateInputValue(new Date());
  return dias.filter((day) => day.fecha <= hoy);
}
