import * as XLSX from "xlsx-js-style";
import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import type {
  BinCardItem,
  BinCardValoradoItem,
  ComprasReportResponse,
  ComprasProveedorReportResponse,
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
  numericColumns: Set<number> = new Set()
) {
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const current = sheet[address];
      setCellStyle(sheet, address, {
        ...style,
        ...(numericColumns.has(col) && typeof current?.v === "number" ? { numFmt: "#,##0.00" } : {})
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

function numberFormatRange(sheet: XLSX.WorkSheet, startRow: number, endRow: number, columns: number[]) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (const col of columns) {
      const address = cellAddress(row, col);
      if (sheet[address] && typeof sheet[address].v === "number") {
        sheet[address].s = { ...(sheet[address].s ?? {}), numFmt: "#,##0.00" };
      }
    }
  }
}

function exportBalanceMensualStyledExcel(report: InventoryReportDefinition) {
  const dataRows = report.rows.filter((row) => row.values.grupo);
  const rows = dataRows.map((row) => [
    String(valueOf(row, "grupo")).replace(/^0?/, ""),
    valueOf(row, "saldoInicial"),
    valueOf(row, "ingresoMateriales"),
    valueOf(row, "salidaMateriales"),
    valueOf(row, "saldoFinal")
  ]);
  const aoa: Array<Array<string | number>> = [
    ["Empresa Minera"],
    ["MARTE S.R.L."],
    ["BALANCE MENSUAL DE ALMACENES LIPEÑA"],
    [monthLabelFromSubtitle(report.subtitle)],
    [],
    ["GRUPO", "SALDO AL", "INGRESO\nMATERIALES", "SALIDA\nMATERIALES", "SALDO AL"],
    ...rows
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!merges"] = [
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } }
  ];
  sheet["!cols"] = [{ wch: 11 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  setCellStyle(sheet, "A1", { font: { bold: true, sz: 16 } });
  setCellStyle(sheet, "A2", { font: { bold: true, sz: 24, underline: true } });
  styleRange(sheet, { s: { r: 2, c: 0 }, e: { r: 3, c: 4 } }, excelTitleStyle);
  styleRange(sheet, { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } }, excelHeaderStyle);
  styleRange(sheet, { s: { r: 6, c: 0 }, e: { r: 5 + rows.length, c: 4 } }, excelBodyStyle);
  numberFormatRange(sheet, 6, 5 + rows.length, [1, 2, 3, 4]);
  dataRows.forEach((row, index) => {
    if (!row.type) return;
    const fill = row.type === "total" ? "FFE699" : "F2F2F2";
    styleRange(
      sheet,
      { s: { r: 6 + index, c: 0 }, e: { r: 6 + index, c: 4 } },
      { ...excelBodyStyle, font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: fill } } },
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

function exportDiarioAlmacenesStyledExcel(report: InventoryReportDefinition) {
  const rows = report.rows
    .filter((row) => row.type !== "group" || row.values.descripcion)
    .map((row) => [
      valueOf(row, "cargos"),
      valueOf(row, "descripcion"),
      valueOf(row, "parcialesBs"),
      valueOf(row, "cuenta"),
      valueOf(row, "debeBs"),
      valueOf(row, "haberBs")
    ]);
  const aoa: Array<Array<string | number>> = [
    ["COMPROBANTE  DE  DIARIO"],
    ["DIARIO  ALMACENES"],
    ["SECTOR:  LIPEÑA", monthLabelFromSubtitle(report.subtitle)],
    [],
    ["C A R G O S", "D E S C R I P C I O N", "PARCIALES\nBs.", "No  DE CUENTA", "BOLIVIANOS\nD E B E", "BOLIVIANOS\nH A B E R"],
    ...rows
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 5 } }
  ];
  sheet["!cols"] = [{ wch: 14 }, { wch: 46 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }];
  styleRange(sheet, { s: { r: 0, c: 0 }, e: { r: 2, c: 5 } }, excelTitleStyle);
  styleRange(sheet, { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } }, excelHeaderStyle);
  styleRange(sheet, { s: { r: 5, c: 0 }, e: { r: 4 + rows.length, c: 5 } }, excelBodyStyle);
  numberFormatRange(sheet, 5, 4 + rows.length, [2, 4, 5]);
  report.rows
    .filter((row) => row.type !== "group" || row.values.descripcion)
    .forEach((row, index) => {
      if (row.type === "group" || row.type === "total") {
        styleRange(sheet, { s: { r: 5 + index, c: 0 }, e: { r: 5 + index, c: 5 } }, {
          ...excelBodyStyle,
          font: { bold: true, sz: 10 }
        }, new Set([2, 4, 5]));
      }
    });
  appendAndSaveStyledSheet({ sheet, sheetName: "Diario Almacenes", fileToken: "diario-almacenes" });
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
    exportDetalleMaterialesStyledExcel(report);
    return;
  }
  if (report.type === "diario-almacenes" || report.type === "movimiento-almacen") {
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
