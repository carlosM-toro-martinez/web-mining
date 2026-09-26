import * as XLSX from "xlsx-js-style";
import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import type { Liquidacion } from "@/features/liquidacion/model/liquidacion.schema";
import type { CuadroMensual } from "@/features/logisticaReportes/model/logisticaReportes.schema";
import type { LoteDespacho } from "@/features/loteDespacho/model/loteDespacho.schema";

const MESES_MAYUSCULA = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

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

function formatHora(value: string) {
  const date = new Date(value);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Las boletas de pesaje reales (balanza) registran el peso en Libras (lectura
// directa de la báscula) Y en Kg (conversión); nuestro modelo solo guarda
// toneladas métricas (que ya coinciden 1:1 con el Neto Kg / 1000 del
// documento real) — Kg y Lb se recalculan aquí, no hace falta guardarlos.
const KG_POR_TONELADA = 1000;
const LB_POR_KG = 2.20462;

function toneladasAKg(toneladas: number) {
  return Math.round(toneladas * KG_POR_TONELADA);
}

function toneladasALb(toneladas: number) {
  return Math.round(toneladas * KG_POR_TONELADA * LB_POR_KG);
}

function num(value: number) {
  return Number(value.toFixed(2));
}

function formatBs(value: number) {
  return value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// --- Números en letras (para el "Son: ..." de las liquidaciones) ---
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
  return `${enteroALetras(entero)} ${String(centavos).padStart(2, "0")}/100 BOLIVIANOS`;
}

// --- Estilos: blanco y negro liso, como los documentos impresos reales ---
const thinBorder = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } }
};
const titleStyle = { font: { bold: true, sz: 13 }, alignment: { horizontal: "center", vertical: "center" } };
const subtitleStyle = { font: { bold: true, sz: 10 }, alignment: { horizontal: "center" } };
const headerStyle = { font: { bold: true, sz: 9 }, alignment: { horizontal: "center", vertical: "center" }, border: thinBorder };
const bodyStyle = { font: { sz: 9 }, border: thinBorder };
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

function numberFormatCell(sheet: XLSX.WorkSheet, row: number, col: number) {
  const address = XLSX.utils.encode_cell({ r: row, c: col });
  if (sheet[address] && typeof sheet[address].v === "number") {
    sheet[address].s = { ...(sheet[address].s ?? {}), numFmt: "#,##0.00", alignment: { horizontal: "right" } };
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

const pdfTableStyles = { fontSize: 8, cellPadding: 3, lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.4, textColor: [0, 0, 0] as [number, number, number] };
const pdfHeadStyles = { fillColor: [255, 255, 255] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: "bold" as const, lineWidth: 0.4, lineColor: [0, 0, 0] as [number, number, number] };

// autoTable usa el tema "striped" por defecto, que pinta filas alternas de
// gris aunque se le pase fillColor blanco en `styles` — por eso salía
// "rayado" en vez de blanco liso como el documento real. "plain" lo evita.
// También deja el color de texto/línea del último borde que dibujó como
// color "actual" del documento, así que cualquier doc.text() posterior sale
// con ese color residual si no se resetea a negro — por eso todo lo que
// viene después de una tabla salía en un tono café/naranja.
function drawPlainTable(doc: jsPDF, options: Parameters<typeof autoTable>[1]) {
  autoTable(doc, { theme: "plain", ...options });
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
}

// ============================================================================
// Agrupa el detalle de una liquidación por placa — el documento real (tanto
// para empresas con contrato como para particulares) lista un renglón por
// vehículo, no uno por viaje/lote.
// ============================================================================
export interface FilaPorPlaca {
  placa: string;
  descripcionServicio: string;
  pesoTotal: number;
  precioAplicado: number;
  viajes: number;
  subtotal: number;
}

export function agruparPorPlaca(liquidacion: Liquidacion): FilaPorPlaca[] {
  const mapa = new Map<string, FilaPorPlaca>();
  for (const d of liquidacion.detalleLotes ?? []) {
    const placa = d.lote?.vehiculo?.placa ?? "-";
    const origen = d.lote?.municipioOrigen?.nombre?.toUpperCase();
    const destino = d.lote?.destinoIngenio?.nombre?.toUpperCase();
    const descripcionServicio =
      origen && destino ? `CARGA BRUTA DE MINERAL ${origen} - ${destino}` : "CARGA BRUTA DE MINERAL";
    const fila =
      mapa.get(placa) ?? { placa, descripcionServicio, pesoTotal: 0, precioAplicado: Number(d.precioAplicado), viajes: 0, subtotal: 0 };
    fila.pesoTotal += Number(d.tonelajeNeto);
    fila.viajes += 1;
    fila.subtotal += Number(d.subtotal);
    mapa.set(placa, fila);
  }
  return Array.from(mapa.values());
}

// Se calcula siempre en vivo a partir del detalle (nunca leyendo
// liquidacion.totalBruto/totalNeto directo) porque esos campos solo quedan
// guardados en la BD al CERRAR — así los reportes también sirven de vista
// previa mientras la liquidación sigue en BORRADOR.
export function calcularTotales(liquidacion: Liquidacion) {
  const bruto = (liquidacion.detalleLotes ?? []).reduce((acc, d) => acc + Number(d.subtotal), 0);
  const abonos = (liquidacion.itemsConcepto ?? [])
    .filter((i) => i.concepto?.tipo === "ABONO")
    .reduce((acc, i) => acc + Number(i.monto), 0);
  const deducciones = (liquidacion.itemsConcepto ?? [])
    .filter((i) => i.concepto?.tipo === "DEDUCCION")
    .reduce((acc, i) => acc + Number(i.monto), 0);
  return { bruto, abonos, deducciones, neto: bruto + abonos - deducciones };
}

// "Fecha 31 de Agosto del 2026" — el "del" (no "de") antes del año es tal
// cual el documento real.
function fechaLiquidacionLarga(value: string) {
  const date = parseFecha(value);
  const mes = MESES_MAYUSCULA[date.getUTCMonth()]!;
  const mesCapitalizado = mes.charAt(0) + mes.slice(1).toLowerCase();
  return `${date.getUTCDate()} de ${mesCapitalizado} del ${date.getUTCFullYear()}`;
}

function periodoLabel(liquidacion: Liquidacion) {
  const fin = parseFecha(liquidacion.fechaFin);
  return `${MESES_MAYUSCULA[fin.getUTCMonth()]} ${fin.getUTCFullYear()}`;
}

const MARTE_NIT = "151558022";
const FIRMA_SUPERINTENDENTE = "Zenon Canaviri A";
const FIRMA_SUPERINTENDENTE_CARGO = "Superintendente General";
const FIRMA_ASISTENTE = "Lic. Maura M. Ucumari Alvarez";
const FIRMA_ASISTENTE_CARGO = "Asistente Administrativo";

// Pie de página fijo al fondo de la hoja (no "en cascada" siguiendo el flujo
// del contenido): todas las firmas quedan en la MISMA línea horizontal,
// cada una con su propia raya arriba del nombre, repartidas a lo ancho.
function dibujarPiePagina(doc: jsPDF, firmas: Array<{ nombre: string; cargo: string }>, ccLines: string[]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const yFirmas = pageHeight - 45;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let ccY = yFirmas - 20 - (ccLines.length - 1) * 10;
  for (const linea of ccLines) {
    doc.text(linea, 30, ccY);
    ccY += 10;
  }

  const n = firmas.length;
  firmas.forEach((firma, index) => {
    const x = (pageWidth / (n + 1)) * (index + 1);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.line(x - 75, yFirmas - 14, x + 75, yFirmas - 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(firma.nombre, x, yFirmas, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(firma.cargo, x, yFirmas + 11, { align: "center" });
  });
}

// ============================================================================
// Liquidación — Empresa con contrato (ej. EMUSA): ITEM/PLACA/DESCRIPCION DEL
// SERVICIO/PESO TMB/BS TMB/VIAJES/BS DIA/TOTAL/OBSERVACIONES, con "Menos:"
// por cada deducción y "Son: ..." al pie, igual al documento real.
// ============================================================================

export function exportLiquidacionEmpresaExcel(liquidacion: Liquidacion) {
  const filas = agruparPorPlaca(liquidacion);
  const abonos = (liquidacion.itemsConcepto ?? []).filter((i) => i.concepto?.tipo === "ABONO");
  const deducciones = (liquidacion.itemsConcepto ?? []).filter((i) => i.concepto?.tipo === "DEDUCCION");
  const totales = calcularTotales(liquidacion);
  const lastCol = 8;
  const pesoTotalTmb = filas.reduce((acc, f) => acc + f.pesoTotal, 0);

  const aoa: Array<Array<string | number>> = [
    ["Empresa Minera", "", "", "", "", "", "N°", liquidacion.numero ?? "BORRADOR", ""] as any,
    [`MARTE S.R.L. — NIT: ${MARTE_NIT}`, "", "", "", "", "", "", "", ""],
    [],
    ["LIQUIDACION SERVICIO DE TRANSPORTE", "", "", "", "", "", "", "", ""],
    [`CONTRATISTA: ${liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? ""}`, "", "", "", "", "", "", "", ""],
    [`CORRESPONDIENTE A: ${periodoLabel(liquidacion)}`, "", "", "", "", "", "", "", ""],
    [],
    ["ITEM", "PLACA", "DESCRIPCION DEL SERVICIO", "PESO TMB", "BS/TMB", "VIAJES", "BS/DIA", "TOTAL", "OBSERVACIONES"]
  ];
  const rowKinds: Array<"title" | "subtitle" | "header" | "normal" | "total"> = [
    "subtitle", "subtitle", "normal", "title", "subtitle", "subtitle", "normal", "header"
  ];

  let item = 1;
  for (const f of filas) {
    aoa.push([item, f.placa, f.descripcionServicio, num(f.pesoTotal), num(f.precioAplicado), f.viajes, "", num(f.subtotal), ""]);
    rowKinds.push("normal");
    item += 1;
  }
  for (const a of abonos) {
    aoa.push([item, "", a.concepto?.nombre?.toUpperCase() ?? "ABONO", "", "", "", "", num(Number(a.monto)), a.descripcion ?? ""]);
    rowKinds.push("normal");
    item += 1;
  }
  aoa.push(["", "", "TOTAL TMB", num(pesoTotalTmb), "", "", "", "", ""]);
  rowKinds.push("total");

  const totalLiquidacion = totales.bruto + totales.abonos;
  aoa.push(["", "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push(["TOTAL LIQUIDACION", "", "", "", "", "", "", num(totalLiquidacion), ""]);
  rowKinds.push("total");
  for (const d of deducciones) {
    aoa.push([`Menos: ${d.concepto?.nombre?.toUpperCase() ?? "DEDUCCION"} (BS)`, "", "", "", "", "", "", num(Number(d.monto)), ""]);
    rowKinds.push("normal");
  }
  aoa.push(["LIQUIDO A PAGAR", "", "", "", "", "", "", num(totales.neto), ""]);
  rowKinds.push("total");
  aoa.push([`Fecha: ${fechaLiquidacionLarga(liquidacion.fechaFin)}`, "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([`Son: ${montoEnLetras(totales.neto)}`, "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([FIRMA_SUPERINTENDENTE, "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([FIRMA_SUPERINTENDENTE_CARGO, "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([FIRMA_ASISTENTE, "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([FIRMA_ASISTENTE_CARGO, "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? "", "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push(["Contratista", "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push(["C.c. Presidente Ejecutivo", "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push(["C.c. Contabilidad La Paz", "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push(["C.c. Archivos Mina", "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push(["C.c. Contratista", "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
  sheet["!merges"] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: lastCol } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: lastCol } }
  ];
  rowKinds.forEach((kind, index) => {
    const style = kind === "title" ? titleStyle : kind === "subtitle" ? subtitleStyle : kind === "header" ? headerStyle : kind === "total" ? totalStyle : bodyStyle;
    styleRow(sheet, index, lastCol, style);
  });
  for (const col of [3, 4, 7]) {
    for (let r = 0; r < aoa.length; r += 1) numberFormatCell(sheet, r, col);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Liquidacion".slice(0, 31));
  XLSX.writeFile(workbook, `liquidacion-empresa-${liquidacion.numero ?? liquidacion.id.slice(0, 8)}.xlsx`);
}

export function exportLiquidacionEmpresaPdf(liquidacion: Liquidacion) {
  const filas = agruparPorPlaca(liquidacion);
  const abonos = (liquidacion.itemsConcepto ?? []).filter((i) => i.concepto?.tipo === "ABONO");
  const deducciones = (liquidacion.itemsConcepto ?? []).filter((i) => i.concepto?.tipo === "DEDUCCION");
  const totales = calcularTotales(liquidacion);
  const pesoTotalTmb = filas.reduce((acc, f) => acc + f.pesoTotal, 0);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Empresa Minera", 30, 26);
  doc.text("MARTE S.R.L.", 30, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`NIT: ${MARTE_NIT}`, 30, 50);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.rect(pageWidth - 90, 20, 60, 22);
  doc.text(liquidacion.numero ? `N° ${liquidacion.numero}` : "BORRADOR", pageWidth - 60, 34, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(...AZUL_CONOCIMIENTO);
  doc.text("LIQUIDACION SERVICIO DE TRANSPORTE", centerX, 30, { align: "center" });
  const tituloWidth = doc.getTextWidth("LIQUIDACION SERVICIO DE TRANSPORTE");
  doc.setDrawColor(...AZUL_CONOCIMIENTO);
  doc.setLineWidth(0.8);
  doc.line(centerX - tituloWidth / 2, 33, centerX + tituloWidth / 2, 33);
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`CONTRATISTA: ${liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? ""}`, centerX, 46, { align: "center" });
  doc.text(`CORRESPONDIENTE A: ${periodoLabel(liquidacion)}`, centerX, 60, { align: "center" });

  const rows: RowInput[] = [];
  let item = 1;
  for (const f of filas) {
    rows.push([item, f.placa, f.descripcionServicio, formatBs(f.pesoTotal), formatBs(f.precioAplicado), String(f.viajes), "", formatBs(f.subtotal), ""]);
    item += 1;
  }
  for (const a of abonos) {
    rows.push([item, "", a.concepto?.nombre?.toUpperCase() ?? "ABONO", "", "", "", "", formatBs(Number(a.monto)), a.descripcion ?? ""]);
    item += 1;
  }
  rows.push(["", "", "TOTAL TMB", formatBs(pesoTotalTmb), "", "", "", "", ""]);

  drawPlainTable(doc, {
    startY: 74,
    head: [["ITEM", "PLACA", "DESCRIPCION DEL SERVICIO", "PESO TMB", "BS/TMB", "VIAJES", "BS/DIA", "TOTAL", "OBSERVACIONES"]],
    body: rows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
    margin: { left: 30, right: 30 }
  });

  // Caja de totales con bordes reales (tabla, no texto suelto) — igual a la
  // caja recuadrada del documento real.
  const totalLiquidacion = totales.bruto + totales.abonos;
  const totalesRows: RowInput[] = [["TOTAL LIQUIDACION", formatBs(totalLiquidacion)]];
  for (const d of deducciones) {
    totalesRows.push([`Menos: ${d.concepto?.nombre?.toUpperCase() ?? "DEDUCCION"} (BS)`, formatBs(Number(d.monto))]);
  }
  totalesRows.push(["LIQUIDO A PAGAR", formatBs(totales.neto)]);

  drawPlainTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 16,
    body: totalesRows,
    styles: { ...pdfTableStyles, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: 90, halign: "right" } },
    margin: { left: pageWidth - 30 - 270 },
    tableWidth: 270
  });

  let y = (doc as any).lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fecha: ${fechaLiquidacionLarga(liquidacion.fechaFin)}`, pageWidth - 30, y, { align: "right" });

  y += 24;
  doc.text(`Son: ${montoEnLetras(totales.neto)}`, 30, y);

  dibujarPiePagina(
    doc,
    [
      { nombre: liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? "", cargo: "Contratista" },
      { nombre: FIRMA_ASISTENTE, cargo: FIRMA_ASISTENTE_CARGO },
      { nombre: FIRMA_SUPERINTENDENTE, cargo: FIRMA_SUPERINTENDENTE_CARGO }
    ],
    ["C.c. Presidente Ejecutivo", "C.c. Contabilidad La Paz", "C.c. Archivos Mina", "C.c. Contratista"]
  );

  openBrowserPrintDialog(doc, `liquidacion-empresa-${liquidacion.numero ?? liquidacion.id.slice(0, 8)}.pdf`);
}

// ============================================================================
// Liquidación — Particular (ej. Roger Orlando Quispe Miranda): ITEM/PLACA/
// PRECIO TMB/TOTAL, con banco y N° de cuenta, "Son: ..." al pie.
// ============================================================================

export function exportLiquidacionParticularExcel(liquidacion: Liquidacion) {
  const filas = agruparPorPlaca(liquidacion);
  const lastCol = 5;
  const fin = parseFecha(liquidacion.fechaFin);
  const pesoTotalTmb = filas.reduce((acc, f) => acc + f.pesoTotal, 0);
  const totales = calcularTotales(liquidacion);
  const totalLiquidacion = totales.bruto + totales.abonos;
  const banco = liquidacion.transportista?.banco;
  const numeroCuenta = liquidacion.transportista?.numeroCuenta;

  const aoa: Array<Array<string | number>> = [
    [liquidacion.numero ? `Nº ${liquidacion.numero}` : "BORRADOR", "", "", "", "", ""],
    ["Empresa Minera", "", "", "", "", ""],
    [`MARTE S.R.L. — NIT: ${MARTE_NIT}`, "", "", "", "", ""],
    [],
    ["LIQUIDACION POR SERVICIO DE TRANSPORTE DE CARGAS", "", "", "", "", ""],
    ["MINERALIZADAS (MINA LIPEÑA - CHILCOBIJA)", "", "", "", "", ""],
    [`CONTRATISTA: ${liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? ""}`, "", "", "", "", ""],
    [
      "CORRESPONDIENTE A:",
      `Fecha: ${fin.getUTCDate()}`,
      `Mes: ${MESES_MAYUSCULA[fin.getUTCMonth()]}`,
      `Año: ${fin.getUTCFullYear()}`,
      banco ? `Banco: ${banco.toUpperCase()}` : "",
      numeroCuenta ? `Cuenta: ${numeroCuenta}` : ""
    ],
    [],
    ["ITEM", "PLACA", "PESO", "PRECIO TMB", "TOTAL", "OBSERVACIONES"]
  ];
  const rowKinds: Array<"title" | "subtitle" | "header" | "normal" | "total"> = [
    "normal", "subtitle", "subtitle", "normal", "title", "title", "subtitle", "normal", "normal", "header"
  ];

  let item = 1;
  for (const f of filas) {
    aoa.push([item, f.placa, num(f.pesoTotal), num(f.precioAplicado), num(f.subtotal), ""]);
    rowKinds.push("normal");
    item += 1;
  }
  aoa.push(["", "TOTAL TMB", num(pesoTotalTmb), "", "", ""]);
  rowKinds.push("total");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push(["TOTAL LIQUIDACION", "", "", "", num(totalLiquidacion), ""]);
  rowKinds.push("total");
  aoa.push([`LIQUIDO A PAGAR.... ${montoEnLetras(totales.neto)}`, "", "", "", num(totales.neto), ""]);
  rowKinds.push("total");
  aoa.push([`Fecha, ${fechaLiquidacionLarga(liquidacion.fechaFin)}`, "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([FIRMA_SUPERINTENDENTE, "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push(["Sup.te Mina Lipeña", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push(["Contratista", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push(["C.c. Presidente Ejecutivo", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push(["C.c. Jefe de Personal", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push(["C.c. Archivos Mina", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push(["C.c. Contratista", "", "", "", "", ""]);
  rowKinds.push("normal");

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 18 }];
  sheet["!merges"] = [
    { s: { r: 4, c: 0 }, e: { r: 4, c: lastCol } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: lastCol } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: lastCol } }
  ];
  rowKinds.forEach((kind, index) => {
    const style = kind === "title" ? titleStyle : kind === "subtitle" ? subtitleStyle : kind === "header" ? headerStyle : kind === "total" ? totalStyle : bodyStyle;
    styleRow(sheet, index, lastCol, style);
  });
  for (const col of [2, 3, 4]) {
    for (let r = 0; r < aoa.length; r += 1) numberFormatCell(sheet, r, col);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Liquidacion".slice(0, 31));
  XLSX.writeFile(workbook, `liquidacion-particular-${liquidacion.numero ?? liquidacion.id.slice(0, 8)}.xlsx`);
}

export function exportLiquidacionParticularPdf(liquidacion: Liquidacion) {
  const filas = agruparPorPlaca(liquidacion);
  const fin = parseFecha(liquidacion.fechaFin);
  const pesoTotalTmb = filas.reduce((acc, f) => acc + f.pesoTotal, 0);
  const totales = calcularTotales(liquidacion);
  const totalLiquidacion = totales.bruto + totales.abonos;
  const banco = liquidacion.transportista?.banco;
  const numeroCuenta = liquidacion.transportista?.numeroCuenta;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(liquidacion.numero ? `Nº ${liquidacion.numero}` : "BORRADOR", 30, 24);
  doc.text("Empresa Minera", 30, 40);
  doc.text("MARTE S.R.L.", 30, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`NIT: ${MARTE_NIT}`, 30, 62);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("LIQUIDACION POR SERVICIO DE TRANSPORTE DE CARGAS", centerX, 34, { align: "center", maxWidth: pageWidth - 100 });
  doc.text("MINERALIZADAS (MINA LIPEÑA - CHILCOBIJA)", centerX, 48, { align: "center", maxWidth: pageWidth - 100 });
  doc.setFontSize(10);
  doc.text(`CONTRATISTA: ${liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? ""}`, centerX, 66, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `CORRESPONDIENTE A: Fecha ${fin.getUTCDate()}   Mes: ${MESES_MAYUSCULA[fin.getUTCMonth()]}   Año: ${fin.getUTCFullYear()}`,
    centerX,
    80,
    { align: "center" }
  );
  if (banco || numeroCuenta) {
    doc.text(`${banco ? `Banco: ${banco.toUpperCase()}` : ""}${numeroCuenta ? `   Cuenta: ${numeroCuenta}` : ""}`, centerX, 92, {
      align: "center"
    });
  }

  const rows: RowInput[] = filas.map((f, index) => [index + 1, f.placa, formatBs(f.pesoTotal), formatBs(f.precioAplicado), formatBs(f.subtotal), ""]);
  rows.push(["", "TOTAL TMB", formatBs(pesoTotalTmb), "", "", ""]);

  drawPlainTable(doc, {
    startY: 104,
    head: [["ITEM", "PLACA", "PESO", "PRECIO TMB", "TOTAL", "OBSERVACIONES"]],
    body: rows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    margin: { left: 40, right: 40 }
  });

  // Caja de totales con bordes reales (tabla, no texto suelto).
  drawPlainTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 14,
    body: [["TOTAL LIQUIDACION", formatBs(totalLiquidacion)]],
    styles: { ...pdfTableStyles, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 90, halign: "right" } },
    margin: { left: pageWidth - 40 - 230 },
    tableWidth: 230
  });

  const y0 = (doc as any).lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`LIQUIDO A PAGAR.... ${montoEnLetras(totales.neto)}`, 40, y0, { maxWidth: pageWidth - 80 });
  doc.text(`Fecha, ${fechaLiquidacionLarga(liquidacion.fechaFin)}`, 40, y0 + 20);

  dibujarPiePagina(
    doc,
    [
      { nombre: liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? "", cargo: "Contratista" },
      { nombre: FIRMA_SUPERINTENDENTE, cargo: "Sup.te Mina Lipeña" }
    ],
    ["C.c. Presidente Ejecutivo", "C.c. Jefe de Personal", "C.c. Archivos Mina", "C.c. Contratista"]
  );

  openBrowserPrintDialog(doc, `liquidacion-particular-${liquidacion.numero ?? liquidacion.id.slice(0, 8)}.pdf`);
}

// ============================================================================
// Cuadro Mensual (consolidado) — mismas columnas que ya se ven en pantalla,
// ahora también exportable a Excel/PDF.
// ============================================================================

export function exportCuadroMensualExcel(cuadro: CuadroMensual, municipioNombre: string, anio: number, mes: number) {
  const lastCol = 6;
  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA MARTE S.R.L.", "", "", "", "", "", ""],
    [`CUADRO MENSUAL DE DESPACHOS — ${municipioNombre.toUpperCase()} — ${MESES_MAYUSCULA[mes - 1]} ${anio}`, "", "", "", "", "", ""],
    [],
    ["Correlativo", "Transportista", "Placa", "Mineral", "Ingenio", "Neto (Kg)", "Formulario 101"]
  ];
  const rowKinds: Array<"title" | "subtitle" | "header" | "normal"> = ["title", "subtitle", "normal", "header"];

  for (const l of cuadro.lotes) {
    aoa.push([
      l.correlativo,
      l.transportista?.nombreORazonSocial ?? "",
      l.vehiculo?.placa ?? "",
      l.tipoMineral?.nombre ?? "",
      l.destinoIngenio?.nombre ?? "",
      num(Number(l.pesaje?.tonelajeNeto ?? 0)),
      l.formulario101 ? l.formulario101.codigo : "PENDIENTE"
    ]);
    rowKinds.push("normal");
  }

  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([`Total lotes: ${cuadro.resumen.totalLotes}`, `Tonelaje neto: ${num(cuadro.resumen.totalTonelajeNeto)}`, `F101 pendientes: ${cuadro.resumen.pendientesF101}`, "", "", "", ""]);
  rowKinds.push("normal");

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 16 }, { wch: 26 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }
  ];
  rowKinds.forEach((kind, index) => {
    const style = kind === "title" ? titleStyle : kind === "subtitle" ? subtitleStyle : kind === "header" ? headerStyle : bodyStyle;
    styleRow(sheet, index, lastCol, style);
  });
  for (let r = 0; r < aoa.length; r += 1) numberFormatCell(sheet, r, 5);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Cuadro Mensual".slice(0, 31));
  XLSX.writeFile(workbook, `cuadro-mensual-${anio}-${String(mes).padStart(2, "0")}.xlsx`);
}

export function exportCuadroMensualPdf(cuadro: CuadroMensual, municipioNombre: string, anio: number, mes: number) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("EMPRESA MINERA MARTE S.R.L.", centerX, 30, { align: "center" });
  doc.setFontSize(10);
  doc.text(`CUADRO MENSUAL DE DESPACHOS — ${municipioNombre.toUpperCase()} — ${MESES_MAYUSCULA[mes - 1]} ${anio}`, centerX, 46, { align: "center" });

  const rows: RowInput[] = cuadro.lotes.map((l) => [
    l.correlativo,
    l.transportista?.nombreORazonSocial ?? "",
    l.vehiculo?.placa ?? "",
    l.tipoMineral?.nombre ?? "",
    l.destinoIngenio?.nombre ?? "",
    formatBs(Number(l.pesaje?.tonelajeNeto ?? 0)),
    l.formulario101 ? l.formulario101.codigo : "PENDIENTE"
  ]);

  drawPlainTable(doc, {
    startY: 64,
    head: [["Correlativo", "Transportista", "Placa", "Mineral", "Ingenio", "Neto (Kg)", "Formulario 101"]],
    body: rows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles: { 5: { halign: "right" } },
    margin: { left: 30, right: 30 }
  });

  const y = (doc as any).lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(
    `Total lotes: ${cuadro.resumen.totalLotes}    Tonelaje neto: ${formatBs(cuadro.resumen.totalTonelajeNeto)}    F101 pendientes: ${cuadro.resumen.pendientesF101}`,
    30,
    y
  );

  openBrowserPrintDialog(doc, `cuadro-mensual-${anio}-${String(mes).padStart(2, "0")}.pdf`);
}

// ============================================================================
// Conocimiento de Carga — reproduce el talonario físico real: encabezado
// "EMPRESA MINERA / MARTE S.R.L." + título "CONOCIMIENTO" + N° recuadrado,
// "A la Empresa" (el ingenio destino) / "De" (fijo: Mina Lipeña MARTE S.R.L.)
// / "Con" (detalle de carga) / "Chófer", tabla CANTIDAD/UNIDAD/DESCRIPCION,
// Observaciones, y pie "Lugar y Fecha" + firmas "Recibí conforme"/"Despachador".
// ============================================================================

const LUGAR_CONOCIMIENTO = "Mina Lipeña";
const DE_CONOCIMIENTO = "Mina Lipeña MARTE S.R.L.";

function fechaConocimientoLarga(value: string) {
  const date = parseFecha(value);
  return `${date.getUTCDate()} de ${MESES_MAYUSCULA[date.getUTCMonth()]!.charAt(0)}${MESES_MAYUSCULA[date.getUTCMonth()]!.slice(1).toLowerCase()} de ${date.getUTCFullYear()}`;
}

// El talonario real está impreso y llenado íntegramente en tinta azul — se
// reproduce con ese mismo color en vez del negro estándar de los demás
// documentos.
const AZUL_CONOCIMIENTO: [number, number, number] = [21, 51, 133];
const AZUL_HEX = "153385";

export function exportConocimientoExcel(lote: LoteDespacho) {
  const conocimiento = lote.conocimientoCarga;
  const fecha = conocimiento ? conocimiento.fecha : lote.fechaDespachoReal;
  const descripcion = [conocimiento?.descripcion, lote.nivel ? `Nivel ${lote.nivel}` : null]
    .filter(Boolean)
    .join(" — ");

  const azulFont = { color: { rgb: AZUL_HEX } };
  const azulBorder = {
    top: { style: "thin", color: { rgb: AZUL_HEX } },
    bottom: { style: "thin", color: { rgb: AZUL_HEX } },
    left: { style: "thin", color: { rgb: AZUL_HEX } },
    right: { style: "thin", color: { rgb: AZUL_HEX } }
  };
  const tituloAzul = { font: { bold: true, sz: 16, ...azulFont } };
  const labelAzul = { font: { bold: true, sz: 10, ...azulFont } };
  const valorAzul = { font: { sz: 10, ...azulFont } };
  const headerAzul = {
    font: { bold: true, sz: 10, ...azulFont },
    alignment: { horizontal: "center" as const },
    border: azulBorder
  };
  const celdaAzul = { font: { sz: 10, ...azulFont }, border: azulBorder, alignment: { vertical: "top" as const, wrapText: true } };

  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA", "", "", "CONOCIMIENTO", "", "N°", lote.correlativo],
    ["MARTE S.R.L.", "", "", "", "", "", ""],
    [],
    ["A la Empresa:", lote.destinoIngenio?.nombre ?? "", "", "", "", "", ""],
    ["", `De ${DE_CONOCIMIENTO}`, "", "", "", "", ""],
    ["Con:", conocimiento?.detalleCarga ?? "-", "", "Chófer:", lote.chofer?.nombre ?? "-", "", ""],
    ["Remito lo siguiente recibido de:", "", "", "", "", "", ""],
    [],
    ["CANTIDAD", "UNIDAD", "DESCRIPCION", "", "", "", ""],
    ["", "", descripcion || "", "", "", "", ""],
    [],
    ["Observaciones:", conocimiento?.observaciones ?? "", "", "", "", "", ""],
    [],
    ["Lugar y Fecha:", `${LUGAR_CONOCIMIENTO}, ${fechaConocimientoLarga(fecha)}`, "", "", "", "", ""],
    [],
    ["Recibí conforme", "", "", "Despachador", "", "", ""]
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 6 }, { wch: 12 }];
  // Una sola fila de datos, alta (no dos): la línea "de en medio" en la foto
  // real es el doblez físico de la hoja del talonario, no una división del
  // formulario.
  sheet["!rows"] = Array.from({ length: aoa.length }, (_, index) => (index === 9 ? { hpt: 120 } : {}));
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 6 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 6 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 6 } },
    { s: { r: 8, c: 2 }, e: { r: 8, c: 6 } },
    { s: { r: 9, c: 2 }, e: { r: 9, c: 6 } },
    { s: { r: 11, c: 1 }, e: { r: 11, c: 6 } },
    { s: { r: 13, c: 1 }, e: { r: 13, c: 6 } }
  ];

  styleRow(sheet, 0, 6, tituloAzul);
  setStyle(sheet, XLSX.utils.encode_cell({ r: 0, c: 3 }), tituloAzul);
  setStyle(sheet, XLSX.utils.encode_cell({ r: 0, c: 5 }), labelAzul);
  setStyle(sheet, XLSX.utils.encode_cell({ r: 0, c: 6 }), { font: { bold: true, sz: 12, ...azulFont }, border: azulBorder, alignment: { horizontal: "center" as const } });
  styleRow(sheet, 1, 6, tituloAzul);
  for (const r of [3, 4, 5, 6, 11, 13]) {
    setStyle(sheet, XLSX.utils.encode_cell({ r, c: 0 }), labelAzul);
    for (let c = 1; c <= 6; c += 1) setStyle(sheet, XLSX.utils.encode_cell({ r, c }), valorAzul);
  }
  setStyle(sheet, XLSX.utils.encode_cell({ r: 5, c: 3 }), labelAzul);
  styleRow(sheet, 8, 6, headerAzul);
  styleRow(sheet, 9, 6, celdaAzul);
  styleRow(sheet, 15, 6, labelAzul);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Conocimiento".slice(0, 31));
  XLSX.writeFile(workbook, `conocimiento-${lote.correlativo.replace("/", "-")}.xlsx`);
}

// Dibuja el formulario a mano (rects/líneas punteadas) en vez de una tabla de
// datos, para que el PDF se vea como el talonario físico y no como un reporte.
export function exportConocimientoPdf(lote: LoteDespacho) {
  const conocimiento = lote.conocimientoCarga;
  const fecha = conocimiento ? conocimiento.fecha : lote.fechaDespachoReal;
  const descripcion = [conocimiento?.descripcion, lote.nivel ? `Nivel ${lote.nivel}` : null]
    .filter(Boolean)
    .join(" — ");

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const right = pageWidth - margin;

  doc.setTextColor(...AZUL_CONOCIMIENTO);
  doc.setDrawColor(...AZUL_CONOCIMIENTO);

  function dotted(x1: number, x2: number, y: number) {
    doc.setLineDashPattern([1, 1.5], 0);
    doc.setLineWidth(0.7);
    doc.line(x1, y, x2, y);
    doc.setLineDashPattern([], 0);
  }

  // --- Encabezado ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("EMPRESA MINERA", margin, 42);
  doc.setFontSize(19);
  doc.text("MARTE S.R.L.", margin, 66);
  doc.setLineWidth(1.2);
  doc.line(margin, 70, margin + doc.getTextWidth("MARTE S.R.L."), 70);

  doc.setFontSize(26);
  doc.text("CONOCIMIENTO", 330, 60, { align: "center" });

  doc.setFontSize(15);
  doc.text("N°", 465, 68);
  doc.setLineWidth(1);
  doc.rect(500, 45, 75, 32);
  doc.setFontSize(13);
  doc.text(lote.correlativo, 537, 66, { align: "center" });

  doc.setLineWidth(0.8);
  doc.line(margin, 92, right, 92);

  // --- Datos del despacho ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  let y = 118;
  doc.text("A la Empresa:", margin, y);
  dotted(margin + 78, right, y + 3);
  doc.setFont("helvetica", "normal");
  doc.text(lote.destinoIngenio?.nombre ?? "", margin + 82, y);

  y += 22;
  dotted(margin, right, y + 3);
  doc.text(`De ${DE_CONOCIMIENTO}`, margin + 4, y);

  y += 25;
  doc.setFont("helvetica", "bold");
  doc.text("Con:", margin, y);
  dotted(margin + 28, 330, y + 3);
  doc.setFont("helvetica", "normal");
  doc.text(conocimiento?.detalleCarga ?? "-", margin + 32, y);
  doc.setFont("helvetica", "bold");
  doc.text("Chófer:", 340, y);
  dotted(378, right, y + 3);
  doc.setFont("helvetica", "normal");
  doc.text(lote.chofer?.nombre ?? "-", 382, y);

  y += 25;
  doc.setFont("helvetica", "bold");
  doc.text("Remito lo siguiente recibido de:", margin, y);
  dotted(margin + 170, right, y + 3);

  // --- Tabla Cantidad / Unidad / Descripción ---
  // Una sola fila de datos (alta, para escritura a mano): la línea horizontal
  // que se ve "partiendo" el cuadro en la foto real es solo el doblez físico
  // de la hoja del talonario, no una división del formulario — no se dibuja.
  const tableTop = y + 22;
  const tableBottom = tableTop + 300;
  const colCantidad = margin + 90;
  const colUnidad = colCantidad + 70;
  const colDescripcion = right - 55;

  doc.setLineWidth(1);
  doc.rect(margin, tableTop, right - margin, tableBottom - tableTop);
  doc.line(colCantidad, tableTop, colCantidad, tableBottom);
  doc.line(colUnidad, tableTop, colUnidad, tableBottom);
  doc.line(colDescripcion, tableTop, colDescripcion, tableBottom);
  doc.line(margin, tableTop + 26, right, tableTop + 26);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CANTIDAD", (margin + colCantidad) / 2, tableTop + 17, { align: "center" });
  doc.text("UNIDAD", (colCantidad + colUnidad) / 2, tableTop + 17, { align: "center" });
  doc.text("DESCRIPCION", (colUnidad + colDescripcion) / 2, tableTop + 17, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(descripcion || "", colUnidad + 8, tableTop + 42, { maxWidth: colDescripcion - colUnidad - 16 });

  // --- Observaciones / Lugar y fecha ---
  y = tableBottom + 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Observaciones:", margin, y);
  dotted(margin + 92, right, y + 3);
  doc.setFont("helvetica", "normal");
  doc.text(conocimiento?.observaciones ?? "", margin + 96, y, { maxWidth: right - margin - 100 });

  y += 22;
  dotted(margin, right, y + 3);

  y += 30;
  doc.setFont("helvetica", "bold");
  doc.text("Lugar y Fecha,", margin, y);
  dotted(margin + 88, right, y + 3);
  doc.setFont("helvetica", "normal");
  doc.text(`${LUGAR_CONOCIMIENTO}, ${fechaConocimientoLarga(fecha)}`, margin + 92, y);

  // --- Firmas ---
  y += 70;
  dotted(margin, margin + 190, y);
  dotted(350, right, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("RECIBÍ CONFORME", margin + 95, y, { align: "center" });
  doc.text("DESPACHADOR", (350 + right) / 2, y, { align: "center" });

  openBrowserPrintDialog(doc, `conocimiento-${lote.correlativo.replace("/", "-")}.pdf`);
}

// ============================================================================
// Boleta de Pesaje Balanza Chilcobija — reproduce la boleta real de EMISA
// (Empresa Minera Unificada S.A.): tabla "DETALLE DE PESO" con FECHA/HRS/
// BRUTO LB/BRUTO Kg/TARA LB/TARA Kg/NETO LB/NETO Kg/OBSERV, luego "DETALLE
// DE CARGA" (Procedencia/Tipo de mineral), Conductor, Placa y firmas.
// ============================================================================

const EMISA_NOMBRE = "EMPRESA MINERA UNIFICADA S.A.";
const EMISA_SECTOR = "SECTOR CHILCOBIJA";

export function exportBoletaPesajeExcel(lote: LoteDespacho) {
  const pesaje = lote.pesaje;
  if (!pesaje) return;

  const bruto = Number(pesaje.tonelajeBruto);
  const tara = Number(pesaje.tonelajeTara);
  const neto = Number(pesaje.tonelajeNeto);

  const aoa: Array<Array<string | number>> = [
    [EMISA_NOMBRE, "", "", "", "", "", "", ""],
    [EMISA_SECTOR, "", "", "", "", "", "", ""],
    ["BOLETA DE PESAJE BALANZA CHILCOBIJA", "", "", "", "", "", "", ""],
    [],
    ["FECHA", "HRS.", "BRUTO LB.", "BRUTO Kg.", "TARA LB.", "TARA Kg.", "NETO LB.", "NETO Kg.", "OBSERV."] as any,
    [
      formatFecha(pesaje.fechaPesaje),
      formatHora(pesaje.fechaPesaje),
      toneladasALb(bruto),
      toneladasAKg(bruto),
      toneladasALb(tara),
      toneladasAKg(tara),
      toneladasALb(neto),
      toneladasAKg(neto),
      lote.correlativo
    ] as any,
    [],
    ["DETALLE DE CARGA", "", "", "", "", "", "", ""],
    [`Procedencia: ${lote.municipioOrigen?.nombre ?? "-"}`, "", "", "", `Tipo de mineral: ${lote.tipoMineral?.nombre ?? "-"}`, "", "", ""],
    [`Conductor: ${lote.chofer?.nombre ?? "-"}`, "", "", "", "", "", "", ""],
    [`Placa: ${lote.vehiculo?.placa ?? "-"}`, "", "", "", "", "", "", ""],
    [],
    ["Responsable de balanza", "", "", "", "Vo.Bo. Supervisor", "", "", ""]
  ];
  const rowKinds: Array<"title" | "subtitle" | "header" | "normal"> = [
    "subtitle", "subtitle", "title", "normal",
    "header", "normal", "normal",
    "subtitle", "normal", "normal", "normal", "normal", "normal"
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 8 } },
    { s: { r: 8, c: 0 }, e: { r: 8, c: 3 } },
    { s: { r: 8, c: 4 }, e: { r: 8, c: 8 } }
  ];
  rowKinds.forEach((kind, index) => {
    const style = kind === "title" ? titleStyle : kind === "subtitle" ? subtitleStyle : kind === "header" ? headerStyle : bodyStyle;
    styleRow(sheet, index, 8, style);
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Boleta Pesaje".slice(0, 31));
  XLSX.writeFile(workbook, `boleta-pesaje-${lote.correlativo.replace("/", "-")}.xlsx`);
}

export function exportBoletaPesajePdf(lote: LoteDespacho) {
  const pesaje = lote.pesaje;
  if (!pesaje) return;

  const bruto = Number(pesaje.tonelajeBruto);
  const tara = Number(pesaje.tonelajeTara);
  const neto = Number(pesaje.tonelajeNeto);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a5" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(EMISA_NOMBRE, centerX, 24, { align: "center" });
  doc.setFontSize(9);
  doc.text(EMISA_SECTOR, centerX, 36, { align: "center" });
  doc.setFontSize(12);
  doc.text("BOLETA DE PESAJE BALANZA CHILCOBIJA", centerX, 52, { align: "center" });

  drawPlainTable(doc, {
    startY: 64,
    head: [["FECHA", "HRS.", "BRUTO LB.", "BRUTO Kg.", "TARA LB.", "TARA Kg.", "NETO LB.", "NETO Kg.", "OBSERV."]],
    body: [
      [
        formatFecha(pesaje.fechaPesaje),
        formatHora(pesaje.fechaPesaje),
        String(toneladasALb(bruto)),
        String(toneladasAKg(bruto)),
        String(toneladasALb(tara)),
        String(toneladasAKg(tara)),
        String(toneladasALb(neto)),
        String(toneladasAKg(neto)),
        lote.correlativo
      ]
    ],
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles: {
      2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
      5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }
    },
    margin: { left: 20, right: 20 }
  });

  let y = (doc as any).lastAutoTable.finalY + 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DETALLE DE CARGA", 20, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Procedencia: ${lote.municipioOrigen?.nombre ?? "-"}`, 20, y);
  doc.text(`Tipo de mineral: ${lote.tipoMineral?.nombre ?? "-"}`, 220, y);
  y += 14;
  doc.text(`Conductor: ${lote.chofer?.nombre ?? "-"}`, 20, y);
  y += 14;
  doc.text(`Placa: ${lote.vehiculo?.placa ?? "-"}`, 20, y);

  y += 36;
  doc.text("Responsable de balanza: ......................", 20, y);
  doc.text("Vo.Bo. Supervisor: ......................", 320, y);

  openBrowserPrintDialog(doc, `boleta-pesaje-${lote.correlativo.replace("/", "-")}.pdf`);
}

// ============================================================================
// Detalle de despachos por volqueta — reproduce el reporte semanal real
// ("Transporte de carga Chami de mina Lipeña a Chilcobija"): un bloque por
// vehículo/chofer con Nº Viaje/Fecha/Conocimiento/Chofer/Placa/Peso, fila de
// total, y una caja lateral con Contratista/Banco/Número de cuenta/Total.
// Simplificación deliberada respecto al documento real: no reproduce el
// contador interno "FECHA {n}" del ciclo semanal (no lo tenemos modelado) —
// en su lugar se muestra el rango de fechas real consultado.
// ============================================================================

interface TransportistaInfoReporte {
  nombreORazonSocial: string;
  banco?: string | null;
  numeroCuenta?: string | null;
}

interface FilaVolqueta {
  placa: string;
  chofer: string;
  nroViaje: string;
  fecha: string;
  conocimiento: string;
  peso: number;
}

interface GrupoVolqueta {
  placa: string;
  chofer: string;
  filas: FilaVolqueta[];
  total: number;
}

function agruparPorVolqueta(lotes: LoteDespacho[]): GrupoVolqueta[] {
  const mapa = new Map<string, GrupoVolqueta>();
  for (const lote of lotes) {
    const placa = lote.vehiculo?.placa ?? "-";
    const grupo = mapa.get(placa) ?? { placa, chofer: lote.chofer?.nombre ?? "-", filas: [], total: 0 };
    const peso = Number(lote.pesaje?.tonelajeNeto ?? 0);
    grupo.filas.push({
      placa,
      chofer: lote.chofer?.nombre ?? "-",
      nroViaje: lote.correlativo.split("/")[0] ?? lote.correlativo,
      fecha: formatFecha(lote.fechaDespachoReal),
      conocimiento: lote.correlativo,
      peso
    });
    grupo.total += peso;
    mapa.set(placa, grupo);
  }
  return Array.from(mapa.values()).sort((a, b) => a.placa.localeCompare(b.placa));
}

function tituloTransporteMineral(lotes: LoteDespacho[]) {
  const nombres = new Set(lotes.map((l) => l.tipoMineral?.nombre).filter(Boolean));
  const mineral = nombres.size === 1 ? Array.from(nombres)[0] : "";
  return `Transporte de carga ${mineral ?? ""} de mina Lipeña a Chilcobija`.replace(/\s+/g, " ").trim();
}

export function exportDetalleVolquetaExcel(
  transportista: TransportistaInfoReporte,
  lotes: LoteDespacho[],
  fechaInicio: string,
  fechaFin: string
) {
  const grupos = agruparPorVolqueta(lotes);
  const titulo = tituloTransporteMineral(lotes);
  const lastCol = 6;
  const aoa: Array<Array<string | number>> = [
    [titulo, "", "", "", "", "", ""],
    [`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, "", "", "", "", "", ""]
  ];
  const rowKinds: Array<"title" | "subtitle" | "header" | "normal" | "total"> = ["title", "subtitle"];

  // Info lateral fija por grupo (Contratista/Banco/Número de cuenta/Total),
  // se intercala fila a fila junto a la tabla principal de viajes.
  const infoLateral = (grupo: GrupoVolqueta): Array<[string, string]> => [
    ["CONTRATISTA", transportista.nombreORazonSocial],
    ["BANCO", transportista.banco ?? "-"],
    ["NUMERO DE CUENTA", transportista.numeroCuenta ?? "-"],
    ["TOTAL", formatBs(grupo.total)]
  ];

  for (const grupo of grupos) {
    aoa.push([]);
    rowKinds.push("normal");
    aoa.push([`Chofer: ${grupo.chofer}`, "", "", `Placa: ${grupo.placa}`, "", "", ""]);
    rowKinds.push("subtitle");
    aoa.push(["Nº VIAJE", "FECHA", "CONOCIMIENTO", "PESO (TMB)", "", "", ""]);
    rowKinds.push("header");

    const lateral = infoLateral(grupo);
    const filasCount = Math.max(grupo.filas.length, lateral.length);
    for (let i = 0; i < filasCount; i += 1) {
      const f = grupo.filas[i];
      const [labelLateral, valorLateral] = lateral[i] ?? ["", ""];
      aoa.push([
        f?.nroViaje ?? "",
        f?.fecha ?? "",
        f?.conocimiento ?? "",
        f ? num(f.peso) : "",
        labelLateral,
        valorLateral,
        ""
      ] as any);
      rowKinds.push("normal");
    }
    aoa.push(["", "", "TOTAL", num(grupo.total), "", "", ""]);
    rowKinds.push("total");
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 10 }];
  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }, { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }];
  rowKinds.forEach((kind, index) => {
    const style = kind === "title" ? titleStyle : kind === "subtitle" ? subtitleStyle : kind === "header" ? headerStyle : kind === "total" ? totalStyle : bodyStyle;
    styleRow(sheet, index, lastCol, style);
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Detalle Volquetas".slice(0, 31));
  XLSX.writeFile(workbook, `detalle-volquetas-${transportista.nombreORazonSocial.replace(/\s+/g, "-")}.xlsx`);
}

export function exportDetalleVolquetaPdf(
  transportista: TransportistaInfoReporte,
  lotes: LoteDespacho[],
  fechaInicio: string,
  fechaFin: string
) {
  const grupos = agruparPorVolqueta(lotes);
  const titulo = tituloTransporteMineral(lotes);

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const margin = 30;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(titulo, centerX, 30, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, centerX, 46, { align: "center" });

  let y = 62;
  for (const grupo of grupos) {
    if (y > 700) {
      doc.addPage();
      y = 40;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Chofer: ${grupo.chofer}`, margin, y);
    doc.text(`Placa: ${grupo.placa}`, margin + 260, y);

    const rows: RowInput[] = grupo.filas.map((f) => [f.nroViaje, f.fecha, f.conocimiento, formatBs(f.peso)]);
    rows.push(["", "", "TOTAL", formatBs(grupo.total)]);

    drawPlainTable(doc, {
      startY: y + 8,
      head: [["Nº VIAJE", "FECHA", "CONOCIMIENTO", "PESO (TMB)"]],
      body: rows,
      styles: pdfTableStyles,
      headStyles: pdfHeadStyles,
      columnStyles: { 3: { halign: "right" } },
      margin: { left: margin, right: pageWidth - margin - 260 }
    });
    const finalYTablaPrincipal = (doc as any).lastAutoTable.finalY;

    // Caja lateral: Contratista / Banco / Número de cuenta / Total.
    drawPlainTable(doc, {
      startY: y + 8,
      body: [
        ["CONTRATISTA", transportista.nombreORazonSocial],
        ["BANCO", transportista.banco ?? "-"],
        ["NUMERO DE CUENTA", transportista.numeroCuenta ?? "-"],
        ["TOTAL", formatBs(grupo.total)]
      ],
      styles: { ...pdfTableStyles, fontSize: 7 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 }, 1: { cellWidth: 110 } },
      margin: { left: pageWidth - margin - 200 },
      tableWidth: 200
    });
    const finalYCajaLateral = (doc as any).lastAutoTable.finalY;

    y = Math.max(finalYTablaPrincipal, finalYCajaLateral) + 24;
  }

  openBrowserPrintDialog(doc, `detalle-volquetas-${transportista.nombreORazonSocial.replace(/\s+/g, "-")}.pdf`);
}
