import { useEffect, useMemo, useState } from "react";
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

const DIA_CORTO = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];

// Estados en los que el trabajador debía asistir ese día, o que corresponden
// a un descanso compensatorio real (registrado como ausencia tipo DESCANSO).
// El resto (vacación, permiso, no laboral, sin horario, etc.) no requiere fila.
const ESTADOS_CON_FILA = new Set(["PUNTUAL", "TARDE", "AUSENTE", "ABANDONO", "DESCANSO"]);
const ESTADOS_FALLA = new Set(["AUSENTE", "ABANDONO"]);
const ESTADO_DESCANSO = "DESCANSO";
const ETIQUETA_DESCANSO = "DESCANSO COMPENSATORIO";

const EMPLEADOS_POR_PAGINA = 5;

type TipoFila = "ASISTIO" | "FALLA" | "DESCANSO";

interface DiaRow {
  no: number;
  fechaLabel: string;
  tipo: TipoFila;
  hrsIngreso: string;
  hrsSalida: string;
}

interface EmpleadoBlock {
  empleadoId: number;
  nombre: string;
  cargo: string | null;
  tipoPersonal?: EmployeeTipoPersonal | null;
  filas: DiaRow[];
}

function buildEmpleadoBlock(entry: LibroAsistenciaEmpleado, desde: string, hasta: string): EmpleadoBlock {
  const filas: DiaRow[] = [];
  if (desde && hasta) {
    const desdeDate = new Date(`${desde}T00:00:00`);
    const hastaDate = new Date(`${hasta}T00:00:00`);
    for (const cursor = new Date(desdeDate); cursor <= hastaDate; cursor.setDate(cursor.getDate() + 1)) {
      const fecha = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const dia = entry.dias.find((d) => d.fecha === fecha);
      if (!dia) continue;
      const estado = dia.estado.trim().toUpperCase();
      if (!ESTADOS_CON_FILA.has(estado)) continue;

      const tipo: TipoFila = estado === ESTADO_DESCANSO ? "DESCANSO" : ESTADOS_FALLA.has(estado) ? "FALLA" : "ASISTIO";

      filas.push({
        no: filas.length + 1,
        fechaLabel: `${DIA_CORTO[cursor.getDay()]} ${String(cursor.getDate()).padStart(2, "0")}/${String(cursor.getMonth() + 1).padStart(2, "0")}`,
        tipo,
        hrsIngreso: dia.real?.entrada ?? "",
        hrsSalida: dia.salidaEstimada ?? ""
      });
    }
  }

  return {
    empleadoId: entry.empleado.id,
    nombre: entry.empleado.nombre,
    cargo: entry.empleado.cargo ?? null,
    tipoPersonal: entry.empleado.tipoPersonal,
    filas
  };
}

function sanitizeSheetName(name: string, usedNames: Set<string>): string {
  const base = name.replace(/[:\\/?*[\]]/g, "").trim().slice(0, 28) || "Empleado";
  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate.toUpperCase())) {
    candidate = `${base.slice(0, 28 - String(suffix).length - 1)} ${suffix}`;
    suffix += 1;
  }
  usedNames.add(candidate.toUpperCase());
  return candidate;
}

export function LibroAsistenciaReport({ entries, desde, hasta }: LibroAsistenciaReportProps) {
  const { showSuccess, showError } = useToast();
  const [tipoFiltro, setTipoFiltro] = useState<"" | EmployeeTipoPersonal>("");
  const [empleadoFiltroId, setEmpleadoFiltroId] = useState("");
  const [cargado, setCargado] = useState(false);
  const [pagina, setPagina] = useState(1);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (tipoFiltro && entry.empleado.tipoPersonal !== tipoFiltro) return false;
      if (empleadoFiltroId && String(entry.empleado.id) !== empleadoFiltroId) return false;
      return true;
    });
  }, [entries, tipoFiltro, empleadoFiltroId]);

  const totalPaginas = Math.max(1, Math.ceil(filteredEntries.length / EMPLEADOS_POR_PAGINA));

  // Cualquier cambio en filtros u origen de datos invalida la vista previa
  // cargada: hay que volver a pulsar "Cargar libro" a propósito. Esto evita
  // reconstruir/renderizar cientos de filas (muchos empleados x ~30 días)
  // en cada tecleo de filtro.
  useEffect(() => {
    setCargado(false);
    setPagina(1);
  }, [entries, desde, hasta, tipoFiltro, empleadoFiltroId]);

  const paginaSegura = Math.min(pagina, totalPaginas);
  const entriesDePagina = useMemo(
    () => filteredEntries.slice((paginaSegura - 1) * EMPLEADOS_POR_PAGINA, paginaSegura * EMPLEADOS_POR_PAGINA),
    [filteredEntries, paginaSegura]
  );

  const empleadoBlocks = useMemo(
    () => (cargado ? entriesDePagina.map((entry) => buildEmpleadoBlock(entry, desde, hasta)) : []),
    [cargado, entriesDePagina, desde, hasta]
  );

  function handleCargar() {
    setCargado(true);
  }

  function handlePrint() {
    window.print();
  }

  function handleExportExcel() {
    try {
      if (filteredEntries.length === 0) {
        showError("No hay trabajadores para exportar con los filtros actuales.");
        return;
      }

      const wb = XLSX.utils.book_new();
      const usedNames = new Set<string>();
      const thinBorder = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      };

      filteredEntries.forEach((entry) => {
        const block = buildEmpleadoBlock(entry, desde, hasta);

        const aoa: Array<Array<string | number>> = [];
        aoa.push(["", "EMPRESA MINERA", "", "", "", ""]);
        aoa.push(["", "MARTE S.R.L.", "", "", "", ""]);
        aoa.push(["", "LIBRO DE ASISTENCIA", "", "", "", ""]);
        aoa.push(["", `${block.nombre}${block.cargo ? ` - ${block.cargo}` : ""}`, "", "", "", ""]);
        aoa.push(["No.", "Fecha", "Hrs.", "INGRESO FIRMA", "Hrs.", "SALIDA FIRMA"]);

        const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [
          { s: { r: 0, c: 1 }, e: { r: 0, c: 5 } },
          { s: { r: 1, c: 1 }, e: { r: 1, c: 5 } },
          { s: { r: 2, c: 1 }, e: { r: 2, c: 5 } },
          { s: { r: 3, c: 1 }, e: { r: 3, c: 5 } }
        ];

        if (block.filas.length === 0) {
          aoa.push(["", "Sin días con asistencia en el período", "", "", "", ""]);
          merges.push({ s: { r: 5, c: 0 }, e: { r: 5, c: 5 } });
        } else {
          block.filas.forEach((fila) => {
            const row = aoa.length;
            if (fila.tipo === "DESCANSO") {
              aoa.push([fila.no, fila.fechaLabel, ETIQUETA_DESCANSO, "", "", ""]);
              merges.push({ s: { r: row, c: 2 }, e: { r: row, c: 5 } });
            } else if (fila.tipo === "FALLA") {
              aoa.push([fila.no, fila.fechaLabel, "FALLA", "", "FALLA", ""]);
              merges.push({ s: { r: row, c: 2 }, e: { r: row, c: 3 } });
              merges.push({ s: { r: row, c: 4 }, e: { r: row, c: 5 } });
            } else {
              aoa.push([fila.no, fila.fechaLabel, fila.hrsIngreso, "", fila.hrsSalida, ""]);
            }
          });
        }

        const firmaRow = aoa.length + 1;
        aoa.push(["", "", "", "", "", ""]);
        aoa.push(["", "", "", "JEFE DE SECCION", "", ""]);
        merges.push({ s: { r: firmaRow, c: 3 }, e: { r: firmaRow, c: 5 } });

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 8 }, { wch: 16 }];
        ws["!merges"] = merges;

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
        applyStyle(3, 1, { font: { name: "Calibri", sz: 11, bold: true }, alignment: { horizontal: "center", vertical: "center" } });
        for (let c = 0; c < 6; c += 1) {
          applyStyle(4, c, { font: { name: "Calibri", sz: 9, bold: true }, border: thinBorder, fill: { patternType: "solid", fgColor: { rgb: "D9EAD3" } } });
        }
        for (let r = 5; r < 5 + Math.max(block.filas.length, 1); r += 1) {
          const tipo = block.filas[r - 5]?.tipo;
          for (let c = 0; c < 6; c += 1) {
            applyStyle(r, c, {
              font: {
                name: "Calibri",
                sz: 9,
                bold: tipo === "FALLA" || tipo === "DESCANSO",
                color: tipo === "FALLA" ? { rgb: "1155CC" } : tipo === "DESCANSO" ? { rgb: "38761D" } : undefined
              },
              border: thinBorder,
              alignment: { horizontal: "center", vertical: "center" }
            });
          }
        }

        ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: 5 } });
        ws["!pageSetup"] = { orientation: "portrait", fitToWidth: 1, fitToHeight: 0 };

        const sheetName = sanitizeSheetName(block.nombre, usedNames);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      XLSX.writeFile(wb, `libro-asistencia-${desde || "sin-desde"}-${hasta || "sin-hasta"}.xlsx`);
      showSuccess(`Libro de asistencia generado: ${filteredEntries.length} hoja(s), una por trabajador.`);
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
            onClick={handleCargar}
            disabled={filteredEntries.length === 0 || !desde || !hasta}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-on-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cargar libro
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredEntries.length === 0}
            className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!cargado || empleadoBlocks.length === 0}
            className="rounded-lg bg-[var(--color-primary)]/14 px-4 py-2 text-xs font-semibold text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Imprimir
          </button>
        </div>
      </div>

      <div className="p-4">
        {!cargado ? (
          <p className="no-print px-2 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
            Elige los filtros y presiona <strong>Cargar libro</strong> para ver la vista previa
            {filteredEntries.length > EMPLEADOS_POR_PAGINA
              ? ` (se muestra de a ${EMPLEADOS_POR_PAGINA} trabajadores por página).`
              : "."}
          </p>
        ) : (
          <>
            {totalPaginas > 1 ? (
              <div className="no-print mb-3 flex items-center justify-between gap-3 text-xs">
                <span className="text-[var(--color-on-surface-variant)]">
                  Página {paginaSegura} de {totalPaginas} — {filteredEntries.length} trabajador(es) en total
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={paginaSegura <= 1}
                    className="rounded-md bg-[var(--color-surface-container-highest)] px-3 py-1.5 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaSegura >= totalPaginas}
                    className="rounded-md bg-[var(--color-surface-container-highest)] px-3 py-1.5 disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}

            <div id="libro-print-area" className="mx-auto max-w-3xl bg-white text-black">
              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  #libro-print-area, #libro-print-area * { visibility: visible; }
                  #libro-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                  .no-print { display: none !important; }
                  .libro-empleado { page-break-inside: avoid; }
                  .libro-empleado:not(:first-child) { page-break-before: always; }
                }
              `}</style>

              <header className="mb-4 text-center">
                <p className="text-sm font-semibold">EMPRESA MINERA</p>
                <p className="text-base font-bold">MARTE S.R.L.</p>
                <p className="mt-1 text-lg font-bold underline">LIBRO DE ASISTENCIA</p>
              </header>

              {empleadoBlocks.map((block) => (
                <section key={block.empleadoId} className="libro-empleado mb-6">
                  <p className="mb-1 text-sm font-bold">
                    {block.nombre}
                    {block.cargo ? ` — ${block.cargo}` : ""}
                    {block.tipoPersonal ? ` (${getTipoPersonalLabel(block.tipoPersonal)})` : ""}
                  </p>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="border border-black px-1 py-1">No.</th>
                        <th className="border border-black px-1 py-1">Fecha</th>
                        <th className="border border-black px-1 py-1">Hrs.</th>
                        <th className="border border-black px-1 py-1">INGRESO FIRMA</th>
                        <th className="border border-black px-1 py-1">Hrs.</th>
                        <th className="border border-black px-1 py-1">SALIDA FIRMA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.filas.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="border border-black px-1 py-3 text-center text-[var(--color-on-surface-variant)]">
                            Sin días con asistencia en el período seleccionado
                          </td>
                        </tr>
                      ) : (
                        block.filas.map((fila) => (
                          <tr key={`${block.empleadoId}-${fila.no}`}>
                            <td className="border border-black px-1 py-2 text-center">{fila.no}.-</td>
                            <td className="border border-black px-1 py-2 text-center">{fila.fechaLabel}</td>
                            {fila.tipo === "DESCANSO" ? (
                              <td colSpan={4} className="border border-black px-1 py-2 text-center font-bold text-green-700">
                                {ETIQUETA_DESCANSO}
                              </td>
                            ) : fila.tipo === "FALLA" ? (
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
                </section>
              ))}

              <footer className="mt-10 text-center">
                <p className="mx-auto w-64 border-t border-black pt-1 text-xs font-semibold">JEFE DE SECCIÓN</p>
              </footer>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
