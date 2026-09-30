import * as XLSX from "xlsx-js-style";
import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";

// ============================================================================
// Comprobante de Egresos (documento físico real: "Bancos - Moneda Nacional"),
// compartido por Caja Chica (un gasto puntual) y Logística (el pago a un
// transportista) — mismo formato exacto en los dos lugares, para no
// mantener dos copias de un layout tan detallado.
// ============================================================================

export interface LineaComprobanteEgreso {
  numeroFactura?: string;
  numeroRegistro?: string;
  cuentaCodigo: string;
  cuentaNombre: string;
  debeBs: number;
  haberBs: number;
  debeUsd?: number;
  haberUsd?: number;
}

export interface ComprobanteEgresoData {
  numero: number;
  fecha: string;
  subtitulo: string;
  monedaLabel: "Bolivianos" | "Dólares Americanos";
  montoTotal: number;
  glosaPrincipal: string;
  lineas: LineaComprobanteEgreso[];
  lugar?: string;
  nombreArchivo: string;
}

function parseFecha(value: string): Date {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  return new Date(soloFecha);
}

const MESES_MINUSCULA = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

function fechaLarga(value: string): string {
  const date = parseFecha(value);
  const dia = date.getUTCDate();
  const mes = MESES_MINUSCULA[date.getUTCMonth()];
  return `${dia} de ${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${date.getUTCFullYear()}`;
}

function formatBs(value: number | undefined) {
  if (value === undefined || value === 0) return "";
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// --- Número en letras (para "Recibimos... la suma de ...") ---
const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const DIECIS = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
const DECENAS = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function menorQueCien(n: number): string {
  if (n < 10) return UNIDADES[n]!;
  if (n < 20) return DIECIS[n - 10]!;
  if (n === 20) return "VEINTE";
  if (n < 30) return `VEINTI${UNIDADES[n - 20]}`;
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${DECENAS[d]} Y ${UNIDADES[u]}` : DECENAS[d]!;
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
  return `${enteroALetras(entero)} ${String(centavos).padStart(2, "0")}/100`;
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

// --- Excel ---
const thinBorder = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } }
};
const titleStyle = { font: { bold: true, sz: 13 }, alignment: { horizontal: "center", vertical: "center" } };
const headerStyle = { font: { bold: true, sz: 8 }, alignment: { horizontal: "center", vertical: "center" }, border: thinBorder };
const bodyStyle = { font: { sz: 9 }, border: thinBorder };

function setStyle(sheet: XLSX.WorkSheet, address: string, style: Record<string, unknown>) {
  if (!sheet[address]) sheet[address] = { t: "s", v: "" };
  sheet[address].s = style;
}

function styleRow(sheet: XLSX.WorkSheet, row: number, lastCol: number, style: Record<string, unknown>) {
  for (let c = 0; c <= lastCol; c += 1) {
    setStyle(sheet, XLSX.utils.encode_cell({ r: row, c }), style);
  }
}

function numberFormatCell(sheet: XLSX.WorkSheet, row: number, col: number) {
  const address = XLSX.utils.encode_cell({ r: row, c: col });
  if (sheet[address] && typeof sheet[address].v === "number") {
    sheet[address].s = { ...(sheet[address].s ?? {}), numFmt: "#,##0.00", alignment: { horizontal: "right" } };
  }
}

function hoyLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function exportComprobanteEgresoExcel(data: ComprobanteEgresoData) {
  const lastCol = 6; // N°FACTURA, N°REGISTRO, CUENTA, BS-DEBE, BS-HABER, USD-DEBE, USD-HABER
  const lugar = data.lugar ?? "La Lipeña";
  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA MARTE S.R.L.", "", "", "", `Nº ${String(data.numero).padStart(6, "0")}`, "", ""],
    ["SECTOR MINERO: LA LIPEÑA", "", "COMPROBANTE DE EGRESOS", "", "COMPROBANTE DIARIO", "", ""],
    ["", "", data.subtitulo, "", "CHEQUE Nro.:", "", ""],
    [],
    [`Recibimos de la Empresa Minera Marte S.R.L. la suma de ${montoEnLetras(data.montoTotal)} ${data.monedaLabel === "Bolivianos" ? "00/100" : "00/100"}`, "", "", "", "", "", data.monedaLabel],
    [],
    ["N° DE FACTURA", "N° DE REGISTRO", "CUENTA", "BOLIVIANOS", "", "MONEDA AMERICANA", ""],
    ["", "", "", "DEBE", "HABER", "DEBE", "HABER"]
  ];
  const rowKinds: Array<"title" | "normal" | "header"> = [
    "title", "normal", "normal", "normal", "normal", "normal", "header", "header"
  ];

  for (const linea of data.lineas) {
    aoa.push([
      linea.numeroFactura ?? "",
      linea.numeroRegistro ?? "",
      `${linea.cuentaCodigo} ${linea.cuentaNombre}`.trim(),
      linea.debeBs || "",
      linea.haberBs || "",
      linea.debeUsd || "",
      linea.haberUsd || ""
    ]);
    rowKinds.push("normal");
  }

  const totalDebeBs = data.lineas.reduce((acc, l) => acc + l.debeBs, 0);
  const totalHaberBs = data.lineas.reduce((acc, l) => acc + l.haberBs, 0);
  const totalDebeUsd = data.lineas.reduce((acc, l) => acc + (l.debeUsd ?? 0), 0);
  const totalHaberUsd = data.lineas.reduce((acc, l) => acc + (l.haberUsd ?? 0), 0);
  aoa.push(["", "", "TOTALES", totalDebeBs, totalHaberBs, totalDebeUsd || "", totalHaberUsd || ""]);
  rowKinds.push("header");

  const glosaRow = aoa.length;
  aoa.push([`GLOSA: ${data.glosaPrincipal}`, "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push(["Administrador", "", "", "Superintendente General", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([`${lugar}, ${fechaLarga(data.fecha)}`, "", "", "", "Recibí Conforme", "", ""]);
  rowKinds.push("normal");
  aoa.push(["", "", "", "", "Nombre: ______________________", "", ""]);
  rowKinds.push("normal");
  aoa.push(["", "", "", "", "C.I.: ______________________", "", ""]);
  rowKinds.push("normal");

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 32 }, { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 12 }];
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 2 }, e: { r: 1, c: 3 } },
    { s: { r: 1, c: 4 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } },
    { s: { r: 2, c: 4 }, e: { r: 2, c: lastCol } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } },
    { s: { r: 6, c: 3 }, e: { r: 6, c: 4 } },
    { s: { r: 6, c: 5 }, e: { r: 6, c: lastCol } },
    { s: { r: glosaRow, c: 0 }, e: { r: glosaRow, c: lastCol } }
  ];

  rowKinds.forEach((kind, index) => {
    const style = kind === "title" ? { font: { bold: true, sz: 12 } } : kind === "header" ? headerStyle : bodyStyle;
    styleRow(sheet, index, lastCol, style);
  });
  setStyle(sheet, XLSX.utils.encode_cell({ r: 1, c: 2 }), titleStyle);
  for (const col of [3, 4, 5, 6]) {
    for (let r = 8; r < 8 + data.lineas.length + 1; r += 1) numberFormatCell(sheet, r, col);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Comprobante de Egresos".slice(0, 31));
  XLSX.writeFile(workbook, `${data.nombreArchivo}-${hoyLocal()}.xlsx`);
}

// --- PDF: se dibuja a mano (rects/líneas), igual que el Conocimiento de
// Carga de Logística — un jspdf-autotable genérico no puede armar las cajas
// del encabezado (Nº folio, Comprobante Diario, Cheque Nro.) tal como están
// en el documento físico real.
export function exportComprobanteEgresoPdf(data: ComprobanteEgresoData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const boxW = 130;
  const boxX = pageWidth - margin - boxW;

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);

  // --- Encabezado ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("EMPRESA MINERA", margin, 46);
  doc.text("MARTE S.R.L.", margin, 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("SECTOR MINERO: LA LIPEÑA", margin, 76);

  const centerX = margin + (boxX - margin) / 2 + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("COMPROBANTE DE EGRESOS", centerX, 52, { align: "center" });
  doc.setFontSize(9);
  doc.text(data.subtitulo, centerX, 66, { align: "center" });

  // Caja Nº
  doc.rect(boxX, 30, boxW, 26);
  doc.setFontSize(13);
  doc.text(`Nº ${String(data.numero).padStart(6, "0")}`, boxX + boxW / 2, 47, { align: "center" });
  // Caja Comprobante Diario
  doc.rect(boxX, 56, boxW, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("COMPROBANTE DIARIO", boxX + boxW / 2, 70, { align: "center" });
  doc.line(boxX + boxW - 24, 56, boxX + boxW - 24, 78);
  // Caja Cheque Nro.
  doc.rect(boxX, 78, boxW, 18);
  doc.text("CHEQUE Nro.:", boxX + 4, 90);

  // --- Recibimos de... ---
  const recibimosY = 104;
  const recibimosH = 46;
  doc.rect(margin, recibimosY, pageWidth - margin * 2, recibimosH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const recibimosTexto = `Recibimos de la Empresa Minera Marte S.R.L. la suma de ${montoEnLetras(data.montoTotal)} 00/100`;
  const recibimosLineas = doc.splitTextToSize(recibimosTexto, pageWidth - margin * 2 - 90);
  doc.text(recibimosLineas, margin + 6, recibimosY + 16);
  doc.setFont("helvetica", "bold");
  doc.text(data.monedaLabel, pageWidth - margin - 6, recibimosY + recibimosH - 8, { align: "right" });

  // --- Tabla de cuentas ---
  const rows: RowInput[] = data.lineas.map((l) => [
    l.numeroFactura ?? "",
    l.numeroRegistro ?? "",
    `${l.cuentaCodigo} ${l.cuentaNombre}`.trim(),
    formatBs(l.debeBs),
    formatBs(l.haberBs),
    formatBs(l.debeUsd),
    formatBs(l.haberUsd)
  ]);
  const totalDebeBs = data.lineas.reduce((acc, l) => acc + l.debeBs, 0);
  const totalHaberBs = data.lineas.reduce((acc, l) => acc + l.haberBs, 0);
  const totalDebeUsd = data.lineas.reduce((acc, l) => acc + (l.debeUsd ?? 0), 0);
  const totalHaberUsd = data.lineas.reduce((acc, l) => acc + (l.haberUsd ?? 0), 0);
  rows.push(["", "", "TOTALES", formatBs(totalDebeBs), formatBs(totalHaberBs), formatBs(totalDebeUsd), formatBs(totalHaberUsd)]);

  autoTable(doc, {
    theme: "plain",
    startY: recibimosY + recibimosH + 6,
    head: [
      [
        { content: "N° DE\nFACTURA", rowSpan: 2 },
        { content: "N° DE\nREGISTRO", rowSpan: 2 },
        { content: "CUENTA", rowSpan: 2 },
        { content: "BOLIVIANOS", colSpan: 2 },
        { content: "MONEDA AMERICANA", colSpan: 2 }
      ],
      [{ content: "DEBE" }, { content: "HABER" }, { content: "DEBE" }, { content: "HABER" }]
    ] as unknown as RowInput[],
    body: rows,
    styles: { fontSize: 8, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.4, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", halign: "center", lineWidth: 0.4, lineColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 55 },
      2: { cellWidth: 165 },
      3: { halign: "right", cellWidth: 55 },
      4: { halign: "right", cellWidth: 55 },
      5: { halign: "right", cellWidth: 55 },
      6: { halign: "right", cellWidth: 55 }
    },
    margin: { left: margin, right: margin },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.row.index === rows.length - 1) hook.cell.styles.fontStyle = "bold";
    }
  });
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  let y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? recibimosY + recibimosH + 40;
  y += 6;

  // --- Glosa ---
  const glosaH = 40;
  doc.rect(margin, y, pageWidth - margin * 2, glosaH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("GLOSA:", margin + 6, y + 13);
  doc.setFont("helvetica", "normal");
  const glosaLineas = doc.splitTextToSize(data.glosaPrincipal, pageWidth - margin * 2 - 50);
  doc.text(glosaLineas, margin + 46, y + 13);
  y += glosaH + 20;

  // --- Firmas ---
  const firmaW = (pageWidth - margin * 2) / 2;
  const firmaH = 46;
  doc.rect(margin, y, firmaW, firmaH);
  doc.rect(margin + firmaW, y, firmaW, firmaH);
  doc.setFontSize(8);
  doc.text("Administrador", margin + firmaW / 2, y + firmaH - 8, { align: "center" });
  doc.text("Superintendente General", margin + firmaW + firmaW / 2, y + firmaH - 8, { align: "center" });
  y += firmaH + 24;

  // --- Recibí conforme + fecha ---
  const lugar = data.lugar ?? "La Lipeña";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${lugar}, ${fechaLarga(data.fecha)}`, margin, y);

  const reciboX = pageWidth - margin - 200;
  doc.text("Recibí Conforme", reciboX, y - 20);
  doc.text("Nombre: ________________________", reciboX, y);
  doc.text("C.I.: ________________________", reciboX, y + 16);

  openBrowserPrintDialog(doc, `${data.nombreArchivo}-${hoyLocal()}.pdf`);
}
