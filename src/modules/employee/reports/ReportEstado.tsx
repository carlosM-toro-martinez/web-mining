interface ReportEstadoProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
}

const boxClass =
  "rounded-lg border px-4 py-6 text-center text-sm";

// Mensajes de carga / error / sin datos compartidos por los reportes de asistencia.
// Devuelve null cuando hay datos que mostrar.
export function ReportEstado({ isLoading, isError, isEmpty }: ReportEstadoProps) {
  if (isLoading) {
    return (
      <div className={`${boxClass} border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]`}>
        Cargando datos de asistencia...
      </div>
    );
  }
  if (isError) {
    return (
      <div className={`${boxClass} border-red-500/30 bg-red-500/10 text-red-600`}>
        No se pudo cargar el reporte.
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className={`${boxClass} border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]`}>
        Sin datos para el rango y filtros seleccionados.
      </div>
    );
  }
  return null;
}
