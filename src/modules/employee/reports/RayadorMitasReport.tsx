import { useMemo } from "react";
import * as XLSX from "xlsx-js-style";
import { FileSpreadsheet } from "lucide-react";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import {
  formatDateInputValue,
  formatFechaCorta,
  type ReportData,
  type ReportDay,
  type ReportEmployee
} from "@/modules/employee/lib/asistenciaReport";
import {
  calcularRayadorEmpleado,
  createBlankRayadorRow,
  getSafeMergeRanges,
  monthNames,
  rangoRayador,
  type RayadorFila
} from "@/modules/employee/lib/rayador";
import { ReportEstado } from "@/modules/employee/reports/ReportEstado";

const DIA_LETRA = ["D", "L", "M", "M", "J", "V", "S"];

const MARK_CLASS: Record<string, string> = {
  "1": "text-emerald-600",
  F: "bg-rose-500/20 font-bold text-rose-600",
  VAC: "bg-sky-500/15 text-sky-600",
  LIC: "bg-sky-500/15 text-sky-600",
  D: "bg-yellow-400/30 font-bold"
};

const LEYENDA: Array<{ mark: string; texto: string }> = [
  { mark: "1", texto: "Asistió" },
  { mark: "F", texto: "Falta o abandono" },
  { mark: "VAC", texto: "Vacación" },
  { mark: "LIC", texto: "Permiso, enfermedad o feriado" },
  { mark: "D", texto: "Descanso / domingo" }
];

interface FilaVista {
  entry: ReportEmployee;
  fila: RayadorFila;
  total: number;
  dias: Map<string, ReportDay>;
}

const thClass = "px-1 py-1.5 text-center text-[10px] font-bold text-[var(--color-on-surface-variant)]";

function tooltipDia(fecha: string, mark: string, day: ReportDay | undefined) {
  const partes = [formatFechaCorta(fecha)];
  if (day) {
    partes.push(day.estado);
    if (day.real?.entrada) partes.push(`entrada ${day.real.entrada}`);
    if (day.programado?.entrada) partes.push(`horario ${day.programado.entrada}`);
    if (day.minutosRetraso > 0) partes.push(`retraso ${day.minutosRetraso} min`);
  }
  if (!mark) partes.push("sin marca en el rayador");
  return partes.join(" · ");
}

// Reporte "Rayador de mitas": una fila por trabajador con una marca por día del
// mes y los totales. Es el mismo contenido que el Excel "Libro rayador de mitas".
export function RayadorMitasReport({ entries: todos, isLoading, isError, desde, hasta }: ReportData) {
  const { showError, showSuccess } = useToast();
  // El personal con contrato no entra al rayador (ni en pantalla ni en el Excel)
  const entries = useMemo(() => todos.filter((e) => e.empleado.contratacion !== "CONTRATO"), [todos]);
  const excluidos = todos.length - entries.length;
  const hoy = formatDateInputValue(new Date());
  const { fromDate, daysCount, truncated, daysInRange } = useMemo(() => rangoRayador(desde, hasta), [desde, hasta]);

  const cabeceraDias = useMemo(
    () =>
      Array.from({ length: daysCount }, (_, i) => {
        if (!fromDate) return { fecha: "", numero: i + 1, letra: "", domingo: false };
        const d = new Date(fromDate);
        d.setDate(d.getDate() + i);
        return { fecha: formatDateInputValue(d), numero: d.getDate(), letra: DIA_LETRA[d.getDay()] ?? "", domingo: d.getDay() === 0 };
      }),
    [fromDate, daysCount]
  );

  const secciones = useMemo(() => {
    const armar = (lista: ReportEmployee[]): FilaVista[] =>
      lista.map((entry) => {
        const fila = calcularRayadorEmpleado(entry, fromDate, daysCount, hoy);
        return {
          entry,
          fila,
          total: fila.presentDays + fila.domingoDays + fila.vacationDays + fila.licenseDays + fila.absenceDays,
          dias: new Map(entry.dias.map((d) => [d.fecha, d]))
        };
      });
    return [
      { titulo: "PERSONAL TÉCNICO Y EMPLEADOS", filas: armar(entries.filter((e) => e.empleado.tipoPersonal === "TECNICO_EMPLEADO")) },
      { titulo: "PERSONAL OBRERO", filas: armar(entries.filter((e) => e.empleado.tipoPersonal === "OBRERO")) }
    ];
  }, [entries, fromDate, daysCount, hoy]);

  async function handleExportExcel() {
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
          const { marks, presentDays, domingoDays, vacationDays, licenseDays, absenceDays } =
            calcularRayadorEmpleado(entry, fromDate, daysCount, hoy);

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
          entries: entries.filter((entry) => entry.empleado.tipoPersonal === "TECNICO_EMPLEADO")
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
      ws["!merges"] = getSafeMergeRanges([
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
        { s: { r: 1, c: 8 }, e: { r: 3, c: dayEndCol } },
        { s: { r: 1, c: summaryStartCol }, e: { r: 3, c: summaryEndCol } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
        ...employeeMerges
      ], aoa.length, totalCols);
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
              font: {
                name: "Calibri",
                sz: 7,
                bold: value === "D"
              },
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

  const titulo = `LIBRO RAYADOR DE MITAS MES DE ${fromDate ? monthNames[fromDate.getMonth()] : ""} ${fromDate?.getFullYear() ?? ""}`.trim();
  const hayEstado = isLoading || isError || entries.length === 0;

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{titulo}</h2>
          <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
            Una marca por día: asistió o no (el retraso no se marca aquí). Pasa el cursor sobre una marca para ver el
            detalle de ese día. Los días futuros sin marcas quedan vacíos.
            {excluidos > 0 ? ` No incluye a ${excluidos} trabajador(es) con contrato.` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleExportExcel()}
          disabled={hayEstado}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)]/14 px-4 py-2 text-xs font-semibold text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileSpreadsheet size={14} />
          Exportar Excel
        </button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-[var(--color-border-soft)] px-5 py-2 text-[11px]">
        {LEYENDA.map((item) => (
          <span key={item.mark} className="inline-flex items-center gap-1.5">
            <span className={`inline-flex min-w-[22px] justify-center rounded px-1 font-mono ${MARK_CLASS[item.mark] ?? ""}`}>{item.mark}</span>
            {item.texto}
          </span>
        ))}
      </div>

      {truncated ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-5 py-2 text-xs text-amber-700">
          El rango tiene {daysInRange} días, pero el rayador es de un mes: se muestran solo los primeros 31 (del{" "}
          {formatFechaCorta(cabeceraDias[0]?.fecha ?? desde)} al {formatFechaCorta(cabeceraDias[daysCount - 1]?.fecha ?? hasta)}).
        </div>
      ) : null}

      {hayEstado ? (
        <div className="p-4">
          <ReportEstado isLoading={isLoading} isError={isError} isEmpty={entries.length === 0} />
        </div>
      ) : (
        <div className="space-y-6 p-4">
          {secciones.map((seccion) => (
            <section key={seccion.titulo}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest">
                {seccion.titulo} <span className="font-normal text-[var(--color-on-surface-variant)]">({seccion.filas.length})</span>
              </h3>
              {seccion.filas.length === 0 ? (
                <p className="rounded-lg border border-[var(--color-border-soft)] px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
                  Sin trabajadores de este tipo en el reporte.
                </p>
              ) : (
                <div className="table-scroll overflow-x-auto rounded-lg border border-[var(--color-border-soft)]">
                  <table className="border-collapse text-left">
                    <thead className="bg-[var(--color-surface-container-high)]">
                      <tr>
                        <th rowSpan={2} className={`${thClass} sticky left-0 z-10 min-w-[190px] bg-[var(--color-surface-container-high)] text-left`}>
                          N° · Nombre y apellido
                        </th>
                        <th rowSpan={2} className={`${thClass} min-w-[70px]`}>Cód.</th>
                        <th rowSpan={2} className={`${thClass} min-w-[110px] text-left`}>Ocupación</th>
                        {cabeceraDias.map((dia) => (
                          <th key={`n-${dia.numero}-${dia.fecha}`} className={`${thClass} min-w-[26px] ${dia.domingo ? "bg-yellow-400/30" : ""}`}>
                            {dia.numero}
                          </th>
                        ))}
                        {["Ord.", "Dom.", "Vac.", "LIC", "Fall.", "TOT."].map((label) => (
                          <th key={label} rowSpan={2} className={`${thClass} min-w-[36px] border-l border-[var(--color-border-soft)]`}>
                            {label}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {cabeceraDias.map((dia) => (
                          <th key={`l-${dia.numero}-${dia.fecha}`} className={`${thClass} font-normal ${dia.domingo ? "bg-yellow-400/30" : ""}`}>
                            {dia.letra}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-soft)]">
                      {seccion.filas.map(({ entry, fila, total, dias }, index) => (
                        <tr key={entry.empleado.id} className="hover:bg-[var(--color-surface-container-high)]/60">
                          <td className="sticky left-0 z-10 bg-[var(--color-surface-container-low)] px-2 py-1.5 text-xs font-semibold">
                            <span className="mr-1.5 font-mono font-normal text-[var(--color-on-surface-variant)]">{index + 1}.</span>
                            {entry.empleado.nombre}
                          </td>
                          <td className="px-1 py-1.5 text-center font-mono text-[11px]">{entry.empleado.documento ?? entry.empleado.id}</td>
                          <td className="px-1 py-1.5 text-[11px]">{entry.empleado.cargo ?? ""}</td>
                          {fila.marks.map((mark, i) => {
                            const fecha = cabeceraDias[i]?.fecha ?? "";
                            return (
                              <td
                                key={fecha || i}
                                title={tooltipDia(fecha, mark, dias.get(fecha))}
                                className={`px-0 py-1.5 text-center font-mono text-[10px] ${MARK_CLASS[mark] ?? ""}`}
                              >
                                {mark}
                              </td>
                            );
                          })}
                          {[fila.presentDays, fila.domingoDays, fila.vacationDays, fila.licenseDays, fila.absenceDays, total].map((value, i) => (
                            <td
                              key={i}
                              className={`border-l border-[var(--color-border-soft)] px-1 py-1.5 text-center font-mono text-[11px] ${i === 5 ? "font-bold" : ""} ${i === 4 && value > 0 ? "font-bold text-rose-600" : ""}`}
                            >
                              {value || ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </article>
  );
}
