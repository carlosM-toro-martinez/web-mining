import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  ListFilter
} from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  useAnulacionesEntradasReportQuery,
  useAnulacionesSalidasReportQuery,
  useBalanceMensualReportQuery,
  useBinCardQuery,
  useBinCardValoradoQuery,
  useCuadroSuministrosReportQuery,
  useDetalleMaterialesReportQuery,
  useDiarioAlmacenesReportQuery,
  useComprasReportQuery,
  useEntradasAlmacenReportQuery,
  useInventarioAlmacenReportQuery,
  useSaldosInicialesReportQuery,
  useSalidasAlmacenReportQuery,
  useSalidasDetalleReportQuery,
  useStockReportQuery,
  useValesReportQuery
} from "@/features/reportes/hooks/useReportes";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import { useProveedoresQuery } from "@/features/proveedores/hooks/useProveedores";
import {
  buildAnulacionesEntradasApiReportDefinition,
  buildAnulacionesSalidasApiReportDefinition,
  buildBalanceMensualApiReportDefinition,
  buildCuadroSuministrosApiReportDefinition,
  buildDetalleMaterialesApiReportDefinition,
  buildDiarioAlmacenesApiReportDefinition,
  buildEntradasAlmacenApiReportDefinition,
  buildInventarioAlmacenApiReportDefinition,
  buildSaldosInicialesApiReportDefinition,
  buildSalidasAlmacenApiReportDefinition,
  buildSalidasDetalleApiReportDefinition,
  INVENTORY_REPORTS,
  isInventoryReportType
} from "@/features/reportes/lib/inventoryReportBuilder";
import {
  exportComprasReportExcel,
  exportInventoryReportExcel,
  exportInventoryReportPdf,
  exportLegacyBinCardExcel,
  exportLegacyBinCardPdf,
  exportStockReportExcel,
  exportValesReportExcel
} from "@/features/reportes/lib/reportesExport";
import type {
  CuadroSuministrosReportResponse,
  DetalleMaterialesReportResponse,
  DiarioAlmacenesReportResponse
} from "@/features/reportes/model/reportes.schema";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

function cuadroGrupoKey(grupo?: { codigo?: string | null; nombre?: string | null } | null) {
  const codigo = (grupo?.codigo ?? "").trim();
  const nombre = (grupo?.nombre ?? "").trim();
  if (!codigo && !nombre) return "";
  return `${codigo}|||${nombre}`;
}

function cuadroGrupoLabel(grupo?: { codigo?: string | null; nombre?: string | null } | null) {
  const codigo = (grupo?.codigo ?? "").trim();
  const nombre = (grupo?.nombre ?? "").trim();
  if (codigo && nombre) return `${codigo} - ${nombre}`;
  return codigo || nombre || "Sin grupo";
}

function cuadroGrupoSortValue(label: string) {
  const code = label.match(/\d+/)?.[0];
  return code ? Number(code) : Number.MAX_SAFE_INTEGER;
}

type DateMode = "none" | "specific" | "range";
type DataMode = "paged" | "all";
type LegacyReportType = "bin-card" | "bin-card-valorado";
type ApiReportType = "stock-actual" | "vales-resumen" | "compras-resumen";

const LEGACY_REPORTS: Array<{ type: LegacyReportType; title: string; description: string }> = [
  {
    type: "bin-card",
    title: "Bin Card",
    description: "Listado historico de movimientos por producto."
  },
  {
    type: "bin-card-valorado",
    title: "Bin Card Valorado",
    description: "Bin Card con costos unitarios, entradas y salidas valorizadas."
  }
];

const API_REPORTS: Array<{ type: ApiReportType; title: string; description: string }> = [
  {
    type: "stock-actual",
    title: "Stock Actual",
    description: "Stock con reservado, disponible y valor total."
  },
  {
    type: "vales-resumen",
    title: "Resumen De Vales",
    description: "Vales filtrables por estado, solicitante y fechas."
  },
  {
    type: "compras-resumen",
    title: "Resumen De Compras",
    description: "Compras filtrables por estado, proveedor y fechas."
  }
];

function formatBs(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function movimientoMonthLabel(anio: number, mes: number) {
  const date = new Date(anio, mes - 1, 1);
  return date.toLocaleDateString("es-BO", { month: "long" }).toUpperCase();
}

function previousMonthEnd(anio: number, mes: number) {
  const date = new Date(anio, mes - 1, 0);
  const month = date.toLocaleDateString("es-BO", { month: "long" });
  return `${date.getDate()} de ${month} de ${date.getFullYear()}`;
}

function reportCuentaTitulo(
  cuenta: DiarioAlmacenesReportResponse["data"]["meses"][number]["cuentasHaber"][number]
) {
  const code = (cuenta.codigoCompleto ?? "").replace(/[^\d]/g, "");
  const sector = cuenta.sectorNombre ? `"${cuenta.sectorNombre.toUpperCase()}"` : "";
  if (code.includes("100001000")) return "COSTO DE PRODUCCION - LIPEÑA";
  if (code.includes("104001000")) return "COSTO MEDIO AMBIENTE";
  if (code.includes("44002000") || code.includes("044002000"))
    return "OBRAS EN CONSTRUCCION LIPEÑA";
  if (code.includes("67001097") || code.includes("67001098") || cuenta.esTransporte) {
    return `COSTO COMB.TRANSPORTE${sector}`;
  }
  return `${(cuenta.centroCostoNombre ?? "").toUpperCase()} LIPEÑA`.trim();
}

function reportCuentaDisplay(value?: string | null) {
  return (value ?? "").replace(/\s+/g, ",");
}

function reportLineaCuenta(linea: { subCentro?: string | null; subCuentas?: string[] }) {
  return [linea.subCuentas?.join("-"), linea.subCentro].filter(Boolean).join("-");
}

type ReportDiarioCuenta =
  DiarioAlmacenesReportResponse["data"]["meses"][number]["cuentasHaber"][number];
type ReportDiarioSector =
  DiarioAlmacenesReportResponse["data"]["meses"][number]["sectoresHaber"][number];

function diarioSectorLineas(sector: ReportDiarioSector) {
  const centroCostos = sector.centroCostos ?? [];
  const funcionGastos = sector.funcionGastos ?? [];
  const desdeCentros = centroCostos.flatMap((centroCosto) =>
    (centroCosto.subCuentas ?? []).map((subCuenta) => ({
      centroCostoCodigo: centroCosto.centroCostoCodigo ?? "",
      centroCostoNombre: centroCosto.centroCostoNombre ?? "",
      funcionGastoCodigo: subCuenta.funcionGastoCodigo ?? "",
      funcionGastoNombre: subCuenta.funcionGastoNombre ?? centroCosto.centroCostoNombre ?? "",
      totalBs: subCuenta.totalBs
    }))
  );
  if (desdeCentros.length) return desdeCentros;
  return funcionGastos.map((funcionGasto) => ({
    centroCostoCodigo: "",
    centroCostoNombre: "",
    funcionGastoCodigo: funcionGasto.codigo ?? "",
    funcionGastoNombre: funcionGasto.nombre ?? "",
    totalBs: funcionGasto.totalBs
  }));
}

function diarioSectoresToReportCuentas(sectores: ReportDiarioSector[]): ReportDiarioCuenta[] {
  return sectores.map((sector) => ({
    codigoCompleto: sector.sectorCodigo,
    centroCostoCodigo: sector.centroCostos?.[0]?.centroCostoCodigo ?? null,
    centroCostoNombre: sector.centroCostos?.[0]?.centroCostoNombre ?? null,
    sectorCodigo: sector.sectorCodigo,
    sectorNombre: sector.sectorNombre,
    esTransporte: true,
    totalBs: sector.totalBs,
    totalCantidad: undefined,
    subCentros: [],
    funcionGastos: [],
    lineas: diarioSectorLineas(sector).map((linea) => ({
      subCentro: linea.funcionGastoCodigo,
      nombre: linea.funcionGastoNombre,
      funcionGastoCodigo: linea.funcionGastoCodigo,
      funcionGastoNombre: linea.funcionGastoNombre,
      importeBs: linea.totalBs,
      subCuentas: linea.centroCostoCodigo ? [linea.centroCostoCodigo] : []
    })),
    detalles: []
  }));
}

function reportMovimientoTitulo(cuenta: ReportDiarioCuenta) {
  return (cuenta.sectorNombre ?? reportCuentaTitulo(cuenta)).toUpperCase();
}

function reportMovimientoOrderValue(cuenta: ReportDiarioCuenta) {
  const code = reportCuentaLookupKey(cuenta.sectorCodigo ?? cuenta.codigoCompleto);
  const order = [
    "22001008",
    "35001000",
    "44002000",
    "22001010",
    "67001010",
    "22001009",
    "67001009",
    "100001000",
    "104001000"
  ];
  const index = order.indexOf(code);
  return index >= 0 ? index : order.length;
}

function reportMovimientoCargo(cuenta: ReportDiarioCuenta) {
  const code = reportCuentaLookupKey(cuenta.sectorCodigo ?? cuenta.codigoCompleto);
  if (code === "67001009") return "22 001 009";
  if (code === "67001010") return "22 001 010";
  return cuenta.sectorCodigo ?? cuenta.codigoCompleto;
}

function sortMovimientoCuentas(cuentas: ReportDiarioCuenta[]) {
  return [...cuentas].sort((a, b) => {
    const orderDiff = reportMovimientoOrderValue(a) - reportMovimientoOrderValue(b);
    if (orderDiff !== 0) return orderDiff;
    return (a.sectorNombre ?? "").localeCompare(b.sectorNombre ?? "", "es");
  });
}

function groupMovimientoCuentas(cuentas: ReportDiarioCuenta[]) {
  const grouped = new Map<string, ReportDiarioCuenta>();
  cuentas.forEach((cuenta) => {
    const key = reportCuentaLookupKey(cuenta.sectorCodigo ?? cuenta.codigoCompleto);
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { ...cuenta, lineas: [...cuenta.lineas] });
      return;
    }
    current.lineas.push(...cuenta.lineas);
  });
  return [...grouped.values()];
}

function isCostoProduccionCuenta(cuenta: ReportDiarioCuenta) {
  return reportCuentaLookupKey(cuenta.sectorCodigo ?? cuenta.codigoCompleto) === "100001000";
}

function sortCodeValue(value?: string | null) {
  const parsed = Number((value ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function movimientoLineasPorFuncion(cuenta: ReportDiarioCuenta) {
  return cuenta.lineas
    .map((linea) => ({
      codigo: linea.funcionGastoCodigo ?? linea.subCentro ?? "",
      nombre: linea.funcionGastoNombre ?? linea.nombre ?? "",
      importeBs: linea.importeBs
    }))
    .sort((a, b) => {
      const codeDiff = sortCodeValue(a.codigo) - sortCodeValue(b.codigo);
      if (codeDiff !== 0) return codeDiff;
      return a.nombre.localeCompare(b.nombre, "es");
    });
}

function reportSubCuentaDescripcion(subCuenta?: string) {
  if (subCuenta === "1804") return "COSTO MINA";
  if (subCuenta === "2801") return "MANTENIMIENTO";
  if (subCuenta === "3401") return "ADMINISTRACION";
  if (subCuenta === "3601") return "OBRAS EN CONSTRUCCION";
  if (subCuenta === "4401") return "MAQUINARIA Y EQUIPO";
  return "COSTO MINA";
}

function reportCuentaLookupKey(value?: string | null) {
  return (value ?? "").replace(/[^\d]/g, "");
}

function reportNameLookupKey(value?: string | null) {
  return `name:${(value ?? "").trim().toUpperCase()}`;
}

function reportDiarioSectorOrderValue(sector: ReportDiarioSector) {
  const order = [
    "100001000",
    "35001000",
    "22001008",
    "104001000",
    "44002000",
    "67001010",
    "67001009"
  ];
  const index = order.indexOf(reportCuentaLookupKey(sector.sectorCodigo));
  return index >= 0 ? index : order.length;
}

function sortDiarioSectores(sectores: ReportDiarioSector[]) {
  return sectores;
}

function shouldShowDiarioSectorDetails(sector: ReportDiarioSector) {
  return reportCuentaLookupKey(sector.sectorCodigo) === "100001000";
}

function reportDiarioDetalleCuenta(
  centroCostoCodigo?: string | null,
  funcionGastoCodigo?: string | null
) {
  return [centroCostoCodigo, funcionGastoCodigo].filter(Boolean).join("-");
}

function buildFuncionGastoLookup(value: unknown, lookup = new Map<string, string>()) {
  if (!value || typeof value !== "object") return lookup;
  if (Array.isArray(value)) {
    value.forEach((item) => buildFuncionGastoLookup(item, lookup));
    return lookup;
  }

  const record = value as Record<string, unknown>;
  const nombre = typeof record.funcionGastoNombre === "string" ? record.funcionGastoNombre : "";
  const codigo = typeof record.funcionGastoCodigo === "string" ? record.funcionGastoCodigo : "";
  const codigoCompleto = typeof record.codigoCompleto === "string" ? record.codigoCompleto : "";
  if (nombre) {
    if (codigoCompleto) lookup.set(reportCuentaLookupKey(codigoCompleto), nombre);
    if (codigo && !lookup.has(codigo)) lookup.set(codigo, nombre);
  }

  Object.values(record).forEach((item) => buildFuncionGastoLookup(item, lookup));
  return lookup;
}

function buildSectorCodigoLookup(
  value: unknown,
  lookup = new Map<string, string>(),
  currentSectorCodigo = ""
) {
  if (!value || typeof value !== "object") return lookup;
  if (Array.isArray(value)) {
    value.forEach((item) => buildSectorCodigoLookup(item, lookup, currentSectorCodigo));
    return lookup;
  }

  const record = value as Record<string, unknown>;
  const sectorCodigo =
    typeof record.sectorCodigo === "string" && record.sectorCodigo.trim()
      ? record.sectorCodigo
      : currentSectorCodigo;
  const sectorNombre = typeof record.sectorNombre === "string" ? record.sectorNombre : "";
  const codigoCompleto = typeof record.codigoCompleto === "string" ? record.codigoCompleto : "";

  if (sectorCodigo) {
    lookup.set(reportCuentaLookupKey(sectorCodigo), sectorCodigo);
    if (sectorNombre) lookup.set(reportNameLookupKey(sectorNombre), sectorCodigo);
    if (codigoCompleto) lookup.set(reportCuentaLookupKey(codigoCompleto), sectorCodigo);
  }

  Object.values(record).forEach((item) => buildSectorCodigoLookup(item, lookup, sectorCodigo));
  return lookup;
}

function reportCuentaMayorKey(cuenta: ReportDiarioCuenta) {
  const code = (cuenta.codigoCompleto ?? "").replace(/[^\d]/g, "");
  if (code.includes("100001000")) return "100001000";
  if (code.includes("104001000")) return "104001000";
  if (code.includes("44002000") || code.includes("044002000")) return "44002000";
  if (code.includes("67001097")) return "67001097";
  if (code.includes("67001098")) return "67001098";
  return code || cuenta.codigoCompleto || cuenta.centroCostoNombre || "SIN-CUENTA";
}

function reportCuentaMayorCodigo(key: string) {
  if (key === "100001000") return "100,001,000";
  if (key === "104001000") return "104,001,000";
  if (key === "44002000") return "44,002,000";
  if (key === "67001097") return "67,001,097";
  if (key === "67001098") return "67,001,098";
  return key;
}

function normalizeReportCuentas(
  cuentas: ReportDiarioCuenta[],
  funcionLookup = new Map<string, string>(),
  sectorLookup = new Map<string, string>()
): ReportDiarioCuenta[] {
  const grouped = new Map<string, ReportDiarioCuenta>();
  for (const cuenta of cuentas) {
    const key = reportCuentaMayorKey(cuenta);
    const current = grouped.get(key);
    const parts = (cuenta.codigoCompleto ?? "").match(/\d+/g) ?? [];
    const funcionNombre =
      funcionLookup.get(reportCuentaLookupKey(cuenta.codigoCompleto)) ??
      funcionLookup.get(parts[1] ?? "");
    const sectorCodigo =
      cuenta.sectorCodigo ??
      sectorLookup.get(reportCuentaLookupKey(cuenta.codigoCompleto)) ??
      sectorLookup.get(reportNameLookupKey(cuenta.sectorNombre)) ??
      sectorLookup.get(key) ??
      "";
    const fallbackLinea =
      cuenta.lineas.length === 0 && key === "100001000" && parts.length >= 3
        ? [
            {
              subCentro: parts[1] ?? "",
              nombre: funcionNombre ?? reportSubCuentaDescripcion(parts[0]),
              importeBs: cuenta.totalBs,
              subCuentas: parts[0] ? [parts[0]] : []
            }
          ]
        : [];
    const lineas = cuenta.lineas.length
      ? cuenta.lineas.map((linea) => ({
          ...linea,
          nombre: linea.funcionGastoNombre ?? linea.nombre ?? ""
        }))
      : fallbackLinea;

    if (!current) {
      grouped.set(key, {
        ...cuenta,
        codigoCompleto: reportCuentaMayorCodigo(key),
        sectorCodigo,
        esTransporte: key === "67001097" || key === "67001098",
        totalBs: cuenta.totalBs,
        lineas: [...lineas]
      });
      continue;
    }
    if (!current.sectorCodigo && sectorCodigo) current.sectorCodigo = sectorCodigo;
    current.lineas.push(...lineas);
  }
  return [...grouped.values()];
}

function DiarioAlmacenesPreview({ response }: { response: DiarioAlmacenesReportResponse }) {
  const periodo = response.data.meses[0];
  if (!periodo) return null;
  const month = movimientoMonthLabel(periodo.anio, periodo.mes);
  const rows: Array<{
    key: string;
    descripcion: string;
    centroCosto?: string;
    funcionGasto?: string;
    parcial?: number | "";
    cuenta?: string;
    debe?: number | "";
    haber?: number | "";
    strong?: boolean;
  }> = [
    { key: "conta", descripcion: "CONTABILIZACION DIARIO ALMACENES MES:", strong: true },
    { key: "mes", descripcion: `${month}-${periodo.anio}`, strong: true }
  ];

  if (periodo.sectoresHaber.length) {
    sortDiarioSectores(periodo.sectoresHaber).forEach((sector, sectorIndex) => {
      const showDetails = shouldShowDiarioSectorDetails(sector);
      rows.push({
        key: `sector-${sectorIndex}`,
        descripcion: (sector.sectorNombre ?? "SIN SECTOR").toUpperCase(),
        cuenta: sector.sectorCodigo ?? "",
        debe: showDetails ? sector.totalBs : "",
        strong: true
      });
      rows.push({
        key: `atencion-${sectorIndex}`,
        descripcion: `Aten. Material mes de ${month}- ${periodo.anio}`,
        parcial: showDetails ? "" : sector.totalBs,
        debe: showDetails ? "" : sector.totalBs
      });

      if (showDetails) {
        const sectorDigits = (sector.sectorCodigo ?? "").replace(/[^\d]/g, "");
        const sectorCuentas = periodo.cuentasHaber
          .filter(c => sectorDigits && (c.codigoCompleto ?? "").replace(/[^\d]/g, "").includes(sectorDigits))
          .sort((a, b) => (a.codigoCompleto ?? "").localeCompare(b.codigoCompleto ?? ""));

        if (sectorCuentas.length) {
          sectorCuentas.forEach((cuenta, ci) => {
            cuenta.lineas.forEach((linea, li) => {
              const funcionGastoCodigo = linea.subCentro ?? linea.funcionGastoCodigo ?? "";
              const descripcion = linea.nombre ?? linea.funcionGastoNombre ?? "";
              rows.push({
                key: `linea-sector-${sectorIndex}-${ci}-${li}`,
                descripcion,
                centroCosto: cuenta.centroCostoCodigo ?? "",
                funcionGasto: funcionGastoCodigo,
                parcial: linea.importeBs,
                cuenta: reportDiarioDetalleCuenta(cuenta.centroCostoCodigo, funcionGastoCodigo)
              });
            });
          });
        } else {
          diarioSectorLineas(sector).forEach((linea, lineIndex) => {
            rows.push({
              key: `linea-sector-${sectorIndex}-${lineIndex}`,
              descripcion: linea.funcionGastoNombre,
              centroCosto: linea.centroCostoCodigo,
              funcionGasto: linea.funcionGastoCodigo,
              parcial: linea.totalBs,
              cuenta: reportDiarioDetalleCuenta(linea.centroCostoCodigo, linea.funcionGastoCodigo)
            });
          });
        }
      }
    });
  } else {
    const funcionLookup = buildFuncionGastoLookup(periodo.sectoresHaber);
    const sectorLookup = buildSectorCodigoLookup(periodo.sectoresHaber);

    normalizeReportCuentas(periodo.cuentasHaber, funcionLookup, sectorLookup).forEach(
      (cuenta, cuentaIndex) => {
        rows.push({
          key: `cuenta-${cuentaIndex}`,
          descripcion: reportCuentaTitulo(cuenta),
          cuenta: reportCuentaDisplay(cuenta.codigoCompleto),
          debe: cuenta.totalBs,
          strong: true
        });
        rows.push({
          key: `atencion-${cuentaIndex}`,
          descripcion: `Aten. Material mes de ${month}- ${periodo.anio}`,
          parcial: cuenta.esTransporte ? cuenta.totalBs : "",
          debe: cuenta.esTransporte ? cuenta.totalBs : ""
        });
        cuenta.lineas.forEach((linea, index) => {
          rows.push({
            key: `linea-${cuentaIndex}-${index}`,
            descripcion: linea.nombre ?? "",
            parcial: linea.importeBs,
            cuenta: reportLineaCuenta(linea)
          });
        });
      }
    );
  }

  rows.push({
    key: "inventario-haber",
    descripcion: "INVENTARIO MATERIALES Y SUMINISTROS",
    cuenta: "26.002.000",
    haber: periodo.totalSalidasHaber,
    strong: true
  });
  rows.push({ key: "segun-vales", descripcion: "Según Vales Salida Materiales" });
  rows.push({
    key: "total",
    descripcion: "",
    debe: periodo.totalSalidasHaber,
    haber: periodo.totalSalidasHaber
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px] bg-white p-4 font-[Arial] text-black">
        <div className="text-center text-[13px] font-bold underline">
          COMPROBANTE&nbsp;&nbsp; DE&nbsp;&nbsp; DIARIO
        </div>
        <div className="text-center text-[16px] font-bold">DIARIO&nbsp;&nbsp; ALMACENES</div>
        <div className="grid grid-cols-2 text-[12px]">
          <span>
            SECTOR: <strong className="italic">LIPEÑA</strong>
          </span>
          <span className="font-bold">
            MES:&nbsp; DE {month}&nbsp; {periodo.anio}
          </span>
        </div>
        <table className="mt-2 w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 text-left">D E S C R I P C I O N</th>
              <th className="border border-black px-1 py-1 text-center">
                CENTRO
                <br />
                DE COSTO
              </th>
              <th className="border border-black px-1 py-1 text-center">
                FUNCION
                <br />
                DEL GASTO
              </th>
              <th className="border border-black px-1 py-1 text-right">
                PARCIALES
                <br />
                Bs.
              </th>
              <th className="border border-black px-1 py-1 text-center">
                No&nbsp;&nbsp; DE&nbsp;&nbsp; CUENTA
              </th>
              <th className="border border-black px-1 py-1 text-right">
                BOLIVIANOS
                <br />D E B E
              </th>
              <th className="border border-black px-1 py-1 text-right">H A B E R</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td
                  className={`border border-black px-1 py-0.5 ${row.strong ? "font-bold underline" : ""}`}
                >
                  {row.descripcion}
                </td>
                <td className="border border-black px-1 py-0.5 text-center">
                  {row.centroCosto ?? ""}
                </td>
                <td className="border border-black px-1 py-0.5 text-center">
                  {row.funcionGasto ?? ""}
                </td>
                <td className="border border-black px-1 py-0.5 text-right">
                  {formatBs(row.parcial || undefined)}
                </td>
                <td
                  className={`border border-black px-1 py-0.5 text-center ${row.strong ? "font-bold" : ""}`}
                >
                  {row.cuenta ?? ""}
                </td>
                <td className="border border-black px-1 py-0.5 text-right">
                  {formatBs(row.debe || undefined)}
                </td>
                <td className="border border-black px-1 py-0.5 text-right">
                  {formatBs(row.haber || undefined)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MovimientoAlmacenPreview({ response }: { response: DiarioAlmacenesReportResponse }) {
  const periodo = response.data.meses[0];
  if (!periodo) return null;
  const month = movimientoMonthLabel(periodo.anio, periodo.mes);
  const monthLower = month.toLowerCase();
  const saldoFinal = periodo.saldoInventarioFinal ?? periodo.saldoFinal;
  const rows: Array<{
    key: string;
    cargo?: string | null;
    descripcion: string;
    bs?: number | "";
    debe?: number | "";
    haber?: number | "";
    strong?: boolean;
  }> = [
    {
      key: "inventario",
      cargo: "26 002 000",
      descripcion: "INVENTARIO MATERIAL Y SUMIN. LIPEÑA",
      debe: periodo.totalInventarioDebe,
      strong: true
    },
    {
      key: "saldo",
      descripcion: `Saldo inventario al ${previousMonthEnd(periodo.anio, periodo.mes)}`,
      bs: periodo.saldoInventarioAnterior
    },
    {
      key: "compras",
      descripcion: `Cuadro Mat.y Sumin. Lipeña mes ${monthLower} de ${periodo.anio}`,
      bs: periodo.comprasSinIva ?? periodo.comprasImporteBs
    },
    {
      key: "liquidacion-provisional",
      cargo: "87 002 000",
      descripcion: "LIQUIDACION PROVISIONAL MATERIAL LIPEÑA",
      haber: 0,
      strong: true
    },
    {
      key: "liquidacion-provisional-detalle",
      descripcion: `Liquidacion Prov. Mat. Recibidos mes ${monthLower} de ${periodo.anio}`
    },
    {
      key: "inventario-cancelacion",
      cargo: "26 002 000",
      descripcion: "INVENTARIO MATERIAL Y SUMIN. LIPEÑA",
      strong: true
    },
    {
      key: "inventario-cancelacion-detalle",
      descripcion: "Cancelacion Liq. Provisional por Uf. Sig. anexos"
    }
  ];

  sortMovimientoCuentas(diarioSectoresToReportCuentas(periodo.sectoresHaber)).forEach((cuenta, cuentaIndex) => {
    const isCostoProduccion = isCostoProduccionCuenta(cuenta);
    rows.push({
      key: `cuenta-${cuentaIndex}`,
      cargo: reportMovimientoCargo(cuenta),
      descripcion: reportMovimientoTitulo(cuenta),
      bs: isCostoProduccion ? "" : cuenta.totalBs,
      haber: isCostoProduccion ? "" : cuenta.totalBs,
      strong: true
    });
    rows.push({
      key: `atencion-${cuentaIndex}`,
      descripcion: `Aten. Material mes de ${month}- ${periodo.anio}`,
      haber: isCostoProduccion ? cuenta.totalBs : ""
    });
    const lineas = isCostoProduccion ? movimientoLineasPorFuncion(cuenta) : [];
    if (lineas.length) {
      lineas.forEach((linea, index) => {
        rows.push({
          key: `linea-${cuentaIndex}-${index}`,
          descripcion: `${linea.codigo} - ${linea.nombre}`.trim(),
          bs: linea.importeBs
        });
      });
    }
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px] bg-white p-4 font-[Arial] text-black">
        <div className="text-[11px] font-bold">Empresa Minera</div>
        <div className="text-[11px] font-bold underline">MARTE S.R.L.</div>
        <div className="text-[11px]">LIPEÑA</div>
        <div className="mt-4 text-center text-[12px] underline">ALMACEN GENERAL LIPEÑA</div>
        <div className="text-center text-[12px] underline">
          MOVIMIENTO ALMACENES CORRESPONDIENTE MES DE {month} DE {periodo.anio}
        </div>
        <table className="mt-2 w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 text-left">C A R G O</th>
              <th className="border border-black px-1 py-1 text-left">D E S C R I P C I O N</th>
              <th className="border border-black px-1 py-1 text-right">Bs</th>
              <th className="border border-black px-1 py-1 text-right">
                DEBE
                <br />
                Bs.
              </th>
              <th className="border border-black px-1 py-1 text-right">
                HABER
                <br />
                Bs.
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="border border-black px-1 py-0.5 align-top">{row.cargo ?? ""}</td>
                <td
                  className={`border border-black px-1 py-0.5 align-top ${row.strong ? "font-bold underline" : ""}`}
                >
                  {row.descripcion}
                </td>
                <td className="border border-black px-1 py-0.5 text-right align-top">
                  {formatBs(row.bs === "" ? undefined : row.bs)}
                </td>
                <td className="border border-black px-1 py-0.5 text-right align-top">
                  {formatBs(row.debe === "" ? undefined : row.debe)}
                </td>
                <td className="border border-black px-1 py-0.5 text-right align-top">
                  {formatBs(row.haber === "" ? undefined : row.haber)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="px-1 py-0.5" colSpan={3}></td>
              <td className="border border-black px-1 py-0.5 text-right">
                {formatBs(periodo.totalInventarioDebe)}
              </td>
              <td className="border border-black px-1 py-0.5 text-right">
                {formatBs(periodo.totalSalidasHaber)}
              </td>
            </tr>
            <tr>
              <td className="px-1 py-0.5" colSpan={3}>
                saldo al {new Date(periodo.anio, periodo.mes, 0).getDate()} de {monthLower} de{" "}
                {periodo.anio}
              </td>
              <td className="border border-black px-1 py-0.5"></td>
              <td className="border border-black px-1 py-0.5 text-right">{formatBs(saldoFinal)}</td>
            </tr>
            <tr>
              <td className="px-1 py-0.5" colSpan={3}></td>
              <td className="border border-black px-1 py-0.5 text-right">
                {formatBs(periodo.totalInventarioDebe)}
              </td>
              <td className="border border-black px-1 py-0.5 text-right">
                {formatBs(periodo.totalInventarioDebe)}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mt-20 grid grid-cols-3 text-center text-[10px] font-bold">
          <span>JEFE DE ALMACEN</span>
          <span>JEFE DE OFICINAS</span>
          <span>SUPDTE. GENERAL</span>
        </div>
      </div>
    </div>
  );
}

type CostoPeriodo = DetalleMaterialesReportResponse["data"]["meses"][number];
type CostoCuenta = CostoPeriodo["porCuenta"][number];
type CostoSheet = {
  name: string;
  title: string;
  codeLine: string;
  isTransport: boolean;
  anio: number;
  mes: number;
  totalBs: number;
  totalCantidad?: number;
  summaryLabel?: string;
  summaryDestinatario?: string;
  lineas: CostoCuenta["lineas"];
  detalles: CostoCuenta["detalles"];
};

function costoSheetName(cuenta: {
  codigoCompleto?: string | null;
  centroCostoNombre?: string | null;
  funcionGastoNombre?: string | null;
  vehiculo?: string | null;
  esTransporte?: boolean;
}) {
  const code = (cuenta.codigoCompleto ?? "").replace(/[^\d]/g, "");
  const text =
    `${cuenta.centroCostoNombre ?? ""} ${cuenta.funcionGastoNombre ?? ""} ${cuenta.vehiculo ?? ""}`.toUpperCase();
  if (code.includes("22001008") || text.includes("TRANSPORTISTAS VARIOS") || text.includes("TRANSPORTE VARIOS"))
    return "DETALLE TRANSPORTE";
  if (code.includes("67001009") || code.includes("22001009") || text.includes("EMUSA")) return "EMUSA";
  if (code.includes("67001010") || code.includes("22001010") || text.includes("PUNTUALIDAD"))
    return "PUNTUALIDAD";
  if (code.includes("35001000") || text.includes("MAQUINARIAS")) return "MAQUINARIA Y EQUIPO";
  if (code.includes("104001000") || text.includes("MEDIO AMBIENTE") || text.includes("M.A."))
    return "MA-HSI (3)";
  if (code.includes("44002000") || code.includes("044002000") || text.includes("CONSTRUCCION"))
    return "CONSTRUCCION-25";
  return "LIPEÑA";
}

function costoSheetMeta(sheetName: string) {
  if (sheetName === "DETALLE TRANSPORTE") {
    return {
      title: "DETALLE DE MATERIALES  TRANSPORTE VARIO COMBUSTIBLE",
      codeLine: "22,001,008    CTAS.CTES.TRANSPORTE VARIOS COMBUSTIBLE",
      isTransport: true
    };
  }
  if (sheetName === "MAQUINARIA Y EQUIPO") {
    return {
      title: "DETALLE DE MATERIALES  MAQUINARIAS Y EQUIPOS LIPEÑA",
      codeLine: "35,001,000    CTAS.CTES.MAQUINARIAS Y EQUIPOS LIPEÑA",
      isTransport: true
    };
  }
  if (sheetName === "MA-HSI (3)") {
    return {
      title: "DETALLE DE MATERIALES  COSTO DE MEDIO AMBIENTE",
      codeLine: "104,001,000 CTAS.CTES.M.A. HSI.",
      isTransport: false
    };
  }
  if (sheetName === "CONSTRUCCION-25") {
    return {
      title: "DETALLE DE MATERIALES  COSTO DE OBRAS EN CONSTRUCCION",
      codeLine: "44,002,000 CTAS.CTES.OBRAS EN CONSTRUCCION",
      isTransport: false
    };
  }
  if (sheetName === "OBRAS EN CONSTRUCCION") {
    return {
      title: "DETALLE DE MATERIALES  OBRAS EN CONSTRUCCION LIPEÑA",
      codeLine: "44,002,000    CTAS.CTES.OBRAS EN CONSTRUCCION LIPEÑA",
      isTransport: true
    };
  }
  if (sheetName === "PUNTUALIDAD") {
    return {
      title: "DETALLE DE MATERIALES  COSTO DE TRANSPORTE PUNTUALIDAD",
      codeLine: "67,001,097    CTAS.CTES.TRANSPORTE PUNTUALIDAD",
      isTransport: true
    };
  }
  if (sheetName === "EMUSA") {
    return {
      title: "DETALLE DE MATERIALES  COSTO DE TRANSPORTE EMUSA",
      codeLine: "67,001,098    CTAS.CTES.TRANSPORTE EMUSA",
      isTransport: true
    };
  }
  return {
    title: "DETALLE DE MATERIALES  COSTO DE PRODUCCION",
    codeLine: "",
    isTransport: false
  };
}

function costoAccountParts(value?: string | null) {
  const parts = (value ?? "").match(/\d+/g) ?? [];
  return { subCuenta: parts[0] ?? "", subCentro: parts[1] ?? "" };
}

function costoDetalleResumenLabel(cuenta: CostoCuenta) {
  return (
    cuenta.lineas.find((linea) => Boolean(linea.subCentroNombre))?.subCentroNombre ??
    cuenta.funcionGastoNombre ??
    cuenta.centroCostoNombre ??
    ""
  ).toUpperCase();
}

function costoDetalleResumenDestinatario(cuenta: CostoCuenta) {
  return (
    cuenta.funcionGastoNombre ??
    cuenta.centroCostoNombre ??
    cuenta.vehiculo ??
    ""
  ).toUpperCase();
}

function normalizeAccountCode(value?: string | null) {
  return (value ?? "").replace(/[^\d]/g, "");
}

function belongsToCostoProduccionDetalle(cuenta: {
  codigoCompleto?: string | null;
  sectorCodigo?: string | null;
  centroCostoNombre?: string | null;
  funcionGastoNombre?: string | null;
  sectorNombre?: string | null;
  vehiculo?: string | null;
}) {
  const sheetName = costoSheetName({
    codigoCompleto: cuenta.sectorCodigo ?? cuenta.codigoCompleto,
    centroCostoNombre: cuenta.sectorNombre ?? cuenta.centroCostoNombre,
    funcionGastoNombre: cuenta.funcionGastoNombre,
    vehiculo: cuenta.vehiculo ?? cuenta.sectorNombre
  });
  if (sheetName !== "LIPEÑA") return true;
  return normalizeAccountCode(cuenta.sectorCodigo ?? cuenta.codigoCompleto).includes("100001000");
}

function sectorMatchesCuenta(sector: ReportDiarioSector, cuenta: ReportDiarioCuenta) {
  const sectorCode = normalizeAccountCode(sector.sectorCodigo);
  const cuentaSectorCode = normalizeAccountCode(cuenta.sectorCodigo);
  const cuentaCode = normalizeAccountCode(cuenta.codigoCompleto);
  if (sectorCode && (cuentaSectorCode === sectorCode || cuentaCode.endsWith(sectorCode))) return true;
  return Boolean(
    sector.sectorNombre &&
      cuenta.sectorNombre &&
      sector.sectorNombre.trim().toUpperCase() === cuenta.sectorNombre.trim().toUpperCase()
  );
}

function costoLineasFromCuentaHaber(
  cuenta: ReportDiarioCuenta,
  funcionNombreLookup: Map<string, string>
) {
  if (cuenta.lineas.length) {
    return cuenta.lineas.map((linea) => ({
      subCuenta: linea.subCuentas.join("-") || cuenta.centroCostoCodigo || "",
      subCentro: linea.funcionGastoCodigo ?? linea.subCentro ?? "",
      subCentroNombre: linea.funcionGastoNombre ?? linea.nombre ?? "",
      importeBs: linea.importeBs
    }));
  }
  const parts = cuenta.codigoCompleto?.match(/\d+/g) ?? [];
  const subCuenta = cuenta.centroCostoCodigo ?? parts[0] ?? "";
  const subCentro = parts[1] ?? "";
  return [
    {
      subCuenta,
      subCentro,
      subCentroNombre: funcionNombreLookup.get(subCentro) ?? cuenta.centroCostoNombre ?? "",
      importeBs: cuenta.totalBs
    }
  ];
}

function detalleMaterialesFromDiario(
  response: DiarioAlmacenesReportResponse
): DetalleMaterialesReportResponse {
  return {
    success: response.success,
    data: {
      anioInicio: response.data.anioInicio,
      mesInicio: response.data.mesInicio,
      anioFin: response.data.anioFin,
      mesFin: response.data.mesFin,
      meses: response.data.meses.map((periodo) => {
        const lineas: CostoCuenta["lineas"] = [];
        const subtotalesPorSubCentro: Array<{ subCentro: string; nombre: string; importeBs: number }> = [];
        const porCuenta = periodo.sectoresHaber
          .filter(belongsToCostoProduccionDetalle)
          .map((sector) => {
            const cuentaLineas: CostoCuenta["lineas"] = [];
            const detalles: CostoCuenta["detalles"] = [];
            const detallesDesdeVales =
              sector.vales?.flatMap((vale) =>
                (vale.lineas ?? []).map((linea) => ({
                  productoNombre: linea.nombre ?? "",
                  unidad: linea.unidad ?? "",
                  cantidad: linea.cantidad ?? 0,
                  importeBs: vale.totalBs ?? linea.importeBs ?? 0,
                  vehiculo: vale.solicitante?.nombre ?? ""
                }))
              ) ?? [];
            const detallesDesdeEndpoint =
              sector.detalles?.map((detalle) => ({
                productoNombre: detalle.productoNombre ?? "",
                unidad: detalle.unidad ?? "",
                cantidad: detalle.cantidad ?? 0,
                importeBs: detalle.importeBs ?? 0,
                vehiculo: detalle.vehiculo ?? detalle.destino ?? sector.sectorNombre ?? ""
              })) ?? [];
            const detallesExplicitos = detallesDesdeVales.length
              ? detallesDesdeVales
              : detallesDesdeEndpoint;
            const funcionNombreLookup = new Map(
              diarioSectorLineas(sector).map((linea) => [
                linea.funcionGastoCodigo,
                linea.funcionGastoNombre
              ])
            );
            const detalleLineas = periodo.cuentasHaber
              .filter((cuenta) => sectorMatchesCuenta(sector, cuenta))
              .flatMap((cuenta) => costoLineasFromCuentaHaber(cuenta, funcionNombreLookup));
            const sectorLineas = detalleLineas.length
              ? detalleLineas
              : diarioSectorLineas(sector).map((linea) => ({
                  subCuenta: linea.centroCostoCodigo,
                  subCentro: linea.funcionGastoCodigo,
                  subCentroNombre: linea.funcionGastoNombre,
                  importeBs: linea.totalBs
                }));

            for (const linea of sectorLineas) {
              const importeBs = Number(linea.importeBs ?? 0);
              cuentaLineas.push(linea);
              lineas.push(linea);
              subtotalesPorSubCentro.push({
                subCentro: linea.subCentro,
                nombre: linea.subCentroNombre ?? "",
                importeBs
              });
              if (!detallesExplicitos.length) {
                detalles.push({
                  productoNombre:
                    linea.subCentroNombre ??
                    sector.sectorNombre ??
                    "",
                  unidad: "",
                  cantidad: 0,
                  importeBs,
                  vehiculo: sector.sectorNombre ?? ""
                });
              }
            }
            if (detallesExplicitos.length) detalles.push(...detallesExplicitos);
            return {
              codigoCompleto: sector.sectorCodigo ?? "",
              centroCostoCodigo: sector.sectorCodigo ?? "",
              centroCostoNombre: sector.sectorNombre ?? "",
              funcionGastoCodigo: "",
              funcionGastoNombre: sector.sectorNombre ?? "",
              vehiculo: sector.sectorNombre ?? "",
              esTransporte: costoSheetMeta(
                costoSheetName({
                  codigoCompleto: sector.sectorCodigo,
                  centroCostoNombre: sector.sectorNombre,
                  funcionGastoNombre: sector.sectorNombre,
                  vehiculo: sector.sectorNombre
                })
              ).isTransport,
              totalBs: sector.totalBs,
              totalCantidad: detalles.length
                ? detalles.reduce((sum, detalle) => sum + (detalle.cantidad ?? 0), 0)
                : undefined,
              lineas: cuentaLineas,
              detalles
            };
          });

        return {
          anio: periodo.anio,
          mes: periodo.mes,
          esCerrado: periodo.esCerrado,
          lineas,
          subtotalesPorSubCentro,
          totalGeneral: periodo.totalSalidasHaber,
          porCuenta
        };
      })
    }
  };
}

function groupCostoLineas(lineas: CostoCuenta["lineas"]): CostoCuenta["lineas"] {
  return [...lineas].sort((a, b) => {
    const subCentroDiff = sortCodeValue(a.subCentro) - sortCodeValue(b.subCentro);
    if (subCentroDiff !== 0) return subCentroDiff;
    const subCuentaDiff = sortCodeValue(a.subCuenta) - sortCodeValue(b.subCuenta);
    if (subCuentaDiff !== 0) return subCuentaDiff;
    return (a.subCentroNombre ?? "").localeCompare(b.subCentroNombre ?? "", "es");
  });
}

function costoMonthPhrase(anio: number, mes: number) {
  const month = movimientoMonthLabel(anio, mes);
  return `EL MES "${month}" ${String(anio).replace(/^(\d)(\d{3})$/, "$1.$2")}`;
}

function costoMonthTitle(anio: number, mes: number) {
  const month = movimientoMonthLabel(anio, mes).toLowerCase();
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${anio}`;
}

function buildCostoSheets(response: DetalleMaterialesReportResponse): CostoSheet[] {
  const sheets = new Map<string, CostoSheet>();
  const periodo = response.data.meses[0];
  if (!periodo) return [];
  const cuentas = periodo.porCuenta.length
    ? periodo.porCuenta
    : [
        {
          codigoCompleto: "100 001 000",
          centroCostoCodigo: "",
          centroCostoNombre: "Costo de produccion",
          funcionGastoCodigo: "",
          funcionGastoNombre: "Produccion",
          vehiculo: null,
          esTransporte: false,
          totalBs: periodo.totalGeneral,
          totalCantidad: undefined,
          lineas: periodo.lineas,
          detalles: []
        }
      ];

  for (const cuenta of cuentas) {
    const name = costoSheetName(cuenta);
    const meta = costoSheetMeta(name);
    const current = sheets.get(name);
    const sheet =
      current ??
      ({
        name,
        ...meta,
        anio: periodo.anio,
        mes: periodo.mes,
        totalBs: cuenta.totalBs,
        totalCantidad: cuenta.totalCantidad,
        summaryLabel: costoDetalleResumenLabel(cuenta),
        summaryDestinatario: costoDetalleResumenDestinatario(cuenta),
        lineas: [],
        detalles: []
      } satisfies CostoSheet);
    if (meta.isTransport) {
      sheet.detalles.push(...cuenta.detalles);
    } else {
      sheet.lineas.push(...cuenta.lineas);
      if (!cuenta.lineas.length && cuenta.detalles.length) {
        const parts = costoAccountParts(cuenta.codigoCompleto);
        cuenta.detalles.forEach((detalle) => {
          sheet.lineas.push({
            subCuenta: parts.subCuenta,
            subCentro: parts.subCentro,
            subCentroNombre:
              cuenta.funcionGastoNombre ?? cuenta.centroCostoNombre ?? detalle.vehiculo ?? detalle.destino ?? "",
            importeBs: detalle.importeBs
          });
        });
      }
    }
    sheets.set(name, sheet);

    if (name === "CONSTRUCCION-25" && cuenta.detalles.length) {
      const detailName = "OBRAS EN CONSTRUCCION";
      const detailMeta = costoSheetMeta(detailName);
      const detailSheet =
        sheets.get(detailName) ??
        ({
          name: detailName,
          ...detailMeta,
          anio: periodo.anio,
          mes: periodo.mes,
          totalBs: cuenta.totalBs,
          totalCantidad: cuenta.totalCantidad,
          summaryLabel: costoDetalleResumenLabel(cuenta),
          summaryDestinatario: costoDetalleResumenDestinatario(cuenta),
          lineas: [],
          detalles: []
        } satisfies CostoSheet);
      detailSheet.detalles.push(...cuenta.detalles);
      sheets.set(detailName, detailSheet);
    }
  }

  const order = [
    "LIPEÑA",
    "MA-HSI (3)",
    "CONSTRUCCION-25",
    "PUNTUALIDAD",
    "EMUSA",
    "OBRAS EN CONSTRUCCION",
    "MAQUINARIA Y EQUIPO",
    "DETALLE TRANSPORTE"
  ];
  const orderedSheets = order
    .map((name) => sheets.get(name))
    .filter((sheet): sheet is CostoSheet => Boolean(sheet));
  const remainingSheets = [...sheets.values()].filter((sheet) => !order.includes(sheet.name));
  return [...orderedSheets, ...remainingSheets];
}

function CostoProduccionPreview({ response }: { response: DetalleMaterialesReportResponse }) {
  const sheets = useMemo(() => buildCostoSheets(response), [response]);
  const [activeName, setActiveName] = useState("");
  const activeSheet = sheets.find((sheet) => sheet.name === activeName) ?? sheets[0];

  useEffect(() => {
    if (!sheets.length) return;
    if (!sheets.some((sheet) => sheet.name === activeName)) setActiveName(sheets[0].name);
  }, [activeName, sheets]);

  if (!activeSheet) {
    return (
      <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-4 py-3 text-sm text-[var(--color-on-surface-variant)]">
        Sin datos para costo de produccion.
      </div>
    );
  }

  const isMain = activeSheet.name === "LIPEÑA";
  const headerRowOffset = isMain ? "mt-5" : "mt-20";
  const groupedLineas = groupCostoLineas(activeSheet.lineas);
  const totalsBySubCentro = new Map<string, number>();
  groupedLineas.forEach((linea) => {
    const key = linea.subCentro ?? "";
    totalsBySubCentro.set(key, (totalsBySubCentro.get(key) ?? 0) + linea.importeBs);
  });
  const lastIndexBySubCentro = new Map<string, number>();
  groupedLineas.forEach((linea, index) => lastIndexBySubCentro.set(linea.subCentro ?? "", index));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {sheets.map((sheet) => (
          <button
            key={sheet.name}
            type="button"
            onClick={() => setActiveName(sheet.name)}
            className={`rounded-md border px-3 py-1.5 text-xs font-bold ${
              sheet.name === activeSheet.name
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/14 text-[var(--color-primary)]"
                : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]"
            }`}
          >
            {sheet.name}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border-soft)] bg-white">
        <div className="min-w-[920px] p-5 font-[Arial] text-black">
          <div className={`${isMain ? "" : "mt-4"} text-[16px] font-bold`}>Empresa Minera</div>
          <div className="text-[24px] font-bold underline">MARTE S.R.L.</div>
          <div className={`${headerRowOffset} text-center font-bold underline`}>
            {activeSheet.title}
          </div>
          <div className="text-center text-sm font-bold">
            LIPEÑA&nbsp;&nbsp;&nbsp;&nbsp;{costoMonthPhrase(activeSheet.anio, activeSheet.mes)}
          </div>
          {activeSheet.codeLine ? (
            <div className="mt-5 text-center text-[16px]">{activeSheet.codeLine}</div>
          ) : null}

          {activeSheet.isTransport ? (
            <>
              <p className="mt-12 max-w-[760px] text-[14px]">
                Por lo siguiente: Por la provision de materiales de acuerdo al siguiente detalle
                correspondiente al
                <br />
                mes de&nbsp;&nbsp;&nbsp;&nbsp;{costoMonthTitle(activeSheet.anio, activeSheet.mes)}
              </p>
              <table className="mt-4 w-[640px] border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th className="border border-black px-1 py-1 italic">DETALLE</th>
                    <th className="border border-black px-1 py-1 italic">UNIDAD</th>
                    <th className="border border-black px-1 py-1 italic">CANTIDAD</th>
                    <th className="border border-black px-1 py-1 italic">DEBE</th>
                    <th className="border border-black px-1 py-1">DESTINATARIO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-x border-black px-1 py-1" colSpan={5}>
                      ALAMACEN GENERAL LIPEÑA
                    </td>
                  </tr>
                  <tr>
                    <td className="border-x border-black py-4" colSpan={5}></td>
                  </tr>
                  <tr>
                    <td className="border-x border-black px-1 py-0.5 text-center">
                      {activeSheet.summaryLabel ?? ""}
                    </td>
                    <td className="border-x border-black px-1 py-0.5"></td>
                    <td className="border-x border-black px-1 py-0.5 text-right">
                      {activeSheet.totalCantidad != null ? formatBs(activeSheet.totalCantidad).replace(",00", "") : ""}
                    </td>
                    <td className="border-x border-black px-1 py-0.5 text-right">
                      {formatBs(activeSheet.totalBs)}
                    </td>
                    <td className="border-x border-black px-1 py-0.5">
                      {activeSheet.summaryDestinatario ?? ""}
                    </td>
                  </tr>
                  {activeSheet.detalles.map((detalle, index) => (
                    <tr key={`${detalle.productoNombre}-${index}`}>
                      <td className="border-x border-black px-1 py-0.5">
                        {detalle.productoNombre ?? ""}
                      </td>
                      <td className="border-x border-black px-1 py-0.5 text-center">
                        {detalle.unidad ?? ""}
                      </td>
                      <td className="border-x border-black px-1 py-0.5 text-right">
                        {formatBs(detalle.cantidad).replace(",00", "")}
                      </td>
                      <td className="border-x border-black px-1 py-0.5 text-right">
                        {formatBs(detalle.importeBs)}
                      </td>
                      <td className="border-x border-black px-1 py-0.5">
                        {detalle.vehiculo ?? detalle.destino ?? ""}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border-x border-black py-12" colSpan={5}></td>
                  </tr>
                  <tr>
                    <td className="border border-black px-1 py-1 text-center text-[16px]">TOTAL</td>
                    <td className="border border-black"></td>
                    <td className="border border-black px-1 py-1 text-right">
                      {activeSheet.totalCantidad
                        ? formatBs(activeSheet.totalCantidad).replace(",00", "")
                        : ""}
                    </td>
                    <td className="border border-black px-1 py-1 text-right">
                      {formatBs(activeSheet.totalBs)}
                    </td>
                    <td className="border border-black"></td>
                  </tr>
                </tbody>
              </table>
            </>
          ) : (
            <>
              <div className="mt-16 text-right text-xs">T-C. $us&nbsp;&nbsp;6,96</div>
              <table className="mt-1 w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th className="border-y border-black px-1 py-1 italic">
                      SUB
                      <br />
                      CUENTA
                    </th>
                    <th className="border-y border-black px-1 py-1 italic">
                      SUB
                      <br />
                      CENTRO
                    </th>
                    <th className="border-y border-black px-1 py-1"></th>
                    <th className="border-y border-black px-1 py-1 italic">
                      IMPORTE
                      <br />
                      Bs.
                    </th>
                    <th className="border-y border-black px-1 py-1"></th>
                    <th className="border-y border-black px-1 py-1"></th>
                    <th className="border-y border-black px-1 py-1 italic">
                      SUB TOTALES DE
                      <br />
                      FUNCION DEL GASTO&nbsp;&nbsp;Bs.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedLineas.map((linea, index) => {
                    const key = linea.subCentro ?? "";
                    return (
                      <tr key={`${linea.subCuenta}-${linea.subCentro}-${index}`}>
                        <td className="px-1 py-0.5 text-center">{linea.subCuenta ?? ""}</td>
                        <td className="px-1 py-0.5 text-center">{linea.subCentro ?? ""}</td>
                        <td></td>
                        <td className="px-1 py-0.5 text-right">{formatBs(linea.importeBs)}</td>
                        <td></td>
                        <td></td>
                        <td className="px-1 py-0.5 text-right">
                          {lastIndexBySubCentro.get(key) === index
                            ? formatBs(totalsBySubCentro.get(key) ?? linea.importeBs)
                            : ""}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="py-10" colSpan={7}></td>
                  </tr>
                  <tr>
                    <td className="border-t border-black" colSpan={3}></td>
                    <td className="border-t border-black px-1 py-1 text-right">
                      {formatBs(activeSheet.totalBs)}
                    </td>
                    <td colSpan={2}></td>
                    <td className="border-t border-black px-1 py-1 text-right">
                      {formatBs(activeSheet.totalBs)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-5" colSpan={7}></td>
                  </tr>
                  <tr>
                    <td colSpan={2}></td>
                    <td className="border-t border-black px-1 py-1 text-center">HOJA Nº 1</td>
                    <td className="border-t border-black px-1 py-1 text-right">
                      {formatBs(activeSheet.totalBs)}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                  <tr>
                    <td colSpan={2}></td>
                    <td className="border-b border-black px-1 py-1 text-center text-[16px]">
                      TOTAL
                    </td>
                    <td className="border-b border-black px-1 py-1 text-right">
                      {formatBs(activeSheet.totalBs)}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
          <div className="mt-28 grid grid-cols-3 text-center text-[11px] font-bold">
            <span>JEFE DE ALMACENES</span>
            <span>JEFE DE OFICINAS</span>
            <span>SUPDTE. GENERAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const REPORT_GROUPS = [
  {
    title: "Kardex",
    reports: LEGACY_REPORTS
  },
  {
    title: "Almacen mensual",
    reports: INVENTORY_REPORTS.filter((report) =>
      [
        "balance-mensual",
        "inventario-general",
        "saldos-iniciales",
        "inventarios-suministros",
        "entradas-almacen",
        "salidas-almacen"
      ].includes(report.type)
    )
  },
  {
    title: "Contabilidad",
    reports: INVENTORY_REPORTS.filter((report) =>
      ["diario-almacenes", "costo-produccion", "movimiento-almacen"].includes(report.type)
    )
  },
  {
    title: "Control y auditoria",
    reports: [
      ...INVENTORY_REPORTS.filter((report) =>
        ["salidas-detalle", "anulaciones-entradas", "anulaciones-salidas"].includes(report.type)
      ),
      ...API_REPORTS
    ]
  }
];

function isLegacyReportType(value: string | undefined): value is LegacyReportType {
  return value === "bin-card" || value === "bin-card-valorado";
}
function isApiReportType(value: string | undefined): value is ApiReportType {
  return value === "stock-actual" || value === "vales-resumen" || value === "compras-resumen";
}

function formatLegacyCellValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function isSaldoInicialReferencia(referencia: unknown) {
  if (typeof referencia !== "string") return false;
  return referencia.trim().toUpperCase() === "SALDO_INICIAL";
}

function formatInventoryDate(value: string) {
  const midnightUtcMatch = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/.exec(value);
  if (midnightUtcMatch) {
    const [, year, month, day] = midnightUtcMatch;
    return `${day}/${month}/${year}`;
  }
  return new Date(value).toLocaleString();
}

function buildRetroactivoLabel(item: {
  esRetroactivo?: boolean | null;
  periodoAnio?: number | null;
  periodoMes?: number | null;
}) {
  if (!item.esRetroactivo) return null;
  if (item.periodoAnio && item.periodoMes) {
    return `Retroactivo (${item.periodoMes}/${item.periodoAnio})`;
  }
  return "Retroactivo";
}

function monthRangeFromDates(params: {
  dateMode: DateMode;
  fecha: string;
  fechaInicio: string;
  fechaFin: string;
}) {
  const fallback = new Date();
  const startSource =
    params.dateMode === "specific"
      ? params.fecha
      : params.dateMode === "range"
        ? params.fechaInicio
        : "";
  const endSource =
    params.dateMode === "specific"
      ? params.fecha
      : params.dateMode === "range"
        ? params.fechaFin
        : "";
  const start = startSource ? new Date(`${startSource}T00:00:00`) : fallback;
  const end = endSource ? new Date(`${endSource}T00:00:00`) : start;
  const safeStart = Number.isNaN(start.getTime()) ? fallback : start;
  const safeEnd = Number.isNaN(end.getTime()) ? safeStart : end;

  return {
    anioInicio: safeStart.getFullYear(),
    mesInicio: safeStart.getMonth() + 1,
    anioFin: safeEnd.getFullYear(),
    mesFin: safeEnd.getMonth() + 1
  };
}

function isPagedMeta(
  meta: { page?: number; totalPages?: number; total?: number } | undefined
): meta is { page: number; totalPages: number; total: number } {
  return typeof meta?.page === "number" && typeof meta.totalPages === "number";
}

export function ReportesPage() {
  const { tipo } = useParams();
  const navigate = useNavigate();

  const isLegacyType = isLegacyReportType(tipo);
  const isAdminType = isInventoryReportType(tipo);
  const isApiType = isApiReportType(tipo);

  if (!isLegacyType && !isAdminType && !isApiType) {
    return <Navigate to="/inventario/reportes/bin-card" replace />;
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const defaultFechaInicio = `${currentYear}-01-01`;
  const defaultFechaFin = today.toISOString().slice(0, 10);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [productoIdDraft, setProductoIdDraft] = useState("");
  const [cuadroGrupoDraft, setCuadroGrupoDraft] = useState("");
  const [dateModeDraft, setDateModeDraft] = useState<DateMode>("range");
  const [fechaDraft, setFechaDraft] = useState("");
  const [fechaInicioDraft, setFechaInicioDraft] = useState(defaultFechaInicio);
  const [fechaFinDraft, setFechaFinDraft] = useState(defaultFechaFin);
  const [dataModeDraft, setDataModeDraft] = useState<DataMode>("paged");
  const [estadoReporteDraft, setEstadoReporteDraft] = useState("");
  const [salidasCuentaIdDraft, setSalidasCuentaIdDraft] = useState("");
  const [salidasFuncionDraft, setSalidasFuncionDraft] = useState("");
  const [salidasSectorDraft, setSalidasSectorDraft] = useState("");
  const [salidasCentroDraft, setSalidasCentroDraft] = useState("");
  const [salidasSinCuentaDraft, setSalidasSinCuentaDraft] = useState(false);
  const [productoId, setProductoId] = useState("");
  const [cuadroGrupo, setCuadroGrupo] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("range");
  const [fecha, setFecha] = useState("");
  const [fechaInicio, setFechaInicio] = useState(defaultFechaInicio);
  const [fechaFin, setFechaFin] = useState(defaultFechaFin);
  const [dataMode, setDataMode] = useState<DataMode>("paged");
  const [estadoReporte, setEstadoReporte] = useState("");
  const [salidasCuentaId, setSalidasCuentaId] = useState("");
  const [salidasFuncion, setSalidasFuncion] = useState("");
  const [salidasSector, setSalidasSector] = useState("");
  const [salidasCentro, setSalidasCentro] = useState("");
  const [salidasSinCuenta, setSalidasSinCuenta] = useState(false);
  const [expandedCompraIds, setExpandedCompraIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setProductoIdDraft("");
    setProductoId("");
    setCuadroGrupoDraft("");
    setCuadroGrupo("");
    setSalidasCuentaIdDraft("");
    setSalidasCuentaId("");
    setSalidasFuncionDraft("");
    setSalidasFuncion("");
    setSalidasSectorDraft("");
    setSalidasSector("");
    setSalidasCentroDraft("");
    setSalidasCentro("");
    setSalidasSinCuentaDraft(false);
    setSalidasSinCuenta(false);
    setPage(1);
    setExpandedCompraIds(new Set());
  }, [tipo]);

  const productosQuery = useProductosQuery({ page: 1, limit: 5000, search: "" });
  const productos = productosQuery.data?.data ?? [];
  const proveedoresQuery = useProveedoresQuery({ page: 1, limit: 5000, search: "" });
  const proveedores = proveedoresQuery.data?.data ?? [];
  const productoOptions = useMemo(
    () =>
      productos.map((producto) => ({
        id: String(producto.id),
        label: `${producto.codigo} - ${producto.nombre} (${producto.unidad})`,
        searchText: `${producto.codigo} ${producto.nombre} ${producto.unidad}`
      })),
    [productos]
  );
  const proveedorOptions = useMemo(
    () =>
      proveedores.map((proveedor) => ({
        id: String(proveedor.id),
        label: `${proveedor.nombre}${proveedor.nit ? ` - NIT ${proveedor.nit}` : ""}`,
        searchText: `${proveedor.nombre} ${proveedor.razonSocial ?? ""} ${proveedor.nit ?? ""} ${proveedor.lugar ?? ""}`
      })),
    [proveedores]
  );
  const usesProveedorFilter = tipo === "compras-resumen";
  const usesCuadroGrupoFilter = tipo === "inventarios-suministros";
  const usesSalidasDetalleFilter = tipo === "salidas-detalle";
  const primaryFilterOptions = usesProveedorFilter ? proveedorOptions : productoOptions;
  const primaryFilterLabel = usesProveedorFilter ? "Proveedor" : "Producto";
  const primaryFilterPlaceholder = usesProveedorFilter
    ? "Todos los proveedores"
    : "Todos los productos";

  const params = useMemo(
    () => ({
      page,
      limit,
      productoId: productoId ? Number(productoId) : undefined,
      fecha: dateMode === "specific" ? fecha || undefined : undefined,
      fechaInicio:
        dateMode === "specific"
          ? fecha || undefined
          : dateMode === "range"
            ? fechaInicio || undefined
            : undefined,
      fechaFin:
        dateMode === "specific"
          ? fecha || undefined
          : dateMode === "range"
            ? fechaFin || undefined
            : undefined
    }),
    [dateMode, fecha, fechaFin, fechaInicio, limit, page, productoId]
  );

  const shouldFetchAllLegacy = isLegacyType;
  const binCardQuery = useBinCardQuery(
    params,
    dataMode === "all" || shouldFetchAllLegacy,
    isLegacyType && tipo === "bin-card"
  );
  const binCardValoradoQuery = useBinCardValoradoQuery(
    params,
    dataMode === "all" || shouldFetchAllLegacy,
    isLegacyType && tipo === "bin-card-valorado"
  );
  const monthRangeParams = useMemo(
    () => monthRangeFromDates({ dateMode, fecha, fechaInicio, fechaFin }),
    [dateMode, fecha, fechaFin, fechaInicio]
  );
  const salidasDetalleParams = useMemo(
    () => ({
      ...monthRangeParams,
      cuentaId: salidasCuentaId ? Number(salidasCuentaId) : undefined,
      funcionGastoCodigo: salidasFuncion || undefined,
      sectorCodigo: salidasSector || undefined,
      centroCostoCodigo: salidasCentro || undefined,
      sinCuenta: salidasSinCuenta || undefined
    }),
    [
      monthRangeParams,
      salidasCentro,
      salidasCuentaId,
      salidasFuncion,
      salidasSector,
      salidasSinCuenta
    ]
  );
  const balanceMensualQuery = useBalanceMensualReportQuery(
    monthRangeParams,
    isAdminType && tipo === "balance-mensual"
  );
  const inventarioAlmacenQuery = useInventarioAlmacenReportQuery(
    monthRangeParams,
    isAdminType && tipo === "inventario-general"
  );
  const saldosInicialesQuery = useSaldosInicialesReportQuery(
    monthRangeParams,
    isAdminType && tipo === "saldos-iniciales"
  );
  const entradasAlmacenQuery = useEntradasAlmacenReportQuery(
    monthRangeParams,
    isAdminType && tipo === "entradas-almacen"
  );
  const salidasAlmacenQuery = useSalidasAlmacenReportQuery(
    monthRangeParams,
    isAdminType && tipo === "salidas-almacen"
  );
  const salidasDetalleQuery = useSalidasDetalleReportQuery(
    salidasDetalleParams,
    isAdminType && tipo === "salidas-detalle"
  );
  const detalleMaterialesQuery = useDetalleMaterialesReportQuery(
    monthRangeParams,
    isAdminType && tipo === "detalle-materiales"
  );
  const diarioAlmacenesQuery = useDiarioAlmacenesReportQuery(
    monthRangeParams,
    isAdminType &&
      (tipo === "diario-almacenes" || tipo === "movimiento-almacen" || tipo === "costo-produccion")
  );
  const costoProduccionData = useMemo(
    () =>
      tipo === "costo-produccion" && diarioAlmacenesQuery.data
        ? detalleMaterialesFromDiario(diarioAlmacenesQuery.data)
        : undefined,
    [diarioAlmacenesQuery.data, tipo]
  );
  const cuadroSuministrosQuery = useCuadroSuministrosReportQuery(
    monthRangeParams,
    isAdminType && tipo === "inventarios-suministros"
  );
  const cuadroGrupoOptions = useMemo(() => {
    const groups = new Map<string, { id: string; label: string; searchText: string }>();
    for (const periodo of cuadroSuministrosQuery.data?.data.meses ?? []) {
      for (const proveedor of periodo.proveedores) {
        for (const compra of proveedor.compras) {
          for (const item of compra.items) {
            const id = cuadroGrupoKey(item.grupo);
            if (!id || groups.has(id)) continue;
            const label = cuadroGrupoLabel(item.grupo);
            groups.set(id, {
              id,
              label,
              searchText: `${item.grupo?.codigo ?? ""} ${item.grupo?.nombre ?? ""}`
            });
          }
        }
      }
    }
    return [...groups.values()].sort((a, b) => {
      const byCode = cuadroGrupoSortValue(a.label) - cuadroGrupoSortValue(b.label);
      return byCode || a.label.localeCompare(b.label);
    });
  }, [cuadroSuministrosQuery.data]);
  const filteredCuadroSuministrosData = useMemo<CuadroSuministrosReportResponse | undefined>(() => {
    const response = cuadroSuministrosQuery.data;
    if (!response || !cuadroGrupo) return response;

    return {
      ...response,
      data: {
        ...response.data,
        meses: response.data.meses
          .map((periodo) => {
            const proveedores = periodo.proveedores
              .map((proveedor) => {
                const compras = proveedor.compras
                  .map((compra) => {
                    const items = compra.items.filter(
                      (item) => cuadroGrupoKey(item.grupo) === cuadroGrupo
                    );
                    const subtotalBs = items.reduce((sum, item) => sum + item.importeBs, 0);
                    const subtotalSinIVA = items.reduce(
                      (sum, item) => sum + item.importeSinIVA,
                      0
                    );
                    return {
                      ...compra,
                      items,
                      subtotalBs: Number(subtotalBs.toFixed(2)),
                      subtotalSinIVA: Number(subtotalSinIVA.toFixed(2))
                    };
                  })
                  .filter((compra) => compra.items.length > 0);
                const totalBs = compras.reduce((sum, compra) => sum + compra.subtotalBs, 0);
                const totalSinIVA = compras.reduce(
                  (sum, compra) => sum + (compra.subtotalSinIVA ?? 0),
                  0
                );
                return {
                  ...proveedor,
                  compras,
                  totalBs: Number(totalBs.toFixed(2)),
                  totalSinIVA: Number(totalSinIVA.toFixed(2))
                };
              })
              .filter((proveedor) => proveedor.compras.length > 0);
            const totalGeneral = proveedores.reduce((sum, proveedor) => sum + proveedor.totalBs, 0);
            const totalGeneralSinIVA = proveedores.reduce(
              (sum, proveedor) => sum + (proveedor.totalSinIVA ?? 0),
              0
            );
            return {
              ...periodo,
              proveedores,
              totalGeneral: Number(totalGeneral.toFixed(2)),
              totalGeneralSinIVA: Number(totalGeneralSinIVA.toFixed(2))
            };
          })
          .filter((periodo) => periodo.proveedores.length > 0)
      }
    };
  }, [cuadroGrupo, cuadroSuministrosQuery.data]);
  const anulacionesEntradasQuery = useAnulacionesEntradasReportQuery(
    monthRangeParams,
    isAdminType && tipo === "anulaciones-entradas"
  );
  const anulacionesSalidasQuery = useAnulacionesSalidasReportQuery(
    monthRangeParams,
    isAdminType && tipo === "anulaciones-salidas"
  );
  const stockQuery = useStockReportQuery(
    { page, limit, categoriaId: undefined },
    isApiType && tipo === "stock-actual"
  );
  const valesResumenQuery = useValesReportQuery(
    {
      page,
      limit,
      estado: estadoReporte || undefined,
      solicitanteId: productoId ? Number(productoId) : undefined,
      fechaInicio,
      fechaFin,
      sinPaginar: dataMode === "all"
    },
    isApiType && tipo === "vales-resumen"
  );
  const comprasResumenQuery = useComprasReportQuery(
    {
      page,
      limit,
      estado: estadoReporte || undefined,
      proveedorId: productoId ? Number(productoId) : undefined,
      fechaInicio,
      fechaFin,
      sinPaginar: dataMode === "all"
    },
    isApiType && tipo === "compras-resumen"
  );
  const legacyActiveQuery = tipo === "bin-card" ? binCardQuery : binCardValoradoQuery;
  const legacyItems = useMemo(
    () =>
      [...(legacyActiveQuery.data?.items ?? [])]
        .filter((item) => !isSaldoInicialReferencia(item.referencia))
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [legacyActiveQuery.data?.items]
  );

  const pagedLegacyItems = useMemo(() => {
    if (dataMode === "all") return legacyItems;
    const start = (page - 1) * limit;
    return legacyItems.slice(start, start + limit);
  }, [dataMode, legacyItems, limit, page]);

  const legacyMeta = useMemo(() => {
    const total = legacyItems.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    return {
      page: safePage,
      limit,
      total,
      totalPages
    };
  }, [legacyItems.length, limit, page]);

  const selectedProductLabel = usesSalidasDetalleFilter
    ? [
        salidasCuentaId ? `Cuenta ID ${salidasCuentaId}` : "",
        salidasFuncion ? `Funcion ${salidasFuncion}` : "",
        salidasCentro ? `Centro ${salidasCentro}` : "",
        salidasSector ? `Sector ${salidasSector}` : "",
        salidasSinCuenta ? "Solo sin cuenta" : ""
      ]
        .filter(Boolean)
        .join(" | ") || "Todos"
    : usesCuadroGrupoFilter
      ? (cuadroGrupoOptions.find((option) => option.id === cuadroGrupo)?.label ??
        "Todos los grupos")
      : (primaryFilterOptions.find((option) => option.id === productoId)?.label ??
        primaryFilterPlaceholder);
  const selectedDateLabel =
    dateMode === "specific"
      ? fecha || "Sin fecha"
      : dateMode === "range"
        ? `${fechaInicio || "-"} a ${fechaFin || "-"}`
        : "Sin filtro";

  const reportDefinition = useMemo(() => {
    if (!isAdminType) return null;
    if (tipo === "balance-mensual" && balanceMensualQuery.data) {
      return buildBalanceMensualApiReportDefinition(balanceMensualQuery.data);
    }
    if (tipo === "inventario-general" && inventarioAlmacenQuery.data) {
      return buildInventarioAlmacenApiReportDefinition(inventarioAlmacenQuery.data);
    }
    if (tipo === "saldos-iniciales" && saldosInicialesQuery.data) {
      return buildSaldosInicialesApiReportDefinition(saldosInicialesQuery.data);
    }
    if (tipo === "entradas-almacen" && entradasAlmacenQuery.data) {
      return buildEntradasAlmacenApiReportDefinition(entradasAlmacenQuery.data);
    }
    if (tipo === "salidas-almacen" && salidasAlmacenQuery.data) {
      return buildSalidasAlmacenApiReportDefinition(salidasAlmacenQuery.data);
    }
    if (tipo === "salidas-detalle" && salidasDetalleQuery.data) {
      return buildSalidasDetalleApiReportDefinition(salidasDetalleQuery.data);
    }
    if (tipo === "detalle-materiales" && detalleMaterialesQuery.data) {
      return buildDetalleMaterialesApiReportDefinition(detalleMaterialesQuery.data, tipo);
    }
    if (tipo === "costo-produccion" && costoProduccionData) {
      return buildDetalleMaterialesApiReportDefinition(costoProduccionData, tipo);
    }
    if (
      (tipo === "diario-almacenes" || tipo === "movimiento-almacen") &&
      diarioAlmacenesQuery.data
    ) {
      return buildDiarioAlmacenesApiReportDefinition(diarioAlmacenesQuery.data, tipo);
    }
    if (tipo === "inventarios-suministros" && filteredCuadroSuministrosData) {
      return buildCuadroSuministrosApiReportDefinition(filteredCuadroSuministrosData);
    }
    if (tipo === "anulaciones-entradas" && anulacionesEntradasQuery.data) {
      return buildAnulacionesEntradasApiReportDefinition(anulacionesEntradasQuery.data);
    }
    if (tipo === "anulaciones-salidas" && anulacionesSalidasQuery.data) {
      return buildAnulacionesSalidasApiReportDefinition(anulacionesSalidasQuery.data);
    }
    return null;
  }, [
    anulacionesEntradasQuery.data,
    anulacionesSalidasQuery.data,
    balanceMensualQuery.data,
    costoProduccionData,
    detalleMaterialesQuery.data,
    diarioAlmacenesQuery.data,
    entradasAlmacenQuery.data,
    filteredCuadroSuministrosData,
    inventarioAlmacenQuery.data,
    isAdminType,
    saldosInicialesQuery.data,
    salidasAlmacenQuery.data,
    salidasDetalleQuery.data,
    tipo
  ]);

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setProductoId(productoIdDraft);
    setCuadroGrupo(cuadroGrupoDraft);
    setDateMode(dateModeDraft);
    setFecha(fechaDraft);
    setFechaInicio(fechaInicioDraft);
    setFechaFin(fechaFinDraft);
    setDataMode(dataModeDraft);
    setEstadoReporte(estadoReporteDraft);
    setSalidasCuentaId(salidasCuentaIdDraft);
    setSalidasFuncion(salidasFuncionDraft.trim());
    setSalidasSector(salidasSectorDraft.trim());
    setSalidasCentro(salidasCentroDraft.trim());
    setSalidasSinCuenta(salidasSinCuentaDraft);
    setExpandedCompraIds(new Set());
  }

  function handleResetFilters() {
    setProductoIdDraft("");
    setCuadroGrupoDraft("");
    setDateModeDraft("range");
    setFechaDraft("");
    setFechaInicioDraft(defaultFechaInicio);
    setFechaFinDraft(defaultFechaFin);
    setDataModeDraft("paged");
    setEstadoReporteDraft("");
    setSalidasCuentaIdDraft("");
    setSalidasFuncionDraft("");
    setSalidasSectorDraft("");
    setSalidasCentroDraft("");
    setSalidasSinCuentaDraft(false);
    setProductoId("");
    setCuadroGrupo("");
    setDateMode("range");
    setFecha("");
    setFechaInicio(defaultFechaInicio);
    setFechaFin(defaultFechaFin);
    setDataMode("paged");
    setEstadoReporte("");
    setSalidasCuentaId("");
    setSalidasFuncion("");
    setSalidasSector("");
    setSalidasCentro("");
    setSalidasSinCuenta(false);
    setExpandedCompraIds(new Set());
    setPage(1);
    setLimit(50);
  }

  function handleExportExcel() {
    if (isLegacyType) {
      exportLegacyBinCardExcel({
        tab: tipo,
        items: dataMode === "all" ? legacyItems : pagedLegacyItems,
        productLabel: selectedProductLabel,
        dateFilterLabel: selectedDateLabel
      });
      return;
    }
    if (tipo === "stock-actual" && stockQuery.data) {
      exportStockReportExcel({
        response: stockQuery.data,
        dateFilterLabel: selectedDateLabel
      });
      return;
    }
    if (tipo === "vales-resumen" && valesResumenQuery.data) {
      exportValesReportExcel({
        response: valesResumenQuery.data,
        dateFilterLabel: selectedDateLabel
      });
      return;
    }
    if (tipo === "compras-resumen" && comprasResumenQuery.data) {
      exportComprasReportExcel({
        response: comprasResumenQuery.data,
        dateFilterLabel: selectedDateLabel
      });
      return;
    }
    if (reportDefinition) exportInventoryReportExcel(reportDefinition);
  }

  function handleExportPdf() {
    try {
      if (isLegacyType) {
        exportLegacyBinCardPdf({
          tab: tipo,
          items: dataMode === "all" ? legacyItems : pagedLegacyItems,
          productLabel: selectedProductLabel,
          dateFilterLabel: selectedDateLabel
        });
        return;
      }
      if (reportDefinition) exportInventoryReportPdf(reportDefinition);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar el PDF.";
      window.alert(message);
    }
  }

  const currentQuery = isLegacyType
    ? legacyActiveQuery
    : tipo === "balance-mensual"
      ? balanceMensualQuery
      : tipo === "inventario-general"
        ? inventarioAlmacenQuery
        : tipo === "saldos-iniciales"
          ? saldosInicialesQuery
          : tipo === "entradas-almacen"
            ? entradasAlmacenQuery
            : tipo === "salidas-almacen"
              ? salidasAlmacenQuery
              : tipo === "salidas-detalle"
                ? salidasDetalleQuery
                : tipo === "detalle-materiales"
                  ? detalleMaterialesQuery
                  : tipo === "costo-produccion"
                    ? diarioAlmacenesQuery
                    : tipo === "diario-almacenes"
                      ? diarioAlmacenesQuery
                      : tipo === "movimiento-almacen"
                        ? diarioAlmacenesQuery
                        : tipo === "inventarios-suministros"
                          ? cuadroSuministrosQuery
                          : tipo === "anulaciones-entradas"
                            ? anulacionesEntradasQuery
                            : tipo === "anulaciones-salidas"
                              ? anulacionesSalidasQuery
                              : tipo === "stock-actual"
                                ? stockQuery
                                : tipo === "vales-resumen"
                                  ? valesResumenQuery
                                  : tipo === "compras-resumen"
                                    ? comprasResumenQuery
                                    : comprasResumenQuery;
  const rawCurrentMeta =
    isLegacyType ||
    (isAdminType &&
      tipo !== "balance-mensual" &&
      tipo !== "inventario-general" &&
      tipo !== "saldos-iniciales" &&
      tipo !== "entradas-almacen" &&
      tipo !== "salidas-almacen" &&
      tipo !== "salidas-detalle" &&
      tipo !== "detalle-materiales" &&
      tipo !== "costo-produccion" &&
      tipo !== "diario-almacenes" &&
      tipo !== "movimiento-almacen" &&
      tipo !== "inventarios-suministros" &&
      tipo !== "anulaciones-entradas" &&
      tipo !== "anulaciones-salidas")
      ? legacyMeta
      : "data" in currentQuery && currentQuery.data && "meta" in currentQuery.data
        ? currentQuery.data.meta
        : undefined;
  const currentMeta = isPagedMeta(rawCurrentMeta) ? rawCurrentMeta : undefined;
  const currentTotal =
    rawCurrentMeta && "total" in rawCurrentMeta
      ? rawCurrentMeta.total
      : reportDefinition?.rows.length;

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <FileBarChart2 size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Reportes De Inventario</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Bin Card, Bin Card Valorado y formatos administrativos en una sola vista.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Tipo de reporte
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {REPORT_GROUPS.map((group) => (
            <section
              key={group.title}
              className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3"
            >
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                {group.title}
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.reports.map((report) => (
                  <button
                    key={report.type}
                    type="button"
                    onClick={() => navigate(`/inventario/reportes/${report.type}`)}
                    className={`rounded-lg border px-3 py-3 text-left transition ${
                      report.type === tipo
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/14 shadow-sm"
                        : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    <p className="text-sm font-bold">{report.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                      {report.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6"
          onSubmit={handleApplyFilters}
        >
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              {usesSalidasDetalleFilter
                ? "Cuenta ID"
                : usesCuadroGrupoFilter
                  ? "Grupo"
                  : primaryFilterLabel}
            </label>
            {usesSalidasDetalleFilter ? (
              <input
                type="number"
                min={1}
                value={salidasCuentaIdDraft}
                onChange={(event) => setSalidasCuentaIdDraft(event.target.value)}
                placeholder="Todas las cuentas"
                className={inputClassName}
              />
            ) : usesCuadroGrupoFilter ? (
              <AutocompleteSelect
                value={cuadroGrupoDraft}
                onChange={setCuadroGrupoDraft}
                options={cuadroGrupoOptions}
                placeholder={
                  cuadroSuministrosQuery.isLoading ? "Cargando grupos..." : "Todos los grupos"
                }
                disabled={cuadroSuministrosQuery.isLoading}
                className={inputClassName}
              />
            ) : (
              <AutocompleteSelect
                value={productoIdDraft}
                onChange={setProductoIdDraft}
                options={primaryFilterOptions}
                placeholder={primaryFilterPlaceholder}
                className={inputClassName}
              />
            )}
          </div>
          {usesSalidasDetalleFilter ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Funcion gasto
                </label>
                <input
                  value={salidasFuncionDraft}
                  onChange={(event) => setSalidasFuncionDraft(event.target.value)}
                  placeholder="Ej. 237"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Centro costo
                </label>
                <input
                  value={salidasCentroDraft}
                  onChange={(event) => setSalidasCentroDraft(event.target.value)}
                  placeholder="Ej. 1804"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Sector
                </label>
                <input
                  value={salidasSectorDraft}
                  onChange={(event) => setSalidasSectorDraft(event.target.value.toUpperCase())}
                  placeholder="Ej. PUN"
                  className={inputClassName}
                />
              </div>
              <label className="flex items-end gap-2 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm font-semibold text-[var(--color-on-surface)]">
                <input
                  type="checkbox"
                  checked={salidasSinCuentaDraft}
                  onChange={(event) => setSalidasSinCuentaDraft(event.target.checked)}
                  className="h-4 w-4"
                />
                Solo sin cuenta
              </label>
            </>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Modo de fecha
            </label>
            <select
              value={dateModeDraft}
              onChange={(event) => setDateModeDraft(event.target.value as DateMode)}
              className={inputClassName}
            >
              <option value="none">Sin filtro de fecha</option>
              <option value="specific">Fecha especifica</option>
              <option value="range">Rango de fechas</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Modo de carga
            </label>
            <select
              value={dataModeDraft}
              onChange={(event) => setDataModeDraft(event.target.value as DataMode)}
              className={inputClassName}
            >
              <option value="paged">Paginado</option>
              <option value="all">Ver todo</option>
            </select>
          </div>
          {tipo === "vales-resumen" || tipo === "compras-resumen" ? (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Estado
              </label>
              <select
                value={estadoReporteDraft}
                onChange={(event) => setEstadoReporteDraft(event.target.value)}
                className={inputClassName}
              >
                <option value="">Todos</option>
                {tipo === "vales-resumen" ? (
                  <>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="APROBADO">APROBADO</option>
                    <option value="PARCIAL">PARCIAL</option>
                    <option value="COMPLETADO">COMPLETADO</option>
                    <option value="RECHAZADO">RECHAZADO</option>
                  </>
                ) : (
                  <>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="PARCIAL">PARCIAL</option>
                    <option value="COMPLETADO">COMPLETADO</option>
                    <option value="ANULADA">ANULADA</option>
                  </>
                )}
              </select>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Registros por pagina
            </label>
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className={inputClassName}
              disabled={dataModeDraft === "all"}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
            >
              <ListFilter size={14} />
              Aplicar
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              Limpiar
            </button>
          </div>
          {dateModeDraft === "specific" ? (
            <div className="xl:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Fecha
              </label>
              <input
                type="date"
                value={fechaDraft}
                onChange={(event) => setFechaDraft(event.target.value)}
                className={inputClassName}
              />
            </div>
          ) : null}
          {dateModeDraft === "range" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  value={fechaInicioDraft}
                  onChange={(event) => setFechaInicioDraft(event.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Fecha fin
                </label>
                <input
                  type="date"
                  value={fechaFinDraft}
                  onChange={(event) => setFechaFinDraft(event.target.value)}
                  className={inputClassName}
                />
              </div>
            </>
          ) : null}
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 mb-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
            <CalendarRange size={14} />
            {dataMode === "all" ? "Modo: ver todo" : "Modo: paginado"} |{" "}
            {usesSalidasDetalleFilter
              ? "Filtros"
              : usesCuadroGrupoFilter
                ? "Grupo"
                : primaryFilterLabel}
            : {selectedProductLabel}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={
                (isLegacyType && legacyItems.length === 0) ||
                (isAdminType && (!reportDefinition || reportDefinition.rows.length === 0)) ||
                currentQuery.isLoading
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface)] transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={
                (isLegacyType && legacyItems.length === 0) ||
                (isAdminType && (!reportDefinition || reportDefinition.rows.length === 0)) ||
                currentQuery.isLoading
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface)] transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText size={14} />
              PDF
            </button>
          </div>
        </div>

        {currentQuery.isError ? (
          <div className="mb-4 rounded-lg border border-[var(--color-error)]/45 bg-[var(--color-error)]/10 px-4 py-3 text-sm text-[var(--color-error)]">
            {currentQuery.error instanceof Error
              ? currentQuery.error.message
              : "No se pudo cargar el reporte seleccionado."}
          </div>
        ) : null}

        {isLegacyType ? (
          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Fecha
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Tipo
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Producto
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Cantidad
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Stock antes
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Stock despues
                  </th>
                  {tipo === "bin-card-valorado" ? (
                    <>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        P. Unit
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Entrada Bs.
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Salida Bs.
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Saldo Bs.
                      </th>
                    </>
                  ) : null}
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Usuario
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Referencia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {legacyActiveQuery.isLoading ? (
                  <tr>
                    <td
                      colSpan={tipo === "bin-card-valorado" ? 12 : 8}
                      className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Cargando reporte...
                    </td>
                  </tr>
                ) : null}
                {!legacyActiveQuery.isLoading &&
                (dataMode === "all" ? legacyItems : pagedLegacyItems).length === 0 ? (
                  <tr>
                    <td
                      colSpan={tipo === "bin-card-valorado" ? 12 : 8}
                      className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]"
                    >
                      Sin movimientos para los filtros seleccionados.
                    </td>
                  </tr>
                ) : null}
                {(dataMode === "all" ? legacyItems : pagedLegacyItems).map((item) => (
                  // Highlight retroactive rows coming from closed-month operations.
                  <tr
                    key={item.id}
                    className={`transition hover:bg-[var(--color-surface-container-highest)] ${
                      item.esRetroactivo ? "italic bg-[var(--color-warning)]/10" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-xs">{formatInventoryDate(item.fecha)}</td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                          item.tipo === "ENTRADA"
                            ? "bg-[var(--color-success)]/18 text-[var(--color-success)]"
                            : "bg-[var(--color-error)]/18 text-[var(--color-error)]"
                        }`}
                      >
                        {item.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{item.productoNombre ?? "-"}</td>
                    <td className="px-3 py-2 text-right text-xs">{item.cantidad}</td>
                    <td className="px-3 py-2 text-right text-xs">{item.stockAntes}</td>
                    <td className="px-3 py-2 text-right text-xs">{item.stockDespues}</td>
                    {tipo === "bin-card-valorado" ? (
                      <>
                        <td className="px-3 py-2 text-right text-xs">
                          {formatLegacyCellValue((item as { precioUnit?: unknown }).precioUnit)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {formatLegacyCellValue((item as { entradaBs?: unknown }).entradaBs)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {formatLegacyCellValue((item as { salidaBs?: unknown }).salidaBs)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {formatLegacyCellValue((item as { saldoBs?: unknown }).saldoBs)}
                        </td>
                      </>
                    ) : null}
                    <td className="px-3 py-2 text-xs">{item.usuarioNombre ?? "-"}</td>
                    <td className="px-3 py-2 text-xs">
                      {item.referencia ?? "-"} {item.referenciaId ? `(${item.referenciaId})` : ""}
                      {buildRetroactivoLabel(item) ? (
                        <span className="ml-1 rounded-full bg-[var(--color-warning)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-warning)] not-italic">
                          {buildRetroactivoLabel(item)}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isApiType ? (
          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {tipo === "stock-actual" ? (
                    <>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Codigo
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Producto
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Stock
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Reservado
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Disponible
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Valor Total
                      </th>
                    </>
                  ) : tipo === "compras-resumen" ? (
                    <>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Factura
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Estado
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Proveedor
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Fecha operación
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Ítems
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Subtotal Bs.
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Descuento
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Total Bs.
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Anulación
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        ID
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Estado
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Principal
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                        Fecha
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {tipo === "stock-actual"
                  ? (stockQuery.data?.data ?? []).map((item) => (
                      <tr key={`${item.productoId}`}>
                        <td className="px-3 py-2 text-xs">{item.codigo ?? "-"}</td>
                        <td className="px-3 py-2 text-xs">{item.nombre ?? "-"}</td>
                        <td className="px-3 py-2 text-right text-xs">{item.cantidad}</td>
                        <td className="px-3 py-2 text-right text-xs">{item.cantidadReservada}</td>
                        <td className="px-3 py-2 text-right text-xs">{item.cantidadDisponible}</td>
                        <td className="px-3 py-2 text-right text-xs">{item.valorTotal}</td>
                      </tr>
                    ))
                  : tipo === "vales-resumen"
                    ? (valesResumenQuery.data?.data ?? []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-xs">{item.id}</td>
                          <td className="px-3 py-2 text-xs">{item.estado}</td>
                          <td className="px-3 py-2 text-xs">{item.solicitante?.nombre ?? "-"}</td>
                          <td className="px-3 py-2 text-xs">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                          </td>
                        </tr>
                      ))
                    : (comprasResumenQuery.data?.data ?? []).map((item) => {
                        const isExpanded = expandedCompraIds.has(item.id);
                        return (
                          <Fragment key={item.id}>
                            <tr className="transition hover:bg-[var(--color-surface-container-highest)]">
                              <td className="px-3 py-2 text-xs">{item.numeroFactura ?? "-"}</td>
                              <td className="px-3 py-2 text-xs">{item.estado}</td>
                              <td
                                className="px-3 py-2 text-xs"
                                title={item.proveedor?.razonSocial ?? undefined}
                              >
                                {item.proveedor?.nombre ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {item.fechaOperacion
                                  ? formatInventoryDate(item.fechaOperacion)
                                  : item.createdAt
                                    ? formatInventoryDate(item.createdAt)
                                    : "-"}
                              </td>
                              <td className="px-3 py-2 text-right text-xs">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedCompraIds((current) => {
                                      const next = new Set(current);
                                      if (next.has(item.id)) next.delete(item.id);
                                      else next.add(item.id);
                                      return next;
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-2 py-1 font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-primary)]"
                                  aria-expanded={isExpanded}
                                >
                                  <ChevronRight
                                    size={13}
                                    className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                  />
                                  {item.items.length}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-right text-xs">
                                {item.subtotalBs.toLocaleString("es-BO", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </td>
                              <td className="px-3 py-2 text-right text-xs">
                                {item.descuento.toLocaleString("es-BO", {
                                  maximumFractionDigits: 2
                                })}
                                % (
                                {item.descuentoBs.toLocaleString("es-BO", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                                )
                              </td>
                              <td className="px-3 py-2 text-right text-xs font-semibold">
                                {item.totalBs.toLocaleString("es-BO", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </td>
                              <td className="px-3 py-2 text-xs">{item.anulacion?.motivo ?? "-"}</td>
                            </tr>
                            {isExpanded ? (
                              <tr className="bg-[var(--color-surface-container-high)]">
                                <td colSpan={9} className="px-5 py-3">
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left">
                                      <thead>
                                        <tr className="border-b border-[var(--color-border-soft)]">
                                          <th className="px-2 py-2 text-[10px] font-bold uppercase text-[var(--color-on-surface-variant)]">
                                            Código
                                          </th>
                                          <th className="px-2 py-2 text-[10px] font-bold uppercase text-[var(--color-on-surface-variant)]">
                                            Producto
                                          </th>
                                          <th className="px-2 py-2 text-[10px] font-bold uppercase text-[var(--color-on-surface-variant)]">
                                            Unidad
                                          </th>
                                          <th className="px-2 py-2 text-right text-[10px] font-bold uppercase text-[var(--color-on-surface-variant)]">
                                            Pedida
                                          </th>
                                          <th className="px-2 py-2 text-right text-[10px] font-bold uppercase text-[var(--color-on-surface-variant)]">
                                            Recibida
                                          </th>
                                          <th className="px-2 py-2 text-right text-[10px] font-bold uppercase text-[var(--color-on-surface-variant)]">
                                            P. Unit. Bs.
                                          </th>
                                          <th className="px-2 py-2 text-right text-[10px] font-bold uppercase text-[var(--color-on-surface-variant)]">
                                            Subtotal Bs.
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[var(--color-border-soft)]">
                                        {item.items.map((detalle) => (
                                          <tr key={`${item.id}-${detalle.productoId}`}>
                                            <td className="px-2 py-2 font-mono text-xs">
                                              {detalle.codigo ?? "-"}
                                            </td>
                                            <td className="px-2 py-2 text-xs">
                                              {detalle.nombre ?? "-"}
                                            </td>
                                            <td className="px-2 py-2 text-xs">
                                              {detalle.unidad ?? "-"}
                                            </td>
                                            <td className="px-2 py-2 text-right text-xs">
                                              {detalle.cantidadPedida}
                                            </td>
                                            <td className="px-2 py-2 text-right text-xs">
                                              {detalle.cantidadRecibida}
                                            </td>
                                            <td className="px-2 py-2 text-right text-xs">
                                              {detalle.precioUnit.toLocaleString("es-BO", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                              })}
                                            </td>
                                            <td className="px-2 py-2 text-right text-xs font-semibold">
                                              {detalle.subtotalBs.toLocaleString("es-BO", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                              })}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
              </tbody>
            </table>
            {tipo === "compras-resumen" && comprasResumenQuery.data ? (
              <div className="mt-3 flex justify-end text-sm font-bold">
                Total general: Bs.{" "}
                {comprasResumenQuery.data.totalGeneral.toLocaleString("es-BO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            ) : null}
          </div>
        ) : tipo === "diario-almacenes" && diarioAlmacenesQuery.data ? (
          <>
            <DiarioAlmacenesPreview response={diarioAlmacenesQuery.data} />
            {reportDefinition?.summary.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-on-surface-variant)]">
                {reportDefinition.summary.map((item) => (
                  <span
                    key={item.label}
                    className="rounded-full bg-[var(--color-surface-container-high)] px-3 py-1.5"
                  >
                    {item.label}:{" "}
                    <strong className="text-[var(--color-on-surface)]">
                      {typeof item.value === "number"
                        ? item.value.toLocaleString("es-BO", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })
                        : item.value}
                    </strong>
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : tipo === "movimiento-almacen" && diarioAlmacenesQuery.data ? (
          <>
            <MovimientoAlmacenPreview response={diarioAlmacenesQuery.data} />
            {reportDefinition?.summary.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-on-surface-variant)]">
                {reportDefinition.summary.map((item) => (
                  <span
                    key={item.label}
                    className="rounded-full bg-[var(--color-surface-container-high)] px-3 py-1.5"
                  >
                    {item.label}:{" "}
                    <strong className="text-[var(--color-on-surface)]">
                      {typeof item.value === "number"
                        ? item.value.toLocaleString("es-BO", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })
                        : item.value}
                    </strong>
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : tipo === "costo-produccion" && costoProduccionData ? (
          <>
            <CostoProduccionPreview response={costoProduccionData} />
            {reportDefinition?.summary.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-on-surface-variant)]">
                {reportDefinition.summary.map((item) => (
                  <span
                    key={item.label}
                    className="rounded-full bg-[var(--color-surface-container-high)] px-3 py-1.5"
                  >
                    {item.label}:{" "}
                    <strong className="text-[var(--color-on-surface)]">
                      {typeof item.value === "number"
                        ? item.value.toLocaleString("es-BO", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })
                        : item.value}
                    </strong>
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : reportDefinition ? (
          <>
            <div className="mb-2">
              <h2 className="text-base font-bold uppercase">{reportDefinition.title}</h2>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                {reportDefinition.subtitle}
              </p>
            </div>
            <div className="table-scroll overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    {reportDefinition.columns.map((column) => (
                      <th
                        key={column.key}
                        className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] ${
                          column.align === "right"
                            ? "text-right"
                            : column.align === "center"
                              ? "text-center"
                              : ""
                        }`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {currentQuery.isLoading ? (
                    <tr>
                      <td
                        colSpan={reportDefinition.columns.length}
                        className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]"
                      >
                        Cargando reporte...
                      </td>
                    </tr>
                  ) : null}
                  {!currentQuery.isLoading && reportDefinition.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={reportDefinition.columns.length}
                        className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]"
                      >
                        Sin datos para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : null}
                  {reportDefinition.rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`transition ${
                        row.type === "group"
                          ? "bg-[var(--color-primary)]/12 font-bold"
                          : row.type === "subtotal"
                            ? "bg-[var(--color-warning)]/10 font-semibold"
                            : row.type === "total"
                              ? "bg-[var(--color-success)]/12 font-bold"
                              : "hover:bg-[var(--color-surface-container-highest)]"
                      }`}
                    >
                      {reportDefinition.columns.map((column) => {
                        const value = row.values[column.key];
                        const showValue =
                          value === undefined || value === ""
                            ? ""
                            : typeof value === "number"
                              ? value.toLocaleString("es-BO", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 10
                                })
                              : value;
                        return (
                          <td
                            key={`${row.id}-${column.key}`}
                            className={`px-3 py-2 text-xs ${
                              column.align === "right"
                                ? "text-right"
                                : column.align === "center"
                                  ? "text-center"
                                  : ""
                            }`}
                          >
                            {showValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-on-surface-variant)]">
              {reportDefinition.summary.map((item) => (
                <span
                  key={item.label}
                  className="rounded-full bg-[var(--color-surface-container-high)] px-3 py-1.5"
                >
                  {item.label}:{" "}
                  <strong className="text-[var(--color-on-surface)]">
                    {typeof item.value === "number"
                      ? item.value.toLocaleString("es-BO", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })
                      : item.value}
                  </strong>
                </span>
              ))}
            </div>
          </>
        ) : null}

        {dataMode === "paged" && currentMeta ? (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-[var(--color-on-surface-variant)]">
              Pagina {currentMeta.page} de {currentMeta.totalPages} | Total: {currentMeta.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(currentMeta.totalPages, current + 1))}
                disabled={page >= currentMeta.totalPages}
                className="rounded-md bg-[var(--color-surface-container-highest)] p-1.5 text-[var(--color-on-surface-variant)] disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : currentTotal !== undefined ? (
          <div className="mt-3 text-xs text-[var(--color-on-surface-variant)]">
            Total: {currentTotal}
          </div>
        ) : null}
      </article>
    </section>
  );
}
