import * as XLSX from "xlsx-js-style";
import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import type {
  BinCardItem,
  BinCardValoradoItem,
  ComprasReportResponse,
  ComprasProveedorReportResponse,
  DetalleMaterialesReportResponse,
  DiarioAlmacenesReportResponse,
  StockReportResponse,
  ValesReportResponse
} from "@/features/reportes/model/reportes.schema";
import type {
  InventoryReportDefinition,
  InventoryReportType
} from "@/features/reportes/lib/inventoryReportBuilder";

function safeFileToken(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatCellValue(value: string | number) {
  if (typeof value === "number") {
    return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return value;
}

function formatInventoryDate(value: string) {
  const midnightUtcMatch = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/.exec(value);
  if (midnightUtcMatch) {
    const [, year, month, day] = midnightUtcMatch;
    return `${day}/${month}/${year}`;
  }
  return new Date(value).toLocaleString("es-BO");
}

function monthLabelFromSubtitle(subtitle?: string) {
  if (!subtitle) return "CORRESPONDIENTE AL PERIODO SELECCIONADO";
  const clean = subtitle.replace(/^Correspondiente a:\s*/i, "").trim();
  if (!clean || clean.toLowerCase() === "sin filtro")
    return "CORRESPONDIENTE AL PERIODO SELECCIONADO";
  return `CORRESPONDIENTE A ${clean.toUpperCase()}`;
}

const MONTH_NAMES = [
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

function comprasProveedorPeriodLabel(fechaInicio: string, fechaFin: string) {
  const source = fechaFin || fechaInicio;
  if (!source) return "PERIODO SELECCIONADO";
  const date = new Date(`${source}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "PERIODO SELECCIONADO";
  return `MES DE  ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function asExcelNumber(value: number) {
  return Number(value.toFixed(2));
}

function asOptionalExcelNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? asExcelNumber(value) : "";
}

function safeSheetName(value: string, fallback: string) {
  const cleaned = value.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || fallback).slice(0, 31);
}

function uniqueSheetName(baseName: string, usedNames: Set<string>) {
  const safeBase = safeSheetName(baseName, "Hoja");
  let name = safeBase;
  let index = 2;
  while (usedNames.has(name)) {
    const suffix = ` ${index}`;
    name = `${safeBase.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }
  usedNames.add(name);
  return name;
}

function workbookYear(anio: number) {
  return String(anio).replace(/^(\d)(\d{3})$/, "$1.$2");
}

function monthPhrase(anio: number, mes: number) {
  return `EL MES "${MONTH_NAMES[Math.max(0, Math.min(11, mes - 1))]}" ${workbookYear(anio)}`;
}

function previousMonthEndLabel(anio: number, mes: number) {
  const date = new Date(anio, mes - 1, 0);
  return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()].toLowerCase()} de ${date.getFullYear()}`;
}

function monthTitleCase(anio: number, mes: number) {
  const month = MONTH_NAMES[Math.max(0, Math.min(11, mes - 1))].toLowerCase();
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${anio}`;
}

function integerToSpanishWords(value: number): string {
  const units = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const teens = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const tens = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const hundreds = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  const underHundred = (n: number): string => {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n === 20) return "VEINTE";
    if (n < 30) return `VEINTI${units[n - 20]}`;
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    return unit ? `${tens[ten]} Y ${units[unit]}` : tens[ten];
  };
  const underThousand = (n: number): string => {
    if (n === 0) return "";
    if (n === 100) return "CIEN";
    if (n < 100) return underHundred(n);
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return `${hundreds[hundred]} ${underHundred(rest)}`.trim();
  };

  if (value === 0) return "CERO";
  if (value < 1000) return underThousand(value);
  if (value < 1000000) {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    return `${thousands === 1 ? "MIL" : `${underThousand(thousands)} MIL`} ${underThousand(rest)}`.trim();
  }
  const millions = Math.floor(value / 1000000);
  const rest = value % 1000000;
  return `${millions === 1 ? "UN MILLON" : `${integerToSpanishWords(millions)} MILLONES`} ${integerToSpanishWords(rest)}`.trim();
}

function bolivianosLiteral(value: number) {
  const integer = Math.floor(Math.abs(value));
  const cents = Math.round((Math.abs(value) - integer) * 100);
  return `Son: ${integerToSpanishWords(integer)} ${String(cents).padStart(2, "0")}/100 Bolivianos`;
}

function costoSheetName(cuenta: {
  codigoCompleto?: string | null;
  centroCostoNombre?: string | null;
  funcionGastoNombre?: string | null;
  vehiculo?: string | null;
  esTransporte?: boolean;
}) {
  const code = (cuenta.codigoCompleto ?? "").replace(/[^\d]/g, "");
  const text = `${cuenta.centroCostoNombre ?? ""} ${cuenta.funcionGastoNombre ?? ""} ${cuenta.vehiculo ?? ""}`.toUpperCase();
  if (code.includes("22001008") || text.includes("TRANSPORTISTAS VARIOS") || text.includes("TRANSPORTE VARIOS"))
    return "ROMARESNI";
  if (code.includes("67001009") || code.includes("22001009") || text.includes("EMUSA")) return "EMUSA";
  if (code.includes("67001010") || code.includes("22001010") || text.includes("PUNTUALIDAD")) return "PUNTUALIDAD";
  if (code.includes("35001000") || text.includes("MAQUINARIAS")) return "MAQUINARIA Y EQUIPO";
  if (code.includes("104001000") || text.includes("MEDIO AMBIENTE") || text.includes("M.A.")) return "MA-HSI (3)";
  if (code.includes("44002000") || code.includes("044002000") || text.includes("CONSTRUCCION")) return "CONSTRUCCION-25";
  return "LIPEÑA";
}

function costoSheetMeta(sheetName: string) {
  if (sheetName === "ROMARESNI") {
    return {
      title: "DETALLE DE MATERIALES  EMPRESA CONST. ROMARESNI S.R.L.",
      codeLine: "22,001,008    CTAS.CTES.EMPRESA CONST. ROMARESNI S.R.L.",
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
  return {
    subCuenta: parts[0] ?? "",
    subCentro: parts[1] ?? ""
  };
}

function costoDetalleResumenLabel(cuenta: {
  lineas: Array<{ subCentroNombre?: string | null }>;
  funcionGastoNombre?: string | null;
  centroCostoNombre?: string | null;
}) {
  return (
    cuenta.lineas.find((linea) => Boolean(linea.subCentroNombre))?.subCentroNombre ??
    cuenta.funcionGastoNombre ??
    cuenta.centroCostoNombre ??
    ""
  ).toUpperCase();
}

function costoDetalleResumenDestinatario(cuenta: {
  funcionGastoNombre?: string | null;
  centroCostoNombre?: string | null;
  vehiculo?: string | null;
}) {
  return (
    cuenta.funcionGastoNombre ??
    cuenta.centroCostoNombre ??
    cuenta.vehiculo ??
    ""
  ).toUpperCase();
}

function saveSimpleWorkbook(params: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  columns: Array<{ wch: number }>;
  fileToken: string;
  footerRows?: Array<Array<string | number>>;
}) {
  const lastCol = Math.max(params.headers.length - 1, 1);
  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA MARTE S.R.L."],
    [params.title.toUpperCase()],
    [params.subtitle ?? ""],
    [],
    params.headers,
    ...params.rows,
    ...(params.footerRows?.length ? [[], ...params.footerRows] : [])
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } }
  ];
  sheet["!cols"] = params.columns;
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 4, c: 0 },
      e: { r: Math.max(4, 4 + params.rows.length), c: lastCol }
    })
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, params.title.slice(0, 31));
  XLSX.writeFile(workbook, `${params.fileToken}-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      throw new Error("No se pudo abrir el diálogo de impresión. Se descargó el PDF.");
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

function drawSignatures(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const y = pageHeight - 48;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("JEFE DE ALMACENES", 80, y);
  doc.text("JEFE DE OFICINAS", pageWidth / 2 - 52, y);
  doc.text("SUPDTE. GENERAL", pageWidth - 170, y);
}

function drawMainHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  // doc.text("EMPRESA MINERA", 40, 34);
  // doc.text("MARTE S.R.L.", 40, 54);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title.toUpperCase(), centerX, 44, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(monthLabelFromSubtitle(subtitle), centerX, 60, { align: "center" });
  doc.text("(Expresado en bolivianos)", centerX, 74, { align: "center" });
}

function orientationByReport(type?: InventoryReportType) {
  if (!type) return "portrait" as const;
  // Unificar salida en vertical para todos los reportes.
  if (type) return "portrait" as const;
  return "portrait" as const;
}

function savePdfTable(params: {
  type?: InventoryReportType;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  summary?: Array<{ label: string; value: string | number }>;
  fileName: string;
  rowKinds?: Array<"normal" | "group" | "subtotal" | "total">;
}) {
  const doc = new jsPDF({
    orientation: orientationByReport(params.type),
    unit: "pt",
    format: "a4"
  });

  drawMainHeader(doc, params.title, params.subtitle);

  const body = params.rows.map((row) => row.map((cell) => formatCellValue(cell)));

  autoTable(doc, {
    startY: 86,
    head: [params.headers],
    body: body as RowInput[],
    styles: {
      fontSize: 8,
      cellPadding: 3.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
      textColor: [20, 20, 20]
    },
    headStyles: {
      fillColor: [235, 223, 206],
      textColor: [20, 20, 20],
      fontStyle: "bold",
      lineWidth: 0.5
    },
    margin: { left: 30, right: 30, bottom: 62 },
    didParseCell: (hook) => {
      if (hook.section !== "body" || !params.rowKinds) return;
      const kind = params.rowKinds[hook.row.index];
      if (kind === "group") {
        hook.cell.styles.fillColor = [54, 92, 121];
        hook.cell.styles.textColor = [255, 255, 255];
        hook.cell.styles.fontStyle = "bold";
      }
      if (kind === "subtotal") {
        hook.cell.styles.fillColor = [244, 230, 176];
        hook.cell.styles.fontStyle = "bold";
      }
      if (kind === "total") {
        hook.cell.styles.fillColor = [233, 212, 112];
        hook.cell.styles.fontStyle = "bold";
      }
    }
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;

  if (params.summary?.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let y = Math.min(finalY + 16, doc.internal.pageSize.getHeight() - 92);
    for (const item of params.summary) {
      doc.text(`${item.label}: ${formatCellValue(item.value)}`, 34, y);
      y += 13;
    }
  }

  drawSignatures(doc);
  openBrowserPrintDialog(doc, params.fileName);
}

type StyledCell = string | number;

function setCellStyle(
  sheet: XLSX.WorkSheet,
  address: string,
  style: Record<string, unknown>,
  value?: StyledCell
) {
  if (!sheet[address]) sheet[address] = { t: typeof value === "number" ? "n" : "s", v: value ?? "" };
  sheet[address].s = style;
}

function styleRange(
  sheet: XLSX.WorkSheet,
  range: XLSX.Range,
  style: Record<string, unknown>,
  numericColumns: Set<number> = new Set(),
  numberFormat = "#,##0.00"
) {
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const current = sheet[address];
      setCellStyle(sheet, address, {
        ...style,
        ...(numericColumns.has(col) && typeof current?.v === "number" ? { numFmt: numberFormat } : {})
      });
    }
  }
}

function reportColumnWidths(report: InventoryReportDefinition) {
  if (report.type === "balance-mensual") {
    return [{ wch: 12 }, { wch: 19 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  }
  if (report.type === "inventario-general") {
    return [
      { wch: 12 },
      { wch: 14 },
      { wch: 44 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 }
    ];
  }
  if (report.type === "inventarios-suministros") {
    return [
      { wch: 11 },
      { wch: 28 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 46 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 }
    ];
  }
  if (report.type === "diario-almacenes") {
    return [
      { wch: 11 },
      { wch: 14 },
      { wch: 48 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 }
    ];
  }
  if (report.type === "detalle-materiales") {
    return [{ wch: 11 }, { wch: 12 }, { wch: 16 }, { wch: 15 }, { wch: 28 }];
  }
  return report.columns.map((column) => {
    if (column.align === "right") return { wch: 16 };
    if (column.label.toLowerCase().includes("descripcion")) return { wch: 48 };
    return { wch: 22 };
  });
}

function applyAdministrativeWorkbookStyle(
  sheet: XLSX.WorkSheet,
  report: InventoryReportDefinition,
  rowStart: number,
  rowCount: number
) {
  const lastCol = Math.max(report.columns.length - 1, 1);
  const numericColumns = new Set(
    report.columns
      .map((column, index) => (column.align === "right" ? index : -1))
      .filter((index) => index >= 0)
  );
  const thinBorder = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
  };
  const titleStyle = {
    font: { bold: true, sz: 13, underline: true },
    alignment: { horizontal: "center", vertical: "center" }
  };
  const subtitleStyle = {
    font: { bold: true, sz: 11 },
    alignment: { horizontal: "center", vertical: "center" }
  };
  const headerFill =
    report.type === "inventario-general" ? "F4B183" : report.type === "balance-mensual" ? "FFFFFF" : "F2F2F2";
  const headerStyle = {
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: headerFill } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: thinBorder
  };
  const bodyStyle = {
    font: { sz: 10 },
    alignment: { vertical: "center", wrapText: true },
    border: thinBorder
  };
  const groupStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
    fill: { fgColor: { rgb: "002F6C" } },
    alignment: { vertical: "center", wrapText: true },
    border: thinBorder
  };
  const subtotalStyle = {
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: "FFF200" } },
    alignment: { vertical: "center", wrapText: true },
    border: thinBorder
  };
  const totalStyle = {
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: "FFE699" } },
    alignment: { vertical: "center", wrapText: true },
    border: thinBorder
  };

  styleRange(sheet, { s: { r: 0, c: 0 }, e: { r: 2, c: lastCol } }, titleStyle);
  styleRange(sheet, { s: { r: 4, c: 0 }, e: { r: 4, c: lastCol } }, headerStyle);
  styleRange(
    sheet,
    { s: { r: rowStart, c: 0 }, e: { r: rowStart + rowCount - 1, c: lastCol } },
    bodyStyle,
    numericColumns
  );

  report.rows.forEach((row, index) => {
    if (!row.type) return;
    const style = row.type === "group" ? groupStyle : row.type === "subtotal" ? subtotalStyle : totalStyle;
    styleRange(
      sheet,
      { s: { r: rowStart + index, c: 0 }, e: { r: rowStart + index, c: lastCol } },
      style,
      numericColumns
    );
  });

  styleRange(sheet, { s: { r: 1, c: 0 }, e: { r: 2, c: lastCol } }, subtitleStyle);
  sheet["!cols"] = reportColumnWidths(report);
  sheet["!rows"] = [
    { hpt: 20 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 8 },
    { hpt: 28 },
    ...report.rows.map(() => ({ hpt: 18 }))
  ];
}

const excelThinBorder = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } }
};

const excelTitleStyle = {
  font: { bold: true, sz: 12, underline: true },
  alignment: { horizontal: "center", vertical: "center" }
};

const excelHeaderStyle = {
  font: { bold: true, sz: 10 },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: excelThinBorder
};

const excelBodyStyle = {
  font: { sz: 10 },
  alignment: { vertical: "center", wrapText: true },
  border: excelThinBorder
};

function cellAddress(row: number, col: number) {
  return XLSX.utils.encode_cell({ r: row, c: col });
}

function appendAndSaveStyledSheet(params: {
  sheet: XLSX.WorkSheet;
  sheetName: string;
  fileToken: string;
}) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, params.sheet, params.sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${params.fileToken}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function valueOf(row: { values: Record<string, string | number> }, key: string) {
  return row.values[key] ?? "";
}

function numberFormatRange(
  sheet: XLSX.WorkSheet,
  startRow: number,
  endRow: number,
  columns: number[],
  numberFormat = "#,##0.00"
) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (const col of columns) {
      const address = cellAddress(row, col);
      if (sheet[address] && typeof sheet[address].v === "number") {
        sheet[address].s = { ...(sheet[address].s ?? {}), numFmt: numberFormat };
      }
    }
  }
}

function exportBalanceMensualStyledExcel(report: InventoryReportDefinition) {
  const dataRows = report.rows.filter((row) => row.values.grupo);
  const periodValue = String(
    report.rows.find((row) => row.values.periodo)?.values.periodo ?? report.subtitle ?? ""
  );
  const periodMatch = /(\d{1,2})\/(\d{4})/.exec(periodValue);
  const periodMonth = periodMatch ? Number(periodMatch[1]) : undefined;
  const periodYear = periodMatch ? Number(periodMatch[2]) : undefined;
  const dateLabel = (date: Date) =>
    `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  const startDateLabel =
    periodMonth && periodYear ? dateLabel(new Date(periodYear, periodMonth - 1, 0)) : "";
  const endDateLabel = periodMonth && periodYear ? dateLabel(new Date(periodYear, periodMonth, 0)) : "";
  const periodSubtitle =
    periodMonth && periodYear
      ? `CORRESPONDIENTE AL MES DE ${MONTH_NAMES[Math.max(0, Math.min(11, periodMonth - 1))]}  ${periodYear}`
      : monthLabelFromSubtitle(report.subtitle);
  const groupLabel = (value: string | number) => {
    const raw = String(value ?? "").trim();
    if (/^TOTAL/i.test(raw)) return raw;
    const code = raw.match(/\d+/)?.[0] ?? raw;
    return code ? code.padStart(2, "0") : raw;
  };
  const rows = dataRows.map((row) => [
    groupLabel(valueOf(row, "grupo")),
    valueOf(row, "saldoInicial"),
    valueOf(row, "ingresoMateriales"),
    valueOf(row, "salidaMateriales"),
    valueOf(row, "saldoFinal")
  ]);
  const aoa: Array<Array<string | number>> = [
    ["Empresa Minera", "", "", "", ""],
    ["MARTE S.R.L.", "", "", "", ""],
    [],
    ["BALANCE MENSUAL DE ALMACENES LIPEÑA", "", "", "", ""],
    [periodSubtitle, "", "", "", ""],
    [],
    [
      "GRUPO",
      `SALDO  AL\n${startDateLabel}`,
      "INGRESO\nMATERIALES",
      "SALIDA\nMATERIALES",
      `SALDO  AL\n${endDateLabel}`
    ],
    ...rows
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const headerRow = 6;
  const bodyStartRow = 7;
  const bodyEndRow = bodyStartRow + rows.length - 1;
  const black = { rgb: "000000" };
  const thin = { style: "thin", color: black };
  const dotted = { style: "dotted", color: black };
  const bodyBorder = {
    top: dotted,
    bottom: dotted,
    left: thin,
    right: thin
  };
  const tableFont = { name: "Arial", sz: 10 };
  sheet["!merges"] = [
    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } }
  ];
  sheet["!cols"] = [{ wch: 10 }, { wch: 19 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  sheet["!rows"] = [
    { hpt: 23 },
    { hpt: 34 },
    { hpt: 8 },
    { hpt: 19 },
    { hpt: 19 },
    { hpt: 8 },
    { hpt: 31 },
    ...rows.map(() => ({ hpt: 16 }))
  ];
  sheet["!margins"] = { left: 0.25, right: 0.25, top: 0.45, bottom: 0.35, header: 0.2, footer: 0.2 };
  sheet["!pageSetup"] = { orientation: "portrait", fitToWidth: 1, fitToHeight: 0 };
  setCellStyle(sheet, "A1", { font: { name: "Arial", bold: true, sz: 18 } });
  setCellStyle(sheet, "A2", { font: { name: "Arial", bold: true, sz: 28, underline: true } });
  styleRange(sheet, { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } }, {
    font: { name: "Arial", bold: true, sz: 11 },
    alignment: { horizontal: "center", vertical: "center" }
  });
  styleRange(sheet, { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } }, {
    font: { name: "Arial", bold: true, sz: 11, underline: true },
    alignment: { horizontal: "center", vertical: "center" }
  });
  styleRange(sheet, { s: { r: headerRow, c: 0 }, e: { r: headerRow, c: 4 } }, {
    font: { name: "Arial", bold: true, sz: 10 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: excelThinBorder
  });
  setCellStyle(sheet, cellAddress(headerRow, 4), {
    font: { name: "Arial", bold: true, sz: 10 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: excelThinBorder,
    fill: { fgColor: { rgb: "BFBFBF" } }
  });
  if (rows.length) {
    styleRange(sheet, { s: { r: bodyStartRow, c: 0 }, e: { r: bodyEndRow, c: 4 } }, {
      font: tableFont,
      alignment: { vertical: "center", wrapText: true },
      border: bodyBorder
    });
    styleRange(sheet, { s: { r: bodyStartRow, c: 0 }, e: { r: bodyEndRow, c: 0 } }, {
      font: tableFont,
      alignment: { horizontal: "center", vertical: "center" },
      border: bodyBorder
    });
    styleRange(sheet, { s: { r: bodyStartRow, c: 1 }, e: { r: bodyEndRow, c: 4 } }, {
      font: tableFont,
      alignment: { horizontal: "right", vertical: "center" },
      border: bodyBorder
    });
  }
  numberFormatRange(sheet, bodyStartRow, bodyEndRow, [1, 2, 3, 4]);
  dataRows.forEach((row, index) => {
    if (!row.type) return;
    const fill = row.type === "total" ? "FFE699" : "F2F2F2";
    styleRange(
      sheet,
      { s: { r: bodyStartRow + index, c: 0 }, e: { r: bodyStartRow + index, c: 4 } },
      {
        font: { name: "Arial", bold: true, sz: 10 },
        alignment: { vertical: "center", wrapText: true },
        border: excelThinBorder,
        fill: { fgColor: { rgb: fill } }
      },
      new Set([1, 2, 3, 4])
    );
  });
  appendAndSaveStyledSheet({ sheet, sheetName: "Balance Mensual", fileToken: "balance-mensual-almacenes" });
}

function exportInventarioGeneralStyledExcel(report: InventoryReportDefinition) {
  const rows = report.rows
    .filter((row) => row.values.codigo || row.values.descripcion)
    .map((row) => [
      valueOf(row, "codigo"),
      valueOf(row, "descripcion"),
      valueOf(row, "unidad"),
      valueOf(row, "saldoFinal"),
      valueOf(row, "precioUnit"),
      valueOf(row, "totalBs")
    ]);
  const aoa: Array<Array<string | number>> = [
    ["INVENTARIO DE ALMACEN GENERAL MINA LA LIPEÑA"],
    [monthLabelFromSubtitle(report.subtitle)],
    ["(Expresado en bolivianos)"],
    [],
    ["", "", "UNIDAD", "SALDOS DEL MES", "", ""],
    ["", "", "UNIDAD", "CANTIDAD", "P. UNIT.", "TOTAL"],
    ...rows
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    { s: { r: 4, c: 3 }, e: { r: 4, c: 5 } }
  ];
  sheet["!cols"] = [{ wch: 13 }, { wch: 43 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
  styleRange(sheet, { s: { r: 0, c: 0 }, e: { r: 2, c: 5 } }, excelTitleStyle);
  styleRange(sheet, { s: { r: 4, c: 0 }, e: { r: 5, c: 5 } }, excelHeaderStyle);
  styleRange(sheet, { s: { r: 4, c: 3 }, e: { r: 5, c: 5 } }, {
    ...excelHeaderStyle,
    fill: { fgColor: { rgb: "F4B183" } }
  });
  styleRange(sheet, { s: { r: 6, c: 0 }, e: { r: 5 + rows.length, c: 5 } }, excelBodyStyle);
  numberFormatRange(sheet, 6, 5 + rows.length, [3, 4, 5]);
  report.rows
    .filter((row) => row.values.codigo || row.values.descripcion)
    .forEach((row, index) => {
      const excelRow = 6 + index;
      if (row.type === "group") {
        styleRange(sheet, { s: { r: excelRow, c: 0 }, e: { r: excelRow, c: 1 } }, {
          ...excelBodyStyle,
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
          fill: { fgColor: { rgb: "002F6C" } }
        });
        styleRange(sheet, { s: { r: excelRow, c: 2 }, e: { r: excelRow, c: 5 } }, {
          ...excelBodyStyle,
          fill: { fgColor: { rgb: "F4B183" } }
        });
      } else {
        styleRange(sheet, { s: { r: excelRow, c: 3 }, e: { r: excelRow, c: 5 } }, {
          ...excelBodyStyle,
          fill: { fgColor: { rgb: row.type === "total" || row.type === "subtotal" ? "FFF200" : "F4B183" } }
        }, new Set([3, 4, 5]));
      }
    });
  appendAndSaveStyledSheet({ sheet, sheetName: "Inventario Almacen", fileToken: "inventario-almacen-general" });
}

function exportCuadroSuministrosStyledExcel(report: InventoryReportDefinition) {
  const outputRows: Array<Array<string | number>> = [];
  const sourceRows: Array<"normal" | "total"> = [];
  let proveedor = "";
  let providerPrinted = false;

  for (const row of report.rows) {
    if (row.type === "group" && row.values.proveedor) {
      proveedor = String(row.values.proveedor);
      providerPrinted = false;
      continue;
    }
    if (row.type === "group") continue;
    if (row.type === "total") {
      outputRows.push(["", "", "", "", "TOTAL GENERAL", valueOf(row, "totalBs"), valueOf(row, "sinIvaBs"), ""]);
      sourceRows.push("total");
      continue;
    }
    outputRows.push([
      providerPrinted ? "" : proveedor,
      valueOf(row, "factura"),
      valueOf(row, "cantidad"),
      valueOf(row, "unidad"),
      valueOf(row, "descripcion"),
      valueOf(row, "totalBs"),
      valueOf(row, "sinIvaBs"),
      valueOf(row, "grupo")
    ]);
    providerPrinted = true;
    sourceRows.push("normal");
  }

  const aoa: Array<Array<string | number>> = [
    ["CUADRO DE INVENTARIOS Y SUMINISTROS CORRESPONDIENTE AL", monthLabelFromSubtitle(report.subtitle)],
    [],
    ["P R O V E E D O R", "No\nFACTU", "CANTID.", "UNIDA", "D E S C R I P C I O N", "F-total\nBs", "(-13%)\nBs", "GRUPO"],
    ...outputRows
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
  sheet["!cols"] = [
    { wch: 28 },
    { wch: 10 },
    { wch: 9 },
    { wch: 9 },
    { wch: 42 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 }
  ];
  styleRange(sheet, { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, excelTitleStyle);
  styleRange(sheet, { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }, excelHeaderStyle);
  styleRange(sheet, { s: { r: 3, c: 0 }, e: { r: 2 + outputRows.length, c: 7 } }, {
    ...excelBodyStyle,
    alignment: { vertical: "center", wrapText: true }
  });
  numberFormatRange(sheet, 3, 2 + outputRows.length, [2, 5, 6]);
  sourceRows.forEach((kind, index) => {
    if (kind !== "total") return;
    styleRange(sheet, { s: { r: 3 + index, c: 0 }, e: { r: 3 + index, c: 7 } }, {
      ...excelBodyStyle,
      font: { bold: true, sz: 10 },
      fill: { fgColor: { rgb: "FFF200" } }
    }, new Set([5, 6]));
  });
  appendAndSaveStyledSheet({ sheet, sheetName: "Cuadro Suministros", fileToken: "cuadro-inventarios-suministros" });
}

function exportDetalleMaterialesStyledExcel(report: InventoryReportDefinition) {
  const rows = report.rows
    .filter((row) => row.type !== "group" || row.values.subCentro)
    .map((row) => [
      valueOf(row, "subCuenta"),
      valueOf(row, "subCentro"),
      "",
      valueOf(row, "importeBs"),
      valueOf(row, "subtotalBs")
    ]);
  const aoa: Array<Array<string | number>> = [
    ["Empresa Minera"],
    ["MARTE S.R.L."],
    ["DETALLE DE MATERIALES  COSTO DE PRODUCCION"],
    [monthLabelFromSubtitle(report.subtitle)],
    ["", "", "", "", "T-C. $us  6,96"],
    [],
    ["SUB\nCUENTA", "SUB\nCENTRO", "", "IMPORTE\nBs.", "SUB TOTALES DE\nFUNCION DEL GASTO  Bs."],
    ...rows
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!merges"] = [
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } }
  ];
  sheet["!cols"] = [{ wch: 12 }, { wch: 13 }, { wch: 4 }, { wch: 16 }, { wch: 32 }];
  setCellStyle(sheet, "A1", { font: { bold: true, sz: 16 } });
  setCellStyle(sheet, "A2", { font: { bold: true, sz: 22, underline: true } });
  styleRange(sheet, { s: { r: 2, c: 0 }, e: { r: 4, c: 4 } }, excelTitleStyle);
  styleRange(sheet, { s: { r: 6, c: 0 }, e: { r: 6, c: 4 } }, excelHeaderStyle);
  styleRange(sheet, { s: { r: 7, c: 0 }, e: { r: 6 + rows.length, c: 4 } }, excelBodyStyle);
  numberFormatRange(sheet, 7, 6 + rows.length, [3, 4]);
  report.rows
    .filter((row) => row.type !== "group" || row.values.subCentro)
    .forEach((row, index) => {
      if (row.type === "subtotal" || row.type === "total") {
        styleRange(sheet, { s: { r: 7 + index, c: 0 }, e: { r: 7 + index, c: 4 } }, {
          ...excelBodyStyle,
          font: { bold: true, sz: 10 }
        }, new Set([3, 4]));
      }
    });
  appendAndSaveStyledSheet({ sheet, sheetName: "Detalle Materiales", fileToken: "detalle-materiales-costo-produccion" });
}

function cuentaHaberTitulo(cuenta: DiarioAlmacenesReportResponse["data"]["meses"][number]["cuentasHaber"][number]) {
  const code = (cuenta.codigoCompleto ?? "").replace(/[^\d]/g, "");
  const sector = cuenta.sectorNombre ? `"${cuenta.sectorNombre.toUpperCase()}"` : "";
  if (code.includes("100001000")) return "COSTO DE PRODUCCION - LIPEÑA";
  if (code.includes("104001000")) return "COSTO MEDIO AMBIENTE - LIPEÑA";
  if (code.includes("44002000") || code.includes("044002000")) return "OBRAS EN CONSTRUCCION LIPEÑA";
  if (code.includes("67001097") || code.includes("67001098") || cuenta.esTransporte) {
    return `COSTO COMB.TRANSPORTE${sector}`;
  }
  return `${(cuenta.centroCostoNombre ?? "").toUpperCase()} LIPEÑA`.trim();
}

function cuentaContableDisplay(value?: string | null) {
  return (value ?? "").replace(/\s+/g, ",");
}

function lineaCuentaDisplay(linea: { subCentro?: string | null; subCuentas?: string[] }) {
  const subCuentas = linea.subCuentas?.length ? linea.subCuentas.join("-") : "";
  return [subCuentas, linea.subCentro].filter(Boolean).join("-");
}

type DiarioCuenta = DiarioAlmacenesReportResponse["data"]["meses"][number]["cuentasHaber"][number];
type DiarioSector = DiarioAlmacenesReportResponse["data"]["meses"][number]["sectoresHaber"][number];

function diarioSectorLineas(sector: DiarioSector) {
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

function diarioSectoresToCuentas(sectores: DiarioSector[]): DiarioCuenta[] {
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

function cuentaMovimientoTitulo(cuenta: DiarioCuenta) {
  return (cuenta.sectorNombre ?? cuentaHaberTitulo(cuenta)).toUpperCase();
}

function movimientoCuentaOrderValue(cuenta: DiarioCuenta) {
  const display = movimientoCargoDisplay(cuenta);
  return Number(display.replace(/[^\d]/g, "")) || Number.MAX_SAFE_INTEGER;
}

function movimientoCargoDisplay(cuenta: DiarioCuenta) {
  const code = cuentaLookupKey(cuenta.sectorCodigo ?? cuenta.codigoCompleto);
  if (code === "67001009") return "22 001 009";
  if (code === "67001010") return "22 001 010";
  return cuenta.sectorCodigo ?? cuenta.codigoCompleto ?? "";
}

function sortMovimientoCuentas(cuentas: DiarioCuenta[]) {
  return [...cuentas].sort((a, b) => {
    const orderDiff = movimientoCuentaOrderValue(a) - movimientoCuentaOrderValue(b);
    if (orderDiff !== 0) return orderDiff;
    return (a.sectorNombre ?? "").localeCompare(b.sectorNombre ?? "", "es");
  });
}

function groupMovimientoCuentas(cuentas: DiarioCuenta[]) {
  const grouped = new Map<string, DiarioCuenta>();
  cuentas.forEach((cuenta) => {
    const key = cuentaLookupKey(cuenta.sectorCodigo ?? cuenta.codigoCompleto);
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { ...cuenta, lineas: [...cuenta.lineas] });
      return;
    }
    current.lineas.push(...cuenta.lineas);
  });
  return [...grouped.values()];
}

function isCostoProduccionCuenta(cuenta: DiarioCuenta) {
  return cuentaLookupKey(cuenta.sectorCodigo ?? cuenta.codigoCompleto) === "100001000";
}

function sortCodigoFuncion(value?: string | null) {
  const parsed = Number((value ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function movimientoLineasPorFuncion(cuenta: DiarioCuenta) {
  return cuenta.lineas
    .map((linea) => ({
      codigo: linea.funcionGastoCodigo ?? linea.subCentro ?? "",
      nombre: linea.funcionGastoNombre ?? linea.nombre ?? "",
      importeBs: linea.importeBs
    }))
    .sort((a, b) => {
      const codeDiff = sortCodigoFuncion(a.codigo) - sortCodigoFuncion(b.codigo);
      if (codeDiff !== 0) return codeDiff;
      return a.nombre.localeCompare(b.nombre, "es");
    });
}

function subCuentaDescripcion(subCuenta?: string) {
  if (subCuenta === "1804") return "COSTO MINA";
  if (subCuenta === "2801") return "MANTENIMIENTO";
  if (subCuenta === "3401") return "ADMINISTRACION";
  if (subCuenta === "3601") return "OBRAS EN CONSTRUCCION";
  if (subCuenta === "4401") return "MAQUINARIA Y EQUIPO";
  return "COSTO MINA";
}

function cuentaLookupKey(value?: string | null) {
  return (value ?? "").replace(/[^\d]/g, "");
}

function nameLookupKey(value?: string | null) {
  return `name:${(value ?? "").trim().toUpperCase()}`;
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
    if (codigoCompleto) lookup.set(cuentaLookupKey(codigoCompleto), nombre);
    if (codigo && !lookup.has(codigo)) lookup.set(codigo, nombre);
  }

  Object.values(record).forEach((item) => buildFuncionGastoLookup(item, lookup));
  return lookup;
}

function buildSectorCodigoLookup(value: unknown, lookup = new Map<string, string>(), currentSectorCodigo = "") {
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
    lookup.set(cuentaLookupKey(sectorCodigo), sectorCodigo);
    if (sectorNombre) lookup.set(nameLookupKey(sectorNombre), sectorCodigo);
    if (codigoCompleto) lookup.set(cuentaLookupKey(codigoCompleto), sectorCodigo);
  }

  Object.values(record).forEach((item) => buildSectorCodigoLookup(item, lookup, sectorCodigo));
  return lookup;
}

function cuentaMayorKey(cuenta: DiarioCuenta) {
  const code = (cuenta.codigoCompleto ?? "").replace(/[^\d]/g, "");
  if (code.includes("100001000")) return "100001000";
  if (code.includes("104001000")) return "104001000";
  if (code.includes("44002000") || code.includes("044002000")) return "44002000";
  if (code.includes("67001097")) return "67001097";
  if (code.includes("67001098")) return "67001098";
  return code || cuenta.codigoCompleto || cuenta.centroCostoNombre || "SIN-CUENTA";
}

function cuentaMayorCodigo(key: string) {
  if (key === "100001000") return "100,001,000";
  if (key === "104001000") return "104,001,000";
  if (key === "44002000") return "44,002,000";
  if (key === "67001097") return "67,001,097";
  if (key === "67001098") return "67,001,098";
  return key;
}

function normalizeDiarioCuentas(
  cuentas: DiarioCuenta[],
  funcionLookup = new Map<string, string>(),
  sectorLookup = new Map<string, string>()
): DiarioCuenta[] {
  const grouped = new Map<string, DiarioCuenta>();
  for (const cuenta of cuentas) {
    const key = cuentaMayorKey(cuenta);
    const current = grouped.get(key);
    const parts = (cuenta.codigoCompleto ?? "").match(/\d+/g) ?? [];
    const funcionNombre =
      funcionLookup.get(cuentaLookupKey(cuenta.codigoCompleto)) ??
      funcionLookup.get(parts[1] ?? "");
    const sectorCodigo =
      cuenta.sectorCodigo ??
      sectorLookup.get(cuentaLookupKey(cuenta.codigoCompleto)) ??
      sectorLookup.get(nameLookupKey(cuenta.sectorNombre)) ??
      sectorLookup.get(key) ??
      "";
    const fallbackLinea =
      cuenta.lineas.length === 0 && key === "100001000" && parts.length >= 3
        ? [
            {
              subCentro: parts[1] ?? "",
              nombre: funcionNombre ?? subCuentaDescripcion(parts[0]),
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
        codigoCompleto: cuentaMayorCodigo(key),
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

function exportDiarioAlmacenesStyledExcel(report: InventoryReportDefinition) {
  const source = getDiarioAlmacenesSource(report);
  const periodo = source?.data.meses[0];
  const monthName = periodo ? MONTH_NAMES[periodo.mes - 1] : "";
  const bodyRows: Array<{ kind?: "title" | "total"; values: Array<string | number> }> = report.rows
    .filter((row) => row.values.descripcion || row.values.debeBs || row.values.haberBs)
    .map((row) => ({
      kind: row.type === "group" ? "title" : row.type === "total" ? "total" : undefined,
      values: [
        valueOf(row, "descripcion"),
        valueOf(row, "centroCostoCodigo"),
        valueOf(row, "funcionGastoCodigo"),
        valueOf(row, "parcialesBs"),
        valueOf(row, "cuenta"),
        valueOf(row, "debeBs"),
        valueOf(row, "haberBs")
      ]
    }));

  const LAST_COL = 6;
  const aoa: Array<Array<string | number>> = [
    ["COMPROBANTE  DE  DIARIO"],
    ["DIARIO  ALMACENES"],
    ["SECTOR:  LIPEÑA", periodo ? `MES:  DE ${monthName}  ${periodo.anio}` : monthLabelFromSubtitle(report.subtitle)],
    [],
    ["D E S C R I P C I O N", "CENTRO\nDE COSTO", "FUNCION\nDEL GASTO", "PARCIALES\nBs.", "No  DE CUENTA", "BOLIVIANOS\nD E B E", "BOLIVIANOS\nH A B E R"],
    ...bodyRows.map((row) => row.values)
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: LAST_COL } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: LAST_COL } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: LAST_COL } }
  ];
  sheet["!cols"] = [{ wch: 45 }, { wch: 13 }, { wch: 13 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
  styleRange(sheet, { s: { r: 0, c: 0 }, e: { r: 2, c: LAST_COL } }, excelTitleStyle);
  styleRange(sheet, { s: { r: 4, c: 0 }, e: { r: 4, c: LAST_COL } }, excelHeaderStyle);
  styleRange(
    sheet,
    { s: { r: 5, c: 0 }, e: { r: 4 + bodyRows.length, c: LAST_COL } },
    excelBodyStyle,
    new Set([3, 5, 6]),
    "#,##0.00"
  );
  bodyRows.forEach((row, index) => {
    if (row.kind === "title" || row.kind === "total") {
      styleRange(sheet, { s: { r: 5 + index, c: 0 }, e: { r: 5 + index, c: LAST_COL } }, {
        ...excelBodyStyle,
        font: { bold: true, sz: 10 }
      }, new Set([3, 5, 6]));
    }
  });
  appendAndSaveStyledSheet({ sheet, sheetName: "Diario Almacenes", fileToken: "diario-almacenes" });
}

function getDetalleMaterialesSource(report: InventoryReportDefinition) {
  return report.sourceResponse as DetalleMaterialesReportResponse | undefined;
}

function getDiarioAlmacenesSource(report: InventoryReportDefinition) {
  return report.sourceResponse as DiarioAlmacenesReportResponse | undefined;
}

type CostoExportLinea = {
  subCuenta?: string | null;
  subCentro?: string | null;
  subCentroNombre?: string | null;
  importeBs: number;
};

function groupCostoLineas(lineas: CostoExportLinea[]) {
  return [...lineas].sort((a, b) => {
    const subCentroDiff = sortCodigoFuncion(a.subCentro) - sortCodigoFuncion(b.subCentro);
    if (subCentroDiff !== 0) return subCentroDiff;
    const subCuentaDiff = sortCodigoFuncion(a.subCuenta) - sortCodigoFuncion(b.subCuenta);
    if (subCuentaDiff !== 0) return subCuentaDiff;
    return (a.subCentroNombre ?? "").localeCompare(b.subCentroNombre ?? "", "es");
  });
}

function applyReportSheetBaseStyle(
  sheet: XLSX.WorkSheet,
  range: XLSX.Range,
  numericColumns: number[] = [],
  numberFormat = "#,##0.00"
) {
  const numericSet = new Set(numericColumns);
  styleRange(
    sheet,
    range,
    {
      font: { sz: 10, name: "Arial" },
      alignment: { vertical: "center", wrapText: true },
      border: excelThinBorder
    },
    numericSet,
    numberFormat
  );
}

function exportCostoProduccionMultiSheetExcel(report: InventoryReportDefinition) {
  const source = getDetalleMaterialesSource(report);
  if (!source?.data.meses.length) {
    exportDetalleMaterialesStyledExcel(report);
    return;
  }

  const normalColumns = [
    { wch: 2.33 },
    { wch: 11.11 },
    { wch: 11.33 },
    { wch: 7 },
    { wch: 13.78 },
    { wch: 3.78 },
    { wch: 6.44 },
    { wch: 24.33 },
    { wch: 2.33 }
  ];
  const transportColumns = [
    { wch: 2.33 },
    { wch: 31.67 },
    { wch: 7.56 },
    { wch: 7.78 },
    { wch: 9.11 },
    { wch: 26.89 },
    { wch: 37.11 },
    { wch: 37.11 },
    { wch: 2.33 }
  ];
  const centeredNoBorder = {
    font: { bold: true, sz: 10, name: "Arial" },
    alignment: { horizontal: "center", vertical: "center" }
  };
  const companyStyle = {
    font: { bold: true, sz: 16, name: "Arial", underline: true },
    alignment: { horizontal: "left", vertical: "center" }
  };
  const smallItalicHeader = {
    font: { italic: true, sz: 10, name: "Arial" },
    alignment: { horizontal: "center", vertical: "center", wrapText: true }
  };
  const templateTextStyle = {
    font: { sz: 10, name: "Arial" },
    alignment: { vertical: "center" }
  };
  const templateNumberStyle = {
    ...templateTextStyle,
    alignment: { horizontal: "right", vertical: "center" },
    numFmt: "#,##0.00"
  };
  const templateCenterStyle = {
    ...templateTextStyle,
    alignment: { horizontal: "center", vertical: "center" }
  };
  const thinTop = { top: { style: "thin", color: { rgb: "000000" } } };
  const thinBottom = { bottom: { style: "thin", color: { rgb: "000000" } } };
  const thickTop = { top: { style: "medium", color: { rgb: "000000" } } };
  const thickBottom = { bottom: { style: "medium", color: { rgb: "000000" } } };
  const thickLeft = { left: { style: "medium", color: { rgb: "000000" } } };
  const thickRight = { right: { style: "medium", color: { rgb: "000000" } } };
  const thinLeft = { left: { style: "thin", color: { rgb: "000000" } } };
  const thinRight = { right: { style: "thin", color: { rgb: "000000" } } };

  const workbook = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  for (const periodo of source.data.meses) {
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

    const groupedCuentas = new Map<
      string,
      {
        codigoCompleto: string;
        centroCostoNombre: string;
        funcionGastoNombre: string;
        vehiculo: string | null;
        esTransporte: boolean;
        totalBs: number;
        totalCantidad?: number;
        summaryLabel?: string;
        summaryDestinatario?: string;
        lineas: Array<{
          subCuenta?: string | null;
          subCentro?: string | null;
          subCentroNombre?: string | null;
          importeBs: number;
        }>;
        detalles: Array<{
          productoNombre?: string | null;
          unidad?: string | null;
          cantidad: number;
          importeBs: number;
          vehiculo?: string | null;
          destino?: string | null;
        }>;
      }
    >();

    for (const cuenta of cuentas) {
      const sheetName = costoSheetName(cuenta);
      const meta = costoSheetMeta(sheetName);
      const current = groupedCuentas.get(sheetName);
      const sheet = current ?? {
        codigoCompleto: "",
        centroCostoNombre: "",
        funcionGastoNombre: "",
        vehiculo: null,
        esTransporte: meta.isTransport,
        totalBs: cuenta.totalBs,
        totalCantidad: cuenta.totalCantidad,
        summaryLabel: costoDetalleResumenLabel(cuenta),
        summaryDestinatario: costoDetalleResumenDestinatario(cuenta),
        lineas: [],
        detalles: []
      };
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
              subCentroNombre: cuenta.funcionGastoNombre ?? cuenta.centroCostoNombre ?? detalle.vehiculo ?? detalle.destino ?? "",
              importeBs: detalle.importeBs
            });
          });
        }
      }
      groupedCuentas.set(sheetName, sheet);

      if (sheetName === "CONSTRUCCION-25" && cuenta.detalles.length) {
        const detailSheetName = "OBRAS EN CONSTRUCCION";
        const detailMeta = costoSheetMeta(detailSheetName);
        const detailCurrent = groupedCuentas.get(detailSheetName);
        const detailSheet = detailCurrent ?? {
          codigoCompleto: "",
          centroCostoNombre: "",
          funcionGastoNombre: "",
          vehiculo: null,
          esTransporte: detailMeta.isTransport,
          totalBs: cuenta.totalBs,
          totalCantidad: cuenta.totalCantidad,
          summaryLabel: costoDetalleResumenLabel(cuenta),
          summaryDestinatario: costoDetalleResumenDestinatario(cuenta),
          lineas: [],
          detalles: []
        };
        detailSheet.detalles.push(...cuenta.detalles);
        groupedCuentas.set(detailSheetName, detailSheet);
      }
    }

    const orderedSheetNames = [
      "ROMARESNI",
      "EMUSA",
      "PUNTUALIDAD",
      "MAQUINARIA Y EQUIPO",
      "OBRAS EN CONSTRUCCION",
      "LIPEÑA",
      "MA-HSI (3)",
      "CONSTRUCCION-25"
    ];
    const remainingSheetNames = [...groupedCuentas.keys()].filter((sheetName) => !orderedSheetNames.includes(sheetName));
    // Compute AGL numbers: count only transport sheets that have data, in order
    let aglCounter = 0;
    const aglBySheet = new Map<string, number>();
    for (const sn of [...orderedSheetNames, ...remainingSheetNames]) {
      if (!groupedCuentas.has(sn)) continue;
      if (costoSheetMeta(sn).isTransport) aglBySheet.set(sn, ++aglCounter);
    }
    for (const sheetName of [...orderedSheetNames, ...remainingSheetNames]) {
      const cuenta = groupedCuentas.get(sheetName);
      if (!cuenta) continue;
      const meta = costoSheetMeta(sheetName);
      const title = meta.title;
      const codeLine = meta.codeLine;
      const groupedLineas = meta.isTransport ? [] : groupCostoLineas(cuenta.lineas);
      const aoa: Array<Array<string | number | null>> = [];
      const merges: XLSX.Range[] = [];

      const ensureRow = (row: number) => {
        while (aoa.length <= row) aoa.push(["", "", "", "", "", "", "", "", ""]);
      };
      const put = (row: number, col: number, value: string | number | null) => {
        ensureRow(row);
        aoa[row][col] = value;
      };
      const blankTo = (row: number) => ensureRow(row);

      if (meta.isTransport) {
        blankTo(6);
        put(2, 1, "Empresa Minera ");
        put(3, 1, "MARTE S.R.L.");
        const aglNum = aglBySheet.get(sheetName);
        if (aglNum != null) {
          put(3, 5, `ANEXO AGL-${String(aglNum).padStart(3, "0")}/${periodo.anio}`);
        }
        put(7, 1, title);
        put(8, 1, `LIPEÑA    ${monthPhrase(periodo.anio, periodo.mes)}`);
        put(10, 1, codeLine);
        put(13, 1, "Por lo siguiente: Por la provision de materiales de acuerdo al siguiente detalle correspondiente al                                   ");
        put(15, 1, `mes de     ${monthTitleCase(periodo.anio, periodo.mes)}`);
        if (!sheetName.toUpperCase().includes("EMUSA")) put(15, 7, "T-C. $us  6,96");
        const headerRow = sheetName === "PUNTUALIDAD" ? 18 : 17;
        put(headerRow, 1, "DETALLE ");
        put(headerRow, 2, "UNIDAD");
        put(headerRow, 3, "CANTIDAD");
        put(headerRow, 4, "DEBE");
        put(headerRow, 5, "DESTINATARIO");
        let row = headerRow + 2;
        for (const detalle of cuenta.detalles) {
          put(row, 1, detalle.productoNombre ?? "");
          put(row, 2, detalle.unidad ?? "");
          put(row, 3, asOptionalExcelNumber(detalle.cantidad));
          put(row, 4, asOptionalExcelNumber(detalle.importeBs));
          put(row, 5, detalle.vehiculo ?? detalle.destino ?? "");
          row += 1;
        }
        const totalRow = Math.max(row + 5, sheetName === "PUNTUALIDAD" ? 32 : 31);
        put(totalRow, 1, "TOTAL");
        put(totalRow, 3, asOptionalExcelNumber(cuenta.totalCantidad));
        put(totalRow, 4, asExcelNumber(cuenta.totalBs));
        put(totalRow + 5, 1, bolivianosLiteral(cuenta.totalBs));
        const signatureRow = totalRow + 17;
        put(signatureRow, 1, "    JEFE DE ALMACENES                                         JEFE DE OFICINAS                                        SUPDTE. GENERAL");
        put(signatureRow + 5, 1, "cc. Archivo");
        blankTo(signatureRow + 5);

        merges.push(
          { s: { r: 7, c: 1 }, e: { r: 7, c: 5 } },
          { s: { r: 8, c: 1 }, e: { r: 8, c: 5 } },
          { s: { r: 10, c: 1 }, e: { r: 10, c: 5 } },
          { s: { r: 13, c: 1 }, e: { r: 14, c: 5 } },
          { s: { r: totalRow + 5, c: 1 }, e: { r: totalRow + 5, c: 5 } }
        );
      } else {
        const isMainProduction = sheetName === "LIPEÑA";
        put(isMainProduction ? 0 : 2, 1, "Empresa Minera ");
        put(isMainProduction ? 1 : 3, 1, "MARTE S.R.L.");
        put(isMainProduction ? 2 : 7, 1, title);
        put(isMainProduction ? 3 : 8, 1, `LIPEÑA    ${monthPhrase(periodo.anio, periodo.mes)}`);
        if (!isMainProduction) put(10, 1, codeLine);
        put(isMainProduction ? 5 : 15, 7, "T-C. $us  6,96");
        const headerRow = isMainProduction ? 6 : 16;
        put(headerRow, 1, "SUB");
        put(headerRow, 2, "SUB");
        put(headerRow, 4, "IMPORTE");
        put(headerRow, 7, "SUB TOTALES DE");
        put(headerRow + 1, 1, "CUENTA");
        put(headerRow + 1, 2, "CENTRO");
        put(headerRow + 1, 4, "                   Bs.");
        put(headerRow + 1, 7, "FUNCION DEL GASTO  Bs.");
        const totalsBySubCentro = new Map<string, number>();
        groupedLineas.forEach((linea) => {
          const key = linea.subCentro ?? "";
          totalsBySubCentro.set(key, (totalsBySubCentro.get(key) ?? 0) + linea.importeBs);
        });
        const lastIndexBySubCentro = new Map<string, number>();
        groupedLineas.forEach((linea, index) => lastIndexBySubCentro.set(linea.subCentro ?? "", index));
        let row = headerRow + 2;
        if (!isMainProduction) row += 1;
        groupedLineas.forEach((linea, index) => {
          const key = linea.subCentro ?? "";
          put(row, 1, linea.subCuenta ?? "");
          put(row, 2, linea.subCentro ?? "");
          put(row, 4, asExcelNumber(linea.importeBs));
          if (lastIndexBySubCentro.get(key) === index) {
            put(row, 7, asExcelNumber(totalsBySubCentro.get(key) ?? linea.importeBs));
          }
          row += 1;
        });
        const totalRow = row + 1;
        put(totalRow, 4, asExcelNumber(cuenta.totalBs));
        put(totalRow, 7, asExcelNumber(cuenta.totalBs));
        put(totalRow + 2, 2, "HOJA Nº 1");
        put(totalRow + 2, 4, asExcelNumber(cuenta.totalBs));
        put(totalRow + 4, 2, "TOTAL");
        put(totalRow + 4, 4, asExcelNumber(cuenta.totalBs));
        const signatureRow = totalRow + 14;
        put(signatureRow, 1, isMainProduction
          ? "    JEFE DE ALMACENES                                              JEFE DE OFICINAS                                                       SUPDTE. GENERAL"
          : "    JEFE DE ALMACENES                         JEFE DE OFICINAS                                    SUPDTE. GENERAL"
        );
        put(signatureRow + 5, 1, isMainProduction ? "CC. Archivo" : "cc. Archivo");
        blankTo(signatureRow + 5);

        merges.push(
          { s: { r: isMainProduction ? 2 : 7, c: 1 }, e: { r: isMainProduction ? 2 : 7, c: 7 } },
          { s: { r: isMainProduction ? 3 : 8, c: 1 }, e: { r: isMainProduction ? 3 : 8, c: 7 } },
          { s: { r: totalRow + 2, c: 2 }, e: { r: totalRow + 2, c: 3 } },
          { s: { r: totalRow + 4, c: 2 }, e: { r: totalRow + 4, c: 3 } }
        );
        if (!isMainProduction) {
          merges.push({ s: { r: 10, c: 1 }, e: { r: 10, c: 8 } });
        }
      }

      const sheet = XLSX.utils.aoa_to_sheet(aoa);
      const lastRow = aoa.length - 1;
      sheet["!cols"] = meta.isTransport ? transportColumns : normalColumns;
      sheet["!merges"] = merges;
      const addStyle = (row: number, col: number, style: Record<string, unknown>) => {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        const current = sheet[address]?.s ?? {};
        setCellStyle(sheet, address, { ...current, ...style });
      };
      const addBorder = (row: number, col: number, border: Record<string, unknown>) => {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        const current = sheet[address]?.s ?? {};
        const currentBorder = (current as { border?: Record<string, unknown> }).border ?? {};
        setCellStyle(sheet, address, { ...current, border: { ...currentBorder, ...border } });
      };
      const styleRect = (
        startRow: number,
        endRow: number,
        startCol: number,
        endCol: number,
        styleForCell: (row: number, col: number) => Record<string, unknown>
      ) => {
        for (let row = startRow; row <= endRow; row += 1) {
          for (let col = startCol; col <= endCol; col += 1) {
            addStyle(row, col, styleForCell(row, col));
          }
        }
      };
      styleRect(0, lastRow, 0, 8, (_row, col) => {
        if (col === 4 || col === 7) return templateNumberStyle;
        if (col === 1 || col === 2 || col === 3) return templateCenterStyle;
        return templateTextStyle;
      });
      if (!meta.isTransport && sheetName === "LIPEÑA") {
        setCellStyle(sheet, "B1", companyStyle);
        setCellStyle(sheet, "B2", { ...companyStyle, font: { bold: true, sz: 22, name: "Arial", underline: true } });
      } else {
        setCellStyle(sheet, "B3", companyStyle);
        setCellStyle(sheet, "B4", { ...companyStyle, font: { bold: true, sz: 22, name: "Arial", underline: true } });
      }

      const titleRow = meta.isTransport ? 7 : sheetName === "LIPEÑA" ? 2 : 7;
      styleRange(sheet, { s: { r: titleRow, c: 1 }, e: { r: titleRow + 1, c: 7 } }, centeredNoBorder);
      if (meta.isTransport) {
        const headerRow = sheetName === "PUNTUALIDAD" ? 18 : 17;
        const boxTop = headerRow - 1;
        const totalRow = Math.max(
          headerRow + 2 + cuenta.detalles.length + 5,
          sheetName === "PUNTUALIDAD" ? 32 : 31
        );
        styleRange(sheet, { s: { r: headerRow, c: 1 }, e: { r: headerRow, c: 4 } }, smallItalicHeader);
        for (let row = boxTop; row <= totalRow; row += 1) {
          for (let col = 1; col <= 5; col += 1) {
            addBorder(row, col, {
              ...(row === boxTop ? thickTop : {}),
              ...(row === totalRow ? thickBottom : {}),
              ...(col === 1 ? thickLeft : thinLeft),
              ...(col === 5 ? thickRight : thinRight)
            });
          }
        }
        for (let col = 1; col <= 5; col += 1) {
          addBorder(totalRow, col, thinTop);
        }
      } else {
        const headerRow = sheetName === "LIPEÑA" ? 6 : 16;
        styleRange(sheet, { s: { r: headerRow, c: 1 }, e: { r: headerRow + 1, c: 7 } }, smallItalicHeader);
        const dataStart = headerRow + (sheetName === "LIPEÑA" ? 2 : 3);
        const totalRow = dataStart + groupedLineas.length + 1;
        for (let col = 1; col <= 7; col += 1) {
          addBorder(headerRow, col, thinTop);
          addBorder(headerRow + 1, col, thinBottom);
          addBorder(totalRow, col, thinTop);
        }
        for (let col = 2; col <= 4; col += 1) {
          addBorder(totalRow + 2, col, thinTop);
          addBorder(totalRow + 4, col, thinBottom);
        }
      }

      XLSX.utils.book_append_sheet(
        workbook,
        sheet,
        uniqueSheetName(sheetName, usedSheetNames)
      );
    }
  }

  XLSX.writeFile(workbook, `costo-produccion-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportMovimientoAlmacenStyledExcel(report: InventoryReportDefinition) {
  const source = getDiarioAlmacenesSource(report);
  if (!source?.data.meses.length) {
    exportDiarioAlmacenesStyledExcel(report);
    return;
  }

  const periodo = source.data.meses[0];
  const monthName = MONTH_NAMES[periodo.mes - 1];
  const rows: Array<{ kind?: "header" | "detail" | "total"; values: Array<string | number> }> = [
    { kind: "header", values: ["C A R G O", "D E S C R I P C I O N", "Bs", "DEBE\nBs.", "HABER\nBs."] },
    {
      kind: "header",
      values: [
        "26 002 000",
        "INVENTARIO MATERIAL Y SUMIN. LIPEÑA",
        "",
        asExcelNumber(periodo.totalInventarioDebe),
        ""
      ]
    },
    {
      values: [
        "",
        `Saldo inventario al ${previousMonthEndLabel(periodo.anio, periodo.mes)}`,
        asExcelNumber(periodo.saldoInventarioAnterior),
        "",
        ""
      ]
    },
    {
      values: [
        "",
        `Cuadro Mat.y Sumin. Lipeña mes ${monthName.toLowerCase()} de ${periodo.anio}`,
        asExcelNumber(periodo.comprasSinIva ?? periodo.comprasImporteBs),
        "",
        ""
      ]
    },
    {
      kind: "header",
      values: [
        "87 002 000",
        "LIQUIDACION PROVISIONAL MATERIAL LIPEÑA",
        "",
        "",
        0
      ]
    },
    {
      values: [
        "",
        `Liquidacion Prov. Mat. Recibidos mes ${monthName.toLowerCase()} de ${periodo.anio}`,
        "",
        "",
        ""
      ]
    },
    {
      kind: "header",
      values: [
        "26 002 000",
        "INVENTARIO MATERIAL Y SUMIN. LIPEÑA",
        "",
        "",
        ""
      ]
    },
    {
      values: [
        "",
        "Cancelacion Liq. Provisional por Uf. Sig. anexos",
        "",
        "",
        ""
      ]
    }
  ];

  for (const cuenta of sortMovimientoCuentas(diarioSectoresToCuentas(periodo.sectoresHaber))) {
    const heading = cuentaMovimientoTitulo(cuenta);
    const isCostoProduccion = isCostoProduccionCuenta(cuenta);
    rows.push({
      kind: "header",
      values: [
        movimientoCargoDisplay(cuenta),
        heading,
        isCostoProduccion ? "" : asOptionalExcelNumber(cuenta.totalBs),
        "",
        isCostoProduccion ? "" : asExcelNumber(cuenta.totalBs)
      ]
    });
    rows.push({
      values: [
        "",
        `Aten. Material mes de ${monthName}- ${periodo.anio}`,
        "",
        "",
        isCostoProduccion ? asExcelNumber(cuenta.totalBs) : ""
      ]
    });
    const lineas = isCostoProduccion ? movimientoLineasPorFuncion(cuenta) : [];
    if (lineas.length) {
      for (const linea of lineas) {
        rows.push({
          kind: "detail",
          values: ["", `${linea.codigo} - ${linea.nombre}`.trim(), asExcelNumber(linea.importeBs), "", ""]
        });
      }
    }
  }

  const saldoFinal = periodo.saldoInventarioFinal ?? periodo.saldoFinal;
  rows.push({
    kind: "total",
    values: ["", "", "", asExcelNumber(periodo.totalInventarioDebe), asExcelNumber(periodo.totalSalidasHaber)]
  });
  rows.push({
    values: ["", `saldo al ${new Date(periodo.anio, periodo.mes, 0).getDate()} de ${monthName.toLowerCase()} de ${periodo.anio}`, "", "", asOptionalExcelNumber(saldoFinal)]
  });
  rows.push({
    kind: "total",
    values: ["", "", "", asExcelNumber(periodo.totalInventarioDebe), asExcelNumber(periodo.totalInventarioDebe)]
  });

  const aoa: Array<Array<string | number>> = [
    ["Empresa Minera"],
    ["MARTE S.R.L."],
    ["LIPEÑA"],
    [],
    ["ALMACEN GENERAL LIPEÑA"],
    [`MOVIMIENTO ALMACENES CORRESPONDIENTE MES DE ${monthName} DE ${periodo.anio}`],
    [],
    ...rows.map((row) => row.values),
    [],
    [],
    [],
    ["JEFE DE ALMACEN", "JEFE DE OFICINAS", "", "", "SUPDTE. GENERAL"]
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!merges"] = [
    { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } }
  ];
  sheet["!cols"] = [{ wch: 13 }, { wch: 48 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  setCellStyle(sheet, "A1", { font: { bold: true, sz: 10, name: "Arial" } });
  setCellStyle(sheet, "A2", { font: { bold: true, sz: 10, name: "Arial", underline: true } });
  setCellStyle(sheet, "A3", { font: { sz: 10, name: "Arial" } });
  styleRange(sheet, { s: { r: 4, c: 0 }, e: { r: 5, c: 4 } }, {
    font: { sz: 10, name: "Arial", underline: true },
    alignment: { horizontal: "center", vertical: "center" }
  });
  const tableStart = 7;
  const tableEnd = tableStart + rows.length - 1;
  styleRange(sheet, { s: { r: tableStart, c: 0 }, e: { r: tableEnd, c: 4 } }, {
    font: { sz: 9, name: "Arial" },
    alignment: { vertical: "center", wrapText: true },
    border: excelThinBorder
  }, new Set([2, 3, 4]));
  styleRange(sheet, { s: { r: tableStart, c: 0 }, e: { r: tableStart, c: 4 } }, {
    ...excelHeaderStyle,
    font: { bold: true, sz: 9, name: "Arial" }
  });
  rows.forEach((row, index) => {
    const excelRow = tableStart + index;
    if (row.kind === "header") {
      styleRange(sheet, { s: { r: excelRow, c: 0 }, e: { r: excelRow, c: 4 } }, {
        font: { bold: true, sz: 9, name: "Arial" },
        alignment: { vertical: "center", wrapText: true },
        border: excelThinBorder
      }, new Set([2, 3, 4]));
    }
    if (row.kind === "total") {
      styleRange(sheet, { s: { r: excelRow, c: 3 }, e: { r: excelRow, c: 4 } }, {
        font: { sz: 9, name: "Arial" },
        alignment: { horizontal: "right", vertical: "center" },
        border: excelThinBorder
      }, new Set([3, 4]));
    }
  });

  appendAndSaveStyledSheet({ sheet, sheetName: "Movimiento Almacen", fileToken: "movimiento-almacen" });
}

export function exportInventoryReportExcel(report: InventoryReportDefinition) {
  if (report.type === "balance-mensual") {
    exportBalanceMensualStyledExcel(report);
    return;
  }
  if (report.type === "inventario-general") {
    exportInventarioGeneralStyledExcel(report);
    return;
  }
  if (report.type === "inventarios-suministros") {
    exportCuadroSuministrosStyledExcel(report);
    return;
  }
  if (report.type === "detalle-materiales" || report.type === "costo-produccion") {
    if (report.type === "costo-produccion") {
      exportCostoProduccionMultiSheetExcel(report);
      return;
    }
    exportDetalleMaterialesStyledExcel(report);
    return;
  }
  if (report.type === "diario-almacenes" || report.type === "movimiento-almacen") {
    if (report.type === "movimiento-almacen") {
      exportMovimientoAlmacenStyledExcel(report);
      return;
    }
    exportDiarioAlmacenesStyledExcel(report);
    return;
  }

  const headers = report.columns.map((column) => column.label);
  const rows = report.rows.map((row) =>
    report.columns.map((column) => row.values[column.key] ?? "")
  );
  const summaryRows = report.summary.map((item) => [item.label, item.value]);
  const lastCol = Math.max(headers.length - 1, 1);

  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA MARTE S.R.L."],
    [report.title.toUpperCase()],
    [report.subtitle],
    [],
    headers,
    ...rows,
    [],
    ...summaryRows
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } }
  ];
  applyAdministrativeWorkbookStyle(sheet, report, 5, rows.length);
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 4, c: 0 },
      e: { r: 4 + rows.length, c: lastCol }
    })
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, report.title.slice(0, 31));
  const fileName = `${safeFileToken(report.title)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportComprasProveedorExcel(params: {
  response: ComprasProveedorReportResponse;
  fechaInicio: string;
  fechaFin: string;
}) {
  const rows: Array<Array<string | number>> = [];

  for (const compra of params.response.data) {
    const proveedor = compra.proveedor?.nombre ?? compra.proveedor?.razonSocial ?? "";
    const factura = compra.numeroFactura ?? "";
    compra.items.forEach((item, index) => {
      rows.push([
        index === 0 ? proveedor : "",
        index === 0 ? factura : "",
        item.cantidadRecibida,
        item.unidad ?? "",
        item.nombre ?? "",
        asExcelNumber(item.totalBs),
        asExcelNumber(item.totalSinIVA),
        item.grupo ?? item.categoria ?? ""
      ]);
    });
  }

  const aoa: Array<Array<string | number>> = [
    [],
    [],
    ["EMPRESA MINERA MARTE S.R.L."],
    ["LIPEÑA"],
    [],
    [
      "",
      "",
      "CUADRO DE INVENTARIOS Y SUMINISTROS CORRESPONDIENTE AL",
      comprasProveedorPeriodLabel(params.fechaInicio, params.fechaFin)
    ],
    [],
    ["P R O V E E D O R", "No FACTURA", "CANTIDAD", "UNIDAD", "D E S C R I P C I O N", "F-total Bs", "(-13%) Bs", "GRUPO"],
    ...rows,
    ["", "", "", "", "TOTAL GENERAL", asExcelNumber(params.response.totalGeneral), asExcelNumber(params.response.totalGeneralSinIVA), ""]
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!merges"] = [
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 6 } }
  ];
  sheet["!cols"] = [
    { wch: 28 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 44 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 }
  ];
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 7, c: 0 },
      e: { r: Math.max(7, 7 + rows.length), c: 7 }
    })
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Inventarios y Suministros");
  XLSX.writeFile(
    workbook,
    `inventarios-y-suministros-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export function exportStockReportExcel(params: {
  response: StockReportResponse;
  dateFilterLabel: string;
}) {
  const rows = params.response.data.map((item) => [
    item.codigo ?? "",
    item.nombre ?? "",
    item.unidad ?? "",
    item.categoria ?? "",
    asExcelNumber(item.cantidad),
    asExcelNumber(item.cantidadReservada),
    asExcelNumber(item.cantidadDisponible),
    asOptionalExcelNumber(item.precioUnit ?? item.precioProm),
    asExcelNumber(item.valorTotal)
  ]);
  const totalValor = params.response.data.reduce((sum, item) => sum + item.valorTotal, 0);

  saveSimpleWorkbook({
    title: "Stock Actual",
    subtitle: `Filtro fecha: ${params.dateFilterLabel}`,
    headers: [
      "Codigo",
      "Producto",
      "Unidad",
      "Categoria",
      "Cantidad",
      "Reservado",
      "Disponible",
      "P. Unit. Bs.",
      "Valor Total Bs."
    ],
    rows,
    footerRows: [
      ["Total registros", params.response.meta.total],
      ["Total valor Bs.", asExcelNumber(totalValor)]
    ],
    columns: [
      { wch: 16 },
      { wch: 42 },
      { wch: 10 },
      { wch: 24 },
      { wch: 13 },
      { wch: 13 },
      { wch: 13 },
      { wch: 14 },
      { wch: 16 }
    ],
    fileToken: "stock-actual"
  });
}

export function exportValesReportExcel(params: {
  response: ValesReportResponse;
  dateFilterLabel: string;
}) {
  const rows = params.response.data.flatMap((vale) => {
    const base = [
      vale.id,
      vale.estado,
      vale.solicitante?.nombre ?? "",
      vale.superintendente?.nombre ?? "",
      vale.almacenero?.nombre ?? "",
      vale.createdAt ? formatInventoryDate(vale.createdAt) : "",
      vale.aprobadoAt ? formatInventoryDate(vale.aprobadoAt) : "",
      vale.entregadoAt ? formatInventoryDate(vale.entregadoAt) : ""
    ];

    if (!vale.items.length) return [[...base, "", "", "", ""]];

    return vale.items.map((item, index) => [
      ...(index === 0 ? base : ["", "", "", "", "", "", "", ""]),
      item.producto?.codigo ?? "",
      item.producto?.nombre ?? "",
      asOptionalExcelNumber(item.cantidadSolicitada),
      asOptionalExcelNumber(item.cantidadEntregada)
    ]);
  });

  saveSimpleWorkbook({
    title: "Resumen De Vales",
    subtitle: `Filtro fecha: ${params.dateFilterLabel}`,
    headers: [
      "ID",
      "Estado",
      "Solicitante",
      "Superintendente",
      "Almacenero",
      "Creado",
      "Aprobado",
      "Entregado",
      "Codigo",
      "Producto",
      "Cant. Solicitada",
      "Cant. Entregada"
    ],
    rows,
    footerRows: [["Total registros", "total" in params.response.meta ? params.response.meta.total : rows.length]],
    columns: [
      { wch: 12 },
      { wch: 16 },
      { wch: 28 },
      { wch: 28 },
      { wch: 28 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 16 },
      { wch: 42 },
      { wch: 16 },
      { wch: 16 }
    ],
    fileToken: "vales-resumen"
  });
}

export function exportComprasReportExcel(params: {
  response: ComprasReportResponse;
  dateFilterLabel: string;
}) {
  const rows = params.response.data.flatMap((compra) => {
    const proveedor = compra.proveedor?.nombre ?? compra.proveedor?.razonSocial ?? "";
    const base = [
      compra.id,
      compra.numeroFactura ?? "",
      compra.estado,
      proveedor,
      compra.proveedor?.nit ?? "",
      compra.fechaOperacion
        ? formatInventoryDate(compra.fechaOperacion)
        : compra.createdAt
          ? formatInventoryDate(compra.createdAt)
          : "",
      compra.usuarioRegistro?.nombre ?? "",
      compra.usuarioRecibe?.nombre ?? "",
      asExcelNumber(compra.subtotalBs),
      compra.descuento,
      asExcelNumber(compra.descuentoBs),
      asExcelNumber(compra.totalBs),
      compra.anulacion?.motivo ?? "",
      compra.observacion ?? ""
    ];

    if (!compra.items.length) return [[...base, "", "", "", "", "", "", ""]];

    return compra.items.map((item, index) => [
      ...(index === 0 ? base : Array.from({ length: base.length }, () => "")),
      item.codigo ?? "",
      item.nombre ?? "",
      item.unidad ?? "",
      item.cantidadPedida,
      item.cantidadRecibida,
      asExcelNumber(item.precioUnit),
      asExcelNumber(item.subtotalBs)
    ]);
  });

  saveSimpleWorkbook({
    title: "Resumen De Compras",
    subtitle: `Filtro fecha: ${params.dateFilterLabel}`,
    headers: [
      "ID",
      "Factura",
      "Estado",
      "Proveedor",
      "NIT",
      "Fecha",
      "Registrado por",
      "Recibido por",
      "Subtotal Bs.",
      "Descuento %",
      "Descuento Bs.",
      "Total Bs.",
      "Anulacion",
      "Observacion",
      "Codigo",
      "Producto",
      "Unidad",
      "Cant. Pedida",
      "Cant. Recibida",
      "P. Unit. Bs.",
      "Subtotal Item Bs."
    ],
    rows,
    footerRows: [
      ["Total registros", "total" in params.response.meta ? params.response.meta.total : params.response.data.length],
      ["Total general Bs.", asExcelNumber(params.response.totalGeneral)]
    ],
    columns: [
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 32 },
      { wch: 16 },
      { wch: 20 },
      { wch: 28 },
      { wch: 28 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 28 },
      { wch: 32 },
      { wch: 16 },
      { wch: 42 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 }
    ],
    fileToken: "compras-resumen"
  });
}

export function exportInventoryReportPdf(report: InventoryReportDefinition) {
  const headers = report.columns.map((column) => column.label);
  const rows = report.rows.map((row) =>
    report.columns.map((column) => row.values[column.key] ?? "")
  );

  savePdfTable({
    type: report.type,
    title: report.title,
    subtitle: report.subtitle,
    headers,
    rows,
    summary: report.summary,
    rowKinds: report.rows.map((row) => row.type ?? "normal"),
    fileName: `${safeFileToken(report.title)}-${new Date().toISOString().slice(0, 10)}.pdf`
  });
}

type LegacyReportTab = "bin-card" | "bin-card-valorado";
type LegacyReportItem = BinCardItem | BinCardValoradoItem;

type LegacyExportContext = {
  tab: LegacyReportTab;
  items: LegacyReportItem[];
  productLabel: string;
  dateFilterLabel: string;
};

function legacyHeaders(tab: LegacyReportTab) {
  const base = ["Fecha", "Tipo", "Producto", "Cantidad", "Stock antes", "Stock despues"];
  if (tab === "bin-card-valorado") {
    return [
      ...base,
      "P. Unit Bs.",
      "Entrada Bs.",
      "Salida Bs.",
      "Saldo Bs.",
      "Usuario",
      "Referencia"
    ];
  }
  return [...base, "Usuario", "Referencia"];
}

function legacyRow(item: LegacyReportItem, tab: LegacyReportTab) {
  const base = [
    formatInventoryDate(item.fecha),
    item.tipo,
    item.productoNombre ?? "-",
    item.cantidad,
    item.stockAntes,
    item.stockDespues
  ];
  const referencia = `${item.referencia ?? "-"}${item.referenciaId ? ` (${item.referenciaId})` : ""}`;
  if (tab === "bin-card-valorado") {
    const valued = item as BinCardValoradoItem;
    return [
      ...base,
      valued.precioUnit ?? "",
      valued.entradaBs ?? "",
      valued.salidaBs ?? "",
      valued.saldoBs ?? "",
      item.usuarioNombre ?? "-",
      referencia
    ];
  }
  return [...base, item.usuarioNombre ?? "-", referencia];
}

export function exportLegacyBinCardExcel(context: LegacyExportContext) {
  const headers = legacyHeaders(context.tab);
  const rows = context.items.map((item) => legacyRow(item, context.tab));
  const title = context.tab === "bin-card" ? "BIN CARD" : "BIN CARD VALORADO";
  const lastCol = headers.length - 1;
  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA MARTE S.R.L."],
    [title],
    [`Producto: ${context.productLabel}`],
    [`Filtro fecha: ${context.dateFilterLabel}`],
    [],
    headers,
    ...rows
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } }
  ];
  sheet["!cols"] = headers.map((header, index) => {
    if (index === 0) return { wch: 22 };
    if (header === "Producto") return { wch: 36 };
    if (header === "Referencia") return { wch: 26 };
    return { wch: 14 };
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, title.slice(0, 31));
  XLSX.writeFile(workbook, `${safeFileToken(title)}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportLegacyBinCardPdf(context: LegacyExportContext) {
  const headers = legacyHeaders(context.tab);
  const rows = context.items.map((item) => legacyRow(item, context.tab));
  const title = context.tab === "bin-card" ? "Bin Card" : "Bin Card Valorado";

  savePdfTable({
    title,
    subtitle: `Producto: ${context.productLabel} | Filtro fecha: ${context.dateFilterLabel}`,
    headers,
    rows,
    summary: [{ label: "Total registros", value: rows.length }],
    fileName: `${safeFileToken(title)}-${new Date().toISOString().slice(0, 10)}.pdf`
  });
}
