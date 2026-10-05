import * as XLSX from "xlsx-js-style";
import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import type {
  ReporteComprobanteDiario,
  ReporteEstadoCuenta,
  ReporteRendicion,
  ReporteRetenciones
} from "@/features/reportesCajaChica/model/reportesCajaChica.schema";
import type { PartidaPresupuestoCaja } from "@/features/parametrosCajaChica/model/parametrosCajaChica.schema";

const MESES_MAYUSCULA = [
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
const MESES_MINUSCULA = MESES_MAYUSCULA.map((m) => m.toLowerCase());

const TIPO_MOVIMIENTO_LABEL: Record<string, string> = {
  REMESA_PRESUPUESTO: "REMESA PRESUPUESTO",
  REMESA_SUELDOS: "REMESA PAGO DE SALARIOS",
  REMESA_COMPRAS_GENERAL: "REMESA PARA COMPRAS GENERAL",
  REMESA_OTROS: "REMESA PARA PAGO DE VARIOS",
  REPOSICION: "REPOSICIÓN DE FONDOS"
};

// Prisma serializa DateTime como ISO completo ("2026-09-13T00:00:00.000Z"),
// no como fecha simple — hay que aceptar ambos formatos. Y para no correrse
// un día según la zona horaria del navegador, todo se lee en componentes
// UTC (estas fechas representan un día calendario guardado a medianoche
// UTC, no un instante real).
function parseFecha(value: string): Date {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  return new Date(soloFecha);
}

function formatFecha(value: string) {
  const date = parseFecha(value);
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}

// Para el nombre del archivo exportado (día de HOY, no un dato guardado):
// año/mes/día LOCAL, nunca toISOString() sobre el instante actual — esa
// conversión corre a UTC antes de recortar, así que entre las 20:00 y las
// 23:59 hora boliviana el archivo salía fechado para mañana.
function hoyLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function diaMesLargo(date: Date, utc = true) {
  const dia = utc ? date.getUTCDate() : date.getDate();
  const mes = utc ? date.getUTCMonth() : date.getMonth();
  const anio = utc ? date.getUTCFullYear() : date.getFullYear();
  return `${dia} de ${MESES_MINUSCULA[mes]} del ${anio}`;
}

function mesDelAnioLabel(periodoHasta: string) {
  const fin = parseFecha(periodoHasta);
  return `${MESES_MAYUSCULA[fin.getUTCMonth()]} DEL ${fin.getUTCFullYear()}`;
}

// El nombre de la caja ya viene como "Caja Bolivianos Lipeña" / "Caja La Paz
// Dólares" (con "Caja" incluido) — nunca hay que anteponer "CAJA" de nuevo.
function cajaLabel(nombre: string) {
  return nombre.toUpperCase();
}

function num(value: number) {
  return Number(value.toFixed(2));
}

function formatBs(value: number) {
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// --- Números en letras (para el "SON:" del Comprobante de Diario) ---
const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const DIECIS = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
const DECENAS = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function menorQueCien(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return DIECIS[n - 10];
  if (n === 20) return "VEINTE";
  if (n < 30) return `VEINTI${UNIDADES[n - 20]}`;
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${DECENAS[d]} Y ${UNIDADES[u]}` : DECENAS[d];
}

function menorQueMil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  if (n < 100) return menorQueCien(n);
  const c = Math.floor(n / 100);
  const resto = n % 100;
  return `${CENTENAS[c]}${resto ? ` ${menorQueCien(resto)}` : ""}`;
}

function enteroALetras(n: number): string {
  if (n === 0) return "CERO";
  if (n < 1000) return menorQueMil(n);
  if (n < 1_000_000) {
    const miles = Math.floor(n / 1000);
    const resto = n % 1000;
    const milesTexto = miles === 1 ? "MIL" : `${menorQueMil(miles)} MIL`;
    return `${milesTexto}${resto ? ` ${menorQueMil(resto)}` : ""}`;
  }
  const millones = Math.floor(n / 1_000_000);
  const resto = n % 1_000_000;
  const millonesTexto = millones === 1 ? "UN MILLON" : `${enteroALetras(millones)} MILLONES`;
  return `${millonesTexto}${resto ? ` ${enteroALetras(resto)}` : ""}`;
}

function montoEnLetras(value: number) {
  const entero = Math.floor(Math.abs(value));
  const centavos = Math.round((Math.abs(value) - entero) * 100);
  return `${enteroALetras(entero)} ${String(centavos).padStart(2, "0")}/100 BOLIVIANOS`;
}

// --- Estilos: blanco y negro liso, como el documento impreso real — sin
// colores de relleno, solo negrita/subrayado/bordes finos para jerarquía. ---
const thinBorder = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } }
};
const titleStyle = { font: { bold: true, sz: 14 }, alignment: { horizontal: "center", vertical: "center" } };
const sectionStyle = { font: { bold: true, sz: 10 }, border: thinBorder };
const headerStyle = { font: { bold: true, sz: 9 }, alignment: { horizontal: "center", vertical: "center" }, border: thinBorder };
const bodyStyle = { font: { sz: 9 }, border: thinBorder };
const subtotalStyle = { font: { bold: true, sz: 9 }, border: thinBorder };
const totalStyle = { font: { bold: true, sz: 10 }, border: thinBorder };

function setStyle(sheet: XLSX.WorkSheet, address: string, style: Record<string, unknown>) {
  if (!sheet[address]) sheet[address] = { t: "s", v: "" };
  sheet[address].s = style;
}

function styleRow(sheet: XLSX.WorkSheet, row: number, lastCol: number, style: Record<string, unknown>) {
  for (let c = 0; c <= lastCol; c += 1) {
    setStyle(sheet, XLSX.utils.encode_cell({ r: row, c }), style);
  }
}

function numberFormatCell(sheet: XLSX.WorkSheet, row: number, col: number, align: "right" = "right") {
  const address = XLSX.utils.encode_cell({ r: row, c: col });
  if (sheet[address] && typeof sheet[address].v === "number") {
    sheet[address].s = { ...(sheet[address].s ?? {}), numFmt: "#,##0.00", alignment: { horizontal: align } };
  }
}

function openBrowserPrintDialog(doc: jsPDF, fileName: string) {
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  let printed = false;
  const cleanup = () => {
    URL.revokeObjectURL(blobUrl);
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  iframe.onload = () => {
    if (printed) return;
    printed = true;
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      doc.save(fileName);
      cleanup();
      return;
    }
    const done = () => {
      frameWindow.removeEventListener("afterprint", done);
      window.removeEventListener("focus", done);
      window.setTimeout(cleanup, 200);
    };
    frameWindow.addEventListener("afterprint", done);
    window.addEventListener("focus", done, { once: true });
    window.setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
    }, 120);
  };

  document.body.appendChild(iframe);
  iframe.src = blobUrl;
}

// PDF: mismo tratamiento en blanco y negro para las tablas (jspdf-autotable).
const pdfTableStyles = { fontSize: 8, cellPadding: 3, lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.4, textColor: [0, 0, 0] as [number, number, number] };
const pdfHeadStyles = { fillColor: [255, 255, 255] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: "bold" as const, lineWidth: 0.4, lineColor: [0, 0, 0] as [number, number, number] };

// ============================================================================
// Reporte mensual "CAJA {SECTOR}" — réplica del Excel real que arma el
// administrador de la caja ("CAJA LIPEÑA SEPTIEMBRE 2026.xlsx"): mismas
// columnas A–G, mismas celdas combinadas, Calibri, franja azul con el
// encargado, TOTAL de fondos en dorado, las 10 categorías siempre visibles
// (aunque estén vacías) con su SUB-TOTAL, y el saldo calculado igual que la
// fórmula del Excel (total de fondos − total de gastos).
// ============================================================================

type GastoReporte = ReporteRendicion["grupos"][number]["gastos"][number];
type Lado = "thin" | "medium";

const COLOR_ENCARGADO = "D9E1F2";
const COLOR_TOTAL = "FFD966";
const FORMATO_BS = "#,##0.00;[Red](#,##0.00)";

// "Caja Bolivianos Lipeña" -> "LIPEÑA" (el documento dice "SECTOR: LIPEÑA"
// y "CAJA LIPEÑA", sin la moneda).
function sectorCaja(nombre: string) {
  const sector = nombre.replace(/\b(caja|bolivianos|d[oó]lares)\b/gi, "").replace(/\s+/g, " ").trim();
  return (sector || nombre).toUpperCase();
}

// Lo importado del Excel trae proveedor = glosa: se muestra una sola vez.
function descripcionGasto(g: GastoReporte) {
  const proveedor = g.proveedorNombre.trim();
  const glosa = g.glosa.trim();
  if (!proveedor || glosa.toUpperCase().includes(proveedor.toUpperCase())) return glosa;
  if (proveedor.toUpperCase().includes(glosa.toUpperCase())) return proveedor;
  return `${proveedor}. ${glosa}`;
}

// El mes del reporte sale de la fecha "desde": la rendición de septiembre
// arranca el 01/09 aunque su "hasta" caiga en los primeros días de octubre.
function datosReporteMensual(reporte: ReporteRendicion) {
  const inicio = parseFecha(reporte.periodoDesde);
  const corte = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate() - 1));
  const sector = sectorCaja(reporte.caja.nombre);
  const totalFondos = reporte.saldoAnterior + reporte.totalFondos;
  return {
    sector,
    titulo: `CAJA ${sector}`,
    mesAnio: mesDelAnioLabel(reporte.periodoDesde),
    mesCorto: `${MESES_MAYUSCULA[inicio.getUTCMonth()]} ${inicio.getUTCFullYear()}`,
    nombreHoja: `CAJA ${MESES_MAYUSCULA[inicio.getUTCMonth()]}`,
    saldoLabel: `Saldo deudor al ${corte.getUTCDate()} de ${MESES_MAYUSCULA[corte.getUTCMonth()]} del ${corte.getUTCFullYear()}`,
    totalFondos,
    saldo: totalFondos - reporte.totalGastos,
    archivo: `caja-${reporte.caja.codigo}-${reporte.numero.replace(/\//g, "-")}`
  };
}

function bordes(l?: Lado, r?: Lado, t?: Lado, b?: Lado) {
  const out: Record<string, unknown> = {};
  const lado = (style: Lado) => ({ style, color: { rgb: "000000" } });
  if (l) out.left = lado(l);
  if (r) out.right = lado(r);
  if (t) out.top = lado(t);
  if (b) out.bottom = lado(b);
  return out;
}

function estilo(o: {
  sz?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  h?: "left" | "center" | "right";
  wrap?: boolean;
  fill?: string;
  borde?: Record<string, unknown>;
  fmt?: string;
}) {
  return {
    font: { name: "Calibri", sz: o.sz ?? 10, bold: o.bold ?? false, italic: o.italic ?? false, underline: o.underline ?? false },
    alignment: { ...(o.h ? { horizontal: o.h } : {}), vertical: "center", wrapText: o.wrap ?? false },
    ...(o.fill ? { fill: { patternType: "solid", fgColor: { rgb: o.fill } } } : {}),
    ...(o.borde ? { border: o.borde } : {}),
    ...(o.fmt ? { numFmt: o.fmt } : {})
  };
}

export function exportReporteRendicionExcel(reporte: ReporteRendicion) {
  const d = datosReporteMensual(reporte);
  type Celda = [string | number, ReturnType<typeof estilo> | null];
  const filas: Celda[][] = [];
  const merges: XLSX.Range[] = [];
  const alturas: Record<number, number> = {};
  const vacia: Celda = ["", null];
  const fila = (celdas: Partial<Record<"A" | "B" | "C" | "D" | "E" | "F" | "G", Celda>>, altura?: number) => {
    const r = filas.length;
    filas.push((["A", "B", "C", "D", "E", "F", "G"] as const).map((col) => celdas[col] ?? vacia));
    if (altura) alturas[r] = altura;
    return r;
  };
  const combinar = (r1: number, c1: number, r2: number, c2: number) => merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  const fino = bordes("thin", "thin", "thin", "thin");

  fila({ A: [`SECTOR: ${d.sector}`, estilo({ bold: true })] });
  const rTitulo = fila({ A: [d.titulo, estilo({ sz: 16, bold: true, h: "center" })] }, 21);
  combinar(rTitulo, 0, rTitulo, 6);
  fila(
    {
      E: ["MES DE:", estilo({ bold: true })],
      F: ["", estilo({ bold: true, borde: bordes("medium", undefined, "medium") })],
      G: [d.mesAnio, estilo({ bold: true, wrap: true, borde: bordes(undefined, "medium", "medium") })]
    },
    27.6
  );
  const estiloEncargado = estilo({ sz: 12, bold: true, h: "center", fill: COLOR_ENCARGADO, borde: fino });
  const rEncargado = fila(
    Object.fromEntries((["A", "B", "C", "D", "E", "F", "G"] as const).map((c) => [c, [c === "A" ? (reporte.caja.encargadoNombre ?? "").toUpperCase() : "", estiloEncargado]])),
    15
  );
  combinar(rEncargado, 0, rEncargado, 6);

  const encabezadoFondos = estilo({ bold: true, h: "left", borde: fino });
  const rFondos = fila({
    A: ["FONDOS RECIBIDOS:", encabezadoFondos],
    B: ["", encabezadoFondos],
    C: ["", encabezadoFondos],
    D: ["", encabezadoFondos],
    E: ["", encabezadoFondos],
    F: ["Bs.", estilo({ bold: true, h: "center", borde: fino })],
    G: ["Bs.", estilo({ bold: true, h: "center", borde: fino })]
  });
  fila({
    A: ["", encabezadoFondos],
    B: ["", encabezadoFondos],
    C: ["", encabezadoFondos],
    D: ["", encabezadoFondos],
    E: ["", encabezadoFondos],
    F: ["DEBE", estilo({ bold: true, h: "center", borde: fino })],
    G: ["HABER", estilo({ bold: true, h: "center", borde: fino })]
  });
  combinar(rFondos, 0, rFondos + 1, 4);

  const filaFondo = (a: Celda, b: Celda, detalle: Celda, debe: Celda) => {
    const r = fila({
      A: a,
      B: b,
      C: detalle,
      D: ["", estilo({ borde: bordes(undefined, undefined, "thin", "thin") })],
      E: ["", estilo({ borde: bordes(undefined, "thin", "thin", "thin") })],
      F: debe,
      G: ["", estilo({ borde: fino })]
    });
    combinar(r, 2, r, 4);
  };
  filaFondo(
    [d.saldoLabel, estilo({ borde: fino })],
    ["", estilo({ borde: fino })],
    ["", estilo({ borde: bordes("thin", undefined, "thin", "thin") })],
    [num(reporte.saldoAnterior), estilo({ h: "right", fmt: "#,##0.00", borde: fino })]
  );
  filaFondo(
    ["RECIBIDO EN EFECTIVO:", estilo({ bold: true, underline: true, borde: fino })],
    ["", estilo({ borde: fino })],
    ["", estilo({ borde: bordes("thin", undefined, "thin", "thin") })],
    ["", estilo({ borde: fino })]
  );
  for (const f of reporte.fondos) {
    filaFondo(
      [formatFecha(f.fecha), estilo({ sz: 9, h: "center", borde: fino })],
      [f.referencia ?? "", estilo({ sz: 9, h: "center", borde: fino })],
      [TIPO_MOVIMIENTO_LABEL[f.tipo] ?? f.tipo, estilo({ sz: 9, h: "left", borde: bordes("thin", undefined, "thin", "thin") })],
      [num(Number(f.monto)), estilo({ sz: 9, h: "right", fmt: "#,##0.00", borde: fino })]
    );
  }
  const estiloTotalFondos = estilo({ bold: true, h: "center", fill: COLOR_TOTAL, borde: bordes("thin", "thin", undefined, "thin") });
  const rTotalFondos = fila({
    A: ["", estilo({ bold: true, borde: bordes("medium") })],
    D: ["TOTAL", estiloTotalFondos],
    E: ["", estiloTotalFondos],
    F: [num(d.totalFondos), estilo({ bold: true, h: "right", fmt: "#,##0.00", fill: COLOR_TOTAL, borde: bordes("thin", "thin", undefined, "thin") })],
    G: ["", estilo({ fill: COLOR_TOTAL, borde: bordes("thin", "thin", undefined, "thin") })]
  });
  combinar(rTotalFondos, 3, rTotalFondos, 4);

  const bajoFino = estilo({ bold: true, borde: bordes(undefined, undefined, undefined, "thin") });
  fila({
    A: ["DETALLE DE GASTOS", estilo({ bold: true, borde: bordes("medium", undefined, undefined, "thin") })],
    B: ["", bajoFino],
    C: ["", bajoFino],
    D: ["", bajoFino],
    E: ["", bajoFino],
    F: ["", estilo({ bold: true, borde: bordes("thin", "thin", undefined, "thin") })],
    G: ["", estilo({ bold: true, borde: bordes("thin", "medium", undefined, "thin") })]
  });
  const centroFino = estilo({ bold: true, h: "center", borde: bordes(undefined, undefined, "thin", "thin") });
  const rDescripcion = fila({
    A: ["DESCRIPCION", estilo({ bold: true, h: "center", borde: bordes("medium", undefined, "thin", "thin") })],
    B: ["", centroFino],
    C: ["", centroFino],
    D: ["", centroFino],
    E: ["", estilo({ bold: true, h: "center", borde: bordes(undefined, "thin", "thin", "thin") })],
    F: ["FACTURA O RECIBO", estilo({ bold: true, h: "left", borde: fino })],
    G: ["IMPORTE", estilo({ bold: true, h: "center", borde: bordes("thin", "medium", "thin", "thin") })]
  });
  combinar(rDescripcion, 0, rDescripcion, 4);

  const marco = (celdas: Partial<Record<"A" | "B" | "C" | "D" | "E" | "F" | "G", Celda>> = {}) =>
    fila({
      A: ["", estilo({ borde: bordes("medium") })],
      G: ["", estilo({ borde: bordes(undefined, "medium") })],
      ...celdas
    });

  reporte.grupos.forEach((grupo, indice) => {
    marco({
      A: [grupo.label, estilo({ bold: true, underline: true, borde: bordes("medium") })],
      F: ["", estilo({ borde: bordes("thin", "thin") })],
      G: ["", estilo({ borde: bordes("thin", "medium") })]
    });
    for (const g of grupo.gastos) {
      const lineaFina = estilo({ sz: 9, bold: true, h: "left", borde: bordes(undefined, undefined, "thin", "thin") });
      const r = fila({
        A: [descripcionGasto(g), estilo({ sz: 9, bold: true, h: "left", borde: bordes("medium", undefined, "thin", "thin") })],
        B: ["", lineaFina],
        C: ["", lineaFina],
        D: ["", lineaFina],
        E: ["", estilo({ sz: 9, bold: true, borde: bordes(undefined, "thin", "thin", "thin") })],
        F: [g.numeroRespaldo ?? "", estilo({ sz: 9, bold: true, h: "left", borde: fino })],
        G: [num(Number(g.montoTotal)), estilo({ sz: 9, bold: true, h: "right", fmt: FORMATO_BS, borde: bordes("thin", "medium", "thin", "thin") })]
      });
      combinar(r, 0, r, 4);
    }
    if (grupo.gastos.length === 0) {
      marco({ F: ["", estilo({ borde: bordes("thin", "thin") })], G: ["", estilo({ borde: bordes("thin", "medium") })] });
    }
    const subtotal = estilo({ bold: true, h: "center", borde: bordes(undefined, undefined, "medium", "medium") });
    const rSub = marco({
      D: [indice === 0 ? "SUB TOTAL" : "SUB-TOTAL", estilo({ bold: true, h: "center", borde: bordes("medium", undefined, "medium", "medium") })],
      E: ["", subtotal],
      F: ["", estilo({ bold: true, h: "center", borde: bordes(undefined, "thin", "medium", "medium") })],
      G: [num(grupo.subtotal), estilo({ bold: true, h: "right", fmt: FORMATO_BS, borde: bordes("thin", "medium", "medium", "medium") })]
    });
    alturas[rSub] = 15;
    combinar(rSub, 3, rSub, 5);
    if (indice < reporte.grupos.length - 1) marco();
  });

  fila({
    A: ["TOTAL GASTOS EN EL MES", estilo({ bold: true, h: "left", borde: bordes("thin") })],
    F: ["", estilo({ bold: true, borde: bordes("thin", "thin", undefined, "thin") })],
    G: [num(reporte.totalGastos), estilo({ bold: true, h: "right", fmt: FORMATO_BS, borde: bordes("thin", "thin", undefined, "thin") })]
  });
  const lineaSaldo = estilo({ bold: true, borde: bordes(undefined, undefined, "thin", "thin") });
  fila({
    A: ["SALDO DEUDOR O ACREEDOR", estilo({ bold: true, h: "left", borde: bordes("thin", undefined, "thin", "thin") })],
    B: ["", lineaSaldo],
    C: ["", lineaSaldo],
    D: ["", lineaSaldo],
    E: ["", lineaSaldo],
    F: ["", estilo({ bold: true, borde: bordes(undefined, "thin", "thin", "thin") })],
    G: [num(d.saldo), estilo({ bold: true, h: "right", fmt: FORMATO_BS, borde: fino })]
  });
  fila({}, 9);
  const rLugar = fila({ C: [`MINA ${d.sector}, ${d.mesCorto}`, estilo({ h: "center" })] });
  combinar(rLugar, 2, rLugar, 4);
  for (let i = 0; i < 6; i += 1) fila({}, 12.75);
  fila({
    B: [reporte.caja.encargadoNombre ?? "", estilo({ bold: true, italic: true, h: "center" })],
    E: ["", estilo({ bold: true, italic: true, h: "center" })]
  });
  fila({
    B: ["ADMINISTRADOR", estilo({ bold: true, h: "center" })],
    E: ["SUPERINTENDENTE GENERAL", estilo({ bold: true, h: "center" })]
  });

  const sheet = XLSX.utils.aoa_to_sheet(filas.map((f) => f.map(([v]) => v)));
  filas.forEach((f, r) =>
    f.forEach(([, s], c) => {
      if (!s) return;
      const address = XLSX.utils.encode_cell({ r, c });
      if (!sheet[address]) sheet[address] = { t: "s", v: "" };
      sheet[address].s = s;
    })
  );
  sheet["!cols"] = [{ wch: 18.5 }, { wch: 12.83 }, { wch: 8.43 }, { wch: 8.43 }, { wch: 14.67 }, { wch: 15.67 }, { wch: 13.33 }];
  sheet["!rows"] = filas.map((_, r) => (alturas[r] ? { hpt: alturas[r] } : {}));
  sheet["!merges"] = merges;
  sheet["!margins"] = { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, d.nombreHoja.slice(0, 31));
  XLSX.writeFile(workbook, `${d.archivo}.xlsx`);
}

export function exportReporteRendicionPdf(reporte: ReporteRendicion) {
  const d = datosReporteMensual(reporte);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margen = 30;
  const ancho = pageWidth - margen * 2;
  const negro: [number, number, number] = [0, 0, 0];
  const azul: [number, number, number] = [217, 225, 242];
  const dorado: [number, number, number] = [255, 217, 102];
  const sinBorde = { top: 0, right: 0, bottom: 0, left: 0 };
  const base = { fontSize: 8, cellPadding: 2.5, lineColor: negro, lineWidth: 0.4, textColor: negro, fillColor: false as const };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`SECTOR: ${d.sector}`, margen, 28);
  doc.setFontSize(16);
  doc.text(d.titulo, pageWidth / 2, 48, { align: "center" });
  doc.setFontSize(9);
  doc.text("MES DE:", pageWidth - margen - 150, 66);
  doc.text(d.mesAnio, pageWidth - margen, 66, { align: "right" });

  doc.setFillColor(...azul);
  doc.setDrawColor(...negro);
  doc.setLineWidth(0.4);
  doc.rect(margen, 74, ancho, 16, "FD");
  doc.setFontSize(11);
  doc.text((reporte.caja.encargadoNombre ?? "").toUpperCase(), pageWidth / 2, 85.5, { align: "center" });

  autoTable(doc, {
    startY: 90,
    theme: "plain",
    margin: { left: margen, right: margen },
    styles: base,
    headStyles: { ...base, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 70 }, 3: { cellWidth: 85, halign: "right" }, 4: { cellWidth: 85 } },
    head: [
      [
        { content: "FONDOS RECIBIDOS:", colSpan: 3, rowSpan: 2, styles: { halign: "left", valign: "middle" } },
        { content: "Bs.", styles: { halign: "center" } },
        { content: "Bs.", styles: { halign: "center" } }
      ],
      [
        { content: "DEBE", styles: { halign: "center" } },
        { content: "HABER", styles: { halign: "center" } }
      ]
    ],
    body: [
      [{ content: d.saldoLabel, colSpan: 3 }, formatBs(reporte.saldoAnterior), ""],
      [{ content: "RECIBIDO EN EFECTIVO:", colSpan: 3, styles: { fontStyle: "bold" } }, "", ""],
      ...reporte.fondos.map((f): RowInput => [
        { content: formatFecha(f.fecha), styles: { halign: "center" } },
        { content: f.referencia ?? "", styles: { halign: "center" } },
        TIPO_MOVIMIENTO_LABEL[f.tipo] ?? f.tipo,
        formatBs(Number(f.monto)),
        ""
      ]),
      [
        { content: "", styles: { lineWidth: sinBorde } },
        { content: "", styles: { lineWidth: sinBorde } },
        { content: "TOTAL", styles: { fontStyle: "bold", halign: "center", fillColor: dorado } },
        { content: formatBs(d.totalFondos), styles: { fontStyle: "bold", fillColor: dorado } },
        { content: "", styles: { fillColor: dorado } }
      ]
    ]
  });

  const despuesFondos = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 160;

  const cuerpo: RowInput[] = [];
  const gruesas = new Set<number>();
  reporte.grupos.forEach((grupo, indice) => {
    cuerpo.push([{ content: grupo.label, colSpan: 3, styles: { fontStyle: "bold" } }]);
    for (const g of grupo.gastos) {
      cuerpo.push([descripcionGasto(g), g.numeroRespaldo ?? "", { content: formatBs(Number(g.montoTotal)), styles: { halign: "right" } }]);
    }
    if (grupo.gastos.length === 0) cuerpo.push(["", "", ""]);
    gruesas.add(cuerpo.length);
    cuerpo.push([
      { content: indice === 0 ? "SUB TOTAL" : "SUB-TOTAL", colSpan: 2, styles: { fontStyle: "bold", halign: "right" } },
      { content: formatBs(grupo.subtotal), styles: { fontStyle: "bold", halign: "right" } }
    ]);
  });
  cuerpo.push([
    { content: "TOTAL GASTOS EN EL MES", colSpan: 2, styles: { fontStyle: "bold" } },
    { content: formatBs(reporte.totalGastos), styles: { fontStyle: "bold", halign: "right" } }
  ]);
  cuerpo.push([
    { content: "SALDO DEUDOR O ACREEDOR", colSpan: 2, styles: { fontStyle: "bold" } },
    { content: formatBs(d.saldo), styles: { fontStyle: "bold", halign: "right" } }
  ]);

  autoTable(doc, {
    startY: despuesFondos + 10,
    theme: "plain",
    margin: { left: margen, right: margen, bottom: 40 },
    styles: { ...base, fontStyle: "bold" },
    headStyles: { ...base, fontStyle: "bold" },
    columnStyles: { 1: { cellWidth: 90 }, 2: { cellWidth: 85 } },
    head: [
      [{ content: "DETALLE DE GASTOS", colSpan: 3, styles: { halign: "left" } }],
      [
        { content: "DESCRIPCION", styles: { halign: "center" } },
        { content: "FACTURA O RECIBO", styles: { halign: "left" } },
        { content: "IMPORTE", styles: { halign: "center" } }
      ]
    ],
    body: cuerpo,
    didParseCell: (hook) => {
      if (hook.section === "body" && gruesas.has(hook.row.index)) hook.cell.styles.lineWidth = 1;
    }
  });

  let y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 400) + 20;
  if (y + 90 > pageHeight - 30) {
    doc.addPage();
    y = 60;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`MINA ${d.sector}, ${d.mesCorto}`, pageWidth / 2, y, { align: "center" });
  const firmaY = y + 70;
  const xIzquierda = margen + 115;
  const xDerecha = pageWidth - margen - 140;
  doc.setFont("helvetica", "bolditalic");
  doc.text(reporte.caja.encargadoNombre ?? "", xIzquierda, firmaY, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("ADMINISTRADOR", xIzquierda, firmaY + 12, { align: "center" });
  doc.text("SUPERINTENDENTE GENERAL", xDerecha, firmaY + 12, { align: "center" });

  openBrowserPrintDialog(doc, `${d.archivo}.pdf`);
}

// ============================================================================
// Comprobante de Diario — réplica del comprobante real de la rendición
// ("COMPROBANTE DE DIARIO / No: P-3/2025"): encabezado repetido en cada
// hoja con "Hoja: N", tabla CODIGO / DETALLE / BOLIVIANOS / DOLARES, cada
// asiento en varias filas (cuenta, centro de costo y función debajo, y el
// detalle "F.26224 ESTAC.PETRO CENTER..."), TOTALES acumulados al pie de
// cada hoja, el "SON: ..." solo en la última, y el recuadro de firmas. Las
// reglas del asiento (crédito fiscal, combustible al 70%, retenciones, caja
// al HABER por categoría) las arma el backend (getComprobanteDiario).
// ============================================================================

type LineaDiario = ReporteComprobanteDiario["lineas"][number];
interface FilaDiario {
  codigo: string;
  texto: string;
  nivel: "cuenta" | "sub" | "detalle";
  debeBs?: number;
  haberBs?: number;
  debeUsd?: number;
  haberUsd?: number;
}

const FILAS_POR_HOJA_DIARIO = 34;
const enUSDiario = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const montoDiario = (v?: number) => (v ? enUSDiario(v) : "");

// Cada línea del asiento ocupa varias filas impresas; el monto va en la
// fila de la cuenta, como en el comprobante real.
function filasDeLinea(linea: LineaDiario): FilaDiario[] {
  const filas: FilaDiario[] = [
    {
      codigo: linea.codigo,
      texto: linea.cuentaNombre,
      nivel: "cuenta",
      debeBs: linea.debeBs,
      haberBs: linea.haberBs,
      debeUsd: linea.debeUsd,
      haberUsd: linea.haberUsd
    }
  ];
  if (linea.centroCodigo) filas.push({ codigo: linea.centroCodigo, texto: linea.centroNombre ?? "", nivel: "sub" });
  if (linea.funcionCodigo) filas.push({ codigo: linea.funcionCodigo, texto: linea.funcionNombre ?? "", nivel: "sub" });
  if (linea.detalle) filas.push({ codigo: "", texto: linea.detalle, nivel: "detalle" });
  return filas;
}

// Reparte los asientos en hojas sin partir ninguno entre dos hojas, y
// calcula los TOTALES acumulados hasta el final de cada hoja.
function paginarDiario(comprobante: ReporteComprobanteDiario) {
  const hojas: Array<{ filas: FilaDiario[]; acumulado: { debeBs: number; haberBs: number; debeUsd: number; haberUsd: number } }> = [];
  let actual: FilaDiario[] = [];
  const acumulado = { debeBs: 0, haberBs: 0, debeUsd: 0, haberUsd: 0 };
  const cerrarHoja = () => {
    hojas.push({ filas: actual, acumulado: { ...acumulado } });
    actual = [];
  };
  for (const linea of comprobante.lineas) {
    const filas = filasDeLinea(linea);
    if (actual.length > 0 && actual.length + filas.length > FILAS_POR_HOJA_DIARIO) cerrarHoja();
    actual.push(...filas);
    acumulado.debeBs = Math.round((acumulado.debeBs + linea.debeBs) * 100) / 100;
    acumulado.haberBs = Math.round((acumulado.haberBs + linea.haberBs) * 100) / 100;
    acumulado.debeUsd = Math.round((acumulado.debeUsd + linea.debeUsd) * 100) / 100;
    acumulado.haberUsd = Math.round((acumulado.haberUsd + linea.haberUsd) * 100) / 100;
  }
  cerrarHoja();
  return hojas;
}

function datosComprobanteDiario(comprobante: ReporteComprobanteDiario) {
  const inicio = parseFecha(comprobante.periodoDesde);
  const ultimoDia = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 0)).getUTCDate();
  const sector = sectorCaja(comprobante.caja.nombre);
  const mes = MESES_MAYUSCULA[inicio.getUTCMonth()];
  return {
    titulo: `CAJA ${sector}`,
    lugarFecha: `La Paz, ${ultimoDia} de ${mes} de ${inicio.getUTCFullYear()}`,
    recuadro: `CAJA ${sector} ${mes} ${inicio.getUTCFullYear()}`,
    hojas: paginarDiario(comprobante),
    son: `${montoEnLetras(comprobante.totales.debeBs)}.`,
    archivo: `comprobante-diario-${comprobante.caja.codigo}-${comprobante.numero.replace(/\//g, "-")}`
  };
}

export function exportComprobanteDiarioPdf(comprobante: ReporteComprobanteDiario) {
  const d = datosComprobanteDiario(comprobante);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const izq = 34;
  const der = pageWidth - 34;
  // Columnas: CODIGO | DETALLE | Bs DEBE | Bs HABER | $us DEBE | $us HABER
  const x = [izq, izq + 72, izq + 285, izq + 352, izq + 419, izq + 473, der];
  const alto = 12.2;
  const yTabla = 196;
  const yCuerpo = yTabla + 26;
  const yTotales = yCuerpo + FILAS_POR_HOJA_DIARIO * alto + 4;

  const subrayado = (texto: string, px: number, py: number) => {
    doc.text(texto, px, py);
    doc.line(px, py + 1.5, px + doc.getTextWidth(texto), py + 1.5);
  };

  d.hojas.forEach((hoja, indice) => {
    if (indice > 0) doc.addPage();
    const esUltima = indice === d.hojas.length - 1;
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.text("EMPRESA MINERA MARTE S.R.L.", izq + 4, 36);
    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    doc.text("La Paz - Bolivia", izq + 40, 47);
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.text(`Hoja: ${indice + 1}`, der - 4, 40, { align: "right" });

    doc.setFontSize(12);
    const titulo = "COMPROBANTE DE DIARIO";
    const anchoTitulo = doc.getTextWidth(titulo);
    doc.text(titulo, pageWidth / 2 - anchoTitulo / 2, 72);
    doc.line(pageWidth / 2 - anchoTitulo / 2, 74, pageWidth / 2 + anchoTitulo / 2, 74);

    doc.setFontSize(8.5);
    const etiquetas: Array<[string, string]> = [
      ["Lugar y Fecha:", d.lugarFecha],
      ["A Favor de:", d.titulo],
      ["Referencia:", `DIARIO RENDICION CUENTAS ${d.titulo}`]
    ];
    etiquetas.forEach(([etiqueta, valor], i) => {
      const py = 96 + i * 12;
      doc.setFont("courier", "bold");
      const anchoEtiqueta = doc.getTextWidth(etiqueta);
      subrayado(etiqueta, izq + 150 - anchoEtiqueta, py);
      doc.setFont("courier", "normal");
      doc.text(valor, izq + 156, py);
    });
    doc.setFont("courier", "bold");
    doc.rect(der - 140, 82, 136, 18);
    doc.text(`No: ${comprobante.numero}`, der - 134, 94);
    subrayado("T/C.Dolar.-", der - 140, 118);
    doc.setFont("courier", "normal");
    doc.text(String(comprobante.tipoCambio), der - 4, 118, { align: "right" });

    doc.rect(izq, 130, der - izq, 46);
    doc.setFont("courier", "bold");
    doc.setFontSize(7.5);
    doc.text(d.recuadro, izq + 6, 140);

    // Tabla: encabezado de dos niveles + líneas verticales hasta los totales.
    doc.setFontSize(8);
    doc.rect(izq, yTabla, der - izq, yTotales + alto + 2 - yTabla);
    doc.line(izq, yTabla + 13, der, yTabla + 13);
    doc.line(x[2]!, yTabla + 26, der, yTabla + 26);
    doc.line(izq, yCuerpo, x[2]!, yCuerpo);
    for (const xi of [x[1]!, x[2]!, x[4]!]) doc.line(xi, yTabla, xi, yTotales);
    for (const xi of [x[3]!, x[5]!]) doc.line(xi, yTabla + 13, xi, yTotales);
    doc.text("CODIGO", izq + 4, yTabla + 22);
    doc.text("D E T A L L E", x[1]! + 40, yTabla + 22);
    doc.text("B O L I V I A N O S", (x[2]! + x[4]!) / 2, yTabla + 9, { align: "center" });
    doc.text("D O L A R E S", (x[4]! + der) / 2, yTabla + 9, { align: "center" });
    doc.text("DEBE", (x[2]! + x[3]!) / 2, yTabla + 22, { align: "center" });
    doc.text("HABER", (x[3]! + x[4]!) / 2, yTabla + 22, { align: "center" });
    doc.text("DEBE", (x[4]! + x[5]!) / 2, yTabla + 22, { align: "center" });
    doc.text("HABER", (x[5]! + der) / 2, yTabla + 22, { align: "center" });

    doc.setFont("courier", "normal");
    doc.setFontSize(7.6);
    hoja.filas.forEach((fila, i) => {
      const py = yCuerpo + 9 + i * alto;
      if (fila.codigo) doc.text(fila.codigo, x[1]! - 2, py, { align: "right" });
      const sangria = fila.nivel === "detalle" ? 12 : 2;
      const texto = doc.splitTextToSize(fila.texto, x[2]! - x[1]! - sangria - 4)[0] ?? "";
      doc.text(texto, x[1]! + sangria, py);
      if (fila.debeBs) doc.text(montoDiario(fila.debeBs), x[3]! - 3, py, { align: "right" });
      if (fila.haberBs) doc.text(montoDiario(fila.haberBs), x[4]! - 3, py, { align: "right" });
      if (fila.debeUsd) doc.text(montoDiario(fila.debeUsd), x[5]! - 3, py, { align: "right" });
      if (fila.haberUsd) doc.text(montoDiario(fila.haberUsd), der - 3, py, { align: "right" });
    });

    doc.line(izq, yTotales, der, yTotales);
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.text("T O T A L E S", (izq + x[2]!) / 2, yTotales + 10, { align: "center" });
    doc.text(enUSDiario(hoja.acumulado.debeBs), x[3]! - 3, yTotales + 10, { align: "right" });
    doc.text(enUSDiario(hoja.acumulado.haberBs), x[4]! - 3, yTotales + 10, { align: "right" });
    doc.text(enUSDiario(hoja.acumulado.debeUsd), x[5]! - 3, yTotales + 10, { align: "right" });
    doc.text(enUSDiario(hoja.acumulado.haberUsd), der - 3, yTotales + 10, { align: "right" });

    const ySon = yTotales + alto + 16;
    doc.setFontSize(8);
    doc.text(`SON: ${esUltima ? d.son : ""}`, izq, ySon, { maxWidth: der - izq });

    // Recuadro de firmas: PREPARADO POR | CONTADOR | PRESIDENCIA | NOMBRE/CI/FIRMA/INTERESADO
    const yFirmas = ySon + 8;
    const altoFirmas = 96;
    const xF = [izq, izq + 120, izq + 245, izq + 370, der];
    doc.setLineWidth(0.6);
    doc.rect(izq, yFirmas, der - izq, altoFirmas);
    for (const xi of xF.slice(1, -1)) doc.line(xi, yFirmas, xi, yFirmas + altoFirmas);
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.text("PREPARADO POR:", izq + 4, yFirmas + altoFirmas - 6);
    doc.text("CONTADOR", (xF[1]! + xF[2]!) / 2, yFirmas + altoFirmas - 6, { align: "center" });
    doc.text("PRESIDENCIA", (xF[2]! + xF[3]!) / 2, yFirmas + altoFirmas - 6, { align: "center" });
    doc.text("NOMBRE:", xF[3]! + 4, yFirmas + 10);
    doc.line(xF[3]!, yFirmas + 16, der, yFirmas + 16);
    doc.text("CI.:", xF[3]! + 4, yFirmas + 30);
    doc.line(xF[3]!, yFirmas + 36, der, yFirmas + 36);
    doc.text("FIRMA:", xF[3]! + 4, yFirmas + 72);
    doc.line(xF[3]!, yFirmas + 78, der, yFirmas + 78);
    doc.text("I N T E R E S A D O", (xF[3]! + der) / 2, yFirmas + altoFirmas - 6, { align: "center" });
  });

  openBrowserPrintDialog(doc, `${d.archivo}.pdf`);
}

export function exportComprobanteDiarioExcel(comprobante: ReporteComprobanteDiario) {
  const d = datosComprobanteDiario(comprobante);
  type Celda = [string | number, Record<string, unknown> | null];
  const filas: Celda[][] = [];
  const merges: XLSX.Range[] = [];
  const vacia: Celda = ["", null];
  const fila = (celdas: Celda[] = []) => {
    filas.push([...celdas, ...Array(6 - celdas.length).fill(vacia)]);
    return filas.length - 1;
  };
  const combinar = (r: number, c1: number, c2: number) => merges.push({ s: { r, c: c1 }, e: { r, c: c2 } });
  const est = (o: { sz?: number; bold?: boolean; underline?: boolean; h?: "left" | "center" | "right"; borde?: Record<string, unknown> }) => ({
    font: { name: "Courier New", sz: o.sz ?? 8, bold: o.bold ?? false, underline: o.underline ?? false },
    alignment: { ...(o.h ? { horizontal: o.h } : {}), vertical: "center" },
    ...(o.borde ? { border: o.borde } : {})
  });
  const linea = (lados: Array<"left" | "right" | "top" | "bottom">) =>
    Object.fromEntries(lados.map((l) => [l, { style: "thin", color: { rgb: "000000" } }]));
  const columnas = (extra: Array<"top" | "bottom"> = []) =>
    [0, 1, 2, 3, 4, 5].map((c) => linea([...(c === 0 ? ["left" as const] : []), "right", ...extra]));

  d.hojas.forEach((hoja, indice) => {
    const esUltima = indice === d.hojas.length - 1;
    fila([["EMPRESA MINERA MARTE S.R.L.", est({ sz: 10, bold: true })], vacia, vacia, vacia, vacia, [`Hoja: ${indice + 1}`, est({ bold: true, h: "right" })]]);
    fila([["", null], ["La Paz - Bolivia", est({})]]);
    const rTitulo = fila([["COMPROBANTE DE DIARIO", est({ sz: 12, bold: true, underline: true, h: "center" })]]);
    combinar(rTitulo, 0, 5);
    const rLugar = fila([["Lugar y Fecha:", est({ bold: true, underline: true, h: "right" })], [d.lugarFecha, est({})], vacia, vacia, [`No: ${comprobante.numero}`, est({ bold: true, borde: linea(["left", "right", "top", "bottom"]) })]]);
    combinar(rLugar, 4, 5);
    fila([["A Favor de:", est({ bold: true, underline: true, h: "right" })], [d.titulo, est({})]]);
    fila([["Referencia:", est({ bold: true, underline: true, h: "right" })], [`DIARIO RENDICION CUENTAS ${d.titulo}`, est({})], vacia, vacia, ["T/C.Dolar.-", est({ bold: true, underline: true })], [comprobante.tipoCambio, est({ h: "right" })]]);
    const rRecuadro = fila([[d.recuadro, est({ bold: true, borde: linea(["left", "top", "bottom"]) })], ["", est({ borde: linea(["top", "bottom"]) })], ["", est({ borde: linea(["top", "bottom"]) })], ["", est({ borde: linea(["top", "bottom"]) })], ["", est({ borde: linea(["top", "bottom"]) })], ["", est({ borde: linea(["right", "top", "bottom"]) })]]);
    combinar(rRecuadro, 0, 5);
    fila();

    const cab = (texto: string, h: "left" | "center" = "center") => est({ bold: true, h, borde: linea(["left", "right", "top", "bottom"]) });
    const rCab1 = fila([["CODIGO", cab("CODIGO")], ["D E T A L L E", cab("")], ["B O L I V I A N O S", cab("")], ["", cab("")], ["D O L A R E S", cab("")], ["", cab("")]]);
    combinar(rCab1, 2, 3);
    combinar(rCab1, 4, 5);
    fila([["", cab("")], ["", cab("")], ["DEBE", cab("")], ["HABER", cab("")], ["DEBE", cab("")], ["HABER", cab("")]]);

    const bordesCuerpo = columnas();
    for (let i = 0; i < FILAS_POR_HOJA_DIARIO; i += 1) {
      const f = hoja.filas[i];
      const numero = (v: number | undefined, c: number): Celda => [v ? Math.round(v * 100) / 100 : "", { ...est({ h: "right", borde: bordesCuerpo[c] }), numFmt: "#,##0.00" }];
      fila([
        [f?.codigo ?? "", est({ h: "right", borde: bordesCuerpo[0] })],
        [f ? `${f.nivel === "detalle" ? "    " : ""}${f.texto}` : "", est({ borde: bordesCuerpo[1] })],
        numero(f?.debeBs, 2),
        numero(f?.haberBs, 3),
        numero(f?.debeUsd, 4),
        numero(f?.haberUsd, 5)
      ]);
    }
    const bordesTotales = columnas(["top", "bottom"]);
    const total = (v: number, c: number): Celda => [v, { ...est({ bold: true, h: "right", borde: bordesTotales[c] }), numFmt: "#,##0.00" }];
    const rTotales = fila([
      ["T O T A L E S", est({ bold: true, h: "center", borde: bordesTotales[0] })],
      ["", est({ borde: bordesTotales[1] })],
      total(hoja.acumulado.debeBs, 2),
      total(hoja.acumulado.haberBs, 3),
      total(hoja.acumulado.debeUsd, 4),
      total(hoja.acumulado.haberUsd, 5)
    ]);
    combinar(rTotales, 0, 1);
    const rSon = fila([[`SON: ${esUltima ? d.son : ""}`, est({ bold: true })]]);
    combinar(rSon, 0, 5);
    const caja = est({ borde: linea(["left", "right", "top"]) });
    fila([["", caja], ["", caja], ["", caja], ["NOMBRE:", est({ bold: true, borde: linea(["left", "top"]) })], ["", est({ borde: linea(["top"]) })], ["", est({ borde: linea(["right", "top"]) })]]);
    fila([["", est({ borde: linea(["left", "right"]) })], ["", est({ borde: linea(["left", "right"]) })], ["", est({ borde: linea(["left", "right"]) })], ["CI.:", est({ bold: true, borde: linea(["left", "top"]) })], ["", est({ borde: linea(["top"]) })], ["", est({ borde: linea(["right", "top"]) })]]);
    fila([["", est({ borde: linea(["left", "right"]) })], ["", est({ borde: linea(["left", "right"]) })], ["", est({ borde: linea(["left", "right"]) })], ["FIRMA:", est({ bold: true, borde: linea(["left", "top"]) })], ["", est({ borde: linea(["top"]) })], ["", est({ borde: linea(["right", "top"]) })]]);
    const pie = est({ bold: true, h: "center", borde: linea(["left", "right", "bottom"]) });
    const rPie = fila([["PREPARADO POR:", est({ bold: true, borde: linea(["left", "right", "bottom"]) })], ["CONTADOR", pie], ["PRESIDENCIA", pie], ["I N T E R E S A D O", est({ bold: true, h: "center", borde: linea(["left", "top", "bottom"]) })], ["", est({ borde: linea(["top", "bottom"]) })], ["", est({ borde: linea(["right", "top", "bottom"]) })]]);
    combinar(rPie, 3, 5);
    fila();
    fila();
  });

  const sheet = XLSX.utils.aoa_to_sheet(filas.map((f) => f.map(([v]) => v)));
  filas.forEach((f, r) =>
    f.forEach(([, s], c) => {
      if (!s) return;
      const address = XLSX.utils.encode_cell({ r, c });
      if (!sheet[address]) sheet[address] = { t: "s", v: "" };
      sheet[address].s = s;
    })
  );
  sheet["!cols"] = [{ wch: 13 }, { wch: 44 }, { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 12 }];
  sheet["!merges"] = merges;
  sheet["!margins"] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Comprobante de Diario");
  XLSX.writeFile(workbook, `${d.archivo}.xlsx`);
}

// ============================================================================
// Saldo y movimientos (libro de caja en vivo, sin necesidad de rendición)
// ============================================================================

export function exportEstadoCuentaExcel(estado: ReporteEstadoCuenta) {
  const lastCol = 4;
  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA MARTE S.R.L.", "", "", "", ""],
    [`SALDO Y MOVIMIENTOS · ${cajaLabel(estado.caja.nombre)}`, "", "", "", ""],
    [
      estado.fechaCorte
        ? `Saldo inicial desde el cierre del ${formatFecha(estado.fechaCorte)}`
        : "Saldo inicial (sin cierres previos)",
      "",
      "",
      "",
      num(estado.saldoInicial)
    ],
    [],
    ["Fecha", "Tipo", "Detalle", "Ingreso", "Egreso"]
  ];

  for (const m of estado.movimientos) {
    aoa.push([formatFecha(m.fecha), m.tipo === "FONDO" ? "Fondo" : "Gasto", `${m.detalle}${m.referencia ? ` · ${m.referencia}` : ""}`, m.ingreso || "", m.egreso || ""]);
  }
  const headerRow = 4;
  const bodyStart = 5;
  const bodyEnd = bodyStart + estado.movimientos.length - 1;
  aoa.push([]);
  aoa.push(["TOTAL FONDOS RECIBIDOS", "", "", num(estado.totalIngresos), ""]);
  aoa.push(["TOTAL GASTOS", "", "", "", num(estado.totalEgresos)]);
  aoa.push([`SALDO ACTUAL DISPONIBLE (${estado.caja.monedaBase})`, "", "", "", num(estado.saldoActual)]);

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 44 }, { wch: 14 }, { wch: 14 }];
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }
  ];

  styleRow(sheet, 0, lastCol, titleStyle);
  styleRow(sheet, 1, lastCol, { font: { bold: true, sz: 11 }, alignment: { horizontal: "center" } });
  styleRow(sheet, 2, lastCol, sectionStyle);
  styleRow(sheet, headerRow, lastCol, headerStyle);
  for (let r = bodyStart; r <= bodyEnd; r += 1) styleRow(sheet, r, lastCol, bodyStyle);
  styleRow(sheet, aoa.length - 3, lastCol, subtotalStyle);
  styleRow(sheet, aoa.length - 2, lastCol, subtotalStyle);
  styleRow(sheet, aoa.length - 1, lastCol, totalStyle);

  for (const col of [3, 4]) {
    for (let r = 2; r < aoa.length; r += 1) numberFormatCell(sheet, r, col);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Saldo y Movimientos".slice(0, 31));
  XLSX.writeFile(workbook, `saldo-movimientos-${estado.caja.codigo}-${hoyLocal()}.xlsx`);
}

export function exportEstadoCuentaPdf(estado: ReporteEstadoCuenta) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("EMPRESA MINERA MARTE S.R.L.", centerX, 34, { align: "center" });
  doc.setFontSize(11);
  doc.text(`SALDO Y MOVIMIENTOS · ${cajaLabel(estado.caja.nombre)}`, centerX, 52, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    estado.fechaCorte ? `Saldo inicial desde el cierre del ${formatFecha(estado.fechaCorte)}` : "Saldo inicial (sin cierres previos)",
    centerX,
    66,
    { align: "center" }
  );

  const rows: RowInput[] = estado.movimientos.map((m) => [
    formatFecha(m.fecha),
    m.tipo === "FONDO" ? "Fondo" : "Gasto",
    `${m.detalle}${m.referencia ? ` · ${m.referencia}` : ""}`,
    m.ingreso ? formatBs(m.ingreso) : "",
    m.egreso ? formatBs(m.egreso) : "",
    formatBs(m.saldo)
  ]);

  autoTable(doc, {
    startY: 80,
    head: [["Fecha", "Tipo", "Detalle", "Ingreso", "Egreso", "Saldo"]],
    body: rows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    margin: { left: 30, right: 30, bottom: 60 }
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;
  let y = Math.min(finalY + 18, doc.internal.pageSize.getHeight() - 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Total fondos recibidos: ${formatBs(estado.totalIngresos)}`, 34, y);
  y += 14;
  doc.text(`Total gastos: ${formatBs(estado.totalEgresos)}`, 34, y);
  y += 14;
  doc.text(`Saldo actual disponible (${estado.caja.monedaBase}): ${formatBs(estado.saldoActual)}`, 34, y);

  openBrowserPrintDialog(doc, `saldo-movimientos-${estado.caja.codigo}-${hoyLocal()}.pdf`);
}

// ============================================================================
// Resumen de retenciones (RC-IVA / IUE Compras / IT) — el reporte formal
// para declarar en el SIAT. Es la base de la cifra "Retenciones" que se ve
// como resumen rápido en el detalle de cada Rendición.
// ============================================================================

export function exportReporteRetencionesExcel(reporte: ReporteRetenciones) {
  const lastCol = 4;
  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA MARTE S.R.L.", "", "", "", ""],
    ["RESUMEN DE RETENCIONES (RC-IVA / IUE COMPRAS / IT)", "", "", "", ""],
    [],
    ["Fecha", "Proveedor", "RC-IVA", "IUE Compras", "IT"]
  ];
  for (const g of reporte.gastos) {
    aoa.push([
      formatFecha(g.fecha),
      g.proveedorNombre,
      num(Number(g.montoRetencionRcIva)),
      num(Number(g.montoRetencionIueCompras)),
      num(Number(g.montoRetencionIt))
    ]);
  }
  aoa.push(["TOTALES", "", num(reporte.totales.rcIva), num(reporte.totales.iueCompras), num(reporte.totales.it)]);

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }
  ];
  styleRow(sheet, 0, lastCol, titleStyle);
  styleRow(sheet, 1, lastCol, { font: { bold: true, sz: 11 }, alignment: { horizontal: "center" } });
  styleRow(sheet, 3, lastCol, headerStyle);
  for (let r = 4; r < aoa.length - 1; r += 1) styleRow(sheet, r, lastCol, bodyStyle);
  styleRow(sheet, aoa.length - 1, lastCol, totalStyle);
  for (const col of [2, 3, 4]) {
    for (let r = 0; r < aoa.length; r += 1) numberFormatCell(sheet, r, col);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Resumen de Retenciones".slice(0, 31));
  XLSX.writeFile(workbook, `resumen-retenciones-${hoyLocal()}.xlsx`);
}

export function exportReporteRetencionesPdf(reporte: ReporteRetenciones) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("EMPRESA MINERA MARTE S.R.L.", centerX, 34, { align: "center" });
  doc.setFontSize(11);
  doc.text("RESUMEN DE RETENCIONES (RC-IVA / IUE COMPRAS / IT)", centerX, 52, { align: "center" });

  const rows: RowInput[] = reporte.gastos.map((g) => [
    formatFecha(g.fecha),
    g.proveedorNombre,
    formatBs(Number(g.montoRetencionRcIva)),
    formatBs(Number(g.montoRetencionIueCompras)),
    formatBs(Number(g.montoRetencionIt))
  ]);
  rows.push([
    "TOTALES",
    "",
    formatBs(reporte.totales.rcIva),
    formatBs(reporte.totales.iueCompras),
    formatBs(reporte.totales.it)
  ]);

  autoTable(doc, {
    startY: 70,
    head: [["Fecha", "Proveedor", "RC-IVA", "IUE Compras", "IT"]],
    body: rows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    margin: { left: 30, right: 30 },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.row.index === rows.length - 1) hook.cell.styles.fontStyle = "bold";
    }
  });

  openBrowserPrintDialog(doc, `resumen-retenciones-${hoyLocal()}.pdf`);
}

// ============================================================================
// Planilla de Control de Pagos — presupuesto vs. gastado por partida, con
// saldo a favor (presupuestado - gastado), igual a la planilla real.
// ============================================================================

function ejecucion(item: PartidaPresupuestoCaja) {
  return {
    presupuestado: Number(item.montoPresupuestado),
    gastado: item.totalGastado ?? 0,
    saldo: item.saldoAFavor ?? Number(item.montoPresupuestado) - (item.totalGastado ?? 0),
    ejecucion: item.porcentajeEjecucion ?? 0
  };
}

export function exportPlanillaControlPagosExcel(partidas: PartidaPresupuestoCaja[], periodoLabel: string) {
  const lastCol = 4;
  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA MARTE S.R.L.", "", "", "", ""],
    [`PLANILLA DE CONTROL DE PAGOS · ${periodoLabel.toUpperCase()}`, "", "", "", ""],
    [],
    ["DESCRIPCIÓN", "CAJA", "TOTAL PRESUPUESTADO", "TOTAL GASTADO", "SALDO A FAVOR"]
  ];

  let totalPresupuestado = 0;
  let totalGastado = 0;
  let totalSaldo = 0;

  for (const partida of partidas) {
    const e = ejecucion(partida);
    totalPresupuestado += e.presupuestado;
    totalGastado += e.gastado;
    totalSaldo += e.saldo;
    aoa.push([partida.descripcion, partida.caja?.nombre ?? "", num(e.presupuestado), num(e.gastado), num(e.saldo)]);
  }
  aoa.push(["TOTAL", "", num(totalPresupuestado), num(totalGastado), num(totalSaldo)]);

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 34 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }
  ];
  styleRow(sheet, 0, lastCol, titleStyle);
  styleRow(sheet, 1, lastCol, { font: { bold: true, sz: 11 }, alignment: { horizontal: "center" } });
  styleRow(sheet, 3, lastCol, headerStyle);
  for (let r = 4; r < aoa.length - 1; r += 1) styleRow(sheet, r, lastCol, bodyStyle);
  styleRow(sheet, aoa.length - 1, lastCol, totalStyle);
  for (const col of [2, 3, 4]) {
    for (let r = 0; r < aoa.length; r += 1) numberFormatCell(sheet, r, col);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Control de Pagos".slice(0, 31));
  XLSX.writeFile(workbook, `planilla-control-pagos-${hoyLocal()}.xlsx`);
}

export function exportPlanillaControlPagosPdf(partidas: PartidaPresupuestoCaja[], periodoLabel: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("EMPRESA MINERA MARTE S.R.L.", centerX, 30, { align: "center" });
  doc.setFontSize(11);
  doc.text(`PLANILLA DE CONTROL DE PAGOS · ${periodoLabel.toUpperCase()}`, centerX, 46, { align: "center" });

  let totalPresupuestado = 0;
  let totalGastado = 0;
  let totalSaldo = 0;

  const rows: RowInput[] = partidas.map((partida) => {
    const e = ejecucion(partida);
    totalPresupuestado += e.presupuestado;
    totalGastado += e.gastado;
    totalSaldo += e.saldo;
    return [
      partida.descripcion,
      partida.caja?.nombre ?? "",
      formatBs(e.presupuestado),
      formatBs(e.gastado),
      formatBs(e.saldo),
      `${e.ejecucion.toFixed(1)}%`
    ];
  });
  rows.push(["TOTAL", "", formatBs(totalPresupuestado), formatBs(totalGastado), formatBs(totalSaldo), ""]);

  autoTable(doc, {
    startY: 60,
    head: [["Descripción", "Caja", "Total Presupuestado", "Total Gastado", "Saldo a Favor", "% Ejecución"]],
    body: rows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" }
    },
    margin: { left: 30, right: 30 },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.row.index === rows.length - 1) hook.cell.styles.fontStyle = "bold";
    }
  });

  openBrowserPrintDialog(doc, `planilla-control-pagos-${hoyLocal()}.pdf`);
}

// ============================================================================
// Exportador genérico para los reportes "tabla simple" del hub de Reportes
// de Caja Chica (no deducibles, desglose, resumen caja vs. banco): mismo
// look blanco y negro que el resto, sin repetir el boilerplate de estilos
// en cada reporte nuevo — igual que el equivalente en Logística.
// ============================================================================
export interface TablaReporteCajaChicaConfig {
  subtitulo: string;
  columnas: string[];
  filas: Array<Array<string | number>>;
  filaTotales?: Array<string | number>;
  nombreArchivo: string;
  colsNumericas?: number[];
  anchoColumnas?: number[];
}

export function exportTablaReporteCajaChicaExcel(config: TablaReporteCajaChicaConfig) {
  const lastCol = config.columnas.length - 1;
  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA MARTE S.R.L.", ...Array(lastCol).fill("")],
    [config.subtitulo, ...Array(lastCol).fill("")],
    [],
    config.columnas
  ];
  const rowKinds: Array<"title" | "subtitle" | "normal" | "header"> = ["title", "subtitle", "normal", "header"];

  for (const fila of config.filas) {
    aoa.push(fila);
    rowKinds.push("normal");
  }
  if (config.filaTotales) {
    aoa.push(config.filaTotales);
    rowKinds.push("normal");
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = config.anchoColumnas?.map((wch) => ({ wch })) ?? config.columnas.map(() => ({ wch: 18 }));
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }
  ];
  rowKinds.forEach((kind, index) => {
    const isTotales = config.filaTotales && index === aoa.length - 1;
    const style = kind === "title" ? titleStyle : kind === "subtitle" ? { font: { bold: true, sz: 10 }, alignment: { horizontal: "center" } } : kind === "header" ? headerStyle : isTotales ? totalStyle : bodyStyle;
    styleRow(sheet, index, lastCol, style);
  });
  for (const col of config.colsNumericas ?? []) {
    for (let r = 4; r < aoa.length; r += 1) numberFormatCell(sheet, r, col);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, config.nombreArchivo.slice(0, 31));
  XLSX.writeFile(workbook, `${config.nombreArchivo}-${hoyLocal()}.xlsx`);
}

export function exportTablaReporteCajaChicaPdf(config: TablaReporteCajaChicaConfig) {
  const orientation = config.columnas.length > 5 ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("EMPRESA MINERA MARTE S.R.L.", centerX, 34, { align: "center" });
  doc.setFontSize(10);
  doc.text(config.subtitulo, centerX, 50, { align: "center" });

  const rows: RowInput[] = config.filas.map((fila) => fila as RowInput);
  if (config.filaTotales) rows.push(config.filaTotales as RowInput);

  const columnStyles: Record<number, { halign: "right" }> = {};
  for (const col of config.colsNumericas ?? []) columnStyles[col] = { halign: "right" };

  autoTable(doc, {
    theme: "plain",
    startY: 64,
    head: [config.columnas],
    body: rows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles,
    margin: { left: 30, right: 30 },
    didParseCell: (hook) => {
      if (config.filaTotales && hook.section === "body" && hook.row.index === rows.length - 1) {
        hook.cell.styles.fontStyle = "bold";
      }
    }
  });
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  openBrowserPrintDialog(doc, `${config.nombreArchivo}-${hoyLocal()}.pdf`);
}
