import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx-js-style";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { getTipoPersonalLabel, useEmployees } from "@/modules/employee/hooks/useEmployees";
import type { EmployeeTipoPersonal } from "@/modules/employee/db/employee.db";
import { httpClient } from "@/shared/api/core/httpClient";
import { useToast } from "@/shared/ui/toast/ToastProvider";

interface ReportDay {
  fecha: string;
  estado: string;
  minutosRetraso: number;
  real?: { entrada?: string; salida?: string } | null;
}

function hasAttendanceMark(day: ReportDay) {
  const status = day.estado.trim().toUpperCase();
  return Boolean(day.real?.entrada || day.real?.salida || status === "PUNTUAL" || status === "TARDE" || status === "ENTRADA" || status === "SALIDA");
}

function getEstadoBadgeClass(estado: string) {
  const normalized = estado.trim().toUpperCase();
  if (normalized === "PUNTUAL") return "bg-emerald-500/12 text-emerald-600";
  if (normalized === "TARDE") return "bg-amber-500/14 text-amber-600";
  if (normalized === "ABANDONO") return "bg-red-500/14 text-red-600";
  if (normalized === "AUSENTE") return "bg-rose-500/14 text-rose-600";
  if (normalized === "VACACION" || normalized === "DESCANSO" || normalized === "PERMISO") return "bg-sky-500/14 text-sky-600";
  return "bg-[var(--color-tertiary)]/12 text-[var(--color-tertiary)]";
}

const monthNames = [
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

interface ReportEmployee {
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

type RayadorCellValue = string | number;

function createBlankRayadorRow(length: number): RayadorCellValue[] {
  return Array.from({ length }, () => "");
}

export function PersonalReportPage() {
  const { showError, showSuccess } = useToast();
  const employees = useEmployees();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [empleadoId, setEmpleadoId] = useState("");

  const reportQuery = useQuery({
    queryKey: ["personal-reporte", desde, hasta, empleadoId],
    enabled: Boolean(desde && hasta),
    queryFn: async () => {
      const response = await httpClient.get("/api/personal/reporte", {
        params: { desde, hasta, empleadoId: empleadoId || undefined }
      });
      const payload = response.data as { data?: { empleados?: ReportEmployee[] } };
      return payload.data?.empleados ?? [];
    }
  });

  const employeeOptions = useMemo(
    () =>
      employees.getAll.data.map((employee) => ({
        id: String(employee.remoteId ?? employee.id),
        label: `${employee.nombre} - ${getTipoPersonalLabel(employee.tipoPersonal)}`,
        searchText: `${employee.documento ?? ""} ${employee.cargo ?? ""} ${employee.deviceUserId ?? ""} ${getTipoPersonalLabel(employee.tipoPersonal)}`
      })),
    [employees.getAll.data]
  );

  async function handleExportExcel() {
    try {
      const entries = reportQuery.data ?? [];
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
      const dayStartCol = 5;
      const dayEndCol = dayStartCol + daysCount - 1;
      const summaryStartCol = dayEndCol + 1;
      const summaryLabels = ["Ord.", "Sobr.", "Noct.", "Cont.", "Dom.", "Vac", "LIC", "Fall.", "TOT.", "Fron."];
      const summaryEndCol = summaryStartCol + summaryLabels.length - 1;
      const totalCols = summaryEndCol + 1;
      const titleMonth = fromDate ? monthNames[fromDate.getMonth()] : "";
      const titleYear = fromDate?.getFullYear() ?? "";
      const title = `LIBRO RAYADOR DE MITAS MES DE ${titleMonth} ${titleYear}`.trim();
      const weekdays = Array.from({ length: daysCount }, (_, i) => {
        if (!fromDate) return "";
        const d = new Date(fromDate);
        d.setDate(d.getDate() + i);
        return ["D", "L", "M", "M", "J", "V", "S"][d.getDay()] ?? "";
      });

      function createHeaderRows() {
        const headerRow6 = createBlankRayadorRow(totalCols);
        const headerRow7 = createBlankRayadorRow(totalCols);
        const headerRow8 = createBlankRayadorRow(totalCols);
        headerRow6[1] = "No.";
        headerRow6[4] = "Sueldo";
        headerRow6[summaryStartCol] = "Mt.";
        headerRow6[summaryStartCol + 1] = "Mt.";
        headerRow6[summaryStartCol + 2] = "Rec.";
        headerRow6[summaryStartCol + 3] = "Mts.";
        headerRow6[summaryStartCol + 4] = "Mts.";
        headerRow6[summaryStartCol + 9] = "Bono ";

        headerRow7[0] = "No.";
        headerRow7[1] = "de";
        headerRow7[2] = "Nombre y apellido";
        headerRow7[3] = "Ocupación";
        headerRow7[4] = "Jornal";
        Array.from({ length: daysCount }, (_, i) => i + 1).forEach((dayNumber, index) => {
          headerRow7[dayStartCol + index] = dayNumber;
        });
        summaryLabels.forEach((label, index) => {
          headerRow7[summaryStartCol + index] = label;
        });

        headerRow8[1] = "Cod.";
        headerRow8[4] = "Basico";
        weekdays.forEach((weekday, index) => {
          headerRow8[dayStartCol + index] = weekday;
        });
        headerRow8[summaryStartCol + 4] = " Fer.";
        headerRow8[summaryStartCol + 7] = "BM";
        return [headerRow6, headerRow7, headerRow8];
      }

      function createEmployeeRows(sectionEntries: ReportEmployee[]) {
        return sectionEntries.flatMap((entry, index) => {
          const marks = Array.from({ length: daysCount }, () => "");
          let presentDays = 0;
          let domingoDays = 0;
          let vacationDays = 0;
          let licenseDays = 0;
          let absenceDays = 0;
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
            } else if (status === "DESCANSO") {
              marks[position] = "D";
              domingoDays += 1;
            } else {
              marks[position] = "";
            }
          }

          for (let i = 0; i < daysCount; i += 1) {
            if (marks[i]) continue;
            if (!fromDate) continue;
            const d = new Date(fromDate);
            d.setDate(d.getDate() + i);
            if (d.getDay() === 0) {
              marks[i] = "D";
              domingoDays += 1;
            }
          }

          const rowMain = createBlankRayadorRow(totalCols);
          const rowSalary = createBlankRayadorRow(totalCols);
          const rowMarks = createBlankRayadorRow(totalCols);
          rowMain[0] = index + 1;
          rowMain[1] = entry.empleado.documento ?? String(entry.empleado.id ?? "");
          rowMain[2] = entry.empleado.nombre;
          rowMain[3] = entry.empleado.cargo ?? "";
          marks.forEach((mark, markIndex) => {
            rowMarks[dayStartCol + markIndex] = mark;
          });
          rowMain[summaryStartCol] = presentDays || "";
          rowMain[summaryStartCol + 4] = domingoDays || "";
          rowMain[summaryStartCol + 5] = vacationDays || "";
          rowMain[summaryStartCol + 6] = licenseDays || "";
          rowMain[summaryStartCol + 7] = absenceDays || "";
          rowMain[summaryStartCol + 8] = presentDays + domingoDays + vacationDays + licenseDays + absenceDays || "";
          return [rowMain, rowSalary, rowMarks];
        });
      }

      const sections = [
        {
          title: "PERSONAL TECNICO Y EMPLEADOS",
          sideTitle: "",
          entries: entries.filter((entry) => entry.empleado.tipoPersonal !== "OBRERO")
        },
        {
          title: "PERSONAL  OBRERO",
          sideTitle: `RAYADOR DE MITAS ${titleMonth}`,
          entries: entries.filter((entry) => entry.empleado.tipoPersonal === "OBRERO")
        }
      ];

      const aoa = [
        createBlankRayadorRow(totalCols),
        createBlankRayadorRow(totalCols),
        createBlankRayadorRow(totalCols),
        createBlankRayadorRow(totalCols)
      ];
      aoa[1][8] = title;
      const sectionLayouts: Array<{
        titleRow: number;
        headerStartRow: number;
        employeeStartRow: number;
        employeeRows: number;
      }> = [];

      sections.forEach((section, sectionIndex) => {
        if (sectionIndex > 0) {
          aoa.push(createBlankRayadorRow(totalCols), createBlankRayadorRow(totalCols));
        }
        const titleRow = aoa.length;
        const sectionTitleRow = createBlankRayadorRow(totalCols);
        sectionTitleRow[2] = section.title;
        sectionTitleRow[8] = section.sideTitle;
        aoa.push(sectionTitleRow);
        if (sectionIndex > 0) {
          aoa.push(createBlankRayadorRow(totalCols), createBlankRayadorRow(totalCols));
        }
        const headerStartRow = aoa.length;
        aoa.push(...createHeaderRows());
        const employeeStartRow = aoa.length;
        const employeeRows = createEmployeeRows(section.entries);
        aoa.push(...employeeRows);
        sectionLayouts.push({
          titleRow,
          headerStartRow,
          employeeStartRow,
          employeeRows: employeeRows.length
        });
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const employeeMerges = sectionLayouts.flatMap((layout) =>
        Array.from({ length: layout.employeeRows / 3 }, (_, index) => {
          const row = layout.employeeStartRow + index * 3;
          return [
            { s: { r: row, c: 0 }, e: { r: row + 2, c: 0 } },
            { s: { r: row, c: 1 }, e: { r: row + 2, c: 1 } },
            { s: { r: row, c: 2 }, e: { r: row + 2, c: 2 } },
            { s: { r: row, c: 3 }, e: { r: row + 2, c: 3 } },
            ...[0, 1, 2, 3, 5, 6, 8, 9].map((offset) => ({
              s: { r: row, c: summaryStartCol + offset },
              e: { r: row + 2, c: summaryStartCol + offset }
            }))
          ];
        }).flat()
      );
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
        { s: { r: 1, c: 8 }, e: { r: 3, c: dayEndCol } },
        { s: { r: 1, c: summaryStartCol }, e: { r: 3, c: summaryEndCol } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
        ...employeeMerges
      ];
      ws["!cols"] = [
        { wch: 3 },
        { wch: 4 },
        { wch: 18 },
        { wch: 10 },
        { wch: 8 },
        ...Array.from({ length: daysCount }, () => ({ wch: 3 })),
        ...Array.from({ length: summaryLabels.length - 1 }, () => ({ wch: 4 })),
        { wch: 11 }
      ];
      ws["!rows"] = [
        { hpt: 9 },
        { hpt: 18 },
        { hpt: 9 },
        { hpt: 9 },
        ...Array.from({ length: Math.max(0, aoa.length - 4) }, () => ({ hpt: 12 }))
      ];

      const thinBorder = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      };
      const mediumBorder = {
        top: { style: "medium", color: { rgb: "000000" } },
        bottom: { style: "medium", color: { rgb: "000000" } },
        left: { style: "medium", color: { rgb: "000000" } },
        right: { style: "medium", color: { rgb: "000000" } }
      };
      const whiteFill = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };
      const yellowFill = { patternType: "solid", fgColor: { rgb: "FFFF00" } };

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

      function styleRow(row: number, style: Record<string, unknown>) {
        for (let c = 0; c < totalCols; c += 1) {
          applyStyle(row, c, style);
        }
      }

      for (let r = 0; r < aoa.length; r += 1) {
        styleRow(r, {
          border: thinBorder,
          fill: whiteFill,
          font: { name: "Calibri", sz: 7 },
          alignment: { horizontal: "center", vertical: "center" }
        });
      }

      styleRow(1, {
        font: { bold: true, sz: 14, name: "Calibri" },
        fill: whiteFill,
        alignment: { horizontal: "center", vertical: "center" }
      });
      sectionLayouts.forEach((layout) => {
        styleRow(layout.titleRow, {
          font: { bold: true, sz: 8, name: "Calibri" },
          fill: whiteFill,
          alignment: { horizontal: "left", vertical: "center" }
        });
        [layout.headerStartRow, layout.headerStartRow + 1, layout.headerStartRow + 2].forEach((row) => {
          styleRow(row, {
            font: { bold: true, sz: 7, name: "Calibri" },
            fill: whiteFill,
            border: thinBorder,
            alignment: { horizontal: "center", vertical: "center" }
          });
        });
        for (let c = dayStartCol; c <= dayEndCol; c += 1) {
          if (weekdays[c - dayStartCol] === "D") {
            applyStyle(layout.headerStartRow + 2, c, { fill: yellowFill });
          }
        }

        for (let r = layout.employeeStartRow; r < layout.employeeStartRow + layout.employeeRows; r += 3) {
          [0, 1, 2, 3].forEach((col) => {
            applyStyle(r, col, { alignment: { horizontal: col === 2 || col === 3 ? "left" : "center", vertical: "center", wrapText: true } });
          });
          for (let c = dayStartCol; c <= dayEndCol; c += 1) {
            const value = ws[cellAddress(r + 2, c)]?.v;
            applyStyle(r + 2, c, {
              fill: value === "D" ? yellowFill : whiteFill,
              font: { name: "Calibri", sz: 7, bold: value === "D" },
              alignment: { horizontal: "center", vertical: "center" }
            });
          }
        }
      });

      for (let c = 0; c < totalCols; c += 1) {
        sectionLayouts.forEach((layout) => {
          applyStyle(layout.headerStartRow + 1, c, { border: { ...thinBorder, top: { style: "medium", color: { rgb: "000000" } } } });
          if (layout.employeeRows > 0) {
            applyStyle(layout.employeeStartRow + layout.employeeRows - 1, c, { border: { ...thinBorder, bottom: { style: "medium", color: { rgb: "000000" } } } });
          }
        });
      }
      sectionLayouts.forEach((layout) => {
        const endRow = Math.max(layout.headerStartRow + 2, layout.employeeStartRow + layout.employeeRows - 1);
        for (let r = layout.headerStartRow + 1; r <= endRow; r += 1) {
          applyStyle(r, 0, { border: { ...thinBorder, left: { style: "medium", color: { rgb: "000000" } } } });
          applyStyle(r, totalCols - 1, { border: { ...thinBorder, right: { style: "medium", color: { rgb: "000000" } } } });
        }
      });

      ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: totalCols - 1 } });
      ws["!pageSetup"] = {
        orientation: "landscape",
        fitToWidth: 1,
        fitToHeight: 0
      };
      ws["!margins"] = {
        left: 0.25,
        right: 0.25,
        top: 0.25,
        bottom: 0.25,
        header: 0.1,
        footer: 0.1
      };

      XLSX.utils.book_append_sheet(wb, ws, "RAYADOR");
      XLSX.writeFile(wb, `rayador-de-mitas-${desde || "sin-desde"}-${hasta || "sin-hasta"}.xlsx`);
      showSuccess(`Excel generado con ${entries.length} trabajadores.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo exportar el reporte.");
    }
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4"><SubrouteBackButton to="/personal" label="Volver a Personal" /></div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="page-title font-headline text-3xl font-extrabold">Reporte de Asistencia</h1>
          <button type="button" onClick={() => void handleExportExcel()} className="rounded-lg bg-[var(--color-primary)]/14 px-4 py-2 text-sm font-semibold text-[var(--color-primary)]">
            Exportar Excel
          </button>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
          <AutocompleteSelect value={empleadoId} onChange={setEmpleadoId} options={employeeOptions} placeholder="Empleado (opcional)" className="w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm" />
        </div>
      </article>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
        <div className="px-5 py-3 text-xs text-[var(--color-on-surface-variant)]">Registros: {reportQuery.data?.length ?? 0}</div>
        <div className="space-y-4 p-4">
          {reportQuery.data?.map((entry) => (
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
    </section>
  );
}
