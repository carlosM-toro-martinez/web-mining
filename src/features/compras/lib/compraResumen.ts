import type { Compra, CompraItem, TipoDocumentoCompra } from "@/features/compras/model/compras.schema";

// ── Estado de llegada ────────────────────────────────────────────────────────

export type LlegadaTono = "pendiente" | "parcial" | "completo" | "anulado";

export interface LlegadaInfo {
  tono: LlegadaTono;
  etiqueta: string;
  detalle: string;
}

// El estado interno (PENDIENTE, PARCIAL, COMPLETADO, ANULADA) se muestra con
// palabras de almacén: qué llegó, no cómo se llama en la base de datos.
export function llegadaDeEstado(estado: string): LlegadaInfo {
  switch (estado) {
    case "COMPLETADO":
      return { tono: "completo", etiqueta: "Recibido completo", detalle: "Todo lo pedido ya llegó." };
    case "PARCIAL":
      return { tono: "parcial", etiqueta: "Recibido parcial", detalle: "Llegó una parte, falta el resto." };
    case "ANULADA":
      return { tono: "anulado", etiqueta: "Anulado", detalle: "El pedido se anuló." };
    default:
      return { tono: "pendiente", etiqueta: "Por recibir", detalle: "Todavía no llegó nada." };
  }
}

// ── Documento (factura / recibo / sin documento) ────────────────────────────

export type DocumentoTono = "factura" | "recibo" | "sin" | "falta";

export interface DocumentoInfo {
  tono: DocumentoTono;
  etiqueta: string;
  numero: string | null;
}

export const DOCUMENTO_OPCIONES: Array<{ valor: TipoDocumentoCompra; etiqueta: string; ayuda: string }> = [
  { valor: "FACTURA", etiqueta: "Factura", ayuda: "Tiene factura con su número." },
  { valor: "RECIBO", etiqueta: "Recibo", ayuda: "Se respalda con un recibo con su número." },
  { valor: "SIN_DOCUMENTO", etiqueta: "Sin documento", ayuda: "Se confirmó que no hay factura ni recibo." }
];

export function documentoDeCompra(compra: Pick<Compra, "tipoDocumento" | "numeroFactura">): DocumentoInfo {
  const numero = compra.numeroFactura?.trim() || null;
  switch (compra.tipoDocumento) {
    case "FACTURA":
      return { tono: "factura", etiqueta: "Factura", numero };
    case "RECIBO":
      return { tono: "recibo", etiqueta: "Recibo", numero };
    case "SIN_DOCUMENTO":
      return { tono: "sin", etiqueta: "Sin documento", numero: null };
    default:
      return { tono: "falta", etiqueta: "Falta documento", numero: null };
  }
}

// ── Valores y avance ─────────────────────────────────────────────────────────

export function valorItem(item: Pick<CompraItem, "precioUnit">, cantidad: number): number {
  return Number(item.precioUnit) * cantidad;
}

export interface AvanceCompra {
  pedidoBs: number;
  recibidoBs: number;
  pendienteBs: number;
  // Porcentaje recibido sobre el valor pedido (0 a 100)
  porcentaje: number;
  itemsTotal: number;
  itemsCompletos: number;
  itemsParciales: number;
  itemsSinRecibir: number;
}

export function avanceDeCompra(compra: Pick<Compra, "items">): AvanceCompra {
  let pedidoBs = 0;
  let recibidoBs = 0;
  let itemsCompletos = 0;
  let itemsParciales = 0;
  let itemsSinRecibir = 0;

  for (const item of compra.items) {
    pedidoBs += valorItem(item, item.cantidadPedida);
    recibidoBs += valorItem(item, item.cantidadRecibida ?? 0);
    const recibida = item.cantidadRecibida ?? 0;
    if (recibida >= item.cantidadPedida && item.cantidadPedida > 0) itemsCompletos += 1;
    else if (recibida > 0) itemsParciales += 1;
    else itemsSinRecibir += 1;
  }

  return {
    pedidoBs,
    recibidoBs,
    pendienteBs: Math.max(pedidoBs - recibidoBs, 0),
    porcentaje: pedidoBs > 0 ? Math.min((recibidoBs / pedidoBs) * 100, 100) : 0,
    itemsTotal: compra.items.length,
    itemsCompletos,
    itemsParciales,
    itemsSinRecibir
  };
}

export function pendienteDeItem(item: Pick<CompraItem, "cantidadPedida" | "cantidadRecibida">): number {
  return Math.max(item.cantidadPedida - (item.cantidadRecibida ?? 0), 0);
}

// ── Formato ──────────────────────────────────────────────────────────────────

export function formatBs(value: number): string {
  return `Bs ${value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCantidad(value: number): string {
  return value.toLocaleString("es-BO", { maximumFractionDigits: 2 });
}

// Fecha de la compra: la fecha de operación si se cargó con fecha, si no la de registro
export function fechaDeCompra(compra: Pick<Compra, "fechaOperacion" | "createdAt">): string | null {
  return compra.fechaOperacion ?? compra.createdAt ?? null;
}

export function formatFecha(iso: string | null | undefined, conHora = false): string {
  if (!iso) return "-";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "-";
  return conHora
    ? fecha.toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" })
    : fecha.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return Math.max(Math.floor((Date.now() - fecha.getTime()) / 86_400_000), 0);
}

// ── Línea de tiempo ──────────────────────────────────────────────────────────

export interface EventoCompra {
  clave: string;
  fecha: string | null;
  titulo: string;
  detalle?: string;
  tono: "neutro" | "ok" | "aviso" | "error";
}

export function eventosDeCompra(compra: Compra): EventoCompra[] {
  const eventos: EventoCompra[] = [];

  eventos.push({
    clave: "creado",
    fecha: compra.createdAt ?? null,
    titulo: "Pedido registrado",
    detalle: compra.usuarioRegistro?.nombre ? `Por ${compra.usuarioRegistro.nombre}` : undefined,
    tono: "neutro"
  });

  // Las llegadas se agrupan por día y por quien las registró
  const productos = new Map(compra.items.map((item) => [item.productoId, item]));
  const grupos = new Map<string, { fecha: string; usuario: string | null; lineas: string[] }>();
  for (const recepcion of compra.recepciones ?? []) {
    const dia = recepcion.createdAt.slice(0, 10);
    const usuario = recepcion.usuario?.nombre ?? null;
    const clave = `${dia}|${usuario ?? ""}`;
    const grupo = grupos.get(clave) ?? { fecha: recepcion.createdAt, usuario, lineas: [] };
    const item = productos.get(recepcion.productoId);
    const nombre = item?.producto?.nombre ?? `Producto #${recepcion.productoId}`;
    const unidad = item?.producto?.unidad ? ` ${item.producto.unidad}` : "";
    grupo.lineas.push(`${formatCantidad(Number(recepcion.cantidad))}${unidad} de ${nombre}`);
    grupos.set(clave, grupo);
  }
  let numero = 1;
  for (const [clave, grupo] of grupos) {
    eventos.push({
      clave: `llegada-${clave}`,
      fecha: grupo.fecha,
      titulo: `Llegada ${numero}`,
      detalle: `${grupo.lineas.join(" · ")}${grupo.usuario ? ` — recibió ${grupo.usuario}` : ""}`,
      tono: "ok"
    });
    numero += 1;
  }

  if (compra.tipoDocumento && compra.documentoRegistradoAt) {
    const doc = documentoDeCompra(compra);
    eventos.push({
      clave: "documento",
      fecha: compra.documentoRegistradoAt,
      titulo: doc.tono === "sin" ? "Se confirmó que no hay documento" : `${doc.etiqueta} registrada`,
      detalle: doc.numero ? `Nº ${doc.numero}` : undefined,
      tono: "ok"
    });
  }

  const anulacion = compra.anulacion as
    | { createdAt?: string; motivo?: string | null; usuario?: { nombre?: string | null } | null }
    | null
    | undefined;
  if (compra.estado === "ANULADA") {
    eventos.push({
      clave: "anulado",
      fecha: anulacion?.createdAt ?? null,
      titulo: "Pedido anulado",
      detalle: [anulacion?.motivo, anulacion?.usuario?.nombre ? `Por ${anulacion.usuario.nombre}` : null]
        .filter(Boolean)
        .join(" — ") || undefined,
      tono: "error"
    });
  }

  return eventos.sort((a, b) => {
    const left = a.fecha ? new Date(a.fecha).getTime() : 0;
    const right = b.fecha ? new Date(b.fecha).getTime() : 0;
    return left - right;
  });
}
