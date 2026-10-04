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

// Para el peso crudo por viaje (3 decimales, como el documento físico real
// — ej. "19.709") a diferencia de `num()` que redondea a 2 para montos/TMB.
function num3(value: number) {
  return Number(value.toFixed(3));
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
// Texto suelto (fecha, firmas, "Son: ...", C.c.) fuera de la tabla: mismo
// tamaño de letra que el cuerpo, pero SIN borde — a diferencia de `bodyStyle`,
// que lo pinta porque está pensado para celdas dentro de la tabla.
const plainStyle = { font: { sz: 9 } };

function setStyle(sheet: XLSX.WorkSheet, address: string, style: Record<string, unknown>) {
  if (!sheet[address]) sheet[address] = { t: "s", v: "" };
  sheet[address].s = style;
}

function styleRow(sheet: XLSX.WorkSheet, row: number, lastCol: number, style: Record<string, unknown>) {
  for (let c = 0; c <= lastCol; c += 1) {
    setStyle(sheet, XLSX.utils.encode_cell({ r: row, c }), style);
  }
}

function numberFormatCell(sheet: XLSX.WorkSheet, row: number, col: number, formato = "#,##0.00") {
  const address = XLSX.utils.encode_cell({ r: row, c: col });
  if (sheet[address] && typeof sheet[address].v === "number") {
    sheet[address].s = { ...(sheet[address].s ?? {}), numFmt: formato, alignment: { horizontal: "right" } };
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

export interface ViajeDetalle {
  correlativo: string;
  numeroViaje: string;
  fecha: string;
  choferNombre: string;
  tonelajeNeto: number;
}

export interface FilaPorPlacaDetallada extends FilaPorPlaca {
  pesoTotalCrudo: number;
  viajesDetalle: ViajeDetalle[];
}

// Agrupa por (vehículo + precio), igual que el backend (ver
// agruparPorVehiculoYPrecio en liquidacion.service.ts): suma el tonelaje
// CRUDO de todo el grupo, redondea esa suma UNA sola vez a 2 decimales y
// recién ahí multiplica por el precio — nunca suma los `subtotal` por-viaje
// ya redondeados, porque eso puede diferir del total real (verificado
// contra los documentos físicos: redondear cada viaje y sumar no da lo
// mismo que sumar crudo y redondear una vez). Conserva el detalle de cada
// viaje (correlativo, chofer, fecha) para el reporte de respaldo por
// volqueta (exportLiquidacionPorViaje*).
function agruparPorPlacaConViajes(liquidacion: Liquidacion): FilaPorPlacaDetallada[] {
  const mapa = new Map<string, FilaPorPlacaDetallada>();
  for (const d of liquidacion.detalleLotes ?? []) {
    const placa = d.lote?.vehiculo?.placa ?? "-";
    const vehiculoClave = d.lote?.vehiculoId ?? placa;
    const precioAplicado = Number(d.precioAplicado);
    const clave = `${vehiculoClave}_${precioAplicado}`;
    const origen = d.lote?.municipioOrigen?.nombre?.toUpperCase();
    const destino = d.lote?.destinoIngenio?.nombre?.toUpperCase();
    const descripcionServicio =
      origen && destino ? `CARGA BRUTA DE MINERAL ${origen} - ${destino}` : "CARGA BRUTA DE MINERAL";
    const fila =
      mapa.get(clave) ??
      { placa, descripcionServicio, pesoTotal: 0, pesoTotalCrudo: 0, precioAplicado, viajes: 0, subtotal: 0, viajesDetalle: [] };
    const tonelajeNeto = Number(d.tonelajeNeto);
    fila.pesoTotalCrudo += tonelajeNeto;
    fila.viajes += 1;
    const correlativo = d.lote?.correlativo ?? "-";
    fila.viajesDetalle.push({
      correlativo,
      numeroViaje: correlativo.split("/")[0] ?? correlativo,
      fecha: d.lote?.fechaDespachoReal ?? "",
      choferNombre: d.lote?.chofer?.nombre ?? "-",
      tonelajeNeto
    });
    mapa.set(clave, fila);
  }
  for (const fila of mapa.values()) {
    fila.viajesDetalle.sort((a, b) => a.fecha.localeCompare(b.fecha));
    fila.pesoTotalCrudo = Number(fila.pesoTotalCrudo.toFixed(3));
    fila.pesoTotal = num(fila.pesoTotalCrudo);
    fila.subtotal = num(fila.pesoTotal * fila.precioAplicado);
  }
  return Array.from(mapa.values());
}

export function agruparPorPlaca(liquidacion: Liquidacion): FilaPorPlaca[] {
  return agruparPorPlacaConViajes(liquidacion).map(({ viajesDetalle, pesoTotalCrudo, ...resto }) => resto);
}

// Se calcula siempre en vivo a partir del detalle (nunca leyendo
// liquidacion.totalBruto/totalNeto directo) porque esos campos solo quedan
// guardados en la BD al CERRAR — así los reportes también sirven de vista
// previa mientras la liquidación sigue en BORRADOR. El bruto sale de
// agruparPorPlaca() (ya con el redondeo agrupado correcto), no de sumar
// directo los `subtotal` por-viaje.
export function calcularTotales(liquidacion: Liquidacion) {
  // Igual que la planilla Excel (y que totalBrutoDeGrupos en el backend):
  // suma peso × precio sin redondear cada fila y redondea una sola vez.
  const bruto = num(agruparPorPlaca(liquidacion).reduce((acc, f) => acc + f.pesoTotal * f.precioAplicado, 0));
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

// Folio impreso "01/27": correlativo de 2 dígitos + los 2 últimos dígitos de
// la gestión minera (guardada aparte al cerrar). Las liquidaciones viejas,
// sin gestión, siguen mostrando su número tal cual ("81").
export function folioLiquidacion(liquidacion: { numero?: number | null; gestion?: number | null }) {
  if (!liquidacion.numero) return null;
  if (!liquidacion.gestion) return String(liquidacion.numero);
  return `${String(liquidacion.numero).padStart(2, "0")}/${String(liquidacion.gestion).slice(-2)}`;
}
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
  // El ancho de cada raya se adapta al espacio disponible por firma — en
  // portrait (más angosto) 3 firmas lado a lado con un ancho fijo de 150pt
  // se encimaban entre sí; acá nunca pasa de la mitad del espacio libre
  // entre firmas.
  const slotWidth = pageWidth / (n + 1);
  const lineHalfWidth = Math.min(75, slotWidth / 2 - 10);
  firmas.forEach((firma, index) => {
    const x = (pageWidth / (n + 1)) * (index + 1);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.line(x - lineHalfWidth, yFirmas - 14, x + lineHalfWidth, yFirmas - 14);
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
    ["Empresa Minera", "", "", "", "", "", "N°", folioLiquidacion(liquidacion) ?? "BORRADOR", ""] as any,
    [`MARTE S.R.L. — NIT: ${MARTE_NIT}`, "", "", "", "", "", "", "", ""],
    [],
    ["LIQUIDACION SERVICIO DE TRANSPORTE", "", "", "", "", "", "", "", ""],
    [`CONTRATISTA: ${liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? ""}`, "", "", "", "", "", "", "", ""],
    [`CORRESPONDIENTE A: ${periodoLabel(liquidacion)}`, "", "", "", "", "", "", "", ""],
    [],
    ["ITEM", "PLACA", "DESCRIPCION DEL SERVICIO", "PESO TMB", "BS/TMB", "VIAJES", "BS/DIA", "TOTAL", "OBSERVACIONES"]
  ];
  const rowKinds: Array<"title" | "subtitle" | "header" | "normal" | "total" | "blank" | "plain"> = [
    "subtitle", "subtitle", "blank", "title", "subtitle", "subtitle", "blank", "header"
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
  aoa.push([]);
  rowKinds.push("blank");
  aoa.push(["TOTAL LIQUIDACION", "", "", "", "", "", "", num(totalLiquidacion), ""]);
  rowKinds.push("total");
  for (const d of deducciones) {
    aoa.push([`Menos: ${d.concepto?.nombre?.toUpperCase() ?? "DEDUCCION"} (BS)`, "", "", "", "", "", "", num(Number(d.monto)), ""]);
    rowKinds.push("normal");
  }
  aoa.push(["LIQUIDO A PAGAR", "", "", "", "", "", "", num(totales.neto), ""]);
  rowKinds.push("total");
  aoa.push([`Fecha: ${fechaLiquidacionLarga(liquidacion.fechaFin)}`, "", "", "", "", "", "", "", ""]);
  rowKinds.push("plain");
  aoa.push([]);
  rowKinds.push("blank");
  aoa.push([`Son: ${montoEnLetras(totales.neto)}`, "", "", "", "", "", "", "", ""]);
  rowKinds.push("plain");
  aoa.push([]);
  rowKinds.push("blank");
  aoa.push([FIRMA_SUPERINTENDENTE, "", "", "", "", "", "", "", ""]);
  rowKinds.push("plain");
  aoa.push([FIRMA_SUPERINTENDENTE_CARGO, "", "", "", "", "", "", "", ""]);
  rowKinds.push("plain");
  aoa.push([]);
  rowKinds.push("blank");
  aoa.push([FIRMA_ASISTENTE, "", "", "", "", "", "", "", ""]);
  rowKinds.push("plain");
  aoa.push([FIRMA_ASISTENTE_CARGO, "", "", "", "", "", "", "", ""]);
  rowKinds.push("plain");
  aoa.push([]);
  rowKinds.push("blank");
  aoa.push([liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? "", "", "", "", "", "", "", "", ""]);
  rowKinds.push("plain");
  aoa.push(["Contratista", "", "", "", "", "", "", "", ""]);
  rowKinds.push("plain");
  aoa.push([]);
  rowKinds.push("blank");
  aoa.push(["C.c. Presidente Ejecutivo", "", "", "", "", "", "", "", ""]);
  rowKinds.push("plain");
  aoa.push(["C.c. Contabilidad La Paz", "", "", "", "", "", "", "", ""]);
  rowKinds.push("plain");
  aoa.push(["C.c. Archivos Mina", "", "", "", "", "", "", "", ""]);
  rowKinds.push("plain");
  aoa.push(["C.c. Contratista", "", "", "", "", "", "", "", ""]);
  rowKinds.push("plain");

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
  sheet["!merges"] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: lastCol } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: lastCol } }
  ];
  rowKinds.forEach((kind, index) => {
    if (kind === "blank") return;
    const style =
      kind === "title" ? titleStyle
      : kind === "subtitle" ? subtitleStyle
      : kind === "header" ? headerStyle
      : kind === "total" ? totalStyle
      : kind === "plain" ? plainStyle
      : bodyStyle;
    styleRow(sheet, index, lastCol, style);
  });
  for (const col of [3, 4, 7]) {
    for (let r = 0; r < aoa.length; r += 1) numberFormatCell(sheet, r, col);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Liquidacion".slice(0, 31));
  XLSX.writeFile(workbook, `liquidacion-empresa-${(folioLiquidacion(liquidacion) ?? liquidacion.id.slice(0, 8)).replace(/\//g, "-")}.xlsx`);
}

export function exportLiquidacionEmpresaPdf(liquidacion: Liquidacion) {
  const filas = agruparPorPlaca(liquidacion);
  const abonos = (liquidacion.itemsConcepto ?? []).filter((i) => i.concepto?.tipo === "ABONO");
  const deducciones = (liquidacion.itemsConcepto ?? []).filter((i) => i.concepto?.tipo === "DEDUCCION");
  const totales = calcularTotales(liquidacion);
  const pesoTotalTmb = filas.reduce((acc, f) => acc + f.pesoTotal, 0);

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
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
  doc.text(folioLiquidacion(liquidacion) ? `N° ${folioLiquidacion(liquidacion)}` : "BORRADOR", pageWidth - 60, 34, { align: "center" });

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

  // Anchos fijos (en vez de dejar que autoTable los reparta solo): en
  // portrait hay mucho menos ancho que en landscape, así que sin esto la
  // tabla se veía desbalanceada — estos anchos sí suman el ancho usable de
  // la página (595pt - 2×30pt de margen = 535pt).
  drawPlainTable(doc, {
    startY: 74,
    head: [["ITEM", "PLACA", "DESCRIPCION DEL SERVICIO", "PESO TMB", "BS/TMB", "VIAJES", "BS/DIA", "TOTAL", "OBSERVACIONES"]],
    body: rows,
    styles: { ...pdfTableStyles, fontSize: 7, cellPadding: 2.5 },
    headStyles: { ...pdfHeadStyles, fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 20, halign: "right" },
      1: { cellWidth: 48 },
      2: { cellWidth: 138 },
      3: { cellWidth: 42, halign: "right" },
      4: { cellWidth: 38, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
      6: { cellWidth: 42, halign: "right" },
      7: { cellWidth: 52, halign: "right" },
      8: { cellWidth: 125 }
    },
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
    styles: { ...pdfTableStyles, fontSize: 8, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 160 }, 1: { cellWidth: 90, halign: "right" } },
    margin: { left: pageWidth - 30 - 250 },
    tableWidth: 250
  });

  let y = (doc as any).lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fecha: ${fechaLiquidacionLarga(liquidacion.fechaFin)}`, pageWidth - 30, y, { align: "right" });

  y += 24;
  doc.text(`Son: ${montoEnLetras(totales.neto)}`, 30, y, { maxWidth: pageWidth - 60 });

  dibujarPiePagina(
    doc,
    [
      { nombre: liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? "", cargo: "Contratista" },
      { nombre: FIRMA_ASISTENTE, cargo: FIRMA_ASISTENTE_CARGO },
      { nombre: FIRMA_SUPERINTENDENTE, cargo: FIRMA_SUPERINTENDENTE_CARGO }
    ],
    ["C.c. Presidente Ejecutivo", "C.c. Contabilidad La Paz", "C.c. Archivos Mina", "C.c. Contratista"]
  );

  openBrowserPrintDialog(doc, `liquidacion-empresa-${(folioLiquidacion(liquidacion) ?? liquidacion.id.slice(0, 8)).replace(/\//g, "-")}.pdf`);
}

// ============================================================================
// Liquidación — Particular (ej. Roger Orlando Quispe Miranda): réplica de la
// planilla real "LIQUIDACION POR SERVICIO DE TRANSPORTE DE CARGAS
// MINERALIZADAS": bloque azul con la empresa, folio "Nº 01/27", franja
// "CORRESPONDIENTE A", tabla ITEM/PLACA/PESO/PRECIO TMB/TOTAL/BANCO (con la
// cuenta en la primera fila), TOTAL TMB, y abajo TOTAL LIQUIDACION, los
// descuentos (el de combustible con sus litros) y TOTAL A FACTURAR.
// ============================================================================

const AZUL_EMPRESA = "8EA9DB";
const AZUL_FRANJA = "B4C6E7";
const AZUL_TITULO = "1F3864";
const FUENTE_PARTICULAR = "Arial Narrow";

interface LineaTotalParticular {
  etiqueta: string;
  cantidad?: number;
  monto: number;
}

function datosLiquidacionParticular(liquidacion: Liquidacion) {
  const filas = agruparPorPlaca(liquidacion);
  const fin = parseFecha(liquidacion.fechaFin);
  const totales = calcularTotales(liquidacion);
  const items = liquidacion.itemsConcepto ?? [];
  const litros = liquidacion.combustibleSugerido?.litrosTotal;
  const lineas: LineaTotalParticular[] = [
    ...items
      .filter((i) => i.concepto?.tipo === "ABONO")
      .map((i) => ({ etiqueta: (i.descripcion || i.concepto?.nombre || "ABONO").toUpperCase(), monto: Number(i.monto) })),
    ...items
      .filter((i) => i.concepto?.tipo === "DEDUCCION")
      .map((i) =>
        i.concepto?.esCombustible
          ? { etiqueta: "DESCUENTO POR COMBUSTIBLE", cantidad: litros && litros > 0 ? litros : undefined, monto: Number(i.monto) }
          : { etiqueta: (i.descripcion || i.concepto?.nombre || "DESCUENTO").toUpperCase(), monto: Number(i.monto) }
      )
  ];
  return {
    filas,
    fin,
    totales,
    lineas,
    pesoTotalTmb: num(filas.reduce((acc, f) => acc + f.pesoTotal, 0)),
    folio: folioLiquidacion(liquidacion),
    contratista: liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? "",
    banco: (liquidacion.transportista?.banco ?? "").toUpperCase(),
    numeroCuenta: liquidacion.transportista?.numeroCuenta ?? "",
    archivo: `liquidacion-particular-${(folioLiquidacion(liquidacion) ?? liquidacion.id.slice(0, 8)).replace(/\//g, "-")}`
  };
}

export function exportLiquidacionParticularExcel(liquidacion: Liquidacion) {
  const d = datosLiquidacionParticular(liquidacion);
  type Celda = [string | number, Record<string, unknown> | null];
  type Col = "A" | "B" | "C" | "D" | "E" | "F" | "G";
  const COLS: Col[] = ["A", "B", "C", "D", "E", "F", "G"];
  const filas: Celda[][] = [];
  const merges: XLSX.Range[] = [];
  const alturas: Record<number, number> = {};
  const fila = (celdas: Partial<Record<Col, Celda>>, altura?: number) => {
    const r = filas.length;
    filas.push(COLS.map((c) => celdas[c] ?? ["", null]));
    if (altura) alturas[r] = altura;
    return r;
  };
  const combinar = (r1: number, c1: number, r2: number, c2: number) => merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  const est = (o: {
    sz?: number;
    bold?: boolean;
    underline?: boolean;
    color?: string;
    h?: "left" | "center" | "right";
    v?: "top" | "center" | "bottom";
    fill?: string;
    borde?: boolean;
    fmt?: string;
  }) => ({
    font: { name: FUENTE_PARTICULAR, sz: o.sz ?? 10, bold: o.bold ?? false, underline: o.underline ?? false, ...(o.color ? { color: { rgb: o.color } } : {}) },
    alignment: { ...(o.h ? { horizontal: o.h } : {}), vertical: o.v ?? "center" },
    ...(o.fill ? { fill: { patternType: "solid", fgColor: { rgb: o.fill } } } : {}),
    ...(o.borde ? { border: thinBorder } : {}),
    ...(o.fmt ? { numFmt: o.fmt } : {})
  });
  const bloque = (o: Parameters<typeof est>[0] = {}) => est({ fill: AZUL_EMPRESA, ...o });

  const r1 = fila(
    {
      A: ["Empresa Minera", bloque({ sz: 16, bold: true, v: "center" })],
      B: ["", bloque()],
      C: ["", bloque()],
      G: [d.folio ? `Nº ${d.folio}` : "BORRADOR", est({ sz: 14, bold: true, h: "right" })]
    },
    24
  );
  combinar(r1, 0, r1, 2);
  const r2 = fila({ A: ["MARTE", bloque({ sz: 28, bold: true, underline: true, v: "bottom" })], B: ["", bloque()], C: ["", bloque()] }, 24);
  const r3 = fila({ A: ["", bloque()], B: ["S.R.L.", bloque({ sz: 8, bold: true, underline: true, v: "top" })], C: ["", bloque()] }, 12);
  combinar(r2, 0, r3, 0);
  fila({ A: [`NIT: ${MARTE_NIT}`, bloque({ sz: 9, bold: true })], B: ["", bloque()], C: ["", bloque()] }, 18);

  const titulo = est({ sz: 16, bold: true, underline: true, color: AZUL_TITULO, h: "center" });
  const t1 = fila({ A: ["LIQUIDACION POR SERVICIO DE TRANSPORTE DE CARGAS", titulo] }, 26);
  combinar(t1, 0, t1, 6);
  const t2 = fila({ A: ["MINERALIZADAS (MINA LIPEÑA - CHILCOBIJA)", titulo] }, 26);
  combinar(t2, 0, t2, 6);
  const tc = fila({ A: [`CONTRATISTA: ${d.contratista}`, est({ sz: 12, bold: true, underline: true, color: AZUL_TITULO })] }, 18);
  combinar(tc, 0, tc, 4);

  const franja = est({ sz: 9, bold: true, fill: AZUL_FRANJA });
  fila({
    A: ["CORRESPONDIENTE A:", franja],
    B: ["", franja],
    C: [`Fecha:  ${String(d.fin.getUTCDate()).padStart(2, "0")}`, franja],
    D: [`Mes: ${MESES_MAYUSCULA[d.fin.getUTCMonth()]}`, franja],
    E: ["", franja],
    F: ["", franja],
    G: [`Año: ${d.fin.getUTCFullYear()}`, est({ sz: 9, bold: true, fill: AZUL_FRANJA, h: "right" })]
  });

  const encabezado = est({ sz: 10, bold: true, h: "center", fill: AZUL_FRANJA, borde: true });
  const rEnc = fila({
    A: ["ITEM", encabezado],
    B: ["PLACA", encabezado],
    C: ["PESO", encabezado],
    D: ["PRECIO TMB", encabezado],
    E: ["TOTAL", encabezado],
    F: [d.banco ? `BANCO ${d.banco.replace(/^BANCO\s+/, "")}` : "BANCO", encabezado],
    G: ["", encabezado]
  });
  combinar(rEnc, 5, rEnc, 6);

  d.filas.forEach((f, i) => {
    const r = fila({
      A: [i + 1, est({ sz: 10, bold: true, h: "center", borde: true })],
      B: [f.placa, est({ sz: 10, h: "left", borde: true })],
      C: [num(f.pesoTotal), est({ sz: 10, bold: true, h: "center", borde: true, fmt: "0.00" })],
      D: [num(f.precioAplicado), est({ sz: 10, h: "center", borde: true, fmt: "0.00" })],
      E: [num(f.subtotal), est({ sz: 10, bold: true, h: "center", borde: true, fmt: "0.00" })],
      F: [i === 0 ? d.numeroCuenta : "", est({ sz: 10, h: "center", borde: true })],
      G: ["", est({ borde: true })]
    });
    combinar(r, 5, r, 6);
  });
  const rTmb = fila({
    A: ["TOTAL TMB", est({ sz: 10, bold: true, h: "center", borde: true })],
    B: ["", est({ borde: true })],
    C: [d.pesoTotalTmb, est({ sz: 10, bold: true, h: "center", borde: true, fmt: "0.00" })],
    D: ["", est({ borde: true })],
    E: [num(d.totales.bruto), est({ sz: 10, h: "center", borde: true, fmt: "#,##0.00" })],
    F: ["", est({ borde: true })],
    G: ["", est({ borde: true })]
  });
  combinar(rTmb, 0, rTmb, 1);
  combinar(rTmb, 5, rTmb, 6);

  const etiqueta = est({ sz: 10 });
  const montoGrande = est({ sz: 12, bold: true, h: "center", fmt: "#,##0.00" });
  fila({ B: ["TOTAL LIQUIDACION", etiqueta], E: [num(d.totales.bruto), montoGrande] }, 20);
  for (const linea of d.lineas) {
    fila(
      {
        B: [linea.etiqueta, etiqueta],
        D: linea.cantidad !== undefined ? [num(linea.cantidad), est({ sz: 10, h: "right", fmt: "#,##0.00" })] : ["", null],
        E: [num(linea.monto), montoGrande]
      },
      20
    );
  }
  fila({ B: ["TOTAL A FACTURAR", etiqueta], E: [num(d.totales.neto), montoGrande] }, 20);
  fila({}, 20);
  fila({ A: [`LIQUIDO A PAGAR.... ${montoEnLetras(d.totales.neto)}`, est({ sz: 9, bold: true })] }, 20);
  fila({ B: [`Fecha, ${fechaLiquidacionLarga(liquidacion.fechaFin)}`, est({ sz: 10 })] }, 20);
  fila({}, 20);
  fila({}, 20);
  fila({}, 20);
  fila({
    A: [FIRMA_SUPERINTENDENTE, est({ sz: 10, bold: true })],
    E: [d.contratista, est({ sz: 10, bold: true })]
  });
  fila({ A: ["Sup.te Mina Lipeña", est({ sz: 9 })], E: ["Contratista", est({ sz: 9 })] });
  fila({});
  for (const cc of ["C.c. Presidente Ejecutivo", "C.c. Jefe de Personal", "C.c. Archivos Mina", "C.c. Contratista"]) {
    fila({ A: [cc, est({ sz: 8 })] });
  }

  const sheet = XLSX.utils.aoa_to_sheet(filas.map((f) => f.map(([v]) => v)));
  filas.forEach((f, r) =>
    f.forEach(([, s], c) => {
      if (!s) return;
      const address = XLSX.utils.encode_cell({ r, c });
      if (!sheet[address]) sheet[address] = { t: "s", v: "" };
      sheet[address].s = s;
    })
  );
  sheet["!cols"] = [{ wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }];
  sheet["!rows"] = filas.map((_, r) => (alturas[r] ? { hpt: alturas[r] } : {}));
  sheet["!merges"] = merges;
  sheet["!margins"] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Liquidacion");
  XLSX.writeFile(workbook, `${d.archivo}.xlsx`);
}

export function exportLiquidacionParticularPdf(liquidacion: Liquidacion) {
  const d = datosLiquidacionParticular(liquidacion);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margen = 36;
  const ancho = pageWidth - margen * 2;
  const col = ancho / 7;
  const negro: [number, number, number] = [0, 0, 0];
  const azulEmpresa: [number, number, number] = [142, 169, 219];
  const azulFranja: [number, number, number] = [180, 198, 231];
  const azulTitulo: [number, number, number] = [31, 56, 100];

  const textoSubrayado = (texto: string, x: number, y: number, align: "left" | "center") => {
    doc.text(texto, x, y, { align });
    const w = doc.getTextWidth(texto);
    const x0 = align === "center" ? x - w / 2 : x;
    doc.setLineWidth(0.8);
    doc.line(x0, y + 2, x0 + w, y + 2);
  };

  // Bloque azul de la empresa (columnas A–C) y folio arriba a la derecha.
  doc.setFillColor(...azulEmpresa);
  doc.rect(margen, 24, col * 3, 82, "F");
  doc.setTextColor(...negro);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Empresa Minera", margen + 4, 42);
  doc.setFontSize(30);
  doc.setDrawColor(...negro);
  textoSubrayado("MARTE", margen + 4, 80, "left");
  const anchoMarte = doc.getTextWidth("MARTE");
  doc.setFontSize(7);
  textoSubrayado("S.R.L.", margen + 8 + anchoMarte, 80, "left");
  doc.setFontSize(8);
  doc.text(`NIT: ${MARTE_NIT}`, margen + 8, 98);
  doc.setFontSize(13);
  doc.text(d.folio ? `Nº ${d.folio}` : "BORRADOR", pageWidth - margen - 4, 44, { align: "right" });

  doc.setTextColor(...azulTitulo);
  doc.setDrawColor(...azulTitulo);
  doc.setFontSize(15);
  textoSubrayado("LIQUIDACION POR SERVICIO DE TRANSPORTE DE CARGAS", pageWidth / 2, 130, "center");
  textoSubrayado("MINERALIZADAS (MINA LIPEÑA - CHILCOBIJA)", pageWidth / 2, 152, "center");
  doc.setFontSize(11);
  textoSubrayado(`CONTRATISTA: ${d.contratista}`, margen, 172, "left");
  doc.setTextColor(...negro);
  doc.setDrawColor(...negro);

  doc.setFillColor(...azulFranja);
  doc.rect(margen, 178, ancho, 14, "F");
  doc.setFontSize(8);
  doc.text("CORRESPONDIENTE A:", margen + 3, 188);
  doc.text(`Fecha:  ${String(d.fin.getUTCDate()).padStart(2, "0")}`, margen + col * 2 - 20, 188);
  doc.text(`Mes: ${MESES_MAYUSCULA[d.fin.getUTCMonth()]}`, margen + col * 3 + 10, 188);
  doc.text(`Año: ${d.fin.getUTCFullYear()}`, pageWidth - margen - 4, 188, { align: "right" });

  const celda = (content: string, extra: Record<string, unknown> = {}) => ({ content, styles: extra });
  const body: RowInput[] = d.filas.map((f, i) => [
    celda(String(i + 1), { halign: "center", fontStyle: "bold" }),
    celda(f.placa),
    celda(f.pesoTotal.toFixed(2), { halign: "center", fontStyle: "bold" }),
    celda(f.precioAplicado.toFixed(2), { halign: "center" }),
    celda(f.subtotal.toFixed(2), { halign: "center", fontStyle: "bold" }),
    { content: i === 0 ? d.numeroCuenta : "", colSpan: 2, styles: { halign: "center" } }
  ]);
  body.push([
    { content: "TOTAL TMB", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
    celda(d.pesoTotalTmb.toFixed(2), { halign: "center", fontStyle: "bold" }),
    "",
    celda(d.totales.bruto.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), { halign: "center" }),
    { content: "", colSpan: 2 }
  ]);

  drawPlainTable(doc, {
    startY: 192,
    margin: { left: margen, right: margen },
    styles: { ...pdfTableStyles, fontSize: 9, cellPadding: 3.5 },
    headStyles: { ...pdfHeadStyles, fillColor: azulFranja, halign: "center", fontSize: 9 },
    columnStyles: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((i) => [i, { cellWidth: col }])),
    head: [["ITEM", "PLACA", "PESO", "PRECIO TMB", "TOTAL", { content: d.banco ? `BANCO ${d.banco.replace(/^BANCO\s+/, "")}` : "BANCO", colSpan: 2 }]],
    body
  });

  const enUS = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let y = (doc as any).lastAutoTable.finalY + 20;
  const lineaTotal = (etiqueta: string, monto: number, cantidad?: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(etiqueta, margen + col + 4, y);
    if (cantidad !== undefined) doc.text(enUS(cantidad), margen + col * 4 - 6, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(enUS(monto), margen + col * 4.5, y, { align: "center" });
    y += 19;
  };
  lineaTotal("TOTAL LIQUIDACION", d.totales.bruto);
  for (const linea of d.lineas) lineaTotal(linea.etiqueta, linea.monto, linea.cantidad);
  lineaTotal("TOTAL A FACTURAR", d.totales.neto);

  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`LIQUIDO A PAGAR.... ${montoEnLetras(d.totales.neto)}`, margen, y, { maxWidth: ancho });
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fecha, ${fechaLiquidacionLarga(liquidacion.fechaFin)}`, margen + col + 4, y);

  dibujarPiePagina(
    doc,
    [
      { nombre: d.contratista, cargo: "Contratista" },
      { nombre: FIRMA_SUPERINTENDENTE, cargo: "Sup.te Mina Lipeña" }
    ],
    ["C.c. Presidente Ejecutivo", "C.c. Jefe de Personal", "C.c. Archivos Mina", "C.c. Contratista"]
  );

  openBrowserPrintDialog(doc, `${d.archivo}.pdf`);
}

// ============================================================================
// Liquidación — Respaldo por viaje (un bloque por volqueta): el documento
// real que sustenta los totales de la planilla consolidada de arriba —
// detalle de cada viaje (conocimiento, chofer, fecha, peso) y, en la fila
// "Total", el peso crudo de 3 decimales sumado Y el redondeado a 2
// decimales lado a lado, para auditar exactamente cómo se llegó al monto
// que cobra cada vehículo (mismo método que agruparPorVehiculoYPrecio en
// liquidacion.service.ts, verificado contra el documento físico real).
// ============================================================================

export function exportLiquidacionPorViajeExcel(liquidacion: Liquidacion) {
  const grupos = agruparPorPlacaConViajes(liquidacion);
  const fin = parseFecha(liquidacion.fechaFin);
  const banco = liquidacion.transportista?.banco;
  const numeroCuenta = liquidacion.transportista?.numeroCuenta;
  const lastCol = 7;

  const aoa: Array<Array<string | number>> = [
    ["Empresa Minera", "", "", "", "", "", "N°", folioLiquidacion(liquidacion) ?? "BORRADOR"],
    [`MARTE S.R.L. — NIT: ${MARTE_NIT}`, "", "", "", "", "", "", ""],
    [],
    ["RESPALDO POR VIAJE", "", "", "", "", "", "", ""],
    ["TRANSPORTE DE CARGA CHAMI DE MINA LIPEÑA A CHILCOBIJA", "", "", "", "", "", "", ""],
    [`CONTRATISTA: ${liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? ""}`, "", "", "", "", "", "", ""],
    [
      `FECHA: ${fin.getUTCDate()}    MES: ${MESES_MAYUSCULA[fin.getUTCMonth()]}    AÑO: ${fin.getUTCFullYear()}`,
      "", "", "", "", "", "", ""
    ]
  ];
  const rowKinds: Array<"title" | "subtitle" | "header" | "normal" | "total" | "blank" | "plain"> = [
    "subtitle", "subtitle", "blank", "title", "subtitle", "plain", "plain"
  ];
  const decimalCells: Array<{ row: number; col: number; formato: string }> = [];
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: lastCol } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: lastCol } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: lastCol } }
  ];

  for (const grupo of grupos) {
    aoa.push([]);
    rowKinds.push("blank");
    merges.push({ s: { r: aoa.length, c: 0 }, e: { r: aoa.length, c: lastCol } });
    aoa.push([`PLACA: ${grupo.placa}`, "", "", "", "", "", "", ""]);
    rowKinds.push("subtitle");
    aoa.push(["Pre.", "Nº VIAJE", "FECHA", "CONOCIMIENTO", "CHOFER", "PLACA", "PESO", "PESO REDONDEADO"]);
    rowKinds.push("header");

    grupo.viajesDetalle.forEach((v, index) => {
      decimalCells.push({ row: aoa.length, col: 6, formato: "#,##0.000" });
      aoa.push([index + 1, v.numeroViaje, formatFecha(v.fecha), v.correlativo, v.choferNombre, grupo.placa, num3(v.tonelajeNeto), ""]);
      rowKinds.push("normal");
    });

    decimalCells.push({ row: aoa.length, col: 6, formato: "#,##0.000" });
    decimalCells.push({ row: aoa.length, col: 7, formato: "#,##0.00" });
    aoa.push(["", "", "", "", "", "Total", num3(grupo.pesoTotalCrudo), num(grupo.pesoTotal)]);
    rowKinds.push("total");

    decimalCells.push({ row: aoa.length, col: 7, formato: "#,##0.00" });
    // Merges para que CONTRATISTA/BANCO/NUMERO DE CUENTA no se corten en la
    // celda angosta de "Pre." — cada dato ocupa 2 columnas.
    const filaResumen = aoa.length;
    merges.push({ s: { r: filaResumen, c: 0 }, e: { r: filaResumen, c: 1 } });
    merges.push({ s: { r: filaResumen, c: 2 }, e: { r: filaResumen, c: 3 } });
    merges.push({ s: { r: filaResumen, c: 4 }, e: { r: filaResumen, c: 5 } });
    aoa.push([
      `CONTRATISTA: ${liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? ""}`,
      "",
      banco ? `BANCO: ${banco.toUpperCase()}` : "",
      "",
      numeroCuenta ? `NUMERO DE CUENTA: ${numeroCuenta}` : "",
      "",
      "TOTAL",
      num(grupo.subtotal)
    ]);
    rowKinds.push("total");
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 26 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
  sheet["!merges"] = merges;
  rowKinds.forEach((kind, index) => {
    if (kind === "blank") return;
    const style =
      kind === "title" ? titleStyle
      : kind === "subtitle" ? subtitleStyle
      : kind === "header" ? headerStyle
      : kind === "total" ? totalStyle
      : kind === "plain" ? plainStyle
      : bodyStyle;
    styleRow(sheet, index, lastCol, style);
  });
  for (const { row, col, formato } of decimalCells) numberFormatCell(sheet, row, col, formato);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Respaldo por viaje".slice(0, 31));
  XLSX.writeFile(workbook, `liquidacion-por-viaje-${(folioLiquidacion(liquidacion) ?? liquidacion.id.slice(0, 8)).replace(/\//g, "-")}.xlsx`);
}

export function exportLiquidacionPorViajePdf(liquidacion: Liquidacion) {
  const grupos = agruparPorPlacaConViajes(liquidacion);
  const fin = parseFecha(liquidacion.fechaFin);
  const banco = liquidacion.transportista?.banco;
  const numeroCuenta = liquidacion.transportista?.numeroCuenta;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  grupos.forEach((grupo, index) => {
    if (index > 0) doc.addPage();

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
    doc.text(folioLiquidacion(liquidacion) ? `N° ${folioLiquidacion(liquidacion)}` : "BORRADOR", pageWidth - 60, 34, { align: "center" });

    doc.setFontSize(13);
    doc.setTextColor(...AZUL_CONOCIMIENTO);
    doc.text("RESPALDO POR VIAJE", centerX, 30, { align: "center" });
    const tituloWidth = doc.getTextWidth("RESPALDO POR VIAJE");
    doc.setDrawColor(...AZUL_CONOCIMIENTO);
    doc.setLineWidth(0.8);
    doc.line(centerX - tituloWidth / 2, 33, centerX + tituloWidth / 2, 33);
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Transporte de carga Chami de mina Lipeña a Chilcobija", centerX, 46, { align: "center" });
    doc.text(`CONTRATISTA: ${liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? ""}`, centerX, 60, { align: "center" });
    doc.text(
      `FECHA: ${fin.getUTCDate()}    MES: ${MESES_MAYUSCULA[fin.getUTCMonth()]}    AÑO: ${fin.getUTCFullYear()}`,
      centerX,
      73,
      { align: "center" }
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`PLACA: ${grupo.placa}`, 30, 92);

    const rows: RowInput[] = grupo.viajesDetalle.map((v, i) => [
      i + 1, v.numeroViaje, formatFecha(v.fecha), v.correlativo, v.choferNombre, grupo.placa, v.tonelajeNeto.toFixed(3), ""
    ]);
    rows.push(["", "", "", "", "", "Total", grupo.pesoTotalCrudo.toFixed(3), formatBs(grupo.pesoTotal)]);

    drawPlainTable(doc, {
      startY: 100,
      head: [["Pre.", "Nº VIAJE", "FECHA", "CONOCIMIENTO", "CHOFER", "PLACA", "PESO", "PESO REDONDEADO"]],
      body: rows,
      styles: pdfTableStyles,
      headStyles: pdfHeadStyles,
      columnStyles: {
        0: { cellWidth: 35, halign: "right" },
        1: { cellWidth: 55, halign: "right" },
        2: { cellWidth: 60 },
        3: { cellWidth: 75 },
        5: { cellWidth: 60 },
        6: { cellWidth: 80, halign: "right" },
        7: { cellWidth: 90, halign: "right" }
      },
      margin: { left: 30, right: 30 }
    });

    // Caja de totales con bordes reales (igual que las otras planillas), en
    // vez de texto suelto — contratista/banco/cuenta a la izquierda, total
    // a pagar de este vehículo a la derecha.
    const finalY = (doc as any).lastAutoTable.finalY + 14;
    const datosContratista = [
      `CONTRATISTA: ${liquidacion.transportista?.nombreORazonSocial?.toUpperCase() ?? ""}`,
      banco ? `BANCO: ${banco.toUpperCase()}` : "",
      numeroCuenta ? `NUMERO DE CUENTA: ${numeroCuenta}` : ""
    ].filter(Boolean);

    drawPlainTable(doc, {
      startY: finalY,
      body: datosContratista.map((linea) => [linea]),
      styles: { ...pdfTableStyles, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 320 } },
      margin: { left: 30 },
      tableWidth: 320
    });

    drawPlainTable(doc, {
      startY: finalY,
      body: [["TOTAL", formatBs(grupo.subtotal)]],
      styles: { ...pdfTableStyles, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 110, halign: "right" } },
      margin: { left: pageWidth - 30 - 210 },
      tableWidth: 210
    });
  });

  openBrowserPrintDialog(doc, `liquidacion-por-viaje-${(folioLiquidacion(liquidacion) ?? liquidacion.id.slice(0, 8)).replace(/\//g, "-")}.pdf`);
}

// ============================================================================
// Cuadro Mensual (consolidado) — mismas columnas que ya se ven en pantalla,
// ahora también exportable a Excel/PDF.
// ============================================================================

// Mismo layout que el "Cuadro de Envío de Carga Chami" físico que arma la
// empresa en Excel mes a mes (el mismo documento que importarHistoricoDesdeExcel
// lee en sentido inverso) — 15 columnas con el peso de cada viaje repartido
// en una de 4 columnas de nivel (NIVEL 40/Nivel 0/Nivel 80/La Moza), nunca
// las 4 juntas en la misma fila, y una fila TOTAL TMB al pie con la suma de
// cada columna numérica.
const CUADRO_MENSUAL_HEADERS = [
  "Nº", "FECHA", "CONOCI\nMIENTO", "Form.\n101", "PESO Kg", "MUNICIPIO", "MUNICIP\nIO Nº",
  "NIVEL 40", "Nivel 0", "Nivel 80", "La Moza", "PROPIETARIO", "CHOFER", "PLACA", "Lote"
];

function construirFilasCuadroMensual(cuadro: CuadroMensual) {
  const niveles = ["Nivel 40", "Nivel 0", "Nivel 80", "La Moza"];
  const sumasPorNivel: Record<string, number> = { "Nivel 40": 0, "Nivel 0": 0, "Nivel 80": 0, "La Moza": 0 };
  let sumaPeso = 0;

  const filas = cuadro.lotes.map((l, index) => {
    const peso = Number(l.pesaje?.tonelajeNeto ?? 0);
    sumaPeso += peso;
    const celdasNivel = niveles.map((n) => {
      if (l.nivel === n) {
        sumasPorNivel[n] += peso;
        return peso;
      }
      return "";
    });
    return {
      numero: index + 1,
      fecha: formatFecha(l.fechaDespachoReal),
      conocimiento: l.correlativo,
      form101: l.formulario101 ? l.formulario101.codigo : "",
      peso,
      municipio: l.municipioOrigen?.nombre ?? "",
      municipioNumero: l.municipioOrigen?.codigo ?? "",
      celdasNivel,
      propietario: l.transportista?.nombreORazonSocial ?? "",
      chofer: l.chofer?.nombre ?? "",
      placa: l.vehiculo?.placa ?? "",
      // "Lote" = combustible ASIGNADO (lo que posiblemente le tocaba dar a
      // ese viaje) — no el real entregado; en blanco si no llevó combustible.
      lote: l.combustibleAsignadoLitros !== null && l.combustibleAsignadoLitros !== undefined ? Number(l.combustibleAsignadoLitros) : ""
    };
  });

  return { filas, sumaPeso, sumasPorNivel };
}

function tituloCuadroMensual(municipioNombre: string, anio: number, mes: number, nivel?: string) {
  const partes = [`Mes: ${MESES_MAYUSCULA[mes - 1]} ${anio}`];
  if (municipioNombre && municipioNombre !== "TODOS LOS MUNICIPIOS") partes.push(`Municipio: ${municipioNombre.toUpperCase()}`);
  if (nivel) partes.push(`Nivel: ${nivel}`);
  return partes.join("   ·   ");
}

export function exportCuadroMensualExcel(
  cuadro: CuadroMensual,
  municipioNombre: string,
  anio: number,
  mes: number,
  nivel?: string
) {
  const lastCol = CUADRO_MENSUAL_HEADERS.length - 1;
  const { filas, sumaPeso, sumasPorNivel } = construirFilasCuadroMensual(cuadro);

  const aoa: Array<Array<string | number>> = [
    ["Empresa Minera", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["MARTE S.R.L.", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["CUADRO DE ENVIO DE CARGA CHAMI", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["DE MINA LIPEÑA A CHILCOBIJA", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    [tituloCuadroMensual(municipioNombre, anio, mes, nivel), "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    [],
    CUADRO_MENSUAL_HEADERS.map((h) => h.replace("\n", " "))
  ];
  const rowKinds: Array<"title" | "subtitle" | "header" | "normal" | "total" | "blank"> = [
    "subtitle", "title", "title", "subtitle", "subtitle", "blank", "header"
  ];

  for (const f of filas) {
    aoa.push([
      f.numero,
      f.fecha,
      f.conocimiento,
      f.form101,
      num3(f.peso),
      f.municipio,
      f.municipioNumero,
      f.celdasNivel[0] === "" ? "" : num3(f.celdasNivel[0] as number),
      f.celdasNivel[1] === "" ? "" : num3(f.celdasNivel[1] as number),
      f.celdasNivel[2] === "" ? "" : num3(f.celdasNivel[2] as number),
      f.celdasNivel[3] === "" ? "" : num3(f.celdasNivel[3] as number),
      f.propietario,
      f.chofer,
      f.placa,
      f.lote === "" ? "" : (f.lote as number)
    ]);
    rowKinds.push("normal");
  }

  aoa.push([
    "", "", "", "",
    num3(sumaPeso),
    "", "",
    num3(sumasPorNivel["Nivel 40"]!),
    num3(sumasPorNivel["Nivel 0"]!),
    num3(sumasPorNivel["Nivel 80"]!),
    num3(sumasPorNivel["La Moza"]!),
    "", "", "",
    "TOTAL TMB."
  ]);
  rowKinds.push("total");

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [
    { wch: 4 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 9 }, { wch: 12 }, { wch: 9 },
    { wch: 9 }, { wch: 8 }, { wch: 9 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 9 }, { wch: 7 }
  ];
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: lastCol } }
  ];
  rowKinds.forEach((kind, index) => {
    if (kind === "blank") return;
    const style = kind === "title" ? titleStyle : kind === "subtitle" ? subtitleStyle : kind === "header" ? headerStyle : kind === "total" ? totalStyle : bodyStyle;
    styleRow(sheet, index, lastCol, style);
  });
  for (const col of [4, 7, 8, 9, 10]) {
    for (let r = 0; r < aoa.length; r += 1) numberFormatCell(sheet, r, col, "#,##0.000");
  }
  for (let r = 0; r < aoa.length; r += 1) numberFormatCell(sheet, r, 14, "#,##0");

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Cuadro Mensual".slice(0, 31));
  XLSX.writeFile(workbook, `cuadro-mensual-${anio}-${String(mes).padStart(2, "0")}.xlsx`);
}

export function exportCuadroMensualPdf(
  cuadro: CuadroMensual,
  municipioNombre: string,
  anio: number,
  mes: number,
  nivel?: string
) {
  const { filas, sumaPeso, sumasPorNivel } = construirFilasCuadroMensual(cuadro);

  // Vertical (portrait): el documento real son muchas columnas angostas, no
  // pocas columnas anchas — igual que el Excel real, entra mejor en una
  // hoja alta que ancha.
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Empresa Minera", 20, 22);
  doc.text("MARTE S.R.L.", 20, 34);
  doc.setFontSize(10);
  doc.text("CUADRO DE ENVIO DE CARGA CHAMI", centerX, 22, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("DE MINA LIPEÑA A CHILCOBIJA", centerX, 34, { align: "center" });
  doc.text(tituloCuadroMensual(municipioNombre, anio, mes, nivel), centerX, 46, { align: "center" });

  const rows: RowInput[] = filas.map((f) => [
    f.numero,
    f.fecha,
    f.conocimiento,
    f.form101,
    f.peso.toFixed(3),
    f.municipio,
    f.municipioNumero,
    f.celdasNivel[0] === "" ? "" : (f.celdasNivel[0] as number).toFixed(3),
    f.celdasNivel[1] === "" ? "" : (f.celdasNivel[1] as number).toFixed(3),
    f.celdasNivel[2] === "" ? "" : (f.celdasNivel[2] as number).toFixed(3),
    f.celdasNivel[3] === "" ? "" : (f.celdasNivel[3] as number).toFixed(3),
    f.propietario,
    f.chofer,
    f.placa,
    f.lote === "" ? "" : String(f.lote)
  ]);
  rows.push([
    "", "", "", "",
    sumaPeso.toFixed(3),
    "", "",
    sumasPorNivel["Nivel 40"]!.toFixed(3),
    sumasPorNivel["Nivel 0"]!.toFixed(3),
    sumasPorNivel["Nivel 80"]!.toFixed(3),
    sumasPorNivel["La Moza"]!.toFixed(3),
    "", "", "",
    "TOTAL TMB."
  ]);

  drawPlainTable(doc, {
    startY: 56,
    head: [CUADRO_MENSUAL_HEADERS],
    body: rows,
    styles: { ...pdfTableStyles, fontSize: 6.5, cellPadding: 2 },
    headStyles: { ...pdfHeadStyles, fontSize: 6.5 },
    columnStyles: {
      0: { cellWidth: 16, halign: "right" },
      1: { cellWidth: 40 },
      2: { cellWidth: 32, halign: "center" },
      3: { cellWidth: 34, halign: "center" },
      4: { cellWidth: 36, halign: "right" },
      5: { cellWidth: 48 },
      6: { cellWidth: 32, halign: "center" },
      7: { cellWidth: 30, halign: "right" },
      8: { cellWidth: 30, halign: "right" },
      9: { cellWidth: 30, halign: "right" },
      10: { cellWidth: 30, halign: "right" },
      11: { cellWidth: 62 },
      12: { cellWidth: 62 },
      13: { cellWidth: 36, halign: "center" },
      14: { cellWidth: 28, halign: "right" }
    },
    margin: { left: 15, right: 15 }
  });

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

// ============================================================================
// Exportador genérico para los reportes "tabla simple" del hub de Reportes
// de Logística (resumen por mineral, ranking de transportistas, estado de
// F101, resumen de liquidaciones, tarifas vigentes): mismo look blanco y
// negro que el resto (título + subtítulo centrados, tabla con bordes finos,
// fila de totales en negrita) sin repetir el boilerplate de estilos en cada
// reporte nuevo — a diferencia de Conocimiento/Boleta/Liquidación, estos no
// imitan un documento físico específico, así que no hace falta una función
// a medida por cada uno.
// ============================================================================
export interface TablaReporteConfig {
  subtitulo: string;
  columnas: string[];
  filas: Array<Array<string | number>>;
  filaTotales?: Array<string | number>;
  nombreArchivo: string;
  colsNumericas?: number[];
  anchoColumnas?: number[];
}

export function exportTablaReporteExcel(config: TablaReporteConfig) {
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
    const style = kind === "title" ? titleStyle : kind === "subtitle" ? subtitleStyle : kind === "header" ? headerStyle : isTotales ? totalStyle : bodyStyle;
    styleRow(sheet, index, lastCol, style);
  });
  for (const col of config.colsNumericas ?? []) {
    for (let r = 4; r < aoa.length; r += 1) numberFormatCell(sheet, r, col);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, config.nombreArchivo.slice(0, 31));
  XLSX.writeFile(workbook, `${config.nombreArchivo}-${hoyLocal()}.xlsx`);
}

export function exportTablaReportePdf(config: TablaReporteConfig) {
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

  drawPlainTable(doc, {
    startY: 64,
    head: [config.columnas],
    body: rows,
    styles: pdfTableStyles,
    headStyles: pdfHeadStyles,
    columnStyles,
    didParseCell: (hook) => {
      if (config.filaTotales && hook.section === "body" && hook.row.index === rows.length - 1) {
        hook.cell.styles.fontStyle = "bold";
      }
    }
  });

  openBrowserPrintDialog(doc, `${config.nombreArchivo}-${hoyLocal()}.pdf`);
}
