import * as XLSX from "xlsx-js-style";
import { jsPDF } from "jspdf";
import {
  anchoEnPuntos,
  construirFormulario,
  type CeldaFormulario,
  type EstiloCelda,
  type FormularioLayout
} from "@/features/solicitudesPago/lib/formularioLayout";
import type { SolicitudPago } from "@/features/solicitudesPago/model/solicitudesPago.schema";

function nombreArchivo(solicitud: SolicitudPago, extension: string) {
  const mes = String(solicitud.mes).padStart(2, "0");
  return `Solicitud-de-pago-${solicitud.anio}-${mes}-N${solicitud.numero}.${extension}`;
}

// ── Excel ────────────────────────────────────────────────────────────────────

const colLetra = (indice: number) => XLSX.utils.encode_col(indice);

function estiloExcel(estilo: EstiloCelda, borde: { l: boolean; r: boolean; t: boolean; b: boolean }) {
  const linea = { style: "thin", color: { rgb: "FF000000" } };
  return {
    font: {
      name: estilo.fuente ?? "Aptos Narrow",
      sz: estilo.tamano ?? 11,
      bold: Boolean(estilo.negrita),
      italic: Boolean(estilo.cursiva),
      underline: Boolean(estilo.subrayado),
      color: { rgb: `FF${estilo.color ?? "000000"}` }
    },
    ...(estilo.relleno ? { fill: { patternType: "solid", fgColor: { rgb: `FF${estilo.relleno}` } } } : {}),
    alignment: {
      horizontal: estilo.h ?? "left",
      vertical: estilo.v ?? "bottom",
      wrapText: Boolean(estilo.ajustar)
    },
    border: {
      ...(borde.t ? { top: linea } : {}),
      ...(borde.b ? { bottom: linea } : {}),
      ...(borde.l ? { left: linea } : {}),
      ...(borde.r ? { right: linea } : {})
    },
    ...(estilo.formato ? { numFmt: estilo.formato } : {})
  };
}

// Escribe un formulario en la hoja a partir de la fila indicada. Devuelve la fila siguiente libre.
function escribirFormulario(hoja: XLSX.WorkSheet, layout: FormularioLayout, filaInicial: number, merges: XLSX.Range[], alturas: Array<{ hpt: number }>) {
  layout.altos.forEach((alto, i) => {
    alturas[filaInicial + i] = { hpt: alto };
  });

  for (const celda of layout.celdas) {
    const { f1, c1, f2, c2, valor, estilo } = celda;
    for (let f = f1; f <= f2; f += 1) {
      for (let c = c1; c <= c2; c += 1) {
        const direccion = `${colLetra(c)}${filaInicial + f + 1}`;
        const esOrigen = f === f1 && c === c1;
        const borde = {
          l: Boolean(estilo.bordes?.l) && c === c1,
          r: Boolean(estilo.bordes?.r) && c === c2,
          t: Boolean(estilo.bordes?.t) && f === f1,
          b: Boolean(estilo.bordes?.b) && f === f2
        };
        const contenido = esOrigen ? valor : undefined;
        hoja[direccion] = {
          t: typeof contenido === "number" ? "n" : "s",
          v: contenido ?? "",
          s: estiloExcel(estilo, borde)
        } as XLSX.CellObject;
      }
    }
    if (f1 !== f2 || c1 !== c2) {
      merges.push({ s: { r: filaInicial + f1, c: c1 }, e: { r: filaInicial + f2, c: c2 } });
    }
  }
  return filaInicial + layout.altos.length;
}

export function crearLibroSolicitudes(solicitudes: SolicitudPago[]): XLSX.WorkBook {
  const hoja: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  const alturas: Array<{ hpt: number }> = [];
  let fila = 0;
  const layouts = solicitudes.map((solicitud) => construirFormulario(solicitud));
  layouts.forEach((layout, i) => {
    fila = escribirFormulario(hoja, layout, fila, merges, alturas);
    // Varias solicitudes en la misma hoja: se separan como en el archivo original
    if (i < layouts.length - 1) {
      for (let k = 0; k < 3; k += 1) alturas[fila + k] = { hpt: 14.4 };
      fila += 3;
    }
  });

  const columnas = layouts[0]?.anchos ?? [];
  hoja["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(fila - 1, 0), c: Math.max(columnas.length - 1, 0) } });
  hoja["!merges"] = merges;
  hoja["!cols"] = columnas.map((wch) => ({ wch }));
  hoja["!rows"] = alturas;
  hoja["!margins"] = { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 };

  const libro = XLSX.utils.book_new();
  const titulo =
    solicitudes.length === 1 ? `Solicitud ${solicitudes[0]!.numero}` : `Solicitudes ${solicitudes.length}`;
  XLSX.utils.book_append_sheet(libro, hoja, titulo.slice(0, 31));
  return libro;
}

export function exportarSolicitudesExcel(solicitudes: SolicitudPago[], archivo?: string) {
  if (solicitudes.length === 0) return;
  const libro = crearLibroSolicitudes(solicitudes);
  const mes = solicitudes[0]!;
  const nombre =
    archivo ??
    (solicitudes.length === 1
      ? nombreArchivo(mes, "xlsx")
      : `Solicitudes-de-pago-${mes.anio}-${String(mes.mes).padStart(2, "0")}.xlsx`);
  XLSX.writeFile(libro, nombre);
}

// ── PDF ──────────────────────────────────────────────────────────────────────

const MARGEN_X = 50.4;
const MARGEN_Y = 54;
const PAGINA = { ancho: 612, alto: 792 }; // Carta

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

// ¿Está instalada una fuente en este equipo? (se compara el ancho contra dos fuentes de respaldo)
function fuenteInstalada(nombre: string): boolean {
  if (typeof document === "undefined") return false;
  const contexto = document.createElement("canvas").getContext("2d");
  if (!contexto) return false;
  const muestra = "mmmmmmmmmmlli";
  const ancho = (familia: string) => {
    contexto.font = `32px ${familia}`;
    return contexto.measureText(muestra).width;
  };
  return ["monospace", "serif"].some((respaldo) => ancho(`"${nombre}", ${respaldo}`) !== ancho(respaldo));
}

// El logo es texto con una letra condensada (Bahnschrift Condensed). Se dibuja como imagen para que
// el PDF se vea igual aunque el equipo no tenga esa letra: si falta, se condensa otra.
function crearLogo(anchoPt: number, altoPt: number, altos: number[]): string | null {
  if (typeof document === "undefined") return null;
  const escala = 3;
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(anchoPt * escala);
  lienzo.height = Math.round(altoPt * escala);
  const ctx = lienzo.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "alphabetic";

  const condensada = fuenteInstalada("Bahnschrift Condensed");
  const familia = condensada ? '"Bahnschrift Condensed"' : '"Arial Narrow", "Roboto Condensed", Arial, sans-serif';
  const compresion = condensada ? 1 : 0.7;

  const texto = (contenido: string, x: number, y: number, tamano: number) => {
    ctx.save();
    ctx.scale(escala * compresion, escala);
    ctx.font = `bold ${tamano}px ${familia}`;
    ctx.fillText(contenido, x / compresion, y);
    const ancho = ctx.measureText(contenido).width * compresion;
    ctx.restore();
    return ancho;
  };

  const [a0, a1] = altos;
  texto("Empresa Minera", 3, (a0 ?? 22) * 0.78, 18);
  const baseMarte = (a0 ?? 22) + (a1 ?? 35) - 5;
  const anchoMarte = texto("MARTE", 3, baseMarte, 28);
  const anchoSrl = texto(" S.R.L.", 3 + anchoMarte, baseMarte, 10);
  // Doble subrayado bajo "MARTE S.R.L."
  ctx.lineWidth = escala * 0.8;
  for (const desplazo of [2, 4]) {
    ctx.beginPath();
    ctx.moveTo(3 * escala, (baseMarte + desplazo) * escala);
    ctx.lineTo((3 + anchoMarte + anchoSrl) * escala, (baseMarte + desplazo) * escala);
    ctx.stroke();
  }
  texto("NIT: 151558022", 3, (a0 ?? 22) + (a1 ?? 35) + 12.5, 13);
  return lienzo.toDataURL("image/png");
}

function dibujarFormularioPdf(doc: jsPDF, layout: FormularioLayout) {
  const xs = [0];
  layout.anchos.forEach((ancho) => xs.push(xs[xs.length - 1]! + anchoEnPuntos(ancho)));
  const anchoTotal = xs[xs.length - 1]!;

  // Alto de cada fila: el del diseño, o más si el texto no cabe con la letra del PDF
  const altos = [...layout.altos];
  const tamanoPdf = (e: EstiloCelda) => (e.tamano ?? 11) * 0.93;
  for (const celda of layout.celdas) {
    if (!celda.estilo.ajustar || celda.f1 !== celda.f2 || !celda.valor) continue;
    doc.setFont("helvetica", celda.estilo.negrita ? "bold" : "normal");
    doc.setFontSize(tamanoPdf(celda.estilo));
    const lineas = doc.splitTextToSize(String(celda.valor), xs[celda.c2 + 1]! - xs[celda.c1]! - 6) as string[];
    const necesario = lineas.length * tamanoPdf(celda.estilo) * 1.18 + 5;
    altos[celda.f1] = Math.max(altos[celda.f1]!, necesario);
  }
  const ys = [0];
  altos.forEach((alto) => ys.push(ys[ys.length - 1]! + alto));
  const altoTotal = ys[ys.length - 1]!;

  // Si no cabe en una hoja Carta, se reduce todo en proporción
  const escala = Math.min(1, (PAGINA.ancho - 2 * MARGEN_X) / anchoTotal, (PAGINA.alto - 2 * MARGEN_Y) / altoTotal);
  const ox = MARGEN_X;
  const oy = MARGEN_Y;
  const X = (c: number) => ox + xs[c]! * escala;
  const Y = (f: number) => oy + ys[f]! * escala;

  const rect = (celda: CeldaFormulario) => ({
    x: X(celda.c1),
    y: Y(celda.f1),
    w: (xs[celda.c2 + 1]! - xs[celda.c1]!) * escala,
    h: (ys[celda.f2 + 1]! - ys[celda.f1]!) * escala
  });

  // 1) Rellenos
  for (const celda of layout.celdas) {
    if (!celda.estilo.relleno) continue;
    const r = rect(celda);
    doc.setFillColor(...rgb(celda.estilo.relleno));
    doc.rect(r.x, r.y, r.w, r.h, "F");
  }

  // 2) Logo (imagen)
  const logo = crearLogo(xs[4]!, ys[3]!, layout.altos);
  if (logo) doc.addImage(logo, "PNG", X(0), Y(0), xs[4]! * escala, ys[3]! * escala);

  // 3) Textos
  for (const celda of layout.celdas) {
    if (celda.valor === undefined || celda.valor === "") continue;
    if (celda.logo && logo) continue;
    const { estilo } = celda;
    const r = rect(celda);
    const tamano = tamanoPdf(estilo) * escala;
    const familia = estilo.fuente === "Angsana New" ? "times" : "helvetica";
    doc.setFont(familia, estilo.negrita ? "bold" : "normal");
    doc.setTextColor(...rgb(estilo.color ?? "000000"));

    let texto: string;
    if (typeof celda.valor === "number") {
      texto = estilo.formato === "General" ? String(Number(celda.valor.toFixed(2))) : celda.valor.toFixed(2);
    } else {
      texto = celda.valor;
    }

    let fontSize = tamano;
    doc.setFontSize(fontSize);
    let lineas: string[];
    if (estilo.ajustar) {
      lineas = doc.splitTextToSize(texto, r.w - 6 * escala) as string[];
    } else {
      // Texto de una línea: si es más ancho que la celda, se achica un poco
      const ancho = doc.getTextWidth(texto);
      const disponible = r.w - 6 * escala;
      if (ancho > disponible) {
        fontSize = Math.max(tamano * (disponible / ancho), tamano * 0.6);
        doc.setFontSize(fontSize);
      }
      lineas = [texto];
    }

    // Texto con partes (negrita + normal) en una sola línea
    if (celda.partes && !estilo.ajustar) {
      let x = r.x + 3 * escala;
      const yLinea = r.y + (r.h - fontSize * 1.18) / 2 + fontSize * 0.85;
      for (const parte of celda.partes) {
        doc.setFont(familia, parte.negrita ? "bold" : "normal");
        doc.setFontSize(fontSize);
        doc.text(parte.texto, x, yLinea);
        x += doc.getTextWidth(parte.texto);
      }
      continue;
    }

    const alturaLinea = fontSize * 1.18;
    const alturaBloque = alturaLinea * lineas.length;
    let yBase: number;
    if (estilo.v === "top") yBase = r.y + 2 * escala + fontSize * 0.85;
    else if (estilo.v === "bottom") yBase = r.y + r.h - alturaBloque + fontSize * 0.85 - 2 * escala;
    else yBase = r.y + (r.h - alturaBloque) / 2 + fontSize * 0.85;

    lineas.forEach((linea, i) => {
      const y = yBase + i * alturaLinea;
      if (estilo.h === "center") doc.text(linea, r.x + r.w / 2, y, { align: "center" });
      else if (estilo.h === "right") doc.text(linea, r.x + r.w - 3 * escala, y, { align: "right" });
      else doc.text(linea, r.x + 3 * escala, y);
    });
  }

  // 4) Bordes
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6 * escala);
  for (const celda of layout.celdas) {
    const b = celda.estilo.bordes;
    if (!b) continue;
    const r = rect(celda);
    if (b.t) doc.line(r.x, r.y, r.x + r.w, r.y);
    if (b.b) doc.line(r.x, r.y + r.h, r.x + r.w, r.y + r.h);
    if (b.l) doc.line(r.x, r.y, r.x, r.y + r.h);
    if (b.r) doc.line(r.x + r.w, r.y, r.x + r.w, r.y + r.h);
  }
}

export function crearPdfSolicitudes(solicitudes: SolicitudPago[]): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  solicitudes.forEach((solicitud, indice) => {
    if (indice > 0) doc.addPage();
    dibujarFormularioPdf(doc, construirFormulario(solicitud));
  });
  return doc;
}

export function exportarSolicitudesPdf(solicitudes: SolicitudPago[], archivo?: string) {
  if (solicitudes.length === 0) return;
  const doc = crearPdfSolicitudes(solicitudes);
  const primera = solicitudes[0]!;
  doc.save(
    archivo ??
      (solicitudes.length === 1
        ? nombreArchivo(primera, "pdf")
        : `Solicitudes-de-pago-${primera.anio}-${String(primera.mes).padStart(2, "0")}.pdf`)
  );
}
