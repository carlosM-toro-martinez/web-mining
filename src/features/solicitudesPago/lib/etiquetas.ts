import type {
  EstadoEntrega,
  EstadoSolicitud,
  FirmaSolicitud,
  SolicitudPago,
  TipoDocumentoSolicitud,
  TipoFirma
} from "@/features/solicitudesPago/model/solicitudesPago.schema";

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre",
  "diciembre"
];

export const TIPOS_FIRMA: TipoFirma[] = ["ELABORADO", "REVISADO", "VISTO_BUENO", "ADMINISTRADOR"];

export const ETIQUETA_FIRMA: Record<TipoFirma, string> = {
  ELABORADO: "Elaboró",
  REVISADO: "Revisó",
  VISTO_BUENO: "VºBº",
  ADMINISTRADOR: "Administración"
};

// Texto que se imprime bajo el nombre de cada firma en el formulario
export const ROTULO_FIRMA: Record<TipoFirma, string> = {
  ELABORADO: "Elaborado por:",
  REVISADO: "Revisado por:",
  VISTO_BUENO: "V°B°",
  ADMINISTRADOR: "Administrador"
};

// Para el tablero: lo que se pide a los usuarios en palabras del cliente
export const ESTADO_PAGO: Record<EstadoSolicitud, { etiqueta: string; detalle: string; planilla: string }> = {
  BORRADOR: { etiqueta: "Por pedir", detalle: "Se está armando o falta alguna firma.", planilla: "POR PEDIR" },
  SOLICITADA: { etiqueta: "Pedida · falta pago", detalle: "Tiene todas las firmas; falta confirmar el pago.", planilla: "FALTA CONFIRMAR PAGO" },
  PAGADA: { etiqueta: "Pagada", detalle: "El pago ya se realizó.", planilla: "PAGO REALIZADO" },
  ANULADA: { etiqueta: "Anulada", detalle: "La solicitud se anuló.", planilla: "ANULADA" }
};

export const ESTADO_ENTREGA: Record<EstadoEntrega, string> = {
  PENDIENTE: "Por entregar",
  EN_EJECUCION: "En ejecución",
  COMPLETADO: "Recibido / ejecutado"
};

export const ETIQUETA_DOCUMENTO: Record<TipoDocumentoSolicitud, string> = {
  FACTURA: "Factura",
  RECIBO: "Recibo",
  SIN_DOCUMENTO: "Sin documento"
};

export function etiquetaDocumento(solicitud: Pick<SolicitudPago, "tipoDocumento" | "numeroFactura">): string {
  if (!solicitud.tipoDocumento) return "Falta factura";
  const base = ETIQUETA_DOCUMENTO[solicitud.tipoDocumento];
  return solicitud.numeroFactura ? `${base} ${solicitud.numeroFactura}` : base;
}

// "ENTREGA" de la planilla: el estado y, si hay, la nota ("INGRESO 12 DE OCTUBRE")
export function textoEntrega(solicitud: Pick<SolicitudPago, "estadoEntrega" | "notaEntrega">): string {
  if (solicitud.notaEntrega) return solicitud.notaEntrega.toUpperCase();
  return solicitud.estadoEntrega === "PENDIENTE" ? "" : ESTADO_ENTREGA[solicitud.estadoEntrega].toUpperCase();
}

// "1 de octubre de 2026" (como se escribe en el formulario)
export function fechaLarga(iso: string): string {
  const fecha = new Date(iso);
  return `${fecha.getUTCDate()} de ${MESES[fecha.getUTCMonth()]} de ${fecha.getUTCFullYear()}`;
}

export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${fecha.getUTCFullYear()}`;
}

export function formatBs(valor: number): string {
  return `Bs ${valor.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function numero2(valor: number): string {
  return valor.toFixed(2);
}

export function firmaDe(solicitud: Pick<SolicitudPago, "firmas">, tipo: TipoFirma): FirmaSolicitud | undefined {
  return solicitud.firmas.find((firma) => firma.tipo === tipo);
}

export function nombreMes(mes: number): string {
  return MESES[mes - 1] ?? "";
}
