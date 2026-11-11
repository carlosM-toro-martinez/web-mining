import { deleteRequest, getRequest, patchRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  anularPayloadSchema,
  beneficiariosResponseSchema,
  defaultsResponseSchema,
  entregaPayloadSchema,
  facturaPayloadSchema,
  pagarPayloadSchema,
  resumenResponseSchema,
  solicitudPayloadSchema,
  solicitudResponseSchema,
  solicitudesListResponseSchema,
  solicitudesQuerySchema,
  type EntregaPayload,
  type FacturaPayload,
  type PagarPayload,
  type SolicitudPayload,
  type SolicitudesQuery
} from "@/features/solicitudesPago/model/solicitudesPago.schema";

const endpoints = apiEndpoints.solicitudesPago;

function limpiar(params: SolicitudesQuery) {
  const parsed = solicitudesQuerySchema.parse(params);
  return Object.fromEntries(Object.entries(parsed).filter(([, valor]) => valor !== undefined && valor !== ""));
}

export const getSolicitudes = (params: SolicitudesQuery) =>
  getRequest({ url: endpoints.base, config: { params: limpiar(params) }, schema: solicitudesListResponseSchema });

export const getSolicitud = (id: string) => getRequest({ url: endpoints.byId(id), schema: solicitudResponseSchema });

export const getResumenSolicitudes = (params: Pick<SolicitudesQuery, "anio" | "mes">) =>
  getRequest({ url: endpoints.resumen, config: { params: limpiar(params) }, schema: resumenResponseSchema });

export const getDefaultsSolicitud = (anio: number, mes: number) =>
  getRequest({ url: endpoints.defaults, config: { params: { anio, mes } }, schema: defaultsResponseSchema });

export const getBeneficiarios = (search: string) =>
  getRequest({
    url: endpoints.beneficiarios,
    config: { params: search ? { search } : {} },
    schema: beneficiariosResponseSchema
  });

export const createSolicitud = (payload: SolicitudPayload) =>
  postRequest({ url: endpoints.base, body: solicitudPayloadSchema.parse(payload), schema: solicitudResponseSchema });

export const updateSolicitud = (id: string, payload: SolicitudPayload) => {
  // Al editar no se cambia el número: lo mantiene el servidor
  const { numero: _numero, ...resto } = solicitudPayloadSchema.parse(payload);
  return putRequest({ url: endpoints.byId(id), body: resto, schema: solicitudResponseSchema });
};

export const registrarFactura = (id: string, payload: FacturaPayload) =>
  patchRequest({ url: endpoints.factura(id), body: facturaPayloadSchema.parse(payload), schema: solicitudResponseSchema });

export const registrarEntrega = (id: string, payload: EntregaPayload) =>
  patchRequest({ url: endpoints.entrega(id), body: entregaPayloadSchema.parse(payload), schema: solicitudResponseSchema });

export const pagarSolicitud = (id: string, payload: PagarPayload) =>
  postRequest({ url: endpoints.pagar(id), body: pagarPayloadSchema.parse(payload), schema: solicitudResponseSchema });

export const revertirPago = (id: string) => deleteRequest({ url: endpoints.pago(id), schema: solicitudResponseSchema });

export const anularSolicitud = (id: string, motivo: string) =>
  postRequest({ url: endpoints.anular(id), body: anularPayloadSchema.parse({ motivo }), schema: solicitudResponseSchema });

export const firmarSolicitud = (id: string, tipo: string) =>
  postRequest({ url: endpoints.firma(id, tipo), body: {}, schema: solicitudResponseSchema });

export const quitarFirmaSolicitud = (id: string, tipo: string) =>
  deleteRequest({ url: endpoints.firma(id, tipo), schema: solicitudResponseSchema });
