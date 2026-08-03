import { useMemo, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { getTipoPersonalLabel } from "@/modules/employee/hooks/useEmployees";
import type { EmployeeTipoPersonal } from "@/modules/employee/db/employee.db";
import { useToast } from "@/shared/ui/toast/ToastProvider";

export interface LibroAsistenciaDay {
  fecha: string;
  estado: string;
  real?: { entrada?: string | null; salida?: string | null } | null;
  salidaEstimada?: string | null;
}

export interface LibroAsistenciaEmpleado {
  empleado: {
    id: number;
    nombre: string;
    documento?: string | null;
    cargo?: string | null;
    tipoPersonal?: EmployeeTipoPersonal | null;
  };
  dias: LibroAsistenciaDay[];
}

interface LibroAsistenciaReportProps {
  entries: LibroAsistenciaEmpleado[];
  desde: string;
  hasta: string;
}

const DIA_NOMBRES = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
const MES_NOMBRES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

// Estados en los que el trabajador debía asistir ese día (se imprime fila).
// El resto (vacación, permiso, no laboral, sin horario, etc.) no requiere firma.
const ESTADOS_CON_FILA = new Set(["PUNTUAL", "TARDE", "AUSENTE", "ABANDONO"]);
const ESTADOS_FALLA = new Set(["AUSENTE", "ABANDONO"]);

interface DiaRow {
  no: number;
  nombre: string;
  falla: boolean;
  hrsIngreso: string;
  hrsSalida: string;
}

interface DiaBlock {
  fecha: string;
  titulo: string;
  filas: DiaRow[];
}

function buildDiaBlocks(entries: LibroAsistenciaEmpleado[], desde: string, hasta: string): DiaBlock[] {
  if (!desde || !hasta) return [];
  const desdeDate = new Date(`${desde}T00:00:00`);
  const hastaDate = new Date(`${hasta}T00:00:00`);
  const blocks: DiaBlock[] = [];

  for (const cursor = new Date(desdeDate); cursor <= hastaDate; cursor.setDate(cursor.getDate() + 1)) {
    const fecha = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const titulo = `${DIA_NOMBRES[cursor.getDay()]} ${String(cursor.getDate()).padStart(2, "0")} DE ${MES_NOMBRES[cursor.getMonth()]} DE ${cursor.getFullYear()}`;

    const filas: DiaRow[] = [];
    entries.forEach((entry) => {
      const dia = entry.dias.find((d) => d.fecha === fecha);
      if (!dia) return;
      const estado = dia.estado.trim().toUpperCase();
      if (!ESTADOS_CON_FILA.has(estado)) return;

      filas.push({
        no: filas.length + 1,
        nombre: entry.empleado.nombre,
        falla: ESTADOS_FALLA.has(estado),
        hrsIngreso: dia.real?.entrada ?? "",
        hrsSalida: dia.salidaEstimada ?? ""
      });
    });

    blocks.push({ fecha, titulo, filas });
  }

  return blocks;
}

export function LibroAsistenciaReport({ entries, desde, hasta }: LibroAsistenciaReportProps) {
  const { showSuccess, showError } = useToast();
  const [tipoFiltro, setTipoFiltro] = useState<"" | EmployeeTipoPersonal>("");
  const [empleadoFiltroId, setEmpleadoFiltroId] = useState("");

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (tipoFiltro && entry.empleado.tipoPersonal !== tipoFiltro) return false;
      if (empleadoFiltroId && String(entry.empleado.id) !== empleadoFiltroId) return false;
      return true;
    });
  }, [entries, tipoFiltro, empleadoFiltroId]);

  const diaBlocks = useMemo(() => buildDiaBlocks(filteredEntries, desde, hasta), [filteredEntries, desde, hasta]);

  function handlePrint() {
    window.print();
  }

  function handleExportExcel() {
    try {
      const aoa: Array<Array<string | number>> = [];
      aoa.push(["", "EMPRESA MINERA", "", "", "", ""]);
      aoa.push(["", "MARTE S.R.L.", "", "", "", ""]);
      aoa.push(["", "LIBRO DE ASISTENCIA", "", "", "", ""]);
      aoa.push(["No.", "NOMBRE Y APELLIDO", "Hrs.", "INGRESO FIRMA", "Hrs.", "SALIDA FIRMA"]);

      const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [
        { s: { r: 0, c: 1 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 1 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 1 }, e: { r: 2, c: 5 } }
      ];

      diaBlocks.forEach((block) => {
        const tituloRow = aoa.length;
        aoa.push([block.titulo, "", "", "", "", ""]);
        merges.push({ s: { r: tituloRow, c: 0 }, e: { r: tituloRow, c: 5 } });

        if (block.filas.length === 0) {
          aoa.push(["", "", "", "", "", ""]);
          return;
        }

        block.filas.forEach((fila) => {
          const row = aoa.length;
          if (fila.falla) {
            aoa.push([fila.no, fila.nombre, "FALLA", "", "FALLA", ""]);
            merges.push({ s: { r: row, c: 2 }, e: { r: row, c: 3 } });
            merges.push({ s: { r: row, c: 4 }, e: { r: row, c: 5 } });
          } else {
            aoa.push([fila.no, fila.nombre, fila.hrsIngreso, "", fila.hrsSalida, ""]);
          }
        });
      });

      const firmaRow = aoa.length + 1;
      aoa.push(["", "", "", "", "", ""]);
      aoa.push(["", "", "", "JEFE DE SECCION", "", ""]);
      merges.push({ s: { r: firmaRow, c: 3 }, e: { r: firmaRow, c: 5 } });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [{ wch: 5 }, { wch: 28 }, { wch: 8 }, { wch: 16 }, { wch: 8 }, { wch: 16 }];
      ws["!merges"] = merges;

      const thinBorder = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      };

      function applyStyle(row: number, col: number, style: Record<string, unknown>) {
        const addr = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = ws[addr] ?? { t: "s", v: "" };
        ws[addr] = cell;
        (cell as { s?: Record<string, unknown> }).s = { ...(cell as { s?: Record<string, unknown> }).s, ...style };
      }

      for (let r = 0; r < aoa.length; r += 1) {
        for (let c = 0; c < 6; c += 1) {
          applyStyle(r, c, { font: { name: "Calibri", sz: 10 }, alignment: { horizontal: "center", vertical: "center" } });
        }
      }
      applyStyle(1, 1, { font: { name: "Calibri", sz: 12, bold: true }, alignment: { horizontal: "center", vertical: "center" } });
      applyStyle(2, 1, { font: { name: "Calibri", sz: 13, bold: true, underline: true }, alignment: { horizontal: "center", vertical: "center" } });
      for (let c = 0; c < 6; c += 1) {
        applyStyle(3, c, { font: { name: "Calibri", sz: 9, bold: true }, border: thinBorder, fill: { patternType: "solid", fgColor: { rgb: "D9EAD3" } } });
      }

      let cursorRow = 4;
      diaBlocks.forEach((block) => {
        for (let c = 0; c < 6; c += 1) {
          applyStyle(cursorRow, c, { font: { name: "Calibri", sz: 9, bold: true }, fill: { patternType: "solid", fgColor: { rgb: "F2F2F2" } }, border: thinBorder });
        }
        cursorRow += 1;
        const rows = block.filas.length === 0 ? 1 : block.filas.length;
        for (let i = 0; i < rows; i += 1) {
          for (let c = 0; c < 6; c += 1) {
            applyStyle(cursorRow, c, {
              font: { name: "Calibri", sz: 9, color: block.filas[i]?.falla ? { rgb: "1155CC" } : undefined },
              border: thinBorder,
              alignment: { horizontal: c === 1 ? "left" : "center", vertical: "center" }
            });
          }
          cursorRow += 1;
        }
      });

      ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: 5 } });
      ws["!pageSetup"] = { orientation: "portrait", fitToWidth: 1, fitToHeight: 0 };

      XLSX.utils.book_append_sheet(wb, ws, "LIBRO");
      XLSX.writeFile(wb, `libro-asistencia-${desde || "sin-desde"}-${hasta || "sin-hasta"}.xlsx`);
      showSuccess(`Libro de asistencia generado con ${filteredEntries.length} trabajador(es).`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo exportar el libro de asistencia.");
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-4">
        <h2 className="text-lg font-bold">Libro de Asistencia</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as "" | EmployeeTipoPersonal)}
            className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs"
          >
            <option value="">Todo el personal</option>
            <option value="OBRERO">Solo obreros</option>
            <option value="TECNICO_EMPLEADO">Solo técnicos/empleados</option>
          </select>
          <select
            value={empleadoFiltroId}
            onChange={(e) => setEmpleadoFiltroId(e.target.value)}
            className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs"
          >
            <option value="">Todos los trabajadores</option>
            {entries.map((entry) => (
              <option key={entry.empleado.id} value={String(entry.empleado.id)}>
                {entry.empleado.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={diaBlocks.length === 0}
            className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={diaBlocks.length === 0}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-on-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Imprimir
          </button>
        </div>
      </div>

      <div className="p-4">
        {diaBlocks.length === 0 ? (
          <p className="no-print px-2 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
            Carga un reporte con fechas para ver el libro de asistencia.
          </p>
        ) : (
          <div id="libro-print-area" className="mx-auto max-w-3xl bg-white text-black">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #libro-print-area, #libro-print-area * { visibility: visible; }
                #libro-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                .no-print { display: none !important; }
                .libro-dia { page-break-inside: avoid; }
              }
            `}</style>

            <header className="mb-4 text-center">
              <p className="text-sm font-semibold">EMPRESA MINERA</p>
              <p className="text-base font-bold">MARTE S.R.L.</p>
              <p className="mt-1 text-lg font-bold underline">LIBRO DE ASISTENCIA</p>
            </header>

            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-black px-1 py-1">No.</th>
                  <th className="border border-black px-1 py-1">NOMBRE Y APELLIDO</th>
                  <th className="border border-black px-1 py-1">Hrs.</th>
                  <th className="border border-black px-1 py-1">INGRESO FIRMA</th>
                  <th className="border border-black px-1 py-1">Hrs.</th>
                  <th className="border border-black px-1 py-1">SALIDA FIRMA</th>
                </tr>
              </thead>
            </table>

            {diaBlocks.map((block) => (
              <table key={block.fecha} className="libro-dia w-full border-collapse text-xs">
                <tbody>
                  <tr>
                    <td colSpan={6} className="border border-black bg-gray-100 py-1 text-center font-bold">
                      {block.titulo}
                    </td>
                  </tr>
                  {block.filas.length === 0 ? (
                    <tr>
                      <td className="border border-black px-1 py-3" />
                      <td className="border border-black px-1 py-3" />
                      <td className="border border-black px-1 py-3" />
                      <td className="border border-black px-1 py-3" />
                      <td className="border border-black px-1 py-3" />
                      <td className="border border-black px-1 py-3" />
                    </tr>
                  ) : (
                    block.filas.map((fila) => (
                      <tr key={`${block.fecha}-${fila.no}`}>
                        <td className="border border-black px-1 py-2 text-center">{fila.no}.-</td>
                        <td className="border border-black px-1 py-2">{fila.nombre}</td>
                        {fila.falla ? (
                          <>
                            <td colSpan={2} className="border border-black px-1 py-2 text-center font-bold text-blue-700">FALLA</td>
                            <td colSpan={2} className="border border-black px-1 py-2 text-center font-bold text-blue-700">FALLA</td>
                          </>
                        ) : (
                          <>
                            <td className="border border-black px-1 py-2 text-center">{fila.hrsIngreso}</td>
                            <td className="border border-black px-1 py-2" />
                            <td className="border border-black px-1 py-2 text-center">{fila.hrsSalida}</td>
                            <td className="border border-black px-1 py-2" />
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ))}

            <footer className="mt-10 text-center">
              <p className="mx-auto w-64 border-t border-black pt-1 text-xs font-semibold">JEFE DE SECCIÓN</p>
            </footer>
          </div>
        )}
      </div>
    </article>
  );
}
