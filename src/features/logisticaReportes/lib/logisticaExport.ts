import * as XLSX from "xlsx-js-style";
import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import type { Liquidacion } from "@/features/liquidacion/model/liquidacion.schema";
import type { CuadroMensual } from "@/features/logisticaReportes/model/logisticaReportes.schema";

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

// ============================================================================
// Agrupa el detalle de una liquidación por placa — el documento real (tanto
// para empresas con contrato como para particulares) lista un renglón por
// vehículo, no uno por viaje/lote.
// ============================================================================
interface FilaPorPlaca {
  placa: string;
  pesoTotal: number;
  precioAplicado: number;
  viajes: number;
  subtotal: number;
}

function agruparPorPlaca(liquidacion: Liquidacion): FilaPorPlaca[] {
  const mapa = new Map<string, FilaPorPlaca>();
  for (const d of liquidacion.detalleLotes ?? []) {
    const placa = d.lote?.vehiculo?.placa ?? "-";
    const fila = mapa.get(placa) ?? { placa, pesoTotal: 0, precioAplicado: Number(d.precioAplicado), viajes: 0, subtotal: 0 };
    fila.pesoTotal += Number(d.tonelajeNeto);
    fila.viajes += 1;
    fila.subtotal += Number(d.subtotal);
    mapa.set(placa, fila);
  }
  return Array.from(mapa.values());
}

function periodoLabel(liquidacion: Liquidacion) {
  const fin = parseFecha(liquidacion.fechaFin);
  return `${MESES_MAYUSCULA[fin.getUTCMonth()]} ${fin.getUTCFullYear()}`;
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
  const lastCol = 8;

  const aoa: Array<Array<string | number>> = [
    ["EMPRESA MINERA MARTE S.R.L.", "", "", "", "", "", "", "", ""],
    ["LIQUIDACION SERVICIO DE TRANSPORTE", "", "", "", "", "", "", "", ""],
    [`CONTRATISTA: ${liquidacion.remitente?.nombreORazonSocial?.toUpperCase() ?? ""}`, "", "", "", "", "", "", "", ""],
    [`CORRESPONDIENTE A: ${periodoLabel(liquidacion)}`, "", "", "", "", "", "", "", ""],
    [],
    ["ITEM", "PLACA", "DESCRIPCION DEL SERVICIO", "PESO TMB", "BS/TMB", "VIAJES", "BS/DIA", "TOTAL", "OBSERVACIONES"]
  ];
  const rowKinds: Array<"title" | "subtitle" | "header" | "normal" | "total"> = [
    "title", "subtitle", "subtitle", "subtitle", "normal", "header"
  ];

  let item = 1;
  for (const f of filas) {
    aoa.push([item, f.placa, "Carga bruta de mineral", num(f.pesoTotal), num(f.precioAplicado), f.viajes, "", num(f.subtotal), ""]);
    rowKinds.push("normal");
    item += 1;
  }
  for (const a of abonos) {
    aoa.push([item, "", a.concepto?.nombre ?? "Abono", "", "", "", "", num(Number(a.monto)), a.descripcion ?? ""]);
    rowKinds.push("normal");
    item += 1;
  }

  const totalLiquidacion = liquidacion.totalBruto !== undefined ? Number(liquidacion.totalBruto) + Number(liquidacion.totalAbonos ?? 0) : 0;
  aoa.push(["", "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push(["TOTAL LIQUIDACION", "", "", "", "", "", "", num(totalLiquidacion), ""]);
  rowKinds.push("total");
  for (const d of deducciones) {
    aoa.push([`Menos: ${d.concepto?.nombre?.toUpperCase() ?? "DEDUCCION"} (BS)`, "", "", "", "", "", "", num(Number(d.monto)), ""]);
    rowKinds.push("normal");
  }
  aoa.push(["LIQUIDO A PAGAR", "", "", "", "", "", "", num(Number(liquidacion.totalNeto)), ""]);
  rowKinds.push("total");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([`Son: ${montoEnLetras(Number(liquidacion.totalNeto))}`, "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push(["", "", "", "", "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push(["Presidente Ejecutivo", "", "Contabilidad La Paz", "", "Archivos Mina", "", "Contratista", "", ""]);
  rowKinds.push("normal");

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 18 }, { wch: 10 }, { wch: 26 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } }
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
  XLSX.writeFile(workbook, `liquidacion-empresa-${liquidacion.id.slice(0, 8)}.xlsx`);
}

export function exportLiquidacionEmpresaPdf(liquidacion: Liquidacion) {
  const filas = agruparPorPlaca(liquidacion);
  const abonos = (liquidacion.itemsConcepto ?? []).filter((i) => i.concepto?.tipo === "ABONO");
  const deducciones = (liquidacion.itemsConcepto ?? []).filter((i) => i.concepto?.tipo === "DEDUCCION");

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("EMPRESA MINERA MARTE S.R.L.", centerX, 30, { align: "center" });
  doc.setFontSize(11);
  doc.text("LIQUIDACION SERVICIO DE TRANSPORTE", centerX, 46, { align: "center" });
  doc.setFontSize(10);
  doc.text(`CONTRATISTA: ${liquidacion.remitente?.nombreORazonSocial?.toUpperCase() ?? ""}`, centerX, 60, { align: "center" });
  doc.text(`CORRESPONDIENTE A: ${periodoLabel(liquidacion)}`, centerX, 74, { align: "center" });

  const rows: RowInput[] = [];
  let item = 1;
  for (const f of filas) {
    rows.push([item, f.placa, "Carga bruta de mineral", formatBs(f.pesoTotal), formatBs(f.precioAplicado), String(f.viajes), "", formatBs(f.subtotal), ""]);
    item += 1;
  }
  for (const a of abonos) {
    rows.push([item, "", a.concepto?.nombre ?? "Abono", "", "", "", "", formatBs(Number(a.monto)), a.descripcion ?? ""]);
    item += 1;
  }

  autoTable(doc, {
    startY: 88,
    head: [["Item", "Placa", "Descripción del servicio", "Peso TMB", "Bs/TMB", "Viajes", "Bs/Día", "Total", "Observaciones"]],
    body: rows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
    margin: { left: 30, right: 30 }
  });

  const totalLiquidacion = Number(liquidacion.totalBruto ?? 0) + Number(liquidacion.totalAbonos ?? 0);
  let y = (doc as any).lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`TOTAL LIQUIDACION: ${formatBs(totalLiquidacion)}`, pageWidth - 30, y, { align: "right" });
  for (const d of deducciones) {
    y += 14;
    doc.text(`Menos: ${d.concepto?.nombre?.toUpperCase() ?? "DEDUCCION"} (BS): ${formatBs(Number(d.monto))}`, pageWidth - 30, y, { align: "right" });
  }
  y += 14;
  doc.text(`LIQUIDO A PAGAR: ${formatBs(Number(liquidacion.totalNeto))}`, pageWidth - 30, y, { align: "right" });

  y += 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Son: ${montoEnLetras(Number(liquidacion.totalNeto))}`, 30, y);

  y += 60;
  doc.text("Presidente Ejecutivo", 30, y);
  doc.text("Contabilidad La Paz", 220, y);
  doc.text("Archivos Mina", 420, y);
  doc.text("Contratista", 620, y);

  openBrowserPrintDialog(doc, `liquidacion-empresa-${liquidacion.id.slice(0, 8)}.pdf`);
}

// ============================================================================
// Liquidación — Particular (ej. Roger Orlando Quispe Miranda): ITEM/PLACA/
// PRECIO TMB/TOTAL, con banco y N° de cuenta, "Son: ..." al pie.
// ============================================================================

export function exportLiquidacionParticularExcel(liquidacion: Liquidacion) {
  const filas = agruparPorPlaca(liquidacion);
  const lastCol = 5;
  const fin = parseFecha(liquidacion.fechaFin);

  const aoa: Array<Array<string | number>> = [
    ["LIQUIDACION POR SERVICIO DE TRANSPORTE DE CARGAS MINERALIZADAS", "", "", "", "", ""],
    [`CONTRATISTA: ${liquidacion.remitente?.nombreORazonSocial?.toUpperCase() ?? ""}`, "", "", "", "", ""],
    [`Mes: ${MESES_MAYUSCULA[fin.getUTCMonth()]}   Año: ${fin.getUTCFullYear()}`, "", "", "", "", ""],
    [],
    ["ITEM", "PLACA", "PESO", "PRECIO TMB", "TOTAL", "OBSERVACIONES"]
  ];
  const rowKinds: Array<"title" | "subtitle" | "header" | "normal" | "total"> = ["title", "subtitle", "subtitle", "normal", "header"];

  let item = 1;
  for (const f of filas) {
    aoa.push([item, f.placa, num(f.pesoTotal), num(f.precioAplicado), num(f.subtotal), ""]);
    rowKinds.push("normal");
    item += 1;
  }
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push(["TOTAL LIQUIDACION", "", "", "", num(Number(liquidacion.totalBruto ?? 0) + Number(liquidacion.totalAbonos ?? 0)), ""]);
  rowKinds.push("total");
  aoa.push(["LIQUIDO A PAGAR", "", "", "", num(Number(liquidacion.totalNeto)), ""]);
  rowKinds.push("total");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push([`Son: ${montoEnLetras(Number(liquidacion.totalNeto))}`, "", "", "", "", ""]);
  rowKinds.push("normal");
  aoa.push([]);
  rowKinds.push("normal");
  aoa.push(["Contratista", "", "", "Spte. Mina Lipeña", "", ""]);
  rowKinds.push("normal");

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 18 }];
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } }
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
  XLSX.writeFile(workbook, `liquidacion-particular-${liquidacion.id.slice(0, 8)}.xlsx`);
}

export function exportLiquidacionParticularPdf(liquidacion: Liquidacion) {
  const filas = agruparPorPlaca(liquidacion);
  const fin = parseFecha(liquidacion.fechaFin);

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("LIQUIDACION POR SERVICIO DE TRANSPORTE DE CARGAS MINERALIZADAS", centerX, 34, { align: "center", maxWidth: pageWidth - 60 });
  doc.setFontSize(10);
  doc.text(`CONTRATISTA: ${liquidacion.remitente?.nombreORazonSocial?.toUpperCase() ?? ""}`, centerX, 56, { align: "center" });
  doc.text(`Mes: ${MESES_MAYUSCULA[fin.getUTCMonth()]}   Año: ${fin.getUTCFullYear()}`, centerX, 70, { align: "center" });

  const rows: RowInput[] = filas.map((f, index) => [index + 1, f.placa, formatBs(f.pesoTotal), formatBs(f.precioAplicado), formatBs(f.subtotal), ""]);

  autoTable(doc, {
    startY: 90,
    head: [["Item", "Placa", "Peso", "Precio TMB", "Total", "Observaciones"]],
    body: rows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    margin: { left: 40, right: 40 }
  });

  const y0 = (doc as any).lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`TOTAL LIQUIDACION: ${formatBs(Number(liquidacion.totalBruto ?? 0) + Number(liquidacion.totalAbonos ?? 0))}`, pageWidth - 40, y0, { align: "right" });
  doc.text(`LIQUIDO A PAGAR: ${formatBs(Number(liquidacion.totalNeto))}`, pageWidth - 40, y0 + 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text(`Son: ${montoEnLetras(Number(liquidacion.totalNeto))}`, 40, y0 + 40);

  const yFirma = y0 + 90;
  doc.text("Contratista", 60, yFirma);
  doc.text("Spte. Mina Lipeña", pageWidth - 140, yFirma);

  openBrowserPrintDialog(doc, `liquidacion-particular-${liquidacion.id.slice(0, 8)}.pdf`);
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
    ["Correlativo", "Remitente", "Placa", "Mineral", "Ingenio", "Neto (Kg)", "Formulario 101"]
  ];
  const rowKinds: Array<"title" | "subtitle" | "header" | "normal"> = ["title", "subtitle", "normal", "header"];

  for (const l of cuadro.lotes) {
    aoa.push([
      l.correlativo,
      l.remitente?.nombreORazonSocial ?? "",
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
    l.remitente?.nombreORazonSocial ?? "",
    l.vehiculo?.placa ?? "",
    l.tipoMineral?.nombre ?? "",
    l.destinoIngenio?.nombre ?? "",
    formatBs(Number(l.pesaje?.tonelajeNeto ?? 0)),
    l.formulario101 ? l.formulario101.codigo : "PENDIENTE"
  ]);

  autoTable(doc, {
    startY: 64,
    head: [["Correlativo", "Remitente", "Placa", "Mineral", "Ingenio", "Neto (Kg)", "Formulario 101"]],
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
