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
  REMESA_SUELDOS: "REMESA PARA PAGO DE SALARIOS",
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

function fechaCorteAnterior(periodoDesde: string) {
  const inicio = parseFecha(periodoDesde);
  const anterior = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate() - 1));
  return diaMesLargo(anterior);
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
// Reporte mensual "CAJA {NOMBRE}" — mismo formato del documento real impreso
// (Fondos Recibidos Debe/Haber, Detalle de Gastos por categoría con
// sub-totales, Total Gastos en el Mes, Saldo Deudor o Acreedor).
// ============================================================================

export function exportReporteRendicionExcel(reporte: ReporteRendicion) {
  const lastCol = 4; // A..E
  const aoa: Array<Array<string | number>> = [
    [cajaLabel(reporte.caja.nombre), "", "", "", ""],
    [`MES DE: ${mesDelAnioLabel(reporte.periodoHasta)}`, "", "", "", ""],
    [reporte.caja.encargadoNombre?.toUpperCase() ?? "", "", "", "", ""],
    [],
    ["FONDOS RECIBIDOS:", "", "", "Bs.", "Bs."],
    ["", "", "", "DEBE", "HABER"],
    [`Saldo deudor al ${fechaCorteAnterior(reporte.periodoDesde)}`, "", "", num(reporte.saldoAnterior), ""],
    ["RECIBIDO EN EFECTIVO:", "", "", "", ""]
  ];
  const rowKinds: Array<"title" | "subtitle" | "encargado" | "section" | "header" | "normal" | "subtotal" | "total"> =
    ["title", "subtitle", "encargado", "normal", "section", "header", "normal", "section"];

  for (const f of reporte.fondos) {
    aoa.push([formatFecha(f.fecha), f.referencia ?? "", TIPO_MOVIMIENTO_LABEL[f.tipo] ?? f.tipo, num(Number(f.monto)), ""]);
    rowKinds.push("normal");
  }
  aoa.push(["", "", "TOTAL", num(reporte.saldoAnterior + reporte.totalFondos), ""]);
  rowKinds.push("subtotal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push(["DETALLE DE GASTOS", "", "", "", ""]);
  rowKinds.push("section");
  aoa.push(["DESCRIPCION", "", "", "FACTURA O RECIBO", "IMPORTE"]);
  rowKinds.push("header");

  for (const grupo of reporte.grupos) {
    aoa.push([grupo.label, "", "", "", ""]);
    rowKinds.push("section");
    for (const g of grupo.gastos) {
      aoa.push([`${g.proveedorNombre}. ${g.glosa}`, "", "", g.numeroRespaldo ?? "", num(Number(g.montoTotal))]);
      rowKinds.push("normal");
    }
    aoa.push(["SUB TOTAL", "", "", "", num(grupo.subtotal)]);
    rowKinds.push("subtotal");
  }

  aoa.push(["TOTAL GASTOS EN EL MES", "", "", "", num(reporte.totalGastos)]);
  rowKinds.push("total");
  aoa.push(["SALDO DEUDOR O ACREEDOR", "", "", "", num(reporte.saldoNuevo)]);
  rowKinds.push("total");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([`Mina ${reporte.caja.nombre}, ${diaMesLargo(new Date(), false)}`, "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([reporte.caja.encargadoNombre ?? "________________________", "", "", "________________________", ""]);
  rowKinds.push("normal");
  aoa.push(["ADMINISTRADOR", "", "", "SUPERINTENDENTE GENERAL", ""]);
  rowKinds.push("normal");

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 16 }];
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 2 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: lastCol } }
  ];

  rowKinds.forEach((kind, index) => {
    const style =
      kind === "title"
        ? titleStyle
        : kind === "subtitle"
          ? { font: { bold: true, sz: 11 }, alignment: { horizontal: "center" } }
          : kind === "encargado"
            ? { font: { bold: true, sz: 10 }, alignment: { horizontal: "center" } }
            : kind === "section"
              ? sectionStyle
              : kind === "header"
                ? headerStyle
                : kind === "subtotal"
                  ? subtotalStyle
                  : kind === "total"
                    ? totalStyle
                    : bodyStyle;
    styleRow(sheet, index, lastCol, style);
  });

  for (let r = 0; r < aoa.length; r += 1) {
    numberFormatCell(sheet, r, 3);
    numberFormatCell(sheet, r, 4);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, `Caja ${reporte.caja.nombre}`.slice(0, 31));
  XLSX.writeFile(workbook, `caja-${reporte.caja.codigo}-${reporte.numero.replace(/\//g, "-")}.xlsx`);
}

export function exportReporteRendicionPdf(reporte: ReporteRendicion) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(cajaLabel(reporte.caja.nombre), centerX, 36, { align: "center" });
  doc.setFontSize(11);
  doc.text(`MES DE: ${mesDelAnioLabel(reporte.periodoHasta)}`, centerX, 52, { align: "center" });
  if (reporte.caja.encargadoNombre) {
    doc.setFontSize(10);
    doc.text(reporte.caja.encargadoNombre.toUpperCase(), centerX, 66, { align: "center" });
  }

  const fondosRows: RowInput[] = [
    [`Saldo deudor al ${fechaCorteAnterior(reporte.periodoDesde)}`, "", "", formatBs(reporte.saldoAnterior), ""],
    ...reporte.fondos.map((f): RowInput => [
      formatFecha(f.fecha),
      f.referencia ?? "",
      TIPO_MOVIMIENTO_LABEL[f.tipo] ?? f.tipo,
      formatBs(Number(f.monto)),
      ""
    ]),
    ["", "", "TOTAL", formatBs(reporte.saldoAnterior + reporte.totalFondos), ""]
  ];

  autoTable(doc, {
    startY: 80,
    head: [["FONDOS RECIBIDOS", "Ref.", "Detalle", "Bs. DEBE", "Bs. HABER"]],
    body: fondosRows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
    margin: { left: 30, right: 30 },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.row.index === fondosRows.length - 1) {
        hook.cell.styles.fontStyle = "bold";
      }
    }
  });

  const afterFondosY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;

  const gastoRows: RowInput[] = [];
  const gastoRowKinds: Array<"group" | "normal" | "subtotal"> = [];
  for (const grupo of reporte.grupos) {
    gastoRows.push([grupo.label, "", ""]);
    gastoRowKinds.push("group");
    for (const g of grupo.gastos) {
      gastoRows.push([`${g.proveedorNombre}. ${g.glosa}`, g.numeroRespaldo ?? "", formatBs(Number(g.montoTotal))]);
      gastoRowKinds.push("normal");
    }
    gastoRows.push(["SUB TOTAL", "", formatBs(grupo.subtotal)]);
    gastoRowKinds.push("subtotal");
  }

  autoTable(doc, {
    startY: afterFondosY + 16,
    head: [["DETALLE DE GASTOS", "Factura o Recibo", "Importe"]],
    body: gastoRows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles: { 2: { halign: "right" } },
    margin: { left: 30, right: 30, bottom: 90 },
    didParseCell: (hook) => {
      if (hook.section !== "body") return;
      const kind = gastoRowKinds[hook.row.index];
      if (kind === "group" || kind === "subtotal") hook.cell.styles.fontStyle = "bold";
    }
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;
  let y = Math.min(finalY + 18, doc.internal.pageSize.getHeight() - 90);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`TOTAL GASTOS EN EL MES: ${formatBs(reporte.totalGastos)}`, 34, y);
  y += 14;
  doc.text(`SALDO DEUDOR O ACREEDOR: ${formatBs(reporte.saldoNuevo)}`, 34, y);
  y += 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Mina ${reporte.caja.nombre}, ${diaMesLargo(new Date(), false)}`, 34, y);

  const pageHeight = doc.internal.pageSize.getHeight();
  const firmaY = pageHeight - 48;
  doc.text(reporte.caja.encargadoNombre ?? "________________________", 60, firmaY);
  doc.text("ADMINISTRADOR", 60, firmaY + 14);
  doc.text("________________________", pageWidth - 200, firmaY);
  doc.text("SUPERINTENDENTE GENERAL", pageWidth - 200, firmaY + 14);

  openBrowserPrintDialog(doc, `caja-${reporte.caja.codigo}-${reporte.numero.replace(/\//g, "-")}.pdf`);
}

// ============================================================================
// Comprobante de Diario — asiento contable de la rendición cerrada, mismo
// formato del comprobante real (folio "P-N/AAAA", cabecera, columnas
// CODIGO/DETALLE/BOLIVIANOS DEBE-HABER/DOLARES DEBE-HABER, TOTALES, SON:,
// firmas). Ver la nota en reportesCajaChica.service.ts (getComprobanteDiario)
// sobre la regla de asiento usada por gasto.
// ============================================================================

export function exportComprobanteDiarioExcel(comprobante: ReporteComprobanteDiario) {
  const lastCol = 5; // A..F: CODIGO, DETALLE, Bs.DEBE, Bs.HABER, $us.DEBE, $us.HABER
  const fin = parseFecha(comprobante.periodoHasta);
  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA MARTE S.R.L.", "", "", "Hoja: 1", "", ""],
    ["La Paz - Bolivia", "", "", "", "", ""],
    [],
    ["COMPROBANTE DE DIARIO", "", "", "", "", ""],
    [`Lugar y Fecha: La Paz, ${diaMesLargo(fin)}`, "", "", `No: ${comprobante.numero}`, "", ""],
    [`A Favor de: ${cajaLabel(comprobante.caja.nombre)}`, "", "", `T/C.Dolar.- ${comprobante.tipoCambio}`, "", ""],
    [`Referencia: DIARIO RENDICION CUENTAS ${cajaLabel(comprobante.caja.nombre)}`, "", "", "", "", ""],
    [],
    [`${cajaLabel(comprobante.caja.nombre)} ${mesDelAnioLabel(comprobante.periodoHasta)}`, "", "", "", "", ""],
    ["CODIGO", "DETALLE", "BOLIVIANOS", "", "DOLARES", ""],
    ["", "", "DEBE", "HABER", "DEBE", "HABER"]
  ];
  const rowKinds: Array<"title-block" | "subtitle" | "section" | "header" | "cuenta" | "sub" | "normal" | "total"> = [
    "title-block",
    "title-block",
    "normal",
    "subtitle",
    "title-block",
    "title-block",
    "title-block",
    "normal",
    "section",
    "header",
    "header"
  ];

  for (const linea of comprobante.lineas) {
    aoa.push([linea.codigo, linea.cuentaNombre, "", "", "", ""]);
    rowKinds.push("cuenta");
    if (linea.centroCodigo) {
      aoa.push(["", `${linea.centroCodigo} ${linea.centroNombre}`, "", "", "", ""]);
      rowKinds.push("sub");
    }
    if (linea.funcionCodigo) {
      aoa.push(["", `${linea.funcionCodigo} ${linea.funcionNombre}`, "", "", "", ""]);
      rowKinds.push("sub");
    }
    aoa.push([
      "",
      linea.detalle,
      linea.debeBs || "",
      linea.haberBs || "",
      linea.debeUsd || "",
      linea.haberUsd || ""
    ]);
    rowKinds.push("normal");
  }

  const totalesRow = aoa.length;
  aoa.push([
    "",
    "TOTALES",
    num(comprobante.totales.debeBs),
    num(comprobante.totales.haberBs),
    num(comprobante.totales.debeUsd),
    num(comprobante.totales.haberUsd)
  ]);
  rowKinds.push("total");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([`SON: ${montoEnLetras(comprobante.totales.debeBs)}`, "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push(["", "", "", "NOMBRE:", "", ""]);
  rowKinds.push("normal");
  aoa.push(["", "", "", "CI.:", "", ""]);
  rowKinds.push("normal");
  aoa.push(["", "", "", "FIRMA:", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push(["PREPARADO POR", "CONTADOR", "", "PRESIDENCIA", "", "INTERESADO"]);
  rowKinds.push("section");

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 14 }, { wch: 34 }, { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 12 }];
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } },
    { s: { r: 4, c: 3 }, e: { r: 4, c: lastCol } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 2 } },
    { s: { r: 5, c: 3 }, e: { r: 5, c: lastCol } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: lastCol } },
    { s: { r: 8, c: 0 }, e: { r: 8, c: lastCol } },
    { s: { r: 9, c: 0 }, e: { r: 10, c: 0 } },
    { s: { r: 9, c: 1 }, e: { r: 10, c: 1 } },
    { s: { r: 9, c: 2 }, e: { r: 9, c: 3 } },
    { s: { r: 9, c: 4 }, e: { r: 9, c: 5 } },
    { s: { r: totalesRow + 2, c: 0 }, e: { r: totalesRow + 2, c: lastCol } }
  ];

  rowKinds.forEach((kind, index) => {
    const style =
      kind === "title-block"
        ? { font: { sz: 10 } }
        : kind === "subtitle"
          ? titleStyle
          : kind === "section"
            ? sectionStyle
            : kind === "header"
              ? headerStyle
              : kind === "cuenta"
                ? { font: { bold: true, sz: 9 }, border: thinBorder }
                : kind === "sub"
                  ? { font: { sz: 9, italic: true }, alignment: { indent: 2 }, border: thinBorder }
                  : kind === "total"
                    ? totalStyle
                    : bodyStyle;
    styleRow(sheet, index, lastCol, style);
  });

  // Alinea a la derecha "Hoja:", "No:" y "T/C" — quedan en la mitad derecha
  // fusionada de su fila, igual que en el comprobante real.
  for (const [row, col] of [
    [0, 3],
    [4, 3],
    [5, 3]
  ]) {
    const address = XLSX.utils.encode_cell({ r: row, c: col });
    setStyle(sheet, address, { font: { sz: 10 }, alignment: { horizontal: "right" } });
  }

  for (let r = 0; r < aoa.length; r += 1) {
    for (const col of [2, 3, 4, 5]) numberFormatCell(sheet, r, col);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Comprobante de Diario".slice(0, 31));
  XLSX.writeFile(workbook, `comprobante-diario-${comprobante.caja.codigo}-${comprobante.numero.replace(/\//g, "-")}.xlsx`);
}

export function exportComprobanteDiarioPdf(comprobante: ReporteComprobanteDiario) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const fin = parseFecha(comprobante.periodoHasta);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("EMPRESA MINERA MARTE S.R.L.", 34, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("La Paz - Bolivia", 34, 44);
  doc.text(`Hoja: 1`, pageWidth - 60, 32);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("COMPROBANTE DE DIARIO", centerX, 66, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let y = 84;
  doc.text(`Lugar y Fecha: La Paz, ${diaMesLargo(fin)}`, 34, y);
  doc.text(`No: ${comprobante.numero}`, pageWidth - 34, y, { align: "right" });
  y += 13;
  doc.text(`A Favor de: ${cajaLabel(comprobante.caja.nombre)}`, 34, y);
  doc.text(`T/C.Dolar.- ${comprobante.tipoCambio}`, pageWidth - 34, y, { align: "right" });
  y += 13;
  doc.text(`Referencia: DIARIO RENDICION CUENTAS ${cajaLabel(comprobante.caja.nombre)}`, 34, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text(`${cajaLabel(comprobante.caja.nombre)} ${mesDelAnioLabel(comprobante.periodoHasta)}`, 34, y);
  y += 10;

  const rows: RowInput[] = [];
  const rowKinds: Array<"cuenta" | "sub" | "normal"> = [];
  for (const linea of comprobante.lineas) {
    rows.push([linea.codigo, linea.cuentaNombre, "", "", "", ""]);
    rowKinds.push("cuenta");
    if (linea.centroCodigo) {
      rows.push(["", `${linea.centroCodigo} ${linea.centroNombre}`, "", "", "", ""]);
      rowKinds.push("sub");
    }
    if (linea.funcionCodigo) {
      rows.push(["", `${linea.funcionCodigo} ${linea.funcionNombre}`, "", "", "", ""]);
      rowKinds.push("sub");
    }
    rows.push([
      "",
      linea.detalle,
      linea.debeBs ? formatBs(linea.debeBs) : "",
      linea.haberBs ? formatBs(linea.haberBs) : "",
      linea.debeUsd ? formatBs(linea.debeUsd) : "",
      linea.haberUsd ? formatBs(linea.haberUsd) : ""
    ]);
    rowKinds.push("normal");
  }
  rows.push([
    "",
    "TOTALES",
    formatBs(comprobante.totales.debeBs),
    formatBs(comprobante.totales.haberBs),
    formatBs(comprobante.totales.debeUsd),
    formatBs(comprobante.totales.haberUsd)
  ]);
  rowKinds.push("normal");

  autoTable(doc, {
    startY: y + 6,
    head: [
      [
        { content: "CODIGO", rowSpan: 2 },
        { content: "DETALLE", rowSpan: 2 },
        { content: "BOLIVIANOS", colSpan: 2 },
        { content: "DOLARES", colSpan: 2 }
      ],
      [
        { content: "DEBE" },
        { content: "HABER" },
        { content: "DEBE" },
        { content: "HABER" }
      ]
    ] as unknown as RowInput[],
    body: rows,
    styles: { ...pdfTableStyles, fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { ...pdfHeadStyles, halign: "center" },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    margin: { left: 30, right: 30, bottom: 90 },
    didParseCell: (hook) => {
      if (hook.section !== "body") return;
      const kind = rowKinds[hook.row.index];
      if (kind === "cuenta") hook.cell.styles.fontStyle = "bold";
      if (kind === "sub") hook.cell.styles.fontStyle = "italic";
      if (hook.row.index === rows.length - 1) hook.cell.styles.fontStyle = "bold";
    }
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  const sonY = Math.min(finalY + 16, doc.internal.pageSize.getHeight() - 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`SON: ${montoEnLetras(comprobante.totales.debeBs)}`, 34, sonY);

  const pageHeight = doc.internal.pageSize.getHeight();
  const cajaBoxX = pageWidth - 200;
  let cajaBoxY = sonY + 20;
  doc.setFontSize(8);
  doc.text("NOMBRE: ________________________", cajaBoxX, cajaBoxY);
  cajaBoxY += 13;
  doc.text("CI.: ________________________", cajaBoxX, cajaBoxY);
  cajaBoxY += 13;
  doc.text("FIRMA: ________________________", cajaBoxX, cajaBoxY);

  const firmaY = pageHeight - 40;
  doc.setFontSize(8);
  doc.text("PREPARADO POR", 40, firmaY);
  doc.text("CONTADOR", 170, firmaY);
  doc.text("PRESIDENCIA", 290, firmaY);
  doc.text("INTERESADO", 420, firmaY);

  openBrowserPrintDialog(doc, `comprobante-diario-${comprobante.caja.codigo}-${comprobante.numero.replace(/\//g, "-")}.pdf`);
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
  XLSX.writeFile(workbook, `saldo-movimientos-${estado.caja.codigo}-${new Date().toISOString().slice(0, 10)}.xlsx`);
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

  openBrowserPrintDialog(doc, `saldo-movimientos-${estado.caja.codigo}-${new Date().toISOString().slice(0, 10)}.pdf`);
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
  XLSX.writeFile(workbook, `resumen-retenciones-${new Date().toISOString().slice(0, 10)}.xlsx`);
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

  openBrowserPrintDialog(doc, `resumen-retenciones-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============================================================================
// Planilla de Control de Pagos — presupuesto vs. gastado por partida, con
// saldo a favor (presupuestado - gastado), igual a la planilla real.
// ============================================================================

function ejecucion(item: PartidaPresupuestoCaja) {
  return {
    presupuestado: Number(item.montoPresupuestado),
    pagado: item.totalPagado ?? 0,
    gastado: item.totalGastado ?? 0,
    saldo: item.saldoAFavor ?? Number(item.montoPresupuestado) - (item.totalGastado ?? 0),
    ejecucion: item.porcentajeEjecucion ?? 0
  };
}

export function exportPlanillaControlPagosExcel(partidas: PartidaPresupuestoCaja[], periodoLabel: string) {
  const lastCol = 5;
  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA MARTE S.R.L.", "", "", "", "", ""],
    [`PLANILLA DE CONTROL DE PAGOS · ${periodoLabel.toUpperCase()}`, "", "", "", "", ""],
    [],
    ["DESCRIPCIÓN", "CAJA", "TOTAL PRESUPUESTADO", "TOTAL PAGADO", "TOTAL GASTADO", "SALDO A FAVOR"]
  ];

  let totalPresupuestado = 0;
  let totalPagado = 0;
  let totalGastado = 0;
  let totalSaldo = 0;

  for (const partida of partidas) {
    const e = ejecucion(partida);
    totalPresupuestado += e.presupuestado;
    totalPagado += e.pagado;
    totalGastado += e.gastado;
    totalSaldo += e.saldo;
    aoa.push([partida.descripcion, partida.caja?.nombre ?? "", num(e.presupuestado), num(e.pagado), num(e.gastado), num(e.saldo)]);
  }
  aoa.push(["TOTAL", "", num(totalPresupuestado), num(totalPagado), num(totalGastado), num(totalSaldo)]);

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 34 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }
  ];
  styleRow(sheet, 0, lastCol, titleStyle);
  styleRow(sheet, 1, lastCol, { font: { bold: true, sz: 11 }, alignment: { horizontal: "center" } });
  styleRow(sheet, 3, lastCol, headerStyle);
  for (let r = 4; r < aoa.length - 1; r += 1) styleRow(sheet, r, lastCol, bodyStyle);
  styleRow(sheet, aoa.length - 1, lastCol, totalStyle);
  for (const col of [2, 3, 4, 5]) {
    for (let r = 0; r < aoa.length; r += 1) numberFormatCell(sheet, r, col);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Control de Pagos".slice(0, 31));
  XLSX.writeFile(workbook, `planilla-control-pagos-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
  let totalPagado = 0;
  let totalGastado = 0;
  let totalSaldo = 0;

  const rows: RowInput[] = partidas.map((partida) => {
    const e = ejecucion(partida);
    totalPresupuestado += e.presupuestado;
    totalPagado += e.pagado;
    totalGastado += e.gastado;
    totalSaldo += e.saldo;
    return [
      partida.descripcion,
      partida.caja?.nombre ?? "",
      formatBs(e.presupuestado),
      formatBs(e.pagado),
      formatBs(e.gastado),
      formatBs(e.saldo),
      `${e.ejecucion.toFixed(1)}%`
    ];
  });
  rows.push(["TOTAL", "", formatBs(totalPresupuestado), formatBs(totalPagado), formatBs(totalGastado), formatBs(totalSaldo), ""]);

  autoTable(doc, {
    startY: 60,
    head: [["Descripción", "Caja", "Total Presupuestado", "Total Pagado", "Total Gastado", "Saldo a Favor", "% Ejecución"]],
    body: rows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" }
    },
    margin: { left: 30, right: 30 },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.row.index === rows.length - 1) hook.cell.styles.fontStyle = "bold";
    }
  });

  openBrowserPrintDialog(doc, `planilla-control-pagos-${new Date().toISOString().slice(0, 10)}.pdf`);
}
