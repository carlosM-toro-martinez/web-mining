import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx-js-style";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useEmployees } from "@/modules/employee/hooks/useEmployees";
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

interface ReportEmployee {
  empleado: { id: number; nombre: string; cargo?: string | null };
  horarioActual?: { nombre: string; entrada: string; salida: string } | null;
  dias: ReportDay[];
  resumen: Record<string, number>;
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
        label: employee.nombre,
        searchText: `${employee.documento ?? ""} ${employee.cargo ?? ""} ${employee.deviceUserId ?? ""}`
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

      const title = `LIBRO RAYADOR DE MITAS (${desde || "sin-desde"} a ${hasta || "sin-hasta"})`;
      const headerTop = ["No.", "de", "Nombre y apellido", "Ocupación", "Jornal", ...Array.from({ length: daysCount }, (_, i) => i + 1)];
      const headerBottom = ["", "Cod.", "", "", "Basico", ...Array.from({ length: daysCount }, (_, i) => {
        if (!fromDate) return "";
        const d = new Date(fromDate);
        d.setDate(d.getDate() + i);
        return ["D", "L", "M", "M", "J", "V", "S"][d.getDay()] ?? "";
      })];

      const detailRows = entries.flatMap((entry, index) => {
        const marks = Array.from({ length: daysCount }, () => "");
        let presentDays = 0;
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
            marks[position] = "A";
          } else if (status === "VACACION") {
            marks[position] = "V";
          } else if (status === "ABANDONO") {
            marks[position] = "AB";
          } else if (status === "DESCANSO") {
            marks[position] = "D";
          } else {
            marks[position] = "";
          }
        }

        const rowMain = [
          index + 1,
          String(entry.empleado.id ?? ""),
          entry.empleado.nombre,
          entry.empleado.cargo ?? "",
          "",
          ...Array.from({ length: daysCount }, () => "")
        ];
        const rowSalary = [
          "",
          "",
          "",
          "",
          "",
          ...Array.from({ length: daysCount }, () => "")
        ];
        const rowMarks = [
          "",
          "",
          "",
          "",
          "",
          ...marks
        ];
        const rowSummary = [
          "",
          "",
          "",
          "Días trabajados",
          presentDays,
          ...Array.from({ length: daysCount }, () => "")
        ];
        return [rowMain, rowSalary, rowMarks, rowSummary];
      });

      const totalPresent = entries.reduce((acc, entry) => {
        return (
          acc +
          entry.dias.filter((day) => hasAttendanceMark(day)).length
        );
      }, 0);

      const summaryRow = ["", "", "RESUMEN GENERAL", "", totalPresent, ...Array.from({ length: daysCount }, () => "")];

      const aoa = [
        [title],
        ["PERSONAL TECNICO Y EMPLEADOS"],
        [],
        headerTop,
        headerBottom,
        ...detailRows,
        [],
        summaryRow
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 + daysCount } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 + daysCount } }
      ];
      ws["!cols"] = [
        { wch: 6 },
        { wch: 8 },
        { wch: 34 },
        { wch: 24 },
        { wch: 12 },
        ...Array.from({ length: daysCount }, () => ({ wch: 4 }))
      ];
      ws["!rows"] = [
        { hpt: 28 },
        { hpt: 22 },
        { hpt: 8 },
        { hpt: 22 },
        { hpt: 20 },
        ...Array.from({ length: detailRows.length }, () => ({ hpt: 19 })),
        { hpt: 10 },
        { hpt: 22 }
      ];

      const totalCols = 5 + daysCount;
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
      const titleFill = { patternType: "solid", fgColor: { rgb: "F2F2F2" } };
      const headerFill = { patternType: "solid", fgColor: { rgb: "BDD7EE" } };
      const groupFill = { patternType: "solid", fgColor: { rgb: "EAF2FB" } };
      const summaryFill = { patternType: "solid", fgColor: { rgb: "D9EAD3" } };

      function cellAddress(row: number, col: number) {
        return XLSX.utils.encode_cell({ r: row, c: col });
      }

      function applyStyle(row: number, col: number, style: Record<string, unknown>) {
        const addr = cellAddress(row, col);
        const cell = ws[addr];
        if (!cell) return;
        (cell as { s?: Record<string, unknown> }).s = {
          ...(cell as { s?: Record<string, unknown> }).s,
          ...style
        };
      }

      function styleRow(row: number, style: Record<string, unknown>) {
        for (let c = 0; c <= totalCols; c += 1) {
          applyStyle(row, c, style);
        }
      }

      // Title + subtitle
      styleRow(0, {
        font: { bold: true, sz: 14, name: "Calibri" },
        fill: titleFill,
        border: mediumBorder,
        alignment: { horizontal: "center", vertical: "center" }
      });
      styleRow(1, {
        font: { bold: true, sz: 11, name: "Calibri" },
        fill: titleFill,
        border: mediumBorder,
        alignment: { horizontal: "center", vertical: "center" }
      });

      // Table headers
      styleRow(3, {
        font: { bold: true, name: "Calibri" },
        fill: headerFill,
        border: thinBorder,
        alignment: { horizontal: "center", vertical: "center" }
      });
      styleRow(4, {
        font: { bold: true, name: "Calibri" },
        fill: headerFill,
        border: thinBorder,
        alignment: { horizontal: "center", vertical: "center" }
      });

      // Body borders
      for (let r = 5; r <= aoa.length - 1; r += 1) {
        styleRow(r, {
          border: thinBorder,
          font: { name: "Calibri", sz: 10 },
          alignment: { vertical: "center" }
        });
      }

      for (let r = 5; r < 5 + detailRows.length; r += 4) {
        styleRow(r, { fill: groupFill, font: { name: "Calibri", sz: 10, bold: true } });
        styleRow(r + 3, { fill: groupFill, font: { name: "Calibri", sz: 10, bold: true } });
      }

      styleRow(aoa.length - 1, {
        fill: summaryFill,
        font: { name: "Calibri", sz: 10, bold: true },
        border: mediumBorder,
        alignment: { horizontal: "center", vertical: "center" }
      });

      // Align key columns
      for (let r = 5; r <= aoa.length - 1; r += 1) {
        applyStyle(r, 0, { alignment: { horizontal: "center", vertical: "center" } });
        applyStyle(r, 1, { alignment: { horizontal: "center", vertical: "center" } });
        applyStyle(r, 2, { alignment: { horizontal: "left", vertical: "center" } });
        applyStyle(r, 3, { alignment: { horizontal: "left", vertical: "center" } });
        applyStyle(r, 4, { alignment: { horizontal: "center", vertical: "center" } });
      }

      // Outer border around main table area
      for (let c = 0; c <= totalCols; c += 1) {
        applyStyle(3, c, { border: { ...thinBorder, top: { style: "medium", color: { rgb: "000000" } } } });
        applyStyle(aoa.length - 1, c, { border: { ...thinBorder, bottom: { style: "medium", color: { rgb: "000000" } } } });
      }
      for (let r = 3; r <= aoa.length - 1; r += 1) {
        applyStyle(r, 0, { border: { ...thinBorder, left: { style: "medium", color: { rgb: "000000" } } } });
        applyStyle(r, totalCols, { border: { ...thinBorder, right: { style: "medium", color: { rgb: "000000" } } } });
      }

      XLSX.utils.book_append_sheet(wb, ws, "reporte-asistencia");
      XLSX.writeFile(wb, `reporte-asistencia-${desde || "sin-desde"}-${hasta || "sin-hasta"}.xlsx`);
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
                <p className="text-sm font-semibold">{entry.empleado.nombre} ({entry.empleado.cargo ?? "-"})</p>
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
