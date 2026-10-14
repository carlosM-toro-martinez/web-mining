import * as XLSX from "xlsx-js-style";
import { getTipoPersonalLabel } from "@/modules/employee/hooks/useEmployees";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { LibroAsistenciaReport } from "@/modules/employee/components/LibroAsistenciaReport";
import type { ReportData, ReportEmployee } from "@/modules/employee/lib/asistenciaReport";
import {
  createBlankRayadorRow,
  getSafeMergeRanges,
  hasAttendanceMark,
  hasLateMark,
  isNonWorkingStatus,
  monthNames,
  type RayadorCellValue
} from "@/modules/employee/lib/rayador";

function getEstadoBadgeClass(estado: string) {
  const normalized = estado.trim().toUpperCase();
  if (normalized === "PUNTUAL") return "bg-emerald-500/12 text-emerald-600";
  if (normalized === "TARDE") return "bg-amber-500/14 text-amber-600";
  if (normalized === "ABANDONO") return "bg-red-500/14 text-red-600";
  if (normalized === "AUSENTE") return "bg-rose-500/14 text-rose-600";
  if (normalized === "VACACION" || isNonWorkingStatus(normalized) || normalized === "PERMISO") return "bg-sky-500/14 text-sky-600";
  return "bg-[var(--color-tertiary)]/12 text-[var(--color-tertiary)]";
}

interface AttendanceSummary {
  ordinaryDays: number;
  sundayDays: number;
  vacationDays: number;
  leaveDays: number;
  absenceDays: number;
  totalDays: number;
}

// Reporte "Detalle de asistencia": una tarjeta por empleado con su detalle diario,
// el Libro de Asistencia y los exportes Rayador / Planilla. Los filtros y la
// consulta viven en el hub (PersonalAsistenciaReportesPage).
export function DetalleAsistenciaReport({ entries, isLoading, isFetching, isError, desde, hasta }: ReportData) {
  const { showError, showSuccess } = useToast();

  function buildAttendanceSummary(entry: ReportEmployee, fromDate: Date | null, daysCount: number): AttendanceSummary {
    const marks = Array.from({ length: daysCount }, () => "");
    let ordinaryDays = 0;
    let sundayDays = 0;
    let vacationDays = 0;
    let leaveDays = 0;
    let absenceDays = 0;

    for (const day of entry.dias) {
      if (!fromDate) continue;
      const current = new Date(`${day.fecha}T00:00:00`);
      const position = Math.floor((current.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      if (position < 0 || position >= daysCount) continue;
      const status = day.estado.toUpperCase();
      if (hasAttendanceMark(day)) {
        marks[position] = hasLateMark(day) ? "R" : "1";
        ordinaryDays += 1;
      } else if (status === "AUSENTE" || status === "ABANDONO") {
        marks[position] = "F";
        absenceDays += 1;
      } else if (status === "VACACION") {
        marks[position] = "VAC";
        vacationDays += 1;
      } else if (status === "PERMISO" || status === "ENFERMEDAD" || status === "FERIADO") {
        marks[position] = "LIC";
        leaveDays += 1;
      } else if (isNonWorkingStatus(status)) {
        marks[position] = "D";
        sundayDays += 1;
      }
    }

    for (let i = 0; i < daysCount; i += 1) {
      if (marks[i] || !fromDate) continue;
      const d = new Date(fromDate);
      d.setDate(d.getDate() + i);
      if (d.getDay() === 0) {
        marks[i] = "D";
        sundayDays += 1;
      }
    }

    return {
      ordinaryDays,
      sundayDays,
      vacationDays,
      leaveDays,
      absenceDays,
      totalDays: ordinaryDays + sundayDays + vacationDays + leaveDays + absenceDays
    };
  }

  async function handleExportPayrollDataExcel() {
    try {
            const fromDate = desde ? new Date(`${desde}T00:00:00`) : null;
      const toDate = hasta ? new Date(`${hasta}T00:00:00`) : null;
      const daysInRange =
        fromDate && toDate
          ? Math.max(
              1,
              Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            )
          : 31;
      const daysCount = Math.min(31, daysInRange);
      const titleMonth = fromDate ? monthNames[fromDate.getMonth()] : "";
      const titleYear = fromDate?.getFullYear() ?? "";
      const totalCols = 22;

      const employeesSection = entries.filter((entry) => entry.empleado.tipoPersonal === "TECNICO_EMPLEADO");
      const workersSection = entries.filter((entry) => entry.empleado.tipoPersonal === "OBRERO");
      const aoa: RayadorCellValue[][] = [
        createBlankRayadorRow(totalCols),
        createBlankRayadorRow(totalCols),
        createBlankRayadorRow(totalCols)
      ];
      aoa[0][1] = "Empresa Minera";
      aoa[1][1] = "MARTE S.R.L.";
      aoa[2][1] = `DATOS DE PLANILLA CORRESPONDIENTE AL MES DE "${titleMonth}" DE ${titleYear} - LIPEÑA`;

      const sectionLayouts: Array<{ titleRow: number; headerStartRow: number; dataStartRow: number; dataRows: number; totalRow: number }> = [];

      function createPayrollHeaderRows() {
        const row1 = createBlankRayadorRow(totalCols);
        const row2 = createBlankRayadorRow(totalCols);
        row1[1] = "Nº";
        row1[2] = "APELLIDOS Y NOMBRES";
        row1[3] = "COD.";
        row1[4] = "MITAS";
        row1[5] = "MITAS";
        row1[6] = "REC. NOCT";
        row1[7] = "CONTRATOS";
        row1[9] = "DOM.";
        row1[10] = "VACACIÓN";
        row1[12] = "REPOSOS";
        row1[14] = "SUBS.FRONTERA";
        row1[16] = "OTROS INGRESOS";
        row1[18] = "OTROS DSCTOS.";
        row1[20] = "Form. 110";
        row2[4] = "ORD.";
        row2[5] = "SOBR.";
        row2[7] = "MITA";
        row2[8] = " IMP.";
        row2[9] = "FER.";
        row2[10] = "MITA";
        row2[11] = "IMP.";
        row2[12] = "MITA";
        row2[13] = "1";
        return [row1, row2];
      }

      function addPayrollSection(title: string, sectionEntries: ReportEmployee[]) {
        const titleRow = aoa.length;
        const titleLine = createBlankRayadorRow(totalCols);
        titleLine[2] = title;
        aoa.push(titleLine);
        const headerStartRow = aoa.length;
        aoa.push(...createPayrollHeaderRows());
        const dataStartRow = aoa.length;

        const totals = {
          ordinaryDays: 0,
          sundayDays: 0,
          vacationDays: 0,
          leaveDays: 0
        };

        sectionEntries.forEach((entry, index) => {
          const summary = buildAttendanceSummary(entry, fromDate, daysCount);
          totals.ordinaryDays += summary.ordinaryDays;
          totals.sundayDays += summary.sundayDays;
          totals.vacationDays += summary.vacationDays;
          totals.leaveDays += summary.leaveDays;

          const row = createBlankRayadorRow(totalCols);
          row[1] = index + 1;
          row[2] = entry.empleado.nombre;
          row[3] = entry.empleado.documento ?? String(entry.empleado.id ?? "");
          row[4] = summary.ordinaryDays || "";
          row[9] = summary.sundayDays || "";
          row[10] = summary.vacationDays || "";
          row[12] = summary.leaveDays || "";
          row[21] = summary.totalDays || "";
          aoa.push(row);
        });

        const totalRow = aoa.length;
        const totalLine = createBlankRayadorRow(totalCols);
        totalLine[1] = `TOTAL ${title.replace("PERSONAL ", "")}`;
        totalLine[4] = totals.ordinaryDays || "";
        totalLine[9] = totals.sundayDays || "";
        totalLine[10] = totals.vacationDays || "";
        totalLine[12] = totals.leaveDays || "";
        aoa.push(totalLine);
        sectionLayouts.push({
          titleRow,
          headerStartRow,
          dataStartRow,
          dataRows: sectionEntries.length,
          totalRow
        });
      }

      addPayrollSection("PERSONAL EMPLEADOS", employeesSection);
      aoa.push(createBlankRayadorRow(totalCols));
      addPayrollSection("PERSONAL OBREROS", workersSection);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [
        { wch: 2 },
        { wch: 4 },
        { wch: 26 },
        { wch: 7 },
        { wch: 7 },
        { wch: 7 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 7 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 6 },
        { wch: 12 },
        { wch: 2 },
        { wch: 12 },
        { wch: 2 },
        { wch: 12 },
        { wch: 2 },
        { wch: 10 },
        { wch: 8 }
      ];
      ws["!rows"] = Array.from({ length: aoa.length }, (_, index) => ({ hpt: index < 3 ? 10 : 13 }));
      ws["!merges"] = getSafeMergeRanges([
        { s: { r: 0, c: 1 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 1 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 1 }, e: { r: 2, c: 19 } },
        ...sectionLayouts.flatMap((layout) => [
          { s: { r: layout.titleRow, c: 1 }, e: { r: layout.titleRow, c: 3 } },
          { s: { r: layout.headerStartRow, c: 1 }, e: { r: layout.headerStartRow + 1, c: 1 } },
          { s: { r: layout.headerStartRow, c: 2 }, e: { r: layout.headerStartRow + 1, c: 2 } },
          { s: { r: layout.headerStartRow, c: 3 }, e: { r: layout.headerStartRow + 1, c: 3 } },
          { s: { r: layout.headerStartRow, c: 7 }, e: { r: layout.headerStartRow, c: 8 } },
          { s: { r: layout.headerStartRow, c: 10 }, e: { r: layout.headerStartRow, c: 11 } },
          { s: { r: layout.headerStartRow, c: 12 }, e: { r: layout.headerStartRow, c: 13 } },
          { s: { r: layout.headerStartRow, c: 14 }, e: { r: layout.headerStartRow + 1, c: 14 } },
          { s: { r: layout.headerStartRow, c: 16 }, e: { r: layout.headerStartRow + 1, c: 16 } },
          { s: { r: layout.headerStartRow, c: 18 }, e: { r: layout.headerStartRow + 1, c: 18 } },
          { s: { r: layout.headerStartRow, c: 20 }, e: { r: layout.headerStartRow + 1, c: 20 } }
        ])
      ], aoa.length, totalCols);

      const thinBorder = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      };
      const headerFill = { patternType: "solid", fgColor: { rgb: "D9EAD3" } };
      const whiteFill = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };

      function cellAddress(row: number, col: number) {
        return XLSX.utils.encode_cell({ r: row, c: col });
      }

      function applyStyle(row: number, col: number, style: Record<string, unknown>) {
        const addr = cellAddress(row, col);
        const cell = ws[addr] ?? { t: "s", v: "" };
        ws[addr] = cell;
        (cell as { s?: Record<string, unknown> }).s = {
          ...(cell as { s?: Record<string, unknown> }).s,
          ...style
        };
      }

      for (let r = 0; r < aoa.length; r += 1) {
        for (let c = 0; c < totalCols; c += 1) {
          applyStyle(r, c, {
            fill: whiteFill,
            font: { name: "Calibri", sz: 8 },
            alignment: { horizontal: "center", vertical: "center", wrapText: true }
          });
        }
      }
      [0, 1, 2].forEach((row) => {
        for (let c = 1; c <= 20; c += 1) {
          applyStyle(row, c, { font: { name: "Calibri", sz: 8, bold: true }, alignment: { horizontal: "left", vertical: "center" } });
        }
      });

      sectionLayouts.forEach((layout) => {
        for (let c = 1; c <= 20; c += 1) {
          applyStyle(layout.titleRow, c, { font: { name: "Calibri", sz: 8, bold: true }, alignment: { horizontal: "center", vertical: "center" } });
          applyStyle(layout.headerStartRow, c, { border: thinBorder, fill: headerFill, font: { name: "Calibri", sz: 7, bold: true } });
          applyStyle(layout.headerStartRow + 1, c, { border: thinBorder, fill: headerFill, font: { name: "Calibri", sz: 7, bold: true } });
          applyStyle(layout.totalRow, c, { border: thinBorder, fill: headerFill, font: { name: "Calibri", sz: 8, bold: true } });
        }
        for (let r = layout.dataStartRow; r < layout.dataStartRow + layout.dataRows; r += 1) {
          for (let c = 1; c <= 21; c += 1) {
            applyStyle(r, c, {
              border: thinBorder,
              font: { name: "Calibri", sz: 8 },
              alignment: { horizontal: c === 2 ? "left" : "center", vertical: "center" }
            });
          }
        }
      });

      ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: totalCols - 1 } });
      ws["!pageSetup"] = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 };
      ws["!margins"] = { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0.1, footer: 0.1 };

      XLSX.utils.book_append_sheet(wb, ws, "DATOS");
      XLSX.writeFile(wb, `datos-planilla-${desde || "sin-desde"}-${hasta || "sin-hasta"}.xlsx`);
      showSuccess(`Planilla generada con ${entries.length} trabajadores.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo exportar la planilla.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] px-5 py-4">
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          Rango cargado: {desde} a {hasta}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void handleExportPayrollDataExcel()} disabled={isLoading || !entries.length} className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] disabled:cursor-not-allowed disabled:opacity-60">
            Exportar planilla
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
        <div className="px-5 py-3 text-xs text-[var(--color-on-surface-variant)]">
          {isFetching ? "Cargando reporte..." : `Registros: ${entries.length}`}
        </div>
        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-4">
          {isLoading ? (
            <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
              Cargando datos de asistencia...
            </div>
          ) : null}
          {isError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-6 text-center text-sm text-red-600">
              No se pudo cargar el reporte.
            </div>
          ) : null}
          {!isLoading && !isError && entries.length === 0 ? (
            <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
              Sin datos para el rango seleccionado.
            </div>
          ) : null}
          {entries.map((entry) => (
            <div key={entry.empleado.id} className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{entry.empleado.nombre} ({entry.empleado.cargo ?? "-"} | {getTipoPersonalLabel(entry.empleado.tipoPersonal)})</p>
                <span className="rounded-full bg-[var(--color-primary)]/12 px-2 py-1 text-[10px] font-semibold text-[var(--color-primary)]">
                  Días: {entry.dias.length}
                </span>
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Horario: {entry.horarioActual?.nombre ?? "Sin horario"} {entry.horarioActual ? `(${entry.horarioActual.entrada}-${entry.horarioActual.salida})` : ""}
              </p>
              <div className="mt-2 table-scroll overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr><th className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">Fecha</th><th className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">Estado</th><th className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">Entrada</th><th className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">Retraso</th></tr></thead>
                  <tbody>
                    {entry.dias.map((day) => (
                      <tr key={`${entry.empleado.id}-${day.fecha}`} className="border-t border-[var(--color-border-soft)]">
                        <td className="px-2 py-1 text-xs font-mono">{day.fecha}</td>
                        <td className="px-2 py-1 text-xs">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getEstadoBadgeClass(day.estado)}`}>
                            {day.estado}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-xs font-mono">{day.real?.entrada ?? "-"}</td>
                        <td className="px-2 py-1 text-xs">{day.minutosRetraso}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </article>

      <LibroAsistenciaReport
        entries={entries}
        desde={desde}
        hasta={hasta}
      />
      </div>
    </div>
  );
}
