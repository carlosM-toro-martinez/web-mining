import * as XLSX from "xlsx-js-style";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logoMarte from "@/features/solicitudesPago/assets/logo-marte.png?inline";
import { ESTADO_PAGO, fechaCorta, nombreMes, textoEntrega } from "@/features/solicitudesPago/lib/etiquetas";
import type { SolicitudPago } from "@/features/solicitudesPago/model/solicitudesPago.schema";

// Planilla de control del mes ("PLANILLA DE CONTROL PARA SOLICITUD DE PAGO"): una fila por
// solicitud con su factura, su pago y su estado. Mismos colores y columnas que el Excel del cliente.

const COLORES = {
  titulo: "83CBEB",
  mes: "C1E5F5",
  encabezado: "F2AA84",
  factura: "CAEEFB",
  total: "C1E5F5"
} as const;

const ENCABEZADOS = [
  "Nº Solicitud",
  "FECHA",
  "No. De COTIZACION",
  "DESCRIPCION",
  "NOMBRE",
  "NIT o C.I.",
  "No. FACTURA",
  "BANCO",
  "Nº CUENTA",
  "TOTAL PAGO",
  "OBSERVACIONES",
  "ESTADO"
];

// Ancho de cada columna en caracteres de Excel
const ANCHOS = [8, 10, 12, 47, 22, 13, 13, 16, 18, 12, 15, 17];

export interface FilaPlanilla {
  numero: number;
  fecha: string;
  cotizacion: string;
  descripcion: string;
  nombre: string;
  nit: string;
  factura: string;
  banco: string;
  cuenta: string;
  total: number;
  observaciones: string;
  estado: string;
  anulada: boolean;
}

export function filasPlanilla(solicitudes: SolicitudPago[]): FilaPlanilla[] {
  return [...solicitudes]
    .sort((a, b) => a.numero - b.numero)
    .map((s) => ({
      numero: s.numero,
      fecha: fechaCorta(s.fecha),
      cotizacion: s.cotizacion ?? "",
      descripcion: s.items.map((item) => item.descripcion.trim()).join("-").toUpperCase(),
      nombre: s.beneficiarioNombre,
      nit: s.beneficiarioNit ?? "",
      // En blanco = todavía no hay factura; "NO FACTURA" = se confirmó que no la hay
      factura: s.tipoDocumento === "SIN_DOCUMENTO" ? "NO FACTURA" : (s.numeroFactura ?? ""),
      banco: s.banco ?? "",
      cuenta: s.cuenta ?? "",
      total: s.estado === "ANULADA" ? 0 : s.total,
      observaciones: ESTADO_PAGO[s.estado].planilla,
      estado: textoEntrega(s),
      anulada: s.estado === "ANULADA"
    }));
}

const totalPlanilla = (filas: FilaPlanilla[]) => filas.reduce((suma, fila) => suma + fila.total, 0);

function nombreArchivo(anio: number, mes: number, extension: string) {
  return `Planilla-solicitudes-de-pago-${anio}-${String(mes).padStart(2, "0")}.${extension}`;
}

// ── Excel ────────────────────────────────────────────────────────────────────

const linea = { style: "thin", color: { rgb: "FF000000" } };
const bordes = { top: linea, bottom: linea, left: linea, right: linea };

function celda(valor: string | number, estilo: Record<string, unknown>) {
  return { t: typeof valor === "number" ? "n" : "s", v: valor, s: estilo } as XLSX.CellObject;
}

export function crearLibroPlanilla(solicitudes: SolicitudPago[], anio: number, mes: number): XLSX.WorkBook {
  const filas = filasPlanilla(solicitudes);
  const hoja: XLSX.WorkSheet = {};
  const ultimaCol = ENCABEZADOS.length - 1;
  const merges: XLSX.Range[] = [];

  // Fila 1: título; fila 2: mes y año; fila 3: encabezados
  for (let c = 0; c <= ultimaCol; c += 1) {
    hoja[XLSX.utils.encode_cell({ r: 0, c })] = celda(
      c === 0 ? "PLANILLA DE CONTROL PARA SOLICITUD DE PAGO" : "",
      { font: { name: "Arial Black", sz: 9 }, fill: { patternType: "solid", fgColor: { rgb: `FF${COLORES.titulo}` } }, alignment: { horizontal: "center", vertical: "center" } }
    );
    hoja[XLSX.utils.encode_cell({ r: 1, c })] = celda(
      c === 0 ? `Empresa Minera MARTE S.R.L.        MES: ${nombreMes(mes).toUpperCase()}        Año: ${anio}` : "",
      {
        font: { name: "Aptos Narrow", sz: 9, bold: true },
        fill: { patternType: "solid", fgColor: { rgb: `FF${COLORES.mes}` } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { bottom: linea }
      }
    );
  }
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: ultimaCol } }, { s: { r: 1, c: 0 }, e: { r: 1, c: ultimaCol } });

  ENCABEZADOS.forEach((titulo, c) => {
    hoja[XLSX.utils.encode_cell({ r: 2, c })] = celda(titulo, {
      font: { name: "Aptos Narrow", sz: 9, bold: true },
      fill: { patternType: "solid", fgColor: { rgb: `FF${COLORES.encabezado}` } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: bordes
    });
  });

  const base = { font: { name: "Aptos Narrow", sz: 9 }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: bordes };
  filas.forEach((fila, i) => {
    const r = 3 + i;
    const valores: Array<string | number> = [
      fila.numero, fila.fecha, fila.cotizacion, fila.descripcion, fila.nombre, fila.nit, fila.factura, fila.banco,
      fila.cuenta, fila.total, fila.observaciones, fila.estado
    ];
    valores.forEach((valor, c) => {
      const especial =
        c === 6
          ? { font: { name: "Aptos Narrow", sz: 9, bold: true }, fill: { patternType: "solid", fgColor: { rgb: `FF${COLORES.factura}` } } }
          : c === 9
            ? { fill: { patternType: "solid", fgColor: { rgb: `FF${COLORES.total}` } }, numFmt: "0.00" }
            : {};
      hoja[XLSX.utils.encode_cell({ r, c })] = celda(valor, { ...base, ...especial });
    });
  });

  // Total del mes
  const rTotal = 3 + filas.length;
  const estiloTotal = {
    font: { name: "Aptos Narrow", sz: 9, bold: true },
    fill: { patternType: "solid", fgColor: { rgb: `FF${COLORES.total}` } },
    alignment: { horizontal: "center" },
    border: bordes
  };
  hoja[XLSX.utils.encode_cell({ r: rTotal, c: 6 })] = celda("TOTAL BS", estiloTotal);
  hoja[XLSX.utils.encode_cell({ r: rTotal, c: 7 })] = celda("", estiloTotal);
  hoja[XLSX.utils.encode_cell({ r: rTotal, c: 8 })] = celda("", estiloTotal);
  hoja[XLSX.utils.encode_cell({ r: rTotal, c: 9 })] = celda(Number(totalPlanilla(filas).toFixed(2)), { ...estiloTotal, numFmt: "0.00" });
  merges.push({ s: { r: rTotal, c: 6 }, e: { r: rTotal, c: 8 } });

  hoja["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rTotal, c: ultimaCol } });
  hoja["!merges"] = merges;
  hoja["!cols"] = ANCHOS.map((wch) => ({ wch }));
  hoja["!rows"] = [{ hpt: 18 }, { hpt: 24 }, { hpt: 27 }];
  hoja["!margins"] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, `Planilla ${nombreMes(mes)}`.slice(0, 31));
  return libro;
}

export function exportarPlanillaExcel(solicitudes: SolicitudPago[], anio: number, mes: number) {
  XLSX.writeFile(crearLibroPlanilla(solicitudes, anio, mes), nombreArchivo(anio, mes, "xlsx"));
}

// ── PDF ──────────────────────────────────────────────────────────────────────

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

export function crearPdfPlanilla(solicitudes: SolicitudPago[], anio: number, mes: number): jsPDF {
  const filas = filasPlanilla(solicitudes);
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "landscape" });
  const margen = 24;
  const ancho = doc.internal.pageSize.getWidth() - margen * 2;

  const dibujarCabecera = () => {
    // Banda del título y del mes, con el logo de la empresa a la izquierda
    doc.setFillColor(...rgb(COLORES.titulo));
    doc.rect(margen, margen, ancho, 15, "F");
    doc.setFillColor(...rgb(COLORES.mes));
    doc.rect(margen, margen + 15, ancho, 26, "F");
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margen, margen + 41, margen + ancho, margen + 41);
    doc.addImage(logoMarte, "PNG", margen + 3, margen + 2, 88, 25.3);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("PLANILLA DE CONTROL PARA SOLICITUD DE PAGO", margen + ancho / 2, margen + 10.5, { align: "center" });
    doc.setFontSize(7.5);
    doc.text(`MES:   ${nombreMes(mes).toUpperCase()}          Año: ${anio}`, margen + ancho / 2 + 20, margen + 32, { align: "center" });
  };

  autoTable(doc, {
    startY: margen + 41,
    margin: { left: margen, right: margen, top: margen + 41, bottom: margen },
    head: [ENCABEZADOS],
    body: filas.map((fila) => [
      String(fila.numero), fila.fecha, fila.cotizacion, fila.descripcion, fila.nombre, fila.nit, fila.factura, fila.banco,
      fila.cuenta, fila.total.toFixed(2), fila.observaciones, fila.estado
    ]),
    foot: [["", "", "", "", "", "", "TOTAL BS", "", "", totalPlanilla(filas).toFixed(2), "", ""]],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 6.6, cellPadding: 2.2, halign: "center", valign: "middle", lineColor: [0, 0, 0], lineWidth: 0.4, textColor: [0, 0, 0] },
    headStyles: { fillColor: rgb(COLORES.encabezado), textColor: [0, 0, 0], fontStyle: "bold", fontSize: 6.8 },
    footStyles: { fillColor: rgb(COLORES.total), textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 42 },
      2: { cellWidth: 48 },
      3: { cellWidth: 146 },
      4: { cellWidth: 82 },
      5: { cellWidth: 48 },
      6: { cellWidth: 50, fillColor: rgb(COLORES.factura), fontStyle: "bold" },
      7: { cellWidth: 56 },
      8: { cellWidth: 64 },
      9: { cellWidth: 44, fillColor: rgb(COLORES.total) },
      10: { cellWidth: 70 },
      11: { cellWidth: 54 }
    },
    willDrawPage: dibujarCabecera,
    didParseCell: (data) => {
      // Las solicitudes anuladas se tachan en gris para que no se confundan con las vigentes
      if (data.section === "body" && filas[data.row.index]?.anulada) data.cell.styles.textColor = [120, 120, 120];
    }
  });
  return doc;
}

export function exportarPlanillaPdf(solicitudes: SolicitudPago[], anio: number, mes: number) {
  crearPdfPlanilla(solicitudes, anio, mes).save(nombreArchivo(anio, mes, "pdf"));
}
