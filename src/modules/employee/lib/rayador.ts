import type { ReportDay, ReportEmployee } from "@/modules/employee/lib/asistenciaReport";

// Helpers compartidos por el Rayador de mitas (vista en pantalla + Excel) y el
// exporte de planilla del Detalle de asistencia.

export function hasAttendanceMark(day: ReportDay) {
  const status = day.estado.trim().toUpperCase();
  return Boolean(day.real?.entrada || day.real?.salida || status === "PUNTUAL" || status === "TARDE" || status === "ENTRADA" || status === "SALIDA");
}

export function hasLateMark(day: ReportDay) {
  return day.estado.trim().toUpperCase() === "TARDE" || day.minutosRetraso > 0;
}

export function isNonWorkingStatus(status: string) {
  return status === "DESCANSO" || status === "NO_LABORAL";
}

export const monthNames = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE"
];

export type RayadorCellValue = string | number;

export interface SheetCellPosition {
  r: number;
  c: number;
}

export interface SheetMergeRange {
  s: SheetCellPosition;
  e: SheetCellPosition;
}

export function createBlankRayadorRow(length: number): RayadorCellValue[] {
  return Array.from({ length }, () => "");
}

export function normalizeMergeRange(range: SheetMergeRange): SheetMergeRange {
  return {
    s: {
      r: Math.min(range.s.r, range.e.r),
      c: Math.min(range.s.c, range.e.c)
    },
    e: {
      r: Math.max(range.s.r, range.e.r),
      c: Math.max(range.s.c, range.e.c)
    }
  };
}

export function rangesOverlap(a: SheetMergeRange, b: SheetMergeRange) {
  return a.s.r <= b.e.r && a.e.r >= b.s.r && a.s.c <= b.e.c && a.e.c >= b.s.c;
}

export function getSafeMergeRanges(ranges: SheetMergeRange[], totalRows: number, totalCols: number) {
  const safeRanges: SheetMergeRange[] = [];

  ranges.forEach((range) => {
    const normalized = normalizeMergeRange(range);
    const isInsideSheet =
      normalized.s.r >= 0 &&
      normalized.s.c >= 0 &&
      normalized.e.r < totalRows &&
      normalized.e.c < totalCols;
    const hasArea = normalized.s.r !== normalized.e.r || normalized.s.c !== normalized.e.c;
    const overlapsExisting = safeRanges.some((safeRange) => rangesOverlap(safeRange, normalized));

    if (isInsideSheet && hasArea && !overlapsExisting) {
      safeRanges.push(normalized);
    }
  });

  return safeRanges;
}

export interface RayadorFila {
  // Una marca por día del rango: "1" | "F" | "VAC" | "LIC" | "D" | "" (vacío)
  marks: string[];
  presentDays: number;
  domingoDays: number;
  vacationDays: number;
  licenseDays: number;
  absenceDays: number;
}

// Rango del rayador: máximo 31 días contados desde "desde" (una hoja = un mes).
export function rangoRayador(desde: string, hasta: string) {
  const fromDate = desde ? new Date(`${desde}T00:00:00`) : null;
  const toDate = hasta ? new Date(`${hasta}T00:00:00`) : null;
  const daysInRange =
    fromDate && toDate
      ? Math.max(1, Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 31;
  return { fromDate, daysCount: Math.min(31, daysInRange), truncated: daysInRange > 31, daysInRange };
}

// Marcas del rayador de un empleado. Es la ÚNICA fuente de la vista en pantalla
// y del Excel, para que ambos coincidan siempre.
//   1   asistió (llegue a la hora que llegue: el retraso no cuenta aquí)
//   F   falta o abandono            VAC vacación
//   LIC permiso / enfermedad / feriado
//   D   descanso, día no laboral y todo domingo sin marca
// Los días futuros sin marcas quedan vacíos (el backend los marca AUSENTE, pero
// todavía no ocurrieron, así que no son falta).
export function calcularRayadorEmpleado(
  entry: ReportEmployee,
  fromDate: Date | null,
  daysCount: number,
  hoy: string
): RayadorFila {
  const marks = Array.from({ length: daysCount }, () => "");
  let presentDays = 0;
  let domingoDays = 0;
  let vacationDays = 0;
  let licenseDays = 0;
  let absenceDays = 0;
  // Días futuros que se dejan vacíos a propósito (ver más abajo): la regla de
  // "domingo sin marca = D" tampoco debe rellenarlos.
  const futuros = new Set<number>();

  for (const day of entry.dias) {
    if (!fromDate) continue;
    const current = new Date(`${day.fecha}T00:00:00`);
    const position = Math.floor((current.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (position < 0 || position >= daysCount) continue;
    const status = day.estado.toUpperCase();
    if (hasAttendanceMark(day)) {
      marks[position] = "1";
      presentDays += 1;
    } else if (status === "AUSENTE") {
      if (day.fecha > hoy) {
        futuros.add(position); // día futuro: aún no es falta
        continue;
      }
      marks[position] = "F";
      absenceDays += 1;
    } else if (status === "VACACION") {
      marks[position] = "VAC";
      vacationDays += 1;
    } else if (status === "ABANDONO") {
      marks[position] = "F";
      absenceDays += 1;
    } else if (status === "PERMISO" || status === "ENFERMEDAD" || status === "FERIADO") {
      marks[position] = "LIC";
      licenseDays += 1;
    } else if (isNonWorkingStatus(status)) {
      marks[position] = "D";
      domingoDays += 1;
    }
  }

  for (let i = 0; i < daysCount; i += 1) {
    if (marks[i] || futuros.has(i) || !fromDate) continue;
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0) {
      marks[i] = "D";
      domingoDays += 1;
    }
  }

  return { marks, presentDays, domingoDays, vacationDays, licenseDays, absenceDays };
}
