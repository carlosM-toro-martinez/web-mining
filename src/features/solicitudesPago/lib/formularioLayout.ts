import { montoEnLetras } from "@/features/solicitudesPago/lib/montoEnLetras";
import { fechaLarga, firmaDe, ROTULO_FIRMA } from "@/features/solicitudesPago/lib/etiquetas";
import type { SolicitudPago, TipoFirma } from "@/features/solicitudesPago/model/solicitudesPago.schema";

// Réplica del formulario "SOLICITUD DE PAGO" de MARTE S.R.L. (colores y medidas tomados del
// Excel original). Se describe una sola vez como una grilla de celdas y la usan tanto el
// Excel como el PDF, así los dos salen iguales.

export const COLORES = {
  gris: "D9D9D9", // caja del número
  azulFecha: "71AAE0", // barra de la fecha
  azulFechaTexto: "002060",
  dorado: "FFC000", // encabezado de la tabla de ítems
  azulInforme: "A6CAEC", // encabezado de Informe de uso / Observaciones
  negro: "000000",
  blanco: "FFFFFF"
} as const;

export interface EstiloCelda {
  fuente?: string;
  tamano?: number;
  negrita?: boolean;
  cursiva?: boolean;
  subrayado?: boolean;
  color?: string;
  relleno?: string;
  h?: "left" | "center" | "right";
  v?: "top" | "center" | "bottom";
  ajustar?: boolean;
  bordes?: { l?: boolean; r?: boolean; t?: boolean; b?: boolean };
  formato?: string;
}

export interface CeldaFormulario {
  f1: number;
  c1: number;
  f2: number;
  c2: number;
  valor?: string | number;
  estilo: EstiloCelda;
  // Texto con partes de distinto peso (se dibuja así en el PDF; en Excel va como un solo texto)
  partes?: Array<{ texto: string; negrita?: boolean }>;
  // Parte del logo: en el PDF se dibuja como una sola imagen en lugar de celdas
  logo?: boolean;
}

export interface FormularioLayout {
  // Ancho de cada columna en "caracteres de Excel"
  anchos: number[];
  // Alto de cada fila en puntos
  altos: number[];
  celdas: CeldaFormulario[];
}

// Columnas A..I del formulario original
export const ANCHOS_COLUMNAS = [5.9, 5.1, 10.5, 10.4, 17.6, 14, 10.5, 9.8, 11.2];

// Excel convierte caracteres a píxeles (×7 + 5) y 1 px = 0,75 pt
export const anchoEnPuntos = (caracteres: number) => (caracteres * 7 + 5) * 0.75;

const BORDE_TODO = { l: true, r: true, t: true, b: true } as const;
const FUENTE = "Aptos Narrow";

function anchoUnidades(c1: number, c2: number) {
  let suma = 0;
  for (let c = c1; c <= c2; c += 1) suma += ANCHOS_COLUMNAS[c] ?? 10;
  return suma;
}

// Alto estimado de un texto que se parte en varias líneas dentro de un ancho dado (en caracteres de Excel)
function altoTexto(texto: string, anchoCaracteres: number, tamano: number, minimo: number) {
  // Caracteres por línea: unas 0,92 por unidad de ancho a 9 pt (mayúsculas), y menos con letra más grande
  const porLinea = Math.max(Math.floor(anchoCaracteres * (0.92 - (tamano - 9) * 0.05)), 6);
  const lineas = texto
    .split("\n")
    .reduce((suma, parrafo) => suma + Math.max(Math.ceil(parrafo.length / porLinea), 1), 0);
  return Math.max(minimo, lineas * tamano * 1.32 + 7);
}

export interface OpcionesFormulario {
  // Texto fijo del encabezado: a quién se dirige la solicitud
  destinatario?: string[];
  copias?: string[];
}

export function construirFormulario(solicitud: SolicitudPago, opciones: OpcionesFormulario = {}): FormularioLayout {
  const destinatario = opciones.destinatario ?? ["Lic. Luis M.Mercado R.", "Presidente Ejecutivo", "LA PAZ - BOLIVIA"];
  const copias = opciones.copias ?? ["c.c. Presidente Ejecutivo", "c.c. Lic.Wilder Luna", "c.c. Arch."];

  const celdas: CeldaFormulario[] = [];
  const altos: number[] = [];
  const fila = (alto: number) => {
    altos.push(alto);
    return altos.length - 1;
  };
  const celda = (
    f1: number,
    c1: number,
    f2: number,
    c2: number,
    estilo: EstiloCelda,
    valor?: string | number,
    logo = false,
    partes?: CeldaFormulario["partes"]
  ) => {
    celdas.push({ f1, c1, f2, c2, valor, estilo, ...(logo ? { logo: true } : {}), ...(partes ? { partes } : {}) });
  };

  const hayDescuento = solicitud.items.some((item) => item.descuento > 0);
  const sinFactura = solicitud.tipoDocumento === "SIN_DOCUMENTO";

  // ── Encabezado: logo, número y fecha ────────────────────────────────────────
  const f0 = fila(22.2);
  const f1 = fila(34.8);
  const f2 = fila(16.8);
  celda(f0, 0, f0, 3, { fuente: "Bahnschrift Condensed", tamano: 18, negrita: true, h: "left", v: "center" }, "Empresa Minera", true);
  celda(f1, 0, f1, 1, { fuente: "Bahnschrift Condensed", tamano: 28, negrita: true, subrayado: true, h: "left", v: "bottom" }, "MARTE", true);
  celda(f1, 2, f1, 3, { fuente: "Bahnschrift Condensed", tamano: 10, negrita: true, subrayado: true, h: "left", v: "bottom" }, "S.R.L.", true);
  celda(f2, 0, f2, 3, { fuente: "Bahnschrift Condensed", tamano: 13, negrita: true, h: "left", v: "center" }, "NIT: 151558022", true);
  celda(f0, 8, f1, 8, { fuente: FUENTE, tamano: 14, negrita: true, relleno: COLORES.gris, h: "center", v: "center", bordes: { b: true } }, `Nº ${solicitud.numero}`);
  celda(f2, 5, f2, 6, { fuente: FUENTE, tamano: 11, negrita: true, color: COLORES.azulFechaTexto, relleno: COLORES.azulFecha, h: "left", v: "center" }, "FECHA:");
  celda(f2, 7, f2, 8, { fuente: FUENTE, tamano: 12, negrita: true, color: COLORES.azulFechaTexto, relleno: COLORES.azulFecha, h: "center", v: "center" }, fechaLarga(solicitud.fecha));
  fila(14.4);

  // ── Destinatario y título ───────────────────────────────────────────────────
  for (const linea of destinatario) {
    const f = fila(15.6);
    celda(f, 0, f, 5, { fuente: "Aptos Display", tamano: 11, negrita: true, h: "left", v: "center" }, linea);
  }
  fila(8);
  const fTitulo = fila(23.4);
  celda(fTitulo, 1, fTitulo, 7, { fuente: FUENTE, tamano: 18, negrita: true, h: "center", v: "center" }, "SOLICITUD DE PAGO");
  const fSolicitante = fila(15);
  celda(
    fSolicitante,
    0,
    fSolicitante,
    8,
    { fuente: FUENTE, tamano: 11, h: "left", v: "center" },
    `SOLICITADO POR: ${solicitud.solicitadoPor}`,
    false,
    [{ texto: "SOLICITADO POR:", negrita: true }, { texto: ` ${solicitud.solicitadoPor}` }]
  );
  if (solicitud.cotizacion) {
    const fCot = fila(15);
    celda(fCot, 3, fCot, 4, { fuente: FUENTE, tamano: 11, negrita: true, h: "center", v: "center", bordes: BORDE_TODO }, solicitud.cotizacion);
  }

  // ── Tabla de ítems ──────────────────────────────────────────────────────────
  // Con descuento: ITEM | DESCRIPCION | CANT. | PRECIO U | DESCUENTO | TOTAL
  // Sin descuento: ITEM | DESCRIPCION | CANT. | PRECIO U | TOTAL
  const colDescHasta = hayDescuento ? 4 : 5;
  const colCant = hayDescuento ? 5 : 6;
  const colPrecio = hayDescuento ? 6 : 7;
  const colDescuento = 7;
  const encabezado = { fuente: FUENTE, tamano: 9, relleno: COLORES.dorado, h: "center" as const, v: "center" as const, bordes: BORDE_TODO };
  const fEnc = fila(14.4);
  celda(fEnc, 1, fEnc, 1, { ...encabezado, negrita: true, tamano: 11, h: "left" }, "ITEM");
  celda(fEnc, 2, fEnc, colDescHasta, encabezado, "DESCRIPCION");
  celda(fEnc, colCant, fEnc, colCant, encabezado, "Cantidad");
  celda(fEnc, colPrecio, fEnc, colPrecio, encabezado, "Precio U (Bs)");
  if (hayDescuento) celda(fEnc, colDescuento, fEnc, colDescuento, encabezado, "Descuento (Bs)");
  celda(fEnc, 8, fEnc, 8, encabezado, "Total Bs");

  const anchoDescripcion = anchoUnidades(2, colDescHasta);
  solicitud.items.forEach((item, indice) => {
    const f = fila(altoTexto(item.descripcion, anchoDescripcion, 9, 25));
    const base = { fuente: FUENTE, tamano: 10, h: "center" as const, v: "center" as const, bordes: BORDE_TODO, formato: "0.00" };
    celda(f, 1, f, 1, { ...base, tamano: 11, negrita: true, formato: "@" }, item.referencia || String(indice + 1));
    celda(f, 2, f, colDescHasta, { ...base, tamano: 9, ajustar: true, formato: undefined }, item.descripcion);
    celda(f, colCant, f, colCant, { ...base, formato: "General" }, item.cantidad);
    celda(f, colPrecio, f, colPrecio, base, item.precioUnit);
    if (hayDescuento) celda(f, colDescuento, f, colDescuento, base, item.descuento);
    celda(f, 8, f, 8, base, item.total);
  });

  if (sinFactura) {
    const f = fila(24);
    celda(f, 1, f, 7, { fuente: FUENTE, tamano: 16, negrita: true, h: "center", v: "center", bordes: BORDE_TODO }, "NO FACTURA");
    celda(f, 8, f, 8, { fuente: FUENTE, tamano: 10, bordes: BORDE_TODO }, "");
  }

  const fTotal = fila(18);
  celda(fTotal, 1, fTotal, 7, { fuente: FUENTE, tamano: 10, negrita: true, h: "right", v: "center" }, "TOTAL NETO Bs    ");
  celda(fTotal, 8, fTotal, 8, { fuente: FUENTE, tamano: 14, negrita: true, h: "center", v: "center", bordes: BORDE_TODO, formato: "0.00" }, solicitud.total);

  fila(8);
  const fSon = fila(16);
  celda(fSon, 1, fSon, 7, { fuente: FUENTE, tamano: 11, h: "left", v: "center" }, montoEnLetras(solicitud.total));
  fila(10);

  // ── Informe de uso y observaciones ──────────────────────────────────────────
  const encInforme = { fuente: FUENTE, tamano: 9, negrita: true, relleno: COLORES.azulInforme, h: "center" as const, v: "center" as const, bordes: BORDE_TODO };
  const fInf = fila(14.4);
  celda(fInf, 1, fInf, 6, encInforme, "INFORME DE USO");
  celda(fInf, 7, fInf, 8, encInforme, "OBSERVACIONES");
  const informe = solicitud.informeUso ?? "";
  const observaciones = solicitud.observaciones ?? "";
  const fInfCont = fila(Math.max(altoTexto(informe, anchoUnidades(1, 6), 11, 22), altoTexto(observaciones, anchoUnidades(7, 8), 11, 22)));
  celda(fInfCont, 1, fInfCont, 6, { fuente: FUENTE, tamano: 11, h: "left", v: "top", ajustar: true, bordes: BORDE_TODO }, informe);
  celda(fInfCont, 7, fInfCont, 8, { fuente: FUENTE, tamano: 11, h: "center", v: "center", ajustar: true, bordes: BORDE_TODO }, observaciones);
  fila(8);

  // ── Forma de pago ───────────────────────────────────────────────────────────
  const fFormaPago = fila(15.6);
  celda(fFormaPago, 0, fFormaPago, 8, { fuente: FUENTE, tamano: 11, h: "left", v: "center" }, "FORMA DE PAGO: Transferencia o Deposito Bancario");
  const datosPago: Array<[string, string, number, number]> = [
    ["NOMBRE:", solicitud.beneficiarioNombre, 18, 12],
    ["NIT o C.I.", solicitud.beneficiarioNit ?? "", 15.6, 12],
    ["BANCO", solicitud.banco ?? "", 18, 12],
    ["CUENTA BS.", solicitud.cuenta ?? "", 18, 14]
  ];
  for (const [rotulo, valor, alto, tamano] of datosPago) {
    const f = fila(alto);
    celda(f, 1, f, 2, { fuente: FUENTE, tamano: 11, negrita: true, h: "left", v: "center", bordes: BORDE_TODO }, rotulo);
    celda(f, 3, f, 8, { fuente: FUENTE, tamano, h: "center", v: "center", bordes: BORDE_TODO }, valor);
  }

  // ── Firmas ──────────────────────────────────────────────────────────────────
  fila(30);
  const nombreDe = (tipo: TipoFirma) => firmaDe(solicitud, tipo)?.nombre ?? "";
  const cargoDe = (tipo: TipoFirma) => firmaDe(solicitud, tipo)?.cargo ?? "";
  const rotuloDe = (tipo: TipoFirma) => {
    const cargo = cargoDe(tipo);
    if (tipo === "VISTO_BUENO") return `${ROTULO_FIRMA[tipo]}  ${cargo}`.trim();
    if (tipo === "ADMINISTRADOR") return cargo || ROTULO_FIRMA[tipo];
    return cargo ? `${ROTULO_FIRMA[tipo]} ${cargo}` : ROTULO_FIRMA[tipo];
  };
  const fNombres = fila(16);
  const fRotulos = fila(14);
  const zonas: Array<[TipoFirma, number, number]> = [
    ["ELABORADO", 2, 4],
    ["REVISADO", 5, 6],
    ["VISTO_BUENO", 7, 8]
  ];
  for (const [tipo, c1, c2] of zonas) {
    celda(fNombres, c1, fNombres, c2, { fuente: FUENTE, tamano: 11, h: "center", v: "center" }, nombreDe(tipo));
    celda(fRotulos, c1, fRotulos, c2, { fuente: FUENTE, tamano: 10, h: "center", v: "top" }, rotuloDe(tipo));
  }
  fila(24);
  const fAdmin = fila(16);
  const fAdminRotulo = fila(14);
  celda(fAdmin, 4, fAdmin, 6, { fuente: FUENTE, tamano: 11, h: "center", v: "center" }, nombreDe("ADMINISTRADOR"));
  celda(fAdminRotulo, 4, fAdminRotulo, 6, { fuente: FUENTE, tamano: 10, h: "center", v: "top" }, rotuloDe("ADMINISTRADOR"));

  // ── Pie ─────────────────────────────────────────────────────────────────────
  fila(20);
  const fCorreo = fila(14);
  celda(fCorreo, 0, fCorreo, 3, { fuente: "Angsana New", tamano: 9, negrita: true, h: "left", v: "center" }, "CORREO ELECTRONICO");
  for (const copia of copias) {
    const f = fila(13);
    celda(f, 0, f, 3, { fuente: FUENTE, tamano: 8, h: "left", v: "center" }, copia);
  }

  return { anchos: ANCHOS_COLUMNAS, altos, celdas };
}
