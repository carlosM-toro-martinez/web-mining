import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PeriodoMes {
  anio: number;
  mes: number; // 1-12
}

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function nombreMes(mes: number) {
  return MESES[mes - 1] ?? "";
}

export function mesActual(): PeriodoMes {
  const hoy = new Date();
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
}

// "2026-10-26T00:00:00.000Z" -> { anio: 2026, mes: 10 } (fecha calendario, sin zona horaria).
export function periodoDeFecha(fecha: string): PeriodoMes {
  return { anio: Number(fecha.slice(0, 4)), mes: Number(fecha.slice(5, 7)) };
}

export function mismoMes(a: PeriodoMes, b: PeriodoMes) {
  return a.anio === b.anio && a.mes === b.mes;
}

function desplazar({ anio, mes }: PeriodoMes, delta: number): PeriodoMes {
  const total = anio * 12 + (mes - 1) + delta;
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

// Selector de mes con flechas: ‹ Octubre 2026 ›
export function MonthNavigator({ valor, onChange }: { valor: PeriodoMes; onChange: (p: PeriodoMes) => void }) {
  const boton =
    "rounded-lg border border-[var(--color-outline-variant)] p-2 text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]";
  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" className={boton} onClick={() => onChange(desplazar(valor, -1))} aria-label="Mes anterior">
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-40 text-center text-base font-bold text-[var(--color-on-surface)]">
        {nombreMes(valor.mes)} {valor.anio}
      </span>
      <button type="button" className={boton} onClick={() => onChange(desplazar(valor, 1))} aria-label="Mes siguiente">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
