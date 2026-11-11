import { z } from "zod";

const numero = z.coerce.number();

export const estadoSolicitudSchema = z.enum(["BORRADOR", "SOLICITADA", "PAGADA", "ANULADA"]);
export const estadoEntregaSchema = z.enum(["PENDIENTE", "EN_EJECUCION", "COMPLETADO"]);
export const tipoFirmaSchema = z.enum(["ELABORADO", "REVISADO", "VISTO_BUENO", "ADMINISTRADOR"]);
export const tipoDocumentoSolicitudSchema = z.enum(["FACTURA", "RECIBO", "SIN_DOCUMENTO"]);

export const itemSolicitudSchema = z.object({
  id: z.string(),
  orden: numero,
  referencia: z.string().nullable().optional(),
  descripcion: z.string(),
  cantidad: numero,
  precioUnit: numero,
  descuento: numero,
  total: numero
});

export const firmaSolicitudSchema = z.object({
  id: z.string(),
  tipo: tipoFirmaSchema,
  nombre: z.string(),
  cargo: z.string().nullable().optional(),
  usuarioId: z.number().nullable().optional(),
  usuarioNombre: z.string().nullable().optional(),
  firmadoAt: z.string().nullable().optional()
});

export const solicitudPagoSchema = z.object({
  id: z.string(),
  empresa: z.string(),
  anio: numero,
  mes: numero,
  numero,
  fecha: z.string(),
  solicitadoPor: z.string().default(""),
  cotizacion: z.string().nullable().optional(),
  informeUso: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
  total: numero,
  proveedorId: z.number().nullable().optional(),
  compraId: z.string().nullable().optional(),
  beneficiarioNombre: z.string(),
  beneficiarioNit: z.string().nullable().optional(),
  banco: z.string().nullable().optional(),
  cuenta: z.string().nullable().optional(),
  estado: estadoSolicitudSchema,
  fechaPago: z.string().nullable().optional(),
  referenciaPago: z.string().nullable().optional(),
  pagadoAt: z.string().nullable().optional(),
  tipoDocumento: tipoDocumentoSolicitudSchema.nullable().optional(),
  numeroFactura: z.string().nullable().optional(),
  estadoEntrega: estadoEntregaSchema,
  notaEntrega: z.string().nullable().optional(),
  motivoAnulacion: z.string().nullable().optional(),
  anuladoAt: z.string().nullable().optional(),
  createdAt: z.string(),
  proveedor: z.object({ id: z.number(), nombre: z.string() }).nullable().optional(),
  compra: z
    .object({
      id: z.string(),
      estado: z.string(),
      tipoDocumento: z.string().nullable().optional(),
      numeroFactura: z.string().nullable().optional(),
      proveedor: z.object({ nombre: z.string() }).nullable().optional()
    })
    .nullable()
    .optional(),
  items: z.array(itemSolicitudSchema),
  firmas: z.array(firmaSolicitudSchema)
});

export const solicitudResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: solicitudPagoSchema
});

export const solicitudesListResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(solicitudPagoSchema),
  meta: z
    .object({
      page: numero.optional(),
      limit: numero.optional(),
      total: numero,
      totalPages: numero.optional()
    })
    .optional()
});

const conteoEstados = z.object({
  BORRADOR: numero,
  SOLICITADA: numero,
  PAGADA: numero,
  ANULADA: numero
});

export const resumenResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    total: numero,
    estados: conteoEstados,
    montos: conteoEstados,
    pagadasSinDocumento: numero,
    pagadasPorEntregar: numero
  })
});

export const defaultsResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.object({
    siguienteNumero: numero,
    solicitadoPor: z.string(),
    firmas: z.record(z.string(), z.object({ nombre: z.string(), cargo: z.string().nullable() }))
  })
});

export const beneficiarioSchema = z.object({
  nombre: z.string(),
  nit: z.string().nullable(),
  banco: z.string().nullable(),
  cuenta: z.string().nullable(),
  proveedorId: z.number().nullable(),
  origen: z.enum(["solicitud", "proveedor"])
});

export const beneficiariosResponseSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(beneficiarioSchema)
});

// ── Lo que se envía ──────────────────────────────────────────────────────────

export const itemPayloadSchema = z.object({
  referencia: z.string().optional().nullable(),
  descripcion: z.string().trim().min(1, "Cada ítem necesita su descripción"),
  cantidad: z.number().positive("La cantidad debe ser mayor a cero"),
  precioUnit: z.number().min(0, "El precio no puede ser negativo"),
  descuento: z.number().min(0)
});

const firmaTextoPayload = z.object({ nombre: z.string(), cargo: z.string().nullable().optional() });

export const solicitudPayloadSchema = z.object({
  fecha: z.string().min(8, "Elige la fecha"),
  numero: z.number().int().positive().optional(),
  solicitadoPor: z.string(),
  cotizacion: z.string().nullable().optional(),
  informeUso: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
  proveedorId: z.number().int().positive().nullable().optional(),
  compraId: z.string().nullable().optional(),
  beneficiarioNombre: z.string().trim().min(1, "El beneficiario es obligatorio"),
  beneficiarioNit: z.string().nullable().optional(),
  banco: z.string().nullable().optional(),
  cuenta: z.string().nullable().optional(),
  items: z.array(itemPayloadSchema).min(1, "Agrega al menos un ítem"),
  firmas: z
    .object({
      ELABORADO: firmaTextoPayload.optional(),
      REVISADO: firmaTextoPayload.optional(),
      VISTO_BUENO: firmaTextoPayload.optional(),
      ADMINISTRADOR: firmaTextoPayload.optional()
    })
    .optional()
});

export const facturaPayloadSchema = z.object({
  tipoDocumento: tipoDocumentoSolicitudSchema.nullable(),
  numeroFactura: z.string().nullable().optional()
});

export const entregaPayloadSchema = z.object({
  estadoEntrega: estadoEntregaSchema,
  notaEntrega: z.string().nullable().optional()
});

export const pagarPayloadSchema = z.object({
  fechaPago: z.string().min(8, "Elige la fecha del pago"),
  referenciaPago: z.string().nullable().optional()
});

export const anularPayloadSchema = z.object({
  motivo: z.string().trim().min(3, "Escribe el motivo de la anulación")
});

export const solicitudesQuerySchema = z.object({
  anio: z.number().int().optional(),
  mes: z.number().int().optional(),
  estado: estadoSolicitudSchema.optional(),
  factura: z.enum(["PENDIENTE", "FACTURA", "RECIBO", "SIN_DOCUMENTO"]).optional(),
  entrega: estadoEntregaSchema.optional(),
  busqueda: z.string().optional(),
  sinPaginar: z.boolean().optional()
});

export type SolicitudPago = z.infer<typeof solicitudPagoSchema>;
export type ItemSolicitud = z.infer<typeof itemSolicitudSchema>;
export type FirmaSolicitud = z.infer<typeof firmaSolicitudSchema>;
export type TipoFirma = z.infer<typeof tipoFirmaSchema>;
export type EstadoSolicitud = z.infer<typeof estadoSolicitudSchema>;
export type EstadoEntrega = z.infer<typeof estadoEntregaSchema>;
export type TipoDocumentoSolicitud = z.infer<typeof tipoDocumentoSolicitudSchema>;
export type SolicitudPayload = z.infer<typeof solicitudPayloadSchema>;
export type FacturaPayload = z.infer<typeof facturaPayloadSchema>;
export type EntregaPayload = z.infer<typeof entregaPayloadSchema>;
export type PagarPayload = z.infer<typeof pagarPayloadSchema>;
export type ResumenSolicitudes = z.infer<typeof resumenResponseSchema>["data"];
export type DefaultsSolicitud = z.infer<typeof defaultsResponseSchema>["data"];
export type Beneficiario = z.infer<typeof beneficiarioSchema>;
export type SolicitudesQuery = z.infer<typeof solicitudesQuerySchema>;
