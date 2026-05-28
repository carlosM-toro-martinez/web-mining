import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import type { BinCardItem, BinCardValoradoItem } from "@/features/reportes/model/reportes.schema";
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

export function exportInventoryReportExcel(report: InventoryReportDefinition) {
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
  sheet["!cols"] = report.columns.map((column) => {
    if (column.align === "right") return { wch: 16 };
    if (column.label.toLowerCase().includes("descripcion")) return { wch: 48 };
    return { wch: 22 };
  });
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
